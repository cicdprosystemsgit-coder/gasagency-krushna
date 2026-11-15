import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gasagency.app',
  appName: 'GasAgency',
  webDir: 'public',
  server: {
    // Replace with your real live deployed domain:
    url: 'https://gasagency.cicdprosystems.com/',
    cleartext: false,
  },
};

export default config;