import crowdfolioLogo from '@/assets/logo_crowdfolio.svg';

export default function HeroSection() {
  return (
    <section id="top" style={{
      position: 'relative', overflow: 'hidden',
      padding: 'clamp(88px,13vh,148px) 0 clamp(92px,14vh,156px)',
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
        {/* Logo badge */}
        <div className="cf-reveal" style={{
          background: '#ffffff', borderRadius: 18,
          padding: 'clamp(14px,2vw,20px) clamp(16px,2.5vw,24px)',
          boxShadow: '0 8px 20px rgba(10,18,40,0.18), 0 30px 60px rgba(10,18,40,0.30)',
          marginBottom: 38,
          display: 'inline-block',
        }}>
          <img src={crowdfolioLogo} alt="Crowdfolio" style={{ width: 'min(148px,62vw)', height: 'auto', display: 'block' }} />
        </div>

        {/* H1 */}
        <h1 className="cf-reveal d1" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 600,
          fontSize: 'clamp(38px,5.4vw,64px)',
          lineHeight: 1.12,
          letterSpacing: '-0.015em',
          color: '#e4ddcf',
          marginBottom: 26,
          textWrap: 'balance',
        } as React.CSSProperties}>
          Tu cartera de crowdfunding inmobiliario,{' '}
          <em style={{ fontStyle: 'italic', color: '#79c6fa' }}>en un solo lugar.</em>
        </h1>

        {/* Subtitle */}
        <p className="cf-reveal d2" style={{
          fontSize: 'clamp(17px,1.9vw,20px)',
          lineHeight: 1.6,
          color: 'rgba(255,255,255,0.72)',
          maxWidth: 620,
          margin: '0 auto 38px',
          textWrap: 'pretty',
        } as React.CSSProperties}>
          Visualiza toda tu cartera, planifica tus próximas inversiones, recibe alertas de tus proyectos y genera tu informe fiscal para la Renta. Todo en un mismo lugar.
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

        {/* Trust line */}
        <p className="cf-reveal d3" style={{
          marginTop: 30,
          fontFamily: "'Hanken Grotesk', monospace", fontSize: 13,
          letterSpacing: '0.05em', color: '#8493b5',
        }}>
          Gratis para empezar · Sin tarjeta · En 2 minutos
        </p>
      </div>
    </section>
  );
}
