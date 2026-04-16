import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pojiefraud.assistant',
  appName: '御见',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // 允许从主机加载资源，用于开发调试
    allowNavigation: ['*']
  },
  android: {
    path: 'android',
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
      keystorePassword: undefined,
      keystoreKeyPassword: undefined,
      signingType: 'debug',
      releaseType: 'APK'
    }
  },
  plugins: {
    // 核心插件配置
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#007AFF',
      showSpinner: true,
      spinnerColor: 'white'
    }
  }
};

export default config;
