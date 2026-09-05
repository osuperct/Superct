import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.superct',
  appName: 'Super CT',
  webDir: 'dist',
  server: {
    url: 'https://superct.lovable.app',
    cleartext: false,
  },
  android: {
    backgroundColor: '#0a0a0a',
  },
  ios: {
    backgroundColor: '#0a0a0a',
  },
};

export default config;
