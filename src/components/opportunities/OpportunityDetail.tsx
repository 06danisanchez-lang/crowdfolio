import { 
  MapPin, 
  Clock, 
  TrendingUp, 
  ExternalLink, 
  Heart, 
  Trash2, 
  Building2,
  Calendar,
  AlertCircle,
  Wallet
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Opportunity, 
  PROJECT_TYPES, 
  RISK_LEVELS, 
  OPPORTUNITY_STATUS_OPTIONS 
} from '@/types/opportunity';
import { PLATFORMS } from '@/types/investment';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';

interface OpportunityDetailProps {
  opportunity: Opportunity | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Opportunity>) => void;
  onConvertToInvestment?: (opportunity: Opportunity) => void;
}

export function OpportunityDetail({ 
  opportunity, 
  onClose, 
  onToggleFavorite, 
  onDelete,
  onUpdate,
  onConvertToInvestment
}: OpportunityDetailProps) {
  const [notes, setNotes] = useState(opportunity?.notes || '');

  if (!opportunity) return null;

  const platform = PLATFORMS.find(p => p.value === opportunity.platform);
  const projectType = PROJECT_TYPES.find(t => t.value === opportunity.projectType);
  const riskLevel = RISK_LEVELS.find(r => r.value === opportunity.riskLevel);
  const status = OPPORTUNITY_STATUS_OPTIONS.find(s => s.value === opportunity.status);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleNotesBlur = () => {
    if (notes !== opportunity.notes) {
      onUpdate(opportunity.id, { notes });
    }
  };

  const handleDelete = () => {
    if (confirm('¿Estás seguro de que quieres eliminar esta oportunidad?')) {
      onDelete(opportunity.id);
      onClose();
    }
  };

  return (
    <Sheet open={!!opportunity} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader className="space-y-4">
          {/* Image */}
          <div className="relative -mx-6 -mt-6 h-48 bg-gradient-to-br from-muted to-muted/50">
            {opportunity.imageUrl ? (
              <img 
                src={opportunity.imageUrl} 
                alt={opportunity.projectName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Building2 className="h-20 w-20 text-muted-foreground/30" />
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute left-4 top-4 flex gap-2">
              <Badge 
                style={{ backgroundColor: `hsl(var(--${platform?.color || 'primary'}))` }}
              >
                {platform?.label || opportunity.platform}
              </Badge>
              {status && (
                <Badge className={cn(status.color, "text-white")}>
                  {status.label}
                </Badge>
              )}
            </div>
          </div>

          <SheetTitle className="text-left text-xl">
            {opportunity.projectName}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Location & type */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{opportunity.location || 'Sin ubicación'}</span>
            </div>
            <Badge variant="outline">
              {projectType?.label || opportunity.projectType}
            </Badge>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Rentabilidad
              </div>
              <div className="mt-1 text-2xl font-bold text-primary">
                {opportunity.expectedReturn.toFixed(1)}%
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Plazo
              </div>
              <div className="mt-1 text-2xl font-bold">
                {opportunity.term} meses
              </div>
            </div>
          </div>

          {/* Funding progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso de financiación</span>
              <span className="font-medium">{opportunity.fundingProgress.toFixed(1)}%</span>
            </div>
            <Progress value={opportunity.fundingProgress} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {formatCurrency(opportunity.currentAmount)} recaudados
              </span>
              <span className="font-medium">
                Objetivo: {formatCurrency(opportunity.targetAmount)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Inversión mínima</span>
              <div className="font-semibold">{formatCurrency(opportunity.minInvestment)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Nivel de riesgo</span>
              <div className="flex items-center gap-2">
                <div className={cn("h-3 w-3 rounded-full", riskLevel?.color || "bg-yellow-500")} />
                <span className="font-semibold">{riskLevel?.label || 'Medio'}</span>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Fuente</span>
              <div className="font-semibold capitalize">
                {opportunity.source === 'scraped' ? 'Automático' : 'Manual'}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Añadido</span>
              <div className="font-semibold">
                {formatDistanceToNow(new Date(opportunity.createdAt), { 
                  addSuffix: true, 
                  locale: es 
                })}
              </div>
            </div>
          </div>

          {/* Description */}
          {opportunity.description && (
            <>
              <Separator />
              <div>
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">Descripción</h4>
                <p className="text-sm">{opportunity.description}</p>
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Notas personales</h4>
            <Textarea
              placeholder="Añade tus notas sobre esta oportunidad..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              className="resize-none"
              rows={3}
            />
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            {opportunity.url && (
              <Button 
                className="w-full" 
                onClick={() => window.open(opportunity.url, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver en {platform?.label || 'plataforma'}
              </Button>
            )}

            {onConvertToInvestment && opportunity.status === 'open' && (
              <Button 
                variant="secondary"
                className="w-full"
                onClick={() => onConvertToInvestment(opportunity)}
              >
                <Wallet className="mr-2 h-4 w-4" />
                Convertir a Inversión
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onToggleFavorite(opportunity.id)}
              >
                <Heart 
                  className={cn(
                    "mr-2 h-4 w-4",
                    opportunity.isFavorite && "fill-red-500 text-red-500"
                  )} 
                />
                {opportunity.isFavorite ? 'Quitar favorito' : 'Añadir favorito'}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDelete}
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
