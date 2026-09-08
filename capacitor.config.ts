import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.physiomind.pro',
  appName: 'PhysioMind Pro',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#f5f0fb'
    },
    StatusBar: {
      style: 'DEFAULT',
      backgroundColor: '#7c3aed'
    }
  }
};

export default config;
