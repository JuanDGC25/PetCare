import { fromMinutes, nowInBogota, toMinutes, weekdayOf } from './utils.js';

const STEP_MIN = 30;

export async function computeSlots(db, providerId, durationMin, date) {
  const today = nowInBogota();
  if (date < today.date) return [];

  const [avail, taken] = await Promise.all([
    db.query(
      `SELECT start_time, end_time FROM availability
        WHERE provider_id = $1 AND weekday = $2 ORDER BY start_time`,
      [providerId, weekdayOf(date)],
    ),
    db.query(
      `SELECT start_time, end_time FROM bookings
        WHERE provider_id = $1 AND booking_date = $2 AND status IN ('pendiente', 'aceptada', 'atendida')`,
      [providerId, date],
    ),
  ]);

  const busy = taken.rows.map((b) => [toMinutes(b.start_time), toMinutes(b.end_time)]);
  
  const minStart = date === today.date ? today.minutes + 30 : 0;

  const slots = [];

  for (const a of avail.rows) {
    const end = toMinutes(a.end_time);
    for (let s = toMinutes(a.start_time); s + durationMin <= end; s += STEP_MIN) {
      if (s < minStart) continue;
      const e = s + durationMin;
      const overlaps = busy.some(([bs, be]) => s < be && e > bs);
      if (!overlaps) slots.push(fromMinutes(s));
    }
  }
  return [...new Set(slots)].sort();
}

export async function checkTimeFree(db, providerId, durationMin, date, startTime) {
  const today = nowInBogota();
  const start = toMinutes(startTime);
  const end = start + durationMin;
  if (date < today.date || (date === today.date && start < today.minutes - 15)) {
    return 'La fecha y hora ya pasaron';
  }
  const avail = await db.query(
    'SELECT start_time, end_time FROM availability WHERE provider_id = $1 AND weekday = $2',
    [providerId, weekdayOf(date)],
  );
  const fits = avail.rows.some((a) => start >= toMinutes(a.start_time) && end <= toMinutes(a.end_time));
  if (!fits) return 'Esa hora está fuera del horario de atención';
  const taken = await db.query(
    `SELECT 1 FROM bookings
      WHERE provider_id = $1 AND booking_date = $2 AND status IN ('pendiente', 'aceptada', 'atendida')
        AND start_time < $4::time AND end_time > $3::time`,
    [providerId, date, fromMinutes(start), fromMinutes(end)],
  );
  if (taken.rowCount) return 'Ya hay una cita en ese horario';
  return null;
}
