"""
LLM 大模型服务 - 支持本地 Ollama 和远程 API
优先使用本地 Ollama gemma3:4b 模型，支持多模态（文本+图像）分析
"""
import json
import re
import base64
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
    images: list[str] = None,  # base64 编码的图片列表
) -> dict | None:
    """调用本地 Ollama API，支持多模态（文本+图像）"""
    url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat"
    timeout = timeout or settings.OLLAMA_TIMEOUT

    # 构建消息
    user_msg = {"role": "user", "content": user_message}
    if images:
        # 多模态请求 - 添加图片
        user_msg["images"] = images
        logger.info(f"多模态请求: 包含 {len(images)} 张图片")

    payload = {
        "model": settings.OLLAMA_VISION_MODEL if images else settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            user_msg,
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

            logger.info(f"Ollama 原始返回: {content[:300]}")
            
            # 解析 JSON 响应
            parsed = _extract_json_from_content(content)
            if parsed:
                logger.info(f"Ollama JSON 解析成功: risk_level={parsed.get('risk_level')}")
            else:
                logger.warning(f"Ollama JSON 解析失败，原始内容: {content[:500]}")
            return parsed

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


async def call_ollama_vision(
    prompt: str,
    image_data: bytes,
    system_prompt: str = None,
    timeout: float = None,
) -> dict | None:
    """调用 Ollama 视觉模型分析图片"""
    # 将图片转为 base64
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    
    vision_system = system_prompt or """你是反诈AI视觉分析专家。分析图片中的内容，判断是否存在诈骗风险。

关注以下内容：
1. 聊天记录截图：分析对话内容是否涉及诈骗
2. 转账截图：检查是否有可疑转账要求
3. APP界面：识别虚假投资/贷款/返利APP
4. 二维码：警告不要扫描来源不明的二维码

输出严格JSON格式：
{"risk_level":0-3,"scam_type":"类型","reason":"一句话分析","detected_text":"图片中识别的关键文字"}"""

    return await call_ollama(
        user_message=prompt or "请分析这张图片是否存在诈骗风险",
        system_prompt=vision_system,
        images=[image_base64],
        timeout=timeout or 90.0,  # 图片分析需要更长时间
    )


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

# ==================== CoT 反诈系统提示词（增强版）====================

COT_SYSTEM_PROMPT = """你是专业的反电信诈骗AI分析师。你需要对用户收到的消息进行深度分析，判断是否为诈骗信息。

## 分析维度
1. **紧迫性操纵**: 是否使用"立即"、"紧急"、"马上"等词制造紧迫感，迫使受害者仓促决定？
2. **利益诱导**: 是否承诺高额回报、免费礼品、中奖等不合理利益？
3. **身份伪装**: 是否冒充公安、法院、银行、平台客服、领导、亲友等权威/熟人身份？
4. **信息窃取**: 是否索要银行卡号、密码、验证码、身份证号等敏感信息？
5. **资金转移**: 是否诱导转账、充值、购买礼品卡、扫码支付等？
6. **话术模式**: 是否符合已知诈骗话术模式（杀猪盘、刷单返利、贷款诈骗等）？

## 风险等级定义
- 0=安全: 正常对话，无任何诈骗特征
- 1=低风险: 有轻微可疑点，需保持警惕
- 2=中风险: 存在明显诈骗特征，建议停止交流
- 3=高危: 典型诈骗话术，必须立即阻止

## 诈骗类型
investment(投资理财)|impersonation(冒充身份)|romance(杀猪盘/情感诈骗)|task_scam(刷单兼职)|loan(贷款诈骗)|shopping(购物诈骗)|phishing(钓鱼诈骗)|gaming(游戏诈骗)|telecom(电信诈骗)|recruitment(招聘诈骗)|other(其他)

## 输出要求
严格输出JSON格式，reason字段用中文简要说明判断依据：
{"risk_level":数字,"scam_type":"类型或null","reason":"一句话判断依据"}"""

# 增强的少样本示例
FEW_SHOT_EXAMPLES = """
## 示例

输入:"公安局通知你涉嫌洗钱犯罪，需要将资金转入安全账户配合调查，否则将冻结所有资产"
分析:冒充公安机关→制造紧迫感→要求资金转移→典型冒充公检法诈骗
输出:{"risk_level":3,"scam_type":"impersonation","reason":"冒充公安要求转账到安全账户，典型公检法诈骗"}

输入:"恭喜您中奖100万！请点击链接领取，需先缴纳20%个人所得税"
分析:虚假中奖→要求先付款→钓鱼链接→典型中奖诈骗
输出:{"risk_level":3,"scam_type":"phishing","reason":"虚假中奖要求缴税，典型钓鱼诈骗"}

输入:"我是XX平台客服，检测到您的订单异常需要退款，请添加QQ处理"
分析:冒充客服→制造问题→诱导私聊→典型冒充客服诈骗
输出:{"risk_level":3,"scam_type":"impersonation","reason":"冒充平台客服诱导私聊，典型退款诈骗"}

输入:"明天一起吃饭吗？"
分析:日常社交邀约→无可疑特征
输出:{"risk_level":0,"scam_type":null,"reason":"正常社交邀约"}

输入:"我们是征信修复中心，可以帮您处理逾期记录，费用998元"
分析:虚假机构→征信修复骗局→预付费用→典型贷款相关诈骗
输出:{"risk_level":3,"scam_type":"loan","reason":"虚假征信修复机构收费，征信无法私下修复"}

输入:"在家轻松赚钱，日入500+，只需手机操作，先做任务后结算"
分析:高额回报→刷单任务→先投入后返利模式→典型刷单诈骗
输出:{"risk_level":3,"scam_type":"task_scam","reason":"典型刷单诈骗话术，承诺高回报诱导投入"}
"""

ROLE_HINTS = {
    "elder": "⚠️该用户为老年人，需特别警惕：保健品诈骗、冒充子女急需用钱、冒充公检法、以房养老骗局、投资理财诈骗。老年人对电子产品和网络不熟悉，更易轻信权威，请从严判断。",
    "child": "⚠️该用户为未成年人，需特别警惕：游戏充值诈骗、虚假追星、网络诱导打赏、假冒老师收费、皮肤/装备交易诈骗。未成年人社会经验不足，请从严判断。",
    "student": "⚠️该用户为学生，需特别警惕：校园贷、刷单兼职、虚假奖学金、培训贷、论文代写骗局、虚假实习offer。学生急于赚钱还款，易受高薪兼职诱惑。",
    "finance": "⚠️该用户为财会人员，需特别警惕：冒充领导紧急转账、伪造合同付款、财务系统钓鱼邮件、供应商账户变更诈骗。财务人员掌握资金权限，是定向诈骗重点目标。",
    "adult": "该用户为普通成年人，需关注：投资理财诈骗、网络贷款诈骗、杀猪盘情感诈骗、冒充客服退款、虚假购物等常见诈骗类型。",
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
    """
    增强型反诈分析 - 融合用户画像、相似案例和历史记忆
    
    Args:
        content: 待分析的文本内容
        user_profile: 用户画像 (age, gender, role_type, occupation, risk_score)
        similar_cases: RAG检索到的相似诈骗案例
        user_memory: 用户长期记忆摘要
    """
    # 构建上下文增强的 prompt
    prompt_parts = []
    
    # 1. 用户画像上下文
    if user_profile:
        role_type = user_profile.get("role_type", "adult")
        role_hint = ROLE_HINTS.get(role_type, "")
        if role_hint:
            prompt_parts.append(f"## 用户画像\n{role_hint}")
        
        # 添加额外的用户信息
        age = user_profile.get("age")
        occupation = user_profile.get("occupation")
        risk_score = user_profile.get("risk_score", 0)
        
        profile_info = []
        if age:
            profile_info.append(f"年龄: {age}岁")
        if occupation:
            profile_info.append(f"职业: {occupation}")
        if risk_score > 0.3:
            profile_info.append(f"历史风险评分: {risk_score:.2f} (该用户曾接触过可疑信息，需从严判断)")
        
        if profile_info:
            prompt_parts.append("用户信息: " + ", ".join(profile_info))
    
    # 2. 相似案例参考
    if similar_cases and len(similar_cases) > 0:
        case_refs = []
        for i, case in enumerate(similar_cases[:3]):
            similarity = case.get("similarity", 0)
            if similarity >= 0.3:  # 只展示相似度较高的案例
                scam_type = case.get("scam_type", "unknown")
                title = case.get("title", "")[:50]
                case_refs.append(f"- [{scam_type}] {title} (相似度:{similarity:.0%})")
        
        if case_refs:
            prompt_parts.append(f"## 相似诈骗案例\n以下案例与当前消息相似，请参考判断：\n" + "\n".join(case_refs))
    
    # 3. 用户历史记忆
    if user_memory:
        prompt_parts.append(f"## 用户历史\n{user_memory[:300]}")
    
    # 4. 待分析内容
    prompt_parts.append(f"## 待分析消息\n```\n{content[:800]}\n```")
    
    # 5. 添加少样本示例和输出指令
    prompt_parts.append(FEW_SHOT_EXAMPLES)
    prompt_parts.append("\n## 你的判断\n请分析上述消息，直接输出JSON结果:")
    
    full_prompt = "\n\n".join(prompt_parts)
    
    return await call_llm(full_prompt, system_prompt=COT_SYSTEM_PROMPT, temperature=0.1)


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
