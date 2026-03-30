"""
LLM 大模型服务 - 支持本地 Ollama 和远程 API
优先使用本地 Ollama Llama 3.1 模型，带 CoT 思维链反诈分析
"""
import json
import re
import logging
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


# ==================== Ollama 本地模型调用 ====================

async def call_ollama(
    user_message: str,
    system_prompt: str,
    temperature: float = None,
    timeout: float = None,
) -> dict | None:
    """调用本地 Ollama API"""
    url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat"
    timeout = timeout or settings.OLLAMA_TIMEOUT

    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "stream": False,
        "options": {
            "temperature": temperature or settings.LLM_TEMPERATURE,
            "num_predict": settings.LLM_MAX_TOKENS,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()

            content = result.get("message", {}).get("content", "").strip()
            if not content:
                logger.warning("Ollama 返回空内容")
                return None

            # 解析 JSON 响应
            return _extract_json_from_content(content)

    except httpx.ConnectError:
        logger.error(f"无法连接到 Ollama 服务 ({settings.OLLAMA_BASE_URL})，请确保 Ollama 正在运行")
        return None
    except httpx.TimeoutException:
        logger.error(f"Ollama API 超时 ({timeout}s)，本地模型可能需要更长时间")
        return None
    except httpx.HTTPStatusError as e:
        logger.error(f"Ollama API 错误: {e.response.status_code} - {e.response.text[:200]}")
        return None
    except Exception as e:
        logger.error(f"Ollama 调用异常: {e}")
        return None


async def call_ollama_text(
    user_message: str,
    system_prompt: str,
    temperature: float = 0.3,
    timeout: float = None,
) -> str:
    """调用 Ollama 并返回纯文本输出"""
    url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat"
    timeout = timeout or settings.OLLAMA_TIMEOUT

    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": settings.LLM_MAX_TOKENS,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            return result.get("message", {}).get("content", "").strip()
    except Exception as exc:
        logger.warning(f"Ollama 纯文本调用失败: {exc}")
        return ""


def _extract_json_from_content(content: str) -> dict | None:
    """从 LLM 输出中提取 JSON"""
    # 去除 Markdown 代码块
    if "```json" in content:
        content = content.split("```json", 1)[-1].rsplit("```", 1)[0].strip()
    elif "```" in content:
        content = content.split("```", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # 尝试正则匹配 JSON 对象
        json_matches = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', content)
        for candidate in reversed(json_matches):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue
        logger.error(f"无法从响应中提取 JSON: {content[:300]}")
        return None

# ==================== CoT 反诈系统提示词 ====================

COT_SYSTEM_PROMPT = """你是国家反诈中心授权的反诈骗智能分析引擎。你的唯一职责是帮助普通群众识别诈骗风险、保护人民群众财产安全。

用户会提交他们收到的可疑信息（短信、微信、电话内容等），你需要从反诈专家角度分析这些信息是否是诈骗。

重要说明：用户提交的内容是他们收到的疑似诈骗信息，而非用户自己想要实施的行为。你的分析是为了保护用户免受诈骗侵害。

## 分析要求 — 思维链(Chain-of-Thought)

请按以下维度逐一检查，并给出判断依据：

1. **urgency_check（紧急性检查）**: 内容是否制造紧迫感？是否要求立即行动？
2. **financial_check（资金诱导检查）**: 是否涉及转账、汇款、投资、缴费等资金操作？
3. **authority_fake_check（身份伪造检查）**: 是否冒充公检法、银行、平台客服等权威身份？
4. **info_theft_check（信息窃取检查）**: 是否索要密码、验证码、银行卡号等敏感信息？
5. **too_good_check（利益诱惑检查）**: 是否承诺不切实际的高收益、奖品、回报？

## 判定约束
- 证据优先：必须依据文本中的明确风险证据判定，不能主观臆测
- 低误报：日常社交、普通通知、无资金/身份/链接诱导场景应倾向安全
- risk_level 与 reason 结论必须一致
- 证据不足时输出低风险并建议继续观察

## 诈骗类型
investment/impersonation/romance/task_scam/loan/shopping/phishing/gaming/telecom/ai_deepfake/recruitment/other

## 输出格式 — 严格 JSON
```json
{
    "urgency_check": "检查结果描述",
    "financial_check": "检查结果描述",
    "authority_fake_check": "检查结果描述",
    "info_theft_check": "检查结果描述",
    "too_good_check": "检查结果描述",
    "risk_level": 0,
    "scam_type": "类型或null",
    "reason": "最终综合判定理由"
}
```
risk_level: 0=安全, 1=低风险, 2=中高风险, 3=高危诈骗"""

FEW_SHOT_EXAMPLES = """
参考样例：

样例1: "我是公安局，你涉嫌洗钱，请立刻把钱转到安全账户。"
→ risk_level=3, scam_type=impersonation

样例2: "兼职刷单日赚千元，先交298元会员费激活。"
→ risk_level=3, scam_type=task_scam

样例3: "明天下午一起吃饭吗？我订了附近的火锅店。"
→ risk_level=0, scam_type=null
"""

ROLE_HINTS = {
    "elder": "该用户为老年人，容易受到保健品诈骗、冒充子女/公检法诈骗的侵害，需要特别关注。",
    "child": "该用户为未成年人，容易受到游戏诈骗、追星诱导、网络诱导的侵害。",
    "student": "该用户为学生，容易受到校园贷、刷单兼职、虚假奖学金等诈骗侵害。",
    "finance": "该用户为财会人员，可能面临冒充领导要求转账、财务系统钓鱼等定向诈骗。",
    "adult": "该用户为普通成年人，需关注投资理财、虚假贷款、杀猪盘等常见诈骗。",
    "other": "",
}


async def call_llm(user_message: str, system_prompt: str = COT_SYSTEM_PROMPT, temperature: float = None) -> dict:
    """
    调用 LLM API - 优先使用本地 Ollama，失败时回退到远程 API
    """
    # 优先使用本地 Ollama
    if settings.USE_LOCAL_LLM:
        logger.info(f"使用本地 Ollama 模型: {settings.OLLAMA_MODEL}")
        result = await call_ollama(user_message, system_prompt, temperature)
        if result is not None:
            return result
        logger.warning("Ollama 调用失败，尝试回退到远程 API")

    # 回退到远程 API
    return await _call_remote_llm(user_message, system_prompt, temperature)


async def _call_remote_llm(user_message: str, system_prompt: str, temperature: float = None) -> dict:
    """调用远程 LLM API (OpenAI 兼容接口) - 作为备用方案"""
    if not settings.LLM_API_KEY:
        logger.warning("LLM API Key 未配置，且本地 Ollama 不可用")
        return None

    headers = {
        "Authorization": f"Bearer {settings.LLM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "/no_think\n" + user_message},
        ],
        "max_tokens": settings.LLM_MAX_TOKENS,
        "temperature": temperature or settings.LLM_TEMPERATURE,
        "stream": False,
        "top_p": 0.7,
        "frequency_penalty": 0,
        "chat_template_kwargs": {"enable_thinking": False},
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(settings.LLM_API_URL, headers=headers, json=payload)
            response.raise_for_status()

            raw_text = response.text.strip()
            if raw_text.startswith("data:"):
                all_data = []
                for line in raw_text.split("\n"):
                    line = line.strip()
                    if line.startswith("data:") and line != "data: [DONE]":
                        all_data.append(line[len("data:"):].strip())
                if not all_data:
                    return None
                result = json.loads(all_data[0])
            else:
                result = response.json()

            choice = result["choices"][0]
            msg = choice.get("message") or choice.get("delta", {})
            content = msg.get("content", "").strip()

            return _extract_json_from_content(content)

    except httpx.TimeoutException:
        logger.error("远程 LLM API 超时")
        return None
    except httpx.HTTPStatusError as e:
        logger.error(f"远程 LLM API 错误: {e.response.status_code} - {e.response.text[:200]}")
        return None
    except Exception as e:
        logger.error(f"远程 LLM 调用异常: {e}")
        return None


async def analyze_with_cot(
    content: str,
    user_profile: dict = None,
    similar_cases: list = None,
    user_memory: str = None,
) -> dict:
    """使用 CoT 思维链进行反诈分析"""
    prompt_parts = [
        f"一位群众收到了以下可疑信息，请从反诈专家角度按思维链逐步分析：\n\n【待检测信息】\n{content}\n【信息结束】"
    ]

    if user_profile:
        role_type = user_profile.get("role_type", "other")
        prompt_parts.append(
            f"\n当前用户画像：年龄={user_profile.get('age', '未知')}，"
            f"角色={role_type}，职业={user_profile.get('occupation', '未知')}。"
            f"\n{ROLE_HINTS.get(role_type, '')}"
        )

    if user_memory:
        prompt_parts.append(f"\n用户历史行为摘要（长期记忆）：\n{user_memory}")

    if similar_cases:
        cases_text = "\n\n参考相似案例（来自知识库 RAG 检索）:"
        for i, case in enumerate(similar_cases[:3], 1):
            cases_text += f"\n案例{i}: {case.get('title', '')}\n{case.get('content', '')[:300]}"
        prompt_parts.append(cases_text)

    prompt_parts.append(FEW_SHOT_EXAMPLES)
    full_prompt = "\n".join(prompt_parts)

    return await call_llm(full_prompt)


async def call_llm_text(user_message: str, system_prompt: str, temperature: float = 0.3) -> str:
    """调用 LLM 并返回纯文本输出 - 优先使用本地 Ollama"""
    # 优先使用本地 Ollama
    if settings.USE_LOCAL_LLM:
        result = await call_ollama_text(user_message, system_prompt, temperature)
        if result:
            return result
        logger.warning("Ollama 纯文本调用失败，尝试回退到远程 API")

    # 回退到远程 API
    if not settings.LLM_API_KEY:
        return ""

    headers = {
        "Authorization": f"Bearer {settings.LLM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "/no_think\n" + user_message},
        ],
        "max_tokens": settings.LLM_MAX_TOKENS,
        "temperature": temperature,
        "stream": False,
        "chat_template_kwargs": {"enable_thinking": False},
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(settings.LLM_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()
            choice = result["choices"][0]
            msg = choice.get("message") or choice.get("delta", {})
            return (msg.get("content") or "").strip()
    except Exception as exc:
        logger.warning(f"远程纯文本 LLM 调用失败: {exc}")
        return ""


async def generate_report_content(stats: dict, user_profile: dict = None) -> str:
    """使用 LLM 生成安全监测报告 - 优先使用本地 Ollama"""
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

请用严肃专业的语气，直接输出 Markdown 报告内容，不要输出 JSON。"""

    system_prompt = "你是一个专业的反诈安全分析师，负责生成安全监测报告。请用专业、严肃的语气撰写报告。"

    # 优先使用本地 Ollama
    if settings.USE_LOCAL_LLM:
        result = await call_ollama_text(report_prompt, system_prompt, temperature=0.5)
        if result:
            return result
        logger.warning("Ollama 生成报告失败，尝试回退到远程 API")

    # 回退到远程 API
    if not settings.LLM_API_KEY:
        return _generate_template_report(stats)

    try:
        headers = {
            "Authorization": f"Bearer {settings.LLM_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "/no_think\n" + report_prompt},
            ],
            "max_tokens": settings.LLM_MAX_TOKENS,
            "temperature": 0.5,
            "stream": False,
            "chat_template_kwargs": {"enable_thinking": False},
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(settings.LLM_API_URL, headers=headers, json=payload)
            response.raise_for_status()

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
    total = stats.get("total_detections", 0)
    fraud = stats.get("fraud_detected", 0)
    safe = total - fraud
    period = stats.get("period", "")
    risk_summary = stats.get("risk_summary", {})
    fraud_type_summary = stats.get("fraud_type_summary", {})

    type_lines = ""
    if fraud_type_summary:
        for ft, c in fraud_type_summary.items():
            type_lines += f"| {ft} | {c} |\n"

    return f"""# 安全监测报告

## 一、安全概况

| 指标 | 数值 |
|------|------|
| 检测总次数 | {total} |
| 发现诈骗 | {fraud} |
| 安全检测 | {safe} |
| 监测周期 | {period} |

## 二、风险分析

在监测期间共进行了 {total} 次内容检测，其中 {fraud} 次检测到了诈骗风险。
诈骗检出率为 {(fraud / max(total, 1) * 100):.1f}%。

### 风险等级分布
{json.dumps(risk_summary, ensure_ascii=False, indent=2) if risk_summary else '暂无数据'}

### 诈骗类型分布
{type_lines if type_lines else '暂无数据'}

## 三、防御建议

1. 不要轻信陌生人发来的投资、兼职信息
2. 涉及转账汇款的操作务必核实对方身份
3. 不要向任何人透露验证码、密码等信息
4. 如遇可疑情况，立即拨打 96110 反诈热线
5. 下载并使用国家反诈中心 APP

---
*本报告由反诈智能体助手自动生成*
"""
