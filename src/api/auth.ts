import type {
  AdminMetrics,
  AdminPrediction,
  AdminUser,
  AuthResponse,
  CreateUserRequest,
  LoginRequest,
  RegisterRequest,
} from '@/types/auth'

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1`

function getToken(): string | null {
  return localStorage.getItem('lottery_token')
}

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
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
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err as { message?: string }).message ?? 'Error')
  }
  return res.json() as Promise<T>
}

export const authApi = {
  login: (body: LoginRequest) =>
    authRequest<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  register: (body: RegisterRequest) =>
    authRequest<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  getUsers: () =>
    authRequest<AdminUser[]>('/admin/users'),

  createUser: (body: CreateUserRequest) =>
    authRequest<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(body) }),

  getMetrics: () =>
    authRequest<AdminMetrics>('/admin/metrics'),

  getAllPredictions: () =>
    authRequest<AdminPrediction[]>('/admin/predictions'),
}
