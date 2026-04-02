# Qwen2.5-7B 反诈检测模型微调指南

本指南将帮助你使用 LLaMA-Factory 对 Qwen2.5-7B 进行 LoRA 微调，训练一个专门用于反诈检测的模型。

## 📋 前置要求

### 硬件要求
- **GPU**: NVIDIA GPU，至少 16GB 显存（推荐 24GB+）
  - RTX 3090/4090: 24GB，可以进行 7B 模型 LoRA 微调
  - RTX 4080: 16GB，需要开启 8-bit 量化
- **内存**: 32GB+ RAM
- **硬盘**: 50GB+ 可用空间

### 软件要求
- Python 3.10+
- CUDA 11.8+ 和 cuDNN
- PyTorch 2.0+

## 🚀 快速开始

### 1. 安装 LLaMA-Factory

```bash
# 克隆仓库
git clone https://github.com/hiyouga/LLaMA-Factory.git
cd LLaMA-Factory

# 创建虚拟环境
conda create -n llama_factory python=3.10 -y
conda activate llama_factory

# 安装依赖
pip install -e ".[torch,metrics]"

# 如果显存不足，安装量化支持
pip install bitsandbytes>=0.39.0
```

### 2. 准备数据集

将我们生成的数据集复制到 LLaMA-Factory 的数据目录：

```bash
# 复制数据集
cp /path/to/anti-fraud_assistant/server-python/finetune_data/chat_dataset.json ./data/anti_fraud.json
```

然后在 `data/dataset_info.json` 中注册数据集：

```json
{
  "anti_fraud": {
    "file_name": "anti_fraud.json",
    "formatting": "sharegpt",
    "columns": {
      "messages": "conversations"
    },
    "tags": {
      "role_tag": "role",
      "content_tag": "content",
      "user_tag": "user",
      "assistant_tag": "assistant"
    }
  }
}
```

### 3. 下载基础模型

```bash
# 使用 huggingface-cli 下载（推荐）
huggingface-cli download Qwen/Qwen2.5-7B-Instruct --local-dir ./models/Qwen2.5-7B-Instruct

# 或者使用 modelscope（国内更快）
pip install modelscope
modelscope download --model qwen/Qwen2.5-7B-Instruct --local_dir ./models/Qwen2.5-7B-Instruct
```

### 4. 开始微调

#### 方式一：使用 Web UI（推荐新手）

```bash
llamafactory-cli webui
```

然后在浏览器打开 http://localhost:7860，按以下步骤操作：
1. 选择模型: `Qwen2.5-7B-Instruct`
2. 选择数据集: `anti_fraud`
3. 选择微调方法: `LoRA`
4. 设置参数后点击"开始训练"

#### 方式二：使用命令行

创建配置文件 `examples/train_lora/anti_fraud_qwen.yaml`:

```yaml
### model
model_name_or_path: ./models/Qwen2.5-7B-Instruct

### method
stage: sft
do_train: true
finetuning_type: lora
lora_target: all

### dataset
dataset: anti_fraud
template: qwen
cutoff_len: 2048
max_samples: 10000
overwrite_cache: true
preprocessing_num_workers: 16

### output
output_dir: ./saves/anti_fraud_qwen2.5_lora
logging_steps: 10
save_steps: 500
plot_loss: true
overwrite_output_dir: true

### train
per_device_train_batch_size: 2
gradient_accumulation_steps: 8
learning_rate: 1.0e-4
num_train_epochs: 3.0
lr_scheduler_type: cosine
warmup_ratio: 0.1
bf16: true
ddp_timeout: 180000000

### eval
val_size: 0.1
per_device_eval_batch_size: 1
eval_strategy: steps
eval_steps: 500
```

运行微调：

```bash
llamafactory-cli train examples/train_lora/anti_fraud_qwen.yaml
```

### 5. 测试微调后的模型

```bash
llamafactory-cli chat examples/inference/anti_fraud_qwen_lora.yaml
```

配置文件 `examples/inference/anti_fraud_qwen_lora.yaml`:

