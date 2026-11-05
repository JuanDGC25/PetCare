import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Plus, Search } from 'lucide-react';
import { api, ApiError } from '../../api';
import { staffLabel, useAuth } from '../../auth';
import { useClinic } from '../../components/clinic';
import { ErrorBox, Field, FormAlert, Loading, Modal, PageHead, useToast } from '../../components/ui';
import {
  SPECIES_LABEL, avatarClass, downloadCsv, formatAge, formatDateMedium, formatDateShort, formatNumber,
  formatWeight, hcCode, initials, petLabel,
} from '../../format';
import { useApi } from '../../hooks';
import type { Booking, ClinicPet, Species, Staff } from '../../types';

const PAGE = 7;
const FILTERS = [['todas', 'Todas'], ['perro', 'Perros'], ['gato', 'Gatos'], ['otro', 'Otros']] as const;

function petStatus(p: ClinicPet) {
  if (p.nextVisit && /vacun/i.test(p.nextVisit.service)) return { cls: 'b-warn', text: 'Vacuna pendiente' };
  if (p.nextVisit) return { cls: 'b-info', text: 'Cita programada' };
  return { cls: 'b-ok', text: 'Al día' };
}
const firstNumber = (s: string) => {
  const m = s.replace(',', '.').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

function NewPetModal({ onClose, onSaved }: { onClose: () => void; onSaved: (p: ClinicPet) => void }) {
  const [f, setF] = useState({ name: '', species: 'perro', breed: '', ageYears: '', ownerName: '', ownerPhone: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setErrors({ ...errors, [k]: '' }); };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.name.trim().length < 2) errs.name = 'Escribe el nombre.';
    if (!f.breed.trim()) errs.breed = 'Escribe la raza.';
    if (f.ageYears === '' || Number(f.ageYears) < 0) errs.ageYears = 'Escribe la edad.';
    if (f.ownerName.trim().length < 3) errs.ownerName = 'Escribe el propietario.';
    if (f.ownerPhone.replace(/\D/g, '').length !== 10) errs.ownerPhone = 'Escribe el teléfono (10 dígitos).';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setAlert(null);
    try {
      onSaved(await api<ClinicPet>('/clinic/pets', 'POST', f));
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setAlert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Registrar mascota"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className={`btn btn-primary ${busy ? 'is-loading' : ''}`} type="submit" form="cpet-form" disabled={busy}>Guardar mascota</button>
        </>
      }
    >
      <form className="form" id="cpet-form" onSubmit={onSubmit} noValidate>
        <FormAlert message={alert} />
        <div className="row-2">
          <Field id="cp-n" label="Nombre *" error={errors.name}>
            <input className="input" id="cp-n" type="text" placeholder="Ej.: Bruno" value={f.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <div className="field">
            <label className="label" htmlFor="cp-e">Especie *</label>
            <select className="input select" id="cp-e" value={f.species} onChange={(e) => set('species', e.target.value)}>
              <option value="perro">Perro</option><option value="gato">Gato</option><option value="conejo">Conejo</option><option value="otro">Otro</option>
            </select>
          </div>
        </div>
        <div className="row-2">
          <Field id="cp-r" label="Raza *" error={errors.breed}>
            <input className="input" id="cp-r" type="text" placeholder="Ej.: Labrador" value={f.breed} onChange={(e) => set('breed', e.target.value)} />
          </Field>
          <Field id="cp-a" label="Edad (años) *" error={errors.ageYears}>
            <input className="input" id="cp-a" type="number" min={0} max={39} placeholder="3" value={f.ageYears} onChange={(e) => set('ageYears', e.target.value)} />
          </Field>
        </div>
        <div className="row-2">
          <Field id="cp-p" label="Propietario *" error={errors.ownerName}>
            <input className="input" id="cp-p" type="text" placeholder="Nombre del propietario" value={f.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
          </Field>
          <Field id="cp-t" label="Teléfono del propietario *" error={errors.ownerPhone}>
            <input className="input" id="cp-t" type="tel" placeholder="300 000 0000" value={f.ownerPhone} onChange={(e) => set('ownerPhone', e.target.value)} />
          </Field>
        </div>
        <div className="field">
          <label className="label" htmlFor="cp-o">Observaciones clínicas</label>
          <textarea className="textarea" id="cp-o" placeholder="Alergias, enfermedades previas, medicamentos" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}

function PetDetail({ pet, onSaved }: { pet: ClinicPet; onSaved: (p: ClinicPet) => void }) {
  const toast = useToast();
  const { openAppt } = useClinic();
  const [f, setF] = useState({ name: '', breed: '', age: '', weight: '', owner: '', notes: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setF({
      name: pet.name, breed: pet.breed ?? '', age: pet.ageYears != null ? formatAge(pet.ageYears) : '',
      weight: pet.weightKg != null ? formatWeight(pet.weightKg) : '', owner: pet.ownerName, notes: pet.notes ?? '',
    });
  }, [pet]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pet.editable) return;
    setBusy(true);
    try {
      const saved = await api<ClinicPet>(`/clinic/pets/${pet.id}`, 'PUT', {
        name: f.name, species: pet.species, breed: f.breed, ageYears: firstNumber(f.age), weightKg: firstNumber(f.weight),
        size: pet.size, notes: f.notes, ownerName: f.owner, ownerPhone: pet.ownerPhone,
      });
      onSaved(saved);
      toast(`Cambios guardados en la historia clínica de ${saved.name}.`);
    } catch (err) {
      toast((err as Error).message, 'info');
    } finally {
      setBusy(false);
    }
  }

  const ro = !pet.editable;
  return (
    <aside className="card detail" aria-label="Detalle de la mascota">
      <div className="detail-head">
        <span className={`avatar ${avatarClass(pet.id)}`}>{pet.name[0]}</span>
        <div><h2>{pet.name}</h2><small>{hcCode(pet.id)} · {SPECIES_LABEL[pet.species]}</small></div>
      </div>
      <form className="detail-body" onSubmit={onSubmit}>
        <div className="row-2">
          <div className="field"><label className="label" htmlFor="d-n">Nombre</label><input className="input" id="d-n" readOnly={ro} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="field"><label className="label" htmlFor="d-r">Raza</label><input className="input" id="d-r" readOnly={ro} value={f.breed} onChange={(e) => setF({ ...f, breed: e.target.value })} /></div>
        </div>
        <div className="row-2">
          <div className="field"><label className="label" htmlFor="d-e">Edad</label><input className="input" id="d-e" readOnly={ro} value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} /></div>
          <div className="field"><label className="label" htmlFor="d-p">Peso</label><input className="input" id="d-p" readOnly={ro} value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} /></div>
        </div>
        <div className="field"><label className="label" htmlFor="d-o">Propietario</label><input className="input" id="d-o" readOnly={ro} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></div>
        <div className="field">
          <label className="label" htmlFor="d-obs">Observaciones clínicas</label>
          <textarea className="textarea" id="d-obs" readOnly={ro} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          {ro && <span className="help-always">El propietario actualiza estos datos desde su cuenta de PetCare.</span>}
        </div>
        <div className="field">
          <span className="label">Historial reciente</span>
          <div className="hist">
            {pet.history.length === 0 && <div><span>Sin atenciones registradas</span><time>—</time></div>}
            {pet.history.map((h, i) => <div key={i}><span>{h.service}</span><time>{formatDateShort(h.date)}</time></div>)}
          </div>
        </div>
        <div className="row-2">
          <button className={`btn btn-outline ${busy ? 'is-loading' : ''}`} type="submit" disabled={ro || busy}>Guardar cambios</button>
          <button className="btn btn-accent" type="button" onClick={() => openAppt(pet.id)}>Agendar cita</button>
        </div>
      </form>
    </aside>
  );
}

