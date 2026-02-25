import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { BillingSettings } from '@/components/subscription/BillingSettings';
import { toast } from 'sonner';

export function SettingsView() {
  const { updatePassword } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { t } = useLanguage();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t('errors.passwordShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('errors.passwordMismatch'));
      return;
    }
    setPasswordLoading(true);
    const { error } = await updatePassword(newPassword);
    setPasswordLoading(false);
    if (error) {
      toast.error(t('errors.passwordChange'));
    } else {
      toast.success(t('toast.passwordUpdated'));
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail) return;
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailLoading(false);
    if (error) {
      toast.error(t('errors.emailChange'));
    } else {
      toast.success(t('toast.emailSent'));
      setNewEmail('');
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.security')}</CardTitle>
            <CardDescription>{t('settings.security.desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t('settings.changePassword')}</h4>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('settings.newPassword')}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('settings.newPassword.placeholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('settings.confirmPassword')}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button onClick={handleChangePassword} disabled={passwordLoading}>
                {passwordLoading ? t('settings.changingPassword') : t('settings.changePasswordBtn')}
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t('settings.changeEmail')}</h4>
              <div className="space-y-2">
                <Label htmlFor="new-email">{t('settings.newEmail')}</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t('settings.newEmail.placeholder')}
                />
              </div>
              <Button onClick={handleChangeEmail} disabled={emailLoading}>
                {emailLoading ? t('settings.sendingEmail') : t('settings.changeEmailBtn')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.preferences')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <div>
                  <p className="text-sm font-medium">{t('settings.darkMode')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.darkMode.desc')}</p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            </div>
          </CardContent>
        </Card>

        <BillingSettings />
      </div>
    </div>
  );
}
