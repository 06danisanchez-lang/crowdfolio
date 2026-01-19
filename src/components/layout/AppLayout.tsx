import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { Alert } from '@/hooks/useAlerts';
import { View } from '@/types/investment';
import { useAuth } from '@/contexts/AuthContext';
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
  const [darkMode, setDarkMode] = useState(false);
  const { user, isAdmin, signOut } = useAuth();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'investments' as View, label: 'Inversiones', icon: Wallet },
    { id: 'opportunities' as View, label: 'Oportunidades', icon: Search },
    { id: 'platforms' as View, label: 'Plataformas', icon: Building2 },
    { id: 'tax' as View, label: 'Fiscalidad', icon: Receipt },
    ...(isAdmin ? [{ id: 'admin' as View, label: 'Administración', icon: Shield }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-card px-4 lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <img src={crowdfolioLogo} alt="Crowdfolio" className="h-8" />
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
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-card transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex h-14 items-center gap-2 border-b px-6">
            <img src={crowdfolioLogo} alt="Crowdfolio" className="h-9" />
          </div>

          <nav className="space-y-1 p-4">
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
          </nav>

          {/* User info and logout */}
          <div className="absolute bottom-4 left-4 right-4 space-y-2">
            {user && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="truncate text-muted-foreground">{user.email}</p>
              </div>
            )}
            <div className="hidden lg:flex items-center gap-2">
              <NotificationBell onOpportunitiesClick={() => onViewChange('opportunities')} />
              <AlertsPanel 
                alerts={alerts} 
                alertCount={alertCount} 
                hasUrgentAlerts={hasUrgentAlerts}
                variant="full"
              />
            </div>
            <Button
              variant="outline"
              className="hidden w-full justify-start lg:flex"
              onClick={toggleDarkMode}
            >
              {darkMode ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  Modo Claro
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  Modo Oscuro
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="hidden w-full justify-start lg:flex"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
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
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
