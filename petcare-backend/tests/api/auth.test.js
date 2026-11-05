import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { API, PASSWORD, call, get, login, uid } from '../helpers.js';

const ACCOUNTS = [
  'proveedor@petcare.co', 'dueno@petcare.co', 'dueno2@petcare.co', 'dueno3@petcare.co', 'peluqueria@petcare.co',
  'paseos@petcare.co', 'guarderia@petcare.co', 'gatos@petcare.co', 'peluqueria2@petcare.co',
];

describe('API · general', () => {
  it('responde /health con la base de datos activa', async () => {
    const r = await get('/health');
    assert.equal(r.status, 200);
    assert.equal(r.data.database, 'ok');
  });

  it('responde 404 en JSON para rutas inexistentes', async () => {
    const r = await get('/no-existe');
    assert.equal(r.status, 404);
    assert.ok(r.data.error);
  });

  it('responde 400 a un JSON mal formado', async () => {
    const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{malo' });
    assert.equal(r.status, 400);
  });
});

describe('API · inicio de sesión', () => {
  for (const email of ACCOUNTS) {
    it(`ingresa con ${email}`, async () => {
      const r = await call('POST', '/auth/login', { email, password: PASSWORD });
      assert.equal(r.status, 200);
      assert.ok(r.data.token);
    });
  }

  it('rechaza contraseña incorrecta (401) y campos vacíos (400)', async () => {
    assert.equal((await call('POST', '/auth/login', { email: ACCOUNTS[0], password: 'mala' })).status, 401);
    assert.equal((await call('POST', '/auth/login', {})).status, 400);
  });

  it('/auth/me devuelve el perfil y exige un token válido', async () => {
    const me = await get('/auth/me', await login('proveedor@petcare.co'));
    assert.equal(me.data.role, 'proveedor');
    assert.ok(me.data.provider_id);
    assert.equal((await get('/auth/me')).status, 401);
    assert.equal((await get('/auth/me', 'token-falso')).status, 401);
  });
});

describe('API · registro', () => {
  const base = { name: 'Pedro Pérez', password: 'Clave1234', phone: '3001234567', document: '1012345678', consent: true };

  it('valida los campos y responde los errores por campo', async () => {
    const r = await call('POST', '/auth/register', { name: 'X' });
    assert.equal(r.status, 400);
    for (const field of ['name', 'email', 'password', 'role', 'consent']) assert.ok(r.data.details[field], field);
  });

  it('registra un dueño y no permite repetir el correo', async () => {
    const body = { ...base, email: `pedro${uid()}@test.co`, role: 'dueno' };
    const r = await call('POST', '/auth/register', body);
    assert.equal(r.status, 201);
    assert.equal(r.data.user.role, 'dueno');
    assert.equal((await call('POST', '/auth/register', body)).status, 409);
  });

  it('exige los datos del negocio a un proveedor', async () => {
    const r = await call('POST', '/auth/register', { ...base, email: `vet${uid()}@test.co`, role: 'proveedor' });
    assert.equal(r.status, 400);
    assert.ok(r.data.details.businessName && r.data.details.category && r.data.details.locality);
  });

  it('registra un proveedor con su negocio', async () => {
    const r = await call('POST', '/auth/register', {
      ...base, email: `vet${uid()}@test.co`, role: 'proveedor',
      businessName: 'Vet Registro', category: 'veterinaria', locality: 'Suba', neighborhood: 'Niza',
    });
    assert.equal(r.status, 201);
    assert.ok(r.data.user.provider_id);
  });
});

describe('API · permisos por rol', () => {
  it('un dueño no entra a las rutas de la clínica', async () => {
    const token = await login('dueno@petcare.co');
    assert.equal((await get('/clinic/pets', token)).status, 403);
    assert.equal((await get('/my/services', token)).status, 403);
  });

  it('un proveedor no entra a las mascotas del dueño', async () => {
    assert.equal((await get('/pets', await login('proveedor@petcare.co'))).status, 403);
  });

  it('sin sesión no se puede reservar', async () => {
    assert.equal((await call('POST', '/bookings', {})).status, 401);
  });
});
