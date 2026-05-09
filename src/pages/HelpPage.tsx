import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
        <CardContent className="border-t border-zinc-100 dark:border-zinc-800 pt-4 pb-5">
          <div className="prose-sm max-w-none text-zinc-600 dark:text-zinc-400 space-y-3">
            {section.content}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ── Contenido de cada sección ─────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: 'inicio',
    icon: '🏠',
    title: 'Primeros pasos',
    subtitle: 'Cómo empezar a usar el sistema',
    content: (
      <>
        <p>Al iniciar sesión llegarás al <strong>Dashboard</strong>, que muestra un resumen de los tres juegos: Melate, Revancha y Revanchita.</p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>El <strong>administrador</strong> debe sincronizar los datos históricos desde el Dashboard pulsando "Sincronizar todo". Esto descarga todos los sorteos pasados.</li>
          <li>Entra a cualquier juego desde el sidebar o desde las tarjetas del Dashboard.</li>
          <li>Explora los análisis disponibles en las pestañas de la página del juego.</li>
          <li>Genera combinaciones con el botón <strong>"Generar combinaciones"</strong> y guárdalas.</li>
          <li>En <strong>Predicciones</strong> puedes ver y analizar tus combinaciones guardadas frente a los sorteos posteriores.</li>
        </ol>
        <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-4 py-3">
          <p className="text-violet-700 dark:text-violet-300 font-medium text-xs">💡 Consejo</p>
          <p className="text-violet-600 dark:text-violet-400 text-xs mt-1">Sincroniza antes de generar combinaciones para que el análisis use los datos más recientes.</p>
        </div>
      </>
    ),
  },
  {
    id: 'due-score',
    icon: '⏳',
    title: 'Due Score — Números pendientes',
    subtitle: 'Identifica qué números llevan más tiempo sin aparecer',
    content: (
      <>
        <p>El <strong>Due Score</strong> mide cuánto tiempo lleva un número sin aparecer en relación a su frecuencia histórica esperada.</p>
        <p><strong>Cómo se calcula:</strong> se compara la frecuencia histórica de cada número con los sorteos transcurridos desde su última aparición. Si un número debería salir cada 9 sorteos pero lleva 15 sin aparecer, su Due Score será superior a 1.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Due Score &gt; 1.5</strong> — número muy pendiente, alta presión estadística.</li>
          <li><strong>Due Score ~1.0</strong> — aparece con normalidad.</li>
          <li><strong>Due Score &lt; 0.5</strong> — salió recientemente, menos probable a corto plazo.</li>
        </ul>
        <p><strong>Dónde encontrarlo:</strong> Dashboard (bolitas coloreadas bajo cada juego) y en la pestaña <em>"Pendientes"</em> dentro de cada juego.</p>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
          <p className="text-amber-700 dark:text-amber-300 text-xs">⚠️ El Due Score es una señal estadística, no una predicción. La lotería no tiene memoria: que un número lleve mucho sin salir no garantiza que saldrá pronto.</p>
        </div>
      </>
    ),
  },
  {
    id: 'bayesiano',
    icon: '📊',
    title: 'Análisis Bayesiano',
    subtitle: 'Detecta números que aumentaron su frecuencia recientemente',
    content: (
      <>
        <p>El análisis bayesiano compara la frecuencia histórica de cada número con su frecuencia en una <strong>ventana reciente</strong> (últimos N sorteos). Calcula un "lift" que indica cuánto ha cambiado la probabilidad.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Lift positivo</strong> — el número aparece más de lo esperado en los sorteos recientes. Señal de tendencia al alza.</li>
          <li><strong>Lift negativo</strong> — el número aparece menos de lo esperado recientemente.</li>
          <li><strong>Lift ~0</strong> — comportamiento estable, sin cambios notables.</li>
        </ul>
        <p><strong>Cómo usarlo:</strong> en la pestaña <em>"Bayesiano"</em> de cada juego verás los números ordenados por lift. Los números con lift alto pueden ser buenos candidatos para combinar con los Due Score altos.</p>
      </>
    ),
  },
  {
    id: 'hot-cold',
    icon: '🔥',
    title: 'Números calientes y fríos',
    subtitle: 'Los más y menos frecuentes del histórico completo',
    content: (
      <>
        <p>Esta es la estadística más básica: cuántas veces ha salido cada número en todos los sorteos registrados.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Calientes</strong> — los N números que más veces han aparecido históricamente.</li>
          <li><strong>Fríos</strong> — los N números que menos veces han aparecido.</li>
        </ul>
        <p>Puedes ver las barras de frecuencia en la pestaña <em>"Frecuencias"</em> de cada juego. Algunas estrategias mezclan números calientes (alta frecuencia histórica) con números fríos (pendientes de salir) para diversificar.</p>
      </>
    ),
  },
  {
    id: 'pares',
    icon: '🔗',
    title: 'Análisis de pares',
    subtitle: 'Qué números tienden a salir juntos',
    content: (
      <>
        <p>El análisis de pares registra qué combinaciones de dos números co-ocurren con más frecuencia en el histórico. Un par con alta co-ocurrencia puede ser una señal de correlación estadística.</p>
        <p><strong>Cómo usarlo:</strong> en la pestaña <em>"Pares"</em> de cada juego verás los pares ordenados por frecuencia conjunta. El generador automático puede priorizar combinaciones que incluyan pares frecuentes cuando subes el peso correspondiente.</p>
      </>
    ),
  },
  {
    id: 'balance',
    icon: '⚖️',
    title: 'Balance par/impar y suma',
    subtitle: 'Distribución óptima dentro de cada combinación',
    content: (
      <>
        <p>Históricamente, la mayoría de los sorteos ganadores tienen una distribución <strong>3 pares + 3 impares</strong> o <strong>2 pares + 4 impares</strong> (o viceversa). Combinaciones con todos pares o todos impares son estadísticamente infrecuentes.</p>
        <p>La <strong>suma</strong> de los 6 números también sigue una distribución. Sumas muy bajas (&lt;100) o muy altas (&gt;250) son poco comunes. El rango óptimo histórico se muestra en la pestaña <em>"Balance"</em>.</p>
        <p><strong>En el selector manual:</strong> el sistema califica tu combinación en tiempo real, indicando si el balance y la suma están dentro del rango óptimo.</p>
      </>
    ),
  },
  {
    id: 'backtest',
    icon: '🔄',
    title: 'Backtest histórico',
    subtitle: 'Simula cómo habrían funcionado tus criterios en el pasado',
    content: (
      <>
        <p>El backtest toma los números con mayor Due Score o frecuencia y simula cuántas veces habrían acertado contra los sorteos históricos reales.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Hit rate</strong> — porcentaje de sorteos donde al menos un número de la selección coincidió.</li>
          <li><strong>Promedio de aciertos por sorteo</strong> — cuántos números de la selección salían en promedio.</li>
          <li><strong>Distribución de aciertos</strong> — cuántos sorteos tuvieron 0, 1, 2, 3… aciertos.</li>
        </ul>
        <p>Úsalo para calibrar cuántos números incluir en tu selección base y comparar estrategias.</p>
      </>
    ),
  },
  {
    id: 'chi-cuadrada',
    icon: '📐',
    title: 'Prueba Chi-cuadrada',
    subtitle: 'Verifica si la distribución de sorteos es realmente aleatoria',
    content: (
      <>
        <p>La prueba Chi-cuadrada (χ²) compara la distribución observada de cada número con la distribución esperada si el sorteo fuera perfectamente uniforme.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>p-valor &gt; 0.05</strong> — no hay evidencia estadística de sesgo. El sorteo se comporta como se esperaría de un proceso aleatorio justo.</li>
          <li><strong>p-valor &lt; 0.05</strong> — existe una desviación estadísticamente significativa de la uniformidad.</li>
        </ul>
        <p>Este análisis es más informativo que prescriptivo: te dice si hay patrones estadísticos pero no qué números elegir. En la pestaña <em>"Chi²"</em> de cada juego verás el valor χ², los grados de libertad y el p-valor interpretado.</p>
      </>
    ),
  },
  {
    id: 'ventanas',
    icon: '🪟',
    title: 'Frecuencias por ventana temporal',
    subtitle: 'Compara la frecuencia reciente vs el histórico completo',
    content: (
      <>
        <p>Este análisis divide el histórico en dos períodos: el histórico completo y una ventana reciente configurable (por defecto los últimos 30 sorteos). Muestra la tendencia de cada número.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Tendencia positiva</strong> — el número aparece más en la ventana reciente que en el histórico.</li>
          <li><strong>Tendencia negativa</strong> — el número aparece menos recientemente.</li>
        </ul>
        <p>Disponible en la pestaña <em>"Ventana"</em>. Úsalo junto con el análisis bayesiano para confirmar tendencias.</p>
      </>
    ),
  },
  {
    id: 'posicion',
    icon: '📍',
    title: 'Análisis de posición',
    subtitle: 'Qué números tienden a ocupar cada posición del boleto',
    content: (
      <>
        <p>En Melate, los 6 números se ordenan de menor a mayor al resultado (posición 1 = número más bajo, posición 6 = número más alto). El análisis de posición muestra qué números aparecen con más frecuencia en cada posición.</p>
        <p>Por ejemplo, la posición 1 rara vez tiene números mayores de 15, y la posición 6 rara vez tiene números menores de 30. Este análisis ayuda a construir combinaciones más "naturales" estadísticamente.</p>
        <p>Disponible en la pestaña <em>"Posición"</em> de cada juego.</p>
      </>
    ),
  },
  {
    id: 'calendario',
    icon: '📅',
    title: 'Frecuencia por calendario',
    subtitle: 'Patrones por día de semana y mes del año',
    content: (
      <>
        <p>Este análisis desglosa la frecuencia de cada número según el <strong>día de la semana</strong> y el <strong>mes del año</strong> en que se realizó el sorteo.</p>
        <p>Si juegas siempre los miércoles, puedes ver qué números han salido más en sorteos de miércoles. Esto es útil para detectar patrones estacionales o de día, aunque en un sorteo verdaderamente aleatorio estos patrones deberían ser mínimos.</p>
        <p>Disponible en la pestaña <em>"Calendario"</em> de cada juego.</p>
      </>
    ),
  },
  {
    id: 'consecutivos',
    icon: '🔢',
    title: 'Análisis de consecutivos',
    subtitle: 'Con qué frecuencia salen números adyacentes',
    content: (
      <>
        <p>Registra qué tan frecuentemente aparecen dos números consecutivos (por ejemplo, 14 y 15) en el mismo sorteo. También analiza rachas de 3 o más consecutivos.</p>
        <p>Históricamente, los consecutivos aparecen en un porcentaje significativo de sorteos. Incluir al menos un par de consecutivos en tu combinación puede ser una estrategia válida.</p>
        <p>Disponible en la pestaña <em>"Consecutivos"</em> de cada juego.</p>
      </>
    ),
  },
  {
    id: 'predicciones',
    icon: '🔮',
    title: 'Guardar y analizar predicciones',
    subtitle: 'Registra tus combinaciones y mide su desempeño',
    content: (
      <>
        <p>Puedes guardar cualquier combinación generada o ingresada manualmente. Las predicciones guardadas quedan en la sección <strong>Predicciones</strong>.</p>
        <p><strong>Analizar una predicción</strong> compara tus combinaciones contra los sorteos que ocurrieron <em>después</em> de que la guardaste:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Cuántos aciertos tuvo tu mejor combinación en cada sorteo.</li>
          <li>Promedio de aciertos por sorteo.</li>
          <li>Sugerencias de mejora basadas en los números calientes del período.</li>
        </ul>
        <p>Para analizar, expande cualquier predicción en la sección <em>Predicciones</em> y pulsa <strong>"Analizar"</strong>. Si hay sorteos nuevos desde que la guardaste, el sistema los comparará automáticamente.</p>
        <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-4 py-3">
          <p className="text-violet-600 dark:text-violet-400 text-xs">💡 Guarda una predicción antes de cada sorteo y analízala después para llevar un registro de tu estrategia a lo largo del tiempo.</p>
        </div>
      </>
    ),
  },
  {
    id: 'generador',
    icon: '⚙️',
    title: 'Generador de combinaciones',
    subtitle: 'Cómo configurar y usar el generador automático',
    content: (
      <>
        <p>El generador está disponible dentro de cada juego. Permite configurar:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Número de combinaciones</strong> — cuántas quieres generar por sesión (1 a 20).</li>
          <li><strong>Pesos de algoritmos</strong> — qué tan importante es cada criterio (Due Score, Bayesiano, Frecuencia, Pares, Balance).</li>
          <li><strong>Rango de suma</strong> — filtrar combinaciones cuya suma esté fuera del rango óptimo.</li>
          <li><strong>Balance estricto</strong> — forzar 3 pares + 3 impares en todas las combinaciones.</li>
        </ul>
        <p>También puedes <strong>ingresar combinaciones manualmente</strong> desde la sección Predicciones si quieres registrar números que ya estás jugando.</p>
        <p>Una vez generadas, pulsa <strong>"Guardar predicción"</strong> para registrarlas y poder analizarlas después del sorteo.</p>
      </>
    ),
  },
]

// ── Grupos de navegación ──────────────────────────────────────────────────────

const GROUPS = [
  {
    label: 'Inicio rápido',
    ids: ['inicio', 'generador', 'predicciones'],
  },
  {
    label: 'Análisis estadísticos',
    ids: ['due-score', 'bayesiano', 'hot-cold', 'pares', 'balance', 'backtest', 'chi-cuadrada'],
  },
  {
    label: 'Análisis avanzados',
    ids: ['ventanas', 'posicion', 'calendario', 'consecutivos'],
  },
]

// ── Página ────────────────────────────────────────────────────────────────────

export function HelpPage() {
  const [openId, setOpenId] = useState<string | null>('inicio')
  const [activeGroup, setActiveGroup] = useState(0)

  const visibleIds = GROUPS[activeGroup].ids
  const visibleSections = SECTIONS.filter(s => visibleIds.includes(s.id))

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Centro de conocimiento</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Aprende cómo funciona cada análisis y saca el máximo provecho del sistema.
        </p>
      </div>

      {/* Group tabs */}
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

      {/* Accordion */}
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

      {/* Footer note */}
      <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 pb-4">
        ¿Tienes más preguntas? Contacta a tu administrador.
      </p>
    </div>
  )
}
