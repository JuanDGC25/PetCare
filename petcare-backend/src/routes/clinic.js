import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware.js';
import { checkTimeFree, computeSlots } from '../slots.js';
import {
  SPECIES, addDays, assertValid, badRequest, fromMinutes, isDate, isTime, nowInBogota, notFound, str, toInt,
  toMinutes,
} from '../utils.js';
import { getBooking } from './bookings.js';
import { parsePet } from './pets.js';

const router = Router();
router.use(requireAuth, requireRole('proveedor'));

const PET_SELECT = `
  SELECT pe.id, pe.name, pe.species, pe.breed, pe.age_years AS "ageYears", pe.weight_kg AS "weightKg",
         pe.size, pe.notes, pe.created_at AS "createdAt",
         COALESCE(pe.provider_id = $1, FALSE) AS editable,
         COALESCE(u.name, pe.owner_name)   AS "ownerName",
         COALESCE(u.phone, pe.owner_phone) AS "ownerPhone",
         u.email AS "ownerEmail",
         (pe.owner_id IS NOT NULL) AS "hasAccount",
         (SELECT to_char(max(b.booking_date), 'YYYY-MM-DD') FROM bookings b
           WHERE b.pet_id = pe.id AND b.provider_id = $1 AND b.status = 'atendida') AS "lastVisit",
         (SELECT json_build_object('date', to_char(b.booking_date, 'YYYY-MM-DD'), 'service', s.name)
            FROM bookings b JOIN services s ON s.id = b.service_id
           WHERE b.pet_id = pe.id AND b.provider_id = $1 AND b.status IN ('pendiente', 'aceptada')
             AND b.booking_date >= $2::date
           ORDER BY b.booking_date, b.start_time LIMIT 1) AS "nextVisit",
         COALESCE((SELECT json_agg(h) FROM (
             SELECT s.name AS service, to_char(b.booking_date, 'YYYY-MM-DD') AS date
               FROM bookings b JOIN services s ON s.id = b.service_id
              WHERE b.pet_id = pe.id AND b.provider_id = $1 AND b.status = 'atendida'
              ORDER BY b.booking_date DESC LIMIT 3) h), '[]'::json) AS history
    FROM pets pe LEFT JOIN users u ON u.id = pe.owner_id`;

async function loadPet(providerId, petId) {
  const { rows } = await query(`${PET_SELECT} WHERE pe.id = $3`, [providerId, nowInBogota().date, petId]);
  return rows[0];
}

router.get('/pets', async (req, res) => {
  const { rows } = await query(
    `${PET_SELECT}
      WHERE pe.provider_id = $1
         OR EXISTS (SELECT 1 FROM bookings b WHERE b.pet_id = pe.id AND b.provider_id = $1)
      ORDER BY "lastVisit" DESC NULLS LAST, pe.name`,
    [req.user.provider_id, nowInBogota().date],
  );
  res.json(rows);
});

function parsePatient(b = {}) {
  const ownerName = str(b.ownerName);
  const ownerPhone = str(b.ownerPhone).replace(/\D/g, '');
  const pet = parsePet(b, {
    ownerName: ownerName.length < 3 && 'Escriba el propietario',
    ownerPhone: ownerPhone.length !== 10 && 'El teléfono debe tener 10 dígitos',
  });
  return { p: pet, o: { ownerName, ownerPhone } };
}

