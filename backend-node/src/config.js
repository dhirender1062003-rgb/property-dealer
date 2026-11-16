require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const required = ['JWT_SECRET'];
for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  djangoApiUrl: process.env.DJANGO_API_URL || 'http://localhost:8000/api',
  jwtSecret: process.env.JWT_SECRET,
};
