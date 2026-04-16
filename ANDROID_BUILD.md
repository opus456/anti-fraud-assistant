# 破局 - 识破每一次骗局 | Android 应用编译指南

> **项目版本**: v2.1.0  
> **最后更新**: 2026-04-15

## 📱 快速开始

### 前置环境要求

请确保您的本机已安装：

- **Node.js**: >= 16.0.0
- **npm 或 yarn**
- **Java JDK**: 11 或以上
- **Android SDK**: API Level 24+
- **Android Studio**: 最新版本（建议）
- **Gradle**: 会自动下载

### 1️⃣ 第一步：安装依赖

```bash
cd client-react
npm install
```

### 2️⃣ 第二步：构建 Web 应用

编译 React 应用到 `dist` 目录：

```bash
npm run build
```

### 3️⃣ 第三步：初始化 Capacitor（仅首次）

如果是第一次为此项目构建 Android，请运行：

```bash
npx cap init "破局" "com.pojiefraud.assistant" --web-dir=dist
```

### 4️⃣ 第四步：添加 Android 平台

添加 Android 支持：

```bash
npx cap add android
```

### 5️⃣ 第五步：同步文件

将 Web 资源同步到 Android 项目：

```bash
npx cap sync android
```

### 6️⃣ 第六步：编译 Android 应用

#### 方式 A: 使用 Capacitor CLI（推荐）

```bash
npx cap open android
```

这会打开 Android Studio，然后：
1. 等待 Gradle 同步完成
2. 点击菜单 Build → Build Bundle(s) / APK(s) → Build APK(s)
3. 在 `android/app/build/outputs/apk/debug/` 找到 `.apk` 文件

#### 方式 B: 使用命令行

```bash
cd android
./gradlew assembleDebug
```

编译完成后，APK 文件位于：
```
android/app/build/outputs/apk/debug/app-debug.apk
```

#### 方式 C: 直接编译 Release APK

生成可以直接安装到手机的 release 版本：

```bash
cd android
./gradlew assembleRelease
```

**注意**: Release 版本需要签名密钥。如没有，可跳过，使用 debug 版本进行测试。

---

## 📲 将 APK 传输到 Android 手机

### 使用 ADB（Android Debug Bridge）

1. **启用开发者模式**：
   - 打开手机设置
   - 进入"关于手机"
   - 连续点击"版本号"7 次，直到提示"开发者模式已启用"

2. **启用 USB 调试**：
   - 进入开发者选项
   - 找到"USB 调试"并启用

3. **连接手机**：
   ```bash
   adb devices  # 列出已连接的设备
   ```

4. **安装 APK**：
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

5. **启动应用**：
   ```bash
   adb shell am start -n com.pojiefraud.assistant/.MainActivity
   ```

---

## 🔧 高级配置

### 一键编译脚本（Windows Batch）

在项目根目录创建 `build-android.bat`：

```batch
@echo off
echo 正在构建拆局 Android 应用...
echo.

cd client-react

echo -- 第一步：安装依赖 --
call npm install
if errorlevel 1 goto error

echo -- 第二步：构建 Web --
call npm run build
if errorlevel 1 goto error

echo -- 第三步：同步 Capacitor --
call npx cap sync android
if errorlevel 1 goto error

echo -- 第四步：编译 APK --
cd android
call gradlew.bat assembleDebug
if errorlevel 1 goto error

echo.
echo ✅ 构建成功！APK 位于: android/app/build/outputs/apk/debug/app-debug.apk
echo 使用命令安装到手机: adb install -r ..\android\app\build\outputs\apk\debug\app-debug.apk
goto end

:error
echo ❌ 构建失败！
exit /b 1

:end
```

运行方法：
```bash
build-android.bat
```

### 一键编译脚本（Linux/Mac）

在 `scripts/build-android.sh` 创建：

```bash
#!/bin/bash
set -e

echo "正在构建拆局 Android 应用..."

cd client-react

echo "-- 第一步：安装依赖 --"
npm install

echo "-- 第二步：构建 Web --"
npm run build

echo "-- 第三步：同步 Capacitor --"
npx cap sync android

echo "-- 第四步：编译 APK --"
cd android
./gradlew assembleDebug

echo "✅ 构建成功！"
echo "APK 位于: android/app/build/outputs/apk/debug/app-debug.apk"
echo "使用命令安装到手机: adb install -r android/app/build/outputs/apk/debug/app-debug.apk"
```

运行方法：
```bash
chmod +x scripts/build-android.sh
./scripts/build-android.sh
```

---

## 🔗 连接后端服务

### 配置目标服务器地址

修改 `client-react/src/api/index.ts` 中的 API 基址：

```typescript
const api = axios.create({
  baseURL: 'http://YOUR_SERVER_IP:8000/api', // 改为您的服务器 IP
  timeout: 300000,
});
```

### 使用本地 PC 作为服务器

如使用本机电脑作为后端服务器：

1. **获取您的 PC IPv4 地址**（Windows）：
   ```bash
   ipconfig
   ```
   找到 IPv4 Address（如 `192.168.0.100`）

2. **修改配置**：
   ```typescript
   // 将 localhost:8000 改为 PC_IP:8000
   baseURL: 'http://192.168.0.100:8000/api'
   ```

3. **确保防火墙允许连接**：
   - Windows: 允许 Python 和 Node 应用通过防火墙
   - 或暂时禁用防火墙进行测试

4. **启动后端服务**：
   ```bash
   # 启动 Python AI 服务
   cd server-python
   python run.py

   # 在另一个终端启动 Node 网关
   cd server-node
   npm run dev
   ```

5. **重新编译应用**：
   ```bash
   npm run build
   npx cap sync android
   ```

---

## 📊 故障排除

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| Gradle 下载失败 | 配置代理或使用梯子加速 |
| `javax.net.ssl.SSLException` | 使用 HTTP 而非 HTTPS（开发环境） |
| 手机无法连接服务器 | 检查手机和 PC 是否在同一局域网；检查防火墙设置 |
| APK 安装失败 | 卸载旧版本后重试：`adb uninstall com.pojiefraud.assistant` |
| 应用启动崩溃 | 检查 Logcat: `adb logcat \| grep pojiefraud` |

### 查看应用日志

```bash
# 实时查看日志
adb logcat -s pojiefraud

# 清空并查看
adb logcat -c && adb logcat -s pojiefraud
```

---

## 🎯 下一步

- 配置 Release 签名密钥以生成可发布的 APK
- 在 Google Play Store 发布应用
- 配置自动化 CI/CD 流程

---

## 📞 技术支持

如遇问题，请参考：
- [Capacitor 官方文档](https://capacitorjs.com/)
- [Android 开发者指南](https://developer.android.com/)
- 项目的 GitHub Issues
