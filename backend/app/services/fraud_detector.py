"""
核心反诈检测引擎
融合多种检测方法：关键词分析 + LLM智能分析 + 知识库RAG + 个性化风险评估
实现 "感知-决策-干预" 的完整流程
"""
import time
import json
import logging
import uuid
import asyncio
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, Guardian, Conversation, Alert, AlertType, FraudType, RiskLevel
from app.config import settings
from app.utils.text_processor import calculate_text_risk_score, clean_text
from app.services.llm_service import analyze_with_llm
from app.services.knowledge_service import knowledge_service
from app.services.realtime_hub import realtime_hub
from app.services.risk_assessor import risk_assessor, FRAUD_TYPE_LABELS, normalize_fraud_type

logger = logging.getLogger(__name__)


class FraudDetector:
    """
    多模态反诈检测引擎
    
    检测流程:
    1. 文本预处理与清洗
    2. 本地关键词规则引擎快速筛查
    3. 知识库RAG检索相似案例
    4. LLM深度语义分析
    5. 多源信息融合判定
    6. 个性化风险评估
    7. 生成检测结果与预警动作
    """

    # 预警话术模板
    WARNING_SCRIPTS = {
        "investment": [
            "⚠️ 警告：检测到疑似投资理财诈骗！天上不会掉馅饼，高回报必然伴随高风险。",
            "请立即停止任何转账操作！正规投资不会承诺'稳赚不赔'。",
            "如已转账请立刻拨打110或96110反诈热线。"
        ],
        "impersonation": [
            "⚠️ 严重警告：对方疑似冒充公检法/政府机关人员！",
            "公检法机关绝不会通过电话或网络要求转账！绝不会通过QQ/微信办案！",
            "请立即挂断电话，拨打110核实。不要相信所谓的'安全账户'！"
        ],
        "romance": [
            "⚠️ 警告：检测到杀猪盘/婚恋诈骗特征！",
            "网恋对象引导你投资、博彩、充值的，都是诈骗！",
            "切勿向未见面的'恋人'转账汇款。请及时止损并报警。"
        ],
        "task_scam": [
            "⚠️ 警告：检测到刷单诈骗特征！刷单本身就是违法行为。",
            "先充值后返利、越刷越多的都是诈骗！已投入的钱无法追回。",
            "请立即停止操作，不要再投入任何资金！"
        ],
        "loan": [
            "⚠️ 警告：正规贷款不会要求提前缴纳任何费用！",
            "要求缴纳'保证金''解冻费''工本费'的都是诈骗！",
            "请通过正规银行渠道办理贷款，切勿相信网上低息贷款广告。"
        ],
        "phishing": [
            "⚠️ 警告：检测到钓鱼诈骗特征！不要点击不明链接！",
            "正规平台不会通过短信要求你提供密码和验证码。",
            "任何人索要验证码都是诈骗，包括自称客服的人！"
        ],
        "gaming": [
            "⚠️ 警告：游戏交易请通过官方平台进行！",
            "私下交易、低价充值、代练等都存在极高诈骗风险。",
            "不要在非官方渠道进行任何付款操作。"
        ],
        "telecom": [
            "⚠️ 警告：检测到电信诈骗特征！",
            "冒充运营商、快递、航空公司的电话都要警惕！",
            "涉及转账、退款的请直接拨打官方客服电话核实。"
        ],
        "ai_deepfake": [
            "⚠️ 严重警告：注意AI换脸/声音克隆诈骗！",
            "即使视频通话中看到的是熟人面孔，也可能是AI合成的！",
            "涉及转账时，请通过其他方式（当面/电话）二次确认身份。"
        ]
    }

    # 默认预警话术
    DEFAULT_WARNING = [
        "⚠️ 检测到潜在诈骗风险，请提高警惕！",
        "不轻信、不转账、不透露个人信息。",
        "如有疑问，请拨打96110全国反诈热线咨询。"
    ]

    # 分层路由：仅在疑似诈骗意图时触发LLM，减少平均时延
    SENSITIVE_INTENT_KEYWORDS = [
        "转账", "汇款", "兼职", "刷单", "理财", "投资", "中奖", "验证码", "贷款", "征信",
        "冻结", "安全账户", "公安", "法院", "检察院", "客服", "链接", "二维码", "密码", "银行卡",
        "AI换脸", "语音合成", "远程控制", "屏幕共享", "保证金", "手续费", "解冻费"
    ]

    # 多模态语义特征词，提升融合判定鲁棒性
    MULTIMODAL_RISK_HINTS = [
        "二维码", "转账界面", "收款码", "通缉令", "公章", "验证码", "伪造", "深度伪造", "换脸", "拟声"
    ]

    async def detect_text(
        self,
        content: str,
        user: Optional[User] = None,
        db: Optional[AsyncSession] = None,
        session_id: str = None,
        use_llm: bool = True,
        modality_count: int = 1,
    ) -> dict:
        """
        核心文本检测流程
        
        参数:
            content: 需要检测的文本内容
            user: 当前用户（可选，用于个性化评估）
            db: 数据库会话
            session_id: 对话会话ID
        
        返回:
            完整的检测结果
        """
        start_time = time.time()
        content = clean_text(content)

        if not session_id:
            session_id = str(uuid.uuid4())[:8]

        # ========== 第1步: 本地规则引擎快速筛查 ==========
        text_risk = calculate_text_risk_score(content)
        logger.info(f"规则引擎评分: {text_risk['total_score']}")

        # ========== 第2步: 知识库RAG检索（按需触发，避免低风险场景耗时） ==========
        similar_cases = []
        if text_risk.get("total_score", 0.0) >= 0.08 or self._has_sensitive_intent(content):
            similar_cases = knowledge_service.search_similar_cases(content, top_k=3)

        # 如果知识库有高相似度匹配，提升风险分数
        if similar_cases and similar_cases[0].get("similarity", 0) > 0.5:
            text_risk["total_score"] = min(
                text_risk["total_score"] + 0.15, 1.0
            )
            if not text_risk["top_fraud_type"] and similar_cases[0].get("fraud_type"):
                text_risk["top_fraud_type"] = similar_cases[0]["fraud_type"]

        # ========== 第3步: 分层路由 + LLM深度分析（限时15秒） ==========
        llm_result = None
        user_profile = None
        if user:
            user_profile = {
                "age": user.age,
                "gender": user.gender.value if user.gender else "unknown",
                "role_type": user.role_type.value if user.role_type else "adult",
                "occupation": user.occupation,
                "risk_score": user.risk_score
            }

        should_use_llm = use_llm and self._should_use_llm(content, text_risk)
        if should_use_llm:
            try:
                llm_result = await asyncio.wait_for(
                    analyze_with_llm(
                        content,
                        user_profile=user_profile,
                        similar_cases=similar_cases
                    ),
                    timeout=8.0
                )
            except asyncio.TimeoutError:
                logger.warning("LLM分析超时(8s)，使用本地规则引擎结果")
                llm_result = None
            except Exception as e:
                logger.warning(f"LLM分析异常: {e}，使用本地规则引擎结果")
                llm_result = None

        # ========== 第4步: 多源融合判定 ==========
        if llm_result:
            # LLM分析成功，融合本地规则与LLM结果
            fusion_result = self._fuse_results(text_risk, llm_result)
            fusion_result = self._apply_consistency_calibration(fusion_result, text_risk)
        else:
            # LLM不可用或拒绝回答
            # 如果本地规则已检测到较高风险，适当提升评分
            # （LLM拒绝回答本身可能暗示内容涉及敏感诈骗类型）
            boosted_score = text_risk["total_score"]
            if text_risk["total_score"] > 0.3:
                boosted_score = min(text_risk["total_score"] * 1.25, 1.0)
            fusion_result = {
                "total_score": boosted_score,
                "top_fraud_type": text_risk["top_fraud_type"],
                "analysis": self._generate_local_analysis(text_risk),
                "suggestions": self._generate_suggestions(text_risk),
            }

        # ========== 第5步: 个性化风险评估 ==========
        risk_result = await risk_assessor.assess_risk(
            fusion_result, user=user, db=db
        )

        # ========== 第6步: 构建最终结果 ==========
        final_score = risk_result["final_score"]
        risk_level = risk_result["risk_level"]
        fraud_type = risk_result.get("fraud_type") or fusion_result.get("top_fraud_type")
        is_fraud = final_score >= settings.DETECTION_FRAUD_THRESHOLD

        # 获取预警话术
        warning_scripts = self.WARNING_SCRIPTS.get(
            fraud_type, self.DEFAULT_WARNING
        ) if is_fraud else []

        response_time = int((time.time() - start_time) * 1000)

        closed_loop = self._build_closed_loop(final_score, risk_level)
        result = {
            "is_fraud": is_fraud,
            "risk_level": risk_level,
            "risk_score": final_score,
            "fraud_type": fraud_type,
            "fraud_type_label": FRAUD_TYPE_LABELS.get(fraud_type, ""),
            "analysis": fusion_result.get("analysis", ""),
            "matched_cases": [
                {"title": c["title"], "content": c["content"][:200], "similarity": c["similarity"]}
                for c in similar_cases[:3]
            ],
            "suggestions": fusion_result.get("suggestions", []) + (
                llm_result.get("suggestions", []) if llm_result else []
            ),
            "warning_scripts": warning_scripts,
            "response_time_ms": response_time,
            "alert_actions": risk_result.get("alert_actions", []),
            "closed_loop": closed_loop,
            # 算法细节（用于展示）
            "_algorithm_details": {
                "keyword_score": text_risk.get("keyword_score", 0),
                "urgent_score": text_risk.get("urgent_score", 0),
                "feature_score": text_risk.get("feature_score", 0),
                "llm_score": llm_result.get("risk_score", 0) if llm_result else 0,
                "history_score": risk_result.get("history_score", 0),
                "profile_weight": risk_result.get("profile_weight", 1.0),
                "instant_score": risk_result.get("instant_score", 0),
                "safe_score": text_risk.get("safe_score", 0),
                "fusion_method": "weighted_ensemble",
                "llm_routed": should_use_llm,
                "modality_count": modality_count,
            }
        }

        # ========== 第7步: 持久化检测结果 ==========
        if user and db:
            notify_result = await self._save_detection(user, content, result, session_id, db)
            if notify_result:
                result["closed_loop"]["guardian_notified"] = notify_result.get("notified", False)
                result["closed_loop"]["guardian_notify_log"] = notify_result.get("message", "")

        return result

    async def detect_multimodal(
        self,
        text: str = "",
        image_ocr: str = "",
        audio_transcript: str = "",
        video_description: str = "",
        context: str = "",
        user: Optional[User] = None,
        db: Optional[AsyncSession] = None,
        session_id: str = None,
        use_llm: bool = True,
    ) -> dict:
        """多模态融合检测：先统一语义，再复用核心文本检测流程。"""
        fused_content = self._build_multimodal_content(
            text=text,
            image_ocr=image_ocr,
            audio_transcript=audio_transcript,
            video_description=video_description,
            context=context,
        )
        modality_count = sum(1 for v in [text, image_ocr, audio_transcript, video_description] if v and v.strip())

        result = await self.detect_text(
            content=fused_content,
            user=user,
            db=db,
            session_id=session_id,
            use_llm=use_llm,
            modality_count=max(modality_count, 1),
        )

        # 多模态风险增强：当跨模态均出现高危信号时，提升小幅置信度
        hint_hits = sum(1 for kw in self.MULTIMODAL_RISK_HINTS if kw in fused_content)
        if modality_count >= 2 and hint_hits >= 2:
            boosted = min(result["risk_score"] + 0.05, 1.0)
            result["risk_score"] = round(boosted, 3)
            result["is_fraud"] = boosted >= 0.3

        result["_algorithm_details"]["multimodal_hint_hits"] = hint_hits
        result["_algorithm_details"]["multimodal_fusion"] = modality_count >= 2
        return result

    def _should_use_llm(self, content: str, text_risk: dict) -> bool:
        """轻量意图路由：低风险且无敏感意图时跳过LLM，降低延迟。"""
        if text_risk.get("total_score", 0.0) >= 0.28:
            return True
        return self._has_sensitive_intent(content)

    def _has_sensitive_intent(self, content: str) -> bool:
        return any(keyword in content for keyword in self.SENSITIVE_INTENT_KEYWORDS)

    @staticmethod
    def _build_multimodal_content(
        text: str,
        image_ocr: str,
        audio_transcript: str,
        video_description: str,
        context: str,
    ) -> str:
        parts = []
        if text.strip():
            parts.append(f"[文本]\n{text.strip()}")
        if image_ocr.strip():
            parts.append(f"[图片OCR]\n{image_ocr.strip()}")
        if audio_transcript.strip():
            parts.append(f"[音频转写]\n{audio_transcript.strip()}")
        if video_description.strip():
            parts.append(f"[视频描述]\n{video_description.strip()}")
        if context.strip():
            parts.append(f"[上下文]\n{context.strip()}")
        return "\n\n".join(parts)

    @staticmethod
    def _build_closed_loop(risk_score: float, risk_level: str) -> dict:
        """输出全链路闭环建议，便于前端展示与人工处置跟进。"""
        next_step = "记录观察"
        if risk_level in [RiskLevel.MEDIUM.value, RiskLevel.HIGH.value, RiskLevel.CRITICAL.value]:
            next_step = "生成安全报告并触发家属关注"
        return {
            "incident_id": str(uuid.uuid4())[:12],
            "risk_score": risk_score,
            "risk_level": risk_level,
            "next_step": next_step,
            "guardian_notified": False,
            "guardian_notify_log": "",
        }

    def _fuse_results(self, text_risk: dict, llm_result: dict) -> dict:
        """
        多源信息融合算法
        将本地规则引擎和LLM分析结果进行加权融合
        """
        local_score = text_risk.get("total_score", 0)
        llm_score = llm_result.get("risk_score", 0)

        # 加权融合: LLM权重60%, 本地规则40%
        fused_score = local_score * 0.4 + llm_score * 0.6

        # 如果两个引擎都认为高风险，提升得分
        if local_score > 0.6 and llm_score > 0.6:
            fused_score = min(fused_score * 1.15, 1.0)

        # 确定诈骗类型：优先取LLM的判定，归一化到系统已知类型
        fraud_type = normalize_fraud_type(
            llm_result.get("fraud_type")
        ) or text_risk.get("top_fraud_type")

        return {
            "total_score": round(fused_score, 3),
            "top_fraud_type": fraud_type,
            "analysis": llm_result.get("analysis", ""),
            "suggestions": llm_result.get("suggestions", []),
        }

    @staticmethod
    def _apply_consistency_calibration(fusion_result: dict, text_risk: dict) -> dict:
        """一致性校正：减少证据不足导致的误报，提升前端问答可信度。"""
        score = fusion_result.get("total_score", 0.0)
        keyword_score = text_risk.get("keyword_score", 0.0)
        urgent_score = text_risk.get("urgent_score", 0.0)
        safe_score = text_risk.get("safe_score", 0.0)

        # 当诈骗证据偏弱且安全语境较强时，适度降分
        if keyword_score < 0.35 and urgent_score < 0.2 and safe_score >= 0.16:
            score = max(score - 0.12, 0.0)

        # 若存在明显高危信号，避免过度降分
        if keyword_score >= 0.7 or urgent_score >= 0.35:
            score = max(score, 0.45)

        fusion_result["total_score"] = round(min(score, 1.0), 3)
        return fusion_result

    @staticmethod
    def _generate_local_analysis(text_risk: dict) -> str:
        """本地规则引擎生成分析说明"""
        score = text_risk["total_score"]
        fraud_type = text_risk.get("top_fraud_type")
        urgent = text_risk.get("urgent_signals", [])

        if score < 0.1:
            return "经检测分析，该内容未发现明显的诈骗特征，暂判定为安全。请继续保持警惕。"

        analysis_parts = []
        if fraud_type:
            label = FRAUD_TYPE_LABELS.get(fraud_type, "未知类型")
            analysis_parts.append(f"检测到疑似【{label}】特征")

        if text_risk.get("fraud_scores"):
            matched_types = [
                FRAUD_TYPE_LABELS.get(ft, ft)
                for ft, s in text_risk["fraud_scores"].items()
                if s > 0.2
            ]
            if matched_types:
                analysis_parts.append(f"匹配的诈骗类型: {', '.join(matched_types)}")

        if urgent:
            analysis_parts.append(f"发现紧急信号词: {', '.join(urgent)}")

        analysis_parts.append(f"综合风险评分: {score:.1%}")

        return "。".join(analysis_parts) + "。"

    @staticmethod
    def _generate_suggestions(text_risk: dict) -> list[str]:
        """根据风险类型生成防御建议"""
        suggestions = []
        fraud_type = text_risk.get("top_fraud_type")

        base_suggestions = [
            "不要轻信陌生人的信息，保持理性判断",
            "涉及转账汇款时务必通过官方渠道核实",
            "不要向任何人透露验证码、密码等敏感信息",
            "如有疑问请拨打96110反诈热线咨询"
        ]

        type_suggestions = {
            "investment": ["正规投资平台都有金融牌照，请核实资质", "不要相信'稳赚不赔'的投资项目"],
            "impersonation": ["公检法绝不会线上办案或要求转账", "接到可疑电话先挂断，主动拨打官方电话核实"],
            "romance": ["网恋对象引导投资/赌博的一律是诈骗", "未见面就谈钱的关系需要高度警惕"],
            "task_scam": ["所有刷单行为都是违法的", "先垫付后返利的模式就是诈骗套路"],
            "loan": ["正规贷款不需要提前缴纳任何费用", "请通过银行等正规渠道办理贷款"],
            "phishing": ["不要点击不明链接", "官方客服永远不会索要密码和验证码"],
        }

        if fraud_type and fraud_type in type_suggestions:
            suggestions.extend(type_suggestions[fraud_type])

        suggestions.extend(base_suggestions[:3])
        return suggestions

    async def _save_detection(
        self,
        user: User,
        content: str,
        result: dict,
        session_id: str,
        db: AsyncSession
    ) -> dict:
        """保存检测结果到数据库"""
        try:
            # 映射fraud_type字符串到枚举
            fraud_type_enum = None
            if result.get("fraud_type"):
                try:
                    fraud_type_enum = FraudType(result["fraud_type"])
                except ValueError:
                    fraud_type_enum = FraudType.OTHER

            risk_level_enum = RiskLevel.SAFE
            try:
                risk_level_enum = RiskLevel(result.get("risk_level", "safe"))
            except ValueError:
                pass

            # 保存对话记录
            conversation = Conversation(
                user_id=user.id,
                session_id=session_id,
                input_type="text",
                input_content=content[:5000],  # 限制长度
                is_fraud=result["is_fraud"],
                fraud_type=fraud_type_enum,
                risk_level=risk_level_enum,
                risk_score=result["risk_score"],
                analysis_result=json.dumps({
                    "analysis": result.get("analysis", ""),
                    "algorithm_details": result.get("_algorithm_details", {})
                }, ensure_ascii=False),
                matched_cases=json.dumps(result.get("matched_cases", []), ensure_ascii=False),
                ai_response=result.get("analysis", ""),
                response_time_ms=result.get("response_time_ms", 0)
            )
            db.add(conversation)

            # 更新用户统计
            user.total_detections += 1
            if result["is_fraud"]:
                user.fraud_hits += 1
                # 更新用户风险分（指数移动平均）
                user.risk_score = round(
                    user.risk_score * 0.7 + result["risk_score"] * 0.3, 3
                )

            # 如果风险达到中等以上，创建预警记录
            guardian_notify_result = {"notified": False, "message": ""}
            if result["risk_level"] in [RiskLevel.MEDIUM.value, RiskLevel.HIGH.value, RiskLevel.CRITICAL.value]:
                alert_type = AlertType.POPUP
                if result["risk_level"] == RiskLevel.HIGH.value:
                    alert_type = AlertType.GUARDIAN_NOTIFY
                elif result["risk_level"] == RiskLevel.CRITICAL.value:
                    alert_type = AlertType.DEVICE_LOCK

                alert = Alert(
                    user_id=user.id,
                    alert_type=alert_type,
                    risk_level=risk_level_enum,
                    fraud_type=fraud_type_enum,
                    title=f"⚠️ 检测到{result.get('fraud_type_label', '可疑')}风险",
                    description=result.get("analysis", ""),
                    suggestion="\n".join(result.get("suggestions", []))
                )
                db.add(alert)

                if alert_type in [AlertType.GUARDIAN_NOTIFY, AlertType.DEVICE_LOCK]:
                    guardian_notify_result = await self._notify_guardians(user, db, result)
                    alert.guardian_notified = guardian_notify_result.get("notified", False)
                    alert.guardian_response = guardian_notify_result.get("message", "")

            await db.commit()
            return guardian_notify_result

        except Exception as e:
            logger.error(f"保存检测结果失败: {e}")
            await db.rollback()
            return {"notified": False, "message": ""}

    async def _notify_guardians(self, user: User, db: AsyncSession, detection_result: dict) -> dict:
        """模拟监护人联动通知（可替换为短信/电话/WebSocket）。"""
        guardians_result = await db.execute(
            select(Guardian).where(
                Guardian.user_id == user.id,
                Guardian.is_active == True
            ).order_by(Guardian.is_primary.desc())
        )
        guardians = guardians_result.scalars().all()
        if not guardians:
            return {"notified": False, "message": "未配置监护人，已记录高危事件"}

        targets = [f"{g.name}({g.phone})" for g in guardians[:2]]
        await realtime_hub.publish(
            user.id,
            "guardian_alert",
            {
                "user_id": user.id,
                "risk_level": detection_result.get("risk_level", "high"),
                "risk_score": detection_result.get("risk_score", 0),
                "fraud_type": detection_result.get("fraud_type"),
                "message": "检测到高危诈骗风险，已触发监护联动",
                "targets": targets,
            },
        )
        return {
            "notified": True,
            "message": f"已通知监护人: {', '.join(targets)}",
        }


# 全局检测引擎单例
fraud_detector = FraudDetector()
