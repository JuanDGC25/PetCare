import type { BookingStatus, Category, Size, Species } from './types';

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const formatMoney = (n: number) => money.format(n);
const num = new Intl.NumberFormat('es-CO');
export const formatNumber = (n: number) => num.format(n);

export const CATEGORY_LABEL: Record<Category, string> = {
  veterinaria: 'Veterinaria',
  peluqueria: 'Peluquería',
  paseo: 'Paseo',
  guarderia: 'Guardería',
};

export const SPECIES_LABEL: Record<Species, string> = { perro: 'Perro', gato: 'Gato', conejo: 'Conejo', otro: 'Otro' };
export const SIZE_LABEL: Record<Size, string> = { pequeno: 'Pequeño', mediano: 'Mediano', grande: 'Grande' };

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Confirmada',
  atendida: 'Atendida',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
};
export const STATUS_CLASS: Record<BookingStatus, string> = {
  pendiente: 'b-warn',
  aceptada: 'b-ok',
  atendida: 'b-info',
  rechazada: 'b-err',
  cancelada: 'b-err',
};

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const WEEKDAYS_SHORT = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const parseDate = (d: string) => new Date(`${d}T12:00:00`);
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayISO = () => toISODate(new Date());
export const addDays = (d: string, n: number) => {
  const x = parseDate(d);
  x.setDate(x.getDate() + n);
  return toISODate(x);
};

export function formatDateLong(d: string) {
  const date = parseDate(d);
  return `${WEEKDAYS[date.getDay()].toLowerCase()} ${date.getDate()} de ${MONTHS_SHORT[date.getMonth()]}.`;
}
export function formatDateShort(d: string) {
  const date = parseDate(d);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}
export function formatDateMedium(d: string) {
  const date = parseDate(d);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}
export function formatDayTitle(d: string) {
  const date = parseDate(d);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

export function dateParts(d: string) {
  const date = parseDate(d);
  return { day: date.getDate(), month: MONTHS_SHORT[date.getMonth()], weekday: WEEKDAYS_SHORT[date.getDay()] };
}

export function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'p. m.' : 'a. m.';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const formatAge = (n: number | null) => (n == null ? '—' : `${String(n).replace('.', ',')} ${n === 1 ? 'año' : 'años'}`);
export const formatWeight = (n: number | null) => (n == null ? '—' : `${String(n).replace('.', ',')} kg`);

export const initials = (name: string) =>
  name
    .replace(/^(Dr|Dra)\.\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

const AVATARS = ['av-y', 'av-p', 'av-g', 'av-b', 'av-r'];
export const avatarClass = (id: number) => AVATARS[id % AVATARS.length];

export const petLabel = (species: Species, breed: string | null) =>
  `${SPECIES_LABEL[species]}${breed ? ` · ${breed}` : ''}`;

export const hcCode = (id: number) => `HC-${String(id).padStart(5, '0')}`;

export function weekdaysSummary(days: number[]) {
  if (!days.length) return 'Sin horario publicado';
  return days.map((d) => WEEKDAYS_SHORT[d]).join(' · ');
}

export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
