import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, homeFor, staffLabel } from '../src/auth';
import { ToastProvider } from '../src/components/ui';
import Login from '../src/pages/Login';
import type { User } from '../src/types';
import { mockFetch } from './helpers';

const clinic = { id: 1, name: 'Laura Méndez', email: 'proveedor@petcare.co', role: 'proveedor', category: 'veterinaria' } as User;

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/panel" element={<h1>Panel principal</h1>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

describe('Login', () => {
  it('muestra errores si se envía vacío', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(screen.getByText(/correo válido/)).toBeTruthy();
    expect(screen.getByText('Escribe tu contraseña.')).toBeTruthy();
  });

  it('los botones de cuentas de prueba llenan el formulario', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Dueño de mascota' }));
    expect(input('Correo electrónico').value).toBe('dueno@petcare.co');
    expect(input('Contraseña').value).toBe('PetCare123');
  });

  it('inicia sesión y lleva a la clínica a su panel', async () => {
    const fetch = mockFetch({ body: { token: 'tok', user: clinic } });
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Clínica (proveedor)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Panel principal' })).toBeTruthy();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ email: 'proveedor@petcare.co', password: 'PetCare123' });
    expect(localStorage.getItem('petcare.token')).toBe('tok');
  });

  it('muestra el error de credenciales de la API', async () => {
    mockFetch({ status: 401, body: { error: 'El correo o la contraseña no son correctos.' } });
    renderLogin();
    fireEvent.change(input('Correo electrónico'), { target: { value: 'ana@correo.com' } });
    fireEvent.change(input('Contraseña'), { target: { value: 'mala1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('El correo o la contraseña no son correctos.')).toBeTruthy();
  });
});

describe('auth · navegación por rol', () => {
  it('envía a cada rol a su pantalla de inicio', () => {
    expect(homeFor(null)).toBe('/login');
    expect(homeFor(clinic)).toBe('/panel');
    expect(homeFor({ ...clinic, role: 'dueno' })).toBe('/buscar');
  });

  it('nombra al equipo según la categoría', () => {
    expect(staffLabel(clinic)).toBe('Veterinarios');
    expect(staffLabel({ ...clinic, category: 'peluqueria' })).toBe('Profesionales');
  });
});
