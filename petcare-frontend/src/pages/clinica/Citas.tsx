import { useState } from 'react';
import { ChevronRight, Info, Plus, Search } from 'lucide-react';
import { useClinic } from '../../components/clinic';
import { ErrorBox, Loading, PageHead, StatusBadge } from '../../components/ui';
import { avatarClass, formatDateMedium, petLabel, todayISO } from '../../format';
import { useApi } from '../../hooks';
import type { Booking } from '../../types';

const TABS = [
  { key: 'pendientes', label: 'Por confirmar', match: (b: Booking, t: string) => b.status === 'pendiente' && b.date >= t },
  { key: 'proximas', label: 'Próximas', match: (b: Booking, t: string) => b.status === 'aceptada' && b.date >= t },
  { key: 'historial', label: 'Historial', match: (b: Booking, t: string) => b.date < t || ['atendida', 'cancelada', 'rechazada'].includes(b.status) },
];
const PAGE = 10;

export default function Citas() {
  const { version, openAppt, openDetail } = useClinic();
  const bookings = useApi<Booking[]>('/bookings', version);
  const [tab, setTab] = useState('pendientes');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const today = todayISO();

  if (bookings.error) return <ErrorBox message={bookings.error} onRetry={bookings.reload} />;
  if (!bookings.data) return <Loading />;

  const all = bookings.data;
  const current = TABS.find((t) => t.key === tab)!;
  const term = q.trim().toLowerCase();
  let list = all.filter((b) => current.match(b, today))
    .filter((b) => !term || [b.pet.name, b.owner.name, b.service.name, b.staff?.name ?? ''].some((s) => s.toLowerCase().includes(term)));
  if (tab === 'historial') list = [...list].reverse();
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const shown = list.slice((page - 1) * PAGE, page * PAGE);

  return (
    <>
      <PageHead
        crumb="Inicio / Citas"
        title="Citas"
        actions={<button className="btn btn-primary btn-lg" onClick={() => openAppt()}><Plus className="i" aria-hidden="true" />Nueva cita</button>}
      />
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} className="tab" role="tab" aria-selected={tab === t.key} onClick={() => { setTab(t.key); setPage(1); }}>
            {t.label} ({all.filter((b) => t.match(b, today)).length})
          </button>
        ))}
      </div>
      <section className="card card-pad">
        <div className="toolbar">
          <label className="search">
            <span className="sr-only">Buscar cita</span>
            <Search className="i" aria-hidden="true" />
            <input className="input" type="search" placeholder="Buscar por mascota, propietario, servicio o profesional" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </label>
        </div>
        <div className="table-wrap">
          <table className="table agenda clickable">
            <thead><tr><th>Fecha</th><th>Hora</th><th>Mascota</th><th>Servicio</th><th>Profesional</th><th>Estado</th><th><span className="sr-only">Ver</span></th></tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: '28px 8px' }}>No hay citas en esta lista.</td></tr>}
              {shown.map((b) => (
                <tr key={b.id} tabIndex={0} onClick={() => openDetail(b)} onKeyDown={(e) => e.key === 'Enter' && openDetail(b)}>
                  <td>{formatDateMedium(b.date)}</td>
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
        <div className="table-foot">
          <span>Mostrando {shown.length} de {list.length} citas</span>
          {pages > 1 && (
            <nav className="pager" aria-label="Paginación">
              {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                const n = pages <= 7 ? i + 1 : Math.min(Math.max(page - 3, 1), pages - 6) + i;
                return <button key={n} aria-current={n === page ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>;
              })}
            </nav>
          )}
        </div>
        <p className="hint"><Info className="i" aria-hidden="true" />Selecciona una cita para confirmarla, marcarla como atendida o cancelarla.</p>
      </section>
    </>
  );
}
