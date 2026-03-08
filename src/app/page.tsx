import Link from 'next/link'
import { ArrowRight, Download, Play } from 'lucide-react'

export const metadata = {
  title: 'Kattlog | Software para Interioristas y Arquitectos',
  description: 'Captura productos de cualquier web, crea catálogos profesionales y diseña moodboards artísticos. La herramienta definitiva para estudios de interiorismo.',
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">

      {/* ─── Navigation ─── */}
      <header className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex-shrink-0 hover:opacity-70 transition-opacity">
            <img src="/logo.png" alt="Kattlog" className="h-6 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-10">
            <Link href="#proceso" className="text-[11px] uppercase tracking-[0.2em] text-foreground/60 hover:text-foreground transition-colors">
              Proceso
            </Link>
            <Link href="#catalogos" className="text-[11px] uppercase tracking-[0.2em] text-foreground/60 hover:text-foreground transition-colors">
              Catálogos
            </Link>
            <Link href="#moodboards" className="text-[11px] uppercase tracking-[0.2em] text-foreground/60 hover:text-foreground transition-colors">
              Moodboards
            </Link>
            <Link href="#demo" className="text-[11px] uppercase tracking-[0.2em] text-foreground/60 hover:text-foreground transition-colors">
              Demo
            </Link>
          </nav>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-[11px] uppercase tracking-[0.15em] text-foreground/60 hover:text-foreground transition-colors hidden sm:block"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login"
              className="text-[11px] uppercase tracking-[0.2em] px-6 py-2.5 border border-foreground/25 hover:border-foreground/60 hover:bg-foreground hover:text-background transition-all duration-300"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      <main>

        {/* ─── Hero — Fullscreen cinématico ─── */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/dashboard-bg.png')" }}
          />
          <div className="absolute inset-0 bg-black/50" />

          <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-8">
              Software para interioristas y arquitectos
            </p>
            <h1
              className="text-4xl sm:text-5xl md:text-7xl font-light tracking-tight text-white leading-[1.1] mb-8"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              De cualquier enlace<br className="hidden md:block" /> a un catálogo profesional
            </h1>
            <div className="w-12 h-px bg-white/30 mx-auto mb-8" />
            <p className="text-base md:text-lg font-light text-white/60 max-w-xl mx-auto mb-12 leading-relaxed">
              Captura productos de cualquier tienda online, organiza tu selección
              por estancias y genera documentos impecables en segundos.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-white/80 border border-white/25 px-8 py-3.5 hover:bg-white hover:text-black transition-all duration-500"
            >
              Comenzar ahora
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </section>


        {/* ─── Manifiesto ─── */}
        <section className="py-32 md:py-40">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary">
              El software
            </span>
            <div className="w-8 h-px bg-primary/30 mx-auto mt-4 mb-10" />
            <p
              className="text-2xl md:text-3xl font-light leading-relaxed text-foreground/80"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Kattlog nace de una necesidad real de los estudios de interiorismo:
              dejar de perder horas copiando productos a mano. Pega un enlace de
              cualquier tienda del mundo y nuestra inteligencia artificial extrae
              imágenes, precios, medidas y materiales al instante. Después, crea
              catálogos técnicos o moodboards artísticos con un solo click.
            </p>
          </div>
        </section>


        {/* ─── Full-bleed image break ─── */}
        <section className="relative h-[50vh] md:h-[65vh] overflow-hidden">
          <img
            src="/landing-interior-5.jpg"
            alt="Espacio de interiorismo"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background opacity-30" />
        </section>


        {/* ─── Proceso — 3 pasos ─── */}
        <section id="proceso" className="py-32 md:py-40 bg-foreground text-background">
          <div className="max-w-5xl mx-auto px-6">
            <div className="mb-20 text-center">
              <span className="text-[10px] uppercase tracking-[0.3em] text-background/40">
                Cómo funciona
              </span>
              <div className="w-8 h-px bg-background/20 mx-auto mt-4" />
            </div>

            <div className="space-y-0">
              {/* Step 01 */}
              <div className="border-t border-background/10 py-12 md:py-16 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 items-start">
                <div className="md:col-span-2">
                  <span
                    className="text-5xl md:text-6xl font-light text-background/10"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    01
                  </span>
                </div>
                <div className="md:col-span-4">
                  <h3 className="text-lg font-normal tracking-tight">Pega cualquier enlace</h3>
                </div>
                <div className="md:col-span-6">
                  <p className="text-sm text-background/50 leading-relaxed">
                    Copia la URL de un producto de cualquier tienda online — IKEA, Zara Home,
                    Westwing, Sklum, Amazon o la pequeña tienda artesanal que acabas de
                    descubrir. Kattlog funciona con todas.
                  </p>
                </div>
              </div>

              {/* Step 02 */}
              <div className="border-t border-background/10 py-12 md:py-16 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 items-start">
                <div className="md:col-span-2">
                  <span
                    className="text-5xl md:text-6xl font-light text-background/10"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    02
                  </span>
                </div>
                <div className="md:col-span-4">
                  <h3 className="text-lg font-normal tracking-tight">La IA extrae todo</h3>
                </div>
                <div className="md:col-span-6">
                  <p className="text-sm text-background/50 leading-relaxed">
                    Nuestro motor de inteligencia artificial analiza la página, identifica
                    los productos y extrae automáticamente fotografías, precios, dimensiones,
                    materiales y colores. Sin copiar y pegar nada manualmente.
                  </p>
                </div>
              </div>

              {/* Step 03 */}
              <div className="border-t border-background/10 py-12 md:py-16 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 items-start">
                <div className="md:col-span-2">
                  <span
                    className="text-5xl md:text-6xl font-light text-background/10"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    03
                  </span>
                </div>
                <div className="md:col-span-4">
                  <h3 className="text-lg font-normal tracking-tight">Genera tu documento</h3>
                </div>
                <div className="md:col-span-6">
                  <p className="text-sm text-background/50 leading-relaxed">
                    Elige entre un catálogo técnico PDF con fichas de producto o un moodboard
                    artístico de libre composición. Organiza por estancias, edita precios,
                    añade textos y exporta en el formato que necesites.
                  </p>
                </div>
              </div>

              <div className="border-t border-background/10" />
            </div>
          </div>
        </section>


        {/* ─── Catálogos — con imagen ─── */}
        <section id="catalogos" className="py-32 md:py-40">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
              {/* Text */}
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-primary">
                  Catálogos
                </span>
                <div className="w-8 h-px bg-primary/30 mt-4 mb-8" />
                <h2
                  className="text-3xl md:text-4xl font-light tracking-tight leading-tight mb-8"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Documentos técnicos<br />
                  con la elegancia<br />
                  que tus proyectos merecen
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-10 max-w-sm">
                  Genera catálogos estructurados con fichas de producto completas.
                  Perfectos para presupuestos, listas de compras y presentaciones
                  a cliente.
                </p>
                <ul className="space-y-0">
                  {[
                    'Layouts de cuadrícula automáticos',
                    'PDF de alta resolución',
                    'Excel con imágenes integradas',
                    'InDesign IDML nativo',
                    'Precios y textos editables',
                    'Organización por estancias',
                  ].map((item, i) => (
                    <li key={i} className="border-t border-border/30 py-3.5">
                      <p className="text-sm font-light text-foreground/70">— {item}</p>
                    </li>
                  ))}
                  <li className="border-t border-border/30" />
                </ul>
              </div>

              {/* Image */}
              <div className="relative">
                <img
                  src="/landing-interior-3.jpg"
                  alt="Interior minimalista"
                  className="w-full h-[500px] lg:h-[600px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent" />
              </div>
            </div>
          </div>
        </section>


        {/* ─── Full-bleed image break ─── */}
        <section className="relative h-[40vh] md:h-[55vh] overflow-hidden">
          <img
            src="/landing-interior-1.jpg"
            alt="Diseño de interiores"
            className="w-full h-full object-cover"
          />
        </section>


        {/* ─── Moodboards — con imagen ─── */}
        <section id="moodboards" className="py-32 md:py-40">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
              {/* Image */}
              <div className="relative order-2 lg:order-1">
                <img
                  src="/landing-interior-6.jpg"
                  alt="Espacio con carácter"
                  className="w-full h-[500px] lg:h-[600px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent" />
              </div>

              {/* Text */}
              <div className="order-1 lg:order-2">
                <span className="text-[10px] uppercase tracking-[0.3em] text-primary">
                  Moodboards
                </span>
                <div className="w-8 h-px bg-primary/30 mt-4 mb-8" />
                <h2
                  className="text-3xl md:text-4xl font-light tracking-tight leading-tight mb-8"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Composiciones visuales<br />
                  que enamoran<br />
                  a tus clientes
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-10 max-w-sm">
                  Combina productos, texturas y colores en un lienzo libre. Diseña
                  moodboards artísticos que transmitan la esencia de cada espacio.
                </p>
                <ul className="space-y-0">
                  {[
                    'Editor de composición libre',
                    'Capas ilimitadas y z-index',
                    'Textos y anotaciones con tipografías premium',
                    'Recorte de fondo con IA',
                    'Múltiples moodboards por proyecto',
                    'Exportación PNG, PDF y más',
                  ].map((item, i) => (
                    <li key={i} className="border-t border-border/30 py-3.5">
                      <p className="text-sm font-light text-foreground/70">— {item}</p>
                    </li>
                  ))}
                  <li className="border-t border-border/30" />
                </ul>
              </div>
            </div>
          </div>
        </section>


        {/* ─── Video Demo ─── */}
        <section id="demo" className="py-32 md:py-40 bg-foreground text-background">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-[10px] uppercase tracking-[0.3em] text-background/40">
                Demostración
              </span>
              <div className="w-8 h-px bg-background/20 mx-auto mt-4 mb-10" />
              <h2
                className="text-3xl md:text-4xl font-light tracking-tight leading-tight"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Ve Kattlog en acción
              </h2>
            </div>

            <div className="relative aspect-video bg-black/20 overflow-hidden">
              <video
                controls
                preload="none"
                playsInline
                poster="/dashboard-bg.png"
                className="w-full h-full object-contain"
              >
                <source src="/kattlog-demo.mp4" type="video/mp4" />
                Tu navegador no soporta la reproducción de video.
              </video>
            </div>

            <p className="text-center text-xs text-background/30 mt-6 tracking-wide">
              Del enlace al catálogo en menos de dos minutos
            </p>
          </div>
        </section>


        {/* ─── Doble imagen editorial ─── */}
        <section className="py-6 md:py-8">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="relative h-[300px] md:h-[450px] overflow-hidden">
                <img
                  src="/landing-interior-2.jpg"
                  alt="Arquitectura interior"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative h-[300px] md:h-[450px] overflow-hidden">
                <img
                  src="/landing-interior-4.jpg"
                  alt="Espacio de diseño"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>


        {/* ─── Biblioteca y organización ─── */}
        <section className="py-32 md:py-40">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary">
              Tu biblioteca
            </span>
            <div className="w-8 h-px bg-primary/30 mx-auto mt-4 mb-10" />
            <h2
              className="text-3xl md:text-4xl font-light tracking-tight leading-tight mb-8"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Todos tus productos,<br /> siempre organizados
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
              Cada producto que capturas se guarda en tu biblioteca personal.
              Filtra por marca o tipología, reutiliza productos en diferentes
              proyectos y organízalos por estancias — Salón, Dormitorio, Cocina
              o cualquier categoría que necesites. Tu catálogo crece contigo.
            </p>
          </div>
        </section>


        {/* ─── Compatibilidad ─── */}
        <section className="border-y border-border/30 py-16">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 mb-6">
              Compatible con cualquier tienda online
            </p>
            <p className="text-sm text-muted-foreground/50 leading-loose tracking-wide">
              Zara Home&ensp;·&ensp;IKEA&ensp;·&ensp;Westwing&ensp;·&ensp;Sklum&ensp;·&ensp;Maisons du Monde&ensp;·&ensp;Amazon&ensp;·&ensp;El Corte Inglés&ensp;·&ensp;H&M Home&ensp;·&ensp;Leroy Merlin&ensp;·&ensp;y cualquier otra
            </p>
          </div>
        </section>


        {/* ─── Descarga ─── */}
        <section id="descargar" className="py-32 md:py-40">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary">
              App de escritorio
            </span>
            <div className="w-8 h-px bg-primary/30 mx-auto mt-4 mb-10" />
            <h2
              className="text-3xl md:text-4xl font-light tracking-tight leading-tight mb-6"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Descarga Kattlog
            </h2>
            <p className="text-sm text-muted-foreground mb-12 max-w-md mx-auto">
              Disponible como aplicación de escritorio para macOS y Windows.
              Versión 1.0.0.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://github.com/carlosmontojo/katalog/releases/download/v1.0.0/Katalog-1.0.0-arm64.dmg"
                className="inline-flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.15em] px-8 py-3.5 border border-foreground/20 hover:border-foreground/60 hover:bg-foreground hover:text-background transition-all duration-300"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Mac — Apple Silicon
                <Download className="w-3 h-3 opacity-40" />
              </a>
              <a
                href="https://github.com/carlosmontojo/katalog/releases/download/v1.0.0/Katalog-1.0.0.dmg"
                className="inline-flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.15em] px-8 py-3.5 border border-foreground/20 hover:border-foreground/60 hover:bg-foreground hover:text-background transition-all duration-300"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Mac — Intel
                <Download className="w-3 h-3 opacity-40" />
              </a>
              <a
                href="https://github.com/carlosmontojo/katalog/releases/download/v1.0.0/Katalog.Setup.1.0.0.exe"
                className="inline-flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.15em] px-8 py-3.5 border border-foreground/20 hover:border-foreground/60 hover:bg-foreground hover:text-background transition-all duration-300"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                </svg>
                Windows
                <Download className="w-3 h-3 opacity-40" />
              </a>
            </div>
          </div>
        </section>


        {/* ─── CTA Final ─── */}
        <section className="relative py-32 md:py-40 overflow-hidden">
          {/* Background image with overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/landing-interior-5.jpg')" }}
          />
          <div className="absolute inset-0 bg-black/60" />

          <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
            <div className="w-8 h-px bg-white/30 mx-auto mb-12" />
            <h2
              className="text-3xl md:text-4xl font-light tracking-tight leading-tight mb-8 text-white"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Deja de perder horas<br />
              en procesos manuales
            </h2>
            <p className="text-sm text-white/50 leading-relaxed max-w-md mx-auto mb-12">
              Desde el enlace hasta el catálogo final, en lo que tardas en tomar un café.
              Empieza hoy mismo de forma gratuita.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-white/80 border border-white/25 px-10 py-4 hover:bg-white hover:text-black transition-all duration-500"
            >
              Crear mi cuenta gratuita
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

      </main>


      {/* ─── Footer ─── */}
      <footer className="border-t border-border/30 py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <img src="/logo.png" alt="Kattlog" className="h-5 w-auto opacity-60" />
              <span className="text-xs text-muted-foreground/50">
                Software para interioristas y arquitectos
              </span>
            </div>
            <div className="flex items-center gap-8">
              <Link href="/login" className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 hover:text-foreground transition-colors">
                Producto
              </Link>
              <Link href="mailto:info@kattlog.com" className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 hover:text-foreground transition-colors">
                Contacto
              </Link>
              <Link href="/login" className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 hover:text-foreground transition-colors">
                Privacidad
              </Link>
              <Link href="/login" className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 hover:text-foreground transition-colors">
                Términos
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border/20 text-center">
            <p className="text-[10px] text-muted-foreground/30 tracking-wider">
              © 2026 Kattlog. Hecho con dedicación para el mundo del interiorismo.
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
