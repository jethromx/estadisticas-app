import type {
  AdminMetrics,
  AdminPrediction,
  AdminUser,
  AuthResponse,
  CreateUserRequest,
  LoginRequest,
  RegisterRequest,
  UpdateUserRequest,
} from '@/types/auth'

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1`

function getToken(): string | null {
  return localStorage.getItem('lottery_token')
}

async function authRequest<T>(path: string, options?: RequestInit, skipAuthEvent = false): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401 && !skipAuthEvent) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      throw new Error('Tu sesión ha expirado. Por favor inicia sesión de nuevo.')
    }
    if (res.status === 403) {
      throw new Error('No tienes permisos para realizar esta acción.')
    }
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err as { message?: string }).message ?? 'Error')
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }
  return res.json() as Promise<T>
}

export const authApi = {
  login: (body: LoginRequest) =>
    authRequest<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }, true),

  register: (body: RegisterRequest) =>
    authRequest<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }, true),

  getUsers: () =>
    authRequest<AdminUser[]>('/admin/users'),

  createUser: (body: CreateUserRequest) =>
    authRequest<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(body) }),

  updateUser: (id: string, body: UpdateUserRequest) =>
    authRequest<AdminUser>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteUser: (id: string) =>
    authRequest<void>(`/admin/users/${id}`, { method: 'DELETE' }),

  getMetrics: () =>
    authRequest<AdminMetrics>('/admin/metrics'),

  getAllPredictions: () =>
    authRequest<AdminPrediction[]>('/admin/predictions'),
}
