import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import crowdfolioLogo from '@/assets/logo_crowdfolio.svg';
import TrustBadges from './TrustBadges';
import { LEGAL_ROUTES } from '@/lib/legal/routes';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Footer() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="border-t bg-muted/30 py-12">
      <div className="container mx-auto px-4">
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
              {t('footer.contact')}
            </a>
            <button 
              onClick={() => navigate('/pricing')} 
              className="transition-colors hover:text-foreground"
            >
              {t('footer.pricing')}
            </button>
            <span className="text-muted-foreground/40">·</span>
            <Link to={LEGAL_ROUTES.legal} className="transition-colors hover:text-foreground">
              {t('footer.legal')}
            </Link>
            <Link to={LEGAL_ROUTES.privacy} className="transition-colors hover:text-foreground">
              {t('footer.privacy')}
            </Link>
            <Link to={LEGAL_ROUTES.terms} className="transition-colors hover:text-foreground">
              {t('footer.terms')}
            </Link>
            <Link to={LEGAL_ROUTES.cookies} className="transition-colors hover:text-foreground">
              {t('footer.cookies')}
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground">
            © {currentYear} Crowdfolio. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
