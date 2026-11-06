import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware.js';
import {
  CATEGORIES, LOCALITIES, HttpError, assertValid, isEmail, signToken, str,
} from '../utils.js';

const router = Router();

async function loadProfile(userId) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role,
            p.id AS provider_id, p.business_name, p.category
       FROM users u LEFT JOIN providers p ON p.user_id = u.id
      WHERE u.id = $1`,
    [userId],
  );
  return rows[0];
}

router.post('/register', async (req, res) => {
  const b = req.body ?? {};
  const data = {
    name: str(b.name),
    email: str(b.email).toLowerCase(),
    password: typeof b.password === 'string' ? b.password : '',
    phone: str(b.phone).replace(/\D/g, ''),
    document: str(b.document).replace(/\D/g, ''),
    role: b.role === 'proveedor' ? 'proveedor' : b.role === 'dueno' ? 'dueno' : '',
    businessName: str(b.businessName),
    category: str(b.category),
    locality: str(b.locality),
    neighborhood: str(b.neighborhood),
    address: str(b.address),
  };

  const errors = {
    name: data.name.length < 3 && 'Escriba su nombre completo',
    email: !isEmail(data.email) && 'Correo electrónico no válido',
    document: (data.document.length < 6 || data.document.length > 12) && 'Escriba un documento válido',
    phone: data.phone.length !== 10 && 'El celular debe tener 10 dígitos',
    password:
      (data.password.length < 8 || !/\d/.test(data.password) || !/[a-zA-Z]/.test(data.password)) &&
      'Mínimo 8 caracteres, con letras y números',
    role: !data.role && 'Seleccione si es dueño o proveedor',
    consent: b.consent !== true && 'Debe autorizar el tratamiento de datos personales',
  };
  if (data.role === 'proveedor') {
    Object.assign(errors, {
      businessName: data.businessName.length < 3 && 'Escriba el nombre del negocio',
      category: !CATEGORIES.includes(data.category) && 'Seleccione una categoría',
      locality: !LOCALITIES.includes(data.locality) && 'Seleccione una localidad',
      neighborhood: data.neighborhood.length < 3 && 'Escriba el barrio',
    });
  }
  assertValid(errors);

  const exists = await query('SELECT 1 FROM users WHERE email = $1', [data.email]);
  if (exists.rowCount) throw new HttpError(409, 'Ya existe una cuenta con ese correo');

  const hash = await bcrypt.hash(data.password, 10);
  const userId = await withTransaction(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, phone, document, role, data_consent_at)
       VALUES ($1, $2, $3, $4, $5, $6, now()) RETURNING id`,
      [data.name, data.email, hash, data.phone, data.document, data.role],
    );
    if (data.role === 'proveedor') {
      const pr = await db.query(
        `INSERT INTO providers (user_id, business_name, category, locality, neighborhood, address)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [rows[0].id, data.businessName, data.category, data.locality, data.neighborhood, data.address || null],
      );
      await db.query('INSERT INTO staff (provider_id, name, specialty) VALUES ($1, $2, $3)', [
        pr.rows[0].id, data.name, 'Administración',
      ]);
    }
    return rows[0].id;
  });

  const user = await loadProfile(userId);
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', async (req, res) => {
  const email = str(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) throw new HttpError(400, 'Escriba su correo y contraseña');

  const { rows } = await query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
  const ok = rows[0] && (await bcrypt.compare(password, rows[0].password_hash));
  if (!ok) throw new HttpError(401, 'El correo o la contraseña no son correctos.');

  const user = await loadProfile(rows[0].id);
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json(await loadProfile(req.user.id));
});

export default router;



