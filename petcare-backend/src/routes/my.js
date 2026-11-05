import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware.js';
import {
  CATEGORIES, LOCALITIES, SPECIES, assertValid, badRequest, isTime, notFound, str, toInt,
  toMinutes,
} from '../utils.js';

const router = Router();
router.use(requireAuth, requireRole('proveedor'));

router.get('/provider', async (req, res) => {
  const { rows } = await query(
    `SELECT id, business_name AS "businessName", category, locality, neighborhood, address, description
       FROM providers WHERE id = $1`,
    [req.user.provider_id],
  );
  res.json(rows[0]);
});

router.put('/provider', async (req, res) => {
  const b = req.body ?? {};
  const d = {
    businessName: str(b.businessName),
    category: str(b.category),
    locality: str(b.locality),
    neighborhood: str(b.neighborhood),
    address: str(b.address) || null,
    description: str(b.description) || null,
  };
  assertValid({
    businessName: d.businessName.length < 3 && 'Escriba el nombre del negocio',
    category: !CATEGORIES.includes(d.category) && 'Seleccione una categoría',
    locality: !LOCALITIES.includes(d.locality) && 'Seleccione una localidad',
    neighborhood: d.neighborhood.length < 3 && 'Escriba el barrio',
  });
  const { rows } = await query(
    `UPDATE providers SET business_name = $2, category = $3, locality = $4, neighborhood = $5,
            address = $6, description = $7
      WHERE id = $1
     RETURNING id, business_name AS "businessName", category, locality, neighborhood, address, description`,
    [req.user.provider_id, d.businessName, d.category, d.locality, d.neighborhood, d.address, d.description],
  );
  res.json(rows[0]);
});

const SERVICE_COLS = `id, name, description, price, duration_min AS "durationMin", species, active`;

function parseService(b = {}) {
  const s = {
    name: str(b.name),
    description: str(b.description) || null,
    price: Number(b.price),
    durationMin: Number(b.durationMin),
    species: Array.isArray(b.species) ? [...new Set(b.species.filter((x) => SPECIES.includes(x)))] : [],
    active: b.active !== false,
  };
  assertValid({
    name: s.name.length < 3 && 'Escriba el nombre del servicio',
    price: (!Number.isInteger(s.price) || s.price < 0) && 'Precio no válido (pesos, sin decimales)',
    durationMin:
      (!Number.isInteger(s.durationMin) || s.durationMin < 15 || s.durationMin > 600) &&
      'La duración debe estar entre 15 y 600 minutos',
    species: !s.species.length && 'Seleccione al menos una especie',
  });
  return s;
}

router.get('/services', async (req, res) => {
  const { rows } = await query(
    `SELECT ${SERVICE_COLS} FROM services WHERE provider_id = $1 ORDER BY active DESC, name`,
    [req.user.provider_id],
  );
  res.json(rows);
});

router.post('/services', async (req, res) => {
  const s = parseService(req.body);
  const { rows } = await query(
    `INSERT INTO services (provider_id, name, description, price, duration_min, species, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${SERVICE_COLS}`,
    [req.user.provider_id, s.name, s.description, s.price, s.durationMin, s.species, s.active],
  );
  res.status(201).json(rows[0]);
});

router.put('/services/:id', async (req, res) => {
  const s = parseService(req.body);
  const { rows } = await query(
    `UPDATE services SET name = $3, description = $4, price = $5, duration_min = $6, species = $7, active = $8
      WHERE id = $1 AND provider_id = $2 RETURNING ${SERVICE_COLS}`,
    [toInt(req.params.id), req.user.provider_id, s.name, s.description, s.price, s.durationMin, s.species, s.active],
  );
  if (!rows[0]) throw notFound('Servicio no encontrado');
  res.json(rows[0]);
});

router.delete('/services/:id', async (req, res) => {
  const id = toInt(req.params.id);
  const used = await query('SELECT 1 FROM bookings WHERE service_id = $1 LIMIT 1', [id]);
  const result = used.rowCount
    ? await query('UPDATE services SET active = FALSE WHERE id = $1 AND provider_id = $2', [id, req.user.provider_id])
    : await query('DELETE FROM services WHERE id = $1 AND provider_id = $2', [id, req.user.provider_id]);
  if (!result.rowCount) throw notFound('Servicio no encontrado');
  res.json({ deleted: !used.rowCount, deactivated: !!used.rowCount });
});

router.get('/availability', async (req, res) => {
  const { rows } = await query(
    `SELECT weekday, to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime"
       FROM availability WHERE provider_id = $1 ORDER BY weekday, start_time`,
    [req.user.provider_id],
  );
  res.json(rows);
});

router.put('/availability', async (req, res) => {
  if (!Array.isArray(req.body)) throw badRequest('Se esperaba una lista de franjas');
  const blocks = req.body.map((b) => ({
    weekday: toInt(b?.weekday),
    startTime: str(b?.startTime),
    endTime: str(b?.endTime),
  }));

  blocks.forEach((b, i) => {
    if (b.weekday === null || b.weekday < 0 || b.weekday > 6) throw badRequest(`Franja ${i + 1}: día no válido`);
    if (!isTime(b.startTime) || !isTime(b.endTime)) throw badRequest(`Franja ${i + 1}: hora no válida`);
    if (toMinutes(b.endTime) <= toMinutes(b.startTime)) {
      throw badRequest(`Franja ${i + 1}: la hora final debe ser mayor que la inicial`);
    }
  });
  for (const a of blocks) {
    for (const b of blocks) {
      if (a !== b && a.weekday === b.weekday &&
          toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(a.endTime) > toMinutes(b.startTime)) {
        throw badRequest('Hay franjas que se cruzan en el mismo día');
      }
    }
  }

  await withTransaction(async (db) => {
    await db.query('DELETE FROM availability WHERE provider_id = $1', [req.user.provider_id]);
    for (const b of blocks) {
      await db.query(
        'INSERT INTO availability (provider_id, weekday, start_time, end_time) VALUES ($1, $2, $3, $4)',
        [req.user.provider_id, b.weekday, b.startTime, b.endTime],
      );
    }
  });
  res.json(blocks.sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)));
});

export default router;
