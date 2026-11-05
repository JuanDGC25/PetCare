import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { call, get, login, registerOwner } from '../helpers.js';

describe('API · mascotas del dueño', () => {
  let owner, other, pet;
  before(async () => {
    owner = await registerOwner();
    other = await login('dueno@petcare.co');
  });

  it('valida los datos', async () => {
    const r = await call('POST', '/pets', { name: 'X', species: 'pez', weightKg: -1 }, owner);
    assert.equal(r.status, 400);
    assert.ok(r.data.details.name && r.data.details.species && r.data.details.weightKg);
  });

  it('crea y edita una mascota', async () => {
    const r = await call('POST', '/pets', { name: 'Copito', species: 'conejo', ageYears: 2, weightKg: 1.5 }, owner);
    assert.equal(r.status, 201);
    pet = r.data;
    const edited = await call('PUT', `/pets/${pet.id}`, { name: 'Copito II', species: 'conejo' }, owner);
    assert.equal(edited.data.name, 'Copito II');
    assert.deepEqual((await get('/pets', owner)).data.map((p) => p.name), ['Copito II']);
  });

  it('no deja editar ni borrar mascotas de otro dueño', async () => {
    assert.equal((await call('PUT', `/pets/${pet.id}`, { name: 'Robo', species: 'gato' }, other)).status, 404);
    assert.equal((await call('DELETE', `/pets/${pet.id}`, undefined, other)).status, 404);
  });

  it('no deja eliminar una mascota con historial', async () => {
    const luna = (await get('/pets', other)).data.find((p) => p.name === 'Luna');
    const r = await call('DELETE', `/pets/${luna.id}`, undefined, other);
    assert.equal(r.status, 409);
  });

  it('elimina una mascota sin citas', async () => {
    assert.equal((await call('DELETE', `/pets/${pet.id}`, undefined, owner)).status, 204);
    assert.equal((await get('/pets', owner)).data.length, 0);
  });
});