```yaml
model_name_or_path: ./models/Qwen2.5-7B-Instruct
adapter_name_or_path: ./saves/anti_fraud_qwen2.5_lora
template: qwen
finetuning_type: lora
```

### 6. 合并模型并导出

```bash
llamafactory-cli export examples/merge_lora/anti_fraud_qwen.yaml
```

配置文件 `examples/merge_lora/anti_fraud_qwen.yaml`:

```yaml
model_name_or_path: ./models/Qwen2.5-7B-Instruct
adapter_name_or_path: ./saves/anti_fraud_qwen2.5_lora
template: qwen
finetuning_type: lora
export_dir: ./models/anti_fraud_qwen2.5_merged
export_size: 2
export_device: cpu
export_legacy_format: false
```

## 🔄 导出到 Ollama

微调完成后，将模型转换为 GGUF 格式以便在 Ollama 中使用：

### 1. 安装 llama.cpp

```bash
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp
make
```

### 2. 转换为 GGUF

```bash
# 转换模型
python convert_hf_to_gguf.py ../LLaMA-Factory/models/anti_fraud_qwen2.5_merged \
  --outfile anti_fraud_qwen2.5.gguf \
  --outtype q4_k_m
```

### 3. 创建 Ollama 模型

创建 `Modelfile`:

```
FROM ./anti_fraud_qwen2.5.gguf

TEMPLATE """{{ if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{ if .Prompt }}<|im_start|>user
{{ .Prompt }}<|im_end|>
{{ end }}<|im_start|>assistant
{{ .Response }}<|im_end|>
"""

SYSTEM """你是一个专业的反诈骗检测助手。你的任务是分析用户提供的文本内容，判断是否为诈骗信息，并给出风险等级和诈骗类型。"""

PARAMETER stop "<|im_start|>"
PARAMETER stop "<|im_end|>"
PARAMETER temperature 0.3
```

导入到 Ollama：

```bash
ollama create anti-fraud-qwen2.5 -f Modelfile
```

### 4. 测试模型

```bash
ollama run anti-fraud-qwen2.5 "请帮我分析这条信息是否是诈骗：恭喜您中了100万大奖！请点击链接领取。"
```

## 📊 微调参数说明

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| `learning_rate` | 1e-4 ~ 5e-5 | 学习率，LoRA 通常用较高的学习率 |
| `num_train_epochs` | 3-5 | 训练轮数 |
| `per_device_train_batch_size` | 2-4 | 批次大小，根据显存调整 |
| `gradient_accumulation_steps` | 4-16 | 梯度累积，模拟更大批次 |
| `lora_rank` | 8-64 | LoRA 秩，越大效果越好但越慢 |
| `lora_alpha` | 16-128 | LoRA alpha，通常设为 rank 的 2 倍 |
| `cutoff_len` | 1024-2048 | 最大序列长度 |

## 🔧 显存不足时的优化

如果显存不足，可以尝试：

1. **启用 8-bit 量化**:
```yaml
quantization_bit: 8
```

2. **使用 QLoRA（4-bit）**:
```yaml
quantization_bit: 4
quantization_method: bitsandbytes
```

3. **减小批次大小并增加梯度累积**:
```yaml
per_device_train_batch_size: 1
gradient_accumulation_steps: 16
```

4. **使用 DeepSpeed**:
```yaml
deepspeed: examples/deepspeed/ds_z2_config.json
```

## ⚠️ 注意事项

1. **数据质量**：微调效果很大程度取决于数据质量，建议人工审核数据集
2. **过拟合**：如果训练集较小，注意监控验证集 loss，避免过拟合
3. **负样本**：当前数据集负样本较少，建议增加更多正常文本样本
4. **测试**：微调后务必进行充分测试，确保模型不会误判

## 📚 参考资源

- [LLaMA-Factory 官方文档](https://github.com/hiyouga/LLaMA-Factory)
- [Qwen2.5 官方文档](https://github.com/QwenLM/Qwen2.5)
- [LoRA 论文](https://arxiv.org/abs/2106.09685)