router.post('/pets', async (req, res) => {
  const { p, o } = parsePatient(req.body);
  const { rows } = await query(
    `INSERT INTO pets (provider_id, owner_name, owner_phone, name, species, breed, age_years, weight_kg, size, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [req.user.provider_id, o.ownerName, o.ownerPhone, p.name, p.species, p.breed, p.ageYears, p.weightKg, p.size, p.notes],
  );
  res.status(201).json(await loadPet(req.user.provider_id, rows[0].id));
});

router.put('/pets/:id', async (req, res) => {
  const id = toInt(req.params.id);
  const { p, o } = parsePatient(req.body);
  const { rowCount } = await query(
    `UPDATE pets SET name = $3, species = $4, breed = $5, age_years = $6, weight_kg = $7, size = $8, notes = $9,
            owner_name = $10, owner_phone = $11
      WHERE id = $1 AND provider_id = $2`,
    [id, req.user.provider_id, p.name, p.species, p.breed, p.ageYears, p.weightKg, p.size, p.notes, o.ownerName, o.ownerPhone],
  );
  if (!rowCount) throw notFound('Solo puede editar las fichas de pacientes registrados por su clínica');
  res.json(await loadPet(req.user.provider_id, id));
});

const STAFF_SELECT = `
  SELECT st.id, st.name, st.specialty, st.active,
         COUNT(b.id)::int AS total,
         COUNT(b.id) FILTER (WHERE b.status = 'atendida')::int  AS attended,
         COUNT(b.id) FILTER (WHERE b.status = 'cancelada')::int AS cancelled,
         COUNT(b.id) FILTER (WHERE b.status = 'aceptada' AND b.booking_date >= $2::date)::int AS upcoming,
         COALESCE(SUM(b.price) FILTER (WHERE b.status = 'atendida'), 0)::int AS income
    FROM staff st LEFT JOIN bookings b ON b.staff_id = st.id`;

router.get('/staff', async (req, res) => {
  const { rows } = await query(
    `${STAFF_SELECT} WHERE st.provider_id = $1 GROUP BY st.id ORDER BY st.active DESC, st.id`,
    [req.user.provider_id, nowInBogota().date],
  );
  res.json(rows);
});

function parseStaff(b = {}) {
  const s = { name: str(b.name), specialty: str(b.specialty), active: b.active !== false };
  assertValid({
    name: s.name.length < 3 && 'Escriba el nombre',
    specialty: s.specialty.length < 3 && 'Escriba la especialidad',
  });
  return s;
}

router.post('/staff', async (req, res) => {
  const s = parseStaff(req.body);
  const { rows } = await query(
    'INSERT INTO staff (provider_id, name, specialty, active) VALUES ($1, $2, $3, $4) RETURNING id',
    [req.user.provider_id, s.name, s.specialty, s.active],
  );
  const out = await query(`${STAFF_SELECT} WHERE st.id = $1 GROUP BY st.id`, [rows[0].id, nowInBogota().date]);
  res.status(201).json(out.rows[0]);
});

router.put('/staff/:id', async (req, res) => {
  const s = parseStaff(req.body);
  const id = toInt(req.params.id);
  const { rowCount } = await query(
    'UPDATE staff SET name = $3, specialty = $4, active = $5 WHERE id = $1 AND provider_id = $2',
    [id, req.user.provider_id, s.name, s.specialty, s.active],
  );
  if (!rowCount) throw notFound('Profesional no encontrado');
  const out = await query(`${STAFF_SELECT} WHERE st.id = $1 GROUP BY st.id`, [id, nowInBogota().date]);
  res.json(out.rows[0]);
});

router.delete('/staff/:id', async (req, res) => {
  const { rowCount } = await query('DELETE FROM staff WHERE id = $1 AND provider_id = $2', [
    toInt(req.params.id), req.user.provider_id,
  ]);
  if (!rowCount) throw notFound('Profesional no encontrado');
  res.status(204).end();
});

router.post('/bookings', async (req, res) => {
  const b = req.body ?? {};
  const data = {
    petId: toInt(b.petId),
    serviceId: toInt(b.serviceId),
    staffId: toInt(b.staffId),
    date: str(b.date),
    startTime: str(b.startTime),
    notes: str(b.notes) || null,
  };
  assertValid({
    petId: !data.petId && 'Seleccione la mascota',
    serviceId: !data.serviceId && 'Seleccione el servicio',
    date: !isDate(data.date) && 'Elige una fecha.',
    startTime: !isTime(data.startTime) && 'Elige una hora.',
  });
  const providerId = req.user.provider_id;

  const id = await withTransaction(async (db) => {
    const svc = await db.query(
      'SELECT id, price, duration_min, species FROM services WHERE id = $1 AND provider_id = $2 AND active',
      [data.serviceId, providerId],
    );
    if (!svc.rows[0]) throw badRequest('Servicio no válido');
    const pet = await db.query(
      `SELECT id, owner_id, species FROM pets pe
        WHERE id = $1 AND (provider_id = $2 OR EXISTS (SELECT 1 FROM bookings b WHERE b.pet_id = pe.id AND b.provider_id = $2))`,
      [data.petId, providerId],
    );
    if (!pet.rows[0]) throw badRequest('Mascota no válida');
    if (!svc.rows[0].species.includes(pet.rows[0].species)) {
      throw badRequest('Ese servicio no atiende la especie de la mascota');
    }
    if (data.staffId) {
      const st = await db.query('SELECT 1 FROM staff WHERE id = $1 AND provider_id = $2', [data.staffId, providerId]);
      if (!st.rowCount) throw badRequest('Profesional no válido');
    }

    await db.query('SELECT id FROM providers WHERE id = $1 FOR UPDATE', [providerId]);
    const problem = await checkTimeFree(db, providerId, svc.rows[0].duration_min, data.date, data.startTime);
    if (problem) throw badRequest(problem, { startTime: problem });

    const { rows } = await db.query(
      `INSERT INTO bookings (owner_id, pet_id, service_id, provider_id, staff_id, booking_date, start_time, end_time,
                             price, status, provider_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'aceptada', $10) RETURNING id`,
      [pet.rows[0].owner_id, data.petId, data.serviceId, providerId, data.staffId, data.date, data.startTime,
        fromMinutes(toMinutes(data.startTime) + svc.rows[0].duration_min), svc.rows[0].price, data.notes],
    );
    return rows[0].id;
  });

  res.status(201).json(await getBooking(id));
});

router.post('/urgent', async (req, res) => {
  const b = req.body ?? {};
  const data = {
    petName: str(b.petName),
    species: str(b.species),
    contact: str(b.ownerContact),
    symptoms: str(b.symptoms),
  };
  const phone = (data.contact.match(/\d[\d\s]{8,}\d/)?.[0] ?? '').replace(/\D/g, '');
  const ownerName = data.contact.replace(/[^\p{L}\s.'-]/gu, ' ').replace(/\s+/g, ' ').trim();
  assertValid({
    petName: data.petName.length < 2 && 'Escribe el nombre.',
    species: !SPECIES.includes(data.species) && 'Selecciona la especie.',
    ownerContact: (ownerName.length < 3 || phone.length < 7) && 'Escribe el nombre y el teléfono del propietario.',
    symptoms: data.symptoms.length < 5 && 'Describe los síntomas.',
  });
  const providerId = req.user.provider_id;

  const result = await withTransaction(async (db) => {
    const svc = await db.query(
      `SELECT id, price, duration_min FROM services
        WHERE provider_id = $1 AND active AND $2 = ANY (species)
        ORDER BY (name ILIKE 'consulta%') DESC, price LIMIT 1`,
      [providerId, data.species],
    );
    if (!svc.rows[0]) throw badRequest('No tiene un servicio activo que atienda esa especie');
    const service = svc.rows[0];

    await db.query('SELECT id FROM providers WHERE id = $1 FOR UPDATE', [providerId]);
    let date = nowInBogota().date;
    let start = null;
    for (let i = 0; i < 7 && !start; i++, date = addDays(date, 1)) {
      const slots = await computeSlots(db, providerId, service.duration_min, date);
      if (slots.length) start = slots[0];
      if (start) break;
    }
    if (!start) throw badRequest('No hay espacios libres en los próximos 7 días');

    const staff = await db.query(
      `SELECT id, name FROM staff WHERE provider_id = $1 AND active
        ORDER BY (specialty ILIKE '%general%') DESC, id LIMIT 1`,
      [providerId],
    );
    const pet = await db.query(
      `INSERT INTO pets (provider_id, owner_name, owner_phone, name, species, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [providerId, ownerName, phone, data.petName, data.species, 'Ingresó por urgencia'],
    );
    const { rows } = await db.query(
      `INSERT INTO bookings (pet_id, service_id, provider_id, staff_id, booking_date, start_time, end_time,
                             price, status, urgent, owner_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'aceptada', TRUE, $9) RETURNING id`,
      [pet.rows[0].id, service.id, providerId, staff.rows[0]?.id ?? null, date, start,
        fromMinutes(toMinutes(start) + service.duration_min), service.price, data.symptoms],
    );
    return rows[0].id;
  });

  res.status(201).json(await getBooking(result));
});

export default router;
