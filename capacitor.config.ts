import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aetheriacompute.app',
  appName: 'AetheriaCompute',
  webDir: 'public',
  server: {
    url: 'https://www.aetheriacompute.me',
    cleartext: true
  }
};

export default config;
