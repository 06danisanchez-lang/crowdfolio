import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { OpportunityAlert, OpportunityAlertFormData, DEFAULT_ALERT_FORM_DATA } from '@/types/opportunityAlert';
import { PLATFORMS, Platform } from '@/types/investment';
import { PROJECT_TYPES, RISK_LEVELS, ProjectType, RiskLevel, SCRAPING_PLATFORMS } from '@/types/opportunity';

interface AlertFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert?: OpportunityAlert;
  onSubmit: (data: OpportunityAlertFormData) => Promise<boolean>;
}

export function AlertForm({ open, onOpenChange, alert, onSubmit }: AlertFormProps) {
  const [formData, setFormData] = useState<OpportunityAlertFormData>(
    alert
      ? {
          name: alert.name,
          enabled: alert.enabled,
          minReturn: alert.minReturn,
          maxReturn: alert.maxReturn,
          platforms: alert.platforms,
          projectTypes: alert.projectTypes,
          riskLevels: alert.riskLevels,
          maxTerm: alert.maxTerm,
          maxMinInvestment: alert.maxMinInvestment,
          locations: alert.locations,
        }
      : DEFAULT_ALERT_FORM_DATA
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    const success = await onSubmit(formData);
    setIsSubmitting(false);

    if (success) {
      onOpenChange(false);
      setFormData(DEFAULT_ALERT_FORM_DATA);
    }
  };

  const togglePlatform = (platform: Platform) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const toggleProjectType = (type: ProjectType) => {
    setFormData((prev) => ({
      ...prev,
      projectTypes: prev.projectTypes.includes(type)
        ? prev.projectTypes.filter((t) => t !== type)
        : [...prev.projectTypes, type],
    }));
  };

  const toggleRiskLevel = (level: RiskLevel) => {
    setFormData((prev) => ({
      ...prev,
      riskLevels: prev.riskLevels.includes(level)
        ? prev.riskLevels.filter((l) => l !== level)
        : [...prev.riskLevels, level],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{alert ? 'Editar Alerta' : 'Nueva Alerta de Oportunidades'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la alerta</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Alta rentabilidad"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.enabled}
              onCheckedChange={(enabled) => setFormData((prev) => ({ ...prev, enabled }))}
            />
            <Label>Alerta activa</Label>
          </div>

          <div className="space-y-3">
            <Label>📊 Rentabilidad (%)</Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Mínima</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.minReturn ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      minReturn: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  placeholder="Sin mínimo"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Máxima</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.maxReturn ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maxReturn: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  placeholder="Sin máximo"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>🏢 Plataformas</Label>
            <p className="text-xs text-muted-foreground">Vacío = todas las plataformas</p>
            <div className="grid grid-cols-2 gap-2">
              {SCRAPING_PLATFORMS.map((platform) => (
                <div key={platform.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`platform-${platform.value}`}
                    checked={formData.platforms.includes(platform.value)}
                    onCheckedChange={() => togglePlatform(platform.value)}
                  />
                  <Label htmlFor={`platform-${platform.value}`} className="text-sm cursor-pointer">
                    {platform.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>🏠 Tipo de Proyecto</Label>
            <p className="text-xs text-muted-foreground">Vacío = todos los tipos</p>
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_TYPES.map((type) => (
                <div key={type.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={formData.projectTypes.includes(type.value)}
                    onCheckedChange={() => toggleProjectType(type.value)}
                  />
                  <Label htmlFor={`type-${type.value}`} className="text-sm cursor-pointer">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>⚠️ Nivel de Riesgo</Label>
            <p className="text-xs text-muted-foreground">Vacío = todos los niveles</p>
            <div className="flex gap-4">
              {RISK_LEVELS.map((level) => (
                <div key={level.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`risk-${level.value}`}
                    checked={formData.riskLevels.includes(level.value)}
                    onCheckedChange={() => toggleRiskLevel(level.value)}
                  />
                  <Label htmlFor={`risk-${level.value}`} className="text-sm cursor-pointer">
                    {level.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>⏱️ Plazo Máximo (meses)</Label>
            <Input
              type="number"
              min="1"
              value={formData.maxTerm ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxTerm: e.target.value ? parseInt(e.target.value) : undefined,
                }))
              }
              placeholder="Sin límite"
            />
          </div>

          <div className="space-y-3">
            <Label>💰 Inversión Mínima Máxima (€)</Label>
            <p className="text-xs text-muted-foreground">Solo proyectos donde puedas invertir desde este importe o menos</p>
            <Input
              type="number"
              min="0"
              value={formData.maxMinInvestment ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxMinInvestment: e.target.value ? parseFloat(e.target.value) : undefined,
                }))
              }
              placeholder="Sin límite"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? 'Guardando...' : alert ? 'Guardar Cambios' : 'Crear Alerta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
