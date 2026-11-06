import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { query } from './db.js';
import { errorHandler } from './middleware.js';
import auth from './routes/auth.js';
import pets from './routes/pets.js';
import providers from './routes/providers.js';
import my from './routes/my.js';
import bookings from './routes/bookings.js';
import clinic from './routes/clinic.js';

const routes = { auth, pets, providers, my, bookings, clinic };

export const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', async (_req, res) => {
  await query('SELECT 1');
  res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
});

for (const [path, router] of Object.entries(routes)) app.use(`/api/${path}`, router);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);


