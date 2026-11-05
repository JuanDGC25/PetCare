import bcrypt from 'bcryptjs';
import { query, withTransaction } from './db.js';
import { addDays, fromMinutes, nowInBogota, toMinutes, weekdayOf } from './utils.js';

export const DEMO_PASSWORD = 'PetCare123';

const L_V = [1, 2, 3, 4, 5];
const L_S = [1, 2, 3, 4, 5, 6];

const PROVIDERS = [
  {
    key: 'huellitas',
    user: { name: 'Laura Méndez', email: 'proveedor@petcare.co', phone: '3001234567', document: '52123456' },
    business: {
      business_name: 'Clínica Huellitas', category: 'veterinaria', locality: 'Bosa',
      neighborhood: 'Bosa Centro', address: 'Cra. 80 # 61-20 Sur',
      description: 'Consulta general, vacunación, desparasitación, dermatología, cirugía y estética para perros, gatos y conejos.',
    },
    staff: [
      ['Dr. Andrés Peña', 'Medicina general'],
      ['Dra. Sofía Ríos', 'Dermatología'],
      ['Dr. Camilo Vargas', 'Cirugía'],
      ['Equipo de estética', 'Peluquería'],
    ],
    services: [
      ['Consulta general', 'Revisión completa y plan de cuidado.', 45000, 30, ['perro', 'gato', 'conejo']],
      ['Vacunación', 'Aplicación de vacuna (el biológico se cobra aparte).', 35000, 30, ['perro', 'gato', 'conejo']],
      ['Desparasitación', 'Interna y externa según peso.', 30000, 30, ['perro', 'gato', 'conejo']],
      ['Baño y peluquería', 'Baño, corte, limpieza de oídos y uñas.', 50000, 60, ['perro', 'gato']],
      ['Consulta dermatológica', 'Valoración de piel y pelaje con especialista.', 60000, 40, ['perro', 'gato']],
      ['Cirugía', 'Procedimientos programados (esterilización, extracciones).', 250000, 120, ['perro', 'gato']],
    ],
    availability: [...L_V.map((d) => [d, '08:00', '18:00']), [6, '08:00', '13:00']],
  },
  {
    key: 'spa',
    user: { name: 'Andrés Rojas', email: 'peluqueria@petcare.co', phone: '3109876543' },
    business: {
      business_name: 'Spa Canino Patitas Felices', category: 'peluqueria', locality: 'Antonio Nariño',
      neighborhood: 'Restrepo', address: 'Cl. 17 Sur # 18-40',
      description: 'Baño, corte de raza y spa para perros de todos los tamaños.',
    },
    staff: [['Andrés Rojas', 'Peluquería canina'], ['Paola Cruz', 'Peluquería canina']],
    services: [
      ['Baño básico', 'Baño, secado, cepillado y limpieza de oídos.', 40000, 60, ['perro']],
      ['Baño y corte', 'Incluye corte de raza o a gusto.', 65000, 90, ['perro']],
      ['Corte de uñas', 'Rápido y sin estrés.', 15000, 30, ['perro', 'gato']],
    ],
    availability: L_S.map((d) => [d, '09:00', '17:00']),
  },
  {
    key: 'paseos',
    user: { name: 'Camilo Torres', email: 'paseos@petcare.co', phone: '3204567890' },
    business: {
      business_name: 'Paseos Don Camilo', category: 'paseo', locality: 'Kennedy',
      neighborhood: 'Castilla', address: null,
      description: 'Paseos en grupos pequeños por los parques de Kennedy.',
    },
    staff: [['Camilo Torres', 'Paseador']],
    services: [
      ['Paseo de 1 hora', 'Grupo de máximo 4 perros.', 18000, 60, ['perro']],
      ['Paseo individual', 'Paseo exclusivo para tu perro.', 28000, 60, ['perro']],
    ],
    availability: L_V.map((d) => [d, '06:00', '19:00']),
  },
  {
    key: 'guarderia',
    user: { name: 'Marcela Prieto', email: 'guarderia@petcare.co', phone: '3157654321' },
    business: {
      business_name: 'Guardería Casa Peluda', category: 'guarderia', locality: 'Suba',
      neighborhood: 'Niza', address: 'Av. Suba # 127-30',
      description: 'Guardería de día con zonas de juego y cámaras.',
    },
    staff: [['Marcela Prieto', 'Cuidadora']],
    services: [
      ['Guardería medio día', 'Hasta 5 horas con juego supervisado.', 35000, 300, ['perro']],
      ['Guardería para gatos', 'Espacio tranquilo y separado de los perros.', 30000, 240, ['gato']],
    ],
    availability: L_S.map((d) => [d, '07:00', '19:00']),
  },
  {
    key: 'felina',
    user: { name: 'Sofía Castaño', email: 'gatos@petcare.co', phone: '3012223344' },
    business: {
      business_name: 'Clínica Felina Michis', category: 'veterinaria', locality: 'Chapinero',
      neighborhood: 'Chapinero Alto', address: 'Cl. 57 # 5-14',
      description: 'Veterinaria especializada en gatos, ambiente libre de perros.',
    },
    staff: [['Dra. Sofía Castaño', 'Medicina felina']],
    services: [
      ['Consulta felina', 'Consulta con médica veterinaria especialista en gatos.', 60000, 40, ['gato']],
      ['Control de peso', 'Seguimiento nutricional.', 30000, 30, ['gato']],
    ],
    availability: L_V.map((d) => [d, '10:00', '18:00']),
  },
  {
    key: 'guau',
    user: { name: 'Jorge Salamanca', email: 'peluqueria2@petcare.co', phone: '3186665544' },
    business: {
      business_name: 'Peluquería Guau & Miau', category: 'peluqueria', locality: 'San Cristóbal',
      neighborhood: '20 de Julio', address: 'Cra. 6 # 27-15 Sur',
      description: 'Peluquería para perros y gatos a precios de barrio.',
    },
    staff: [['Jorge Salamanca', 'Peluquería']],
    services: [
      ['Baño para gato', 'Baño con productos especiales para felinos.', 35000, 60, ['gato']],
      ['Baño perro pequeño', 'Para razas pequeñas.', 30000, 60, ['perro']],
      ['Deslanado', 'Retiro de pelo muerto.', 45000, 60, ['perro', 'gato']],
    ],
    availability: [...L_S.map((d) => [d, '08:00', '16:00']), [0, '09:00', '13:00']],
  },
];

