import { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Menu,
  Moon,
  Sun,
  Search,
  LogOut,
  Receipt,
  Shield,
  Building2
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { LEGAL_ROUTES } from '@/lib/legal/routes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { UserMenu } from '@/components/layout/UserMenu';
import { Alert } from '@/hooks/useAlerts';
import { View } from '@/types/investment';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import crowdfolioLogo from '@/assets/crowdfolio-logo.png';

interface AppLayoutProps {
  children: React.ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
  alerts?: Alert[];
  alertCount?: number;
  hasUrgentAlerts?: boolean;
}

export function AppLayout({ 
  children, 
  currentView, 
  onViewChange,
  alerts = [],
  alertCount = 0,
  hasUrgentAlerts = false
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [currentView]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const navItems = [
    { id: 'dashboard' as View, label: 'Inicio', icon: LayoutDashboard },
    { id: 'investments' as View, label: 'Inversiones', icon: Wallet },
    { id: 'opportunities' as View, label: 'Oportunidades', icon: Search },
    { id: 'platforms' as View, label: 'Plataformas', icon: Building2 },
    { id: 'tax' as View, label: 'Fiscalidad', icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-card px-4 lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <img src={crowdfolioLogo} alt="Crowdfolio" className="h-16" />
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell onOpportunitiesClick={() => onViewChange('opportunities')} />
          <AlertsPanel 
            alerts={alerts} 
            alertCount={alertCount} 
            hasUrgentAlerts={hasUrgentAlerts} 
          />
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar sesión">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-card transition-transform lg:static lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex h-14 items-center gap-2 border-b px-6 shrink-0">
            <img src={crowdfolioLogo} alt="Crowdfolio" className="h-18" />
          </div>

          <nav className="flex-1 overflow-y-auto space-y-1 p-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  currentView === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <NotificationBell onOpportunitiesClick={() => onViewChange('opportunities')} />
              <AlertsPanel 
                alerts={alerts} 
                alertCount={alertCount} 
                hasUrgentAlerts={hasUrgentAlerts}
                variant="full"
              />
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  navigate('/admin-dashboard');
                  setSidebarOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Shield className="h-4 w-4" />
                Administración
              </button>
            )}
          </nav>

          <Separator />
          <div className="p-4 shrink-0">
            <UserMenu
              onViewChange={onViewChange}
              onSignOut={handleSignOut}
              onCloseSidebar={() => setSidebarOpen(false)}
            />
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main ref={mainRef} className="flex-1 overflow-auto">
          {children}
          <footer className="border-t py-4 px-6 mt-8">
            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <Link to={LEGAL_ROUTES.legal} className="hover:text-foreground transition-colors">Aviso legal</Link>
              <Link to={LEGAL_ROUTES.privacy} className="hover:text-foreground transition-colors">Política de privacidad</Link>
              <Link to={LEGAL_ROUTES.terms} className="hover:text-foreground transition-colors">Términos y condiciones</Link>
              <Link to={LEGAL_ROUTES.cookies} className="hover:text-foreground transition-colors">Cookies</Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
