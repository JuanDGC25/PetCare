import { useMemo, useState, type FormEvent } from 'react';
import { qs } from '../../api';
import { useAuth } from '../../auth';
import { useClinic } from '../../components/clinic';
import { ErrorBox, Field, Loading, Modal, PageHead, useToast } from '../../components/ui';
import {
  MONTHS_SHORT, addDays, capitalize, downloadCsv, formatDateShort, formatMoney, formatNumber, parseDate, toISODate,
  todayISO,
} from '../../format';
import { useApi } from '../../hooks';
import type { Booking, ClinicPet, Staff } from '../../types';

type Period = 'mes' | 'anio' | 'custom';

function rangeFor(period: Period, custom: { from: string; to: string }) {
  const t = parseDate(todayISO());
  if (period === 'mes') return { from: toISODate(new Date(t.getFullYear(), t.getMonth(), 1)), to: todayISO() };
  if (period === 'anio') return { from: `${t.getFullYear()}-01-01`, to: todayISO() };
  return custom;
}

function previousRange(r: { from: string; to: string }) {
  const days = Math.round((parseDate(r.to).getTime() - parseDate(r.from).getTime()) / 86400000) + 1;
  return { from: addDays(r.from, -days), to: addDays(r.from, -1) };
}

function summarize(list: Booking[]) {
  const attended = list.filter((b) => b.status === 'atendida').length;
  const cancelled = list.filter((b) => b.status === 'cancelada').length;
  const total = list.filter((b) => b.status !== 'rechazada').length;
  return { total, attended, cancelled, attendance: attended + cancelled ? (attended / (attended + cancelled)) * 100 : 0 };
}

function buckets(list: Booking[], r: { from: string; to: string }) {
  const days = (parseDate(r.to).getTime() - parseDate(r.from).getTime()) / 86400000;
  const out: { label: string; title: string; a: number; c: number }[] = [];
  if (days <= 62) {
    for (let start = r.from, i = 1; start <= r.to; start = addDays(start, 7), i++) {
      const end = addDays(start, 6) > r.to ? r.to : addDays(start, 6);
      const inRange = list.filter((b) => b.date >= start && b.date <= end);
      out.push({
        label: `Sem ${i}`, title: `${formatDateShort(start)} – ${formatDateShort(end)}`,
        a: inRange.filter((b) => b.status === 'atendida').length, c: inRange.filter((b) => b.status === 'cancelada').length,
      });
    }
  } else {
    const d = parseDate(r.from);
    const end = parseDate(r.to);
    for (let m = new Date(d.getFullYear(), d.getMonth(), 1); m <= end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      const key = toISODate(m).slice(0, 7);
      const inRange = list.filter((b) => b.date.startsWith(key));
      out.push({
        label: capitalize(MONTHS_SHORT[m.getMonth()]), title: capitalize(MONTHS_SHORT[m.getMonth()]),
        a: inRange.filter((b) => b.status === 'atendida').length, c: inRange.filter((b) => b.status === 'cancelada').length,
      });
    }
  }
  return out;
}

function niceMax(n: number) {
  if (n <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(n)));
  const top = Math.ceil(n / (step / 2)) * (step / 2);
  return Math.ceil(top / 4) * 4;
}

function Delta({ now, before, invert = false, unit = '%', empty = false, vs }: { now: number; before: number; invert?: boolean; unit?: string; empty?: boolean; vs: string }) {
  if (empty) return <span className="delta b-ok" style={{ alignSelf: 'flex-start' }}>Sin datos previos</span>;
  if (unit === 'pts') {
    const d = Math.round(now - before);
    const good = invert ? d <= 0 : d >= 0;
    return <span className={`delta ${good ? 'b-ok' : 'b-err'}`} style={{ alignSelf: 'flex-start' }}>{d >= 0 ? '+' : ''}{d} pts</span>;
  }
  if (!before) return <span className="delta b-ok" style={{ alignSelf: 'flex-start' }}>Nuevo periodo</span>;
  const d = Math.round(((now - before) / before) * 100);
  const good = invert ? d <= 0 : d >= 0;
  return <span className={`delta ${good ? 'b-ok' : 'b-err'}`} style={{ alignSelf: 'flex-start' }}>{d >= 0 ? '+' : ''}{d} % vs {vs}</span>;
}

function RangeModal({ value, onClose, onApply }: { value: { from: string; to: string }; onClose: () => void; onApply: (r: { from: string; to: string }) => void }) {
  const [r, setR] = useState(value);
  const [error, setError] = useState('');
  return (
    <Modal
      size="sm"
      title="Periodo personalizado"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" type="submit" form="range-form">Aplicar</button>
        </>
      }
    >
      <form
        className="form" id="range-form" noValidate
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!r.from || !r.to || r.from > r.to) return setError('La fecha inicial debe ser anterior a la final.');
          onApply(r);
        }}
      >
        <div className="row-2">
          <Field id="r-a" label="Desde *" error={error}>
            <input className="input" id="r-a" type="date" value={r.from} onChange={(e) => { setR({ ...r, from: e.target.value }); setError(''); }} />
          </Field>
          <Field id="r-b" label="Hasta *">
            <input className="input" id="r-b" type="date" value={r.to} onChange={(e) => { setR({ ...r, to: e.target.value }); setError(''); }} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

