import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: process.env.PORT || 3001,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-me',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Facebook OAuth - Chatbot Builder Login App (for user login)
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || '',
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || '',
  FACEBOOK_REDIRECT_URI: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/api/auth/facebook/callback',

  // Facebook OAuth - KonKui App (for page connection)
  FACEBOOK_PAGES_APP_ID: process.env.FACEBOOK_PAGES_APP_ID || '',
  FACEBOOK_PAGES_APP_SECRET: process.env.FACEBOOK_PAGES_APP_SECRET || '',
  FACEBOOK_PAGES_REDIRECT_URI: process.env.FACEBOOK_PAGES_REDIRECT_URI || 'http://localhost:3001/api/auth/facebook/pages/callback',

  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // Supabase configuration
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',

  // Upload configuration
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  PUBLIC_URL: process.env.PUBLIC_URL || 'http://localhost:3001',

  // Email/SMTP configuration
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@chatbot-builder.com',
};
