import { useEffect, useRef, useState, type FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, Calendar, CalendarCheck, CalendarPlus, ChartColumn, CircleX, ClipboardList, Heart, House, LogOut, Menu,
  Search, SlidersHorizontal, Syringe, Users, type LucideIcon,
} from 'lucide-react';
import { qs } from '../api';
import { staffLabel, useAuth } from '../auth';
import { addDays, formatDateShort, formatTime, initials, todayISO, WEEKDAYS } from '../format';
import { useApi } from '../hooks';
import type { Booking } from '../types';
import { Paw } from './art';
import { ClinicProvider, useClinicOptional } from './clinic';
import { Modal } from './ui';

interface NavItem { to: string; label: string; icon: LucideIcon }

function Brand({ to }: { to: string }) {
  return <NavLink className="brand" to={to}><span className="brand-mark"><Paw /></span>PetCare</NavLink>;
}

interface Notif { key: string; to: string; bg: string; icon: LucideIcon; title: string; sub: string }

function useNotifications(isClinic: boolean, version: string): Notif[] {
  const from = addDays(todayISO(), -3);
  const { data } = useApi<Booking[]>(`/bookings${qs({ from })}`, version);
  if (!data) return [];
  const today = todayISO();
  const list: Notif[] = [];
  const recent = (b: Booking) => Date.now() - new Date(b.updatedAt).getTime() < 3 * 86400000;

  if (isClinic) {
    data.filter((b) => b.status === 'pendiente' && b.date >= today)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
      .forEach((b) => list.push({
        key: `p${b.id}`, to: '/citas', bg: 'var(--yellow-100)', icon: CalendarPlus,
        title: `Nueva solicitud de ${b.owner.name}`,
        sub: `${b.pet.name} · ${b.service.name} · ${WEEKDAYS[new Date(`${b.date}T12:00`).getDay()].slice(0, 3).toLowerCase()} ${formatDateShort(b.date)}, ${b.startTime}`,
      }));
    data.filter((b) => b.status === 'cancelada' && b.date >= today && recent(b)).slice(0, 2)
      .forEach((b) => list.push({
        key: `c${b.id}`, to: '/citas', bg: 'var(--err-bg)', icon: CircleX,
        title: `${b.pet.name} canceló su cita`,
        sub: `${b.date === today ? 'Hoy' : formatDateShort(b.date)} ${b.startTime} · ${b.service.name}`,
      }));
    data.filter((b) => b.status === 'aceptada' && /vacun/i.test(b.service.name) && b.date >= today && b.date <= addDays(today, 7))
      .slice(0, 2)
      .forEach((b) => list.push({
        key: `v${b.id}`, to: `/gestion?pet=${b.pet.id}`, bg: 'var(--green-100)', icon: Syringe,
        title: `Vacuna próxima: ${b.pet.name}`,
        sub: `${b.providerNotes ?? b.service.name} · ${formatDateShort(b.date)}`,
      }));
  } else {
    data.filter((b) => ['aceptada', 'rechazada'].includes(b.status) && b.date >= today && recent(b))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4)
      .forEach((b) => list.push({
        key: `o${b.id}`, to: '/mis-citas',
        bg: b.status === 'aceptada' ? 'var(--green-100)' : 'var(--err-bg)',
        icon: b.status === 'aceptada' ? CalendarCheck : CircleX,
        title: `${b.provider.businessName} ${b.status === 'aceptada' ? 'confirmó' : 'rechazó'} tu cita`,
        sub: `${b.pet.name} · ${b.service.name} · ${formatDateShort(b.date)}, ${formatTime(b.startTime)}`,
      }));
  }
  return list;
}

