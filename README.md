# Lottery Frontend

Interfaz web para el análisis estadístico de los juegos de pronósticos de **Lotería Nacional de México**: Melate, Revancha, Revanchita y Gana Gato.

Consume la API REST de [lottery-api](../lottery-api) a través del proxy de Vite en desarrollo.

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 20 |
| npm | 10 |
| [lottery-api](../lottery-api) corriendo | `http://localhost:8080` |

---

## Instalación y desarrollo

```bash
npm install
npm run dev
```

La app arranca en `http://localhost:5173`. Las peticiones a `/api/*` se redirigen automáticamente al API en `http://localhost:8080`.

## Build de producción

```bash
npm run build      # compila TypeScript y genera dist/
npm run preview    # sirve el build localmente para verificar
```

## Lint

```bash
npm run lint
```

---

## Estructura del proyecto

```
src/
├── api/
│   ├── lottery.ts        # Cliente HTTP (fetch wrapper tipado)
│   └── queries.ts        # Hooks de React Query (useStatistics, useSync, …)
├── components/
│   ├── Layout.tsx         # Shell con sidebar y header móvil
│   └── ui/                # Componentes base (Button, Card, Badge, Tabs, Spinner)
├── lib/
│   └── utils.ts           # cn(), LOTTERY_TYPES, formateadores de fecha/número
├── pages/
│   ├── Dashboard.tsx      # Vista principal con tarjeta por juego
│   └── GamePage.tsx       # Detalle de juego: resumen, frecuencias, calientes/fríos, sugerencias
├── types/
│   └── lottery.ts         # Tipos TypeScript compartidos
├── App.tsx                # Router principal (BrowserRouter + QueryClientProvider)
├── main.tsx               # Punto de entrada React
└── index.css              # Variables CSS + Tailwind
```

---

## Rutas

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | `Dashboard` | Resumen de los 4 juegos con totales y acceso a sincronización |
| `/game/:id` | `GamePage` | Detalle de un juego (`melate`, `revancha`, `revanchita`, `gana_gato`) |

Las rutas desconocidas redirigen a `/`.

---

## Stack

| Área | Tecnología |
|---|---|
| Framework UI | React 19 |
| Lenguaje | TypeScript 6 |
| Bundler | Vite 8 |
| Estilos | Tailwind CSS 4 |
| Routing | React Router 7 |
| Server state | TanStack Query 5 |
| Gráficas | Recharts 3 |
| Iconos | Lucide React |

---

## Conexión con el API

En desarrollo, Vite proxea `/api` → `http://localhost:8080`:

```ts
// vite.config.ts
proxy: {
  '/api': { target: 'http://localhost:8080', changeOrigin: true },
}
```

En producción sirve los archivos estáticos de `dist/` y requiere que el servidor web (nginx, Caddy, etc.) haga el mismo proxy o que el API tenga CORS configurado.
