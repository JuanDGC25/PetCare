import { describe, expect, it, vi } from 'vitest';
import { ApiError, api, clearToken, getToken, qs, saveToken, setUnauthorizedHandler } from '../src/api';
import { mockFetch } from './helpers';

describe('api · sesión', () => {
  it('guarda el token en localStorage con «Recordarme»', () => {
    saveToken('abc', true);
    expect(localStorage.getItem('petcare.token')).toBe('abc');
    expect(getToken()).toBe('abc');
  });

  it('guarda el token solo en la pestaña sin «Recordarme»', () => {
    saveToken('xyz', false);
    expect(localStorage.getItem('petcare.token')).toBeNull();
    expect(getToken()).toBe('xyz');
  });

  it('borra el token al cerrar sesión', () => {
    saveToken('abc', true);
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('api · peticiones', () => {
  it('envía el token y el cuerpo en JSON', async () => {
    const fetch = mockFetch({ body: { ok: true } });
    saveToken('tok', true);
    await expect(api('/pets', 'POST', { name: 'Luna' })).resolves.toEqual({ ok: true });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/pets');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok', 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ name: 'Luna' });
  });

  it('devuelve undefined en respuestas 204', async () => {
    mockFetch({ status: 204 });
    await expect(api('/pets/1', 'DELETE')).resolves.toBeUndefined();
  });

  it('convierte los errores de la API en ApiError con detalles', async () => {
    mockFetch({ status: 400, body: { error: 'Revise los datos', details: { name: 'Requerido' } } });
    const err = await api('/pets', 'POST', {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, message: 'Revise los datos', details: { name: 'Requerido' } });
  });

  it('avisa cuando no hay conexión con el servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api('/health')).rejects.toMatchObject({ status: 0 });
  });

  it('cierra la sesión si la API responde 401 con un token guardado', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    saveToken('vencido', true);
    mockFetch({ status: 401, body: { error: 'La sesión expiró' } });
    await expect(api('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});

describe('api · qs', () => {
  it('arma la query string omitiendo valores vacíos', () => {
    expect(qs({ category: 'paseo', q: '', maxPrice: 30000, weekday: null })).toBe('?category=paseo&maxPrice=30000');
    expect(qs({})).toBe('');
  });
});
