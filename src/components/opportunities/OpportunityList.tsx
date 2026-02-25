import { Search, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Opportunity } from '@/types/opportunity';
import { OpportunityCard } from './OpportunityCard';
import { Skeleton } from '@/components/ui/skeleton';

interface OpportunityListProps {
  opportunities: Opportunity[];
  isLoading?: boolean;
  onToggleFavorite: (id: string) => void;
  onSelect: (opportunity: Opportunity) => void;
}

export function OpportunityList({ 
  opportunities, 
  isLoading, 
  onToggleFavorite, 
  onSelect 
}: OpportunityListProps) {
  const { t } = useLanguage();
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{t('opportunities.emptyTitle')}</h3>
        <p className="mb-6 max-w-md text-center text-muted-foreground">
          {t('opportunities.emptyDesc')}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>{t('opportunities.emptyHint')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {opportunities.map(opportunity => (
        <OpportunityCard
          key={opportunity.id}
          opportunity={opportunity}
          onToggleFavorite={onToggleFavorite}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
