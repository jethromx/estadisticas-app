import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

// ── pequeños componentes visuales ─────────────────────────────────────────────

function NumberBall({ n, color = '#7c3aed', size = 'md' }: { n: number; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 'h-14 w-14 text-xl' : size === 'md' ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-xs'
  return (
    <span
      className={`${s} inline-flex items-center justify-center rounded-full font-bold text-white shadow-md`}
      style={{ backgroundColor: color }}
    >
      {n}
    </span>
  )
}

function ComboRow({ nums, color, label }: { nums: number[]; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm">
      <span className="w-24 shrink-0 text-xs font-medium text-white/60">{label}</span>
      <div className="flex gap-1.5">
        {nums.map(n => <NumberBall key={n} n={n} color={color} size="sm" />)}
      </div>
    </div>
  )
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-6 py-4">
      <span className="text-3xl font-black text-violet-600 dark:text-violet-400">{value}</span>
      <span className="text-center text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-2xl">{icon}</span>
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{desc}</p>
    </div>
  )
}

function StepCard({ step, icon, title, desc }: { step: string; icon: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30">
        <span className="text-3xl">{icon}</span>
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
          {step}
        </span>
      </div>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{desc}</p>
    </div>
  )
}

// ── página principal ──────────────────────────────────────────────────────────

