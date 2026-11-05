import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash } from 'lucide-react';
import { api } from '../../api';
import PetFormModal from '../../components/PetFormModal';
import { ErrorBox, Loading, Modal, PageHead, useToast } from '../../components/ui';
import { SIZE_LABEL, avatarClass, formatAge, formatWeight, petLabel } from '../../format';
import { useApi } from '../../hooks';
import type { Pet } from '../../types';

export default function MisMascotas() {
  const toast = useToast();
  const pets = useApi<Pet[]>('/pets');
  const [editing, setEditing] = useState<Pet | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Pet | null>(null);

  if (pets.error) return <ErrorBox message={pets.error} onRetry={pets.reload} />;
  if (!pets.data) return <Loading />;
  const list = pets.data;

  async function remove() {
    if (!deleting) return;
    try {
      await api(`/pets/${deleting.id}`, 'DELETE');
      pets.setData(list.filter((p) => p.id !== deleting.id));
      toast(`${deleting.name} fue eliminado.`, 'circle-x');
      setDeleting(null);
    } catch (err) {
      toast((err as Error).message, 'info');
    }
  }

  return (
    <>
      <PageHead
        crumb="Inicio / Mis mascotas"
        title="Mis mascotas"
        actions={<button className="btn btn-primary btn-lg" onClick={() => setEditing('new')}><Plus className="i" aria-hidden="true" />Registrar mascota</button>}
      />
      <div className="pets-grid">
        {list.map((p) => (
          <article key={p.id} className="card pet-card">
            <div className="top">
              <span className={`avatar ${avatarClass(p.id)}`}>{p.name[0]}</span>
              <div><h2>{p.name}</h2><span className="muted">{petLabel(p.species, p.breed)}</span></div>
            </div>
            <dl>
              <div><dt>Edad</dt><dd>{formatAge(p.ageYears)}</dd></div>
              <div><dt>Peso</dt><dd>{formatWeight(p.weightKg)}</dd></div>
              <div><dt>Tamaño</dt><dd>{p.size ? SIZE_LABEL[p.size] : '—'}</dd></div>
            </dl>
            {p.notes && <p className="muted" style={{ fontSize: 14 }}>{p.notes}</p>}
            <div className="row-2">
              <button className="btn btn-outline btn-sm" onClick={() => setEditing(p)}><Pencil className="i i-sm" aria-hidden="true" />Editar</button>
              <Link className="btn btn-primary btn-sm" to="/buscar">Reservar</Link>
            </div>
            <button className="link-btn" style={{ color: 'var(--err-fg)', justifySelf: 'start' }} onClick={() => setDeleting(p)}>
              <Trash className="i i-sm" aria-hidden="true" style={{ verticalAlign: '-3px', marginRight: 4 }} />Eliminar
            </button>
          </article>
        ))}
        <button type="button" className="add-card" onClick={() => setEditing('new')}><Plus className="i" aria-hidden="true" />Agregar mascota</button>
      </div>

      {editing && (
        <PetFormModal
          pet={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            pets.setData(editing === 'new' ? [...list, saved] : list.map((p) => (p.id === saved.id ? saved : p)));
            toast(editing === 'new' ? 'Mascota registrada.' : 'Cambios guardados.');
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <Modal
          size="sm"
          icon={<Trash className="i" aria-hidden="true" />}
          iconTone="danger"
          title={`¿Eliminar a ${deleting.name}?`}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setDeleting(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={remove}>Sí, eliminar</button>
            </>
          }
        >
          <p className="muted">También se borrará su historial de citas. Esta acción no se puede deshacer.</p>
        </Modal>
      )}
    </>
  );
}
