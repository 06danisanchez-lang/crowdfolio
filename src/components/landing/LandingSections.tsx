import { useState } from "react";

const IconChart = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#253765" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconShield = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#253765" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconBell = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#253765" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IconFile = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#253765" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IconUpload = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#253765" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);
const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconChevron = ({ open }: { open: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#253765" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const features = [
  {
    icon: <IconChart />,
    title: "Dashboard unificado",
    desc: "Visualiza todas tus inversiones en crowdfunding y crowdlending en un único panel. Rentabilidad, estado y evolución de un vistazo.",
  },
  {
    icon: <IconBell />,
    title: "Alertas inteligentes",
    desc: "Recibe notificaciones cuando una plataforma actualiza el estado de tu inversión. Nunca más te pierdas un cobro o una incidencia.",
  },
  {
    icon: <IconFile />,
    title: "Informe fiscal automático",
    desc: "Genera tu resumen fiscal listo para la Declaración de la Renta. Intereses, retenciones y rendimientos en un PDF organizado.",
  },
  {
    icon: <IconUpload />,
    title: "Importación desde PDF",
    desc: "Sube los extractos de tus plataformas y Crowdfolio extrae automáticamente los datos de tus inversiones con IA.",
  },
  {
    icon: <IconChart />,
    title: "Seguimiento de cartera",
    desc: "Planifica futuras inversiones, registra objetivos y sigue la evolución real de tu patrimonio invertido mes a mes.",
  },
  {
    icon: <IconShield />,
    title: "Datos seguros y privados",
    desc: "Tu información nunca sale de tu cuenta. No nos conectamos a tus plataformas. Tú controlas cada dato que introduces.",
  },
];

function Features() {
  return (
    <section style={{ background: "#e4ddcf", padding: "96px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ color: "#79c6fa", fontWeight: 700, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>
          Funcionalidades
        </p>
        <h2 style={{ color: "#253765", fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 800, textAlign: "center", marginBottom: 16, lineHeight: 1.2 }}>
          Todo lo que necesitas para gestionar<br />tus inversiones alternativas
        </h2>
        <p style={{ color: "#3f3623", opacity: 0.7, textAlign: "center", fontSize: 18, maxWidth: 600, margin: "0 auto 64px" }}>
          Diseñado específicamente para inversores en plataformas españolas de crowdfunding inmobiliario y crowdlending.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.55)",
              border: "1px solid rgba(37,55,101,0.1)",
              borderRadius: 16,
              padding: "28px 28px 32px",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(37,55,101,0.12)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: "rgba(37,55,101,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 18,
              }}>
                {f.icon}
              </div>
              <h3 style={{ color: "#253765", fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ color: "#3f3623", opacity: 0.75, lineHeight: 1.65, fontSize: 15 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    num: "01",
    title: "Crea tu cuenta gratis",
    desc: "Regístrate en segundos con email o Google. Sin tarjeta de crédito. Empieza a registrar hasta 3 inversiones de forma gratuita.",
  },
  {
    num: "02",
    title: "Añade tus inversiones",
    desc: "Introduce manualmente tus inversiones o importa los datos desde los PDFs de tus plataformas. Crowdfolio extrae todo automáticamente.",
  },
  {
    num: "03",
    title: "Controla y optimiza",
    desc: "Visualiza tu cartera completa, recibe alertas, y genera tu informe fiscal cuando llegue la época de la Renta. Todo en un clic.",
  },
];

function HowItWorks() {
  return (
    <section style={{ background: "#253765", padding: "96px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ color: "#79c6fa", fontWeight: 700, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>
          Cómo funciona
        </p>
        <h2 style={{ color: "#e4ddcf", fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 800, textAlign: "center", marginBottom: 64, lineHeight: 1.2 }}>
          En 3 pasos, tu cartera bajo control
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "0 16px" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                border: "2px solid rgba(121,198,250,0.4)",
                background: "rgba(121,198,250,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px",
              }}>
                <span style={{ color: "#79c6fa", fontWeight: 800, fontSize: 22 }}>{s.num}</span>
              </div>
              <h3 style={{ color: "#e4ddcf", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{s.title}</h3>
              <p style={{ color: "rgba(228,221,207,0.7)", lineHeight: 1.7, fontSize: 15 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 80,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 1,
          background: "rgba(121,198,250,0.15)",
          borderRadius: 16,
          overflow: "hidden",
        }}>
          {[
            { val: "+500", label: "Inversores registrados" },
            { val: "€2M+", label: "Cartera gestionada" },
            { val: "15+", label: "Plataformas compatibles" },
            { val: "100%", label: "Datos privados y seguros" },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: "32px 24px",
              textAlign: "center",
              background: "rgba(37,55,101,0.6)",
              borderRight: i < 3 ? "1px solid rgba(121,198,250,0.15)" : "none",
            }}>
              <div style={{ color: "#79c6fa", fontSize: 36, fontWeight: 800, marginBottom: 6 }}>{stat.val}</div>
              <div style={{ color: "rgba(228,221,207,0.7)", fontSize: 14 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const [annual, setAnnual] = useState(false);

  const freeFeatures = [
    { text: "Hasta 3 inversiones", ok: true },
    { text: "1 importación PDF al mes", ok: true },
    { text: "Dashboard básico", ok: true },
    { text: "Alertas de estado", ok: false },
    { text: "Informe fiscal", ok: false },
    { text: "Importaciones ilimitadas", ok: false },
    { text: "Soporte prioritario", ok: false },
  ];

  const proFeatures = [
    { text: "Inversiones ilimitadas", ok: true },
    { text: "Importaciones ilimitadas", ok: true },
    { text: "Dashboard avanzado", ok: true },
    { text: "Alertas inteligentes", ok: true },
    { text: "Informe fiscal completo", ok: true },
    { text: "Exportación de datos", ok: true },
    { text: "Soporte prioritario", ok: true },
  ];

  return (
    <section style={{ background: "#e4ddcf", padding: "96px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <p style={{ color: "#79c6fa", fontWeight: 700, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>
          Precios
        </p>
        <h2 style={{ color: "#253765", fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 800, textAlign: "center", marginBottom: 12, lineHeight: 1.2 }}>
          Simple y transparente
        </h2>
        <p style={{ color: "#3f3623", opacity: 0.7, textAlign: "center", fontSize: 17, marginBottom: 40 }}>
          Empieza gratis. Sin compromiso. Actualiza cuando quieras.
        </p>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 48 }}>
          <span style={{ color: !annual ? "#253765" : "#3f3623", fontWeight: !annual ? 700 : 400, fontSize: 15 }}>Mensual</span>
          <button
            onClick={() => setAnnual(!annual)}
            style={{
              width: 48, height: 26, borderRadius: 999,
              background: annual ? "#253765" : "rgba(37,55,101,0.2)",
              border: "none", cursor: "pointer", position: "relative",
              transition: "background 0.3s",
            }}
          >
            <span style={{
              position: "absolute", top: 3, left: annual ? 25 : 3,
              width: 20, height: 20, borderRadius: "50%",
              background: annual ? "#79c6fa" : "#253765",
              transition: "left 0.3s",
            }} />
          </button>
          <span style={{ color: annual ? "#253765" : "#3f3623", fontWeight: annual ? 700 : 400, fontSize: 15 }}>
            Anual{" "}
            <span style={{
              background: "#253765", color: "#e4ddcf",
              fontSize: 11, fontWeight: 700, padding: "2px 8px",
              borderRadius: 999, marginLeft: 4,
            }}>
              −17%
            </span>
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{
            background: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(37,55,101,0.15)",
            borderRadius: 20, padding: "40px 36px",
          }}>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ color: "#253765", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Free</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ color: "#3f3623", fontSize: 48, fontWeight: 800, lineHeight: 1 }}>0€</span>
                <span style={{ color: "#3f3623", opacity: 0.5, fontSize: 15 }}>/mes</span>
              </div>
              <p style={{ color: "#3f3623", opacity: 0.6, fontSize: 14, marginTop: 8 }}>Para empezar a explorar</p>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 36px", display: "flex", flexDirection: "column", gap: 12 }}>
              {freeFeatures.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: f.ok ? "#3f3623" : "#9ca3af", fontSize: 15 }}>
                  <span style={{ color: f.ok ? "#253765" : "#9ca3af", flexShrink: 0 }}>
                    {f.ok ? <IconCheck /> : <IconX />}
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
            <a href="/auth" style={{
              display: "block", textAlign: "center",
              border: "2px solid #253765", borderRadius: 10,
              color: "#253765", fontWeight: 700, fontSize: 15,
              padding: "14px 0", textDecoration: "none",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = "#253765";
                (e.currentTarget as HTMLAnchorElement).style.color = "#e4ddcf";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color = "#253765";
              }}
            >
              Empezar gratis
            </a>
          </div>
          <div style={{
            background: "#253765",
            border: "1px solid rgba(121,198,250,0.3)",
            borderRadius: 20, padding: "40px 36px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 20, right: 20,
              background: "#79c6fa", color: "#253765",
              fontSize: 11, fontWeight: 800, padding: "4px 12px",
              borderRadius: 999, letterSpacing: "0.05em",
            }}>
              RECOMENDADO
            </div>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ color: "#e4ddcf", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Pro</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ color: "#79c6fa", fontSize: 48, fontWeight: 800, lineHeight: 1 }}>
                  {annual ? "4,92€" : "5,99€"}
                </span>
                <span style={{ color: "rgba(228,221,207,0.5)", fontSize: 15 }}>/mes</span>
              </div>
              {annual && (
                <p style={{ color: "rgba(228,221,207,0.55)", fontSize: 13, marginTop: 4 }}>
                  59€ facturado anualmente
                </p>
              )}
              <p style={{ color: "rgba(228,221,207,0.6)", fontSize: 14, marginTop: 8 }}>Control total de tu cartera</p>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 36px", display: "flex", flexDirection: "column", gap: 12 }}>
              {proFeatures.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: "#e4ddcf", fontSize: 15 }}>
                  <span style={{ color: "#79c6fa", flexShrink: 0 }}>
                    <IconCheck />
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
            <a href="/auth" style={{
              display: "block", textAlign: "center",
              background: "#79c6fa", border: "2px solid #79c6fa",
              borderRadius: 10, color: "#253765",
              fontWeight: 800, fontSize: 15,
              padding: "14px 0", textDecoration: "none",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = "#e4ddcf";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e4ddcf";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = "#79c6fa";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#79c6fa";
              }}
            >
              Empezar con Pro →
            </a>
          </div>
        </div>
        <p style={{ textAlign: "center", color: "#3f3623", opacity: 0.5, fontSize: 13, marginTop: 24 }}>
          ¿Eres de los primeros? Usa el código <strong style={{ color: "#253765" }}>CROWDFOUNDER</strong> y obtén 1 año de Pro gratis.
        </p>
      </div>
    </section>
  );
}

