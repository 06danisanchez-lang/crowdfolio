import { Heart, ExternalLink, MapPin, Clock, TrendingUp, Building2, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Opportunity, PROJECT_TYPES, RISK_LEVELS, OPPORTUNITY_STATUS_OPTIONS } from '@/types/opportunity';
import { PLATFORMS } from '@/types/investment';
import { cn } from '@/lib/utils';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onToggleFavorite: (id: string) => void;
  onSelect: (opportunity: Opportunity) => void;
  isAlerted?: boolean;
  onToggleAlert?: (id: string) => void;
}

export function OpportunityCard({ opportunity, onToggleFavorite, onSelect, isAlerted, onToggleAlert }: OpportunityCardProps) {
  const platform = PLATFORMS.find(p => p.value === opportunity.platform);
  const projectType = PROJECT_TYPES.find(t => t.value === opportunity.projectType);
  const riskLevel = RISK_LEVELS.find(r => r.value === opportunity.riskLevel);
  const status = OPPORTUNITY_STATUS_OPTIONS.find(s => s.value === opportunity.status);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M €`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k €`;
    }
    return `${value.toFixed(0)} €`;
  };

  return (
    <Card 
      className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg"
      onClick={() => onSelect(opportunity)}
    >
      {/* Image or placeholder */}
      <div className="relative h-40 bg-gradient-to-br from-muted to-muted/50">
        {opportunity.imageUrl ? (
          <img 
            src={opportunity.imageUrl} 
            alt={opportunity.projectName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Platform badge */}
        <Badge 
          className="absolute left-3 top-3"
          style={{ 
            backgroundColor: `hsl(var(--${platform?.color || 'primary'}))`,
          }}
        >
          {platform?.label || opportunity.platform}
        </Badge>

        {/* Status badge */}
        {status && (
          <Badge 
            variant="secondary"
            className={cn("absolute right-3 top-3", status.color, "text-white")}
          >
            {status.label}
          </Badge>
        )}

        {/* Action buttons: Bell + Heart */}
        <div className="absolute bottom-3 right-3 flex gap-1">
          {onToggleAlert && (
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/80 backdrop-blur hover:bg-background h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onToggleAlert(opportunity.id);
              }}
              title={isAlerted ? 'Desactivar alerta' : 'Activar alerta'}
            >
              <Bell 
                className={cn(
                  "h-4 w-4 transition-colors",
                  isAlerted 
                    ? "fill-primary text-primary" 
                    : "text-muted-foreground"
                )} 
              />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 backdrop-blur hover:bg-background h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(opportunity.id);
            }}
          >
            <Heart 
              className={cn(
                "h-4 w-4 transition-colors",
                opportunity.isFavorite 
                  ? "fill-red-500 text-red-500" 
                  : "text-muted-foreground"
              )} 
            />
          </Button>
        </div>
      </div>

      <CardHeader className="pb-2">
        <h3 className="line-clamp-2 font-semibold leading-tight group-hover:text-primary">
          {opportunity.projectName}
        </h3>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="line-clamp-1">{opportunity.location || 'Sin ubicación'}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Rentabilidad
            </div>
            <div className="text-lg font-bold text-primary">
              {opportunity.expectedReturn.toFixed(1)}%
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Plazo
            </div>
            <div className="text-lg font-bold">
              {opportunity.term} meses
            </div>
          </div>
        </div>

        {/* Funding progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Financiado</span>
            <span className="font-medium">{opportunity.fundingProgress.toFixed(0)}%</span>
          </div>
          <Progress value={opportunity.fundingProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(opportunity.currentAmount)}</span>
            <span>{formatCurrency(opportunity.targetAmount)}</span>
          </div>
        </div>

        {/* Bottom info */}
        <div className="flex items-center justify-between border-t pt-3">
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Inversión mínima</div>
            <div className="font-semibold">{formatCurrency(opportunity.minInvestment)}</div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Project type */}
            <Badge variant="outline" className="text-xs">
              {projectType?.label || opportunity.projectType}
            </Badge>
            
            {/* Risk indicator */}
            <div 
              className={cn(
                "h-3 w-3 rounded-full",
                riskLevel?.color || "bg-yellow-500"
              )}
              title={`Riesgo ${riskLevel?.label || 'Medio'}`}
            />
          </div>
        </div>

        {/* External link */}
        {opportunity.url && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              window.open(opportunity.url, '_blank', 'noopener,noreferrer');
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver en {platform?.label || 'plataforma'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
