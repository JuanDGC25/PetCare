import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Check, ChevronRight, Clock, Heart, Info, Plus, Syringe } from 'lucide-react';
import { useAuth } from '../../auth';
import { useClinic } from '../../components/clinic';
import { ErrorBox, Loading, StatusBadge } from '../../components/ui';
import {
  MONTHS, addDays, avatarClass, capitalize, formatDateShort, formatDayTitle, formatNumber, parseDate, petLabel,
  toISODate, todayISO,
} from '../../format';
import { useApi } from '../../hooks';
import type { Booking, ClinicPet } from '../../types';

const ACTIVE = (b: Booking) => b.status !== 'cancelada' && b.status !== 'rechazada';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function MonthCalendar({ month, setMonth, selected, onSelect, busyDays }: {
  month: Date; setMonth: (d: Date) => void; selected: string; onSelect: (d: string) => void; busyDays: Set<string>;
}) {
  const today = todayISO();
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const move = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <section className="card card-pad">
      <div className="cal-head">
        <h2>{capitalize(MONTHS[month.getMonth()])} {month.getFullYear()}</h2>
        <div className="cal-nav">
          <button aria-label="Mes anterior" onClick={() => move(-1)}>‹</button>
          <button aria-label="Mes siguiente" onClick={() => move(1)}>›</button>
        </div>
      </div>
      <div className="cal">
        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((d) => <span key={d} className="dow">{d}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const iso = toISODate(new Date(month.getFullYear(), month.getMonth(), i + 1));
          const cls = iso === today ? 'today' : iso === selected ? 'sel' : busyDays.has(iso) ? 'has' : '';
          return (
            <button
              key={iso} type="button" className={`cal-day ${cls}`} aria-current={iso === today ? 'date' : undefined}
              aria-pressed={iso === selected} aria-label={formatDayTitle(iso)} onClick={() => onSelect(iso)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Panel() {
  const { user } = useAuth();
  const { version, openAppt, openDetail } = useClinic();
  const [selected, setSelected] = useState(todayISO());
  const [month, setMonth] = useState(() => new Date());
  const monthStart = toISODate(new Date(month.getFullYear(), month.getMonth(), 1));
  const from = [monthStart, addDays(todayISO(), -1), toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))].sort()[0];
  const bookings = useApi<Booking[]>(`/bookings?from=${from}`, version);
  const pets = useApi<ClinicPet[]>('/clinic/pets', version);
  const [turn, setTurn] = useState<'todas' | 'manana' | 'tarde'>('todas');

  const today = todayISO();
  const all = bookings.data ?? [];

  const stats = useMemo(() => {
    const todayCount = all.filter((b) => b.date === today && ACTIVE(b)).length;
    const yesterday = all.filter((b) => b.date === addDays(today, -1) && ACTIVE(b)).length;
    const pending = all.filter((b) => b.status === 'pendiente' && b.date >= today).length;
    const monthKey = today.slice(0, 7);
    const monthAttended = all.filter((b) => b.date.startsWith(monthKey) && b.status === 'atendida').length;
    const monthCancelled = all.filter((b) => b.date.startsWith(monthKey) && b.status === 'cancelada').length;
    const attendance = monthAttended + monthCancelled ? Math.round((monthAttended / (monthAttended + monthCancelled)) * 100) : 100;
    const petsMonth = (pets.data ?? []).filter((p) => p.createdAt.slice(0, 7) === monthKey).length;
    const diff = todayCount - yesterday;
    return {
      todayCount, pending, monthAttended, attendance, petsMonth,
      diffText: diff === 0 ? 'Igual que ayer' : `${diff > 0 ? '+' : '−'}${Math.abs(diff)} respecto a ayer`,
    };
  }, [all, pets.data, today]);

  const busyDays = useMemo(() => new Set(all.filter(ACTIVE).map((b) => b.date)), [all]);
  const agenda = all.filter((b) => b.date === selected)
    .filter((b) => turn === 'todas' || (turn === 'manana' ? b.startTime < '12:00' : b.startTime >= '12:00'));
  const isVet = user?.category === 'veterinaria';
  const upcoming = all
    .filter((b) => b.date >= today && (b.status === 'aceptada' || b.status === 'pendiente') && (!isVet || /vacun/i.test(b.service.name)))
    .filter((b) => b.date > today || b.startTime >= new Date().toTimeString().slice(0, 5))
    .slice(0, 3);

  if (bookings.error) return <ErrorBox message={bookings.error} onRetry={bookings.reload} />;
  if (!bookings.data) return <Loading />;

  const monthName = MONTHS[parseDate(today).getMonth()];
  const firstName = user?.name.split(' ')[0];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greeting()}, {firstName}</h1>
          <p>{formatDayTitle(today)} · tienes {stats.todayCount} {stats.todayCount === 1 ? 'cita programada' : 'citas programadas'} para hoy.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => openAppt()}><Plus className="i" aria-hidden="true" />Nueva cita</button>
      </div>

      <section className="stats" aria-label="Resumen del día">
        <article className="card stat stat-hero">
          <div className="stat-top"><span>Citas de hoy</span><span className="stat-icon"><Calendar className="i" aria-hidden="true" /></span></div>
          <p className="stat-value">{stats.todayCount}</p>
          <p className="stat-note">{stats.diffText}</p>
        </article>
        <Link className="card stat" to="/citas" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="stat-top"><span>Por confirmar</span><span className="stat-icon" style={{ background: 'var(--yellow-100)' }}><Clock className="i" aria-hidden="true" /></span></div>
          <p className="stat-value">{stats.pending}</p>
          <p className="stat-note">Requieren respuesta</p>
        </Link>
        <Link className="card stat" to="/gestion" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="stat-top"><span>Mascotas registradas</span><span className="stat-icon" style={{ background: 'var(--err-bg)' }}><Heart className="i" aria-hidden="true" /></span></div>
          <p className="stat-value">{formatNumber(pets.data?.length ?? 0)}</p>
          <p className="stat-note">+{stats.petsMonth} este mes</p>
        </Link>
        <Link className="card stat" to="/reportes" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="stat-top"><span>Atendidas en {monthName}</span><span className="stat-icon" style={{ background: 'var(--green-100)' }}><Check className="i" aria-hidden="true" /></span></div>
          <p className="stat-value">{formatNumber(stats.monthAttended)}</p>
          <p className="stat-note">{stats.attendance} % de asistencia</p>
        </Link>
      </section>

      <div className="dash">
        <section className="card card-pad">
          <div className="card-head">
            <h2>{selected === today ? 'Agenda de hoy' : `Agenda del ${formatDayTitle(selected).toLowerCase()}`}</h2>
            <div className="segmented" role="group" aria-label="Filtrar agenda">
              {([['todas', 'Todas'], ['manana', 'Mañana'], ['tarde', 'Tarde']] as const).map(([v, l]) => (
                <button key={v} aria-pressed={turn === v} onClick={() => setTurn(v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table className="table agenda clickable">
              <caption className="sr-only">Citas programadas. Selecciona una para ver el detalle.</caption>
              <thead className="sr-only"><tr><th>Hora</th><th>Mascota</th><th>Servicio</th><th>Profesional</th><th>Estado</th><th>Ver detalle</th></tr></thead>
              <tbody>
                {agenda.length === 0 && (
                  <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '28px 8px' }}>No hay citas para este día.</td></tr>
                )}
                {agenda.map((b) => (
                  <tr key={b.id} tabIndex={0} onClick={() => openDetail(b)} onKeyDown={(e) => e.key === 'Enter' && openDetail(b)}>
                    <td>{b.startTime}</td>
                    <td>
                      <div className="pet">
                        <span className={`avatar ${avatarClass(b.pet.id)}`}>{b.pet.name[0]}</span>
                        <div><strong>{b.pet.name}</strong><small>{petLabel(b.pet.species, b.pet.breed)} · {b.owner.name}</small></div>
                      </div>
                    </td>
                    <td>{b.service.name}{b.urgent && <> <span className="badge b-err">Urgente</span></>}</td>
                    <td className="muted">{b.staff?.name ?? 'Por asignar'}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className="go"><ChevronRight className="i" aria-hidden="true" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint"><Info className="i" aria-hidden="true" />Selecciona una cita para ver el detalle, confirmarla, marcarla como atendida o cancelarla.</p>
        </section>

        <div className="side-stack">
          <MonthCalendar month={month} setMonth={setMonth} selected={selected} onSelect={setSelected} busyDays={busyDays} />
          <section className="card card-pad">
            <h2 style={{ marginBottom: 8 }}>{isVet ? 'Próximas vacunas' : 'Próximas citas'}</h2>
            {upcoming.length === 0 && <p className="muted">No hay {isVet ? 'vacunas' : 'citas'} programadas.</p>}
            {upcoming.map((b) => (
              <div key={b.id} className="vac" role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => openDetail(b)}>
                <span className="ic">{isVet ? <Syringe className="i" aria-hidden="true" /> : <Calendar className="i" aria-hidden="true" />}</span>
                <div>
                  <strong>{b.pet.name} · {isVet ? (b.providerNotes?.split('·')[0].trim() || b.service.name) : b.service.name}</strong>
                  <small>{b.owner.name}</small>
                </div>
                <time>{formatDateShort(b.date)}</time>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
