import { useEffect, useState, type FormEvent } from 'react';
import { Clock, Pause, Pencil, Play, Plus } from 'lucide-react';
import { api, ApiError } from '../../api';
import { useAuth } from '../../auth';
import { ErrorBox, Field, FormAlert, Loading, Modal, PageHead, useToast } from '../../components/ui';
import { CATEGORY_LABEL, SPECIES_LABEL, WEEKDAYS, formatDuration, formatMoney } from '../../format';
import { useApi } from '../../hooks';
import type { AvailabilityBlock, Category, Meta, ProviderProfile, Service, Species } from '../../types';

function Business() {
  const { refresh } = useAuth();
  const toast = useToast();
  const meta = useApi<Meta>('/providers/meta');
  const profile = useApi<ProviderProfile>('/my/provider');
  const [f, setF] = useState<ProviderProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (profile.data) setF(profile.data); }, [profile.data]);
  if (profile.error) return <ErrorBox message={profile.error} onRetry={profile.reload} />;
  if (!f) return <Loading />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      setF(await api<ProviderProfile>('/my/provider', 'PUT', f));
      await refresh();
      toast('Datos del negocio guardados.');
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      toast((err as Error).message, 'info');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-pad">
      <div className="card-head"><h2>Datos del negocio</h2></div>
      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="row-2">
          <Field id="b-n" label="Nombre del negocio" error={errors.businessName}>
            <input className="input" id="b-n" value={f!.businessName} onChange={(e) => setF({ ...f!, businessName: e.target.value })} />
          </Field>
          <div className="field">
            <label className="label" htmlFor="b-c">Categoría</label>
            <select className="input select" id="b-c" value={f!.category} onChange={(e) => setF({ ...f!, category: e.target.value as Category })}>
              {meta.data?.categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>
        </div>
        <div className="row-2">
          <div className="field">
            <label className="label" htmlFor="b-l">Localidad</label>
            <select className="input select" id="b-l" value={f!.locality} onChange={(e) => setF({ ...f!, locality: e.target.value })}>
              {meta.data?.localities.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <Field id="b-b" label="Barrio" error={errors.neighborhood}>
            <input className="input" id="b-b" value={f!.neighborhood} onChange={(e) => setF({ ...f!, neighborhood: e.target.value })} />
          </Field>
        </div>
        <Field id="b-d" label="Dirección">
          <input className="input" id="b-d" value={f!.address ?? ''} onChange={(e) => setF({ ...f!, address: e.target.value })} />
        </Field>
        <Field id="b-desc" label="Descripción (la ven los dueños al buscar)">
          <textarea className="textarea" id="b-desc" value={f!.description ?? ''} onChange={(e) => setF({ ...f!, description: e.target.value })} />
        </Field>
        <div><button className={`btn btn-primary ${busy ? 'is-loading' : ''}`} disabled={busy}>Guardar cambios</button></div>
      </form>
    </section>
  );
}

const ORDER = [1, 2, 3, 4, 5, 6, 0];
interface DayRow { on: boolean; start: string; end: string }

