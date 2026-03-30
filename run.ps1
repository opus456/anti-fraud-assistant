# ========== 1. 启动 Python 后端（新窗口）==========
Start-Process powershell -ArgumentList @'
conda activate fwwb
cd server-python
python run.py
Read-Host "按回车关闭"
'@

# ========== 2. 启动 Node 后端（新窗口）==========
Start-Process powershell -ArgumentList @'
cd server-node
npm run dev
Read-Host "按回车关闭"
'@

# ========== 3. 启动 React 前端（新窗口）==========
Start-Process powershell -ArgumentList @'
cd client-react
npm run dev
Read-Host "按回车关闭"
'@