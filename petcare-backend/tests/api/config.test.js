import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { call, get, login, registerProvider } from '../helpers.js';

describe('API · datos del negocio', () => {
  let token, original;
  before(async () => {
    ({ token } = await registerProvider());
    original = (await get('/my/provider', token)).data;
  });

  it('valida y guarda los cambios', async () => {
    assert.equal((await call('PUT', '/my/provider', { ...original, neighborhood: 'X', category: 'otra' }, token)).status, 400);
    const r = await call('PUT', '/my/provider', { ...original, description: 'Atención cálida' }, token);
    assert.equal(r.data.description, 'Atención cálida');
  });
});

describe('API · servicios', () => {
  let token, other, service;
  before(async () => {
    ({ token } = await registerProvider());
    other = await login('peluqueria@petcare.co');
  });

  it('valida precio, duración, nombre y especies', async () => {
    const r = await call('POST', '/my/services', { name: 'S', price: -1, durationMin: 5, species: [] }, token);
    assert.equal(r.status, 400);
    assert.equal(Object.keys(r.data.details).length, 4);
  });

  it('crea, pausa y borra un servicio', async () => {
    service = (await call('POST', '/my/services', { name: 'Corte de uñas', price: 15000, durationMin: 15, species: ['perro', 'gato'] }, token)).data;
    assert.equal(service.active, true);
    assert.equal((await call('PUT', `/my/services/${service.id}`, { ...service, active: false }, token)).data.active, false);
    assert.equal((await call('DELETE', `/my/services/${service.id}`, undefined, other)).status, 404);
    assert.equal((await call('DELETE', `/my/services/${service.id}`, undefined, token)).data.deleted, true);
  });

  it('desactiva en lugar de borrar un servicio con reservas', async () => {
    const provider = await login('proveedor@petcare.co');
    const used = (await get('/my/services', provider)).data.find((s) => s.name === 'Consulta general');
    const r = await call('DELETE', `/my/services/${used.id}`, undefined, provider);
    assert.equal(r.data.deactivated, true);
    await call('PUT', `/my/services/${used.id}`, { ...used, active: true }, provider);
  });
});

describe('API · horario de atención', () => {
  let token;
  before(async () => { ({ token } = await registerProvider()); });

  it('rechaza franjas cruzadas o invertidas', async () => {
    const crossed = [{ weekday: 1, startTime: '08:00', endTime: '12:00' }, { weekday: 1, startTime: '11:00', endTime: '13:00' }];
    assert.equal((await call('PUT', '/my/availability', crossed, token)).status, 400);
    assert.equal((await call('PUT', '/my/availability', [{ weekday: 1, startTime: '12:00', endTime: '08:00' }], token)).status, 400);
    assert.equal((await call('PUT', '/my/availability', [{ weekday: 9, startTime: '08:00', endTime: '12:00' }], token)).status, 400);
  });

  it('reemplaza el horario completo', async () => {
    const week = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: '08:00', endTime: '17:00' }));
    assert.equal((await call('PUT', '/my/availability', week, token)).data.length, 5);
    assert.deepEqual((await get('/my/availability', token)).data, week);
  });
});