function Schedule() {
  const toast = useToast();
  const initial = useApi<AvailabilityBlock[]>('/my/availability');
  const [rows, setRows] = useState<Record<number, DayRow> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initial.data) return;
    const r: Record<number, DayRow> = {};
    ORDER.forEach((d) => {
      const blocks = initial.data!.filter((b) => b.weekday === d);
      r[d] = blocks.length
        ? { on: true, start: blocks[0].startTime, end: blocks[blocks.length - 1].endTime }
        : { on: false, start: '08:00', end: '17:00' };
    });
    setRows(r);
  }, [initial.data]);

  if (initial.error) return <ErrorBox message={initial.error} onRetry={initial.reload} />;
  if (!rows) return <Loading />;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = ORDER.filter((d) => rows![d].on).map((d) => ({ weekday: d, startTime: rows![d].start, endTime: rows![d].end }));
      await api('/my/availability', 'PUT', body);
      toast('Horario de atención guardado.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-pad">
      <div className="card-head">
        <div><h2>Horario de atención</h2><p className="muted" style={{ marginTop: 4 }}>Los dueños solo pueden reservar dentro de este horario.</p></div>
        <button className={`btn btn-primary ${busy ? 'is-loading' : ''}`} onClick={save} disabled={busy}>Guardar horario</button>
      </div>
      <FormAlert message={error} />
      <div className="week">
        {ORDER.map((d) => {
          const r = rows[d];
          const set = (patch: Partial<DayRow>) => setRows({ ...rows, [d]: { ...r, ...patch } });
          return (
            <div key={d} className={`week-row ${r.on ? '' : 'off'}`}>
              <label className="switch">
                <input type="checkbox" checked={r.on} onChange={(e) => set({ on: e.target.checked })} />
                <span className="tr" />{WEEKDAYS[d]}
              </label>
              <input className="input" type="time" aria-label={`${WEEKDAYS[d]}: abre`} value={r.start} onChange={(e) => set({ start: e.target.value })} />
              <input className="input" type="time" aria-label={`${WEEKDAYS[d]}: cierra`} value={r.end} onChange={(e) => set({ end: e.target.value })} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ServiceModal({ service, onClose, onSaved }: { service: Service | null; onClose: () => void; onSaved: (s: Service) => void }) {
  const [f, setF] = useState({
    name: service?.name ?? '', description: service?.description ?? '', price: service ? String(service.price) : '',
    durationMin: service ? String(service.durationMin) : '30', species: service?.species ?? (['perro', 'gato'] as Species[]),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toggle = (s: Species) => setF({ ...f, species: f.species.includes(s) ? f.species.filter((x) => x !== s) : [...f.species, s] });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.name.trim().length < 3) errs.name = 'Escribe el nombre del servicio.';
    if (!Number.isInteger(Number(f.price)) || Number(f.price) < 0 || f.price === '') errs.price = 'Escribe el precio en pesos, sin puntos.';
    const dur = Number(f.durationMin);
    if (!Number.isInteger(dur) || dur < 15 || dur > 600) errs.durationMin = 'Entre 15 y 600 minutos.';
    if (!f.species.length) errs.species = 'Elige al menos una especie.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const body = { ...f, price: Number(f.price), durationMin: dur, active: service?.active ?? true };
      onSaved(service ? await api<Service>(`/my/services/${service.id}`, 'PUT', body) : await api<Service>('/my/services', 'POST', body));
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setAlert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={service ? 'Editar servicio' : 'Nuevo servicio'}
      subtitle="Los dueños ven el precio y la duración antes de reservar."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className={`btn btn-primary ${busy ? 'is-loading' : ''}`} type="submit" form="svc-form" disabled={busy}>Guardar servicio</button>
        </>
      }
    >
      <form className="form" id="svc-form" onSubmit={onSubmit} noValidate>
        <FormAlert message={alert} />
        <Field id="s-n" label="Nombre *" error={errors.name}>
          <input className="input" id="s-n" placeholder="Ej.: Consulta general" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <div className="row-2">
          <Field id="s-p" label="Precio (COP) *" error={errors.price}>
            <input className="input" id="s-p" type="number" min={0} step={1000} placeholder="45000" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          </Field>
          <Field id="s-d" label="Duración (minutos) *" error={errors.durationMin}>
            <input className="input" id="s-d" type="number" min={15} max={600} step={15} value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value })} />
          </Field>
        </div>
        <div className={`field ${errors.species ? 'has-error' : ''}`}>
          <span className="label">Especies que atiende *</span>
          <div className="checks">
            {(['perro', 'gato', 'conejo', 'otro'] as Species[]).map((s) => (
              <label key={s} className="check"><input type="checkbox" checked={f.species.includes(s)} onChange={() => toggle(s)} /> {SPECIES_LABEL[s]}</label>
            ))}
          </div>
          <span className="field-error">{errors.species}</span>
        </div>
        <div className="field">
          <label className="label" htmlFor="s-desc">Descripción</label>
          <textarea className="textarea" id="s-desc" placeholder="Qué incluye el servicio" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
}

function Services() {
  const toast = useToast();
  const services = useApi<Service[]>('/my/services');
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  if (services.error) return <ErrorBox message={services.error} onRetry={services.reload} />;
  if (!services.data) return <Loading />;
  const list = services.data;

  async function toggle(s: Service) {
    try {
      const saved = await api<Service>(`/my/services/${s.id}`, 'PUT', { ...s, active: !s.active });
      services.setData(list.map((x) => (x.id === s.id ? saved : x)));
      toast(saved.active ? 'Servicio activado: ya aparece en la búsqueda.' : 'Servicio pausado: ya no aparece en la búsqueda.');
    } catch (err) {
      toast((err as Error).message, 'info');
    }
  }

  return (
    <section className="card card-pad">
      <div className="card-head">
        <div><h2>Servicios y precios</h2><p className="muted" style={{ marginTop: 4 }}>Los servicios activos aparecen en la búsqueda de los dueños.</p></div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}><Plus className="i" aria-hidden="true" />Nuevo servicio</button>
      </div>
      <div>
        {list.map((s) => (
          <div key={s.id} className="svc-item" style={s.active ? undefined : { opacity: 0.55 }}>
            <div>
              <h3>{s.name} {!s.active && <span className="badge b-cancel">Pausado</span>}</h3>
              <p>{s.description}</p>
              <span className="d"><Clock className="i i-sm" aria-hidden="true" />{formatDuration(s.durationMin)} · {s.species.map((x) => SPECIES_LABEL[x]).join(', ')}</span>
            </div>
            <span className="p">{formatMoney(s.price)}</span>
            <div className="actions">
              <button className="icon-btn" aria-label={`Editar ${s.name}`} onClick={() => setEditing(s)}><Pencil className="i" aria-hidden="true" /></button>
              <button className="icon-btn" aria-label={s.active ? `Pausar ${s.name}` : `Activar ${s.name}`} onClick={() => toggle(s)}>
                {s.active ? <Pause className="i" aria-hidden="true" /> : <Play className="i" aria-hidden="true" />}
              </button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <ServiceModal
          service={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            services.setData(editing === 'new' ? [...list, saved] : list.map((x) => (x.id === saved.id ? saved : x)));
            toast(editing === 'new' ? 'Servicio creado: ya aparece en la búsqueda.' : 'Cambios guardados.');
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

export default function Configuracion() {
  return (
    <>
      <PageHead crumb="Inicio / Configuración" title="Configuración" />
      <div className="settings">
        <Business />
        <Schedule />
        <Services />
      </div>
    </>
  );
}
