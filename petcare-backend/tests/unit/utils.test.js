import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HttpError, addDays, assertValid, fromMinutes, isDate, isEmail, isTime, nowInBogota, str, toInt, toMinutes,
  weekdayOf,
} from '../../src/utils.js';

describe('utils · horas', () => {
  it('convierte HH:MM a minutos y de vuelta', () => {
    assert.equal(toMinutes('08:30'), 510);
    assert.equal(toMinutes('17:45:00'), 1065);
    assert.equal(fromMinutes(510), '08:30');
    assert.equal(fromMinutes(0), '00:00');
    for (const t of ['00:00', '09:05', '12:30', '23:59']) assert.equal(fromMinutes(toMinutes(t)), t);
  });

  it('valida formatos de hora', () => {
    assert.ok(isTime('00:00') && isTime('23:59'));
    assert.ok(!isTime('24:00') && !isTime('9:00') && !isTime('12:60') && !isTime(''));
  });
});

describe('utils · fechas', () => {
  it('valida fechas YYYY-MM-DD', () => {
    assert.ok(isDate('2026-11-05'));
    assert.ok(!isDate('2026-13-01') && !isDate('05/11/2026') && !isDate('malo'));
  });

  it('suma días cruzando mes y año', () => {
    assert.equal(addDays('2026-11-05', 1), '2026-11-06');
    assert.equal(addDays('2026-01-31', 1), '2026-02-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });

  it('calcula el día de la semana (0 = domingo)', () => {
    assert.equal(weekdayOf('2026-11-05'), 4);
    assert.equal(weekdayOf('2026-11-08'), 0);
  });

  it('entrega la fecha y los minutos de Bogotá', () => {
    const now = nowInBogota();
    assert.match(now.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(now.minutes >= 0 && now.minutes < 1440);
  });
});

describe('utils · datos de entrada', () => {
  it('limpia textos y enteros', () => {
    assert.equal(str('  hola '), 'hola');
    assert.equal(str(5), '');
    assert.equal(toInt('12'), 12);
    assert.equal(toInt('1.5'), null);
    assert.equal(toInt('x'), null);
  });

  it('valida correos', () => {
    assert.ok(isEmail('ana@correo.com'));
    assert.ok(!isEmail('ana@correo') && !isEmail('ana correo.com'));
  });

  it('assertValid lanza 400 solo con los campos con error', () => {
    assert.doesNotThrow(() => assertValid({ a: false, b: '' }));
    assert.throws(() => assertValid({ name: 'Requerido', email: false }), (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      assert.deepEqual(err.details, { name: 'Requerido' });
      return true;
    });
  });
});
