const env = process.env;

export const config = {
  port: Number(env.PORT) || 3000,
  databaseUrl: env.DATABASE_URL
    || `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@localhost:5432/${env.POSTGRES_DB}`,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN || '8h',
  corsOrigin: (env.CORS_ORIGIN || 'http://localhost:5173').split(','),
};