const OWNERS = [
  {
    user: { name: 'Ana Gómez', email: 'dueno@petcare.co', phone: '3118452290', document: '1012345678' },
    pets: [
      ['Luna', 'gato', 'Criolla', 2, 4, 'pequeno', 'Esterilizada. Pendiente refuerzo de triple felina.'],
      ['Lola', 'perro', 'Schnauzer', 5, 8, 'pequeno', 'Le dan miedo los secadores.'],
    ],
  },
  {
    user: { name: 'Carlos Ruiz', email: 'dueno2@petcare.co', phone: '3005124410', document: '79456123' },
    pets: [['Max', 'perro', 'Golden Retriever', 4, 31, 'grande', 'Sin alergias conocidas. Control de peso cada 6 meses.']],
  },
  {
    user: { name: 'Valentina Díaz', email: 'dueno3@petcare.co', phone: '3156670912', document: '1020304050' },
    pets: [['Mía', 'gato', 'Persa', 3, 3.8, 'pequeno', 'Cepillado frecuente para evitar nudos.']],
  },
];

const CLINIC_PETS = [
  ['Rocky', 'perro', 'Bulldog francés', 6, 12, 'mediano', 'Julián Torres', '3201147781', 'Dermatitis en tratamiento; baño medicado semanal.'],
  ['Toby', 'perro', 'Beagle', 8, 14, 'mediano', 'Mateo Herrera', '3012239087', 'Paciente senior; revisar articulaciones.'],
  ['Kiara', 'conejo', 'Mini lop', 1, 1.6, 'pequeno', 'Daniela León', '3134456677', 'Dieta con heno ilimitado.'],
  ['Simón', 'gato', 'Siamés', 5, 4.5, 'pequeno', 'Sara Molina', '3167788990', 'Tratamiento para gingivitis.'],
  ['Bruno', 'perro', 'Labrador', 3, 28, 'grande', 'Felipe Castro', '3001234567', 'Muy activo; usar bozal en vacunas.'],
  ['Nala', 'gato', 'Criolla', 1, 3.2, 'pequeno', 'Laura Pérez', '3109988776', null],
  ['Coco', 'perro', 'Pug', 2, 9, 'pequeno', 'Sara Molina', '3167788990', 'Braquicéfalo: evitar estrés por calor.'],
];

const today = () => nowInBogota().date;
function nextWeekday(weekday) {
  let d = addDays(today(), 1);
  while (weekdayOf(d) !== weekday) d = addDays(d, 1);
  return d;
}
const addMinutes = (time, min) => fromMinutes(toMinutes(time) + min);

