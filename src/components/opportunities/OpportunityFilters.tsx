import { useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PLATFORMS, Platform } from '@/types/investment';
import { PROJECT_TYPES, RISK_LEVELS, OPPORTUNITY_STATUS_OPTIONS, ProjectType, RiskLevel, OpportunityStatus } from '@/types/opportunity';
import { OpportunityFilters as FiltersType, OpportunitySortConfig } from '@/hooks/useOpportunities';

interface OpportunityFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  sortConfig: OpportunitySortConfig;
  onSortChange: (sort: OpportunitySortConfig) => void;
  resultCount: number;
}

export function OpportunityFilters({
  filters,
  onFiltersChange,
  sortConfig,
  onSortChange,
  resultCount,
}: OpportunityFiltersProps) {
  const [sortContainer, setSortContainer] = useState<HTMLDivElement | null>(null);
  const [filtersContainer, setFiltersContainer] = useState<HTMLDivElement | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    if (!sortOpen) setSortContainer(null);
  }, [sortOpen]);

  useEffect(() => {
    if (!filtersOpen) setFiltersContainer(null);
  }, [filtersOpen]);

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '' && v !== false);

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="space-y-4">
      {/* Search and main controls */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, ubicación..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
            className="pl-9"
          />
        </div>

        {/* Platform filter */}
        <Select
          value={filters.platform || 'all'}
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            platform: value === 'all' ? undefined : value as Platform 
          })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las plataformas</SelectItem>
            {PLATFORMS.filter(p => p.value !== 'other' && p.value !== 'crowdcube').map(platform => (
              <SelectItem key={platform.value} value={platform.value}>
                {platform.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Popover modal={false} open={sortOpen} onOpenChange={setSortOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <ArrowUpDown className="h-4 w-4" />
              <span>Ordenar</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent ref={setSortContainer} align="end" disableAnimations className="w-56">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Ordenar por</div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSortOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Select
                value={sortConfig.field}
                onValueChange={(value) => onSortChange({ 
                  ...sortConfig, 
                  field: value as OpportunitySortConfig['field'] 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent container={sortContainer}>
                  <SelectItem value="expectedReturn">Rentabilidad</SelectItem>
                  <SelectItem value="term">Plazo</SelectItem>
                  <SelectItem value="fundingProgress">Progreso</SelectItem>
                  <SelectItem value="minInvestment">Inversión mínima</SelectItem>
                  <SelectItem value="createdAt">Fecha añadido</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortConfig.direction}
                onValueChange={(value) => onSortChange({ 
                  ...sortConfig, 
                  direction: value as 'asc' | 'desc' 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent container={sortContainer}>
                  <SelectItem value="desc">Mayor a menor</SelectItem>
                  <SelectItem value="asc">Menor a mayor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>

        {/* Advanced filters */}
        <Popover modal={false} open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  !
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent ref={setFiltersContainer} align="end" disableAnimations className="w-72">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Filtros avanzados</div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setFiltersOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Min return */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Rentabilidad mínima (%)</Label>
                <Input
                  type="number"
                  placeholder="Ej: 8"
                  value={filters.minReturn || ''}
                  onChange={(e) => onFiltersChange({ 
                    ...filters, 
                    minReturn: e.target.value ? Number(e.target.value) : undefined 
                  })}
                />
              </div>

              {/* Max term */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Plazo máximo (meses)</Label>
                <Input
                  type="number"
                  placeholder="Ej: 24"
                  value={filters.maxTerm || ''}
                  onChange={(e) => onFiltersChange({ 
                    ...filters, 
                    maxTerm: e.target.value ? Number(e.target.value) : undefined 
                  })}
                />
              </div>

              {/* Project type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tipo de proyecto</Label>
                <Select
                  value={filters.projectType || 'all'}
                  onValueChange={(value) => onFiltersChange({ 
                    ...filters, 
                    projectType: value === 'all' ? undefined : value as ProjectType 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent container={filtersContainer}>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {PROJECT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Risk level */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Nivel de riesgo</Label>
                <Select
                  value={filters.riskLevel || 'all'}
                  onValueChange={(value) => onFiltersChange({ 
                    ...filters, 
                    riskLevel: value === 'all' ? undefined : value as RiskLevel 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent container={filtersContainer}>
                    <SelectItem value="all">Todos los niveles</SelectItem>
                    {RISK_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => onFiltersChange({ 
                    ...filters, 
                    status: value === 'all' ? undefined : value as OpportunityStatus 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent container={filtersContainer}>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {OPPORTUNITY_STATUS_OPTIONS.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Favorites only */}
              <div className="flex items-center justify-between">
                <Label className="text-sm">Solo favoritos</Label>
                <Switch
                  checked={filters.favoritesOnly || false}
                  onCheckedChange={(checked) => onFiltersChange({ 
                    ...filters, 
                    favoritesOnly: checked || undefined 
                  })}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Results count and clear filters */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {resultCount} {resultCount === 1 ? 'oportunidad' : 'oportunidades'}
        </span>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-0">
            <X className="mr-1 h-3 w-3" />
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
