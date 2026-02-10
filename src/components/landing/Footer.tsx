import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import crowdfolioLogo from '@/assets/crowdfolio-logo.png';
import TrustBadges from './TrustBadges';
import { LEGAL_ROUTES } from '@/lib/legal/routes';

export default function Footer() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30 py-12">
      <div className="container mx-auto px-4">
        {/* Trust badges */}
        <div className="mb-10">
          <TrustBadges />
        </div>
        
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <img 
            src={crowdfolioLogo} 
            alt="Crowdfolio" 
            className="h-16 md:h-20" 
          />
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <a 
              href="mailto:soporte@crowdfolio.es" 
              className="transition-colors hover:text-foreground"
            >
              Contacto
            </a>
            <button 
              onClick={() => navigate('/pricing')} 
              className="transition-colors hover:text-foreground"
            >
              Precios
            </button>
            <span className="text-muted-foreground/40">·</span>
            <Link to={LEGAL_ROUTES.legal} className="transition-colors hover:text-foreground">
              Aviso legal
            </Link>
            <Link to={LEGAL_ROUTES.privacy} className="transition-colors hover:text-foreground">
              Política de privacidad
            </Link>
            <Link to={LEGAL_ROUTES.terms} className="transition-colors hover:text-foreground">
              Términos y condiciones
            </Link>
            <Link to={LEGAL_ROUTES.cookies} className="transition-colors hover:text-foreground">
              Cookies
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground">
            © {currentYear} Crowdfolio. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
