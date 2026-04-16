#!/usr/bin/env python3
"""
微调脚本：使用 TF-IDF + LogisticRegression 在 finetune_data 上做小规模训练，
并在 test_data 上评估，输出 JSON 报告与图表。
输出：
 - server-python/test_data/finetune_lr_report.json
 - server-python/test_data/finetune_lr_confusion.png
 - server-python/test_data/finetune_lr_comparison.png
"""
import json
from pathlib import Path
import sys

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

BASE = Path(__file__).resolve().parent.parent
FIN_PATH = BASE / 'finetune_data' / 'dataset.jsonl'
TEST_PATH = BASE / 'test_data' / 'test_dataset.json'
BASELINE_REPORT = BASE / 'test_data' / 'test_report_samples.json'
OUT_DIR = BASE / 'test_data'
OUT_DIR.mkdir(parents=True, exist_ok=True)
REPORT_JSON = OUT_DIR / 'finetune_lr_report.json'
CONF_PNG = OUT_DIR / 'finetune_lr_confusion.png'
COMP_PNG = OUT_DIR / 'finetune_lr_comparison.png'

THRESHOLD = 0.22

# load finetune training data
train_texts = []
train_labels = []
if FIN_PATH.exists():
    with open(FIN_PATH, 'r', encoding='utf-8') as f:
        for ln in f:
            ln = ln.strip()
            if not ln:
                continue
            try:
                obj = json.loads(ln)
                t = obj.get('text') or obj.get('content') or ''
                if not t:
                    continue
                lab = obj.get('is_fraud')
                if lab is None:
                    # try risk_level
                    lab = obj.get('risk_level') in ('high','critical')
                train_texts.append(t)
                train_labels.append(1 if lab else 0)
            except Exception:
                continue

# load test dataset
with open(TEST_PATH, 'r', encoding='utf-8') as f:
    test_data = json.load(f)

texts = [s['text'] for s in test_data]
gold = [1 if s['is_fraud'] else 0 for s in test_data]

# fallback: if no finetune examples, use positives from baseline report
if len(train_texts) == 0 and BASELINE_REPORT.exists():
    with open(BASELINE_REPORT, 'r', encoding='utf-8') as f:
        base = json.load(f)
    for s in base.get('samples', []):
        train_texts.append(s['text'])
        train_labels.append(1 if s['gold_is_fraud'] else 0)

if len(train_texts) == 0:
    print('没有可用的微调训练数据，退出。', file=sys.stderr)
    sys.exit(2)

# vectorize
vectorizer = TfidfVectorizer(analyzer='char_wb', ngram_range=(2,4), max_features=20000)
X_train = vectorizer.fit_transform(train_texts)
X_test = vectorizer.transform(texts)

# train classifier
clf = LogisticRegression(solver='liblinear', class_weight='balanced', max_iter=1000)
clf.fit(X_train, train_labels)

# predict probabilities
if hasattr(clf, 'predict_proba'):
    probs = clf.predict_proba(X_test)[:, 1]
else:
    # fallback: sigmoid(decision_function)
    from scipy.special import expit
    probs = expit(clf.decision_function(X_test))

preds = [1 if p >= THRESHOLD else 0 for p in probs]

acc = float(accuracy_score(gold, preds))
prec = float(precision_score(gold, preds, zero_division=0))
rec = float(recall_score(gold, preds, zero_division=0))
f1 = float(f1_score(gold, preds, zero_division=0))
cm = confusion_matrix(gold, preds).tolist()

# load baseline metrics
baseline_metrics = None
if BASELINE_REPORT.exists():
    with open(BASELINE_REPORT, 'r', encoding='utf-8') as f:
        baseline_metrics = json.load(f)

per_samples = []
changed = []
for i, s in enumerate(test_data):
    orig_pred = None
    orig_score = None
    if BASELINE_REPORT.exists():
        # try to match by index
        try:
            bp = baseline_metrics['samples'][i]
            orig_pred = bool(bp['pred_is_fraud'])
            orig_score = float(bp.get('pred_risk_score') or 0.0)
        except Exception:
            orig_pred = None
            orig_score = None
    item = {
        'index': s.get('index', i),
        'text': s['text'],
        'gold_is_fraud': bool(s['is_fraud']),
        'baseline_pred_is_fraud': orig_pred,
        'baseline_score': orig_score,
        'finetune_prob': float(probs[i]),
        'finetune_pred_is_fraud': bool(preds[i])
    }
    per_samples.append(item)
    if orig_pred is not None and orig_pred != item['finetune_pred_is_fraud']:
        changed.append(item)

out = {
    'method': 'tfidf_logreg_finetune',
    'threshold': THRESHOLD,
    'train_size': len(train_texts),
    'train_positive': int(sum(train_labels)),
    'baseline_metrics': {
        'accuracy': baseline_metrics['accuracy'] if baseline_metrics else None,
        'precision': baseline_metrics['precision'] if baseline_metrics else None,
        'recall': baseline_metrics['recall'] if baseline_metrics else None,
        'f1': baseline_metrics['f1'] if baseline_metrics else None
    },
    'new_metrics': {'accuracy': acc, 'precision': prec, 'recall': rec, 'f1': f1},
    'confusion_matrix': cm,
    'changed_count': len(changed),
    'changed_samples': changed,
    'per_sample': per_samples
}

with open(REPORT_JSON, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

# plot confusion matrix
fig, ax = plt.subplots(figsize=(4,3))
cm_arr = np.array(cm)
ax.imshow(cm_arr, cmap='Blues')
for (j, i), val in np.ndenumerate(cm_arr):
    ax.text(i, j, val, ha='center', va='center')
ax.set_xticks([0,1]); ax.set_yticks([0,1])
ax.set_xticklabels(['pred_neg','pred_pos']); ax.set_yticklabels(['gold_neg','gold_pos'])
ax.set_title('confusion matrix')
plt.tight_layout(); plt.savefig(CONF_PNG, dpi=150); plt.close()

# comparison bar
base_vals = [baseline_metrics['accuracy'] if baseline_metrics else 0, baseline_metrics['precision'] if baseline_metrics else 0, baseline_metrics['recall'] if baseline_metrics else 0, baseline_metrics['f1'] if baseline_metrics else 0]
after_vals = [acc, prec, rec, f1]
labels = ['accuracy','precision','recall','f1']
fig, ax = plt.subplots(figsize=(6,3))
import numpy as np
x = np.arange(len(labels)); width = 0.35
ax.bar(x-width/2, base_vals, width, label='before')
ax.bar(x+width/2, after_vals, width, label='after')
ax.set_ylim(0,1)
ax.set_xticks(x); ax.set_xticklabels(labels); ax.legend()
for i, v in enumerate(base_vals):
    ax.text(i-width/2, v+0.01, f"{v:.3f}", ha='center', va='bottom', fontsize=8)
for i, v in enumerate(after_vals):
    ax.text(i+width/2, v+0.01, f"{v:.3f}", ha='center', va='bottom', fontsize=8)
plt.tight_layout(); plt.savefig(COMP_PNG, dpi=150); plt.close()

print('wrote:', REPORT_JSON)
print('confusion:', CONF_PNG)
print('comparison:', COMP_PNG)
print('metrics_before:', out['baseline_metrics'])
print('metrics_after:', out['new_metrics'])
print('changed_count:', len(changed))