const faqs = [
  {
    q: "¿Crowdfolio se conecta a mis plataformas de crowdfunding?",
    a: "No. Crowdfolio no se conecta directamente a ninguna plataforma. Tú introduces los datos manualmente o importas los extractos PDF. Así tus credenciales siempre quedan fuera de nuestra plataforma.",
  },
  {
    q: "¿Qué plataformas son compatibles?",
    a: "Crowdfolio es compatible con las principales plataformas españolas: Urbanitae, Housers, Civislend, Inversa, October, Mintos, y muchas más. Si usas una plataforma que no aparece, puedes añadir inversiones manualmente.",
  },
  {
    q: "¿Para qué sirve el informe fiscal?",
    a: "Al hacer la Declaración de la Renta, necesitas declarar los rendimientos del capital mobiliario de tus inversiones en crowdfunding. Crowdfolio genera automáticamente un resumen con los intereses cobrados, retenciones y el desglose por plataforma.",
  },
  {
    q: "¿Puedo probar Crowdfolio antes de pagar?",
    a: "Sí. El plan Free es permanente y te permite registrar hasta 3 inversiones sin coste. Puedes actualizar a Pro en cualquier momento desde la configuración de tu cuenta.",
  },
  {
    q: "¿Cómo funciona la importación por PDF?",
    a: "Sube el extracto de movimientos en PDF de tu plataforma y nuestra IA identifica y extrae los datos de tus inversiones automáticamente. Compatible con la mayoría de formatos de exportación de plataformas españolas.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section style={{ background: "#f5f0e8", padding: "96px 24px" }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>
        <p style={{ color: "#79c6fa", fontWeight: 700, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>
          Preguntas frecuentes
        </p>
        <h2 style={{ color: "#253765", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 800, textAlign: "center", marginBottom: 56, lineHeight: 1.2 }}>
          Todo lo que necesitas saber
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.7)",
              border: `1px solid ${open === i ? "rgba(37,55,101,0.3)" : "rgba(37,55,101,0.1)"}`,
              borderRadius: 12,
              overflow: "hidden",
              transition: "border-color 0.2s",
            }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%", display: "flex", justifyContent: "space-between",
                  alignItems: "center", padding: "20px 24px",
                  background: "none", border: "none", cursor: "pointer",
                  textAlign: "left", gap: 16,
                }}
              >
                <span style={{ color: "#253765", fontWeight: 600, fontSize: 16, lineHeight: 1.4 }}>{faq.q}</span>
                <IconChevron open={open === i} />
              </button>
              <div style={{
                maxHeight: open === i ? 300 : 0,
                overflow: "hidden",
                transition: "max-height 0.35s ease",
              }}>
                <p style={{ color: "#3f3623", opacity: 0.8, lineHeight: 1.7, fontSize: 15, padding: "0 24px 24px" }}>
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTAFinal() {
  return (
    <section style={{ background: "#253765", padding: "100px 24px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{
          color: "#e4ddcf",
          fontSize: "clamp(2rem, 5vw, 3.2rem)",
          fontWeight: 800, lineHeight: 1.15, marginBottom: 24,
        }}>
          Tu cartera de crowdfunding,<br />
          <span style={{ color: "#79c6fa" }}>por fin organizada.</span>
        </h2>
        <p style={{ color: "rgba(228,221,207,0.7)", fontSize: 18, lineHeight: 1.7, marginBottom: 48, maxWidth: 500, margin: "0 auto 48px" }}>
          Únete a los inversores que ya controlan su cartera con Crowdfolio. Empieza gratis, sin tarjeta de crédito.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <a href="/auth" style={{
            background: "#79c6fa", color: "#253765",
            padding: "16px 36px", borderRadius: 12,
            fontWeight: 800, fontSize: 16, textDecoration: "none",
            transition: "transform 0.2s",
            display: "inline-block",
          }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"}
          >
            Crear cuenta gratis →
          </a>
          <a href="/pricing" style={{
            border: "2px solid rgba(228,221,207,0.4)", color: "#e4ddcf",
            padding: "16px 36px", borderRadius: 12,
            fontWeight: 600, fontSize: 16, textDecoration: "none",
            transition: "border-color 0.2s",
            display: "inline-block",
          }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(228,221,207,0.8)"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(228,221,207,0.4)"}
          >
            Ver precios
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: "#1a2847", padding: "56px 24px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 48, marginBottom: 56,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                <rect x="4" y="8" width="16" height="24" rx="2" fill="#253765" stroke="#79c6fa" strokeWidth="1"/>
                <rect x="20" y="8" width="16" height="24" rx="2" fill="#e4ddcf"/>
              </svg>
              <span style={{ color: "#e4ddcf", fontWeight: 800, fontSize: 16, letterSpacing: "0.05em" }}>
                CROWD<span style={{ fontWeight: 300 }}>FOLIO</span>
              </span>
            </div>
            <p style={{ color: "rgba(228,221,207,0.55)", fontSize: 14, lineHeight: 1.7, maxWidth: 260 }}>
              La plataforma para inversores españoles que quieren gestionar su cartera de crowdfunding e inversiones alternativas en un solo lugar.
            </p>
          </div>
          {[
            {
              title: "Producto",
              links: [
                { label: "Funcionalidades", href: "#features" },
                { label: "Precios", href: "/pricing" },
                { label: "Roadmap", href: "#" },
              ],
            },
            {
              title: "Cuenta",
              links: [
                { label: "Iniciar sesión", href: "/auth" },
                { label: "Crear cuenta", href: "/auth" },
                { label: "Panel de control", href: "/" },
              ],
            },
            {
              title: "Legal",
              links: [
                { label: "Privacidad", href: "#" },
                { label: "Términos de uso", href: "#" },
                { label: "Cookies", href: "#" },
              ],
            },
          ].map((col, i) => (
            <div key={i}>
              <h4 style={{ color: "#e4ddcf", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
                {col.title}
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map((l, j) => (
                  <li key={j}>
                    <a href={l.href} style={{ color: "rgba(228,221,207,0.55)", fontSize: 14, textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "#79c6fa"}
                      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "rgba(228,221,207,0.55)"}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{
          borderTop: "1px solid rgba(228,221,207,0.1)",
          paddingTop: 28,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 12,
        }}>
          <p style={{ color: "rgba(228,221,207,0.35)", fontSize: 13 }}>
            © {new Date().getFullYear()} Crowdfolio. Hecho con ♥ en España.
          </p>
          <p style={{ color: "rgba(228,221,207,0.35)", fontSize: 13 }}>
            crowdfolio.es
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingSections() {
  return (
    <>
      <Features />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <CTAFinal />
      <Footer />
    </>
  );
}
