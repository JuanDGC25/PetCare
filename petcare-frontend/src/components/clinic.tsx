import { createContext, useCallback, useContext, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleX, Siren, TriangleExclamationPoint } from 'lucide-react';
import { api, ApiError } from '../api';
import {
  avatarClass, formatDateLong, formatTime, petLabel, todayISO,
} from '../format';
import { useApi } from '../hooks';
import type { Booking, ClinicPet, Service, Staff } from '../types';
import { Field, FormAlert, Modal, StatusBadge, useToast } from './ui';

interface ClinicState {
  version: number;
  refresh: () => void;
  openAppt: (petId?: number) => void;
  openUrgent: () => void;
  openDetail: (b: Booking) => void;
}
const ClinicContext = createContext<ClinicState | null>(null);
export const useClinicOptional = () => useContext(ClinicContext);
export const useClinic = () => {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error('useClinic debe usarse dentro de <ClinicProvider>');
  return ctx;
};

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [appt, setAppt] = useState<{ petId?: number } | null>(null);
  const [urgent, setUrgent] = useState(false);
  const [detail, setDetail] = useState<Booking | null>(null);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo<ClinicState>(() => ({
    version,
    refresh,
    openAppt: (petId) => setAppt({ petId }),
    openUrgent: () => setUrgent(true),
    openDetail: setDetail,
  }), [version, refresh]);

  return (
    <ClinicContext.Provider value={value}>
      {children}
      {appt && <ApptModal petId={appt.petId} onClose={() => setAppt(null)} onDone={refresh} />}
      {urgent && <UrgentModal onClose={() => setUrgent(false)} onDone={refresh} />}
      {detail && <DetailModal booking={detail} onClose={() => setDetail(null)} onDone={refresh} />}
    </ClinicContext.Provider>
  );
}