export default function Gestion() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { version } = useClinic();
  const [params, setParams] = useSearchParams();
  const pets = useApi<ClinicPet[]>('/clinic/pets', version);
  const bookings = useApi<Booking[]>('/bookings', version);
  const staff = useApi<Staff[]>('/clinic/staff', version);
  const [tab, setTab] = useState<'pets' | 'owners'>('pets');
  const [filter, setFilter] = useState<'todas' | Species>('todas');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(Number(params.get('pet')) || null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (params.get('q') !== null) setQ(params.get('q') ?? '');
    if (params.get('pet')) setSelectedId(Number(params.get('pet')));
    setTab('pets');
    setPage(1);
  }, [params]);

  const list = pets.data ?? [];
  const term = q.trim().toLowerCase();
  const filtered = useMemo(() => list
    .filter((p) => filter === 'todas' || (filter === 'otro' ? ['conejo', 'otro'].includes(p.species) : p.species === filter))
    .filter((p) => !term || [p.name, p.ownerName, hcCode(p.id), p.breed ?? ''].some((s) => s.toLowerCase().includes(term))),
  [list, filter, term]);

  const owners = useMemo(() => {
    const map = new Map<string, { name: string; phone: string | null; email: string | null; account: boolean; pets: string[] }>();
    list.forEach((p) => {
      const key = `${p.ownerName}|${p.ownerPhone}`;
      const o = map.get(key) ?? { name: p.ownerName, phone: p.ownerPhone, email: p.ownerEmail, account: p.hasAccount, pets: [] };
      o.pets.push(p.name);
      map.set(key, o);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [list]);

  if (pets.error) return <ErrorBox message={pets.error} onRetry={pets.reload} />;
  if (!pets.data) return <Loading />;

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const selIndex = filtered.findIndex((p) => p.id === selectedId);
  const currentPage = selIndex >= 0 && params.get('pet') ? Math.floor(selIndex / PAGE) + 1 : Math.min(page, pages);
  const shown = filtered.slice((currentPage - 1) * PAGE, currentPage * PAGE);
  const selected = list.find((p) => p.id === selectedId) ?? shown[0] ?? null;

  const replacePet = (saved: ClinicPet) => pets.setData(list.map((p) => (p.id === saved.id ? saved : p)));
  const exportCsv = () => {
    downloadCsv('mascotas.csv', [
      ['Historia', 'Nombre', 'Especie', 'Raza', 'Edad', 'Peso (kg)', 'Propietario', 'Teléfono', 'Última visita', 'Observaciones'],
      ...filtered.map((p) => [hcCode(p.id), p.name, SPECIES_LABEL[p.species], p.breed, p.ageYears, p.weightKg, p.ownerName, p.ownerPhone, p.lastVisit, p.notes]),
    ]);
    toast('Se generó el archivo mascotas.csv.');
  };

  return (
    <>
      <PageHead
        crumb="Inicio / Gestión de información"
        title="Gestión de información"
        actions={
          <>
            <button className="btn btn-outline btn-lg" onClick={exportCsv}><Download className="i" aria-hidden="true" />Exportar</button>
            <button className="btn btn-primary btn-lg" onClick={() => setCreating(true)}><Plus className="i" aria-hidden="true" />Registrar mascota</button>
          </>
        }
      />
      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={tab === 'pets'} onClick={() => setTab('pets')}>Mascotas ({formatNumber(list.length)})</button>
        <button className="tab" role="tab" aria-selected={tab === 'owners'} onClick={() => setTab('owners')}>Propietarios ({formatNumber(owners.length)})</button>
        <button className="tab" role="tab" aria-selected={false} onClick={() => navigate('/citas')}>Citas ({formatNumber(bookings.data?.length ?? 0)})</button>
        <button className="tab" role="tab" aria-selected={false} onClick={() => navigate('/equipo')}>{staffLabel(user)} ({staff.data?.length ?? 0})</button>
      </div>

      {tab === 'pets' ? (
        <div className="gest" role="tabpanel">
          <section className="card card-pad">
            <div className="toolbar">
              <label className="search">
                <span className="sr-only">Buscar mascota</span>
                <Search className="i" aria-hidden="true" />
                <input
                  className="input" type="search" placeholder="Buscar por nombre, propietario o N.° de historia" value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); if (params.toString()) setParams({}, { replace: true }); }}
                />
              </label>
              <div className="actions" role="group" aria-label="Filtrar por especie">
                {FILTERS.map(([v, l]) => (
                  <button key={v} className="chip" aria-pressed={filter === v} onClick={() => { setFilter(v); setPage(1); }}>{l}</button>
                ))}
              </div>
            </div>
            <div className="table-wrap">
              <table className="table clickable">
                <caption className="sr-only">Mascotas registradas</caption>
                <thead><tr><th>Mascota</th><th>Especie / Raza</th><th>Edad</th><th>Propietario</th><th>Última visita</th><th>Estado</th></tr></thead>
                <tbody>
                  {shown.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '28px 8px' }}>No se encontraron mascotas.</td></tr>}
                  {shown.map((p) => {
                    const st = petStatus(p);
                    return (
                      <tr
                        key={p.id} tabIndex={0} className={selected?.id === p.id ? 'is-selected' : undefined}
                        onClick={() => setSelectedId(p.id)} onKeyDown={(e) => e.key === 'Enter' && setSelectedId(p.id)}
                      >
                        <td><div className="pet"><span className={`avatar ${avatarClass(p.id)}`}>{p.name[0]}</span><div><strong>{p.name}</strong><small>{hcCode(p.id)}</small></div></div></td>
                        <td>{petLabel(p.species, p.breed)}</td>
                        <td>{formatAge(p.ageYears)}</td>
                        <td>{p.ownerName}</td>
                        <td className="muted">{p.lastVisit ? formatDateMedium(p.lastVisit) : '—'}</td>
                        <td><span className={`badge ${st.cls}`}>{st.text}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-foot">
              <span>Mostrando {shown.length} de {formatNumber(filtered.length)} mascotas</span>
              {pages > 1 && (
                <nav className="pager" aria-label="Paginación">
                  {Array.from({ length: pages }, (_, i) => (
                    <button key={i} aria-current={currentPage === i + 1 ? 'page' : undefined} onClick={() => { setPage(i + 1); if (params.get('pet')) setParams({}, { replace: true }); }}>{i + 1}</button>
                  ))}
                </nav>
              )}
            </div>
          </section>
          {selected && <PetDetail pet={selected} onSaved={replacePet} />}
        </div>
      ) : (
        <section className="card card-pad" role="tabpanel">
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Propietarios</caption>
              <thead><tr><th>Propietario</th><th>Teléfono</th><th>Correo</th><th>Mascotas</th></tr></thead>
              <tbody>
                {owners.map((o) => (
                  <tr key={`${o.name}${o.phone}`}>
                    <td><div className="pet"><span className="avatar av-b">{initials(o.name)[0]}</span><div><strong>{o.name}</strong><small>{o.account ? 'Cuenta en PetCare' : 'Registrado en la clínica'}</small></div></div></td>
                    <td>{o.phone ? o.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') : '—'}</td>
                    <td className="muted">{o.email ?? '—'}</td>
                    <td>{o.pets.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {creating && (
        <NewPetModal
          onClose={() => setCreating(false)}
          onSaved={(p) => {
            pets.setData([p, ...list]);
            setSelectedId(p.id);
            setFilter('todas');
            setQ('');
            setPage(1);
            setCreating(false);
            toast(`Mascota registrada. Se creó la historia clínica ${hcCode(p.id)}.`);
          }}
        />
      )}
    </>
  );
}
