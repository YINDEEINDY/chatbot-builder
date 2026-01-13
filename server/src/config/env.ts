import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: process.env.PORT || 3001,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-me',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Facebook OAuth - Consumer App (for User Login)
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || '',
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || '',
  FACEBOOK_REDIRECT_URI: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/api/auth/facebook/callback',

  // Facebook OAuth - Business App (for Page Connection)
  FACEBOOK_PAGES_APP_ID: process.env.FACEBOOK_PAGES_APP_ID || '',
  FACEBOOK_PAGES_APP_SECRET: process.env.FACEBOOK_PAGES_APP_SECRET || '',
  FACEBOOK_PAGES_REDIRECT_URI: process.env.FACEBOOK_PAGES_REDIRECT_URI || 'http://localhost:3001/api/auth/facebook/pages/callback',

  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};
