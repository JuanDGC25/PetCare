import jwt from 'jsonwebtoken';
import { config } from './config.js';

export const CATEGORIES = ['veterinaria', 'peluqueria', 'paseo', 'guarderia'];
export const SPECIES = ['perro', 'gato', 'conejo', 'otro'];
export const SIZES = ['pequeno', 'mediano', 'grande'];
export const LOCALITIES = [
  'Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme', 'Tunjuelito', 'Bosa',
  'Kennedy', 'Fontibón', 'Engativá', 'Suba', 'Barrios Unidos', 'Teusaquillo',
  'Los Mártires', 'Antonio Nariño', 'Puente Aranda', 'La Candelaria',
  'Rafael Uribe Uribe', 'Ciudad Bolívar',
];

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const notFound = (message = 'Recurso no encontrado') => new HttpError(404, message);
export const forbidden = (message = 'No tiene permiso para esta acción') => new HttpError(403, message);

export function assertValid(errors) {
  const clean = Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
  if (Object.keys(clean).length) throw badRequest('Revise los datos del formulario', clean);
}

export const str = (v) => (typeof v === 'string' ? v.trim() : '');
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
export const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
export const toInt = (v) => {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

export const toMinutes = (t) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};
export const fromMinutes = (n) =>
  `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

export function nowInBogota() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

export const addDays = (date, n) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const weekdayOf = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}