export function LandingPage() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">🎱 Lotería MX</span>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-violet-800 to-indigo-900 px-4 py-20 text-white">
        {/* fondo decorativo */}
        <div className="pointer-events-none absolute inset-0 opacity-10">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-violet-900"
              style={{ left: `${(i * 37) % 96}%`, top: `${(i * 53) % 90}%`, opacity: 0.4 + (i % 3) * 0.2 }}
            >
              {((i * 7 + 3) % 56) + 1}
            </div>
          ))}
        </div>

        <div className="relative mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-700/30 px-3 py-1 text-xs font-medium text-violet-200 mb-6">
            🧮 Análisis estadístico profesional · Melate, Revancha y Revanchita
          </div>

          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Juega con<br />
            <span className="text-violet-300">inteligencia</span>{' '}
            y constancia
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-violet-100/90">
            No es suerte ciega. Es <strong className="text-white">fuerza bruta estadística</strong>:
            generamos múltiples combinaciones optimizadas por sorteo y las jugamos <strong className="text-white">durante un año completo</strong>,
            cada concurso, acumulando probabilidad real.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-violet-800 shadow-lg hover:bg-violet-50 transition-colors"
            >
              Iniciar sesión →
            </Link>
            <a
              href="#como-funciona"
              className="rounded-xl border border-violet-400/40 bg-violet-700/30 px-6 py-3 text-sm font-medium text-white hover:bg-violet-700/50 transition-colors"
            >
              ¿Cómo funciona?
            </a>
          </div>

          {/* mini preview de combinaciones */}
          <div className="mt-12 flex flex-col gap-2 max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300 mb-1">Combinaciones generadas hoy</p>
            <ComboRow nums={[4, 12, 23, 35, 41, 50]} color="#7c3aed" label="Combo 1" />
            <ComboRow nums={[7, 19, 28, 33, 44, 52]} color="#6d28d9" label="Combo 2" />
            <ComboRow nums={[2, 15, 26, 38, 47, 55]} color="#5b21b6" label="Combo 3" />
            <p className="text-xs text-violet-400 mt-1">+ más combinaciones por estrategia</p>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto grid max-w-4xl grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800 sm:grid-cols-4">
          <StatPill value="+4,000" label="Sorteos históricos analizados" />
          <StatPill value="6" label="Algoritmos estadísticos activos" />
          <StatPill value="104×" label="Sorteos de Melate al año" />
          <StatPill value="1-56" label="Rango numérico cubierto" />
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section id="como-funciona" className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">¿Cómo funciona?</h2>
            <p className="mt-3 text-zinc-500 dark:text-zinc-400">
              Tres pasos que convierten datos históricos en combinaciones optimizadas
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            <StepCard
              step="1"
              icon="📊"
              title="Analizamos el histórico"
              desc="Descargamos y procesamos miles de sorteos reales de Melate, Revancha y Revanchita. Calculamos frecuencias, tendencias, pares frecuentes y patrones estadísticos."
            />
            <StepCard
              step="2"
              icon="🎯"
              title="Generamos combinaciones"
              desc="Con 6 algoritmos (Bayesiano, Due Score, Backtest, Pares, Tendencia, Chi²) generamos múltiples combinaciones optimizadas para cada concurso."
            />
            <StepCard
              step="3"
              icon="📅"
              title="Jugamos con constancia"
              desc="Las combinaciones se juegan en cada sorteo durante un año completo. La consistencia acumula probabilidad real — no se puede ganar sin jugar."
            />
          </div>
        </div>
      </section>

      {/* ── ESTRATEGIA: FUERZA BRUTA + CONSTANCIA ── */}
      <section className="bg-gradient-to-br from-zinc-900 to-zinc-800 px-4 py-20 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-violet-400">La estrategia</span>
            <h2 className="mt-2 text-3xl font-black">Fuerza bruta + constancia</h2>
            <p className="mt-3 text-zinc-400">
              Un solo boleto tiene 1 en 32 millones de probabilidades. La estrategia cambia el juego.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Fuerza bruta */}
            <div className="rounded-2xl border border-violet-500/30 bg-violet-900/20 p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-xl">💪</span>
                <h3 className="text-lg font-bold">Fuerza bruta</h3>
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">
                En vez de jugar 1 combinación al azar, generamos <strong className="text-white">múltiples combinaciones estadísticamente optimizadas</strong>
                {' '}por sorteo. Más combinaciones = más espacio numérico cubierto = mayor probabilidad de aciertos parciales y totales.
              </p>
              <div className="mt-4 rounded-xl bg-white/5 p-3">
                <p className="text-xs text-zinc-400 mb-2">Ejemplo — Melate, miércoles 7 mayo:</p>
                <div className="flex flex-col gap-1.5">
                  {[[4,12,23,35,41,50],[7,19,28,33,44,52],[2,15,26,38,47,55]].map((nums, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 w-14">Combo {i+1}</span>
                      <div className="flex gap-1">
                        {nums.map(n => (
                          <span key={n} className="h-6 w-6 flex items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold">{n}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-violet-400 mt-1">→ 3× más cobertura que un boleto simple</p>
                </div>
              </div>
            </div>

            {/* Constancia */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-900/20 p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl">📅</span>
                <h3 className="text-lg font-bold">Constancia de un año</h3>
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">
                Un año de juego constante = <strong className="text-white">208+ oportunidades</strong> (Melate + Revancha + Revanchita).
                La probabilidad acumulada a lo largo del tiempo es matemáticamente superior a jugar esporádicamente.
              </p>
              <div className="mt-4 rounded-xl bg-white/5 p-3">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-black text-emerald-400">104</p>
                    <p className="text-[10px] text-zinc-400">sorteos Melate/año</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-emerald-400">208+</p>
                    <p className="text-[10px] text-zinc-400">oportunidades totales</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-violet-400">×3</p>
                    <p className="text-[10px] text-zinc-400">combos por sorteo</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-violet-400">624+</p>
                    <p className="text-[10px] text-zinc-400">tickets en el año</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comparativa visual */}
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-zinc-800/50 p-6">
            <h3 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Estrategia tradicional vs. Lotería MX
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-zinc-700/50 p-4">
                <p className="text-xs font-semibold text-zinc-400 mb-2">❌ Sin sistema</p>
                <ul className="text-sm text-zinc-300 space-y-1">
                  <li>• 1 combinación aleatoria</li>
                  <li>• Juega cuando recuerda</li>
                  <li>• Sin análisis de datos</li>
                  <li>• Resultado: pura suerte</li>
                </ul>
              </div>
              <div className="rounded-xl bg-violet-900/40 border border-violet-500/30 p-4">
                <p className="text-xs font-semibold text-violet-400 mb-2">✅ Con Lotería MX</p>
                <ul className="text-sm text-zinc-200 space-y-1">
                  <li>• 3+ combinaciones optimizadas</li>
                  <li>• Cada sorteo, todo el año</li>
                  <li>• 6 algoritmos estadísticos</li>
                  <li>• Resultado: probabilidad maximizada</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ANÁLISIS INCLUIDOS ── */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
              6 algoritmos trabajando por ti
            </h2>
            <p className="mt-3 text-zinc-500 dark:text-zinc-400">
              Cada combinación es evaluada por múltiples métodos estadísticos antes de sugerirla
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <FeatureCard
              icon="🎰"
              title="Due Score"
              desc="Detecta qué números llevan más sorteos sin aparecer respecto a su intervalo histórico promedio."
            />
            <FeatureCard
              icon="🧮"
              title="Análisis Bayesiano"
              desc="Combina el historial completo con la actividad reciente para estimar la probabilidad real de cada número."
            />
            <FeatureCard
              icon="🔥"
              title="Números calientes y fríos"
              desc="Identifica los números con mayor y menor frecuencia de aparición en ventanas de tiempo configurables."
            />
            <FeatureCard
              icon="🤝"
              title="Pares frecuentes"
              desc="Encuentra qué pares de números co-aparecen más en el mismo sorteo y los prioriza en la generación."
            />
            <FeatureCard
              icon="📐"
              title="Balance par/impar"
              desc="Optimiza la combinación para que tenga la proporción histórica óptima de números pares e impares."
            />
            <FeatureCard
              icon="📊"
              title="Backtest histórico"
              desc="Valida la estrategia contra sorteos reales pasados para estimar la tasa de aciertos esperada."
            />
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="bg-gradient-to-br from-violet-600 to-indigo-700 px-4 py-20 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black sm:text-4xl">
            Empieza tu año de juego inteligente
          </h2>
          <p className="mt-4 text-lg text-violet-100">
            Solicita acceso a tu administrador, inicia sesión y genera tus primeras combinaciones en minutos.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="rounded-xl bg-white px-8 py-3.5 text-base font-bold text-violet-800 shadow-xl hover:bg-violet-50 transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-zinc-200 bg-white px-4 py-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-base font-bold text-zinc-700 dark:text-zinc-300">🎱 Lotería MX</span>
            <p className="max-w-xl text-xs leading-relaxed text-zinc-400">
              <strong>Aviso legal:</strong> Este sistema es una herramienta de análisis estadístico con fines informativos.
              No garantiza premios ni resultados. El juego de azar implica riesgo económico.
              Juega con responsabilidad y dentro de tus posibilidades.
            </p>
            <p className="text-xs text-zinc-300 dark:text-zinc-600">© 2026 Lotería MX — Análisis Estadístico</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
