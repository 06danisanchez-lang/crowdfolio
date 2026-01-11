import { useState, useEffect, useCallback, useMemo } from 'react';
import { Opportunity, OpportunityStatus, RiskLevel, ProjectType } from '@/types/opportunity';
import { Platform } from '@/types/investment';
import { scrapeOpportunities, scrapeAllPlatforms, ScrapedOpportunity } from '@/lib/api/opportunities';

const STORAGE_KEY = 'crowdinvest-opportunities';

export interface OpportunityFilters {
  platform?: Platform;
  minReturn?: number;
  maxTerm?: number;
  projectType?: ProjectType;
  riskLevel?: RiskLevel;
  status?: OpportunityStatus;
  search?: string;
  favoritesOnly?: boolean;
}

export interface OpportunitySortConfig {
  field: 'expectedReturn' | 'term' | 'fundingProgress' | 'createdAt' | 'minInvestment';
  direction: 'asc' | 'desc';
}

export function useOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [lastScrapedAt, setLastScrapedAt] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [requiresFirecrawlSetup, setRequiresFirecrawlSetup] = useState(false);
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const [sortConfig, setSortConfig] = useState<OpportunitySortConfig>({ 
    field: 'expectedReturn', 
    direction: 'desc' 
  });

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setOpportunities(data.opportunities || []);
        setLastScrapedAt(data.lastScrapedAt || null);
      } catch (error) {
        console.error('Failed to parse stored opportunities:', error);
      }
    }
    setIsLoading(false);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        opportunities,
        lastScrapedAt,
      }));
    }
  }, [opportunities, lastScrapedAt, isLoading]);

  const scrape = useCallback(async (platform?: Platform) => {
    setIsScraping(true);
    setScrapeError(null);
    setRequiresFirecrawlSetup(false);

    try {
      let results;
      if (platform) {
        results = [await scrapeOpportunities(platform)];
      } else {
        results = await scrapeAllPlatforms();
      }

      const newOpportunities: Opportunity[] = [];
      let hasError = false;
      let errorMessage = '';

      for (const result of results) {
        if (result.requiresSetup) {
          setRequiresFirecrawlSetup(true);
          hasError = true;
          errorMessage = result.error || 'Firecrawl no está configurado';
          break;
        }

        if (!result.success) {
          hasError = true;
          errorMessage = result.error || 'Error al obtener oportunidades';
          continue;
        }

        if (result.opportunities) {
          for (const opp of result.opportunities) {
            const opportunity = convertScrapedToOpportunity(opp, result.platform as Platform, result.scrapedAt);
            newOpportunities.push(opportunity);
          }
        }
      }

      if (newOpportunities.length > 0) {
        setOpportunities(prev => {
          // Merge new opportunities with existing ones, avoiding duplicates
          const existingUrls = new Set(prev.map(o => o.url));
          const existingNames = new Set(prev.map(o => `${o.platform}-${o.projectName}`));
          
          const merged = [...prev];
          for (const opp of newOpportunities) {
            const key = `${opp.platform}-${opp.projectName}`;
            if (!existingUrls.has(opp.url) && !existingNames.has(key)) {
              merged.push(opp);
            } else {
              // Update existing opportunity
              const index = merged.findIndex(o => 
                o.url === opp.url || `${o.platform}-${o.projectName}` === key
              );
              if (index !== -1) {
                merged[index] = { 
                  ...merged[index], 
                  ...opp, 
                  id: merged[index].id,
                  isFavorite: merged[index].isFavorite,
                  notes: merged[index].notes,
                };
              }
            }
          }
          return merged;
        });
        setLastScrapedAt(new Date().toISOString());
      }

      if (hasError && newOpportunities.length === 0) {
        setScrapeError(errorMessage);
      }
    } catch (error) {
      console.error('Error during scraping:', error);
      setScrapeError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsScraping(false);
    }
  }, []);

  const addOpportunity = useCallback((data: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt' | 'source' | 'isFavorite'>) => {
    const now = new Date().toISOString();
    const newOpportunity: Opportunity = {
      ...data,
      id: crypto.randomUUID(),
      source: 'manual',
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    };
    setOpportunities(prev => [...prev, newOpportunity]);
    return newOpportunity;
  }, []);

  const updateOpportunity = useCallback((id: string, updates: Partial<Opportunity>) => {
    setOpportunities(prev => prev.map(opp => 
      opp.id === id 
        ? { ...opp, ...updates, updatedAt: new Date().toISOString() }
        : opp
    ));
  }, []);

  const deleteOpportunity = useCallback((id: string) => {
    setOpportunities(prev => prev.filter(opp => opp.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setOpportunities(prev => prev.map(opp => 
      opp.id === id 
        ? { ...opp, isFavorite: !opp.isFavorite, updatedAt: new Date().toISOString() }
        : opp
    ));
  }, []);

  const clearAllOpportunities = useCallback(() => {
    setOpportunities([]);
    setLastScrapedAt(null);
  }, []);

  // Filtered and sorted opportunities
  const filteredOpportunities = useMemo(() => {
    let result = [...opportunities];

    // Apply filters
    if (filters.platform) {
      result = result.filter(o => o.platform === filters.platform);
    }
    if (filters.minReturn !== undefined) {
      result = result.filter(o => o.expectedReturn >= filters.minReturn!);
    }
    if (filters.maxTerm !== undefined) {
      result = result.filter(o => o.term <= filters.maxTerm!);
    }
    if (filters.projectType) {
      result = result.filter(o => o.projectType === filters.projectType);
    }
    if (filters.riskLevel) {
      result = result.filter(o => o.riskLevel === filters.riskLevel);
    }
    if (filters.status) {
      result = result.filter(o => o.status === filters.status);
    }
    if (filters.favoritesOnly) {
      result = result.filter(o => o.isFavorite);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(o => 
        o.projectName.toLowerCase().includes(search) ||
        o.location.toLowerCase().includes(search) ||
        o.description?.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });

    return result;
  }, [opportunities, filters, sortConfig]);

  // Summary stats
  const summary = useMemo(() => {
    const openOpportunities = opportunities.filter(o => o.status === 'open');
    const avgReturn = openOpportunities.length > 0
      ? openOpportunities.reduce((sum, o) => sum + o.expectedReturn, 0) / openOpportunities.length
      : 0;

    return {
      total: opportunities.length,
      open: openOpportunities.length,
      favorites: opportunities.filter(o => o.isFavorite).length,
      averageReturn: avgReturn,
      byPlatform: opportunities.reduce((acc, o) => {
        acc[o.platform] = (acc[o.platform] || 0) + 1;
        return acc;
      }, {} as Record<Platform, number>),
    };
  }, [opportunities]);

  return {
    opportunities: filteredOpportunities,
    allOpportunities: opportunities,
    isLoading,
    isScraping,
    lastScrapedAt,
    scrapeError,
    requiresFirecrawlSetup,
    filters,
    setFilters,
    sortConfig,
    setSortConfig,
    summary,
    scrape,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    toggleFavorite,
    clearAllOpportunities,
  };
}

function convertScrapedToOpportunity(
  scraped: ScrapedOpportunity, 
  platform: Platform, 
  scrapedAt?: string
): Opportunity {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    platform,
    projectName: scraped.projectName || 'Proyecto sin nombre',
    projectType: (scraped.projectType as ProjectType) || 'other',
    location: scraped.location || '',
    expectedReturn: scraped.expectedReturn || 0,
    term: scraped.term || 12,
    minInvestment: scraped.minInvestment || 0,
    targetAmount: scraped.targetAmount || 0,
    currentAmount: scraped.currentAmount || 0,
    fundingProgress: scraped.fundingProgress || 0,
    status: (scraped.status as OpportunityStatus) || 'open',
    description: scraped.description,
    url: scraped.url,
    riskLevel: (scraped.riskLevel as RiskLevel) || 'medium',
    imageUrl: scraped.imageUrl,
    source: 'scraped',
    scrapedAt: scrapedAt || now,
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
  };
}
