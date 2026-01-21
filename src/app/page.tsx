import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Zap,
  Layout,
  FileDown,
  MousePointerClick,
  ArrowRight,
  CheckCircle2,
  Database,
  Image as LucideImage,
  Sparkles,
  Search,
  Edit3,
  Globe
} from 'lucide-react'

export const metadata = {
  title: 'Kattlog | De Enlace a Catálogo Profesional en Segundos',
  description: 'La herramienta definitiva para interioristas y marcas. Extrae productos de CUALQUIER web con IA, crea Moodboards artísticos y genera Catálogos PDF e InDesign al instante.',
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Kattlog" className="h-8 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8 mr-auto ml-12">
            <Link href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">Cómo funciona</Link>
            <Link href="#catalogs" className="text-sm font-medium hover:text-primary transition-colors">Catálogos</Link>
            <Link href="#moodboards" className="text-sm font-medium hover:text-primary transition-colors">Moodboards</Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Iniciar sesión
            </Link>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6">
              <Link href="/login">Empezar gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-40 pb-24 overflow-hidden bg-[radial-gradient(circle_at_top_right,var(--color-primary)_0%,transparent_40%)] opacity-95">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <Sparkles className="w-4 h-4 fill-primary" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase italic">Inteligencia Artificial Universal</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 max-w-5xl mx-auto leading-[0.95]">
              Cualquier <span className="text-primary italic">web</span>.<br />Cualquier <span className="text-primary italic">catálogo</span>.
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-14 leading-relaxed font-light">
              Olvida el "copiar y pegar". Kattlog extrae fotos, precios y descripciones de <span className="text-foreground font-semibold">cualquier tienda online del mundo</span> para crear presentaciones impecables en minutos.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-12 py-8 text-xl shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 group">
                <Link href="/login" className="flex items-center">
                  Crea tu primer catálogo ahora <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <div className="flex flex-col items-start gap-1">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-background bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">+500</div>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Interioristas ya lo usan a diario</p>
              </div>
            </div>

            {/* Main Mockup */}
            <div className="relative max-w-6xl mx-auto group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-primary/10 blur-2xl rounded-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="rounded-2xl border border-white/20 shadow-2xl overflow-hidden bg-white/5 backdrop-blur-sm p-3 skew-y-1 group-hover:skew-y-0 transition-all duration-1000">
                <img
                  src="/hero.png"
                  alt="Kattlog Interface"
                  className="rounded-xl w-full h-auto"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Universal Scraping Section */}
        <section id="how-it-works" className="py-32 bg-foreground text-background">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-24">
              <div className="lg:w-1/2">
                <div className="text-primary text-sm font-bold tracking-widest uppercase mb-4 italic">Tecnología de Extracción</div>
                <h2 className="text-4xl md:text-6xl font-bold mb-8 italic tracking-tighter leading-none">Compatible con <span className="text-primary underline">cualquier</span> tienda online.</h2>
                <p className="text-lg opacity-70 mb-10 leading-relaxed">
                  No importa si es una gran multinacional o una tienda de nicho. Nuestra IA analiza el contenido de la web, identifica los productos y extrae todos los detalles por ti de forma automática.
                </p>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary italic">01</div>
                    <h4 className="font-bold">Pega el Enlace</h4>
                    <p className="text-sm opacity-60">Funciona con cualquier URL de producto.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary italic">02</div>
                    <h4 className="font-bold">IA en Acción</h4>
                    <p className="text-sm opacity-60">Detectamos fotos, precios y medidas al instante.</p>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2 grid grid-cols-2 gap-4">
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-colors">
                  <Globe className="w-12 h-12 text-primary mb-4" />
                  <div className="text-2xl font-bold italic tracking-tighter uppercase">Universal</div>
                  <div className="text-xs opacity-50 uppercase tracking-widest">Webs Soportadas</div>
                </div>
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-colors">
                  <LucideImage className="w-12 h-12 text-primary mb-4" />
                  <div className="text-2xl font-bold italic tracking-tighter uppercase">Automático</div>
                  <div className="text-xs opacity-50 uppercase tracking-widest">Extracción por IA</div>
                </div>
                <div className="col-span-2 p-8 rounded-3xl bg-primary text-primary-foreground">
                  <p className="text-xl font-medium leading-relaxed italic">
                    "Es como magia. Pego el link de una butaca y en 3 segundos la tengo en mi proyecto con su precio real y descripción."
                  </p>
                  <p className="mt-4 text-sm font-bold uppercase tracking-widest opacity-80">— Marta R., Interiorista Senior</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* THE CATALOGS SECTION */}
        <section id="catalogs" className="py-40 relative">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-20">
              <div className="lg:w-1/2 order-2 lg:order-1 relative">
                <div className="absolute -inset-10 bg-primary/5 blur-3xl -z-10 rounded-full"></div>
                <img
                  src="/catalog-example.png"
                  className="w-full h-auto rounded-2xl shadow-2xl border border-border"
                  alt="Ejemplo de catálogo PDF"
                />
                <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-2xl shadow-xl border border-border max-w-[200px] animate-in fade-in zoom-in slide-in-from-right-10 duration-1000">
                  <FileDown className="w-8 h-8 text-primary mb-3" />
                  <p className="text-sm font-bold tracking-tight">Exporta a PDF de alta resolución listo para imprimir.</p>
                </div>
              </div>
              <div className="lg:w-1/2 order-1 lg:order-2">
                <h2 className="text-5xl font-bold mb-8 italic tracking-tighter leading-tight">Crea <span className="text-primary">Catálogos</span> Estructurados.</h2>
                <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
                  Perfecto para presupuestos, listas de compra y presentaciones técnicas. Elige un estilo, organiza tus productos y genera un documento impecable con un solo click.
                </p>
                <ul className="space-y-6">
                  {[
                    'Layouts de cuadrícula automáticos',
                    'Actualización de precios masiva',
                    'Hojas de Excel con imágenes integradas',
                    'Exportación IDML nativa para Adobe InDesign'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-lg">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs italic">✓</div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* THE MOODBOARDS SECTION */}
        <section id="moodboards" className="py-40 bg-secondary/20 relative overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-20">
              <div className="lg:w-1/2">
                <h2 className="text-5xl font-bold mb-8 italic tracking-tighter leading-tight">Diseña <span className="text-primary">Moodboards</span> Artísticos.</h2>
                <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
                  Visualiza espacios, combina texturas y crea collages inspiradores. Arrastra, escala y rota productos con total libertad creativa para convencer a tus clientes.
                </p>
                <ul className="space-y-6">
                  {[
                    'Editor de collage profesional libre',
                    'Capas ilimitadas y orden de z-index',
                    'Añade textos y anotaciones personalizadas',
                    'Recorte automático de fondo para cada pieza'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-lg">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs italic">✓</div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button asChild size="lg" className="mt-12 bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 font-bold">
                  <Link href="/login">Empezar mi primer collage</Link>
                </Button>
              </div>
              <div className="lg:w-1/2 relative space-y-4">
                <div className="absolute -inset-10 bg-primary/10 blur-3xl -z-10 rounded-full"></div>
                <img
                  src="/moodboard-example.png"
                  className="w-full h-auto rounded-2xl shadow-2xl border border-white/50 rotate-3 hover:rotate-0 transition-transform duration-1000"
                  alt="Ejemplo de Moodboard artístico"
                />
                <div className="absolute -top-10 -left-10 bg-primary text-primary-foreground p-8 rounded-2xl shadow-2xl rotate-[-12deg] z-20">
                  <Sparkles className="w-10 h-10 mb-2" />
                  <div className="text-2xl font-bold tracking-tighter italic uppercase italic">Exclusividad</div>
                  <div className="text-xs opacity-80 uppercase tracking-widest">De Diseño</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Recap */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center">
              {[
                { icon: Database, title: "Universal", text: "Funciona en cualquier web del mundo con IA." },
                { icon: Edit3, title: "Editable", text: "Cambia precios y nombres con un click." },
                { icon: Layout, title: "Dual", text: "Modo Catálogo PDF o Modo Moodboard Libre." },
                { icon: FileDown, title: "Formatos", text: "PDF, Excel (con fotos) e InDesign." }
              ].map((feature, i) => (
                <div key={i} className="flex flex-col items-center group">
                  <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 mb-6 group-hover:scale-110">
                    <feature.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 italic tracking-tight">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-40 bg-primary text-primary-foreground relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="container mx-auto px-4 relative z-10">
            <h2 className="text-5xl md:text-7xl font-bold mb-10 max-w-4xl mx-auto italic tracking-tighter leading-none">Deja de perder horas en procesos <span className="underline decoration-white/30 italic">manuales</span>.</h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto mb-14 leading-relaxed line-clamp-2">Pasa del enlace al diseño final en lo que tardas en hacer un café. Pruébalo hoy mismo gratis.</p>
            <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-16 py-10 text-2xl font-bold shadow-2xl transition-transform hover:scale-110 active:scale-95">
              <Link href="/login">Crear mi cuenta gratuita <Zap className="ml-3 w-6 h-6 fill-current" /></Link>
            </Button>
            <p className="mt-8 text-sm opacity-80 font-medium">Únete a cientos de profesionales que ya están en el futuro.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-16 border-t border-border/50 bg-background">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex flex-col items-center md:items-start gap-4">
            <img src="/logo.png" alt="Kattlog" className="h-8 w-auto mb-2" />
            <p className="text-xs text-muted-foreground text-center md:text-left">La plataforma definitiva para el diseño de catálogos y moodboards impulsada por datos reales e IA.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-12">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary italic mb-2">Producto</span>
              <Link href="/login" className="text-sm hover:text-primary transition-colors">Cómo funciona</Link>
              <Link href="/login" className="text-sm hover:text-primary transition-colors">Precios</Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary italic mb-2">Soporte</span>
              <Link href="mailto:info@kattlog.com" className="text-sm hover:text-primary transition-colors">Contacto</Link>
              <Link href="/login" className="text-sm hover:text-primary transition-colors">Ayuda</Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary italic mb-2">Legal</span>
              <Link href="/login" className="text-sm hover:text-primary transition-colors">Privacidad</Link>
              <Link href="/login" className="text-sm hover:text-primary transition-colors">Términos</Link>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-16 pt-8 border-t border-border/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">© 2026 Kattlog Universal. Hecho con amor para interioristas.</p>
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Sistemas Online</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