function Topbar({ isClinic, version }: { isClinic: boolean; version: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const notifs = useNotifications(isClinic, `${version}-${location.pathname}`);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);
  useEffect(() => setOpen(false), [location.pathname]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    navigate(`${isClinic ? '/gestion' : '/buscar'}${qs({ q: q.trim() })}`);
  }

  const placeholder = isClinic ? 'Buscar mascota, propietario o cita…' : 'Buscar servicio, proveedor o barrio…';
  return (
    <div className="topbar">
      <form className="search" onSubmit={onSearch}>
        <span className="sr-only">Buscar</span>
        <Search className="i" aria-hidden="true" />
        <input className="input" type="search" placeholder={placeholder} aria-label={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      <div className="user">
        <div className="popover-wrap" ref={wrap}>
          <button className="icon-btn" aria-label="Notificaciones" aria-expanded={open} onClick={() => setOpen(!open)}>
            <Bell className="i" aria-hidden="true" />
            {notifs.length > 0 && <span className="dot" />}
          </button>
          <div className="popover" hidden={!open}>
            <h3>Notificaciones</h3>
            {notifs.length === 0 && <p className="notif muted">No tienes notificaciones nuevas.</p>}
            {notifs.map((n) => (
              <NavLink key={n.key} className="notif" to={n.to} style={{ color: 'inherit', fontWeight: 700 }}>
                <span className="ic" style={{ background: n.bg }}><n.icon className="i i-sm" aria-hidden="true" /></span>
                <span>{n.title}<small>{n.sub}</small></span>
              </NavLink>
            ))}
          </div>
        </div>
        <span className="avatar av-y">{initials(user?.name ?? '')}</span>
        <div>
          <strong>{user?.name}</strong>
          <small>{isClinic ? `${user?.business_name} · Administración` : 'Propietario de mascota'}</small>
        </div>
      </div>
    </div>
  );
}

function ShellInner({ isClinic }: { isClinic: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const clinic = useClinicOptional();
  const sidebar = useRef<HTMLElement>(null);

  useEffect(() => setMenu(false), [location.pathname]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (menu && !sidebar.current?.contains(t) && !t.closest('[data-menu]')) setMenu(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [menu]);

  const nav: NavItem[] = isClinic
    ? [
        { to: '/panel', label: 'Panel principal', icon: House },
        { to: '/citas', label: 'Citas', icon: Calendar },
        { to: '/gestion', label: 'Gestión de información', icon: ClipboardList },
        { to: '/equipo', label: staffLabel(user), icon: Users },
        { to: '/reportes', label: 'Reportes', icon: ChartColumn },
        { to: '/configuracion', label: 'Configuración', icon: SlidersHorizontal },
      ]
    : [
        { to: '/buscar', label: 'Buscar servicios', icon: House },
        { to: '/mis-citas', label: 'Mis citas', icon: Calendar },
        { to: '/mis-mascotas', label: 'Mis mascotas', icon: Heart },
      ];
  const home = isClinic ? '/panel' : '/buscar';
  const todayWd = new Date().getDay();

  return (
    <div className="app">
      <div className="mobilebar">
        <Brand to={home} />
        <button className="icon-btn" data-menu aria-label="Abrir menú" onClick={() => setMenu(!menu)}><Menu className="i" aria-hidden="true" /></button>
      </div>
      <aside className={`sidebar ${menu ? 'open' : ''}`} id="sidebar" aria-label="Menú principal" ref={sidebar}>
        <Brand to={home} />
        <nav className="nav">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} aria-current={location.pathname.startsWith(to) ? 'page' : undefined}>
              <Icon className="i" aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        {isClinic ? (
          <div className="urgent">
            <h3>¿Urgencia?</h3>
            <p>Registra una cita prioritaria y notifica al veterinario de turno.</p>
            <button className="btn btn-dark btn-block" onClick={() => clinic?.openUrgent()}>Cita urgente</button>
          </div>
        ) : (
          <div className="urgent">
            <h3>¿Urgencia?</h3>
            <p>Encuentra una veterinaria que atienda hoy y reserva el primer horario libre.</p>
            <button className="btn btn-dark btn-block" onClick={() => navigate(`/buscar?category=veterinaria&weekday=${todayWd}`)}>Buscar veterinaria</button>
          </div>
        )}
        <button className="logout" onClick={() => setConfirmLogout(true)} style={{ border: 0, background: 'none', font: 'inherit', cursor: 'pointer' }}>
          <LogOut className="i" aria-hidden="true" /><span>Cerrar sesión</span>
        </button>
      </aside>
      <main className="main">
        <Topbar isClinic={isClinic} version={clinic?.version ?? 0} />
        <Outlet />
      </main>

      {confirmLogout && (
        <Modal
          size="sm"
          icon={<LogOut className="i" aria-hidden="true" />}
          title="¿Cerrar sesión?"
          onClose={() => setConfirmLogout(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setConfirmLogout(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => { logout(); navigate('/login'); }}>Cerrar sesión</button>
            </>
          }
        >
          <p className="muted">Tendrás que ingresar de nuevo con tu correo y contraseña.</p>
        </Modal>
      )}
    </div>
  );
}

export default function Shell() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'proveedor') {
    return <ClinicProvider><ShellInner isClinic /></ClinicProvider>;
  }
  return <ShellInner isClinic={false} />;
}
