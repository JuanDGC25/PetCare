import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronLeft } from 'lucide-react';
import { ApiError } from '../api';
import { homeFor, useAuth } from '../auth';
import { CatArt } from '../components/art';
import { Field, FormAlert, useToast } from '../components/ui';
import { CATEGORY_LABEL } from '../format';
import { useApi } from '../hooks';
import type { Meta } from '../types';

interface Form {
  nombre: string; apellido: string; doc: string; tel: string; email: string; p1: string; p2: string;
  tipo: 'owner' | 'clinic'; terms: boolean;
  businessName: string; category: string; locality: string; neighborhood: string;
}
type Errors = Partial<Record<keyof Form | string, string>>;

const EMPTY: Form = {
  nombre: '', apellido: '', doc: '', tel: '', email: '', p1: '', p2: '', tipo: 'owner', terms: false,
  businessName: '', category: '', locality: '', neighborhood: '',
};

function validate(f: Form): Errors {
  const e: Errors = {};
  if (f.nombre.trim().length < 2) e.nombre = 'Escribe tu nombre.';
  if (f.apellido.trim().length < 2) e.apellido = 'Escribe tu apellido.';
  if (f.doc.replace(/\D/g, '').length < 6) e.doc = 'Escribe un documento válido.';
  if (f.tel.replace(/\D/g, '').length !== 10) e.tel = 'El celular debe tener 10 dígitos.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  if (f.p1.length < 8 || !/\d/.test(f.p1) || !/[a-zA-Z]/.test(f.p1)) e.p1 = 'La contraseña aún no cumple: mínimo 8 caracteres con letras y números.';
  if (f.p2 !== f.p1) e.p2 = 'Las contraseñas no coinciden.';
  if (f.tipo === 'clinic') {
    if (f.businessName.trim().length < 3) e.businessName = 'Escribe el nombre del negocio.';
    if (!f.category) e.category = 'Elige una categoría.';
    if (!f.locality) e.locality = 'Elige una localidad.';
    if (f.neighborhood.trim().length < 3) e.neighborhood = 'Escribe el barrio.';
  }
  return e;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const meta = useApi<Meta>('/providers/meta');
  const [f, setF] = useState<Form>(EMPTY);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const errors = { ...validate(f), ...serverErrors };
  const valid = Object.keys(validate(f)).length === 0 && f.terms;
  const show = (k: string) => (touched[k] ? errors[k] : undefined);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF({ ...f, [k]: v });
    setServerErrors({});
  };
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setAlert(null);
    try {
      const user = await register({
        name: `${f.nombre.trim()} ${f.apellido.trim()}`,
        document: f.doc,
        phone: f.tel,
        email: f.email.trim(),
        password: f.p1,
        role: f.tipo === 'clinic' ? 'proveedor' : 'dueno',
        consent: f.terms,
        ...(f.tipo === 'clinic' && {
          businessName: f.businessName, category: f.category, locality: f.locality, neighborhood: f.neighborhood,
        }),
      });
      toast('¡Cuenta creada con éxito!');
      navigate(homeFor(user), { replace: true });
    } catch (err) {
      setAlert((err as Error).message);
      if (err instanceof ApiError && err.details) {
        const d = err.details;
        setServerErrors({ email: d.email, doc: d.document, tel: d.phone, p1: d.password });
      }
      if (err instanceof ApiError && err.status === 409) setServerErrors({ email: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <section className="auth-form">
        <div className="auth-card wide">
          <Link className="back" to="/login" aria-label="Volver al inicio de sesión"><ChevronLeft className="i" aria-hidden="true" /></Link>
          <h1 className="reg-title">Familias que aman a sus mascotas</h1>
          <p className="reg-lead">Crea tu cuenta para agendar citas, recibir recordatorios de vacunas y consultar la historia clínica de tus peludos.</p>
          <form className="form" onSubmit={onSubmit} noValidate>
            <div className="row-2">
              <Field id="nombre" label="Nombre" error={show('nombre')}>
                <input className="input" id="nombre" placeholder="Ana" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} onBlur={blur('nombre')} />
              </Field>
              <Field id="apellido" label="Apellido" error={show('apellido')}>
                <input className="input" id="apellido" placeholder="Gómez" value={f.apellido} onChange={(e) => set('apellido', e.target.value)} onBlur={blur('apellido')} />
              </Field>
            </div>
            <div className="row-2">
              <Field id="doc" label="Documento" error={show('doc')}>
                <input className="input" id="doc" inputMode="numeric" placeholder="C.C. 1.000.000.000" value={f.doc} onChange={(e) => set('doc', e.target.value)} onBlur={blur('doc')} />
              </Field>
              <Field id="tel" label="Teléfono" error={show('tel')}>
                <input className="input" id="tel" type="tel" placeholder="300 000 0000" value={f.tel} onChange={(e) => set('tel', e.target.value)} onBlur={blur('tel')} />
              </Field>
            </div>
            <Field id="remail" label="Correo electrónico" error={show('email') || serverErrors.email}>
              <input className="input" id="remail" type="email" placeholder="tucorreo@ejemplo.com" value={f.email} onChange={(e) => set('email', e.target.value)} onBlur={blur('email')} />
            </Field>
            <div className="row-2">
              <div className={`field ${show('p1') ? 'has-error' : ''}`}>
                <label className="label" htmlFor="p1">Contraseña</label>
                <input className="input" id="p1" type="password" placeholder="Mínimo 8 caracteres" aria-describedby="p1-help" value={f.p1} onChange={(e) => set('p1', e.target.value)} onBlur={blur('p1')} />
                <span className="help-always" id="p1-help">Usa mínimo 8 caracteres, con letras y números.</span>
                <span className="field-error">{show('p1')}</span>
              </div>
              <Field id="p2" label="Confirmar contraseña" error={show('p2')}>
                <input className="input" id="p2" type="password" placeholder="Repite la contraseña" value={f.p2} onChange={(e) => set('p2', e.target.value)} onBlur={blur('p2')} />
              </Field>
            </div>
            <div className="field">
              <label className="label" htmlFor="tipo">Tipo de usuario</label>
              <select className="select input" id="tipo" value={f.tipo} onChange={(e) => set('tipo', e.target.value as Form['tipo'])}>
                <option value="owner">Propietario de mascota</option>
                <option value="clinic">Proveedor de servicios (clínica, peluquería, paseador)</option>
              </select>
            </div>

            {f.tipo === 'clinic' && (
              <>
                <div className="row-2">
                  <Field id="biz" label="Nombre del negocio" error={show('businessName')}>
                    <input className="input" id="biz" placeholder="Clínica Huellitas" value={f.businessName} onChange={(e) => set('businessName', e.target.value)} onBlur={blur('businessName')} />
                  </Field>
                  <Field id="cat" label="Categoría" error={show('category')}>
                    <select className="select input" id="cat" value={f.category} onChange={(e) => set('category', e.target.value)} onBlur={blur('category')}>
                      <option value="">Elige…</option>
                      {meta.data?.categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="row-2">
                  <Field id="loc" label="Localidad" error={show('locality')}>
                    <select className="select input" id="loc" value={f.locality} onChange={(e) => set('locality', e.target.value)} onBlur={blur('locality')}>
                      <option value="">Elige…</option>
                      {meta.data?.localities.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </Field>
                  <Field id="barrio" label="Barrio" error={show('neighborhood')}>
                    <input className="input" id="barrio" placeholder="Bosa Centro" value={f.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} onBlur={blur('neighborhood')} />
                  </Field>
                </div>
              </>
            )}

            <label className="check">
              <input type="checkbox" id="terms" checked={f.terms} onChange={(e) => set('terms', e.target.checked)} /> Acepto los términos y la política de tratamiento de datos (Ley 1581 de 2012).
            </label>
            <FormAlert message={alert} />
            <button className={`btn btn-primary btn-lg btn-block ${busy ? 'is-loading' : ''}`} type="submit" disabled={!valid || busy}>Crear cuenta</button>
            <div className="divider">o regístrate con</div>
            <div className="row-2">
              <button type="button" className="btn btn-outline btn-lg" onClick={() => toast('El registro con Google se habilitará en una versión futura.')}>Google</button>
              <button type="button" className="btn btn-outline btn-lg" onClick={() => toast('El registro con Apple se habilitará en una versión futura.')}>Apple</button>
            </div>
            <p className="foot">¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link></p>
          </form>
        </div>
      </section>
      <section className="auth-art center" aria-hidden="true">
        <div className="art-circle cream"><CatArt /></div>
        <ul className="benefits">
          <li><span className="tick"><Check className="i i-sm" aria-hidden="true" /></span>Agenda citas en menos de un minuto</li>
          <li><span className="tick"><Check className="i i-sm" aria-hidden="true" /></span>Recordatorios de vacunas y controles</li>
          <li><span className="tick"><Check className="i i-sm" aria-hidden="true" /></span>Historia clínica siempre a la mano</li>
        </ul>
      </section>
    </main>
  );
}
