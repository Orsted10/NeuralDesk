import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aetheria.compute',
  appName: 'Aetheria Compute',
  webDir: 'www',
  server: {
    url: 'https://aetheria-compute.vercel.app',
    cleartext: true
  }
};

export default config;