export default function Reportes() {
  const { user } = useAuth();
  const toast = useToast();
  const { version } = useClinic();
  const [period, setPeriod] = useState<Period>('anio');
  const [custom, setCustom] = useState({ from: addDays(todayISO(), -90), to: todayISO() });
  const [askRange, setAskRange] = useState(false);
  const range = rangeFor(period, custom);
  const prev = previousRange(range);

  const bookings = useApi<Booking[]>(`/bookings${qs({ from: prev.from, to: range.to })}`, version);
  const pets = useApi<ClinicPet[]>('/clinic/pets', version);
  const staff = useApi<Staff[]>('/clinic/staff', version);

  const data = useMemo(() => {
    const all = bookings.data ?? [];
    const cur = all.filter((b) => b.date >= range.from && b.date <= range.to);
    const before = all.filter((b) => b.date >= prev.from && b.date <= prev.to);
    const s = summarize(cur);
    const p = summarize(before);
    const ownersBefore = new Set(before.map((b) => b.owner.name));
    const newClients = new Set(cur.map((b) => b.owner.name).filter((o) => !ownersBefore.has(o))).size;
    const prevAll = new Set(all.filter((b) => b.date < prev.from).map((b) => b.owner.name));
    const newClientsPrev = new Set(before.map((b) => b.owner.name).filter((o) => !prevAll.has(o))).size;

    const svcCount = new Map<string, number>();
    cur.filter((b) => b.status !== 'rechazada').forEach((b) => svcCount.set(b.service.name, (svcCount.get(b.service.name) ?? 0) + 1));
    const services = [...svcCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const byStaff = (staff.data ?? []).map((st) => {
      const mine = cur.filter((b) => b.staff?.id === st.id);
      const sum = summarize(mine);
      return { ...st, count: sum.total, attendance: Math.round(sum.attendance), income: mine.filter((b) => b.status === 'atendida').reduce((a, b) => a + b.price, 0) };
    }).filter((x) => x.count > 0).sort((a, b) => b.count - a.count);

    return { cur, s, p, newClients, newClientsPrev, services, byStaff, chart: buckets(cur, range) };
  }, [bookings.data, staff.data, range.from, range.to, prev.from, prev.to]);

  if (bookings.error) return <ErrorBox message={bookings.error} onRetry={bookings.reload} />;
  if (!bookings.data) return <Loading />;

  const petsList = pets.data ?? [];
  const species = [
    { label: 'Perros', n: petsList.filter((p) => p.species === 'perro').length, color: 'var(--yellow-400)' },
    { label: 'Gatos', n: petsList.filter((p) => p.species === 'gato').length, color: 'var(--white)' },
    { label: 'Conejos', n: petsList.filter((p) => p.species === 'conejo').length, color: 'var(--peach-200)' },
    { label: 'Otros', n: petsList.filter((p) => p.species === 'otro').length, color: 'var(--ink-900)' },
  ];
  const pct = (n: number) => (petsList.length ? Math.round((n / petsList.length) * 100) : 0);
  const max = niceMax(Math.max(1, ...data.chart.map((c) => c.a + c.c)));
  const PX = 224;
  const totalSvc = data.services.reduce((a, [, n]) => a + n, 0);
  const isVet = user?.category === 'veterinaria';
  const vsText = period === 'anio' ? String(Number(range.from.slice(0, 4)) - 1) : period === 'mes' ? 'mes anterior' : 'periodo anterior';
  const periodText = period === 'mes' ? 'del mes' : period === 'anio' ? `de ${range.from.slice(0, 4)}` : `del ${formatDateShort(range.from)} al ${formatDateShort(range.to)}`;

  const exportCsv = () => {
    downloadCsv(`reporte-${range.from}-a-${range.to}.csv`, [
      ['Fecha', 'Hora', 'Mascota', 'Propietario', 'Servicio', 'Profesional', 'Estado', 'Valor'],
      ...data.cur.map((b) => [b.date, b.startTime, b.pet.name, b.owner.name, b.service.name, b.staff?.name ?? '', b.status, b.price]),
    ]);
    toast('Se generó el reporte en Excel (CSV).');
  };

  return (
    <>
      <PageHead
        crumb="Inicio / Reportes"
        title={isVet ? 'Reportes de la clínica' : 'Reportes del negocio'}
        actions={
          <>
            <div className="segmented" role="group" aria-label="Periodo">
              <button aria-pressed={period === 'mes'} onClick={() => setPeriod('mes')}>Mes</button>
              <button aria-pressed={period === 'anio'} onClick={() => setPeriod('anio')}>Año</button>
              <button aria-pressed={period === 'custom'} onClick={() => setAskRange(true)}>Personalizado</button>
            </div>
            <button className="btn btn-outline" onClick={() => window.print()}>Descargar PDF</button>
            <button className="btn btn-primary" onClick={exportCsv}>Exportar Excel</button>
          </>
        }
      />
      <section className="stats" aria-label="Indicadores del periodo">
        <article className="card stat" style={{ minHeight: 0 }}>
          <span className="muted" style={{ fontWeight: 600 }}>Citas totales</span>
          <p className="stat-value">{formatNumber(data.s.total)}</p>
          <Delta vs={vsText} empty={data.p.total === 0} now={data.s.total} before={data.p.total} />
        </article>
        <article className="card stat" style={{ minHeight: 0 }}>
          <span className="muted" style={{ fontWeight: 600 }}>Tasa de asistencia</span>
          <p className="stat-value">{Math.round(data.s.attendance)} %</p>
          <Delta vs={vsText} empty={data.p.total === 0} now={data.s.attendance} before={data.p.attendance} unit="pts" />
        </article>
        <article className="card stat" style={{ minHeight: 0 }}>
          <span className="muted" style={{ fontWeight: 600 }}>Cancelaciones</span>
          <p className="stat-value">{formatNumber(data.s.cancelled)}</p>
          <Delta vs={vsText} empty={data.p.total === 0} now={data.s.cancelled} before={data.p.cancelled} invert />
        </article>
        <article className="card stat" style={{ minHeight: 0 }}>
          <span className="muted" style={{ fontWeight: 600 }}>Nuevos clientes</span>
          <p className="stat-value">{formatNumber(data.newClients)}</p>
          <Delta vs={vsText} empty={data.p.total === 0} now={data.newClients} before={data.newClientsPrev} />
        </article>
      </section>

      <div className="rep-grid">
        <section className="card card-pad">
          <div className="card-head">
            <h2>{data.chart[0]?.label.startsWith('Sem') ? 'Citas por semana' : 'Citas por mes'}</h2>
            <div className="legend"><span><i style={{ background: 'var(--green-700)' }} />Atendidas</span><span><i style={{ background: 'var(--yellow-400)' }} />Canceladas</span></div>
          </div>
          <div className="chart" role="img" aria-label={`Gráfico de barras de citas atendidas y canceladas ${periodText}`}>
            <div className="y-axis">{[max, (max * 3) / 4, max / 2, max / 4, 0].map((v) => <span key={v}>{formatNumber(v)}</span>)}</div>
            <div className="bars" style={{ gridTemplateColumns: `repeat(${data.chart.length}, 1fr)` }}>
              {data.chart.map((c) => (
                <div key={c.label} className="bar" title={`${c.title}: ${c.a} atendidas, ${c.c} canceladas`}>
                  <div className="stack">
                    <span className="c" style={{ height: (c.c / max) * PX }} />
                    <span className="a" style={{ height: (c.a / max) * PX }} />
                  </div>
                  <small>{c.label}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="card card-pad">
          <h2 style={{ marginBottom: 20 }}>Servicios más solicitados</h2>
          <div className="svc">
            {data.services.length === 0 && <p className="muted">Sin citas en el periodo.</p>}
            {data.services.map(([name, n]) => {
              const p = Math.round((n / totalSvc) * 100);
              return (
                <div key={name} className="svc-row">
                  <div><strong>{name}</strong><span>{formatNumber(n)} · {p}%</span></div>
                  <div className="progress"><span style={{ width: `${p}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="rep-grid">
        <section className="card card-pad">
          <h2 style={{ marginBottom: 12 }}>Desempeño por {isVet ? 'veterinario' : 'profesional'}</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{isVet ? 'Veterinario' : 'Profesional'}</th><th>Especialidad</th><th>Citas</th><th>Asistencia</th><th>Ingresos</th></tr></thead>
              <tbody>
                {data.byStaff.length === 0 && <tr><td colSpan={5} className="muted">Sin citas asignadas en el periodo.</td></tr>}
                {data.byStaff.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td className="muted">{s.specialty}</td>
                    <td>{formatNumber(s.count)}</td>
                    <td><div className="mini"><div className="progress"><span style={{ width: `${s.attendance}%` }} /></div><strong>{s.attendance}%</strong></div></td>
                    <td><strong>{formatMoney(s.income)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card card-pad species">
          <h2>Pacientes por especie</h2>
          <div className="split">
            {species.map((s) => <span key={s.label} style={{ width: `${pct(s.n)}%`, background: s.color }} />)}
          </div>
          <ul className="sp-list">
            {species.map((s) => <li key={s.label}><span><i style={{ background: s.color }} />{s.label}</span>{pct(s.n)}%</li>)}
          </ul>
          <p className="base">Base: {formatNumber(petsList.length)} mascotas registradas en el sistema.</p>
        </section>
      </div>

      {askRange && (
        <RangeModal
          value={custom}
          onClose={() => setAskRange(false)}
          onApply={(r) => { setCustom(r); setPeriod('custom'); setAskRange(false); toast('Reporte actualizado para el periodo seleccionado.'); }}
        />
      )}
    </>
  );
}