function ApptModal({ petId, onClose, onDone }: { petId?: number; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const pets = useApi<ClinicPet[]>('/clinic/pets');
  const services = useApi<Service[]>('/my/services');
  const staff = useApi<Staff[]>('/clinic/staff');
  const [f, setF] = useState({
    petId: petId ? String(petId) : '', serviceId: '', date: todayISO(), time: '', staffId: '', notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setErrors({ ...errors, [k]: '' }); };

  const petList = pets.data ?? [];
  const svcList = (services.data ?? []).filter((s) => s.active);
  const staffList = (staff.data ?? []).filter((s) => s.active);
  const petValue = f.petId || (petList[0] ? String(petList[0].id) : '');
  const svcValue = f.serviceId || (svcList[0] ? String(svcList[0].id) : '');
  const staffValue = f.staffId || (staffList[0] ? String(staffList[0].id) : '');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.date) errs.date = 'Elige una fecha.';
    if (!f.time) errs.time = 'Elige una hora.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setAlert(null);
    try {
      await api('/clinic/bookings', 'POST', {
        petId: Number(petValue), serviceId: Number(svcValue), staffId: Number(staffValue) || null,
        date: f.date, startTime: f.time, notes: f.notes,
      });
      toast('Cita agendada y confirmada.');
      onDone();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.details?.startTime) setErrors({ time: err.details.startTime });
      else setAlert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Nueva cita"
      subtitle="La cita queda confirmada y aparece en la agenda del día."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className={`btn btn-primary ${busy ? 'is-loading' : ''}`} type="submit" form="appt-form" disabled={busy}>Agendar cita</button>
        </>
      }
    >
      <form className="form" id="appt-form" onSubmit={onSubmit} noValidate>
        <FormAlert message={alert} />
        <div className="row-2">
          <div className="field">
            <label className="label" htmlFor="na-pet">Mascota *</label>
            <select className="input select" id="na-pet" value={petValue} onChange={(e) => set('petId', e.target.value)}>
              {petList.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ownerName}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="na-svc">Servicio *</label>
            <select className="input select" id="na-svc" value={svcValue} onChange={(e) => set('serviceId', e.target.value)}>
              {svcList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="row-2">
          <Field id="na-date" label="Fecha *" error={errors.date}>
            <input className="input" id="na-date" type="date" min={todayISO()} value={f.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field id="na-time" label="Hora *" error={errors.time}>
            <input className="input" id="na-time" type="time" value={f.time} onChange={(e) => set('time', e.target.value)} />
          </Field>
        </div>
        <div className="field">
          <label className="label" htmlFor="na-vet">Profesional *</label>
          <select className="input select" id="na-vet" value={staffValue} onChange={(e) => set('staffId', e.target.value)}>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="na-o">Motivo u observaciones</label>
          <textarea className="textarea" id="na-o" placeholder="Ej.: control anual, revisar oído izquierdo" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}

function UrgentModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ petName: '', species: 'perro', ownerContact: '', symptoms: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setErrors({ ...errors, [k]: '' }); };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.petName.trim().length < 2) errs.petName = 'Escribe el nombre.';
    if (f.ownerContact.trim().length < 5) errs.ownerContact = 'Escribe el contacto.';
    if (f.symptoms.trim().length < 5) errs.symptoms = 'Describe los síntomas.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setAlert(null);
    try {
      const b = await api<Booking>('/clinic/urgent', 'POST', f);
      const when = b.date === todayISO() ? `hoy a las ${formatTime(b.startTime)}` : `el ${formatDateLong(b.date)} a las ${formatTime(b.startTime)}`;
      toast(`Cita urgente registrada ${when}. Se notificó a ${b.staff?.name ?? 'el profesional de turno'} (de turno).`);
      onDone();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      else setAlert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      icon={<Siren className="i" aria-hidden="true" />}
      iconTone="danger"
      title="Cita urgente"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className={`btn btn-danger ${busy ? 'is-loading' : ''}`} type="submit" form="urgent-form" disabled={busy}>Registrar urgencia</button>
        </>
      }
    >
      <form className="form" id="urgent-form" onSubmit={onSubmit} noValidate>
        <div className="notice"><TriangleExclamationPoint className="i" aria-hidden="true" /><span>La cita se ubica en el primer espacio libre y se notifica al veterinario de turno.</span></div>
        <FormAlert message={alert} />
        <div className="row-2">
          <Field id="u-n" label="Nombre de la mascota *" error={errors.petName}>
            <input className="input" id="u-n" type="text" placeholder="Ej.: Bruno" value={f.petName} onChange={(e) => set('petName', e.target.value)} />
          </Field>
          <div className="field">
            <label className="label" htmlFor="u-e">Especie *</label>
            <select className="input select" id="u-e" value={f.species} onChange={(e) => set('species', e.target.value)}>
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
              <option value="conejo">Conejo</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>
        <Field id="u-p" label="Propietario y teléfono *" error={errors.ownerContact}>
          <input className="input" id="u-p" type="text" placeholder="Ej.: Felipe Castro · 300 123 4567" value={f.ownerContact} onChange={(e) => set('ownerContact', e.target.value)} />
        </Field>
        <Field id="u-m" label="Síntomas *" error={errors.symptoms}>
          <textarea className="textarea" id="u-m" placeholder="Describe brevemente qué le pasa a la mascota" value={f.symptoms} onChange={(e) => set('symptoms', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

function DetailModal({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const staff = useApi<Staff[]>(booking.status === 'pendiente' ? '/clinic/staff' : null);
  const [staffId, setStaffId] = useState('');
  const [confirmCancel, setConfirmCancel] = useState<'cancelada' | 'rechazada' | null>(null);
  const [busy, setBusy] = useState(false);
  const b = booking;

  async function change(status: string, message: string) {
    setBusy(true);
    try {
      const firstStaff = staff.data?.find((s) => s.active)?.id;
      await api(`/bookings/${b.id}/status`, 'PATCH', {
        status, staffId: status === 'aceptada' ? Number(staffId) || firstStaff || null : undefined,
      });
      toast(message, status === 'cancelada' || status === 'rechazada' ? 'circle-x' : 'check');
      onDone();
      onClose();
    } catch (err) {
      toast((err as Error).message, 'info');
    } finally {
      setBusy(false);
    }
  }

  if (confirmCancel) {
    const isReject = confirmCancel === 'rechazada';
    return (
      <Modal
        size="sm"
        icon={<CircleX className="i" aria-hidden="true" />}
        iconTone="danger"
        title={isReject ? '¿Rechazar esta solicitud?' : '¿Cancelar esta cita?'}
        onClose={() => setConfirmCancel(null)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setConfirmCancel(null)}>Volver</button>
            <button
              type="button" className="btn btn-danger" disabled={busy}
              onClick={() => change(confirmCancel, isReject ? 'Solicitud rechazada. Se notificó al propietario.' : 'La cita fue cancelada y se notificó al propietario.')}
            >
              {isReject ? 'Sí, rechazar' : 'Sí, cancelar cita'}
            </button>
          </>
        }
      >
        <p className="muted">Se avisará al propietario y el horario quedará libre para otras reservas.</p>
      </Modal>
    );
  }

  return (
    <Modal
      size="sm"
      title="Detalle de la cita"
      onClose={onClose}
      footer={
        <>
          {b.status === 'pendiente' && (
            <>
              <button type="button" className="btn btn-ghost-danger" onClick={() => setConfirmCancel('rechazada')}>Rechazar</button>
              <button type="button" className="btn btn-outline" onClick={() => { onClose(); navigate(`/gestion?pet=${b.pet.id}`); }}>Ver historia clínica</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => change('aceptada', 'Cita confirmada. El propietario ya ve el estado «Confirmada».')}>Confirmar cita</button>
            </>
          )}
          {b.status === 'aceptada' && (
            <>
              <button type="button" className="btn btn-ghost-danger" onClick={() => setConfirmCancel('cancelada')}>Cancelar cita</button>
              <button type="button" className="btn btn-outline" onClick={() => { onClose(); navigate(`/gestion?pet=${b.pet.id}`); }}>Ver historia clínica</button>
              {b.date <= todayISO() && (
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => change('atendida', 'Cita marcada como atendida.')}>Marcar como atendida</button>
              )}
            </>
          )}
          {!['pendiente', 'aceptada'].includes(b.status) && (
            <button type="button" className="btn btn-outline" onClick={() => { onClose(); navigate(`/gestion?pet=${b.pet.id}`); }}>Ver historia clínica</button>
          )}
        </>
      }
    >
      <div className="pet">
        <span className={`avatar ${avatarClass(b.pet.id)}`}>{b.pet.name[0]}</span>
        <div><strong>{b.pet.name}</strong><small>{petLabel(b.pet.species, b.pet.breed)} · {b.owner.name}</small></div>
      </div>
      <dl className="summary">
        <div><dt>Fecha</dt><dd>{formatDateLong(b.date)}</dd></div>
        <div><dt>Hora</dt><dd>{b.startTime}</dd></div>
        <div><dt>Servicio</dt><dd>{b.service.name}</dd></div>
        <div><dt>Profesional</dt><dd>{b.staff?.name ?? '—'}</dd></div>
        <div><dt>Teléfono</dt><dd>{b.owner.phone ?? '—'}</dd></div>
        <div><dt>Estado</dt><dd><StatusBadge status={b.status} /></dd></div>
      </dl>
      {(b.ownerNotes || b.providerNotes) && (
        <div className="hist">
          {b.ownerNotes && <div><span>{b.urgent ? 'Síntomas' : 'Nota del propietario'}</span><time>{b.ownerNotes}</time></div>}
          {b.providerNotes && <div><span>Nota de la clínica</span><time>{b.providerNotes}</time></div>}
        </div>
      )}
      {b.status === 'pendiente' && (
        <div className="field">
          <label className="label" htmlFor="ad-staff">Asignar profesional</label>
          <select className="input select" id="ad-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            {(staff.data ?? []).filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
    </Modal>
  );
}
