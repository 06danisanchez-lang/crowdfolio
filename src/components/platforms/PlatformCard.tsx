import { Building2, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlatform, PLATFORM_TYPES, PLATFORM_STATUS, COUNTRIES } from '@/types/userPlatform';

interface PlatformCardProps {
  platform: UserPlatform;
  investmentCount?: number;
  totalInvested?: number;
  onEdit: (platform: UserPlatform) => void;
  onDelete: (id: string) => void;
  onClick?: (platform: UserPlatform) => void;
}

export function PlatformCard({
  platform,
  investmentCount = 0,
  totalInvested = 0,
  onEdit,
  onDelete,
  onClick,
}: PlatformCardProps) {
  const country = COUNTRIES.find((c) => c.code === platform.countryCode);
  const platformType = PLATFORM_TYPES.find((t) => t.value === platform.platformType);
  const status = PLATFORM_STATUS.find((s) => s.value === platform.status);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      onClick={() => onClick?.(platform)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              {platform.logoUrl ? (
                <img
                  src={platform.logoUrl}
                  alt={platform.name}
                  className="w-8 h-8 object-contain rounded"
                />
              ) : (
                <Building2 className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg">{country?.flag}</span>
                <h3 className="font-semibold truncate">{platform.name}</h3>
                <Badge
                  variant="secondary"
                  className={`${status?.color} text-white text-xs`}
                >
                  {status?.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                <span>{platformType?.label}</span>
                {platform.registrationDate && (
                  <>
                    <span>·</span>
                    <span>Desde {formatDate(platform.registrationDate)}</span>
                  </>
                )}
              </div>
              {(investmentCount > 0 || totalInvested > 0) && (
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span className="text-muted-foreground">
                    {investmentCount} inversiones
                  </span>
                  <span className="font-medium text-primary">
                    {formatCurrency(totalInvested)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {platform.websiteUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <a href={platform.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(platform)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(platform.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
