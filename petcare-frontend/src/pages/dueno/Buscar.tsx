import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, Footprints, House, MapPin, Search, Scissors, SlidersHorizontal, Stethoscope, X, type LucideIcon } from 'lucide-react';
import { qs } from '../../api';
import { useAuth } from '../../auth';
import { DogArt } from '../../components/art';
import { Empty, ErrorBox, Loading } from '../../components/ui';
import { CATEGORY_LABEL, SPECIES_LABEL, WEEKDAYS, WEEKDAYS_SHORT, formatMoney, weekdaysSummary } from '../../format';
import { useApi } from '../../hooks';
import type { Category, Meta, ProviderSummary, Species } from '../../types';

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  veterinaria: Stethoscope, peluqueria: Scissors, paseo: Footprints, guarderia: House,
};
export const CATEGORY_BG: Record<Category, string> = {
  veterinaria: 'var(--green-100)', peluqueria: 'var(--yellow-100)', paseo: 'var(--info-bg)', guarderia: 'var(--peach-200)',
};
const CATEGORY_TEXT: Record<Category, string> = {
  veterinaria: 'Consultas y vacunas', peluqueria: 'Baño y corte', paseo: 'Paseos por el barrio', guarderia: 'Cuidado de día',
};
const PRICES = [20000, 30000, 40000, 50000, 70000];

