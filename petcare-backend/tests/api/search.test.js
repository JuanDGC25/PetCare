import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, call, get, huellitas, registerProvider, today } from '../helpers.js';

describe('API · búsqueda de proveedores', () => {
  let clinic;
  before(async () => { clinic = await huellitas(); });

  it('entrega las listas para los filtros', async () => {
    const { data } = await get('/providers/meta');
    assert.deepEqual(data.categories, ['veterinaria', 'peluqueria', 'paseo', 'guarderia']);
    assert.ok(data.species.includes('conejo'));
    assert.ok(data.localities.includes('Bosa'));
  });

  it('lista los proveedores de prueba', async () => {
    const { data } = await get('/providers');
    for (const name of ['Clínica Huellitas', 'Spa Canino Patitas Felices', 'Paseos Don Camilo', 'Guardería Casa Peluda']) {
      assert.ok(data.some((p) => p.businessName === name), name);
    }
  });

  it('filtra por categoría, texto y precio', async () => {
    const byCategory = (await get('/providers?category=peluqueria')).data;
    assert.ok(byCategory.length && byCategory.every((p) => p.category === 'peluqueria'));
    assert.equal((await get('/providers?q=huellitas')).data.length, 1);
    assert.equal((await get('/providers?maxPrice=1')).data.length, 0);
  });

  it('muestra el detalle con servicios y horario', async () => {
    assert.ok(clinic.services.length >= 5);
    assert.ok(clinic.availability.length >= 5);
    assert.equal((await get('/providers/999999')).status, 404);
  });

  it('valida la fecha de las horas libres y no ofrece días pasados', async () => {
    const svc = clinic.service('Consulta general');
    assert.equal((await get(`/providers/${clinic.id}/slots?serviceId=${svc.id}&date=malo`)).status, 400);
    const past = await get(`/providers/${clinic.id}/slots?serviceId=${svc.id}&date=${addDays(today(), -1)}`);
    assert.deepEqual(past.data.slots, []);
  });

  it('un proveedor nuevo aparece solo cuando publica servicios', async () => {
    const { token, businessName } = await registerProvider();
    const find = async () => (await get(`/providers?q=${encodeURIComponent(businessName)}`)).data.length;
    assert.equal(await find(), 0);
    await call('POST', '/my/services', { name: 'Consulta general', price: 50000, durationMin: 30, species: ['perro'] }, token);
    await call('PUT', '/my/availability', [{ weekday: 1, startTime: '08:00', endTime: '12:00' }], token);
    assert.equal(await find(), 1);
  });
});
