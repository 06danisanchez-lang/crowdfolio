// ─── Shared helpers ────────────────────────────────────────────────────────────
const WRAP: React.CSSProperties = { maxWidth: 1180, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' };
const EYEBROW: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk', monospace", fontSize: 12.5, fontWeight: 600,
  letterSpacing: '0.18em', textTransform: 'uppercase' as const,
  color: '#79c6fa', display: 'block', marginBottom: 12,
};
const EYEBROW_BROWN: React.CSSProperties = { ...EYEBROW, color: '#837758' };
const DISPLAY_FONT = "'Playfair Display', Georgia, serif";

const CheckSVG = ({ color = '#79c6fa' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);

const LockSVG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
    <rect x="4" y="10" width="16" height="11" rx="2"/>
    <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
  </svg>
);

// ─── Problem ────────────────────────────────────────────────────────────────────
function Problem() {
  return (
    <section style={{ background: '#f1ece1', color: '#3f3623', padding: 'clamp(80px,10vw,110px) 0' }}>
      <div style={WRAP}>
        <span style={EYEBROW_BROWN}>El problema</span>
        <div className="cf-reveal" style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{
            fontFamily: DISPLAY_FONT, fontWeight: 500,
            fontSize: 'clamp(24px,3.4vw,40px)', lineHeight: 1.32,
            color: '#3f3623', letterSpacing: '-0.01em',
          }}>
            Tienes inversiones en{' '}
            <span style={{ color: '#837758' }}>cuatro plataformas distintas.</span>{' '}
            Abres cuatro webs cada semana. Calculas rentabilidades{' '}
            <span style={{ color: '#837758' }}>en una hoja de Excel</span>{' '}
            que nunca está al día. Y cada primavera llegas a la Renta{' '}
            <span style={{ color: '#837758' }}>sin saber exactamente cuánto has ganado.</span>
            <span style={{ display: 'block', marginTop: 30, fontStyle: 'italic', color: '#253765' }}>
              Diversificar tu patrimonio no debería costarte el control.
            </span>
          </p>
        </div>
        <div className="cf-reveal d1" style={{ textAlign: 'center', marginTop: 44 }}>
          <a href="#funcionalidades" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: '#253765', color: '#efe9dd',
            fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: '16.5px',
            padding: '16px 28px', borderRadius: 9, textDecoration: 'none',
            transition: 'background .18s, transform .18s',
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#1c2c54'; el.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#253765'; el.style.transform = 'none'; }}
          >Así lo resuelve CrowdFolio</a>
        </div>
      </div>
    </section>
  );
}

