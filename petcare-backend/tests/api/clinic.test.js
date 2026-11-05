import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, call, freeDay, get, huellitas, login, registerOwner, today } from '../helpers.js';

const owner = { ownerName: 'Marta Ruiz', ownerPhone: '310 555 1234' };

describe('API · pacientes de la clínica', () => {
  let provider, other, pet;
  before(async () => {
    [provider, other] = await Promise.all(['proveedor@petcare.co', 'peluqueria@petcare.co'].map(login));
  });

  it('lista los pacientes con su ficha', async () => {
    const { data } = await get('/clinic/pets', provider);
    assert.ok(data.length >= 10);
    const luna = data.find((p) => p.name === 'Luna');
    assert.equal(luna.ownerName, 'Ana Gómez');
    assert.equal(luna.editable, false);
    assert.ok(Array.isArray(luna.history));
  });

  it('valida el registro en mostrador', async () => {
    const r = await call('POST', '/clinic/pets', { name: 'P', species: 'gato', ownerName: 'M', ownerPhone: '1' }, provider);
    assert.equal(r.status, 400);
    assert.ok(r.data.details.name && r.data.details.ownerName && r.data.details.ownerPhone);
  });

  it('registra y edita un paciente propio', async () => {
    const r = await call('POST', '/clinic/pets', { name: 'Pelusa', species: 'gato', ...owner }, provider);
    assert.equal(r.status, 201);
    assert.equal(r.data.editable, true);
    assert.equal(r.data.ownerPhone, '3105551234');
    pet = r.data;
    const edited = await call('PUT', `/clinic/pets/${pet.id}`, { name: 'Pelusa', species: 'gato', weightKg: 4.2, notes: 'Alérgica', ...owner }, provider);
    assert.equal(edited.data.weightKg, 4.2);
    assert.equal(edited.data.notes, 'Alérgica');
  });

  it('no edita mascotas de dueños con cuenta ni de otra clínica', async () => {
    const luna = (await get('/clinic/pets', provider)).data.find((p) => p.name === 'Luna');
    assert.equal((await call('PUT', `/clinic/pets/${luna.id}`, { name: 'Luna', species: 'gato', ...owner }, provider)).status, 404);
    assert.equal((await call('PUT', `/clinic/pets/${pet.id}`, { name: 'Robo', species: 'gato', ...owner }, other)).status, 404);
    assert.ok(!(await get('/clinic/pets', other)).data.some((p) => p.id === pet.id));
  });
});

describe('API · nueva cita de la clínica', () => {
  let clinic, provider, pet, catSvc, dogOnly, day, staff;
  before(async () => {
    clinic = await huellitas();
    provider = await login('proveedor@petcare.co');
    pet = (await call('POST', '/clinic/pets', { name: 'Misha', species: 'gato', ...owner }, provider)).data;
    const services = (await get('/my/services', provider)).data.filter((s) => s.active);
    catSvc = services.find((s) => s.species.includes('gato'));
    dogOnly = services.find((s) => !s.species.includes('gato'));
    staff = (await get('/clinic/staff', provider)).data[0];
    day = await freeDay(clinic.id, catSvc.id, 3);
  });

  const book = (extra) => call('POST', '/clinic/bookings', { petId: pet.id, serviceId: catSvc.id, date: day.date, startTime: day.slots[0], ...extra }, provider);

  it('agenda una cita confirmada con profesional', async () => {
    const r = await book({ staffId: staff.id, notes: 'Control' });
    assert.equal(r.status, 201);
    assert.equal(r.data.status, 'aceptada');
    assert.equal(r.data.staff.id, staff.id);
  });

  it('rechaza cruces, horas fuera del horario y fechas pasadas', async () => {
    assert.match((await book()).data.error, /Ya hay una cita/);
    assert.equal((await book({ startTime: '02:00' })).status, 400);
    assert.equal((await book({ date: addDays(today(), -2), startTime: '10:00' })).status, 400);
  });

  it('rechaza especies no atendidas y mascotas ajenas', async () => {
    if (dogOnly) assert.equal((await book({ serviceId: dogOnly.id, startTime: day.slots[1] })).status, 400);
    const stranger = await registerOwner();
    const foreign = (await call('POST', '/pets', { name: 'Ajeno', species: 'gato' }, stranger)).data;
    assert.equal((await book({ petId: foreign.id, startTime: day.slots[2] })).status, 400);
  });

  it('la ficha muestra la próxima visita', async () => {
    const found = (await get('/clinic/pets', provider)).data.find((p) => p.id === pet.id);
    assert.equal(found.nextVisit.date, day.date);
  });
});

describe('API · urgencias', () => {
  let provider;
  before(async () => { provider = await login('proveedor@petcare.co'); });

  it('valida los cuatro campos', async () => {
    const r = await call('POST', '/clinic/urgent', { petName: 'R', species: 'pez', ownerContact: 'x', symptoms: '' }, provider);
    assert.equal(r.status, 400);
    assert.equal(Object.keys(r.data.details).length, 4);
  });

  it('crea la mascota y la cita urgente confirmada', async () => {
    const r = await call('POST', '/clinic/urgent', {
      petName: 'Thor', species: 'perro', ownerContact: 'Jorge Díaz · 300 123 4567', symptoms: 'Vómito y decaimiento',
    }, provider);
    assert.equal(r.status, 201);
    assert.equal(r.data.urgent, true);
    assert.equal(r.data.status, 'aceptada');
    assert.equal(r.data.owner.name, 'Jorge Díaz');
    assert.equal(r.data.owner.phone, '3001234567');
    assert.ok(r.data.staff);
  });
});

describe('API · profesionales', () => {
  let provider, other, member;
  before(async () => {
    [provider, other] = await Promise.all(['proveedor@petcare.co', 'peluqueria@petcare.co'].map(login));
  });

  it('lista el equipo con estadísticas', async () => {
    const { data } = await get('/clinic/staff', provider);
    assert.ok(data.some((s) => s.name === 'Dr. Andrés Peña'));
    for (const key of ['total', 'attended', 'cancelled', 'upcoming', 'income']) assert.equal(typeof data[0][key], 'number');
  });

  it('crea, valida y desactiva un profesional', async () => {
    member = (await call('POST', '/clinic/staff', { name: 'Dr. Prueba', specialty: 'Cirugía' }, provider)).data;
    assert.equal(member.active, true);
    assert.equal((await call('PUT', `/clinic/staff/${member.id}`, { name: 'X', specialty: 'Y' }, provider)).status, 400);
    const off = await call('PUT', `/clinic/staff/${member.id}`, { name: 'Dr. Prueba', specialty: 'Cirugía', active: false }, provider);
    assert.equal(off.data.active, false);
  });

  it('solo su clínica lo puede retirar', async () => {
    assert.equal((await call('DELETE', `/clinic/staff/${member.id}`, undefined, other)).status, 404);
    assert.equal((await call('DELETE', `/clinic/staff/${member.id}`, undefined, provider)).status, 204);
  });
});
