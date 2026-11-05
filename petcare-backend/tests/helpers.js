import { addDays } from '../src/utils.js';

export const API = process.env.API_URL || 'http://localhost:3000/api';
export const PASSWORD = 'PetCare123';

export async function call(method, path, body, token) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

export const get = (path, token) => call('GET', path, undefined, token);
export const login = async (email) => (await call('POST', '/auth/login', { email, password: PASSWORD })).data.token;
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
export const uid = () => `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
export { addDays };

export async function registerOwner() {
  const r = await call('POST', '/auth/register', {
    name: 'Usuario Prueba', email: `dueno${uid()}@test.co`, password: 'Clave1234',
    phone: '3001234567', document: '1012345678', role: 'dueno', consent: true,
  });
  return r.data.token;
}

export async function registerProvider(businessName = `Vet Prueba ${uid()}`) {
  const r = await call('POST', '/auth/register', {
    name: 'Proveedor Prueba', email: `vet${uid()}@test.co`, password: 'Clave1234',
    phone: '3001234567', document: '1012345678', role: 'proveedor', consent: true,
    businessName, category: 'veterinaria', locality: 'Suba', neighborhood: 'Niza',
  });
  return { token: r.data.token, businessName };
}

export async function huellitas() {
  const [p] = (await get('/providers?q=Huellitas')).data;
  const detail = (await get(`/providers/${p.id}`)).data;
  return { ...detail, service: (name) => detail.services.find((s) => s.name === name) };
}

export async function freeDay(providerId, serviceId, min = 3) {
  for (let i = 1; i <= 30; i++) {
    const date = addDays(today(), i);
    const { slots } = (await get(`/providers/${providerId}/slots?serviceId=${serviceId}&date=${date}`)).data;
    if (slots.length >= min) return { date, slots };
  }
  throw new Error('No hay días con cupos en los próximos 30 días');
}
