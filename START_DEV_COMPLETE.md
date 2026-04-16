# 完整开发环境启动指南

## 问题诊断

你之前只启动了**前端** React 应用，但**后端服务完全没有运行**：
- ❌ Python FastAPI (8000端口) - 未运行  
- ❌ Node.js Express 网关 (3001端口) - 未运行
- ❌ PostgreSQL + Redis (Docker) - 未运行

**这就是为什么所有 API 请求都失败的原因！**

---

## 分步启动 (按顺序打开4个不同的终端)

### 步骤 1: 启动数据库和缓存 (5 秒)
```bash
cd d:\Fwwb\Code\anti-fraud_assistant
docker-compose up -d
```
✅ 应该看到:
```
✔ Container antifraud-redis    Running
✔ Container antifraud-postgres Running
```

### 步骤 2: 启动 Python 后端 (新终端)
```bash
cd d:\Fwwb\Code\anti-fraud_assistant\server-python
python run.py
```
✅ 应该看到:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 步骤 3: 启动 Node.js 网关 (新终端)
```bash
cd d:\Fwwb\Code\anti-fraud_assistant\server-node
npm install        # 首次需要安装依赖
npm run dev
```
✅ 应该看到:
```
Gateway running on port 3001
```

### 步骤 4: 启动 React 前端 (新终端)
```bash
cd d:\Fwwb\Code\anti-fraud_assistant\client-react
npm run dev
```
✅ 应该看到:
```
VITE v5.4.21  ready
Local: http://localhost:5174/
```

---

## 验证流程

✨ **所有 4 个服务都运行后，再按照以下步骤测试修复：**

### 1. 清除浏览器缓存
- 打开浏览器 DevTools (F12)
- 右键刷新按钮 → "清空缓存并硬刷新"
- 或 Ctrl+Shift+Delete，选择"全部时间"清除所有

### 2. 访问应用并测试

打开 http://localhost:5174 并执行以下测试：

#### 测试 A: 注册功能 (测试 [object Object] 修复)
1. 点击"注册"
2. 填写表单 (可用假数据)
3. 提交
- ✅ **预期结果**: 看到具体的错误消息 (如 "用户名已被使用" 或 "请填写正确的邮箱")
- ❌ **错误**: 如果仍然显示 "[object Object]"，说明修复未生效
- ❌ **错误**: 如果显示网络错误，说明后端未正确启动

#### 测试 B: 登录功能
1. 使用已有账户登录
2. 提交
- ✅ **预期结果**: 错误消息清晰可读
- ❌ **错误**: "[object Object]" 或网络错误

#### 测试 C: 编辑个人资料
1. 登录成功后进入个人资料页面
2. 修改任何字段并保存
- ✅ **预期结果**: 成功保存或显示具体错误
- ❌ **错误**: "[object Object]" 或 "api/api/..." 404 错误

---

## 常见问题排查

### ❌ "Cannot connect to backend on port 8000"
**原因**: Python 后端未启动或启动失败

**解决**:
```bash
cd d:\Fwwb\Code\anti-fraud_assistant\server-python

# 检查依赖
pip install -r requirements.txt

# 重新启动
python run.py
```

### ❌ "Port 3001 already in use"
**原因**: Node.js 网关已在运行

**解决**:
```bash
# 自动杀死占用的进程
cd d:\Fwwb\Code\anti-fraud_assistant\server-node
npm run dev
```

### ❌ 仍然看到 "[object Object]" 错误
**检查清单**:
1. ✓ Python 后端是否在 8000 端口?
2. ✓ Node.js 网关是否在 3001 端口?  
3. ✓ 浏览器缓存是否清清了?
4. ✓ 是否硬刷新页面 (Ctrl+Shift+R)?
5. ✓ client-react/src/pages/Login.tsx 是否已修改?

---

## 代码修复验证

修复已应用到以下文件:

✅ **client-react/src/api/index.ts** (L35-40)
- 添加了 Error 对象类型检查
- 添加了 String() 转换

✅ **client-react/src/pages/Register.tsx**
- L18-24: 修复了 undefined 值 → 默认值
- L60-80: 增强了错误处理

✅ **client-react/src/pages/Login.tsx** (刚刚修复)
- L52-75: 增强了错误处理

---

## 快速参考: 完整服务状态图

```
浏览器 (5174)
    ↓
前端路由 /api → Node.js 网关 (3001) 
    ↓
API 代理 → Python 后端 (8000)
    ↓
PostgreSQL (5432) + Redis (6379)
```

**确保所有层都启动！**

---

## 最后一步

测试完成后，如果所有修复都有效，运行:
```bash
git add .
git commit -m "fix: improve error handling and resolve [object Object] display issue"
```

