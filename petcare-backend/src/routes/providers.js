import { Router } from 'express';
import { pool, query } from '../db.js';
import { computeSlots } from '../slots.js';
import {
  CATEGORIES, LOCALITIES, SPECIES, badRequest, isDate, notFound, str, toInt,
} from '../utils.js';

const router = Router();

router.get('/meta', (_req, res) => {
  res.json({ categories: CATEGORIES, species: SPECIES, localities: LOCALITIES });
});

router.get('/', async (req, res) => {
  const category = CATEGORIES.includes(req.query.category) ? req.query.category : null;
  const species = SPECIES.includes(req.query.species) ? req.query.species : null;
  const maxPrice = toInt(req.query.maxPrice) || null;
  const weekday = req.query.weekday !== undefined && req.query.weekday !== '' ? toInt(req.query.weekday) : null;
  const locality = LOCALITIES.includes(req.query.locality) ? req.query.locality : null;
  const q = str(req.query.q) || null;

  const { rows } = await query(
    `SELECT p.id, p.business_name AS "businessName", p.category, p.locality, p.neighborhood,
            p.description,
            MIN(s.price)::int AS "minPrice",
            COUNT(s.id)::int  AS "servicesCount",
            ARRAY(SELECT DISTINCT a.weekday FROM availability a
                   WHERE a.provider_id = p.id ORDER BY a.weekday) AS weekdays
       FROM providers p
       JOIN services s ON s.provider_id = p.id AND s.active
      WHERE ($1::text IS NULL OR p.category = $1)
        AND ($2::text IS NULL OR $2 = ANY (s.species))
        AND ($3::int  IS NULL OR s.price <= $3)
        AND ($4::int  IS NULL OR EXISTS (SELECT 1 FROM availability a
                                         WHERE a.provider_id = p.id AND a.weekday = $4))
        AND ($5::text IS NULL OR p.locality = $5)
        AND ($6::text IS NULL OR p.business_name ILIKE '%' || $6 || '%'
                             OR p.neighborhood  ILIKE '%' || $6 || '%'
                             OR s.name          ILIKE '%' || $6 || '%')
      GROUP BY p.id
      ORDER BY "minPrice", p.business_name`,
    [category, species, maxPrice, weekday, locality, q],
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const id = toInt(req.params.id);
  const { rows } = await query(
    `SELECT p.id, p.business_name AS "businessName", p.category, p.locality, p.neighborhood,
            p.address, p.description, u.phone, u.email
       FROM providers p JOIN users u ON u.id = p.user_id
      WHERE p.id = $1`,
    [id],
  );
  if (!rows[0]) throw notFound('Proveedor no encontrado');

  const [services, availability] = await Promise.all([
    query(
      `SELECT id, name, description, price, duration_min AS "durationMin", species
         FROM services WHERE provider_id = $1 AND active ORDER BY price`,
      [id],
    ),
    query(
      `SELECT weekday, to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime"
         FROM availability WHERE provider_id = $1 ORDER BY weekday, start_time`,
      [id],
    ),
  ]);
  res.json({ ...rows[0], services: services.rows, availability: availability.rows });
});

router.get('/:id/slots', async (req, res) => {
  const id = toInt(req.params.id);
  const date = str(req.query.date);
  if (!isDate(date)) throw badRequest('Fecha no válida');

  const { rows } = await query(
    'SELECT duration_min FROM services WHERE id = $1 AND provider_id = $2 AND active',
    [toInt(req.query.serviceId), id],
  );
  if (!rows[0]) throw notFound('Servicio no encontrado');

  res.json({ date, slots: await computeSlots(pool, id, rows[0].duration_min, date) });
});

export default router;
