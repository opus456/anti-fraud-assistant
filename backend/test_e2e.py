"""多场景 E2E 测试"""
import httpx
import json
import time

base = "http://127.0.0.1:8000"

# 登录
r = httpx.post(f"{base}/api/auth/login", json={"username": "test_e2e2", "password": "Test123456"}, timeout=10.0)
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

tests = [
    ("冒充公检法", "您好，我是公安局的民警，您的银行账户涉嫌洗钱犯罪，请立即将资金转移到安全账户配合调查。"),
    ("刷单诈骗",  "日赚500-1000，只需手机点赞关注就能赚钱！零投入高回报，佣金日结！加入我们的刷单群吧！"),
    ("虚假中奖",  "恭喜您中奖了！请立即转账500元手续费到以下账户领取100万大奖，这是最后机会不要错过！"),
    ("安全内容",  "明天中午在公司楼下吃饭，你要来吗？我请客。"),
]

for name, content in tests:
    print(f"=== {name} ===")
    start = time.time()
    r = httpx.post(f"{base}/api/detection/quick", json={"content": content}, headers=h, timeout=300.0)
    d = r.json()
    elapsed = time.time() - start
    print(f"  诈骗: {d.get('is_fraud')} | 评分: {d.get('risk_score')} | 等级: {d.get('risk_level')}")
    print(f"  类型: {d.get('fraud_type_label')}")
    analysis = d.get("analysis", "")[:200]
    print(f"  分析: {analysis}")
    print(f"  耗时: {round(elapsed, 1)}s")
    print()

print("=== 全部测试完成 ===")
