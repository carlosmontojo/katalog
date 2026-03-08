# Kattlog — Software para Interioristas

Crea catálogos, moodboards y presupuestos profesionales a partir de cualquier web de mobiliario.

## 🚀 Funcionalidades

- **Scraping inteligente** — Extrae productos de cualquier e-commerce con IA
- **Detección de categorías** — Organiza productos automáticamente
- **Editor visual de catálogos** — Drag & drop para maquetar catálogos
- **Moodboards** — Diseña composiciones visuales con los productos
- **Presupuestos** — Genera presupuestos profesionales en Excel (16 columnas)
- **Exportación múltiple** — PDF, Excel, InDesign (IDML), Photoshop (PSD), SVG, PNG

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| IA | OpenAI GPT-4 + Google Gemini |
| Scraping | Puppeteer + Firecrawl |
| Styling | Tailwind CSS |
| Desktop | Electron |
| Exports | ExcelJS, jsPDF, ag-psd |

## 📋 Requisitos

- **Node.js v22+** (probado con v22.13.0)
- npm v11+
- Cuentas en: Supabase, OpenAI, Google AI Studio (Gemini)
- Opcional: Firecrawl API key

---

## 🔧 Instalación (nuevo ordenador)

### 1. Clonar el repositorio
```bash
git clone https://github.com/carlosmontojo/katalog.git
cd katalog
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env.local
```
Edita `.env.local` y rellena todas las API keys. Necesitas:

| Variable | Dónde conseguirla |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API (⚠️ clave privada) |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `FIRECRAWL_API_KEY` | [Firecrawl](https://firecrawl.dev) (opcional) |

> ⚠️ **Si vienes de otro ordenador**, lo más fácil es copiar el `.env.local` del ordenador anterior directamente.

### 3. Instalar dependencias
```bash
npm install
```

### 4. Ejecutar
```bash
# Web app (Next.js):
npm run dev
# → http://localhost:3000

# App de escritorio (Electron):
npm run electron:dev
```

---

## 🗄️ Base de datos

La base de datos ya está configurada en Supabase con las siguientes tablas:
- `projects` — Proyectos del usuario
- `products` — Productos scrapeados
- `moodboards` — Moodboards guardados
- `budgets` — Presupuestos generados

Todas las tablas tienen **Row Level Security (RLS)** activado.

Si necesitas recrear la base de datos desde cero, consulta el esquema en el dashboard de Supabase.

---

## 📦 Despliegue

### Vercel (producción)
1. Importa el repo en [Vercel](https://vercel.com)
2. Añade las variables de entorno en Settings → Environment Variables
3. Deploy automático con cada push a `main`

### Electron (escritorio)
```bash
npm run electron:build        # macOS
npm run electron:build:win    # Windows
npm run electron:build:all    # Ambos
```

---

## 🎨 Uso

1. **Crear proyecto** → Dashboard → "Crear nuevo Katalog"
2. **Añadir productos** → Introduce una URL de e-commerce → Selecciona categorías y productos
3. **Crear catálogo** → Pestaña "Productos" → "Crear Catálogo"
4. **Crear moodboard** → Pestaña "Moodboards" → "Crear Moodboard"
5. **Generar presupuesto** → Pestaña "Presupuestos" → "Generar Presupuesto"
6. **Exportar** → Descarga en PDF, Excel, IDML, PSD, SVG o PNG

---

## 🔒 Seguridad

- API keys en variables de entorno (nunca en código)
- Row Level Security (RLS) en todas las tablas
- Auth gestionado por Supabase Auth
- CORS configurado para dominio de producción

## 📝 Licencia

Propietario — Todos los derechos reservados

---

Hecho con ❤️ para interioristas y profesionales del diseño
