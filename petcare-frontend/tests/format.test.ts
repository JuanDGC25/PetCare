import { describe, expect, it } from 'vitest';
import {
  STATUS_CLASS, STATUS_LABEL, addDays, avatarClass, formatAge, formatDateShort, formatDayTitle, formatDuration,
  formatMoney, formatTime, formatWeight, hcCode, initials, parseDate, petLabel, toISODate, weekdaysSummary,
} from '../src/format';

describe('format · dinero y números', () => {
  it('formatea pesos colombianos sin decimales', () => {
    expect(formatMoney(45000)).toMatch(/\$\s?45\.000$/);
    expect(formatMoney(250000)).toMatch(/250\.000/);
  });
});

describe('format · fechas y horas', () => {
  it('convierte fechas sin saltos de zona horaria', () => {
    expect(toISODate(parseDate('2026-11-05'))).toBe('2026-11-05');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('escribe fechas en español', () => {
    expect(formatDayTitle('2026-11-05')).toBe('Jueves 5 de noviembre');
    expect(formatDateShort('2026-10-27')).toBe('27 oct');
  });

  it('muestra horas en formato de 12 horas', () => {
    expect(formatTime('08:00')).toBe('8:00 a. m.');
    expect(formatTime('12:30')).toBe('12:30 p. m.');
    expect(formatTime('14:05')).toBe('2:05 p. m.');
    expect(formatTime('00:15')).toBe('12:15 a. m.');
  });

  it('resume duraciones', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(90)).toBe('1 h 30 min');
  });

  it('resume los días de atención', () => {
    expect(weekdaysSummary([1, 2, 6])).toBe('Lu · Ma · Sá');
    expect(weekdaysSummary([])).toBe('Sin horario publicado');
  });
});

describe('format · mascotas y personas', () => {
  it('muestra edad y peso con coma decimal', () => {
    expect(formatAge(1)).toBe('1 año');
    expect(formatAge(2.5)).toBe('2,5 años');
    expect(formatAge(null)).toBe('—');
    expect(formatWeight(4.2)).toBe('4,2 kg');
  });

  it('arma etiquetas, códigos e iniciales', () => {
    expect(petLabel('perro', 'Beagle')).toBe('Perro · Beagle');
    expect(petLabel('gato', null)).toBe('Gato');
    expect(hcCode(12)).toBe('HC-00012');
    expect(initials('Dra. Sofía Ríos')).toBe('SR');
    expect(initials('Laura Méndez Pardo')).toBe('LM');
  });

  it('asigna siempre el mismo color de avatar a un id', () => {
    expect(avatarClass(7)).toBe(avatarClass(7));
    expect(avatarClass(0)).not.toBe(avatarClass(1));
  });
});

describe('format · estados de cita', () => {
  it('tiene etiqueta y color para cada estado', () => {
    expect(STATUS_LABEL.aceptada).toBe('Confirmada');
    for (const status of Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]) {
      expect(STATUS_CLASS[status]).toMatch(/^b-/);
    }
  });
});
