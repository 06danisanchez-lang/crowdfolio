import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlatform,
  UserPlatformFormData,
  PLATFORM_TYPES,
  PLATFORM_STATUS,
  COUNTRIES,
  DEFAULT_PLATFORM_FORM_DATA,
} from '@/types/userPlatform';

interface PlatformFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform?: UserPlatform;
  onSubmit: (data: UserPlatformFormData) => Promise<boolean>;
}

export function PlatformForm({
  open,
  onOpenChange,
  platform,
  onSubmit,
}: PlatformFormProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<UserPlatformFormData>(DEFAULT_PLATFORM_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (platform) {
      setFormData({
        name: platform.name,
        countryCode: platform.countryCode,
        platformType: platform.platformType,
        websiteUrl: platform.websiteUrl || '',
        registrationDate: platform.registrationDate || '',
        status: platform.status,
        username: platform.username || '',
        notes: platform.notes || '',
        defaultWithholding: platform.defaultWithholding,
      });
    } else {
      setFormData(DEFAULT_PLATFORM_FORM_DATA);
    }
  }, [platform, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    const success = await onSubmit(formData);
    setIsSubmitting(false);

    if (success) {
      onOpenChange(false);
      setFormData(DEFAULT_PLATFORM_FORM_DATA);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
        <DialogTitle>
            {platform ? t('platforms.form.editTitle') : t('platforms.form.addTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('platforms.form.name')} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Urbanitae"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="countryCode">{t('platforms.form.country')}</Label>
              <Select
                value={formData.countryCode}
                onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platformType">{t('platforms.form.type')}</Label>
              <Select
                value={formData.platformType}
                onValueChange={(value: any) => setFormData({ ...formData, platformType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website</Label>
            <Input
              id="websiteUrl"
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registrationDate">{t('platforms.form.registrationDate')}</Label>
              <Input
                id="registrationDate"
                type="date"
                value={formData.registrationDate}
                onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('common.status')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_STATUS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('platforms.form.username')}</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Tu nombre de usuario"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultWithholding">{t('platforms.form.withholding')}</Label>
              <Input
                id="defaultWithholding"
                type="number"
                min="0"
                max="100"
                value={formData.defaultWithholding}
                onChange={(e) =>
                  setFormData({ ...formData, defaultWithholding: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('common.notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas sobre esta plataforma..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? t('common.saving') : platform ? t('common.saveChanges') : t('platforms.form.addBtn')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
