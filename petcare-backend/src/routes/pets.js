import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware.js';
import { HttpError, SIZES, SPECIES, assertValid, notFound, str, toInt } from '../utils.js';

const router = Router();
router.use(requireAuth, requireRole('dueno'));

const COLS = `id, name, species, breed, age_years AS "ageYears", weight_kg AS "weightKg", size, notes`;

const num = (v) => (v === '' || v == null ? null : Number(v));

export function parsePet(b = {}, extraErrors = {}) {
  const pet = {
    name: str(b.name),
    species: str(b.species),
    breed: str(b.breed) || null,
    ageYears: num(b.ageYears),
    weightKg: num(b.weightKg),
    size: str(b.size) || null,
    notes: str(b.notes) || null,
  };
  assertValid({
    name: pet.name.length < 2 && 'Escriba el nombre de la mascota',
    species: !SPECIES.includes(pet.species) && 'Seleccione la especie',
    ageYears: pet.ageYears !== null && (Number.isNaN(pet.ageYears) || pet.ageYears < 0 || pet.ageYears >= 40) && 'Edad no válida',
    weightKg: pet.weightKg !== null && (Number.isNaN(pet.weightKg) || pet.weightKg <= 0 || pet.weightKg >= 200) && 'Peso no válido',
    size: pet.size && !SIZES.includes(pet.size) && 'Tamaño no válido',
    ...extraErrors,
  });
  return pet;
}

router.get('/', async (req, res) => {
  const { rows } = await query(`SELECT ${COLS} FROM pets WHERE owner_id = $1 ORDER BY name`, [req.user.id]);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const p = parsePet(req.body);
  const { rows } = await query(
    `INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, size, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${COLS}`,
    [req.user.id, p.name, p.species, p.breed, p.ageYears, p.weightKg, p.size, p.notes],
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const p = parsePet(req.body);
  const { rows } = await query(
    `UPDATE pets SET name = $3, species = $4, breed = $5, age_years = $6, weight_kg = $7, size = $8, notes = $9
      WHERE id = $1 AND owner_id = $2 RETURNING ${COLS}`,
    [toInt(req.params.id), req.user.id, p.name, p.species, p.breed, p.ageYears, p.weightKg, p.size, p.notes],
  );
  if (!rows[0]) throw notFound('Mascota no encontrada');
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const history = await query(
    `SELECT 1 FROM bookings WHERE pet_id = $1 AND owner_id = $2 AND status = 'atendida' LIMIT 1`,
    [toInt(req.params.id), req.user.id],
  );
  if (history.rowCount) {
    throw new HttpError(409, 'La mascota tiene historial de atenciones y no se puede eliminar');
  }
  const active = await query(
    `SELECT 1 FROM bookings WHERE pet_id = $1 AND owner_id = $2 AND status IN ('pendiente', 'aceptada')`,
    [toInt(req.params.id), req.user.id],
  );
  if (active.rowCount) {
    throw new HttpError(409, 'La mascota tiene citas pendientes o confirmadas. Cancélelas primero');
  }
  const { rowCount } = await query('DELETE FROM pets WHERE id = $1 AND owner_id = $2', [
    toInt(req.params.id),
    req.user.id,
  ]);
  if (!rowCount) throw notFound('Mascota no encontrada');
  res.status(204).end();
});

export default router;
