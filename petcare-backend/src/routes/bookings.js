import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware.js';
import { computeSlots } from '../slots.js';
import {
  HttpError, assertValid, badRequest, forbidden, fromMinutes, isDate, isTime, notFound, nowInBogota, str, toInt,
  toMinutes,
} from '../utils.js';

const router = Router();
router.use(requireAuth);

export const STATUSES = ['pendiente', 'aceptada', 'atendida', 'rechazada', 'cancelada'];

export const SELECT_BOOKING = `
  SELECT b.id, b.status, b.urgent, to_char(b.booking_date, 'YYYY-MM-DD') AS date,
         to_char(b.start_time, 'HH24:MI') AS "startTime", to_char(b.end_time, 'HH24:MI') AS "endTime",
         b.price, b.owner_notes AS "ownerNotes", b.provider_notes AS "providerNotes",
         b.created_at AS "createdAt", b.updated_at AS "updatedAt",
         json_build_object('id', s.id, 'name', s.name, 'durationMin', s.duration_min) AS service,
         json_build_object('id', pe.id, 'name', pe.name, 'species', pe.species, 'breed', pe.breed,
                           'size', pe.size, 'notes', pe.notes) AS pet,
         json_build_object('id', pr.id, 'businessName', pr.business_name, 'category', pr.category,
                           'neighborhood', pr.neighborhood, 'address', pr.address, 'phone', pu.phone) AS provider,
         json_build_object('id', ou.id, 'name', COALESCE(ou.name, pe.owner_name),
                           'phone', COALESCE(ou.phone, pe.owner_phone), 'email', ou.email) AS owner,
         CASE WHEN st.id IS NULL THEN NULL
              ELSE json_build_object('id', st.id, 'name', st.name, 'specialty', st.specialty) END AS staff
    FROM bookings b
    JOIN services s   ON s.id = b.service_id
    JOIN pets pe      ON pe.id = b.pet_id
    JOIN providers pr ON pr.id = b.provider_id
    JOIN users pu     ON pu.id = pr.user_id
    LEFT JOIN users ou ON ou.id = pe.owner_id
    LEFT JOIN staff st ON st.id = b.staff_id`;

export async function getBooking(id) {
  const { rows } = await query(`${SELECT_BOOKING} WHERE b.id = $1`, [id]);
  return rows[0];
}

router.get('/', async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const date = isDate(str(req.query.date)) ? str(req.query.date) : null;
  const from = isDate(str(req.query.from)) ? str(req.query.from) : null;
  const to = isDate(str(req.query.to)) ? str(req.query.to) : null;
  const isOwner = req.user.role === 'dueno';

  const { rows } = await query(
    `${SELECT_BOOKING}
      WHERE ${isOwner ? 'pe.owner_id' : 'b.provider_id'} = $1
        AND ($2::text IS NULL OR b.status = $2)
        AND ($3::date IS NULL OR b.booking_date = $3)
        AND ($4::date IS NULL OR b.booking_date >= $4)
        AND ($5::date IS NULL OR b.booking_date <= $5)
      ORDER BY b.booking_date, b.start_time`,
    [isOwner ? req.user.id : req.user.provider_id, status, date, from, to],
  );
  res.json(rows);
});

router.post('/', requireRole('dueno'), async (req, res) => {
  const b = req.body ?? {};
  const data = {
    serviceId: toInt(b.serviceId),
    petId: toInt(b.petId),
    date: str(b.date),
    startTime: str(b.startTime),
    notes: str(b.notes) || null,
  };
  assertValid({
    serviceId: !data.serviceId && 'Seleccione un servicio',
    petId: !data.petId && 'Seleccione la mascota',
    date: !isDate(data.date) && 'Seleccione una fecha',
    startTime: !isTime(data.startTime) && 'Seleccione una hora',
  });

  const id = await withTransaction(async (db) => {
    const svc = await db.query(
      'SELECT id, provider_id, price, duration_min, species FROM services WHERE id = $1 AND active',
      [data.serviceId],
    );
    if (!svc.rows[0]) throw notFound('El servicio ya no está disponible');
    const service = svc.rows[0];

    const pet = await db.query('SELECT id, species FROM pets WHERE id = $1 AND owner_id = $2', [
      data.petId,
      req.user.id,
    ]);
    if (!pet.rows[0]) throw badRequest('Seleccione una de sus mascotas');
    if (!service.species.includes(pet.rows[0].species)) {
      throw badRequest('Este servicio no atiende la especie de su mascota');
    }

    await db.query('SELECT id FROM providers WHERE id = $1 FOR UPDATE', [service.provider_id]);
    const free = await computeSlots(db, service.provider_id, service.duration_min, data.date);
    if (!free.includes(data.startTime)) {
      throw new HttpError(409, 'Ese horario ya no está disponible. Elija otro');
    }

    const endTime = fromMinutes(toMinutes(data.startTime) + service.duration_min);
    const { rows } = await db.query(
      `INSERT INTO bookings (owner_id, pet_id, service_id, provider_id, booking_date, start_time, end_time, price, owner_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [req.user.id, data.petId, service.id, service.provider_id, data.date, data.startTime, endTime, service.price, data.notes],
    );
    return rows[0].id;
  });

  res.status(201).json(await getBooking(id));
});

router.patch('/:id/status', async (req, res) => {
  const id = toInt(req.params.id);
  const next = str(req.body?.status);
  const notes = str(req.body?.notes) || null;
  const staffId = toInt(req.body?.staffId);

  const { rows } = await query(
    `SELECT b.provider_id, b.status, pe.owner_id, to_char(b.booking_date, 'YYYY-MM-DD') AS date FROM bookings b JOIN pets pe ON pe.id = b.pet_id WHERE b.id = $1`,
    [id],
  );
  const booking = rows[0];
  if (!booking) throw notFound('Cita no encontrada');

  const isOwner = req.user.role === 'dueno';
  if (isOwner ? booking.owner_id !== req.user.id : booking.provider_id !== req.user.provider_id) {
    throw forbidden();
  }

  const allowed = isOwner
    ? { pendiente: ['cancelada'], aceptada: ['cancelada'] }
    : { pendiente: ['aceptada', 'rechazada'], aceptada: ['atendida', 'cancelada'] };
  if (!(allowed[booking.status] || []).includes(next)) {
    throw badRequest(`No se puede pasar una cita ${booking.status} a ${next || '(vacío)'}`);
  }

  const today = nowInBogota().date;
  if (next === 'atendida' && booking.date > today) {
    throw badRequest('Solo se puede marcar como atendida una cita de hoy o de días anteriores');
  }
  if (isOwner && booking.date < today) throw badRequest('No se puede cancelar una cita que ya pasó');

  if (!isOwner && staffId) {
    const st = await query('SELECT 1 FROM staff WHERE id = $1 AND provider_id = $2', [staffId, req.user.provider_id]);
    if (!st.rowCount) throw badRequest('Profesional no válido');
  }

  await query(
    `UPDATE bookings SET status = $2, updated_at = now(),
            provider_notes = CASE WHEN $3::boolean THEN COALESCE($4, provider_notes) ELSE provider_notes END,
            staff_id = CASE WHEN $3::boolean THEN COALESCE($5, staff_id) ELSE staff_id END
      WHERE id = $1`,
    [id, next, !isOwner, notes, staffId],
  );
  res.json(await getBooking(id));
});

export default router;
