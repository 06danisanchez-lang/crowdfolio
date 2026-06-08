import { useState, useEffect } from 'react';

const STORAGE_KEY = 'cf_banner_closed';

const BAR_CSS = `
  .cf-banner-text { font-size: 14.5px; }
  .cf-banner-cta { font-size: 14.5px; }
  @media (max-width: 720px) {
    .cf-banner-row { flex-direction: column; gap: 6px; text-align: center; }
    .cf-banner-text { font-size: 13px; }
    .cf-banner-cta { font-size: 13px; }
    .cf-banner-close { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); }
  }
`;

export default function AnnouncementBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== 'true') setVisible(true);
    } catch {
      setVisible(true);
    }

    const style = document.createElement('style');
    style.id = 'cf-banner-styles';
    style.textContent = BAR_CSS;
    document.head.appendChild(style);
    return () => { document.getElementById('cf-banner-styles')?.remove(); };
  }, []);

  const handleClose = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(90deg, #79c6fa, #9ad5ff)',
      color: '#141f3e',
    }}>
      <div className="cf-banner-row" style={{
        position: 'relative',
        maxWidth: 1180, margin: '0 auto', padding: '10px clamp(16px,4vw,32px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        <p className="cf-banner-text" style={{ margin: 0, fontWeight: 500 }}>
          🎉 Oferta de lanzamiento — Regístrate ahora y disfruta de <b style={{ fontWeight: 700 }}>1 mes Pro gratis</b> directamente.
        </p>
        <a
          href="/auth"
          className="cf-banner-cta"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontWeight: 700, color: '#141f3e', textDecoration: 'underline',
            whiteSpace: 'nowrap', transition: 'opacity .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.7'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
        >
          Empezar gratis →
        </a>

        <button
          type="button"
          aria-label="Cerrar anuncio"
          onClick={handleClose}
          className="cf-banner-close"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: '50%', border: 'none',
            background: 'rgba(20,31,62,0.12)', color: '#141f3e',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
            transition: 'background .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,31,62,0.22)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,31,62,0.12)'; }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
