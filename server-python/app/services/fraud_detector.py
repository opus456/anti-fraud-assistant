"""
核心反诈检测引擎 — CoT 思维链 + 多源融合
"""
from __future__ import annotations

import time
import json
import logging
import uuid
import asyncio
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, Conversation, AlertRecord, GuardianRelation
from app.config import settings
from app.utils.text_processor import calculate_text_risk_score, clean_text
from app.services.llm_service import analyze_with_cot
from app.services.rag_service import rag_service
from app.services.risk_assessor import (
    risk_assessor, FRAUD_TYPE_LABELS, normalize_fraud_type, cot_risk_level_to_score,
)
from app.redis_client import redis_memory

logger = logging.getLogger(__name__)


class FraudDetector:
    """多模态反诈检测引擎 — 感知-决策-干预 完整流程"""

    WARNING_SCRIPTS = {
        "investment": [
            "⚠️ 警告：检测到疑似投资理财诈骗！天上不会掉馅饼，高回报必然伴随高风险。",
            "请立即停止任何转账操作！正规投资不会承诺'稳赚不赔'。",
            "如已转账请立刻拨打110或96110反诈热线。",
        ],
        "impersonation": [
            "⚠️ 严重警告：对方疑似冒充公检法/政府机关人员！",
            "公检法机关绝不会通过电话或网络要求转账！",
            "请立即挂断电话，拨打110核实。",
        ],
        "romance": [
            "⚠️ 警告：检测到杀猪盘/婚恋诈骗特征！",
            "网恋对象引导你投资、博彩、充值的，都是诈骗！",
            "切勿向未见面的'恋人'转账汇款。",
        ],
        "task_scam": [
            "⚠️ 警告：检测到刷单诈骗特征！刷单本身就是违法行为。",
            "先充值后返利、越刷越多的都是诈骗！",
            "请立即停止操作，不要再投入任何资金！",
        ],
        "loan": [
            "⚠️ 警告：正规贷款不会要求提前缴纳任何费用！",
            "要求缴纳'保证金''解冻费''工本费'的都是诈骗！",
            "请通过正规银行渠道办理贷款。",
        ],
        "phishing": [
            "⚠️ 警告：检测到钓鱼诈骗特征！不要点击不明链接！",
            "正规平台不会通过短信要求你提供密码和验证码。",
            "任何人索要验证码都是诈骗！",
        ],
        "ai_deepfake": [
            "⚠️ 严重警告：注意AI换脸/声音克隆诈骗！",
            "即使视频通话中看到的是熟人面孔，也可能是AI合成的！",
            "涉及转账时，请通过其他方式二次确认身份。",
        ],
    }

    DEFAULT_WARNING = [
        "⚠️ 检测到潜在诈骗风险，请提高警惕！",
        "不轻信、不转账、不透露个人信息。",
        "如有疑问，请拨打96110全国反诈热线咨询。",
    ]

    SENSITIVE_INTENT_KEYWORDS = [
        "转账", "汇款", "兼职", "刷单", "理财", "投资", "中奖", "验证码",
        "贷款", "征信", "冻结", "安全账户", "公安", "法院", "检察院",
        "客服", "链接", "二维码", "密码", "银行卡", "AI换脸", "语音合成",
        "远程控制", "屏幕共享", "保证金", "手续费", "解冻费",
    ]

    # 三级检测阈值（关键词 -> RAG -> 条件触发 LLM）
    KEYWORD_LOW_CONF_THRESHOLD = 0.08
    KEYWORD_HIGH_CONF_THRESHOLD = 0.7
    RAG_WEAK_MATCH_THRESHOLD = 0.18
    RAG_HIGH_CONF_THRESHOLD = 0.75

    async def detect_text(
        self,
        content: str,
        user: Optional[User] = None,
        db: Optional[AsyncSession] = None,
        session_id: str = None,
        use_llm: bool = True,
        modality_count: int = 1,
        preset_risk: dict = None,  # 预设风险（来自视觉分析等）
    ) -> dict:
        start_time = time.time()
        content = clean_text(content)
        if not session_id:
            session_id = str(uuid.uuid4())[:8]

        pipeline_timing = {
            "keyword_ms": 0,
            "rag_ms": 0,
            "llm_ms": 0,
            "fusion_ms": 0,
        }

        # ===== 1) 一级检测：关键词规则引擎 =====
        t0 = time.time()
        text_risk = calculate_text_risk_score(content)
        pipeline_timing["keyword_ms"] = int((time.time() - t0) * 1000)
        logger.debug(f"规则引擎评分: {text_risk['total_score']}")  # 改为 debug 级别
        keyword_score = text_risk.get("keyword_score", text_risk.get("total_score", 0.0))
        has_sensitive_intent = self._has_sensitive_intent(content)

        # ===== 2) 二级检测：RAG 检索增强 =====
        similar_cases = []
        top_similarity = 0.0
        t1 = time.time()
        if keyword_score >= 0.05 or has_sensitive_intent:
            similar_cases = await rag_service.search_similar(content, top_k=3)
            top_similarity = similar_cases[0].get("similarity", 0.0) if similar_cases else 0.0
        pipeline_timing["rag_ms"] = int((time.time() - t1) * 1000)

        if top_similarity >= self.RAG_HIGH_CONF_THRESHOLD:
            text_risk["total_score"] = min(text_risk["total_score"] + 0.22, 1.0)
        elif top_similarity >= self.RAG_WEAK_MATCH_THRESHOLD:
            text_risk["total_score"] = min(text_risk["total_score"] + 0.10, 1.0)

        if similar_cases and not text_risk["top_fraud_type"] and similar_cases[0].get("scam_type"):
            text_risk["top_fraud_type"] = similar_cases[0]["scam_type"]

        # ===== 3. 获取用户长期记忆 =====
        user_memory = None
        user_profile = None
        if user:
            user_profile = {
                "age": user.age,
                "gender": user.gender,
                "role_type": user.role_type or "adult",
                "occupation": user.occupation,
                "risk_score": user.risk_score,
            }
            if db:
                from app.models import UserMemoryLog
                mem_result = await db.execute(
                    select(UserMemoryLog)
                    .where(UserMemoryLog.user_id == user.id)
                    .order_by(UserMemoryLog.updated_at.desc())
                    .limit(1)
                )
                mem = mem_result.scalar_one_or_none()
                if mem and mem.long_term_summary:
                    user_memory = mem.long_term_summary

        # ===== 3) 三级检测：仅在不确定区间触发 LLM CoT =====
        cot_result = None
        should_use_llm = use_llm and self._should_use_llm(
            keyword_score=keyword_score,
            top_similarity=top_similarity,
            text_risk=text_risk,
            similar_cases=similar_cases,
            has_sensitive_intent=has_sensitive_intent,
        )

        if should_use_llm:
            t2 = time.time()
            try:
                cot_result = await asyncio.wait_for(
                    analyze_with_cot(
                        content,
                        user_profile=user_profile,
                        similar_cases=similar_cases,
                        user_memory=user_memory,
                    ),
                    timeout=8.0,  # 8秒超时，给整体留2秒余量
                )
            except asyncio.TimeoutError:
                logger.warning("LLM CoT 分析超时(15s)")
            except Exception as e:
                logger.warning(f"LLM CoT 分析异常: {e}")
            finally:
                pipeline_timing["llm_ms"] = int((time.time() - t2) * 1000)
        else:
            logger.debug(  # 改为 debug 级别
                "跳过 LLM: keyword_score=%.3f top_similarity=%.3f",
                keyword_score,
                top_similarity,
            )

        # ===== 4) 多源融合 =====
        t3 = time.time()
        
        # 如果有预设风险（来自视觉分析），优先使用
        if preset_risk and isinstance(preset_risk, dict) and "risk_level" in preset_risk:
            preset_level = preset_risk.get("risk_level", 0)
            preset_score = cot_risk_level_to_score(preset_level)
            preset_type = preset_risk.get("scam_type")
            preset_reason = preset_risk.get("reason", "")
            
            # 融合预设风险和文本分析
            fusion_result = {
                "total_score": max(preset_score, text_risk["total_score"]),
                "top_fraud_type": preset_type or text_risk["top_fraud_type"],
                "analysis": preset_reason if preset_reason else self._generate_local_analysis(text_risk),
                "suggestions": self._generate_suggestions(text_risk),
                "cot_reasoning": {
                    "vision_analysis": preset_reason,
                    "detected_text": preset_risk.get("detected_text", ""),
                    "risk_level": preset_level,
                },
            }
            logger.info(f"使用视觉预设风险: level={preset_level}, type={preset_type}")
        elif cot_result and "risk_level" in cot_result:
            fusion_result = self._fuse_cot_results(text_risk, cot_result)
        else:
            boosted_score = text_risk["total_score"]
            if text_risk["total_score"] > 0.3:
                boosted_score = min(text_risk["total_score"] * 1.25, 1.0)
            fusion_result = {
                "total_score": boosted_score,
                "top_fraud_type": text_risk["top_fraud_type"],
                "analysis": self._generate_local_analysis(text_risk),
                "suggestions": self._generate_suggestions(text_risk),
                "cot_reasoning": None,
            }

        fusion_result = self._apply_consistency_calibration(fusion_result, text_risk)
        pipeline_timing["fusion_ms"] = int((time.time() - t3) * 1000)

        # ===== 5) 个性化风险评估 =====
        risk_result = await risk_assessor.assess_risk(fusion_result, user=user, db=db)

        # ===== 6) 构建结果 =====
        final_score = risk_result["final_score"]
        risk_level = risk_result["risk_level"]
        fraud_type = risk_result.get("fraud_type") or fusion_result.get("top_fraud_type")
        is_fraud = final_score >= settings.DETECTION_FRAUD_THRESHOLD

        warning_scripts = self.WARNING_SCRIPTS.get(fraud_type, self.DEFAULT_WARNING) if is_fraud else []
        response_time = int((time.time() - start_time) * 1000)

        result = {
            "is_fraud": is_fraud,
            "risk_level": risk_level,
            "risk_score": final_score,
            "fraud_type": fraud_type,
            "fraud_type_label": FRAUD_TYPE_LABELS.get(fraud_type, ""),
            "analysis": fusion_result.get("analysis", ""),
            "cot_reasoning": fusion_result.get("cot_reasoning"),
            "matched_cases": [
                {"title": c["title"], "content": c["content"][:200], "similarity": c["similarity"]}
                for c in similar_cases[:3]
            ],
            "suggestions": fusion_result.get("suggestions", []),
            "warning_scripts": warning_scripts,
            "response_time_ms": response_time,
            "alert_actions": risk_result.get("alert_actions", []),
            "pipeline": {
                "llm_used": should_use_llm,
                "keyword_score": round(keyword_score, 4),
                "rag_similarity": round(top_similarity, 4),
                "timings_ms": pipeline_timing,
            },
        }

        # ===== 7) 持久化 + 短期记忆 =====
        if user and db:
            await self._save_detection(user, content, result, session_id, db)
            try:
                await redis_memory.push_interaction(user.id, {
                    "content": content[:200],
                    "is_fraud": is_fraud,
                    "risk_score": final_score,
                    "fraud_type": fraud_type,
                    "timestamp": time.time(),
                })
            except Exception as e:
                logger.warning(f"Redis 短期记忆写入失败: {e}")

        # ===== 8) 高危时通知 Node.js 网关 =====
        risk_level_num = {"safe": 0, "low": 0, "medium": 1, "high": 2, "critical": 3}.get(risk_level, 0)
        if risk_level_num >= 2 and user:
            asyncio.create_task(self._notify_gateway(user, content, result))

        return result

    async def detect_multimodal(
        self, text="", image_ocr="", audio_transcript="", video_description="",
        context="", user=None, db=None, session_id=None, use_llm=True,
    ) -> dict:
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
        fused_content = "\n\n".join(parts)
        modality_count = sum(1 for v in [text, image_ocr, audio_transcript, video_description] if v and v.strip())

        result = await self.detect_text(
            content=fused_content, user=user, db=db,
            session_id=session_id, use_llm=use_llm,
            modality_count=max(modality_count, 1),
        )
        return result

    def _has_sensitive_intent(self, content: str) -> bool:
        return any(kw in content for kw in self.SENSITIVE_INTENT_KEYWORDS)

    def _should_use_llm(
        self,
        keyword_score: float,
        top_similarity: float,
        text_risk: dict,
        similar_cases: list[dict],
        has_sensitive_intent: bool,
    ) -> bool:
        # 如果配置了强制每次都使用 LLM，直接返回 True
        if settings.ALWAYS_USE_LLM:
            return True

        # 关键词与 RAG 同时高置信，直接走本地+RAG融合即可。
        if keyword_score >= self.KEYWORD_HIGH_CONF_THRESHOLD and top_similarity >= self.RAG_HIGH_CONF_THRESHOLD:
            return False

        # 关键词与 RAG 同时低置信且无敏感意图，直接判为低风险路径。
        if (
            keyword_score <= self.KEYWORD_LOW_CONF_THRESHOLD
            and top_similarity < self.RAG_WEAK_MATCH_THRESHOLD
            and not has_sensitive_intent
        ):
            return False

        # 规则与 RAG 类型冲突时，交由 LLM 做语义裁决。
        if similar_cases and text_risk.get("top_fraud_type"):
            rag_type = similar_cases[0].get("scam_type")
            if rag_type and rag_type != text_risk.get("top_fraud_type"):
                return True

        # 命中高危组合/模式时，优先用 LLM 给出更可靠语义判断。
        if text_risk.get("pattern_score", 0.0) >= 0.28 or text_risk.get("combo_score", 0.0) >= 0.2:
            return True

        # 任一维度落入不确定区间，触发 LLM。
        keyword_uncertain = self.KEYWORD_LOW_CONF_THRESHOLD < keyword_score < self.KEYWORD_HIGH_CONF_THRESHOLD
        rag_uncertain = self.RAG_WEAK_MATCH_THRESHOLD <= top_similarity < self.RAG_HIGH_CONF_THRESHOLD
        if keyword_uncertain or rag_uncertain:
            return True

        # 敏感意图且 RAG 有弱匹配时，也触发 LLM。
        if has_sensitive_intent and top_similarity >= self.RAG_WEAK_MATCH_THRESHOLD:
            return True

        return False

    def _fuse_cot_results(self, text_risk: dict, cot: dict) -> dict:
        """融合本地规则和 CoT 结果"""
        local_score = text_risk.get("total_score", 0)
        cot_level = cot.get("risk_level", 0)
        if isinstance(cot_level, str):
            cot_level = int(cot_level) if cot_level.isdigit() else 0
        cot_score = cot_risk_level_to_score(cot_level)

        fused_score = local_score * 0.35 + cot_score * 0.65

        if local_score > 0.6 and cot_score > 0.6:
            fused_score = min(fused_score * 1.15, 1.0)

        fraud_type = normalize_fraud_type(cot.get("scam_type")) or text_risk.get("top_fraud_type")

        reason = cot.get("reason", "")
        suggestions = []
        if cot_level >= 2:
            suggestions.append("立即停止与对方的任何交流和转账操作")
            suggestions.append("拨打96110反诈热线咨询核实")
        elif cot_level == 1:
            suggestions.append("保持警惕，核实对方身份后再做决定")

        cot_reasoning = {
            "urgency_check": cot.get("urgency_check", ""),
            "financial_check": cot.get("financial_check", ""),
            "authority_fake_check": cot.get("authority_fake_check", ""),
            "info_theft_check": cot.get("info_theft_check", ""),
            "too_good_check": cot.get("too_good_check", ""),
            "risk_level": cot_level,
            "scam_type": cot.get("scam_type"),
        }

        return {
            "total_score": round(fused_score, 3),
            "top_fraud_type": fraud_type,
            "analysis": reason,
            "suggestions": suggestions,
            "cot_reasoning": cot_reasoning,
        }

    @staticmethod
    def _apply_consistency_calibration(fusion: dict, text_risk: dict) -> dict:
        score = fusion.get("total_score", 0.0)
        keyword_score = text_risk.get("keyword_score", 0.0)
        urgent_score = text_risk.get("urgent_score", 0.0)
        safe_score = text_risk.get("safe_score", 0.0)

        if keyword_score < 0.35 and urgent_score < 0.2 and safe_score >= 0.16:
            score = max(score - 0.12, 0.0)
        if keyword_score >= 0.7 or urgent_score >= 0.35:
            score = max(score, 0.45)

        fusion["total_score"] = round(min(score, 1.0), 3)
        return fusion

    @staticmethod
    def _generate_local_analysis(text_risk: dict) -> str:
        score = text_risk["total_score"]
        fraud_type = text_risk.get("top_fraud_type")
        if score < 0.1:
            return "经检测分析，该内容未发现明显的诈骗特征，暂判定为安全。请继续保持警惕。"
        parts = []
        if fraud_type:
            label = FRAUD_TYPE_LABELS.get(fraud_type, "未知类型")
            parts.append(f"检测到疑似【{label}】特征")
        if text_risk.get("urgent_signals"):
            parts.append(f"发现紧急信号词: {', '.join(text_risk['urgent_signals'][:5])}")
        parts.append(f"综合风险评分: {score:.1%}")
        return "。".join(parts) + "。"

    @staticmethod
    def _generate_suggestions(text_risk: dict) -> list[str]:
        suggestions = []
        fraud_type = text_risk.get("top_fraud_type")
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
        suggestions.extend([
            "不要轻信陌生人的信息，保持理性判断",
            "涉及转账汇款时务必通过官方渠道核实",
            "如有疑问请拨打96110反诈热线咨询",
        ])
        return suggestions

    async def _save_detection(self, user, content, result, session_id, db):
        try:
            # Re-fetch user in current db session
            db_user_result = await db.execute(
                select(User).where(User.id == user.id)
            )
            db_user = db_user_result.scalar_one_or_none()
            if not db_user:
                logger.warning(f"用户 {user.id} 不存在，跳过保存")
                return

            conversation = Conversation(
                user_id=db_user.id,
                session_id=session_id,
                input_type="text",
                input_content=content[:5000],
                is_fraud=result["is_fraud"],
                fraud_type=result.get("fraud_type"),
                risk_level=result.get("risk_level", "safe"),
                risk_score=result["risk_score"],
                analysis_result={
                    "analysis": result.get("analysis", ""),
                    "cot_reasoning": result.get("cot_reasoning"),
                    "suggestions": result.get("suggestions", []),
                    "fraud_type_label": result.get("fraud_type_label", ""),
                },
                matched_cases=result.get("matched_cases", []),
                ai_response=result.get("analysis", ""),
                response_time_ms=result.get("response_time_ms", 0),
            )
            db.add(conversation)
            # 刷新以获取自增ID
            await db.flush()

            db_user.total_detections += 1
            if result["is_fraud"]:
                db_user.fraud_hits += 1
                db_user.risk_score = round(db_user.risk_score * 0.7 + result["risk_score"] * 0.3, 3)

            risk_level_num = {"safe": 0, "low": 0, "medium": 1, "high": 2, "critical": 3}.get(
                result["risk_level"], 0
            )
            if risk_level_num >= 1:
                alert_type = "popup"
                if risk_level_num == 2:
                    alert_type = "guardian"
                elif risk_level_num == 3:
                    alert_type = "lock"

                # 查询该用户的所有监护人
                guardian_notified = False
                notified_guardians = []
                if risk_level_num >= 2:  # 中高风险时通知监护人
                    logger.info(f"[监护人通知] 用户 {db_user.id}({db_user.username}) 检测到风险等级 {risk_level_num}，正在查询监护人...")
                    guardian_result = await db.execute(
                        select(GuardianRelation).where(
                            GuardianRelation.user_id == db_user.id,
                            GuardianRelation.is_active == True,
                        )
                    )
                    guardians = guardian_result.scalars().all()
                    logger.info(f"[监护人通知] 查询到 {len(guardians)} 位监护人")
                    if guardians:
                        guardian_notified = True
                        for g in guardians:
                            notified_guardians.append(g.guardian_id)
                            logger.info(f"[监护人通知] 将为监护人 {g.guardian_id} 创建预警记录")
                        logger.info(f"用户 {db_user.id} 检测到高风险，已通知 {len(guardians)} 位监护人: {notified_guardians}")
                    else:
                        logger.warning(f"[监护人通知] 用户 {db_user.id} 没有绑定任何监护人！")

                alert = AlertRecord(
                    user_id=db_user.id,
                    conversation_id=conversation.id,  # 关联检测记录
                    alert_type=alert_type,
                    risk_level=risk_level_num,
                    fraud_type=result.get("fraud_type"),
                    title=f"⚠️ 检测到{result.get('fraud_type_label', '可疑')}风险",
                    description=result.get("analysis", ""),
                    suggestion="\n".join(result.get("suggestions", [])),
                    report_json={
                        "cot_reasoning": result.get("cot_reasoning", {}),
                        "input_content": content[:2000],  # 保存原始输入内容（截断）
                        "fraud_type_label": result.get("fraud_type_label", ""),
                        "risk_score": result.get("risk_score", 0),
                    },
                    guardian_notified=guardian_notified,
                )
                db.add(alert)
                await db.flush()  # 获取alert ID
                
                # 为每个监护人创建通知记录
                if notified_guardians:
                    for guardian_id in notified_guardians:
                        guardian_alert = AlertRecord(
                            user_id=guardian_id,  # 监护人收到的通知
                            conversation_id=conversation.id,  # 关联检测记录
                            alert_type="ward_alert",  # 被守护者警报
                            risk_level=risk_level_num,
                            fraud_type=result.get("fraud_type"),
                            title=f"🔔 您的被守护者检测到{result.get('fraud_type_label', '可疑')}风险",
                            description=f"被守护者（{db_user.nickname or db_user.username}）触发了安全警报。\n{result.get('analysis', '')}",
                            suggestion="\n".join(result.get("suggestions", [])),
                            report_json={
                                "ward_user_id": db_user.id,
                                "ward_username": db_user.username,
                                "ward_nickname": db_user.nickname or db_user.username,
                                "input_content": content[:2000],  # 保存原始输入内容（截断）
                                "cot_reasoning": result.get("cot_reasoning"),
                                "fraud_type_label": result.get("fraud_type_label", ""),
                                "risk_score": result.get("risk_score", 0),
                            },
                        )
                        db.add(guardian_alert)
                        logger.info(f"[监护人通知] 已为监护人 {guardian_id} 创建预警记录")

            await db.commit()
            logger.info(f"[保存结果] 检测结果已保存到数据库")
        except Exception as e:
            logger.error(f"保存检测结果失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            await db.rollback()

    async def _notify_gateway(self, user: User, content: str, result: dict):
        """通知 Node.js 网关进行实时告警，包含用户信息和检测内容"""
        try:
            risk_level_value = result.get("risk_level")
            risk_level_num = risk_level_value
            if isinstance(risk_level_value, str):
                risk_level_num = {"safe": 0, "low": 0, "medium": 1, "high": 2, "critical": 3}.get(
                    risk_level_value, 0
                )

            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{settings.NODE_GATEWAY_URL}/internal/alert",
                    json={
                        "user_id": user.id,
                        "username": user.username,
                        "nickname": user.nickname or user.username,
                        "risk_level": risk_level_num,
                        "risk_level_label": result.get("risk_level"),
                        "risk_score": result.get("risk_score"),
                        "fraud_type": result.get("fraud_type"),
                        "fraud_type_label": result.get("fraud_type_label"),
                        "analysis": result.get("analysis", ""),
                        "input_content": content[:1000],  # 发送检测的原始内容（截断）
                        "suggestions": result.get("suggestions", []),
                        "warning_scripts": result.get("warning_scripts", []),
                        "cot_reasoning": result.get("cot_reasoning"),
                        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    },
                    headers={"x-internal-secret": settings.SECRET_KEY},
                )
                logger.info(f"[网关通知] 已向网关发送用户 {user.id} 的高风险预警")
        except Exception as e:
            logger.warning(f"通知网关失败: {e}")


fraud_detector = FraudDetector()
