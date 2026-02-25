import { ChevronUp, User, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProfile } from '@/hooks/useProfile';
import { useTheme } from '@/contexts/ThemeContext';
import { View } from '@/types/investment';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

interface UserMenuProps {
  onViewChange: (view: View) => void;
  onSignOut: () => void;
  onCloseSidebar?: () => void;
}

export function UserMenu({ onViewChange, onSignOut, onCloseSidebar }: UserMenuProps) {
  const { displayName, avatarUrl } = useProfile();
  const { darkMode, toggleDarkMode } = useTheme();
  const { t } = useLanguage();

  const navigate = (view: View) => {
    onViewChange(view);
    onCloseSidebar?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors focus:outline-none">
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="text-xs">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate text-left font-medium">{displayName}</span>
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuItem onClick={() => navigate('profile')}>
          <User className="mr-2 h-4 w-4" />
          {t('usermenu.profile')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('settings')}>
          <Settings className="mr-2 h-4 w-4" />
          {t('usermenu.settings')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleDarkMode}>
          {darkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          {darkMode ? t('usermenu.lightMode') : t('usermenu.darkMode')}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <div className="flex items-center px-2 py-1.5">
            <LanguageToggle />
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {t('usermenu.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
