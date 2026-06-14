export default {
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.NODELINK_PORT || '2333'),
    password: process.env.NODELINK_PASSWORD || 'youshallnotpass',
  },
  logging: {
    level: process.env.NODELINK_LOG_LEVEL || 'info',
  },
  cluster: {
    enabled: false,
  },
  sources: {
    youtube: { enabled: true },
    soundcloud: { enabled: true },
    spotify: {
      enabled: true,
      clientId: process.env.SPOTIFY_CLIENT_ID || '',
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    },
    applemusic: { enabled: true },
  },
  playerUpdateInterval: 2000,
  defaultSearchSource: ['youtube', 'soundcloud'],
  audio: {
    quality: 'high',
  },
};
