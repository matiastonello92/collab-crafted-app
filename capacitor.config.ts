const config = {
  appId: 'app.lovable.73cd43baa29743b89bb5769052e70e7f',
  appName: 'Klyra',
  webDir: '.next/static',
  server: {
    url: 'https://73cd43ba-a297-43b8-9bb5-769052e70e7f.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F172A',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small'
    }
  }
};

export default config;