export default function Buscar() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const [open, setOpen] = useState(false);
  const meta = useApi<Meta>('/providers/meta');
  const f = {
    category: params.get('category') ?? '', species: params.get('species') ?? '', maxPrice: params.get('maxPrice') ?? '',
    weekday: params.get('weekday') ?? '', locality: params.get('locality') ?? '', q: params.get('q') ?? '',
  };
  const results = useApi<ProviderSummary[]>(`/providers${qs(f)}`);

  useEffect(() => setText(params.get('q') ?? ''), [params]);

  function setFilter(key: keyof typeof f, value: string) {
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (value) n.set(key, value); else n.delete(key);
      return n;
    }, { replace: true });
  }

  const chips: [keyof typeof f, string][] = [];
  if (f.category) chips.push(['category', CATEGORY_LABEL[f.category as Category]]);
  if (f.species) chips.push(['species', SPECIES_LABEL[f.species as Species]]);
  if (f.maxPrice) chips.push(['maxPrice', `Hasta ${formatMoney(Number(f.maxPrice))}`]);
  if (f.weekday) chips.push(['weekday', WEEKDAYS[Number(f.weekday)]]);
  if (f.locality) chips.push(['locality', f.locality]);
  if (f.q) chips.push(['q', `«${f.q}»`]);

  return (
    <>
      <section className="hero">
        <div>
          <h1>Hola, {user?.name.split(' ')[0]}</h1>
          <p>¿Qué necesita tu mascota hoy? Compara precios y horarios y reserva en pocos pasos.</p>
          <form className="search" onSubmit={(e) => { e.preventDefault(); setFilter('q', text.trim()); }}>
            <Search className="i" aria-hidden="true" />
            <input className="input" type="search" placeholder="Buscar por nombre, servicio o barrio…" aria-label="Buscar proveedores" value={text} onChange={(e) => setText(e.target.value)} />
          </form>
        </div>
        <div className="hero-art"><DogArt size={190} /></div>
      </section>

      <div className="cats">
        {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => {
          const Icon = CATEGORY_ICON[c];
          const sel = f.category === c;
          return (
            <a
              key={c} href={`?category=${c}`} className="cat" aria-current={sel ? 'true' : undefined}
              style={sel ? { borderColor: 'var(--green-700)', boxShadow: 'var(--ring)' } : undefined}
              onClick={(e) => { e.preventDefault(); setFilter('category', sel ? '' : c); }}
            >
              <span className="ic" style={{ background: CATEGORY_BG[c] }}><Icon className="i" aria-hidden="true" /></span>
              <strong>{CATEGORY_LABEL[c]}</strong>
              <span>{CATEGORY_TEXT[c]}</span>
            </a>
          );
        })}
      </div>

      <div className="with-filters">
        <aside className={`card filters ${open ? 'open' : ''}`} aria-label="Filtros">
          <div className="filters-head">
            <h2>Filtros</h2>
            <button className="icon-btn" aria-label="Cerrar filtros" onClick={() => setOpen(false)}><X className="i" aria-hidden="true" /></button>
          </div>
          <fieldset>
            <legend>Especie</legend>
            <div className="actions">
              {[['', 'Todas'], ['perro', 'Perros'], ['gato', 'Gatos'], ['conejo', 'Conejos']].map(([v, l]) => (
                <button key={v} className="chip" aria-pressed={f.species === v} onClick={() => setFilter('species', v)}>{l}</button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Precio máximo</legend>
            <select className="input select" value={f.maxPrice} onChange={(e) => setFilter('maxPrice', e.target.value)}>
              <option value="">Cualquier precio</option>
              {PRICES.map((p) => <option key={p} value={p}>Hasta {formatMoney(p)}</option>)}
            </select>
          </fieldset>
          <fieldset>
            <legend>Día de atención</legend>
            <div className="days-pick">
              {WEEKDAYS_SHORT.map((d, i) => (
                <label key={d} title={WEEKDAYS[i]}>
                  <input type="checkbox" aria-label={WEEKDAYS[i]} checked={f.weekday === String(i)} onChange={(e) => setFilter('weekday', e.target.checked ? String(i) : '')} />
                  <span>{d}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Localidad</legend>
            <select className="input select" value={f.locality} onChange={(e) => setFilter('locality', e.target.value)}>
              <option value="">Toda Bogotá</option>
              {meta.data?.localities.map((l) => <option key={l}>{l}</option>)}
            </select>
          </fieldset>
          <button className="btn btn-primary btn-block btn-filters" onClick={() => setOpen(false)}>Ver {results.data?.length ?? 0} resultados</button>
        </aside>

        <section aria-live="polite">
          <div className="card-head">
            <h2>{results.loading ? 'Buscando…' : `${results.data?.length ?? 0} proveedores encontrados`}</h2>
            <button className="btn btn-outline btn-sm btn-filters" onClick={() => setOpen(true)}><SlidersHorizontal className="i i-sm" aria-hidden="true" />Filtros</button>
          </div>
          <div className="active-filters">
            {chips.map(([k, label]) => (
              <span key={k} className="fchip">{label}<button aria-label={`Quitar filtro ${label}`} onClick={() => setFilter(k, '')}><X className="i i-sm" aria-hidden="true" /></button></span>
            ))}
            {chips.length > 0 && <button className="link-btn" onClick={() => setParams({}, { replace: true })}>Limpiar todo</button>}
          </div>

          {results.error ? (
            <ErrorBox message={results.error} onRetry={results.reload} />
          ) : results.loading && !results.data ? (
            <Loading text="Buscando proveedores…" />
          ) : !results.data?.length ? (
            <Empty icon={<Search className="i" style={{ width: 44, height: 44 }} aria-hidden="true" />} title="No hay proveedores con esos filtros" text="Prueba quitando algún filtro o buscando otra palabra." />
          ) : (
            <div className="list">
              {results.data.map((p) => {
                const Icon = CATEGORY_ICON[p.category];
                return (
                  <article key={p.id} className="card item">
                    <span className="logo-box" style={{ background: CATEGORY_BG[p.category] }}><Icon className="i" style={{ width: 28, height: 28 }} aria-hidden="true" /></span>
                    <div>
                      <h3>{p.businessName}</h3>
                      <div className="meta">
                        <span className="tag">{CATEGORY_LABEL[p.category]}</span>
                        <span><MapPin className="i i-sm" aria-hidden="true" />{p.neighborhood}, {p.locality}</span>
                        <span><Calendar className="i i-sm" aria-hidden="true" />{weekdaysSummary(p.weekdays)}</span>
                      </div>
                    </div>
                    <div className="item-side">
                      <p className="price">Desde<strong>{formatMoney(p.minPrice)}</strong></p>
                      <Link className="btn btn-primary btn-sm" to={`/proveedores/${p.id}`}>Ver y reservar</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
