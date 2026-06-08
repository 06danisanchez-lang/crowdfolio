import { useState, useEffect } from 'react';
import AnnouncementBanner from '@/components/landing/AnnouncementBanner';
import HeroSection from '@/components/landing/HeroSection';
import LandingSections from '@/components/landing/LandingSections';
import crowdfolioMark from '@/assets/icon_crowdfolio.svg';

const REVEAL_CSS = `
  .cf-reveal { opacity:0; transform:translateY(24px); transition:opacity .7s cubic-bezier(.22,.61,.36,1), transform .7s cubic-bezier(.22,.61,.36,1); }
  .cf-reveal.in  { opacity:1; transform:none; }
  .cf-reveal.d1  { transition-delay:.08s; }
  .cf-reveal.d2  { transition-delay:.16s; }
  .cf-reveal.d3  { transition-delay:.24s; }
  @media(prefers-reduced-motion:reduce){ .cf-reveal{ opacity:1; transform:none; transition:none; } }
  .cf-nav-links, .cf-nav-login { display:flex; }
  @media(max-width:720px){ .cf-nav-links { display:none !important; } .cf-nav-login { display:none !important; } }
`;

const NAV_LINK: React.CSSProperties = {
  fontSize: 15, fontWeight: 500, color: '#b6c2da', textDecoration: 'none', transition: 'color .15s',
};

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'cf-landing-styles';
    style.textContent = REVEAL_CSS;
    document.head.appendChild(style);

    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target); }
      }),
      { threshold: 0.1 }
    );

    const t = setTimeout(() => {
      document.querySelectorAll('.cf-reveal').forEach(el => observer.observe(el));
    }, 80);

    return () => {
      clearTimeout(t);
      observer.disconnect();
      document.getElementById('cf-landing-styles')?.remove();
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#253765', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <AnnouncementBanner />

      {/* ── Nav ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 60,
        background: scrolled ? 'rgba(28,44,84,0.92)' : 'rgba(37,55,101,0.72)',
        backdropFilter: 'saturate(150%) blur(16px)',
        borderBottom: scrolled ? '1px solid rgba(150,176,224,0.16)' : '1px solid transparent',
        transition: 'background .3s, border-color .3s',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 76 }}>
          {/* Brand */}
          <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <span style={{ background: '#fff', borderRadius: 9, padding: '5px 6px', display: 'grid', placeItems: 'center', boxShadow: '0 1px 3px rgba(10,18,40,.28)' }}>
              <img src={crowdfolioMark} alt="" style={{ height: 24, width: 'auto', display: 'block' }} />
            </span>
            <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 19, color: '#eef2f9', letterSpacing: '0.01em' }}>
              <b style={{ fontWeight: 700 }}>CROWD</b>
              <span style={{ fontWeight: 300, color: '#b6c2da' }}>FOLIO</span>
            </span>
          </a>

          {/* Desktop nav links */}
          <nav className="cf-nav-links" style={{ alignItems: 'center', gap: 34 }}>
            {[['#funcionalidades','Funcionalidades'],['#como-funciona','Cómo funciona'],['#precios','Precios']].map(([href, label]) => (
              <a key={href} href={href} style={NAV_LINK}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#eef2f9'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#b6c2da'}
              >{label}</a>
            ))}
          </nav>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="/auth" className="cf-nav-login" style={{ fontSize: 15, fontWeight: 600, color: '#eef2f9', textDecoration: 'none', transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#79c6fa'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#eef2f9'}
            >Acceder</a>
            <a href="/auth" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: '#79c6fa', color: '#141f3e', fontWeight: 600, fontSize: '15.5px',
              padding: '10px 18px', borderRadius: 9, textDecoration: 'none',
              boxShadow: '0 6px 18px rgba(121,198,250,0.28)',
              transition: 'background .18s, transform .18s, box-shadow .18s',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#9ad5ff'; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = '0 10px 26px rgba(121,198,250,0.40)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#79c6fa'; el.style.transform = 'none'; el.style.boxShadow = '0 6px 18px rgba(121,198,250,0.28)'; }}
            >Crear cuenta gratis</a>
          </div>
        </div>
      </header>

      <HeroSection />
      <LandingSections />
    </div>
  );
}
