import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, call, freeDay, get, huellitas, login, registerOwner, today } from '../helpers.js';

const setStatus = (id, status, token, extra = {}) => call('PATCH', `/bookings/${id}/status`, { status, ...extra }, token);

describe('API · reservas y estados de cita', () => {
  let clinic, svc, owner, owner2, provider, other, lola, max, day, booking;
  const slotsOf = async (date) => (await get(`/providers/${clinic.id}/slots?serviceId=${svc.id}&date=${date}`)).data.slots;

  before(async () => {
    clinic = await huellitas();
    svc = clinic.service('Consulta general');
    [owner, owner2, provider, other] = await Promise.all(
      ['dueno@petcare.co', 'dueno2@petcare.co', 'proveedor@petcare.co', 'peluqueria@petcare.co'].map(login),
    );
    lola = (await get('/pets', owner)).data.find((p) => p.name === 'Lola');
    max = (await get('/pets', owner2)).data.find((p) => p.name === 'Max');
    day = await freeDay(clinic.id, svc.id, 4);
  });

  it('valida la solicitud', async () => {
    assert.equal((await call('POST', '/bookings', {}, owner)).status, 400);
    assert.equal((await call('POST', '/bookings', { serviceId: svc.id, petId: max.id, date: day.date, startTime: day.slots[0] }, owner)).status, 400);
    assert.equal((await call('POST', '/bookings', { serviceId: svc.id, petId: lola.id, date: day.date, startTime: '03:00' }, owner)).status, 409);
  });

  it('solo los dueños reservan', async () => {
    const r = await call('POST', '/bookings', { serviceId: svc.id, petId: lola.id, date: day.date, startTime: day.slots[0] }, provider);
    assert.equal(r.status, 403);
  });

  it('crea la reserva pendiente y ocupa la hora', async () => {
    const r = await call('POST', '/bookings', { serviceId: svc.id, petId: lola.id, date: day.date, startTime: day.slots[0], notes: 'Prueba' }, owner);
    assert.equal(r.status, 201);
    assert.equal(r.data.status, 'pendiente');
    assert.equal(r.data.price, svc.price);
    booking = r.data;
    assert.ok(!(await slotsOf(day.date)).includes(day.slots[0]));
    const again = await call('POST', '/bookings', { serviceId: svc.id, petId: lola.id, date: day.date, startTime: day.slots[0] }, owner);
    assert.equal(again.status, 409);
  });

  it('dos dueños que piden la misma hora al mismo tiempo: solo uno la obtiene', async () => {
    const time = day.slots.at(-1);
    const results = await Promise.all([
      call('POST', '/bookings', { serviceId: svc.id, petId: lola.id, date: day.date, startTime: time }, owner),
      call('POST', '/bookings', { serviceId: svc.id, petId: max.id, date: day.date, startTime: time }, owner2),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    const won = results.find((r) => r.status === 201);
    const rejected = await setStatus(won.data.id, 'rechazada', provider, { notes: 'Sin cupo' });
    assert.equal(rejected.data.status, 'rechazada');
    assert.ok((await slotsOf(day.date)).includes(time));
  });

  it('cada quien ve solo sus citas', async () => {
    assert.ok((await get('/bookings', owner)).data.some((b) => b.id === booking.id));
    assert.ok((await get('/bookings?status=pendiente', provider)).data.some((b) => b.id === booking.id));
    assert.ok(!(await get('/bookings', other)).data.some((b) => b.id === booking.id));
    assert.ok(!(await get('/bookings', owner2)).data.some((b) => b.id === booking.id));
  });

  it('respeta quién puede cambiar el estado', async () => {
    assert.equal((await setStatus(booking.id, 'aceptada', other)).status, 403);
    assert.equal((await setStatus(booking.id, 'aceptada', owner)).status, 400);
    assert.equal((await setStatus(booking.id, 'atendida', provider)).status, 400);
  });

  it('el proveedor confirma asignando un profesional propio', async () => {
    const staff = (await get('/clinic/staff', provider)).data;
    assert.equal((await setStatus(booking.id, 'aceptada', provider, { staffId: 999999 })).status, 400);
    const r = await setStatus(booking.id, 'aceptada', provider, { staffId: staff[0].id, notes: 'Lo esperamos' });
    assert.equal(r.data.status, 'aceptada');
    assert.equal(r.data.staff.id, staff[0].id);
    assert.equal(r.data.providerNotes, 'Lo esperamos');
  });

  it('una cita futura no se puede marcar como atendida', async () => {
    assert.equal((await setStatus(booking.id, 'atendida', provider)).status, 400);
  });

  it('el dueño cancela, el horario se libera y el estado queda final', async () => {
    assert.equal((await setStatus(booking.id, 'cancelada', owner)).data.status, 'cancelada');
    assert.ok((await slotsOf(day.date)).includes(day.slots[0]));
    assert.equal((await setStatus(booking.id, 'aceptada', provider)).status, 400);
  });

  it('una cita confirmada de hoy pasa a atendida', async () => {
    const [todays] = (await get(`/bookings?date=${today()}&status=aceptada`, provider)).data;
    if (!todays) return;
    assert.equal((await setStatus(todays.id, 'atendida', provider)).data.status, 'atendida');
  });

  it('el dueño no cancela citas que ya pasaron', async () => {
    const [past] = (await get(`/bookings?to=${addDays(today(), -1)}&status=aceptada`, owner)).data;
    if (!past) return;
    assert.equal((await setStatus(past.id, 'cancelada', owner)).status, 400);
  });

  it('una reserva con un dueño nuevo sigue el flujo completo', async () => {
    const token = await registerOwner();
    const pet = (await call('POST', '/pets', { name: 'Nube', species: 'gato' }, token)).data;
    const { date, slots } = await freeDay(clinic.id, svc.id);
    const created = (await call('POST', '/bookings', { serviceId: svc.id, petId: pet.id, date, startTime: slots[0] }, token)).data;
    assert.equal((await setStatus(created.id, 'aceptada', provider)).data.status, 'aceptada');
    const mine = (await get('/bookings', token)).data;
    assert.equal(mine.find((b) => b.id === created.id).status, 'aceptada');
    await setStatus(created.id, 'cancelada', token);
  });
});
