#!/usr/bin/env python3
"""
反诈智能体助手 - 功能测试与性能验证脚本

测试目标：
1. 识别准确率 > 90%
2. 误报率 < 5%
3. 响应时间 < 10秒
4. 覆盖10+种诈骗类型
"""
import json
import time
import asyncio
import httpx
import statistics
import sys

# 尝试将 stdout 设置为 UTF-8，避免 Windows 控制台因 emoji 等字符抛出 UnicodeEncodeError
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime

# 配置
API_BASE_URL = "http://localhost:8000"
TEST_DATA_PATH = Path(__file__).parent.parent / "test_data" / "test_dataset.json"

@dataclass
class TestResult:
    total_samples: int = 0
    correct_predictions: int = 0
    false_positives: int = 0  # 正常样本被判为诈骗
    false_negatives: int = 0  # 诈骗样本被判为正常
    true_positives: int = 0   # 诈骗样本被正确识别
    true_negatives: int = 0   # 正常样本被正确识别
    response_times: list = field(default_factory=list)
    errors: list = field(default_factory=list)
    fraud_type_results: dict = field(default_factory=dict)

    @property
    def accuracy(self) -> float:
        if self.total_samples == 0:
            return 0.0
        return self.correct_predictions / self.total_samples

    @property
    def false_positive_rate(self) -> float:
        total_negatives = self.true_negatives + self.false_positives
        if total_negatives == 0:
            return 0.0
        return self.false_positives / total_negatives

    @property
    def recall(self) -> float:
        total_positives = self.true_positives + self.false_negatives
        if total_positives == 0:
            return 0.0
        return self.true_positives / total_positives

    @property
    def precision(self) -> float:
        predicted_positives = self.true_positives + self.false_positives
        if predicted_positives == 0:
            return 0.0
        return self.true_positives / predicted_positives

    @property
    def avg_response_time(self) -> float:
        if not self.response_times:
            return 0.0
        return statistics.mean(self.response_times)

    @property
    def max_response_time(self) -> float:
        if not self.response_times:
            return 0.0
        return max(self.response_times)


async def test_detection_api(text: str, timeout: float = 30.0) -> tuple[Optional[dict], float]:
    """调用检测API并返回结果和响应时间"""
    # 使用无需认证的快速检测接口，POST 字段为 `content`
    url = f"{API_BASE_URL}/api/detection/quick"

    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json={"content": text})
            response.raise_for_status()
            elapsed = time.time() - start_time
            return response.json(), elapsed
    except Exception as e:
        elapsed = time.time() - start_time
        return None, elapsed


