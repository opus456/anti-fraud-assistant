#!/bin/bash

################################################################################
# 破局 (Anti-Fraud Assistant) - Android 一键编译脚本 (Linux/Mac)
################################################################################
# 使用方法: ./build-android-debug.sh
# 结果位置: client-react/android/app/build/outputs/apk/debug/app-debug.apk
################################################################################

set -e

echo ""
echo "================================================"
echo "破局 - 识破每一次骗局 | Android 编译工具"
echo "================================================"
echo ""

CURRENT_DIR=$(pwd)
INSTALL_DEPS=false

# 解析命令行参数
if [[ "$1" == "--install-deps" ]]; then
    INSTALL_DEPS=true
fi

# 检查是否在项目根目录
if [ ! -d "client-react" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    echo "当前目录: $(pwd)"
    exit 1
fi

# 第一步：进入项目目录
echo "[1/5] 进入项目目录..."
cd client-react

# 第二步：安装依赖（可选）
if [ "$INSTALL_DEPS" = true ]; then
    echo ""
    echo "[2/5] 安装 NPM 依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ NPM 安装失败"
        exit 1
    fi
else
    echo "[2/5] 跳过依赖安装 (使用 --install-deps 强制安装)"
fi

# 第三步：构建 Web 应用
echo ""
echo "[3/5] 构建 React Web 应用..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Web 构建失败"
    exit 1
fi

# 第四步：同步 Capacitor
echo ""
echo "[4/5] 同步 Capacitor 文件到 Android 项目..."
npx cap sync android
if [ $? -ne 0 ]; then
    echo "❌ Capacitor 同步失败"
    exit 1
fi

# 第五步：编译 APK
echo ""
echo "[5/5] 编译 Android APK..."
cd android

if [ ! -f "./gradlew" ]; then
    echo "❌ 错误: 找不到 gradlew，请先运行 'npx cap add android'"
    exit 1
fi

chmod +x ./gradlew
./gradlew assembleDebug
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ APK 编译失败"
    echo ""
    echo "可能的解决方案:"
    echo "1. 检查 Java JDK 是否已安装: java -version"
    echo "2. 检查 Android SDK 是否已安装"
    echo "3. 尝试清理 Gradle 缓存: ./gradlew clean"
    echo "4. 检查网络连接 (需下载依赖)"
    echo ""
    exit 1
fi

# 检查 APK 是否生成
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo ""
    echo "================================================"
    echo "✅ 编译成功！"
    echo "================================================"
    echo ""
    echo "📱 APK 文件位置:"
    echo "   $(pwd)/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "💡 下一步操作:"
    echo ""
    echo "   方式 A - 使用 ADB 直接安装:"
    echo "     adb install -r app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "   方式 B - 查看已连接设备:"
    echo "     adb devices"
    echo ""
    echo "   方式 C - 启动应用:"
    echo "     adb shell am start -n com.pojiefraud.assistant/.MainActivity"
    echo ""
    echo "🔗 连接后端服务器:"
    echo "   修改 src/api/index.ts 中的 baseURL 为您的服务器地址"
    echo ""
else
    echo ""
    echo "❌ APK 生成失败"
    echo "预期位置: $(pwd)/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    exit 1
fi

cd "$CURRENT_DIR"
exit 0
