import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash, UserPlus } from 'lucide-react';
import { api, ApiError } from '../../api';
import { staffLabel, useAuth } from '../../auth';
import { useClinic } from '../../components/clinic';
import { ErrorBox, Field, FormAlert, Loading, Modal, PageHead, useToast } from '../../components/ui';
import { avatarClass, formatNumber, initials } from '../../format';
import { useApi } from '../../hooks';
import type { Staff } from '../../types';

function StaffModal({ staff, onClose, onSaved }: { staff: Staff | null; onClose: () => void; onSaved: (s: Staff) => void }) {
  const [f, setF] = useState({ name: staff?.name ?? '', specialty: staff?.specialty ?? '', active: staff?.active ?? true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.name.trim().length < 3) errs.name = 'Escribe el nombre.';
    if (f.specialty.trim().length < 3) errs.specialty = 'Escribe la especialidad.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      onSaved(staff ? await api<Staff>(`/clinic/staff/${staff.id}`, 'PUT', f) : await api<Staff>('/clinic/staff', 'POST', f));
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setAlert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      size="sm"
      title={staff ? 'Editar profesional' : 'Agregar profesional'}
      subtitle="Aparece en la agenda y se puede asignar a cada cita."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className={`btn btn-primary ${busy ? 'is-loading' : ''}`} type="submit" form="staff-form" disabled={busy}>Guardar</button>
        </>
      }
    >
      <form className="form" id="staff-form" onSubmit={onSubmit} noValidate>
        <FormAlert message={alert} />
        <Field id="st-n" label="Nombre *" error={errors.name}>
          <input className="input" id="st-n" placeholder="Ej.: Dra. Sofía Ríos" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field id="st-e" label="Especialidad *" error={errors.specialty}>
          <input className="input" id="st-e" placeholder="Ej.: Dermatología" value={f.specialty} onChange={(e) => setF({ ...f, specialty: e.target.value })} />
        </Field>
        <label className="switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span className="tr" /> Disponible para nuevas citas
        </label>
      </form>
    </Modal>
  );
}

export default function Equipo() {
  const { user } = useAuth();
  const toast = useToast();
  const { version, refresh } = useClinic();
  const staff = useApi<Staff[]>('/clinic/staff', version);
  const [editing, setEditing] = useState<Staff | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Staff | null>(null);
  const label = staffLabel(user);

  if (staff.error) return <ErrorBox message={staff.error} onRetry={staff.reload} />;
  if (!staff.data) return <Loading />;
  const list = staff.data;

  async function remove() {
    if (!deleting) return;
    try {
      await api(`/clinic/staff/${deleting.id}`, 'DELETE');
      toast(`${deleting.name} fue retirado del equipo.`, 'circle-x');
      setDeleting(null);
      refresh();
    } catch (err) {
      toast((err as Error).message, 'info');
    }
  }

  return (
    <>
      <PageHead
        crumb={`Inicio / ${label}`}
        title={label}
        actions={<button className="btn btn-primary btn-lg" onClick={() => setEditing('new')}><UserPlus className="i" aria-hidden="true" />Agregar profesional</button>}
      />
      <div className="vets">
        {list.map((s) => {
          const attendance = s.attended + s.cancelled ? Math.round((s.attended / (s.attended + s.cancelled)) * 100) : 100;
          return (
            <article key={s.id} className="card vet" style={s.active ? undefined : { opacity: 0.6 }}>
              <span className={`avatar ${avatarClass(s.id)}`}>{initials(s.name)}</span>
              <div>
                <h3>{s.name}</h3>
                <p className="muted">{s.specialty}</p>
              </div>
              <span className={`badge ${s.active ? 'b-ok' : 'b-cancel'}`}>{s.active ? 'Disponible' : 'No disponible'}</span>
              <div className="stats-mini">
                <div><b>{formatNumber(s.attended)}</b><small>Atendidas</small></div>
                <div><b>{attendance}%</b><small>Asistencia</small></div>
              </div>
              <div className="actions" style={{ justifyContent: 'center' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(s)}><Pencil className="i i-sm" aria-hidden="true" />Editar</button>
                <button className="btn btn-ghost-danger btn-sm" onClick={() => setDeleting(s)} aria-label={`Retirar a ${s.name}`}><Trash className="i i-sm" aria-hidden="true" /></button>
              </div>
            </article>
          );
        })}
        <button type="button" className="add-card" onClick={() => setEditing('new')}><Plus className="i" aria-hidden="true" />Agregar profesional</button>
      </div>

      {editing && (
        <StaffModal
          staff={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(s) => {
            toast(editing === 'new' ? `${s.name} se agregó al equipo.` : 'Cambios guardados.');
            setEditing(null);
            refresh();
          }}
        />
      )}
      {deleting && (
        <Modal
          size="sm"
          icon={<Trash className="i" aria-hidden="true" />}
          iconTone="danger"
          title={`¿Retirar a ${deleting.name}?`}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setDeleting(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={remove}>Sí, retirar</button>
            </>
          }
        >
          <p className="muted">Sus citas se conservan, pero quedarán sin profesional asignado.</p>
        </Modal>
      )}
    </>
  );
}
