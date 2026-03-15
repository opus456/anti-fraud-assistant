import time
from app.utils.text_processor import calculate_text_risk_score, clean_text

text = "你好我是公安局的请把钱转到安全账户"
start = time.time()
result = calculate_text_risk_score(clean_text(text))
elapsed = time.time() - start
print(f"Score: {result['total_score']:.3f}")
print(f"Type: {result['top_fraud_type']}")
print(f"Keywords: {result['matched_keywords']}")
print(f"Time: {elapsed:.3f}s")
