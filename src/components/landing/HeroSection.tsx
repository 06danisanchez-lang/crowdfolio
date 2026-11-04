import dashboardDesktop from '@/assets/landing/dashboard-desktop.webp';
import dashboardMobile from '@/assets/landing/dashboard-mobile.webp';

export default function HeroSection() {
  return (
    <section id="top" style={{
      position: 'relative', overflow: 'hidden',
      padding: 'clamp(72px,11vh,124px) 0 0',
      background: '#253765',
    }}>
      {/* Radial glow */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(720px 480px at 50% -6%, rgba(121,198,250,0.16), transparent 64%)',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 900, margin: '0 auto',
        padding: '0 clamp(16px,4vw,32px)',
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <h1 className="cf-reveal" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 600,
          fontSize: 'clamp(36px,5.4vw,64px)',
          lineHeight: 1.12,
          letterSpacing: '-0.015em',
          color: '#e4ddcf',
          marginBottom: 24,
          textWrap: 'balance',
        } as React.CSSProperties}>
          Tu cartera de crowdfunding inmobiliario, en un solo lugar.
        </h1>

        <p className="cf-reveal d1" style={{
          fontSize: 'clamp(17px,1.9vw,20px)',
          lineHeight: 1.6,
          color: 'rgba(255,255,255,0.74)',
          maxWidth: 620,
          margin: '0 auto 36px',
          textWrap: 'pretty',
        } as React.CSSProperties}>
          Visualiza toda tu cartera, planifica tus próximas inversiones, recibe alertas de tus proyectos y genera tu informe fiscal para la Renta.
        </p>

        {/* CTAs */}
        <div className="cf-reveal d2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">
          <a href="/auth" className="w-full sm:w-auto" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: '#79c6fa', color: '#141f3e',
            fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: '16.5px',
            padding: '16px 28px', borderRadius: 9, textDecoration: 'none',
            boxShadow: '0 6px 18px rgba(121,198,250,0.28)',
            transition: 'background .18s, transform .18s, box-shadow .18s',
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#9ad5ff'; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = '0 10px 26px rgba(121,198,250,.40)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#79c6fa'; el.style.transform = 'none'; el.style.boxShadow = '0 6px 18px rgba(121,198,250,.28)'; }}
          >Crear cuenta gratis</a>

          <a href="/auth" className="w-full sm:w-auto" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: '#eef2f9',
            fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: '16.5px',
            padding: '16px 28px', borderRadius: 9, textDecoration: 'none',
            border: '1px solid rgba(150,176,224,0.28)',
            transition: 'border-color .18s, color .18s',
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = '#79c6fa'; el.style.color = '#79c6fa'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = 'rgba(150,176,224,0.28)'; el.style.color = '#eef2f9'; }}
          >Iniciar sesión</a>
        </div>

        <p className="cf-reveal d2" style={{ marginTop: 22, fontSize: 14.5, color: '#9aa8c6' }}>
          Gratis para empezar y sin tarjeta.
        </p>
      </div>

      {/* Captura real de la app (cartera de ejemplo). Se corta en el borde inferior
          para que se lea como "la app sigue ahí abajo". */}
      <div className="cf-reveal d3" style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1080, margin: 'clamp(48px,7vh,72px) auto 0',
        padding: '0 clamp(16px,4vw,32px)',
      }}>
        <div className="cf-hero-shot" style={{
          borderRadius: '14px 14px 0 0', overflow: 'hidden',
          border: '1px solid rgba(150,176,224,0.22)', borderBottom: 'none',
          boxShadow: '0 -2px 0 rgba(255,255,255,0.04), 0 30px 80px rgba(10,18,40,0.45)',
          background: '#f8f7f4',
        }}>
          <picture>
            <source media="(max-width: 640px)" srcSet={dashboardMobile} />
            <img
              src={dashboardDesktop}
              alt="Pantalla de inicio de Crowdfolio con una cartera de ejemplo: capital activo, beneficio acumulado, alertas y próximos vencimientos"
              width={1600} height={975}
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
          </picture>
        </div>
      </div>
    </section>
  );
}
