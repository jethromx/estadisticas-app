import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { authApi } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import type { AdminUser, CreateUserRequest, UpdateUserRequest } from '@/types/auth'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-zinc-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  )
}

function MetricsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: authApi.getMetrics,
  })

  if (isLoading) return <PageSpinner />
  if (error || !data) return <p className="text-sm text-red-500">Error al cargar métricas.</p>

  const chartData = Object.entries(data.actionBreakdown).map(([action, count]) => ({
    action,
    count,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard label="Usuarios totales" value={data.totalUsers} />
        <MetricCard label="Predicciones totales" value={data.totalPredictions} />
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Desglose de acciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="action" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid #e4e4e7',
                    background: '#fff',
                  }}
                />
                <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function UsersTab() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: authApi.getUsers,
  })

  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<CreateUserRequest>({
    username: '',
    email: '',
    password: '',
    role: 'USER',
  })

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState<UpdateUserRequest>({
    username: '',
    email: '',
    role: 'USER',
    active: true,
    password: '',
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)
    try {
      await authApi.createUser(form)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setShowForm(false)
      setForm({ username: '', email: '', password: '', role: 'USER' })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear usuario')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleEdit(user: AdminUser) {
    setEditingUser(user)
    setEditForm({
      username: user.username,
      email: user.email,
      role: user.role,
      active: user.active,
      password: '',
    })
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return

    setFormError(null)
    setFormLoading(true)
    try {
      await authApi.updateUser(editingUser.id, editForm)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setEditingUser(null)
      setEditForm({ username: '', email: '', role: 'USER', active: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar usuario'
      console.error('Update error:', message, err)
      setFormError(message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${username}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      await authApi.deleteUser(id)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    } catch (err) {
      alert(`Error al eliminar usuario: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    }
  }

  if (isLoading) return <PageSpinner />
  if (error || !data) return <p className="text-sm text-red-500">Error al cargar usuarios.</p>

  if (!isAdmin) {
    return <p className="text-sm text-amber-600 dark:text-amber-400">No tienes permisos para gestionar usuarios. Solo admins pueden acceder a esta sección.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{data.length} usuario{data.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
        >
          {showForm ? 'Cancelar' : 'Crear usuario'}
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {formError}
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Usuario</label>
                  <input
                    required
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="usuario"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Contraseña</label>
                  <input
                    required
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Rol</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
                >
                  {formLoading ? 'Creando…' : 'Crear'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {editingUser && (
        <Card>
          <CardHeader>
            <CardTitle>Editar usuario: {editingUser.username}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="flex flex-col gap-3">
              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {formError}
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Usuario</label>
                  <input
                    required
                    value={editForm.username}
                    onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="usuario"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</label>
                  <input
                    required
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Rol</label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Estado</label>
                  <select
                    value={editForm.active ? 'true' : 'false'}
                    onChange={e => setEditForm(f => ({ ...f, active: e.target.value === 'true' }))}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Nueva contraseña <span className="font-normal text-zinc-400">(dejar vacío para no cambiar)</span>
                  </label>
                  <input
                    type="password"
                    value={editForm.password ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
                >
                  {formLoading ? 'Actualizando…' : 'Actualizar'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Creado</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.map(u => (
                <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{u.username}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.active ? 'success' : 'warning'}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(u.createdAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(u)}
                        className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.username)}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function PredictionsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'predictions'],
    queryFn: authApi.getAllPredictions,
  })

  if (isLoading) return <PageSpinner />
  if (error || !data) return <p className="text-sm text-red-500">Error al cargar predicciones.</p>

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">{data.length} predicción{data.length !== 1 ? 'es' : ''}</p>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Etiqueta</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Usuario ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Guardado</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Parámetros</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.map(p => {
                const paramsSummary = p.generationParams
                  ? Object.entries(p.generationParams)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')
                      .slice(0, 80) || '—'
                  : '—'
                return (
                  <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{p.label}</td>
                    <td className="px-4 py-3">
                      {p.lotteryType ? (
                        <Badge variant="secondary">{p.lotteryType}</Badge>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.userId}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(p.savedAt).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-zinc-500" title={paramsSummary}>
                      {paramsSummary}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export function AdminDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Panel de administración</h1>
        <p className="mt-1 text-sm text-zinc-500">Gestiona usuarios, métricas y predicciones del sistema.</p>
      </div>

      <Tabs defaultValue="metrics">
        <TabsList>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="predictions">Predicciones</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <MetricsTab />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="predictions">
          <PredictionsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
