import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import type { Pet, Size, Species } from '../types';
import { Field, FormAlert, Modal } from './ui';

export default function PetFormModal({ pet, onClose, onSaved }: { pet?: Pet | null; onClose: () => void; onSaved: (p: Pet) => void }) {
  const [f, setF] = useState({
    name: pet?.name ?? '', species: (pet?.species ?? 'perro') as Species, breed: pet?.breed ?? '',
    ageYears: pet?.ageYears != null ? String(pet.ageYears) : '', weightKg: pet?.weightKg != null ? String(pet.weightKg) : '',
    size: (pet?.size ?? '') as Size | '', notes: pet?.notes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setErrors({ ...errors, [k]: '' }); };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.name.trim().length < 2) errs.name = 'Escribe el nombre.';
    if (f.ageYears && (Number(f.ageYears) < 0 || Number(f.ageYears) >= 40)) errs.ageYears = 'Edad no válida.';
    if (f.weightKg && Number(f.weightKg) <= 0) errs.weightKg = 'Peso no válido.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setAlert(null);
    try {
      onSaved(pet ? await api<Pet>(`/pets/${pet.id}`, 'PUT', f) : await api<Pet>('/pets', 'POST', f));
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setAlert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={pet ? `Editar a ${pet.name}` : 'Registrar mascota'}
      subtitle="Estos datos ayudan al proveedor a preparar la atención."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className={`btn btn-primary ${busy ? 'is-loading' : ''}`} type="submit" form="pet-form" disabled={busy}>Guardar mascota</button>
        </>
      }
    >
      <form className="form" id="pet-form" onSubmit={onSubmit} noValidate>
        <FormAlert message={alert} />
        <div className="row-2">
          <Field id="pf-n" label="Nombre *" error={errors.name}>
            <input className="input" id="pf-n" placeholder="Ej.: Bruno" value={f.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <div className="field">
            <label className="label" htmlFor="pf-e">Especie *</label>
            <select className="input select" id="pf-e" value={f.species} onChange={(e) => set('species', e.target.value)}>
              <option value="perro">Perro</option><option value="gato">Gato</option><option value="conejo">Conejo</option><option value="otro">Otro</option>
            </select>
          </div>
        </div>
        <div className="row-2">
          <Field id="pf-r" label="Raza">
            <input className="input" id="pf-r" placeholder="Ej.: Labrador" value={f.breed} onChange={(e) => set('breed', e.target.value)} />
          </Field>
          <div className="field">
            <label className="label" htmlFor="pf-s">Tamaño</label>
            <select className="input select" id="pf-s" value={f.size} onChange={(e) => set('size', e.target.value)}>
              <option value="">Sin especificar</option><option value="pequeno">Pequeño</option><option value="mediano">Mediano</option><option value="grande">Grande</option>
            </select>
          </div>
        </div>
        <div className="row-2">
          <Field id="pf-a" label="Edad (años)" error={errors.ageYears}>
            <input className="input" id="pf-a" type="number" min={0} max={39} step={0.5} placeholder="3" value={f.ageYears} onChange={(e) => set('ageYears', e.target.value)} />
          </Field>
          <Field id="pf-w" label="Peso (kg)" error={errors.weightKg}>
            <input className="input" id="pf-w" type="number" min={0} step={0.1} placeholder="12" value={f.weightKg} onChange={(e) => set('weightKg', e.target.value)} />
          </Field>
        </div>
        <div className="field">
          <label className="label" htmlFor="pf-o">Observaciones</label>
          <textarea className="textarea" id="pf-o" placeholder="Alergias, comportamiento, cuidados especiales" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}
