"""
基于 data/test.json 评估反诈识别效果并生成图示

输出:
1) backend/data/eval/metrics.json
2) backend/data/eval/confusion_matrix.png
3) backend/data/eval/f1_summary.png
"""
import asyncio
import json
from pathlib import Path
import sys

from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.fraud_detector import fraud_detector
from app.config import settings


ROOT = Path(__file__).resolve().parents[3]
TEST_FILE = ROOT / "data" / "test.json"
OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "eval"


def load_cases(path: Path):
    data = json.loads(path.read_text(encoding="utf-8"))
    records = []
    for website in data:
        for item in website.get("source_data", []):
            title = item.get("title", "")
            content = item.get("content", "")
            label = 1 if "【黑样本】" in title else 0
            records.append({"title": title, "content": content, "label": label})
    return records


async def run_eval(cases):
    y_true = []
    y_pred = []
    y_score = []

    for case in cases:
        result = await fraud_detector.detect_text(
            content=case["content"],
            user=None,
            db=None,
            use_llm=False,
        )
        y_true.append(case["label"])
        y_pred.append(1 if result.get("is_fraud") else 0)
        y_score.append(float(result.get("risk_score", 0.0)))

    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    accuracy = accuracy_score(y_true, y_pred)
    cm = confusion_matrix(y_true, y_pred)

    best = find_best_threshold(y_true, y_score)

    return {
        "samples": len(cases),
        "positive_samples": int(sum(y_true)),
        "negative_samples": int(len(y_true) - sum(y_true)),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1": round(float(f1), 4),
        "accuracy": round(float(accuracy), 4),
        "current_threshold": settings.DETECTION_FRAUD_THRESHOLD,
        "recommended_threshold": best["threshold"],
        "recommended_f1": best["f1"],
        "recommended_precision": best["precision"],
        "recommended_recall": best["recall"],
        "confusion_matrix": cm.tolist(),
    }


def find_best_threshold(y_true, y_score):
    best = {"threshold": 0.5, "f1": 0.0, "precision": 0.0, "recall": 0.0}
    for step in range(20, 91):
        threshold = step / 100
        y_pred = [1 if s >= threshold else 0 for s in y_score]
        precision = precision_score(y_true, y_pred, zero_division=0)
        recall = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        if f1 > best["f1"]:
            best = {
                "threshold": round(threshold, 2),
                "f1": round(float(f1), 4),
                "precision": round(float(precision), 4),
                "recall": round(float(recall), 4),
            }
    return best


def draw_confusion(cm, out_file: Path):
    import matplotlib.pyplot as plt  # type: ignore[reportMissingImports]

    fig, ax = plt.subplots(figsize=(5, 4), dpi=140)
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks([0, 1], labels=["Pred Safe", "Pred Fraud"])
    ax.set_yticks([0, 1], labels=["True Safe", "True Fraud"])
    ax.set_title("Confusion Matrix")

    for i in range(2):
        for j in range(2):
            ax.text(j, i, str(cm[i][j]), ha="center", va="center", color="black")

    fig.colorbar(im, ax=ax)
    fig.tight_layout()
    fig.savefig(out_file)
    plt.close(fig)


def draw_summary(metrics: dict, out_file: Path):
    import matplotlib.pyplot as plt  # type: ignore[reportMissingImports]

    names = ["Precision", "Recall", "F1", "Accuracy"]
    values = [
        metrics["precision"],
        metrics["recall"],
        metrics["f1"],
        metrics["accuracy"],
    ]

    fig, ax = plt.subplots(figsize=(7, 4), dpi=140)
    bars = ax.bar(names, values)
    ax.set_ylim(0, 1.0)
    ax.set_title("Anti-Fraud Performance Metrics")
    ax.set_ylabel("Score")

    colors = ["#4c78a8", "#f58518", "#54a24b", "#e45756"]
    for b, c, v in zip(bars, colors, values):
        b.set_color(c)
        ax.text(b.get_x() + b.get_width() / 2, v + 0.02, f"{v:.3f}", ha="center")

    fig.tight_layout()
    fig.savefig(out_file)
    plt.close(fig)


async def main():
    if not TEST_FILE.exists():
        raise FileNotFoundError(f"未找到测试文件: {TEST_FILE}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cases = load_cases(TEST_FILE)
    metrics = await run_eval(cases)

    metrics_file = OUT_DIR / "metrics.json"
    cm_file = OUT_DIR / "confusion_matrix.png"
    summary_file = OUT_DIR / "f1_summary.png"

    metrics_file.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    draw_confusion(metrics["confusion_matrix"], cm_file)
    draw_summary(metrics, summary_file)

    print(json.dumps({
        "metrics": str(metrics_file),
        "confusion_matrix": str(cm_file),
        "summary": str(summary_file),
        "f1": metrics["f1"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