// ─── 4 Pillars ──────────────────────────────────────────────────────────────────
const PILLARS = [
  {
    num: '01', title: 'Visualiza tu cartera',
    desc: 'Toda tu inversión —capital, valor actual y rentabilidad— en un único panel, sea cual sea la plataforma donde inviertas.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  },
  {
    num: '02', title: 'Planifica a futuro',
    desc: 'Guarda y planifica tus próximas inversiones. Anticipa cobros y vencimientos con un calendario claro.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="M8 14l2.5 2.5L16 11"/></svg>,
  },
  {
    num: '03', title: 'Recibe alertas',
    desc: 'Avisos de cobros, cambios de estado y novedades de tus proyectos. Entérate sin tener que entrar a mirar.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>,
  },
  {
    num: '04', title: 'Informe fiscal',
    desc: 'Genera tu informe fiscal unificado para la Renta, con los rendimientos y retenciones de toda tu cartera.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>,
  },
];

function Pillars() {
  return (
    <section id="funcionalidades" style={{ background: '#1c2c54', padding: 'clamp(72px,10vw,104px) 0' }}>
      <div style={WRAP}>
        <div className="cf-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={EYEBROW}>Funcionalidades</span>
          <h2 style={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: 'clamp(28px,3.8vw,46px)', color: '#eef2f9', margin: '16px 0', lineHeight: 1.08 }}>
            Cuatro funciones. Una cartera bajo control.
          </h2>
          <p style={{ fontSize: 18.5, color: '#b6c2da', lineHeight: 1.6, maxWidth: 640, margin: '0 auto' }}>
            Todo lo que hoy haces a mano, repartido entre pestañas y hojas de cálculo, reunido en un solo lugar — sea cual sea la plataforma en la que inviertas.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {PILLARS.map((p, i) => (
            <div key={p.num} className={`cf-reveal${i > 0 ? ` d${i}` : ''}`} style={{
              background: 'linear-gradient(165deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))',
              border: '1px solid rgba(150,176,224,0.16)',
              borderRadius: 12, padding: '28px 24px 30px',
              transition: 'transform .25s, border-color .25s, background .25s',
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-4px)'; el.style.borderColor = 'rgba(121,198,250,0.4)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'none'; el.style.borderColor = 'rgba(150,176,224,0.16)'; }}
            >
              <div style={{ width: 50, height: 50, borderRadius: 13, background: 'rgba(121,198,250,0.12)', border: '1px solid rgba(121,198,250,0.28)', display: 'grid', placeItems: 'center', marginBottom: 22, color: '#79c6fa' }}>
                <span style={{ width: 25, height: 25, display: 'block' }}>{p.icon}</span>
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk', monospace", fontSize: 12, color: '#8493b5', marginBottom: 10 }}>{p.num}</div>
              <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 21, color: '#eef2f9', marginBottom: 10, lineHeight: 1.18 }}>{p.title}</h3>
              <p style={{ fontSize: 14.5, color: '#b6c2da', lineHeight: 1.55 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ───────────────────────────────────────────────────────────────
const STEPS = [
  { n: '1', title: 'Registra tus inversiones', desc: 'Añade tus proyectos de cada plataforma. Una sola vez, en minutos.' },
  { n: '2', title: 'CrowdFolio lo analiza', desc: 'Consolida tu rentabilidad, calendario y fiscalidad de forma automática.' },
  { n: '3', title: 'Tomas mejores decisiones', desc: 'Ves dónde estás de verdad y decides tu próxima inversión con datos.' },
];

function HowItWorks() {
  return (
    <section id="como-funciona" style={{ background: '#f1ece1', color: '#3f3623', padding: 'clamp(72px,10vw,104px) 0' }}>
      <div style={WRAP}>
        <div className="cf-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={EYEBROW_BROWN}>Así funciona</span>
          <h2 style={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: 'clamp(28px,3.8vw,46px)', color: '#3f3623', margin: '16px 0', lineHeight: 1.08 }}>
            De cuatro pestañas a una decisión.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 30, position: 'relative' }}>
          {STEPS.map((s, i) => (
            <div key={s.n} className={`cf-reveal${i > 0 ? ` d${i}` : ''}`} style={{ textAlign: 'center', padding: '0 8px', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 76, height: 76, margin: '0 auto 24px', borderRadius: '50%',
                background: '#253765', color: '#e4ddcf',
                fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: 32,
                display: 'grid', placeItems: 'center',
                boxShadow: '0 10px 24px rgba(37,55,101,0.28)',
                border: '4px solid #f1ece1',
              }}>{s.n}</div>
              <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 22, color: '#3f3623', marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 15.5, color: '#5e533c', maxWidth: 280, margin: '0 auto', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Fiscal Pro ─────────────────────────────────────────────────────────────────
const FISCAL_FEATS = [
  'Rendimientos y retenciones consolidados',
  'Exportable en PDF y Excel, listo para el IRPF',
  'Sin reunir certificados a mano nunca más',
];

function FiscalPro() {
  return (
    <section style={{ background: '#141f3e', position: 'relative', overflow: 'hidden', padding: 'clamp(72px,10vw,104px) 0' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(620px 420px at 88% 16%, rgba(121,198,250,0.16), transparent 60%)', pointerEvents: 'none' }} />
      <div style={WRAP}>
        <div className="cf-reveal" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontFamily: "'Hanken Grotesk', monospace", fontSize: 11.5, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            color: '#141f3e', background: '#79c6fa',
            padding: '5px 11px', borderRadius: 7, marginBottom: 18,
          }}>★ CrowdFolio Pro</span>
          <h2 style={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: 'clamp(28px,3.8vw,44px)', color: '#eef2f9', margin: '0 0 18px', lineHeight: 1.1 }}>
            Cada año, la Renta. Cada año, el mismo{' '}
            <em style={{ fontStyle: 'italic', color: '#79c6fa' }}>caos.</em>
          </h2>
          <p style={{ fontSize: 18, color: '#b6c2da', marginBottom: 30, maxWidth: 480, margin: '0 auto 30px' }}>
            Con CrowdFolio Pro generas tu informe fiscal unificado en un clic: rendimientos y retenciones de toda tu cartera, listos para tu declaración.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'inline-flex', flexDirection: 'column', gap: 14, textAlign: 'left', margin: '0 0 32px' }}>
            {FISCAL_FEATS.map(feat => (
              <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15.5, color: '#eef2f9' }}>
                <CheckSVG />
                {feat}
              </li>
            ))}
          </ul>
          <div>
            <a href="#precios" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: '#79c6fa', color: '#141f3e',
              fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: '16.5px',
              padding: '16px 28px', borderRadius: 9, textDecoration: 'none',
              boxShadow: '0 6px 18px rgba(121,198,250,0.28)',
              transition: 'background .18s, transform .18s',
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#9ad5ff'; el.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#79c6fa'; el.style.transform = 'none'; }}
            >Descubre CrowdFolio Pro</a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ────────────────────────────────────────────────────────────────────
const FREE_FEATS: Array<{ text: React.ReactNode }> = [
  { text: 'Hasta 3 inversiones activas o pendientes' },
  { text: '1 inversión futura' },
  { text: <>Resumen fiscal orientativo{' '}<span style={{ display:'inline-flex', alignItems:'center', gap:4, fontFamily:"'Hanken Grotesk', monospace", fontSize:10, fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase' as const, color:'#837758', background:'#e4ddcf', border:'1px solid #cabfa6', padding:'2px 8px 2px 6px', borderRadius:6, whiteSpace:'nowrap' as const, marginLeft:8 }}><LockSVG />{' '}Completo en Pro</span></> },
  { text: 'Notificaciones ilimitadas' },
];

const PRO_FEATS = [
  <><b>Inversiones activas ilimitadas</b></>,
  <>Inversiones futuras ilimitadas</>,
  <><b>Informe fiscal completo</b> + exportación PDF y Excel</>,
  <>Notificaciones ilimitadas</>,
];

function Pricing() {
  return (
    <section id="precios" style={{ background: '#f1ece1', color: '#3f3623', padding: 'clamp(72px,10vw,104px) 0' }}>
      <div style={WRAP}>
        <div className="cf-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={EYEBROW_BROWN}>Precios</span>
          <h2 style={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: 'clamp(28px,3.8vw,46px)', color: '#3f3623', margin: '16px 0', lineHeight: 1.08 }}>
            Empieza gratis. Sube a Pro cuando lo necesites.
          </h2>
          <p style={{ fontSize: 18, color: '#5e533c' }}>Sin permanencia. Cancela cuando quieras.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 26, maxWidth: 880, margin: '0 auto' }}>
          {/* Free */}
          <div className="cf-reveal" style={{
            background: '#f6f2ea', border: '1px solid #d9d0bd',
            borderRadius: 18, padding: '34px 32px 36px',
            boxShadow: '0 1px 2px rgba(63,54,35,.06), 0 14px 34px rgba(63,54,35,.10)',
          }}>
            <div style={{ fontFamily: "'Hanken Grotesk', monospace", fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#837758', fontWeight: 600, marginBottom: 16 }}>Free</div>
            <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: 46, color: '#3f3623', lineHeight: 1, marginBottom: 4 }}>0 €</div>
            <div style={{ fontSize: 13.5, color: '#837758', marginBottom: 24 }}>gratis para siempre</div>
            <hr style={{ border: 'none', borderTop: '1px solid #d9d0bd', margin: '0 0 24px' }} />
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 30 }}>
              {FREE_FEATS.map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, fontSize: 15, color: '#5e533c' }}>
                  <CheckSVG color="#253765" />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <a href="/auth" style={{
              display: 'block', textAlign: 'center', width: '100%',
              background: 'transparent', border: '1.5px solid #cabfa6', borderRadius: 10,
              color: '#3f3623', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 15,
              padding: '14px 0', textDecoration: 'none', transition: 'border-color .2s, background .2s',
              boxSizing: 'border-box' as const,
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = '#3f3623'; el.style.background = 'rgba(37,55,101,0.04)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = '#cabfa6'; el.style.background = 'transparent'; }}
            >Crear cuenta gratis</a>
          </div>

          {/* Pro */}
          <div className="cf-reveal d1" style={{
            background: '#253765', border: '1px solid rgba(121,198,250,0.2)',
            borderRadius: 18, padding: '34px 32px 36px',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(10,18,40,.20), 0 18px 40px rgba(10,18,40,.28)',
          }}>
            <span style={{
              position: 'absolute', top: 22, right: 24,
              display: 'inline-flex', alignItems: 'center', gap: 7,
              fontFamily: "'Hanken Grotesk', monospace", fontSize: 11.5, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              color: '#141f3e', background: '#79c6fa',
              padding: '5px 11px', borderRadius: 7,
            }}>Recomendado</span>
            <div style={{ fontFamily: "'Hanken Grotesk', monospace", fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#79c6fa', fontWeight: 600, marginBottom: 16 }}>Pro</div>
            <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 600, lineHeight: 1, marginBottom: 4 }}>
              <span style={{ fontSize: 46, color: '#eef2f9' }}>5,99 € </span>
              <small style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 16, fontWeight: 500, color: '#b6c2da', letterSpacing: 0 }}>/mes</small>
            </div>
            <div style={{ fontSize: 13.5, color: '#b6c2da', marginBottom: 24 }}>o 59 €/año — ahorra 2 meses</div>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(150,176,224,0.16)', margin: '0 0 24px' }} />
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 30 }}>
              {PRO_FEATS.map((feat, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, fontSize: 15, color: '#b6c2da' }}>
                  <CheckSVG color="#79c6fa" />
                  <span style={{ color: '#eef2f9' }}>{feat}</span>
                </li>
              ))}
            </ul>
            <a href="/auth" style={{
              display: 'block', textAlign: 'center', width: '100%',
              background: '#79c6fa', border: '2px solid #79c6fa', borderRadius: 10,
              color: '#141f3e', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 15,
              padding: '14px 0', textDecoration: 'none', transition: 'background .18s, border-color .18s, transform .18s',
              boxSizing: 'border-box' as const,
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#9ad5ff'; el.style.borderColor = '#9ad5ff'; el.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#79c6fa'; el.style.borderColor = '#79c6fa'; el.style.transform = 'none'; }}
            >Empezar con Pro</a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ──────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section style={{ background: '#253765', position: 'relative', overflow: 'hidden', padding: 'clamp(72px,10vw,104px) 0', textAlign: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(700px 380px at 50% -20%, rgba(121,198,250,0.18), transparent 62%)', pointerEvents: 'none' }} />
      <div style={{ ...WRAP, position: 'relative', zIndex: 1, maxWidth: 640 }}>
        <span className="cf-reveal" style={EYEBROW}>Empieza hoy</span>
        <h2 className="cf-reveal d1" style={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: 'clamp(32px,4.6vw,56px)', color: '#eef2f9', margin: '14px 0 16px', lineHeight: 1.08 }}>
          Empieza gratis hoy.
        </h2>
        <p className="cf-reveal d2" style={{ fontSize: 19, color: '#b6c2da', marginBottom: 32 }}>
          Sin tarjeta. Sin compromiso. En dos minutos tendrás toda tu cartera en un solo lugar.
        </p>
        <div className="cf-reveal d2">
          <a href="/auth" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: '#79c6fa', color: '#141f3e',
            fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 18,
            padding: '18px 40px', borderRadius: 9, textDecoration: 'none',
            boxShadow: '0 6px 18px rgba(121,198,250,0.28)',
            transition: 'background .18s, transform .18s',
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#9ad5ff'; el.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#79c6fa'; el.style.transform = 'none'; }}
          >Crear cuenta gratis</a>
        </div>
        <div className="cf-reveal d3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 22, fontSize: 14, color: '#8493b5' }}>
          <CheckSVG color="#79c6fa" />
          <span>Gratis para empezar · Sin tarjeta · Cancela cuando quieras</span>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────────
const FOOTER_COLS = [
  {
    title: 'Producto',
    links: [
      { label: 'Funcionalidades', href: '#funcionalidades' },
      { label: 'Cómo funciona', href: '#como-funciona' },
      { label: 'Precios', href: '#precios' },
      { label: 'Crear cuenta', href: '/auth' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Guía fiscal de la Renta', href: '#' },
      { label: 'Cómo registrar tus inversiones', href: '#' },
      { label: 'Preguntas frecuentes', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Política de privacidad', href: '#' },
      { label: 'Términos y condiciones', href: '#' },
      { label: 'Política de cookies', href: '#' },
      { label: 'Contacto', href: '#' },
    ],
  },
];

function Footer() {
  return (
    <footer style={{ background: '#141f3e', color: '#8493b5', padding: '64px 0 32px' }}>
      <div style={WRAP}>
        {/* Top grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 40, paddingBottom: 42, borderBottom: '1px solid rgba(150,176,224,0.16)', marginBottom: 24 }}>
          {/* Brand col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 18, color: '#eef2f9' }}>
                <b style={{ fontWeight: 700 }}>CROWD</b>
                <span style={{ fontWeight: 300, color: '#b6c2da' }}>FOLIO</span>
              </span>
            </div>
            <p style={{ fontSize: 14, maxWidth: 280, lineHeight: 1.6 }}>
              Toda tu cartera de crowdfunding inmobiliario, en un solo lugar. Visión global, alertas e informe fiscal para la Renta.
            </p>
          </div>
          {/* Link cols */}
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <h5 style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12.5, fontWeight: 700, color: '#eef2f9', letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: 15 }}>{col.title}</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {col.links.map(l => (
                  <a key={l.label} href={l.href} style={{ display: 'block', fontSize: 14.5, color: '#8493b5', padding: '5px 0', textDecoration: 'none', transition: 'color .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#79c6fa'}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#8493b5'}
                  >{l.label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
          <span>© {new Date().getFullYear()} CrowdFolio. Todos los derechos reservados.</span>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            {['Privacidad','Términos','Cookies'].map(l => (
              <a key={l} href="#" style={{ color: '#8493b5', textDecoration: 'none', transition: 'color .15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#79c6fa'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#8493b5'}
              >{l}</a>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p style={{ fontSize: 12, color: 'rgba(132,147,181,0.55)', lineHeight: 1.5, marginTop: 18, maxWidth: 780 }}>
          CrowdFolio es una herramienta de agregación y organización de inversiones. No es una entidad de inversión ni presta asesoramiento financiero o fiscal. Invertir en crowdfunding inmobiliario conlleva riesgos, incluida la posible pérdida del capital invertido.
        </p>
      </div>
    </footer>
  );
}

// ─── Export ─────────────────────────────────────────────────────────────────────
export default function LandingSections() {
  return (
    <>
      <Problem />
      <Pillars />
      <HowItWorks />
      <FiscalPro />
      <Pricing />
      <FinalCTA />
      <Footer />
    </>
  );
}
