import type { ReactNode } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { homeFor, useAuth } from './auth';
import Shell from './components/Shell';
import { Loading } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';
import Citas from './pages/clinica/Citas';
import Configuracion from './pages/clinica/Configuracion';
import Equipo from './pages/clinica/Equipo';
import Gestion from './pages/clinica/Gestion';
import Panel from './pages/clinica/Panel';
import Reportes from './pages/clinica/Reportes';
import Buscar from './pages/dueno/Buscar';
import MisCitas from './pages/dueno/MisCitas';
import MisMascotas from './pages/dueno/MisMascotas';
import Proveedor from './pages/dueno/Proveedor';
import type { Role } from './types';

function Only({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading text="Cargando sesión…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return <>{children}</>;
}

function Public({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading text="Cargando sesión…" />;
  return user ? <Navigate to={homeFor(user)} replace /> : <>{children}</>;
}

function NotFound() {
  const { user } = useAuth();
  return (
    <div className="done-wrap">
      <h1>Página no encontrada</h1>
      <p className="lead">La dirección no existe o fue movida.</p>
      <Link className="btn btn-primary" to={homeFor(user)}>Ir al inicio</Link>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const P = 'proveedor';
  const D = 'dueno';
  return (
    <Routes>
      <Route path="/login" element={<Public><Login /></Public>} />
      <Route path="/registro" element={<Public><Register /></Public>} />

      <Route element={<Only><Shell /></Only>}>
        <Route path="/panel" element={<Only role={P}><Panel /></Only>} />
        <Route path="/citas" element={<Only role={P}><Citas /></Only>} />
        <Route path="/gestion" element={<Only role={P}><Gestion /></Only>} />
        <Route path="/equipo" element={<Only role={P}><Equipo /></Only>} />
        <Route path="/reportes" element={<Only role={P}><Reportes /></Only>} />
        <Route path="/configuracion" element={<Only role={P}><Configuracion /></Only>} />
        <Route path="/buscar" element={<Only role={D}><Buscar /></Only>} />
        <Route path="/proveedores/:id" element={<Only role={D}><Proveedor /></Only>} />
        <Route path="/mis-citas" element={<Only role={D}><MisCitas /></Only>} />
        <Route path="/mis-mascotas" element={<Only role={D}><MisMascotas /></Only>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/" element={loading ? <Loading /> : <Navigate to={homeFor(user)} replace />} />
    </Routes>
  );
}



