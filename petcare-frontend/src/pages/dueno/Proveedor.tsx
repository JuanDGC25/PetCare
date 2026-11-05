import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ChevronLeft, CircleCheck, Clock, Info, MapPin, Phone, Plus } from 'lucide-react';
import { api, qs } from '../../api';
import PetFormModal from '../../components/PetFormModal';
import { ErrorBox, Loading, StatusBadge, useToast } from '../../components/ui';
import {
  CATEGORY_LABEL, SPECIES_LABEL, WEEKDAYS, WEEKDAYS_SHORT, avatarClass, dateParts, formatDateLong, formatDuration,
  formatMoney, formatTime, petLabel, toISODate,
} from '../../format';
import { useApi } from '../../hooks';
import type { Booking, Pet, ProviderDetail, Service } from '../../types';
import { CATEGORY_BG, CATEGORY_ICON } from './Buscar';

export default function Proveedor() {
  const { id } = useParams();
  const toast = useToast();
  const provider = useApi<ProviderDetail>(`/providers/${id}`);
  const pets = useApi<Pet[]>('/pets');
  const [step, setStep] = useState(1);
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [petId, setPetId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);
  const [addPet, setAddPet] = useState(false);
  const slots = useApi<{ slots: string[] }>(service && date ? `/providers/${id}/slots${qs({ serviceId: service.id, date })}` : null);

  const openDays = useMemo(() => new Set(provider.data?.availability.map((a) => a.weekday) ?? []), [provider.data]);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return toISODate(d);
  }), []);

  if (provider.error) return <ErrorBox message={provider.error} onRetry={provider.reload} />;
  if (!provider.data) return <Loading />;
  const p = provider.data;
  const Icon = CATEGORY_ICON[p.category];
  const pet = pets.data?.find((x) => x.id === petId) ?? null;
  const fits = (pt: Pet) => !service || service.species.includes(pt.species);

  function choose(s: Service) {
    setService(s);
    setTime(null);
    setStep(1);
    if (window.innerWidth < 1280) document.getElementById('reserva')?.scrollIntoView({ behavior: 'smooth' });
  }
  function next() {
    if (step === 1 && !time) return toast('Elige un horario disponible.', 'info');
    if (step === 2 && !petId) return toast('Elige una mascota para continuar.', 'info');
    setStep(step + 1);
  }
  async function confirm() {
    if (!service || !date || !time || !petId) return;
    setBusy(true);
    try {
      setDone(await api<Booking>('/bookings', 'POST', { serviceId: service.id, petId, date, startTime: time, notes }));
    } catch (err) {
      toast((err as Error).message, 'info');
      if ((err as { status?: number }).status === 409) { setTime(null); setStep(1); slots.reload(); }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="done-wrap">
        <div className="done-ic"><CircleCheck className="i" aria-hidden="true" /></div>
        <h1>¡Solicitud enviada!</h1>
        <p className="lead">{p.businessName} recibió tu solicitud. Te avisaremos cuando la confirme; puedes seguir el estado en «Mis citas».</p>
        <div className="card card-pad">
          <dl className="summary">
            <div><dt>Estado</dt><dd><StatusBadge status={done.status} /></dd></div>
            <div><dt>Servicio</dt><dd>{done.service.name}</dd></div>
            <div><dt>Mascota</dt><dd>{done.pet.name}</dd></div>
            <div><dt>Fecha</dt><dd>{formatDateLong(done.date)}</dd></div>
            <div><dt>Hora</dt><dd>{formatTime(done.startTime)}</dd></div>
            <div className="total"><dt>Total a pagar en el lugar</dt><dd>{formatMoney(done.price)}</dd></div>
          </dl>
        </div>
        <div className="done-actions">
          <Link className="btn btn-primary btn-lg" to="/mis-citas">Ver mis citas</Link>
          <Link className="btn btn-outline btn-lg" to="/buscar">Seguir buscando</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Link className="back" to="/buscar" aria-label="Volver a la búsqueda"><ChevronLeft className="i" aria-hidden="true" /></Link>
      <div className="two-col">
        <div className="side-stack">
          <section className="card card-pad">
            <div className="prov-head">
              <span className="logo-box" style={{ background: CATEGORY_BG[p.category] }}><Icon className="i" style={{ width: 36, height: 36 }} aria-hidden="true" /></span>
              <div>
                <h1>{p.businessName}</h1>
                <div className="meta">
                  <span className="tag">{CATEGORY_LABEL[p.category]}</span>
                  <span><MapPin className="i i-sm" aria-hidden="true" />{p.neighborhood}, {p.locality}</span>
                </div>
              </div>
            </div>
            {p.description && <p style={{ margin: '18px 0 14px', color: 'var(--ink-700)' }}>{p.description}</p>}
            <div className="info-list">
              {p.address && <div><MapPin className="i" aria-hidden="true" />{p.address}</div>}
              {p.phone && <div><Phone className="i" aria-hidden="true" />{p.phone}</div>}
            </div>
          </section>

          <section className="card card-pad">
            <div className="card-head"><h2>Servicios y precios</h2></div>
            {p.services.map((s) => (
              <div key={s.id} className="svc-item">
                <div>
                  <h3>{s.name}</h3>
                  {s.description && <p>{s.description}</p>}
                  <span className="d"><Clock className="i i-sm" aria-hidden="true" />{formatDuration(s.durationMin)} · {s.species.map((x) => SPECIES_LABEL[x]).join(', ')}</span>
                </div>
                <span className="p">{formatMoney(s.price)}</span>
                <button className={`btn btn-sm ${service?.id === s.id ? 'btn-primary' : 'btn-outline'}`} aria-pressed={service?.id === s.id} onClick={() => choose(s)}>
                  {service?.id === s.id ? <><Check className="i i-sm" aria-hidden="true" />Elegido</> : 'Elegir'}
                </button>
              </div>
            ))}
          </section>

          <section className="card card-pad">
            <div className="card-head"><h2>Horario de atención</h2></div>
            <dl className="summary">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const blocks = p.availability.filter((a) => a.weekday === d);
                return (
                  <div key={d}>
                    <dt>{WEEKDAYS[d]}</dt>
                    <dd style={blocks.length ? undefined : { color: 'var(--ink-500)', fontWeight: 600 }}>
                      {blocks.length ? blocks.map((b) => `${formatTime(b.startTime)} – ${formatTime(b.endTime)}`).join(' · ') : 'Cerrado'}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        </div>

        <aside className="card card-pad sticky" id="reserva" aria-label="Reservar">
          <h2 style={{ marginBottom: 18 }}>Reservar</h2>
          <ol className="stepper">
            {['Horario', 'Mascota', 'Confirmar'].map((l, i) => (
              <li key={l} className={step === i + 1 ? 'current' : step > i + 1 ? 'done' : ''}><span><span className="n">{i + 1}</span>{l}</span></li>
            ))}
          </ol>

          {step === 1 && (
            <div className="form">
              {!service ? (
                <div className="notice"><Info className="i" aria-hidden="true" /><span>Elige un servicio de la lista para ver los horarios disponibles.</span></div>
              ) : (
                <>
                  <dl className="summary"><div><dt>{service.name}</dt><dd>{formatMoney(service.price)}</dd></div></dl>
                  <div>
                    <span className="label">Día</span>
                    <div className="week-pick" style={{ marginTop: 10 }}>
                      {days.map((d) => {
                        const wd = new Date(`${d}T12:00`).getDay();
                        return (
                          <button key={d} className="wday" aria-pressed={date === d} disabled={!openDays.has(wd)} aria-label={formatDateLong(d)} onClick={() => { setDate(d); setTime(null); }}>
                            <small>{WEEKDAYS_SHORT[wd]}</small><b>{dateParts(d).day}</b>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {date && (
                    <div>
                      <span className="label">Hora disponible · {formatDateLong(date)}</span>
                      <div className="slots" style={{ marginTop: 10 }}>
                        {slots.loading ? <Loading text="Consultando horarios…" />
                          : !slots.data?.slots.length ? <p className="muted">No quedan horarios este día. Prueba con otra fecha.</p>
                            : slots.data.slots.map((t) => <button key={t} className="slot" aria-pressed={time === t} onClick={() => setTime(t)}>{formatTime(t)}</button>)}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="step-foot"><span /><button className="btn btn-primary" onClick={next} disabled={!service}>Continuar</button></div>
            </div>
          )}

          {step === 2 && (
            <div className="form">
              <span className="label">¿Para cuál mascota?</span>
              <div className="choices">
                {pets.data?.map((pt) => (
                  <label key={pt.id} className="choice" style={fits(pt) ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}>
                    <input type="radio" name="pet" checked={petId === pt.id} disabled={!fits(pt)} onChange={() => setPetId(pt.id)} />
                    <span className={`avatar ${avatarClass(pt.id)}`}>{pt.name[0]}</span>
                    <span><strong>{pt.name}</strong><small>{petLabel(pt.species, pt.breed)}{!fits(pt) && ' · este servicio no atiende esta especie'}</small></span>
                    <span className="tick"><Check className="i i-sm" aria-hidden="true" /></span>
                  </label>
                ))}
                <button type="button" className="add-choice" onClick={() => setAddPet(true)}><Plus className="i i-sm" aria-hidden="true" />Registrar otra mascota</button>
              </div>
              <div className="field">
                <label className="label" htmlFor="r-notes">Observaciones para el proveedor (opcional)</label>
                <textarea className="textarea" id="r-notes" placeholder="Ej.: es nervioso con otros perros" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="step-foot">
                <button className="btn btn-outline" onClick={() => setStep(1)}>Atrás</button>
                <button className="btn btn-primary" onClick={next}>Continuar</button>
              </div>
            </div>
          )}

          {step === 3 && service && date && time && pet && (
            <div className="form">
              <dl className="summary">
                <div><dt>Proveedor</dt><dd>{p.businessName}</dd></div>
                <div><dt>Servicio</dt><dd>{service.name}</dd></div>
                <div><dt>Mascota</dt><dd>{pet.name}</dd></div>
                <div><dt>Fecha</dt><dd>{formatDateLong(date)}</dd></div>
                <div><dt>Hora</dt><dd>{formatTime(time)}</dd></div>
                <div><dt>Duración</dt><dd>{formatDuration(service.durationMin)}</dd></div>
                <div className="total"><dt>Total</dt><dd>{formatMoney(service.price)}</dd></div>
              </dl>
              <div className="notice"><Info className="i" aria-hidden="true" /><span>El pago se hace en el lugar. La cita queda pendiente hasta que el proveedor la confirme.</span></div>
              <div className="step-foot">
                <button className="btn btn-outline" onClick={() => setStep(2)}>Atrás</button>
                <button className={`btn btn-primary ${busy ? 'is-loading' : ''}`} disabled={busy} onClick={confirm}>Solicitar reserva</button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {addPet && (
        <PetFormModal
          onClose={() => setAddPet(false)}
          onSaved={(pt) => {
            pets.setData([...(pets.data ?? []), pt]);
            if (fits(pt)) setPetId(pt.id);
            setAddPet(false);
            toast('Mascota registrada.');
          }}
        />
      )}
    </>
  );
}
