import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gasagency.app',
  appName: 'GasAgency',
  webDir: 'public',
  server: {
    // Open the login page when the app cold-starts.
    // After login the server redirects to the correct dashboard.
    url: 'https://gasagency.cicdprosystems.com/login',
    cleartext: false,
  },
};

export default config;