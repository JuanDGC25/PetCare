import { config } from './config.js';
import { app } from './app.js';
import { initDatabase } from './db.js';
import { seedIfEmpty } from './seed.js';

if (!config.jwtSecret) {
  console.error('[api] Falta JWT_SECRET. Revise el README: «Generar la clave secreta».');
  process.exit(1);
}
if (config.jwtSecret.length < 32) console.warn('[api] JWT_SECRET es muy corta: use al menos 32 caracteres.');

await initDatabase();
await seedIfEmpty();
app.listen(config.port, () => console.log(`[api] PetCare API escuchando en http://localhost:${config.port}`));
