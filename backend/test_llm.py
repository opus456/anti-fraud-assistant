"""测试 LLM API 连通性和思考模式控制"""
import asyncio
import httpx
import json
import time


async def test_no_think():
    """测试禁用思考模式"""
    start = time.time()
    headers = {
        "Authorization": "Bearer BKxf_NoAL7ciz_yxQsrKisME",
        "Content-Type": "application/json"
    }
    # 方法: 使用 /no_think 标签 + chat_template_kwargs
    payload = {
        "model": "Qwen/Qwen3.5-397B-A17B",
        "messages": [
            {"role": "system", "content": "你是反诈助手。请直接输出JSON，不要思考过程。"},
            {"role": "user", "content": "/no_think\n分析以下内容是否诈骗：恭喜中奖100万，转账500元手续费领取。\n回复JSON: {\"is_fraud\": bool, \"risk_score\": float, \"analysis\": str}"}
        ],
        "max_tokens": 1024,
        "temperature": 0.3,
        "stream": False,
        "top_p": 0.7,
        "frequency_penalty": 0,
        "chat_template_kwargs": {"enable_thinking": False}
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            "https://api-ai.gitcode.com/v1/chat/completions",
            headers=headers,
            json=payload
        )
        elapsed = time.time() - start
        print(f"状态: {r.status_code}, 耗时: {elapsed:.1f}s")
        raw = r.text.strip()
        if raw.startswith("data:"):
            for line in raw.split("\n"):
                line = line.strip()
                if line.startswith("data:") and "DONE" not in line:
                    data = json.loads(line[5:].strip())
                    c = data["choices"][0]["message"]["content"]
                    print(f"模型: {data.get('model')}")
                    print(f"finish_reason: {data['choices'][0]['finish_reason']}")
                    print(f"tokens: {data.get('usage', {})}")
                    print(f"内容:\n{c[:800]}")
                    # 尝试提取JSON
                    if "```json" in c:
                        j = c.split("```json", 1)[-1].split("```", 1)[0].strip()
                        print(f"\n提取的JSON:\n{j}")
                    elif "{" in c:
                        import re
                        matches = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', c)
                        if matches:
                            print(f"\n提取的JSON:\n{matches[-1]}")
        else:
            print(f"原始: {raw[:500]}")


if __name__ == "__main__":
    asyncio.run(test_no_think())
