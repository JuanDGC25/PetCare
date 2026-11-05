import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarCheck, Eye, EyeOff, Heart, KeyRound } from 'lucide-react';
import { homeFor, useAuth } from '../auth';
import { DogArt, Paw } from '../components/art';
import { Field, FormAlert, Modal, useToast } from '../components/ui';

const DEMO = [
  { email: 'proveedor@petcare.co', label: 'Clínica (proveedor)' },
  { email: 'dueno@petcare.co', label: 'Dueño de mascota' },
  { email: 'peluqueria@petcare.co', label: 'Peluquería' },
  { email: 'paseos@petcare.co', label: 'Paseador' },
];

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

function ForgotModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [mail, setMail] = useState('');
  const [error, setError] = useState(false);
  return (
    <Modal
      size="sm"
      icon={<KeyRound className="i" aria-hidden="true" />}
      title="Recuperar contraseña"
      subtitle="Escribe el correo con el que te registraste y te enviaremos un enlace."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" type="submit" form="forgot-form">Enviar enlace</button>
        </>
      }
    >
      <form
        className="form" id="forgot-form" noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!isEmail(mail)) return setError(true);
          toast('Te enviamos un enlace para crear una nueva contraseña.');
          onClose();
        }}
      >
        <Field id="f-mail" label="Correo electrónico *" error={error && 'Escribe un correo válido.'}>
          <input className="input" id="f-mail" type="email" placeholder="tucorreo@ejemplo.com" value={mail} onChange={(e) => { setMail(e.target.value); setError(false); }} />
        </Field>
      </form>
    </Modal>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({ email: false, pass: false });
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = { email: !isEmail(email), pass: !pass };
    setErrors(errs);
    setAlert(null);
    if (errs.email || errs.pass) return;
    setBusy(true);
    try {
      const user = await login(email, pass, remember);
      navigate(homeFor(user), { replace: true });
    } catch (err) {
      setAlert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <section className="auth-art" aria-label="PetCare">
        <Link className="brand" to="/login"><span className="brand-mark light"><Paw /></span>PetCare</Link>
        <div className="art-stage">
          <div className="art-circle yellow"><DogArt /></div>
          <span className="float f1"><CalendarCheck className="i" aria-hidden="true" /></span>
          <span className="float f2"><Heart className="i" aria-hidden="true" /></span>
        </div>
        <div>
          <h2>Cuidamos a quien más quieres</h2>
          <p>Agenda, consulta y gestiona las citas de tus mascotas en un solo lugar, sin filas ni llamadas.</p>
        </div>
      </section>

      <section className="auth-form">
        <div className="auth-card">
          <div className="mark"><Paw /></div>
          <h1>Bienvenido de nuevo</h1>
          <p className="lead">Ingresa para ver y agendar las citas de tus mascotas.</p>
          <form className="form" onSubmit={onSubmit} noValidate>
            <Field id="email" label="Correo electrónico" error={errors.email && 'Escribe un correo válido, por ejemplo nombre@correo.com.'}>
              <input
                className="input" id="email" type="email" placeholder="tucorreo@ejemplo.com" autoComplete="email"
                value={email} onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: false }); }}
              />
            </Field>
            <Field id="pass" label="Contraseña" error={errors.pass && 'Escribe tu contraseña.'}>
              <div className="input-wrap">
                <input
                  className="input" id="pass" type={show ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                  value={pass} onChange={(e) => { setPass(e.target.value); setErrors({ ...errors, pass: false }); }}
                />
                <button type="button" className="toggle-pass" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow(!show)}>
                  {show ? <EyeOff className="i" aria-hidden="true" /> : <Eye className="i" aria-hidden="true" />}
                </button>
              </div>
            </Field>
            <div className="between">
              <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Recordarme</label>
              <button type="button" className="link-btn" onClick={() => setForgot(true)}>¿Olvidaste tu contraseña?</button>
            </div>
            <FormAlert message={alert} />
            <button className={`btn btn-primary btn-lg btn-block ${busy ? 'is-loading' : ''}`} type="submit">Iniciar sesión</button>
            <p className="foot">¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link></p>
          </form>

          <div className="demo-box">
            <strong>Cuentas de prueba</strong> (contraseña <code>PetCare123</code>)
            <div className="demo-btns">
              {DEMO.map((d) => (
                <button
                  key={d.email} type="button" className="btn btn-outline btn-sm" title={d.email}
                  onClick={() => { setEmail(d.email); setPass('PetCare123'); setErrors({ email: false, pass: false }); setAlert(null); }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {forgot && <ForgotModal onClose={() => setForgot(false)} />}
    </main>
  );
}
