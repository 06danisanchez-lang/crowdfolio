import { Bell, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { OpportunityAlert } from '@/types/opportunityAlert';
import { PLATFORMS } from '@/types/investment';
import { PROJECT_TYPES, RISK_LEVELS } from '@/types/opportunity';

interface AlertCardProps {
  alert: OpportunityAlert;
  onEdit: (alert: OpportunityAlert) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

export function AlertCard({ alert, onEdit, onDelete, onToggle }: AlertCardProps) {
  const getPlatformLabels = () => {
    if (alert.platforms.length === 0) return 'Todas las plataformas';
    return alert.platforms
      .map((p) => PLATFORMS.find((pl) => pl.value === p)?.label || p)
      .join(', ');
  };

  const getProjectTypeLabels = () => {
    if (alert.projectTypes.length === 0) return null;
    return alert.projectTypes
      .map((t) => PROJECT_TYPES.find((pt) => pt.value === t)?.label || t)
      .join(', ');
  };

  const getRiskLevelLabels = () => {
    if (alert.riskLevels.length === 0) return null;
    return alert.riskLevels
      .map((r) => RISK_LEVELS.find((rl) => rl.value === r)?.label || r)
      .join(', ');
  };

  const criteria: string[] = [];

  if (alert.minReturn !== undefined || alert.maxReturn !== undefined) {
    if (alert.minReturn !== undefined && alert.maxReturn !== undefined) {
      criteria.push(`${alert.minReturn}% - ${alert.maxReturn}% rentabilidad`);
    } else if (alert.minReturn !== undefined) {
      criteria.push(`> ${alert.minReturn}% rentabilidad`);
    } else if (alert.maxReturn !== undefined) {
      criteria.push(`< ${alert.maxReturn}% rentabilidad`);
    }
  }

  if (alert.maxTerm !== undefined) {
    criteria.push(`≤ ${alert.maxTerm} meses`);
  }

  if (alert.maxMinInvestment !== undefined) {
    criteria.push(`Inversión mín. ≤ ${alert.maxMinInvestment.toLocaleString('es-ES')}€`);
  }

  const projectTypes = getProjectTypeLabels();
  const riskLevels = getRiskLevelLabels();

  return (
    <Card className={`transition-opacity ${!alert.enabled ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0">
              <Bell className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate">{alert.name}</h4>
                <Badge variant={alert.enabled ? 'default' : 'secondary'} className="shrink-0">
                  {alert.enabled ? 'Activa' : 'Pausada'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{getPlatformLabels()}</p>
              <div className="flex flex-wrap gap-1.5">
                {criteria.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {c}
                  </Badge>
                ))}
                {projectTypes && (
                  <Badge variant="outline" className="text-xs">
                    {projectTypes}
                  </Badge>
                )}
                {riskLevels && (
                  <Badge variant="outline" className="text-xs">
                    Riesgo: {riskLevels}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={alert.enabled}
              onCheckedChange={(checked) => onToggle(alert.id, checked)}
            />
            <Button variant="ghost" size="icon" onClick={() => onEdit(alert)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(alert.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
