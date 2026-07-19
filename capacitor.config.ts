import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aetheriacompute.app',
  appName: 'AetheriaCompute',
  webDir: 'public',
  server: {
    url: 'https://aetheria-compute-node.vercel.app',
    cleartext: true
  }
};

export default config;
