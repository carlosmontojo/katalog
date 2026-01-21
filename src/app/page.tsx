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
  Image as LucideImage
} from 'lucide-react'

export const metadata = {
  title: 'Kattlog | Crea Catálogos Profesionales en Minutos',
  description: 'La herramienta definitiva para decoradores y marcas. Captura productos de cualquier web con IA y diseña catálogos profesionales en segundos.',
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
        <section className="pt-40 pb-20 overflow-hidden">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <Zap className="w-4 h-4 fill-primary" />
              <span className="text-xs font-bold tracking-widest uppercase italic">Catálogos impulsados por IA</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 max-w-4xl mx-auto leading-[1.1]">
              Transforma enlaces en <span className="text-primary italic">catálogos</span> profesionales.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
              Captura productos de cualquier tienda online automáticamente. Diseña, personaliza y exporta en formatos profesionales en segundos.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-10 py-7 text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                <Link href="/login">Empieza ahora gratis <ArrowRight className="ml-2 w-5 h-5" /></Link>
              </Button>
              <p className="text-sm text-muted-foreground">No requiere tarjeta de crédito</p>
            </div>

            {/* Hero Mockup */}
            <div className="relative max-w-6xl mx-auto">
              <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full -z-10 animate-pulse"></div>
              <div className="rounded-2xl border border-white/20 shadow-2xl overflow-hidden bg-white/5 backdrop-blur-sm p-2 rotate-1 hover:rotate-0 transition-transform duration-700">
                <img
                  src="/hero.png"
                  alt="Kattlog Interface Mockup"
                  className="rounded-xl w-full h-auto shadow-inner"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-32 bg-secondary/30 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 italic tracking-tight underline underline-offset-8 decoration-primary/30">El flujo de trabajo perfecto</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Diseñamos Kattlog para eliminar las tareas repetitivas y que puedas centrarte en la creatividad.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Feature 1 */}
              <div className="group p-8 rounded-3xl bg-background border border-border/50 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <MousePointerClick className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-4">Captura Instantánea</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Simplemente pega la URL de cualquier producto. Nuestra tecnología captura fotos, precios, descripciones y dimensiones automáticamente.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group p-8 rounded-3xl bg-background border border-border/50 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Layout className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-4">Diseño Visual Premium</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Crea composiciones impresionantes con nuestro editor visual. Personaliza tipografías, colores y layouts con facilidad.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group p-8 rounded-3xl bg-background border border-border/50 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <FileDown className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-4">Exportación Multiformato</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Genera PDFs listos para imprimir, hojas de cálculo de Excel con miniaturas o archivos InDesign (IDML) nativos para edición avanzada.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Proof Section */}
        <section className="py-32 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-20">
              <div className="lg:w-1/2">
                <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight italic decoration-primary/20 underline">Para profesionales de la <span className="text-primary italic">decoración</span>.</h2>
                <div className="space-y-6">
                  {[
                    'Extracción automática de datos con OpenAI',
                    'Eliminación de fondos de imagen nativa',
                    'Formatos de exportación profesionales e industriales',
                    'Gestión ilimitada de proyectos y productos',
                    'Acceso desde cualquier dispositivo'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center italic font-bold">✓</div>
                      <span className="text-lg">{item}</span>
                    </div>
                  ))}
                </div>
                <Button asChild size="lg" className="mt-12 bg-foreground text-background hover:bg-foreground/90 rounded-full px-8">
                  <Link href="/login">Empezar a diseñar</Link>
                </Button>
              </div>
              <div className="lg:w-1/2 relative">
                <div className="grid grid-cols-2 gap-4">
                  <img src="/logo.png" className="w-full h-auto opacity-10 filter grayscale brightness-0 invert" alt="" />
                  <div className="bg-primary/5 aspect-video rounded-2xl flex items-center justify-center">
                    <LucideImage className="w-12 h-12 text-primary/20" />
                  </div>
                  <div className="bg-primary/5 aspect-square rounded-2xl flex items-center justify-center">
                    <Database className="w-12 h-12 text-primary/20" />
                  </div>
                  <div className="bg-primary rounded-2xl p-8 flex flex-col justify-end text-primary-foreground min-h-[200px]">
                    <div className="text-3xl font-bold mb-2">+150</div>
                    <div className="text-sm opacity-80 uppercase tracking-widest">Tiendas soportadas</div>
                  </div>
                </div>
                {/* Floating badge */}
                <div className="absolute -top-6 -right-6 bg-white shadow-2xl rounded-2xl p-6 border border-border animate-bounce duration-[3000ms]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Estado del sistema</p>
                      <p className="text-sm font-bold tracking-tighter">IA Optimizada ✅</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-40 bg-foreground text-background relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/20 skew-x-12 translate-x-1/2"></div>
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-8 max-w-3xl mx-auto italic tracking-tighter">¿Listo para crear tu próximo <span className="text-primary italic">best-seller</span>?</h2>
            <p className="text-lg opacity-80 max-w-xl mx-auto mb-12">Únete a cientos de decoradores que ya ahorran horas de trabajo cada semana.</p>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-12 py-8 text-xl font-bold shadow-2xl transition-transform hover:scale-110 active:scale-95">
              <Link href="/login">Crear mi primer catálogo gratis</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50 bg-background">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <img src="/logo.png" alt="Kattlog" className="h-6 w-auto grayscale opacity-50" />
            <p className="text-xs text-muted-foreground">© 2026 Kattlog. Todos los derechos reservados.</p>
          </div>
          <nav className="flex items-center gap-8">
            <Link href="/login" className="text-xs hover:text-primary transition-colors uppercase tracking-widest font-bold">Privacidad</Link>
            <Link href="/login" className="text-xs hover:text-primary transition-colors uppercase tracking-widest font-bold">Términos</Link>
            <Link href="mailto:info@kattlog.com" className="text-xs hover:text-primary transition-colors uppercase tracking-widest font-bold">Soporte</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
