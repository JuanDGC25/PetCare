import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkTimeFree, computeSlots } from '../../src/slots.js';

const FUTURE = '2099-01-05';

function fakeDb({ availability = [], bookings = [] }) {
  return {
    query: async (sql) => {
      const rows = sql.includes('FROM availability') ? availability : bookings;
      return { rows, rowCount: rows.length };
    },
  };
}

const block = (start_time, end_time) => ({ start_time, end_time });

describe('computeSlots', () => {
  it('ofrece horas cada 30 minutos que caben en la franja', async () => {
    const db = fakeDb({ availability: [block('08:00', '10:00')] });
    assert.deepEqual(await computeSlots(db, 1, 30, FUTURE), ['08:00', '08:30', '09:00', '09:30']);
    assert.deepEqual(await computeSlots(db, 1, 60, FUTURE), ['08:00', '08:30', '09:00']);
  });

  it('excluye las horas que se cruzan con otra cita', async () => {
    const db = fakeDb({ availability: [block('08:00', '10:00')], bookings: [block('08:30', '09:00')] });
    assert.deepEqual(await computeSlots(db, 1, 30, FUTURE), ['08:00', '09:00', '09:30']);
    assert.deepEqual(await computeSlots(db, 1, 60, FUTURE), ['09:00']);
  });

  it('une varias franjas del mismo día', async () => {
    const db = fakeDb({ availability: [block('14:00', '15:00'), block('08:00', '09:00')] });
    assert.deepEqual(await computeSlots(db, 1, 30, FUTURE), ['08:00', '08:30', '14:00', '14:30']);
  });

  it('no ofrece horas en fechas pasadas ni sin horario', async () => {
    assert.deepEqual(await computeSlots(fakeDb({ availability: [block('08:00', '18:00')] }), 1, 30, '2000-01-01'), []);
    assert.deepEqual(await computeSlots(fakeDb({}), 1, 30, FUTURE), []);
  });

  it('no ofrece un servicio más largo que la franja', async () => {
    const db = fakeDb({ availability: [block('08:00', '09:00')] });
    assert.deepEqual(await computeSlots(db, 1, 120, FUTURE), []);
  });
});

describe('checkTimeFree', () => {
  const open = [block('08:00', '12:00')];

  it('acepta una hora libre dentro del horario', async () => {
    assert.equal(await checkTimeFree(fakeDb({ availability: open }), 1, 30, FUTURE, '09:00'), null);
  });

  it('rechaza fechas pasadas', async () => {
    assert.match(await checkTimeFree(fakeDb({ availability: open }), 1, 30, '2000-01-01', '09:00'), /pasaron/);
  });

  it('rechaza horas fuera del horario o que terminan después del cierre', async () => {
    const db = fakeDb({ availability: open });
    assert.match(await checkTimeFree(db, 1, 30, FUTURE, '07:00'), /fuera del horario/);
    assert.match(await checkTimeFree(db, 1, 60, FUTURE, '11:30'), /fuera del horario/);
  });

  it('rechaza horas que se cruzan con otra cita', async () => {
    const db = fakeDb({ availability: open, bookings: [block('09:00', '09:30')] });
    assert.match(await checkTimeFree(db, 1, 30, FUTURE, '09:00'), /Ya hay una cita/);
  });
});
