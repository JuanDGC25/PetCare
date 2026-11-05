import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CircleX, Clock, MapPin, Phone, Plus } from 'lucide-react';
import { api } from '../../api';
import { Empty, ErrorBox, Loading, Modal, PageHead, StatusBadge, useToast } from '../../components/ui';
import { dateParts, formatDateLong, formatMoney, formatTime, todayISO } from '../../format';
import { useApi } from '../../hooks';
import type { Booking } from '../../types';

const TABS = [
  { key: 'proximas', label: 'Próximas', match: (b: Booking, t: string) => ['pendiente', 'aceptada'].includes(b.status) && b.date >= t },
  { key: 'historial', label: 'Historial', match: (b: Booking, t: string) => !(['pendiente', 'aceptada'].includes(b.status) && b.date >= t) },
];

export default function MisCitas() {
  const toast = useToast();
  const bookings = useApi<Booking[]>('/bookings');
  const [tab, setTab] = useState('proximas');
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const today = todayISO();

  if (bookings.error) return <ErrorBox message={bookings.error} onRetry={bookings.reload} />;
  if (!bookings.data) return <Loading />;
  const all = bookings.data;
  let list = all.filter((b) => TABS.find((t) => t.key === tab)!.match(b, today));
  if (tab === 'historial') list = [...list].reverse();

  async function cancel() {
    if (!cancelling) return;
    try {
      const saved = await api<Booking>(`/bookings/${cancelling.id}/status`, 'PATCH', { status: 'cancelada' });
      bookings.setData(all.map((b) => (b.id === saved.id ? saved : b)));
      toast('Reserva cancelada. El proveedor fue notificado.', 'circle-x');
      setCancelling(null);
    } catch (err) {
      toast((err as Error).message, 'info');
    }
  }

  return (
    <>
      <PageHead
        crumb="Inicio / Mis citas"
        title="Mis citas"
        actions={<Link className="btn btn-primary btn-lg" to="/buscar"><Plus className="i" aria-hidden="true" />Nueva reserva</Link>}
      />
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} className="tab" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label} ({all.filter((b) => t.match(b, today)).length})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty
          icon={<Calendar className="i" style={{ width: 44, height: 44 }} aria-hidden="true" />}
          title={tab === 'proximas' ? 'No tienes citas próximas' : 'Aún no hay historial'}
          text="Busca un servicio y reserva en pocos pasos."
          action={<Link className="btn btn-primary" to="/buscar">Buscar servicios</Link>}
        />
      ) : (
        <div className="list">
          {list.map((b) => {
            const d = dateParts(b.date);
            return (
              <article key={b.id} className="card item">
                <div className="date-box"><small>{d.month}</small><b>{d.day}</b><small>{d.weekday}</small></div>
                <div>
                  <h3>{b.service.name} · {b.provider.businessName}</h3>
                  <div className="meta">
                    <span><Clock className="i i-sm" aria-hidden="true" />{formatDateLong(b.date)}, {formatTime(b.startTime)}</span>
                    <span>{b.pet.name}</span>
                    <span><MapPin className="i i-sm" aria-hidden="true" />{b.provider.address ?? b.provider.neighborhood}</span>
                    {b.provider.phone && <span><Phone className="i i-sm" aria-hidden="true" />{b.provider.phone}</span>}
                  </div>
                  {b.providerNotes && <p className="hint" style={{ marginTop: 8 }}>Mensaje del proveedor: {b.providerNotes}</p>}
                </div>
                <div className="item-side">
                  <StatusBadge status={b.status} />
                  <p className="price"><strong>{formatMoney(b.price)}</strong></p>
                  {['pendiente', 'aceptada'].includes(b.status) && b.date >= today && (
                    <button className="btn btn-ghost-danger btn-sm" onClick={() => setCancelling(b)}>Cancelar</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {cancelling && (
        <Modal
          size="sm"
          icon={<CircleX className="i" aria-hidden="true" />}
          iconTone="danger"
          title="¿Cancelar esta reserva?"
          subtitle={`${cancelling.service.name} para ${cancelling.pet.name}, ${formatDateLong(cancelling.date)} a las ${formatTime(cancelling.startTime)}.`}
          onClose={() => setCancelling(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setCancelling(null)}>Volver</button>
              <button className="btn btn-danger" onClick={cancel}>Sí, cancelar</button>
            </>
          }
        >
          <p className="muted">Se avisará al proveedor y el horario quedará libre para otras personas.</p>
        </Modal>
      )}
    </>
  );
}
