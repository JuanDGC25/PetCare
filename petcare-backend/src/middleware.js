import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db.js';
import { HttpError, forbidden } from './utils.js';

export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Debe iniciar sesión');

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, 'La sesión expiró. Inicie sesión de nuevo');
  }

  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, p.id AS provider_id
       FROM users u LEFT JOIN providers p ON p.user_id = u.id
      WHERE u.id = $1`,
    [payload.sub],
  );
  if (!rows[0]) throw new HttpError(401, 'El usuario ya no existe');
  req.user = rows[0];
  next();
}

export const requireRole = (role) => (req, _res, next) => {
  if (req.user?.role !== role) {
    throw forbidden(role === 'proveedor'
      ? 'Esta sección es solo para proveedores'
      : 'Esta sección es solo para dueños de mascotas');
  }
  next();
};

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido' });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: 'El registro ya existe' });
  }
  console.error('[api] Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
