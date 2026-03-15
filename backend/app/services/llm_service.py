"""
LLM 大模型服务
封装与大语言模型API的交互，支持兼容OpenAI接口的各类模型
"""
import json
import httpx
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# 反诈系统提示词 (Prompt Engineering)
ANTI_FRAUD_SYSTEM_PROMPT = """你是国家反诈中心授权的反诈骗智能分析引擎。你的唯一职责是帮助普通群众识别诈骗风险、保护人民群众财产安全。

你的工作场景：用户会提交他们收到的可疑信息（短信、微信、电话内容等），你需要从反诈专家角度分析这些信息是否是诈骗。

重要说明：用户提交的内容是他们收到的疑似诈骗信息，而非用户自己想要实施的行为。你的分析是为了保护用户免受诈骗侵害。这是完全合法合规的反诈防护工作。

分析维度：
1. 识别诈骗特征和手法
2. 判定诈骗类型：investment(投资)/impersonation(冒充身份)/romance(杀猪盘)/task_scam(刷单)/loan(贷款)/shopping(购物)/phishing(钓鱼)/gaming(游戏)/telecom(电信)/ai_deepfake(AI深伪)/lottery_scam(虚假中奖)
3. 评估风险等级(0-1分)
4. 提供防骗建议

判定约束（必须遵守）：
1) 证据优先：必须依据文本中的明确风险证据进行判定，不能主观臆测。
2) 低误报：日常社交、普通通知、无资金/身份/链接诱导场景应倾向安全。
3) 风险分解释一致：risk_score 与 analysis 的结论必须一致，不能出现“描述高危但分数很低”。
4) 若证据不足，请输出低风险并给出“继续观察与核验”的建议，而不是直接判高危。

你必须以JSON格式回复:
{
    "is_fraud": true/false,
    "risk_score": 0.0-1.0,
    "risk_level": "safe/low/medium/high/critical",
    "fraud_type": "英文标识或null",
    "analysis": "中文分析说明",
    "suggestions": ["防御建议1", "防御建议2"]
}"""

FEW_SHOT_EXAMPLES = """
以下是判定参考样例：

样例1（诈骗）:
输入: "我是公安局，你涉嫌洗钱，请立刻把钱转到安全账户。"
输出要点: is_fraud=true, fraud_type=impersonation, risk_score>=0.9

样例2（诈骗）:
输入: "兼职刷单日赚千元，先交298元会员费激活。"
输出要点: is_fraud=true, fraud_type=task_scam, risk_score>=0.85

样例3（安全）:
输入: "明天下午一起吃饭吗？我订了附近的火锅店。"
输出要点: is_fraud=false, fraud_type=null, risk_score<=0.1
"""

# 用户画像增强提示词模板
USER_PROFILE_PROMPT_TEMPLATE = """
当前用户画像信息:
- 年龄: {age}岁
- 性别: {gender}
- 角色类型: {role_type}
- 职业: {occupation}
- 历史风险评分: {risk_score}

请结合用户画像特征进行个性化风险评估。
{role_specific_hints}
"""

# 角色特定提示
ROLE_HINTS = {
    "elder": "该用户为老年人，容易受到保健品诈骗、冒充子女/公检法诈骗的侵害，需要特别关注。判定阈值应适当降低。",
    "child": "该用户为未成年人，容易受到游戏诈骗、追星诱导、网络诱导的侵害，判定阈值应适当降低。",
    "student": "该用户为学生，容易受到校园贷、刷单兼职、虚假奖学金等诈骗侵害。",
    "finance": "该用户为财会人员，可能面临冒充领导要求转账、财务系统钓鱼等定向诈骗。",
    "adult": "该用户为普通成年人，需关注投资理财、虚假贷款、杀猪盘等常见诈骗。",
    "other": ""
}