function random(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function seedIfEmpty() {
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM users');
  if (rows[0].n > 0) return;

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const nowMinutes = nowInBogota().minutes;
  const T = today();

  await withTransaction(async (db) => {
    const prov = {};

    for (const p of PROVIDERS) {
      const u = await db.query(
        `INSERT INTO users (name, email, password_hash, phone, document, role, data_consent_at)
         VALUES ($1, $2, $3, $4, $5, 'proveedor', now()) RETURNING id`,
        [p.user.name, p.user.email, hash, p.user.phone, p.user.document ?? null],
      );
      const b = p.business;
      const pr = await db.query(
        `INSERT INTO providers (user_id, business_name, category, locality, neighborhood, address, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [u.rows[0].id, b.business_name, b.category, b.locality, b.neighborhood, b.address, b.description],
      );
      const entry = { id: pr.rows[0].id, services: {}, staff: {} };
      prov[p.key] = entry;

      for (const [name, specialty] of p.staff) {
        const s = await db.query(
          'INSERT INTO staff (provider_id, name, specialty) VALUES ($1, $2, $3) RETURNING id',
          [entry.id, name, specialty],
        );
        entry.staff[name] = s.rows[0].id;
      }
      for (const [name, description, price, duration, species] of p.services) {
        const s = await db.query(
          `INSERT INTO services (provider_id, name, description, price, duration_min, species)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [entry.id, name, description, price, duration, species],
        );
        entry.services[name] = { id: s.rows[0].id, price, duration };
      }
      for (const [weekday, start, end] of p.availability) {
        await db.query(
          'INSERT INTO availability (provider_id, weekday, start_time, end_time) VALUES ($1, $2, $3, $4)',
          [entry.id, weekday, start, end],
        );
      }
    }

    const pets = {};
    for (const o of OWNERS) {
      const u = await db.query(
        `INSERT INTO users (name, email, password_hash, phone, document, role, data_consent_at)
         VALUES ($1, $2, $3, $4, $5, 'dueno', now()) RETURNING id`,
        [o.user.name, o.user.email, hash, o.user.phone, o.user.document],
      );
      for (const [name, species, breed, age, weight, size, notes] of o.pets) {
        const pt = await db.query(
          `INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, size, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [u.rows[0].id, name, species, breed, age, weight, size, notes],
        );
        pets[name] = { id: pt.rows[0].id, ownerId: u.rows[0].id };
      }
    }
    for (const [name, species, breed, age, weight, size, ownerName, ownerPhone, notes] of CLINIC_PETS) {
      const pt = await db.query(
        `INSERT INTO pets (provider_id, owner_name, owner_phone, name, species, breed, age_years, weight_kg, size, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [prov.huellitas.id, ownerName, ownerPhone, name, species, breed, age, weight, size, notes],
      );
      pets[name] = { id: pt.rows[0].id, ownerId: null };
    }

    const insert = async (providerKey, petName, serviceName, date, start, status, opts = {}) => {
      const p = prov[providerKey];
      const svc = p.services[serviceName];
      const pet = pets[petName];
      await db.query(
        `INSERT INTO bookings (owner_id, pet_id, service_id, provider_id, staff_id, booking_date, start_time, end_time,
                               price, status, urgent, owner_notes, provider_notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [pet.ownerId, pet.id, svc.id, p.id, opts.staff ? p.staff[opts.staff] : null, date, start,
          addMinutes(start, svc.duration), svc.price, status, !!opts.urgent, opts.ownerNotes ?? null,
          opts.providerNotes ?? null, opts.createdAt ?? `${date}T07:00:00-05:00`],
      );
    };

    const rnd = random(2026);
    const pick = (list) => list[Math.floor(rnd() * list.length)];
    const patients = ['Max', 'Luna', 'Rocky', 'Mía', 'Toby', 'Kiara', 'Simón', 'Bruno', 'Nala', 'Coco', 'Lola'];
    const weighted = [
      ['Consulta general', 31], ['Vacunación', 24], ['Baño y peluquería', 18],
      ['Desparasitación', 13], ['Consulta dermatológica', 8], ['Cirugía', 6],
    ];
    const pickService = (pet) => {
      let r = rnd() * 100;
      for (const [name, w] of weighted) {
        if ((r -= w) <= 0) {
          if (pet === 'Kiara' && !['Consulta general', 'Vacunación', 'Desparasitación'].includes(name)) {
            return 'Consulta general';
          }
          return name;
        }
      }
      return 'Consulta general';
    };
    const staffFor = (service) =>
      service === 'Baño y peluquería' ? 'Equipo de estética'
        : service === 'Cirugía' ? 'Dr. Camilo Vargas'
          : service === 'Consulta dermatológica' ? 'Dra. Sofía Ríos'
            : pick(['Dr. Andrés Peña', 'Dra. Sofía Ríos']);

    for (let d = `${Number(T.slice(0, 4)) - 1}-01-02`; d < T; d = addDays(d, 1)) {
      const wd = weekdayOf(d);
      if (wd === 0) continue;
      const times = wd === 6 ? ['08:00', '10:30'] : ['08:00', '10:30', '14:00', '16:00'];
      const count = Math.min(times.length, Math.floor(rnd() * 3) + (rnd() < 0.55 ? 1 : 0));
      const chosen = [...times].sort(() => rnd() - 0.5).slice(0, count).sort();
      for (const start of chosen) {
        const pet = pick(patients);
        const service = pickService(pet);
        const r = rnd();
        const status = r < 0.9 ? 'atendida' : r < 0.97 ? 'cancelada' : 'rechazada';
        await insert('huellitas', pet, service, d, start, status, { staff: staffFor(service) });
      }
    }

    const todayAgenda = [
      ['Max', 'Vacunación', '08:00', 'aceptada', 'Dr. Andrés Peña'],
      ['Luna', 'Consulta general', '08:45', 'aceptada', 'Dra. Sofía Ríos'],
      ['Rocky', 'Desparasitación', '09:30', 'aceptada', 'Dr. Andrés Peña'],
      ['Mía', 'Baño y peluquería', '10:15', 'pendiente', null],
      ['Toby', 'Consulta dermatológica', '11:30', 'pendiente', null],
      ['Kiara', 'Consulta general', '14:30', 'cancelada', 'Dr. Andrés Peña'],
      ['Simón', 'Consulta general', '15:30', 'aceptada', 'Dra. Sofía Ríos'],
      ['Bruno', 'Consulta general', '16:30', 'aceptada', 'Dr. Andrés Peña'],
    ];
    for (const [pet, service, start, status, staff] of todayAgenda) {
      const [h, m] = start.split(':').map(Number);
      const finished = h * 60 + m + 30 <= nowMinutes;
      await insert('huellitas', pet, service, T, start, status === 'aceptada' && finished ? 'atendida' : status, {
        staff,
        createdAt: `${addDays(T, -2)}T09:00:00-05:00`,
        ownerNotes: pet === 'Toby' ? 'Se rasca mucho las orejas' : null,
      });
    }

    const upcoming = [
      ['Bruno', 'Vacunación', nextWeekday(1), '09:00', 'aceptada', { staff: 'Dr. Andrés Peña', providerNotes: 'Rabia' }],
      ['Nala', 'Vacunación', nextWeekday(2), '10:00', 'aceptada', { staff: 'Dra. Sofía Ríos', providerNotes: 'Triple felina' }],
      ['Coco', 'Vacunación', nextWeekday(3), '11:00', 'aceptada', { staff: 'Dr. Andrés Peña', providerNotes: 'Pentavalente' }],
      ['Luna', 'Vacunación', nextWeekday(4), '15:00', 'aceptada', { staff: 'Dra. Sofía Ríos', providerNotes: 'Triple felina' }],
      ['Max', 'Consulta general', nextWeekday(2), '09:00', 'pendiente', { ownerNotes: 'Cojea de la pata trasera' }],
      ['Lola', 'Baño y peluquería', nextWeekday(5), '14:00', 'pendiente', { ownerNotes: 'Primera vez en la clínica' }],
      ['Mía', 'Desparasitación', nextWeekday(3), '16:00', 'pendiente', {}],
      ['Simón', 'Cirugía', nextWeekday(4), '08:00', 'aceptada', { staff: 'Dr. Camilo Vargas', providerNotes: 'Extracción dental, ayuno de 8 horas' }],
    ];
    for (const [pet, service, date, start, status, opts] of upcoming) {
      await insert('huellitas', pet, service, date, start, status, { createdAt: `${T}T07:30:00-05:00`, ...opts });
    }

    await insert('spa', 'Lola', 'Baño y corte', nextWeekday(6), '09:00', 'aceptada', { providerNotes: 'Te esperamos' });
    await insert('felina', 'Luna', 'Consulta felina', nextWeekday(1), '11:00', 'rechazada', { providerNotes: 'Ese día no hay cupo, pruebe el miércoles' });
    await insert('guau', 'Luna', 'Baño para gato', nextWeekday(2), '10:00', 'cancelada');
    await insert('paseos', 'Max', 'Paseo de 1 hora', nextWeekday(1), '06:00', 'aceptada', { providerNotes: 'Lo recogemos en portería' });
    await insert('guarderia', 'Max', 'Guardería medio día', nextWeekday(5), '08:00', 'pendiente');
    await insert('felina', 'Mía', 'Consulta felina', nextWeekday(3), '10:00', 'pendiente', { ownerNotes: 'No come bien hace dos días' });
  });

  console.log(`[seed] Datos de prueba cargados. Contraseña de todas las cuentas: ${DEMO_PASSWORD}`);
}
