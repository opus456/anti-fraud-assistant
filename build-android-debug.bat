@echo off
REM ================================================================================
REM 破局 (Anti-Fraud Assistant) - Android 一键编译脚本 (Windows)
REM ================================================================================
REM 使用方法: build-android-debug.bat
REM 结果位置: client-react\android\app\build\outputs\apk\debug\app-debug.apk
REM ================================================================================

setlocal enabledelayedexpansion

echo.
echo ================================================
echo 破局 - 识破每一次骗局 | Android 编译工具
echo ================================================
echo.

set CURRENT_DIR=%cd%

REM 检查是否在项目根目录
if not exist "client-react" (
    echo ❌ 错误: 请在项目根目录运行此脚本
    echo 当前目录: %cd%
    pause
    exit /b 1
)

REM 第一步：进入项目目录
echo [1/5] 进入项目目录...
cd client-react
if errorlevel 1 (
    echo ❌ 进入项目目录失败
    pause
    exit /b 1
)

REM 第二步：安装依赖（可选，如已安装可跳过）
if "%1"=="--install-deps" (
    echo.
    echo [2/5] 安装 NPM 依赖...
    call npm install
    if errorlevel 1 (
        echo ❌ NPM 安装失败
        pause
        exit /b 1
    )
) else (
    echo [2/5] 跳过依赖安装 (使用 --install-deps 强制安装)
)

REM 第三步：构建 Web 应用
echo.
echo [3/5] 构建 React Web 应用...
call npm run build
if errorlevel 1 (
    echo ❌ Web 构建失败
    pause
    exit /b 1
)

REM 第四步：同步 Capacitor
echo.
echo [4/5] 同步 Capacitor 文件到 Android 项目...
call npx cap sync android
if errorlevel 1 (
    echo ❌ Capacitor 同步失败
    pause
    exit /b 1
)

REM 第五步：编译 APK
echo.
echo [5/5] 编译 Android APK...
cd android
if not exist "gradlew.bat" (
    echo ❌ 错误: 找不到 gradlew.bat，请先运行 "npx cap add android"
    pause
    exit /b 1
)

call gradlew.bat assembleDebug
if errorlevel 1 (
    echo.
    echo ❌ APK 编译失败
    echo.
    echo 可能的解决方案:
    echo 1. 检查 Java JDK 是否已安装: java -version
    echo 2. 检查 Android SDK 是否已安装
    echo 3. 尝试清理 Gradle 缓存: gradlew.bat clean
    echo 4. 检查网络连接 (需下载依赖)
    echo.
    pause
    exit /b 1
)

REM 检查 APK 是否生成
if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo.
    echo ================================================
    echo ✅ 编译成功！
    echo ================================================
    echo.
    echo 📱 APK 文件位置:
    echo    %cd%\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo 💡 下一步操作:
    echo.
    echo   方式 A - 使用 ADB 直接安装:
    echo     adb install -r app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo   方式 B - 查看已连接设备:
    echo     adb devices
    echo.
    echo   方式 C - 启动应用:
    echo     adb shell am start -n com.pojiefraud.assistant/.MainActivity
    echo.
    echo 🔗 连接后端服务器:
    echo    修改 src/api/index.ts 中的 baseURL 为您的服务器地址
    echo.
) else (
    echo.
    echo ❌ APK 生成失败
    echo 预期位置: %cd%\app\build\outputs\apk\debug\app-debug.apk
    echo.
    pause
    exit /b 1
)

cd %CURRENT_DIR%
echo.
echo 按任意键关闭此窗口...
pause > nul
exit /b 0