def load_test_data() -> list[dict]:
    """加载测试数据集"""
    if not TEST_DATA_PATH.exists():
        print(f"❌ 测试数据文件不存在: {TEST_DATA_PATH}")
        print("请先运行 generate_test_data.py 生成测试数据")
        return []
    
    with open(TEST_DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


async def run_detection_tests(samples: list[dict], max_samples: int = None) -> TestResult:
    """运行检测测试"""
    result = TestResult()
    
    if max_samples:
        samples = samples[:max_samples]
    
    result.total_samples = len(samples)
    
    print(f"\n🔍 开始测试 {len(samples)} 个样本...")
    print("-" * 60)
    
    for i, sample in enumerate(samples):
        text = sample.get("text", "")
        is_fraud = sample.get("is_fraud", False)
        fraud_type = sample.get("fraud_type", "unknown")
        fraud_type_label = sample.get("fraud_type_label", "未知")
        
        # 调用API
        api_result, elapsed = await test_detection_api(text)
        result.response_times.append(elapsed)
        
        if api_result is None:
            result.errors.append({"sample_id": i, "text": text[:50], "error": "API调用失败"})
            continue
        
        # 解析结果
        predicted_fraud = api_result.get("is_fraud", False)
        risk_score = api_result.get("risk_score", 0)
        
        # 统计结果
        if is_fraud:
            if predicted_fraud:
                result.true_positives += 1
                result.correct_predictions += 1
            else:
                result.false_negatives += 1
        else:
            if predicted_fraud:
                result.false_positives += 1
            else:
                result.true_negatives += 1
                result.correct_predictions += 1
        
        # 按诈骗类型统计
        if fraud_type not in result.fraud_type_results:
            result.fraud_type_results[fraud_type] = {"total": 0, "correct": 0, "label": fraud_type_label}
        result.fraud_type_results[fraud_type]["total"] += 1
        if is_fraud == predicted_fraud:
            result.fraud_type_results[fraud_type]["correct"] += 1
        
        # 进度显示
        status = "✅" if is_fraud == predicted_fraud else "❌"
        if (i + 1) % 10 == 0 or i == len(samples) - 1:
            print(f"  [{i+1}/{len(samples)}] 准确率: {result.accuracy*100:.1f}% | 平均响应: {result.avg_response_time:.2f}s")
        
        # 避免过快请求
        await asyncio.sleep(0.1)
    
    return result


def print_test_report(result: TestResult):
    """打印测试报告"""
    print("\n" + "=" * 60)
    print("📊 反诈智能体助手 - 测试报告")
    print("=" * 60)
    print(f"⏰ 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # 核心指标
    print("📈 核心指标")
    print("-" * 40)
    print(f"  总样本数: {result.total_samples}")
    print(f"  正确预测: {result.correct_predictions}")
    print(f"  错误数量: {len(result.errors)}")
    print()
    
    # 准确率指标
    accuracy_pass = result.accuracy >= 0.90
    fpr_pass = result.false_positive_rate <= 0.05
    response_pass = result.avg_response_time <= 10.0
    
    print("🎯 性能指标 (目标)")
    print("-" * 40)
    print(f"  识别准确率: {result.accuracy*100:.2f}% {'✅ PASS' if accuracy_pass else '❌ FAIL'} (目标 >90%)")
    print(f"  误报率: {result.false_positive_rate*100:.2f}% {'✅ PASS' if fpr_pass else '❌ FAIL'} (目标 <5%)")
    print(f"  召回率: {result.recall*100:.2f}%")
    print(f"  精确率: {result.precision*100:.2f}%")
    print()
    
    print("⏱️ 响应时间")
    print("-" * 40)
    print(f"  平均响应: {result.avg_response_time:.3f}s {'✅ PASS' if response_pass else '❌ FAIL'} (目标 <10s)")
    print(f"  最大响应: {result.max_response_time:.3f}s")
    if result.response_times:
        print(f"  中位响应: {statistics.median(result.response_times):.3f}s")
    print()
    
    # 混淆矩阵
    print("📊 混淆矩阵")
    print("-" * 40)
    print(f"  真阳性 (TP): {result.true_positives}")
    print(f"  真阴性 (TN): {result.true_negatives}")
    print(f"  假阳性 (FP): {result.false_positives}")
    print(f"  假阴性 (FN): {result.false_negatives}")
    print()
    
    # 按诈骗类型统计
    print("📋 各诈骗类型识别率")
    print("-" * 40)
    fraud_types_count = 0
    for fraud_type, stats in sorted(result.fraud_type_results.items(), key=lambda x: -x[1]["total"]):
        if fraud_type and fraud_type != "unknown":
            fraud_types_count += 1
            acc = stats["correct"] / stats["total"] * 100 if stats["total"] > 0 else 0
            label = stats.get("label", fraud_type)
            print(f"  {label}: {acc:.1f}% ({stats['correct']}/{stats['total']})")
    
    types_pass = fraud_types_count >= 10
    print()
    print(f"  覆盖诈骗类型: {fraud_types_count} 种 {'✅ PASS' if types_pass else '❌ FAIL'} (目标 ≥10种)")
    print()
    
    # 总体评估
    print("=" * 60)
    all_pass = accuracy_pass and fpr_pass and response_pass and types_pass
    if all_pass:
        print("🎉 所有测试指标通过！系统满足设计要求。")
    else:
        print("⚠️ 部分指标未达标，请检查并优化。")
        if not accuracy_pass:
            print("  - 准确率未达90%，建议优化检测模型")
        if not fpr_pass:
            print("  - 误报率超过5%，建议调整阈值")
        if not response_pass:
            print("  - 响应时间超过10秒，建议优化性能")
        if not types_pass:
            print("  - 诈骗类型覆盖不足10种，建议增加数据")
    print("=" * 60)
    
    # 返回是否全部通过
    return all_pass


async def quick_smoke_test():
    """快速冒烟测试 - 验证API是否可用"""
    print("\n🔥 快速冒烟测试...")
    
    test_cases = [
        ("您好，恭喜您中奖100万，请点击链接领取", True, "shopping"),
        ("今天天气真好，我们去公园散步吧", False, None),
        ("投资理财稳赚不赔，日收益3%，加我微信了解", True, "investment"),
        ("明天的会议记得准时参加", False, None),
    ]
    
    passed = 0
    for text, expected_fraud, fraud_type in test_cases:
        result, elapsed = await test_detection_api(text)
        if result:
            actual_fraud = result.get("is_fraud", False)
            status = "✅" if actual_fraud == expected_fraud else "❌"
            print(f"  {status} [{elapsed:.2f}s] {text[:30]}... -> 预期:{expected_fraud}, 实际:{actual_fraud}")
            if actual_fraud == expected_fraud:
                passed += 1
        else:
            print(f"  ❌ API调用失败: {text[:30]}...")
    
    print(f"\n  冒烟测试: {passed}/{len(test_cases)} 通过")
    return passed == len(test_cases)


async def main():
    import argparse

    # 在函数开始处声明使用模块级的 API_BASE_URL，
    # 避免在使用前才声明 global 导致的 SyntaxError
    global API_BASE_URL

    parser = argparse.ArgumentParser(description="反诈智能体测试脚本")
    parser.add_argument("--smoke", action="store_true", help="仅运行冒烟测试")
    parser.add_argument("--max-samples", type=int, default=None, help="最大测试样本数")
    parser.add_argument("--api-url", type=str, default=API_BASE_URL, help="API基础URL")

    args = parser.parse_args()
    API_BASE_URL = args.api_url
    
    print("=" * 60)
    print("🛡️ 反诈智能体助手 - 自动化测试")
    print("=" * 60)
    print(f"API地址: {API_BASE_URL}")
    
    # 检查API是否可用
    print("\n🔌 检查API连接...")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{API_BASE_URL}/health")
            print(f"  API状态: {response.status_code}")
    except Exception as e:
        print(f"  ❌ API连接失败: {e}")
        print("  请确保Python服务正在运行 (python run.py)")
        return
    
    if args.smoke:
        await quick_smoke_test()
        return
    
    # 加载测试数据
    samples = load_test_data()
    if not samples:
        print("\n⚠️ 无测试数据，运行冒烟测试...")
        await quick_smoke_test()
        return
    
    # 运行完整测试
    result = await run_detection_tests(samples, max_samples=args.max_samples)
    
    # 打印报告
    all_pass = print_test_report(result)
    
    # 保存报告
    report_path = Path(__file__).parent.parent / "test_data" / "test_report.json"
    report = {
        "test_time": datetime.now().isoformat(),
        "total_samples": result.total_samples,
        "accuracy": result.accuracy,
        "false_positive_rate": result.false_positive_rate,
        "recall": result.recall,
        "precision": result.precision,
        "avg_response_time": result.avg_response_time,
        "max_response_time": result.max_response_time,
        "fraud_type_results": result.fraud_type_results,
        "all_pass": all_pass,
    }
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n📄 测试报告已保存: {report_path}")


if __name__ == "__main__":
    asyncio.run(main())