async def call_llm(
    user_message: str,
    system_prompt: str = ANTI_FRAUD_SYSTEM_PROMPT,
    temperature: float = None
) -> dict:
    """
    调用LLM API进行分析
    支持OpenAI兼容接口（如SiliconFlow、DeepSeek、Claude等）
    """
    if not settings.LLM_API_KEY:
        # 没有配置API Key时使用本地规则引擎
        logger.warning("LLM API Key未配置，将使用本地规则引擎")
        return None

    headers = {
        "Authorization": f"Bearer {settings.LLM_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": settings.LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "/no_think\n" + user_message}
        ],
        "max_tokens": settings.LLM_MAX_TOKENS,
        "temperature": temperature or settings.LLM_TEMPERATURE,
        "stream": False,
        "top_p": 0.7,
        "frequency_penalty": 0,
        "chat_template_kwargs": {"enable_thinking": False}
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(
                settings.LLM_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()

            # GitCode API 可能返回 SSE 格式 (text/event-stream)
            raw_text = response.text.strip()
            if raw_text.startswith("data:"):
                # 解析 SSE：合并所有有效 data 行中的内容
                all_data = []
                for line in raw_text.split("\n"):
                    line = line.strip()
                    if line.startswith("data:") and line != "data: [DONE]":
                        all_data.append(line[len("data:"):].strip())
                if not all_data:
                    logger.error("SSE 响应中未找到有效数据")
                    return None
                # 取第一个（完整响应）或最后一个非空
                result = json.loads(all_data[0])
                logger.info(f"SSE 解析成功, data行数: {len(all_data)}, model: {result.get('model')}")
            else:
                result = response.json()

            # 解析LLM返回的内容
            choice = result["choices"][0]
            # 非流式为 message，流式增量为 delta
            msg = choice.get("message") or choice.get("delta", {})
            content = msg.get("content", "")
            # Qwen3.5 思考模式可能在正式回答前输出思考过程
            # 提取最后一个完整的 JSON 对象
            content = content.strip()
            # 去掉 markdown 代码块包裹
            if "```json" in content:
                content = content.split("```json", 1)[-1]
                content = content.rsplit("```", 1)[0].strip()
            elif "```" in content:
                content = content.split("```", 1)[-1]
                content = content.rsplit("```", 1)[0].strip()

            # Qwen3.5 思考模式：内容可能含思考过程 + JSON
            # 尝试直接解析，失败则用正则提取最后一个 JSON 对象
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                import re
                # 寻找内容中最后一个 {...} JSON 块
                json_matches = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', content)
                if json_matches:
                    for candidate in reversed(json_matches):
                        try:
                            return json.loads(candidate)
                        except json.JSONDecodeError:
                            continue
                logger.error(f"无法从LLM响应中提取JSON: {content[:300]}")
                return None

    except httpx.TimeoutException:
        logger.error("LLM API调用超时")
        return None
    except httpx.HTTPStatusError as e:
        logger.error(f"LLM API返回错误: {e.response.status_code} - {e.response.text}")
        return None
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        logger.error(f"解析LLM响应失败: {e}")
        return None
    except Exception as e:
        logger.error(f"LLM API调用异常: {e}")
        return None


async def analyze_with_llm(
    content: str,
    user_profile: dict = None,
    similar_cases: list = None
) -> dict:
    """
    使用LLM进行诈骗内容分析
    整合用户画像和相似案例进行增强分析
    """
    # 构建增强提示
    prompt_parts = [f"一位群众收到了以下可疑信息，请从反诈专家角度分析该信息是否是诈骗：\n\n【用户收到的信息】\n{content}\n【信息结束】"]

    # 添加用户画像信息
    if user_profile:
        role_type = user_profile.get("role_type", "other")
        profile_prompt = USER_PROFILE_PROMPT_TEMPLATE.format(
            age=user_profile.get("age", "未知"),
            gender=user_profile.get("gender", "未知"),
            role_type=role_type,
            occupation=user_profile.get("occupation", "未知"),
            risk_score=user_profile.get("risk_score", 0.0),
            role_specific_hints=ROLE_HINTS.get(role_type, "")
        )
        prompt_parts.append(profile_prompt)

    # 添加相似案例参考
    if similar_cases:
        cases_text = "\n\n参考相似案例（来自知识库）:\n"
        for i, case in enumerate(similar_cases[:3], 1):
            cases_text += f"\n案例{i}: {case.get('title', '')}\n{case.get('content', '')[:300]}\n"
        prompt_parts.append(cases_text)

    prompt_parts.append(FEW_SHOT_EXAMPLES)
    full_prompt = "\n".join(prompt_parts)

    result = await call_llm(full_prompt)
    return result


async def generate_report_content(
    stats: dict,
    user_profile: dict = None
) -> str:
    """
    使用LLM生成安全监测报告
    """
    report_prompt = f"""请根据以下数据生成一份安全监测报告（Markdown格式）：

统计数据：
- 检测总次数: {stats.get('total_detections', 0)}
- 发现诈骗: {stats.get('fraud_detected', 0)}次
- 风险分布: {json.dumps(stats.get('risk_summary', {}), ensure_ascii=False)}
- 诈骗类型分布: {json.dumps(stats.get('fraud_type_summary', {}), ensure_ascii=False)}
- 时间范围: {stats.get('period', '')}

请生成包含以下部分的报告：
1. 安全概况总结
2. 风险趋势分析
3. 主要诈骗类型分析
4. 个性化防御建议
5. 安全提醒

请用严肃专业的语气, 直接输出报告内容（Markdown格式），不要输出JSON。"""

    system_prompt = "你是一个专业的反诈安全分析师，负责生成安全监测报告。请用专业、严肃的语气撰写报告。"

    if not settings.LLM_API_KEY:
        # 无LLM时生成模板报告
        return _generate_template_report(stats)

    try:
        headers = {
            "Authorization": f"Bearer {settings.LLM_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "/no_think\n" + report_prompt}
            ],
            "max_tokens": settings.LLM_MAX_TOKENS,
            "temperature": 0.5,
            "stream": False,
            "chat_template_kwargs": {"enable_thinking": False}
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                settings.LLM_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()

            # 处理 SSE 格式响应
            raw_text = response.text.strip()
            if raw_text.startswith("data:"):
                all_data = []
                for line in raw_text.split("\n"):
                    line = line.strip()
                    if line.startswith("data:") and line != "data: [DONE]":
                        all_data.append(line[len("data:"):].strip())
                if all_data:
                    result = json.loads(all_data[0])
                else:
                    return _generate_template_report(stats)
            else:
                result = json.loads(raw_text)

            choice = result["choices"][0]
            msg = choice.get("message") or choice.get("delta", {})
            return msg.get("content", "")
    except Exception as e:
        logger.error(f"生成报告失败: {e}")
        return _generate_template_report(stats)


def _generate_template_report(stats: dict) -> str:
    """无LLM可用时的模板报告"""
    return f"""# 📊 安全监测报告

## 一、安全概况

| 指标 | 数值 |
|------|------|
| 检测总次数 | {stats.get('total_detections', 0)} |
| 发现诈骗 | {stats.get('fraud_detected', 0)} |
| 安全检测 | {stats.get('total_detections', 0) - stats.get('fraud_detected', 0)} |

## 二、风险分析

在监测期间共进行了 {stats.get('total_detections', 0)} 次内容检测，
其中 {stats.get('fraud_detected', 0)} 次检测到了诈骗风险。

## 三、防御建议

1. 不要轻信陌生人发来的投资、兼职信息
2. 涉及转账汇款的操作务必核实对方身份
3. 不要向任何人透露验证码、密码等信息
4. 如遇可疑情况，立即拨打96110反诈热线
5. 下载并使用国家反诈中心APP

---
*本报告由反诈智能体助手自动生成*
"""
