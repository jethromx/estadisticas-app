import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

// ── Helpers visuales ──────────────────────────────────────────────────────────

function Ball({ n, color = '#7c3aed' }: { n: number; color?: string }) {
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      {n}
    </span>
  )
}

function Draw({ numbers, color }: { numbers: number[]; color?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {numbers.map(n => <Ball key={n} n={n} color={color} />)}
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-4 py-3 text-xs text-violet-700 dark:text-violet-300">
      💡 {children}
    </div>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
      ⚠️ {children}
    </div>
  )
}

function ExampleBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">{title}</p>
      {children}
    </div>
  )
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Section {
  id: string
  icon: string
  title: string
  subtitle: string
  content: React.ReactNode
}

// ── Acordeón ──────────────────────────────────────────────────────────────────

function AccordionItem({ section, isOpen, onToggle }: {
  section: Section
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <span className="text-2xl">{section.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{section.title}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{section.subtitle}</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <CardContent className="border-t border-zinc-100 dark:border-zinc-800 pt-4 pb-6">
          <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {section.content}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ── Secciones ─────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  // ── INICIO ──
  {
    id: 'inicio',
    icon: '🏠',
    title: 'Primeros pasos',
    subtitle: 'Cómo empezar a usar el sistema en 5 pasos',
    content: (
      <>
        <p>Al iniciar sesión llegarás al <strong className="text-zinc-800 dark:text-zinc-200">Dashboard</strong>, que muestra un resumen de los tres juegos: Melate, Revancha y Revanchita.</p>

        <ol className="list-decimal pl-5 space-y-2">
          <li>El <strong className="text-zinc-800 dark:text-zinc-200">administrador</strong> sincroniza los datos desde el Dashboard pulsando <em>"Sincronizar todo"</em>. Esto descarga todos los sorteos históricos.</li>
          <li>Entra a cualquier juego desde el sidebar o las tarjetas del Dashboard.</li>
          <li>Explora los análisis en las pestañas de la página del juego.</li>
          <li>Genera combinaciones y guárdalas con <em>"Guardar predicción"</em>.</li>
          <li>En <strong className="text-zinc-800 dark:text-zinc-200">Predicciones</strong> analiza tus combinaciones contra los sorteos posteriores.</li>
        </ol>

        <ExampleBox title="Flujo recomendado por sorteo">
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-bold">1</span>
              <span>Admin sincroniza datos → los análisis se actualizan automáticamente.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-bold">2</span>
              <span>Revisa Due Score y Bayesiano → identifica candidatos de esta semana.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-bold">3</span>
              <span>Genera combinaciones con el generador automático o elige tus números en "Mis números".</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-bold">4</span>
              <span>Guarda la predicción → anota los números → juega antes del sorteo.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-bold">5</span>
              <span>Después del sorteo: analiza tu predicción y ve cuánto acertaste.</span>
            </div>
          </div>
        </ExampleBox>

        <Tip>Sincroniza siempre antes de generar combinaciones para que el análisis use los datos más recientes.</Tip>
      </>
    ),
  },

  // ── DUE SCORE ──
  {
    id: 'due-score',
    icon: '⏳',
    title: 'Due Score — Números pendientes',
    subtitle: 'Identifica qué números llevan más tiempo sin aparecer',
    content: (
      <>
        <p>El <strong className="text-zinc-800 dark:text-zinc-200">Due Score</strong> mide cuánto tiempo lleva un número sin aparecer, comparado con su frecuencia histórica esperada.</p>

        <p><strong className="text-zinc-800 dark:text-zinc-200">Fórmula simplificada:</strong></p>
        <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-3 font-mono text-xs">
          Due Score = sorteos_desde_última_aparición ÷ intervalo_esperado
          <br /><br />
          intervalo_esperado = total_sorteos ÷ frecuencia_histórica
        </div>

        <ExampleBox title="Ejemplo con el número 7">
          <div className="space-y-1 text-xs">
            <p>• Total de sorteos en la base: <strong>2,000</strong></p>
            <p>• Número 7 apareció: <strong>220 veces</strong></p>
            <p>• Intervalo esperado: 2,000 ÷ 220 = <strong>~9.1 sorteos</strong></p>
            <p>• Último sorteo donde salió: sorteo #1,985 (hace <strong>15 sorteos</strong>)</p>
            <p>• Due Score: 15 ÷ 9.1 = <strong className="text-violet-600 dark:text-violet-400">1.65</strong> → Pendiente</p>
          </div>
        </ExampleBox>

        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-2 py-2">
            <p className="font-bold text-green-700 dark:text-green-400">&lt; 0.7</p>
            <p className="text-green-600 dark:text-green-500 mt-0.5">Salió recientemente</p>
          </div>
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-2">
            <p className="font-bold text-zinc-700 dark:text-zinc-300">0.7 – 1.3</p>
            <p className="text-zinc-500 mt-0.5">Frecuencia normal</p>
          </div>
          <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-2 py-2">
            <p className="font-bold text-violet-700 dark:text-violet-400">&gt; 1.5</p>
            <p className="text-violet-600 dark:text-violet-500 mt-0.5">Muy pendiente</p>
          </div>
        </div>

        <p><strong className="text-zinc-800 dark:text-zinc-200">Dónde verlo:</strong> Dashboard (bolitas bajo cada juego) y pestaña <em>"Pendientes"</em> dentro de cada juego.</p>

        <Warning>El Due Score es una señal estadística, no una predicción. La lotería no tiene memoria: un número pendiente no está "obligado" a salir pronto.</Warning>
      </>
    ),
  },

  // ── BAYESIANO ──
  {
    id: 'bayesiano',
    icon: '📊',
    title: 'Análisis Bayesiano',
    subtitle: 'Detecta números que aumentaron su frecuencia recientemente',
    content: (
      <>
        <p>El análisis bayesiano compara la frecuencia histórica de cada número con su frecuencia en una <strong className="text-zinc-800 dark:text-zinc-200">ventana reciente</strong> (últimos N sorteos, por defecto 30). Calcula un <em>lift</em> que indica si el número está en tendencia al alza o a la baja.</p>

        <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-3 font-mono text-xs space-y-1">
          <p>prior = frecuencia_histórica / total_sorteos_históricos</p>
          <p>posterior = frecuencia_ventana / total_sorteos_ventana</p>
          <p>lift = (posterior / prior) - 1</p>
        </div>

        <ExampleBox title="Ejemplo: número 23">
          <div className="space-y-1 text-xs">
            <p>• Histórico: salió 180 veces en 2,000 sorteos → prior = <strong>0.090</strong></p>
            <p>• Últimos 30 sorteos: salió 5 veces → posterior = <strong>0.167</strong></p>
            <p>• Lift = (0.167 / 0.090) - 1 = <strong className="text-emerald-600 dark:text-emerald-400">+85%</strong> → fuerte tendencia al alza</p>
          </div>
        </ExampleBox>

        <ExampleBox title="Ejemplo: número 41">
          <div className="space-y-1 text-xs">
            <p>• Histórico: salió 210 veces en 2,000 sorteos → prior = <strong>0.105</strong></p>
            <p>• Últimos 30 sorteos: salió 1 vez → posterior = <strong>0.033</strong></p>
            <p>• Lift = (0.033 / 0.105) - 1 = <strong className="text-rose-600 dark:text-rose-400">-68%</strong> → tendencia a la baja</p>
          </div>
        </ExampleBox>

        <Tip>Combina lift bayesiano alto con Due Score alto para encontrar números que llevan tiempo sin salir Y han aparecido más en sorteos recientes — la combinación más fuerte estadísticamente.</Tip>
      </>
    ),
  },

  // ── HOT/COLD ──
  {
    id: 'hot-cold',
    icon: '🔥',
    title: 'Números calientes y fríos',
    subtitle: 'Los más y menos frecuentes del histórico completo',
    content: (
      <>
        <p>Estadística fundamental: cuántas veces ha salido cada número en <strong className="text-zinc-800 dark:text-zinc-200">todos</strong> los sorteos registrados. Los <em>calientes</em> son los más frecuentes, los <em>fríos</em> los menos.</p>

        <ExampleBox title="Ejemplo de ranking (Melate, datos ilustrativos)">
          <div className="space-y-3 text-xs">
            <div>
              <p className="font-semibold text-orange-600 dark:text-orange-400 mb-1.5">🔥 Top calientes</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { n: 3,  freq: 248 },
                  { n: 14, freq: 242 },
                  { n: 31, freq: 239 },
                  { n: 8,  freq: 235 },
                ].map(({ n, freq }) => (
                  <div key={n} className="flex flex-col items-center gap-0.5">
                    <Ball n={n} color="#ea580c" />
                    <span className="text-zinc-500">{freq}x</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1.5">🧊 Top fríos</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { n: 53, freq: 162 },
                  { n: 47, freq: 168 },
                  { n: 29, freq: 171 },
                  { n: 44, freq: 175 },
                ].map(({ n, freq }) => (
                  <div key={n} className="flex flex-col items-center gap-0.5">
                    <Ball n={n} color="#2563eb" />
                    <span className="text-zinc-500">{freq}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ExampleBox>

        <p>Las frecuencias se muestran como barras en la pestaña <em>"Frecuencias"</em>. Una estrategia clásica es mezclar 3-4 calientes con 2-3 fríos para diversificar.</p>
      </>
    ),
  },

  // ── PARES ──
  {
    id: 'pares',
    icon: '🔗',
    title: 'Análisis de pares',
    subtitle: 'Qué números tienden a salir juntos en el mismo sorteo',
    content: (
      <>
        <p>Registra qué combinaciones de <strong className="text-zinc-800 dark:text-zinc-200">dos números</strong> co-ocurren con mayor frecuencia. Si el 14 y el 31 salen juntos en el 12% de los sorteos cuando la probabilidad base sería ~5%, hay correlación estadística.</p>

        <ExampleBox title="Ejemplo: los 4 pares más frecuentes (ilustrativo)">
          <div className="space-y-2 text-xs">
            {[
              { a: 14, b: 31, count: 87, pct: '12.4%' },
              { a: 3,  b: 22, count: 81, pct: '11.6%' },
              { a: 8,  b: 45, count: 76, pct: '10.9%' },
              { a: 19, b: 38, count: 74, pct: '10.6%' },
            ].map(({ a, b, count, pct }) => (
              <div key={`${a}-${b}`} className="flex items-center gap-3">
                <div className="flex gap-1">
                  <Ball n={a} />
                  <Ball n={b} />
                </div>
                <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: pct }} />
                </div>
                <span className="text-zinc-500 w-16 text-right">{count} veces ({pct})</span>
              </div>
            ))}
          </div>
        </ExampleBox>

        <p>El generador automático puede priorizar combinaciones que incluyan pares frecuentes cuando subes el peso <em>"Pares"</em> en la configuración.</p>
        <Tip>Si dos números son tu "par favorito", verifica aquí si tienen co-ocurrencia alta antes de incluirlos juntos.</Tip>
      </>
    ),
  },

  // ── BALANCE ──
  {
    id: 'balance',
    icon: '⚖️',
    title: 'Balance par/impar y suma',
    subtitle: 'Distribución óptima dentro de cada combinación',
    content: (
      <>
        <p>Históricamente, la gran mayoría de sorteos tienen una distribución equilibrada de números pares e impares. Combinaciones con todos pares o todos impares son estadísticamente infrecuentes.</p>

        <ExampleBox title="Distribución par/impar en sorteos históricos (ilustrativo)">
          <div className="space-y-1.5 text-xs">
            {[
              { dist: '3P + 3I', pct: 31, color: '#7c3aed' },
              { dist: '4P + 2I', pct: 23, color: '#6d28d9' },
              { dist: '2P + 4I', pct: 23, color: '#6d28d9' },
              { dist: '5P + 1I', pct: 10, color: '#a78bfa' },
              { dist: '1P + 5I', pct: 10, color: '#a78bfa' },
              { dist: '6P + 0I', pct: 1.5, color: '#ddd6fe' },
              { dist: '0P + 6I', pct: 1.5, color: '#ddd6fe' },
            ].map(({ dist, pct, color }) => (
              <div key={dist} className="flex items-center gap-2">
                <span className="w-20 font-medium text-zinc-700 dark:text-zinc-300">{dist}</span>
                <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct * 3}%`, backgroundColor: color }} />
                </div>
                <span className="text-zinc-500 w-8">{pct}%</span>
              </div>
            ))}
          </div>
        </ExampleBox>

        <ExampleBox title="Ejemplo de combinaciones y su balance">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-3">
              <Draw numbers={[4, 14, 22, 31, 37, 45]} color="#7c3aed" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ 3P+3I · Suma 153</span>
            </div>
            <div className="flex items-center gap-3">
              <Draw numbers={[2, 4, 8, 16, 22, 44]} color="#94a3b8" />
              <span className="text-rose-600 dark:text-rose-400 font-medium">✗ 6P+0I · Suma 96</span>
            </div>
            <div className="flex items-center gap-3">
              <Draw numbers={[3, 7, 11, 19, 33, 51]} color="#94a3b8" />
              <span className="text-amber-600 dark:text-amber-400 font-medium">~ 0P+6I · Suma 124</span>
            </div>
          </div>
        </ExampleBox>

        <p><strong className="text-zinc-800 dark:text-zinc-200">Rango de suma óptimo:</strong> la pestaña <em>"Balance"</em> muestra el histograma de sumas. El rango más frecuente suele estar entre <strong>115 y 195</strong> para Melate.</p>
        <Tip>En el selector manual ("Mis números"), el sistema califica tu combinación en tiempo real mostrando balance y suma antes de guardarla.</Tip>
      </>
    ),
  },

  // ── BACKTEST ──
  {
    id: 'backtest',
    icon: '🔄',
    title: 'Backtest histórico',
    subtitle: 'Simula cuántas veces habría acertado tu selección en el pasado',
    content: (
      <>
        <p>El backtest toma los números seleccionados (top Due Score, top frecuencia, etc.) y los compara contra <strong className="text-zinc-800 dark:text-zinc-200">todos los sorteos históricos</strong> para calcular métricas de desempeño.</p>

        <ExampleBox title="Ejemplo: backtest de los top-10 números por Due Score">
          <div className="space-y-2 text-xs">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">Selección:</p>
            <Draw numbers={[3, 8, 14, 19, 23, 31, 37, 42, 48, 53]} color="#7c3aed" />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-2 text-center">
                <p className="text-xl font-black text-violet-600">78%</p>
                <p className="text-zinc-500 text-[10px]">Hit rate (≥1 acierto)</p>
              </div>
              <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-2 text-center">
                <p className="text-xl font-black text-violet-600">1.8</p>
                <p className="text-zinc-500 text-[10px]">Promedio aciertos/sorteo</p>
              </div>
            </div>
            <p className="text-zinc-500 mt-1">Distribución: 0 aciertos 22% · 1 acierto 31% · 2 aciertos 28% · 3+ aciertos 19%</p>
          </div>
        </ExampleBox>

        <p><strong className="text-zinc-800 dark:text-zinc-200">Métrica de referencia:</strong> el backtest también calcula cuántos aciertos esperarías eligiendo números <em>al azar</em>. Si tu estrategia supera esa base, tiene valor estadístico.</p>
        <Warning>Un buen backtest histórico no garantiza buenos resultados futuros, pero permite comparar estrategias objetivamente.</Warning>
      </>
    ),
  },

  // ── CHI-CUADRADA ──
  {
    id: 'chi-cuadrada',
    icon: '📐',
    title: 'Prueba Chi-cuadrada',
    subtitle: 'Verifica si la distribución de sorteos es estadísticamente uniforme',
    content: (
      <>
        <p>La prueba χ² (chi-cuadrada) compara la distribución observada de frecuencias con la distribución <strong className="text-zinc-800 dark:text-zinc-200">perfectamente uniforme</strong> que esperaríamos si el sorteo fuera 100% aleatorio.</p>

        <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-3 font-mono text-xs space-y-1">
          <p>χ² = Σ (observado - esperado)² / esperado</p>
          <p>esperado = total_apariciones / cantidad_números</p>
          <p>grados_libertad = cantidad_números - 1 = 55</p>
        </div>

        <ExampleBox title="Interpretación del p-valor">
          <div className="space-y-2 text-xs">
            <div className="flex gap-3 items-start">
              <span className="shrink-0 rounded bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 text-green-700 dark:text-green-400 font-mono">p &gt; 0.05</span>
              <span>No hay evidencia de sesgo. El sorteo se comporta como se esperaría de un proceso aleatorio justo. <strong>La mayoría de los sorteos de lotería caen aquí.</strong></span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="shrink-0 rounded bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-amber-700 dark:text-amber-400 font-mono">0.01 – 0.05</span>
              <span>Desviación leve, estadísticamente significativa al 95%. Puede indicar sesgo menor o ser fluctuación natural.</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="shrink-0 rounded bg-rose-100 dark:bg-rose-900/30 px-1.5 py-0.5 text-rose-700 dark:text-rose-400 font-mono">p &lt; 0.01</span>
              <span>Desviación fuerte. Altamente improbable en un sorteo perfectamente aleatorio. Señal de posible sesgo sistémico.</span>
            </div>
          </div>
        </ExampleBox>

        <p>Este análisis es <strong className="text-zinc-800 dark:text-zinc-200">informativo, no prescriptivo</strong>: te dice si existen patrones estadísticos pero no cuáles números elegir. Es más útil para detectar anomalías que para generar combinaciones.</p>
      </>
    ),
  },

  // ── VENTANAS ──
  {
    id: 'ventanas',
    icon: '🪟',
    title: 'Frecuencias por ventana temporal',
    subtitle: 'Compara la frecuencia reciente vs el histórico completo',
    content: (
      <>
        <p>Divide el histórico en dos períodos y compara la frecuencia de cada número en ambos. La diferencia revela <strong className="text-zinc-800 dark:text-zinc-200">tendencias recientes</strong> que el histórico completo oculta.</p>

        <ExampleBox title="Ejemplo: número 19 en dos períodos">
          <div className="space-y-2 text-xs">
            <div className="flex gap-3">
              <Ball n={19} />
              <div className="flex-1 space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Histórico (2,000 sorteos)</span>
                  <span className="font-medium">188 veces → 9.4%</span>
                </div>
                <div className="h-2 rounded bg-zinc-200 dark:bg-zinc-700">
                  <div className="h-full rounded bg-zinc-400" style={{ width: '47%' }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Últimos 30 sorteos</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">5 veces → 16.7%</span>
                </div>
                <div className="h-2 rounded bg-zinc-200 dark:bg-zinc-700">
                  <div className="h-full rounded bg-emerald-500" style={{ width: '83%' }} />
                </div>
                <p className="text-emerald-600 dark:text-emerald-400 font-medium">↑ Tendencia: +77% sobre el histórico</p>
              </div>
            </div>
          </div>
        </ExampleBox>

        <Tip>Úsalo junto con el análisis bayesiano — ambos miden tendencias recientes, pero con distintas metodologías. Si un número aparece en tendencia positiva en ambos, la señal es más robusta.</Tip>
      </>
    ),
  },

  // ── POSICIÓN ──
  {
    id: 'posicion',
    icon: '📍',
    title: 'Análisis de posición',
    subtitle: 'Qué números tienden a ocupar cada posición del boleto',
    content: (
      <>
        <p>En Melate, los 6 números del resultado se ordenan de <strong className="text-zinc-800 dark:text-zinc-200">menor a mayor</strong> al publicarse. El análisis de posición estudia qué valores aparecen con más frecuencia en cada posición.</p>

        <ExampleBox title="Rango típico por posición (ilustrativo)">
          <div className="space-y-2 text-xs">
            {[
              { pos: 1, label: '1ª posición', range: '1–15',  example: [2, 5, 8, 11, 14], color: '#7c3aed' },
              { pos: 2, label: '2ª posición', range: '5–22',  example: [9, 13, 17, 20, 22], color: '#6d28d9' },
              { pos: 3, label: '3ª posición', range: '13–33', example: [17, 22, 27, 30, 33], color: '#5b21b6' },
              { pos: 4, label: '4ª posición', range: '22–42', example: [25, 30, 35, 38, 42], color: '#4c1d95' },
              { pos: 5, label: '5ª posición', range: '32–52', example: [36, 40, 44, 48, 51], color: '#3b0764' },
              { pos: 6, label: '6ª posición', range: '40–56', example: [42, 46, 50, 53, 56], color: '#1e1b4b' },
            ].map(({ pos, label, range, example, color }) => (
              <div key={pos} className="flex items-center gap-3">
                <span className="w-20 shrink-0 font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
                <span className="w-14 shrink-0 text-zinc-500">{range}</span>
                <div className="flex gap-1">
                  {example.map(n => <Ball key={n} n={n} color={color} />)}
                </div>
              </div>
            ))}
          </div>
        </ExampleBox>

        <p>Una combinación "natural" estadísticamente respeta estos rangos. Por ejemplo, una combinación <strong className="text-zinc-800 dark:text-zinc-200">2, 3, 4, 51, 54, 56</strong> tiene números en posiciones incorrectas y es atípica.</p>
      </>
    ),
  },

  // ── CALENDARIO ──
  {
    id: 'calendario',
    icon: '📅',
    title: 'Frecuencia por calendario',
    subtitle: 'Patrones por día de la semana y mes del año',
    content: (
      <>
        <p>Desglosa la frecuencia de cada número según el <strong className="text-zinc-800 dark:text-zinc-200">día de la semana</strong> y el <strong className="text-zinc-800 dark:text-zinc-200">mes del año</strong> en que ocurrió el sorteo.</p>

        <ExampleBox title="Ejemplo: número 31 por día de sorteo (ilustrativo)">
          <div className="space-y-1.5 text-xs">
            {[
              { dia: 'Miércoles', count: 42, pct: 68 },
              { dia: 'Viernes',   count: 39, pct: 63 },
              { dia: 'Domingo',   count: 28, pct: 45 },
            ].map(({ dia, count, pct }) => (
              <div key={dia} className="flex items-center gap-2">
                <span className="w-20 text-zinc-700 dark:text-zinc-300">{dia}</span>
                <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-zinc-500 w-12 text-right">{count} veces</span>
              </div>
            ))}
          </div>
        </ExampleBox>

        <Warning>En un sorteo verdaderamente aleatorio, estos patrones deberían ser mínimos. Úsalo como referencia complementaria, no como criterio principal de selección.</Warning>
      </>
    ),
  },

  // ── CONSECUTIVOS ──
  {
    id: 'consecutivos',
    icon: '🔢',
    title: 'Análisis de consecutivos',
    subtitle: 'Con qué frecuencia salen números adyacentes en el mismo sorteo',
    content: (
      <>
        <p>Registra qué tan frecuentemente aparecen <strong className="text-zinc-800 dark:text-zinc-200">números adyacentes</strong> (como 14 y 15, o 31, 32, 33) en el mismo sorteo ganador.</p>

        <ExampleBox title="Estadística histórica de consecutivos (ilustrativo)">
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2">
                <p className="text-xl font-black text-violet-600">62%</p>
                <p className="text-zinc-500">Sorteos con al menos 1 par consecutivo</p>
              </div>
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2">
                <p className="text-xl font-black text-violet-600">18%</p>
                <p className="text-zinc-500">Sorteos con 2 pares consecutivos</p>
              </div>
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2">
                <p className="text-xl font-black text-violet-600">4%</p>
                <p className="text-zinc-500">Sorteos con 3 consecutivos seguidos</p>
              </div>
            </div>
          </div>
        </ExampleBox>

        <ExampleBox title="Ejemplo de sorteo con consecutivos">
          <div className="space-y-1 text-xs">
            <Draw numbers={[8, 14, 15, 27, 31, 32]} color="#7c3aed" />
            <p className="text-violet-500 mt-1">↑ Dos pares consecutivos: (14,15) y (31,32)</p>
          </div>
        </ExampleBox>

        <Tip>Incluir al menos un par de consecutivos en tu combinación la hace estadísticamente más "típica". El generador automático considera esto cuando activas el criterio de balance.</Tip>
      </>
    ),
  },

  // ── GENERADOR ──
  {
    id: 'generador',
    icon: '⚙️',
    title: 'Generador de combinaciones',
    subtitle: 'Cómo configurar los pesos y parámetros del generador automático',
    content: (
      <>
        <p>El generador está disponible dentro de cada juego. Combina múltiples algoritmos con pesos configurables para producir combinaciones optimizadas.</p>

        <ExampleBox title="Parámetros y su efecto">
          <div className="space-y-2 text-xs">
            {[
              { param: 'Due Score',    effect: 'Favorece números que llevan más sorteos sin aparecer.' },
              { param: 'Bayesiano',    effect: 'Favorece números con frecuencia reciente mayor al histórico.' },
              { param: 'Frecuencia',   effect: 'Favorece los números históricamente más comunes.' },
              { param: 'Pares',        effect: 'Incluye números que co-ocurren frecuentemente con otros.' },
              { param: 'Balance',      effect: 'Penaliza combinaciones con todos pares o todos impares.' },
            ].map(({ param, effect }) => (
              <div key={param} className="flex gap-2">
                <span className="shrink-0 rounded bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 text-violet-700 dark:text-violet-400 text-[10px] font-bold">{param}</span>
                <span className="text-zinc-500">{effect}</span>
              </div>
            ))}
          </div>
        </ExampleBox>

        <ExampleBox title="Ejemplo de combinación generada con pesos equilibrados">
          <div className="space-y-2 text-xs">
            <Draw numbers={[8, 19, 27, 31, 44, 52]} color="#7c3aed" />
            <div className="grid grid-cols-3 gap-1 mt-2">
              <span className="rounded bg-green-50 dark:bg-green-900/20 px-2 py-1 text-center text-green-700 dark:text-green-400">3P + 3I ✓</span>
              <span className="rounded bg-green-50 dark:bg-green-900/20 px-2 py-1 text-center text-green-700 dark:text-green-400">Suma 181 ✓</span>
              <span className="rounded bg-green-50 dark:bg-green-900/20 px-2 py-1 text-center text-green-700 dark:text-green-400">1 par consec. ✓</span>
            </div>
          </div>
        </ExampleBox>

        <Tip>Empieza con pesos iguales para todos los criterios. Después de analizar varias predicciones, ajusta los pesos hacia los criterios que mejor hayan funcionado en tu historial.</Tip>
      </>
    ),
  },

  // ── PREDICCIONES ──
  {
    id: 'predicciones',
    icon: '🔮',
    title: 'Guardar y analizar predicciones',
    subtitle: 'Registra tus combinaciones y mide su desempeño real',
    content: (
      <>
        <p>Puedes guardar cualquier combinación generada o ingresada manualmente. Las predicciones quedan en la sección <strong className="text-zinc-800 dark:text-zinc-200">Predicciones</strong> con la fecha del último sorteo conocido en el momento de guardar.</p>

        <ExampleBox title="Cómo funciona el análisis de predicciones">
          <div className="space-y-2 text-xs">
            <p>Supón que guardas esta predicción el día antes del sorteo 2,001:</p>
            <Draw numbers={[8, 19, 27, 31, 44, 52]} color="#7c3aed" />
            <p className="mt-2">El sorteo 2,001 resulta en:</p>
            <Draw numbers={[8, 20, 27, 35, 44, 50]} color="#059669" />
            <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-1">✓ 3 aciertos: 8, 27, 44</p>
            <p className="text-zinc-500 mt-2">El sistema registra esto y calcula el promedio de aciertos en todos los sorteos posteriores a tu guardado.</p>
          </div>
        </ExampleBox>

        <p><strong className="text-zinc-800 dark:text-zinc-200">Sugerencias de mejora automáticas:</strong> después del análisis el sistema indica si tus combinaciones cubren suficientes números calientes del período, si el balance par/impar es adecuado, etc.</p>

        <Tip>Guarda una predicción por sorteo durante varias semanas. El análisis acumulado te dará una imagen real de qué estrategia te funciona mejor.</Tip>
      </>
    ),
  },
]

// ── Grupos ────────────────────────────────────────────────────────────────────

const GROUPS = [
  { label: '🚀 Inicio rápido',        ids: ['inicio', 'generador', 'predicciones'] },
  { label: '📈 Análisis principales', ids: ['due-score', 'bayesiano', 'hot-cold', 'pares', 'balance', 'backtest', 'chi-cuadrada'] },
  { label: '🔬 Análisis avanzados',   ids: ['ventanas', 'posicion', 'calendario', 'consecutivos'] },
]

// ── Página ────────────────────────────────────────────────────────────────────

export function HelpPage() {
  const [openId, setOpenId] = useState<string | null>('inicio')
  const [activeGroup, setActiveGroup] = useState(0)

  const visibleSections = SECTIONS.filter(s => GROUPS[activeGroup].ids.includes(s.id))

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Centro de conocimiento</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Aprende cómo funciona cada análisis con ejemplos reales y saca el máximo provecho del sistema.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {GROUPS.map((g, i) => (
          <button
            key={g.label}
            onClick={() => { setActiveGroup(i); setOpenId(null) }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              activeGroup === i
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700',
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {visibleSections.map(section => (
          <AccordionItem
            key={section.id}
            section={section}
            isOpen={openId === section.id}
            onToggle={() => setOpenId(openId === section.id ? null : section.id)}
          />
        ))}
      </div>

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 pb-4">
        Los datos mostrados en los ejemplos son ilustrativos. Los valores reales dependen del histórico sincronizado.
      </p>
    </div>
  )
}
