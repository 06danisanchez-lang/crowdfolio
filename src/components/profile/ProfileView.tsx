import { useState, useRef } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ProfileView() {
  const { user } = useAuth();
  const { profile, avatarUrl, displayName, updateProfile, uploadAvatar, removeAvatar } = useProfile();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [nameInitialized, setNameInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (profile && !nameInitialized) {
    setName(profile.full_name || '');
    setNameInitialized(true);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) return;
    uploadAvatar.mutate(file);
  };

  const handleSave = () => {
    updateProfile.mutate(name);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
        <p className="text-muted-foreground">{t('profile.subtitle')}</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.photoTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-2xl">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
              >
                <Camera className="mr-2 h-4 w-4" />
                {uploadAvatar.isPending ? t('profile.uploading') : t('profile.uploadPhoto')}
              </Button>
              {avatarUrl && (
                <Button
                  variant="outline"
                  onClick={() => removeAvatar.mutate()}
                  disabled={removeAvatar.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('profile.removePhoto')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('profile.infoTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('profile.nameLabel')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('profile.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('profile.emailLabel')}</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <Button onClick={handleSave} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? t('profile.saving') : t('profile.saveBtn')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
