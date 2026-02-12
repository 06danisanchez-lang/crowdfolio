import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Opportunity, OpportunityStatus, RiskLevel, ProjectType } from '@/types/opportunity';
import { Platform } from '@/types/investment';
import { scrapeOpportunities, scrapeAllPlatforms, ScrapedOpportunity } from '@/lib/api/opportunities';

const FETCH_TIMEOUT_MS = 15_000;

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
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [lastScrapedAt, setLastScrapedAt] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [requiresFirecrawlSetup, setRequiresFirecrawlSetup] = useState(false);
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const [sortConfig, setSortConfig] = useState<OpportunitySortConfig>({ field: 'expectedReturn', direction: 'desc' });
  const requestIdRef = useRef(0);

  const fetchOpportunities = useCallback(async () => {
    if (!user) {
      setOpportunities([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const currentId = ++requestIdRef.current;

    const timeoutId = setTimeout(() => {
      if (requestIdRef.current !== currentId) return;
      setIsLoading(false);
      setError('Timeout: la carga de oportunidades tardó demasiado');
    }, FETCH_TIMEOUT_MS);

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false });

      clearTimeout(timeoutId);
      if (requestIdRef.current !== currentId) return;
      if (dbError) throw dbError;

      const mappedOpportunities: Opportunity[] = (data || []).map(opp => ({
        id: opp.id, platform: opp.platform as Platform, projectName: opp.project_name,
        projectType: opp.project_type as ProjectType, location: opp.location,
        expectedReturn: Number(opp.expected_return), term: opp.term,
        minInvestment: Number(opp.min_investment), targetAmount: Number(opp.target_amount),
        currentAmount: Number(opp.current_amount), fundingProgress: Number(opp.funding_progress),
        status: opp.status as OpportunityStatus, description: opp.description || undefined,
        url: opp.url || undefined, riskLevel: opp.risk_level as RiskLevel,
        imageUrl: opp.image_url || undefined, source: opp.source as 'scraped' | 'manual',
        scrapedAt: opp.scraped_at || undefined, isFavorite: opp.is_favorite,
        notes: opp.notes || undefined, createdAt: opp.created_at, updatedAt: opp.updated_at,
      }));

      setOpportunities(mappedOpportunities);

      const scraped = mappedOpportunities.filter(o => o.scrapedAt);
      if (scraped.length > 0) {
        const latest = scraped.reduce((a, b) => new Date(a.scrapedAt!) > new Date(b.scrapedAt!) ? a : b);
        setLastScrapedAt(latest.scrapedAt!);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (requestIdRef.current !== currentId) return;
      console.error('Error fetching opportunities:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar oportunidades');
    } finally {
      clearTimeout(timeoutId);
      if (requestIdRef.current === currentId) {
        setIsLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchOpportunities();
    return () => { ++requestIdRef.current; };
  }, [fetchOpportunities]);

  const scrape = useCallback(async (platform?: Platform) => {
    if (!user) return;
    setIsScraping(true);
    setScrapeError(null);
    setRequiresFirecrawlSetup(false);

    try {
      let results;
      if (platform) { results = [await scrapeOpportunities(platform)]; }
      else { results = await scrapeAllPlatforms(); }

      const newOpportunities: Opportunity[] = [];
      let hasError = false;
      let errorMessage = '';

      for (const result of results) {
        if (result.requiresSetup) { setRequiresFirecrawlSetup(true); hasError = true; errorMessage = result.error || 'Firecrawl no está configurado'; break; }
        if (!result.success) { hasError = true; errorMessage = result.error || 'Error al obtener oportunidades'; continue; }
        if (result.opportunities) {
          for (const opp of result.opportunities) {
            newOpportunities.push(convertScrapedToOpportunity(opp, result.platform as Platform, result.scrapedAt));
          }
        }
      }

      if (newOpportunities.length > 0) {
        const scrapedAt = new Date().toISOString();
        for (const opp of newOpportunities) {
          const existingIndex = opportunities.findIndex(o => o.url === opp.url || `${o.platform}-${o.projectName}` === `${opp.platform}-${opp.projectName}`);
          if (existingIndex === -1) {
            const { error } = await supabase.from('opportunities').insert({
              user_id: user.id, platform: opp.platform, project_name: opp.projectName,
              project_type: opp.projectType, location: opp.location, expected_return: opp.expectedReturn,
              term: opp.term, min_investment: opp.minInvestment, target_amount: opp.targetAmount,
              current_amount: opp.currentAmount, funding_progress: opp.fundingProgress,
              status: opp.status, description: opp.description || null, url: opp.url || null,
              risk_level: opp.riskLevel, image_url: opp.imageUrl || null, source: 'scraped',
              scraped_at: scrapedAt, is_favorite: false,
            });
            if (error) console.error('Error inserting opportunity:', error);
          } else {
            const existing = opportunities[existingIndex];
            const { error } = await supabase.from('opportunities').update({
              expected_return: opp.expectedReturn, current_amount: opp.currentAmount,
              funding_progress: opp.fundingProgress, status: opp.status, scraped_at: scrapedAt,
            }).eq('id', existing.id);
            if (error) console.error('Error updating opportunity:', error);
          }
        }
        setLastScrapedAt(scrapedAt);
        fetchOpportunities();
      }

      if (hasError && newOpportunities.length === 0) { setScrapeError(errorMessage); }
    } catch (error) {
      console.error('Error during scraping:', error);
      setScrapeError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsScraping(false);
    }
  }, [user, opportunities, fetchOpportunities]);

  const addOpportunity = useCallback(async (data: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt' | 'source' | 'isFavorite'>) => {
    if (!user) return null;
    const { data: inserted, error } = await supabase.from('opportunities').insert({
      user_id: user.id, platform: data.platform, project_name: data.projectName,
      project_type: data.projectType, location: data.location, expected_return: data.expectedReturn,
      term: data.term, min_investment: data.minInvestment, target_amount: data.targetAmount,
      current_amount: data.currentAmount, funding_progress: data.fundingProgress,
      status: data.status, description: data.description || null, url: data.url || null,
      risk_level: data.riskLevel, image_url: data.imageUrl || null, source: 'manual',
      is_favorite: false, notes: data.notes || null,
    }).select().single();
    if (error) { console.error('Error adding opportunity:', error); return null; }
    const newOpportunity: Opportunity = {
      id: inserted.id, platform: inserted.platform as Platform, projectName: inserted.project_name,
      projectType: inserted.project_type as ProjectType, location: inserted.location,
      expectedReturn: Number(inserted.expected_return), term: inserted.term,
      minInvestment: Number(inserted.min_investment), targetAmount: Number(inserted.target_amount),
      currentAmount: Number(inserted.current_amount), fundingProgress: Number(inserted.funding_progress),
      status: inserted.status as OpportunityStatus, description: inserted.description || undefined,
      url: inserted.url || undefined, riskLevel: inserted.risk_level as RiskLevel,
      imageUrl: inserted.image_url || undefined, source: 'manual', isFavorite: false,
      notes: inserted.notes || undefined, createdAt: inserted.created_at, updatedAt: inserted.updated_at,
    };
    setOpportunities(prev => [newOpportunity, ...prev]);
    return newOpportunity;
  }, [user]);

  const updateOpportunity = useCallback(async (id: string, updates: Partial<Opportunity>) => {
    const dbUpdates: any = {};
    if (updates.platform !== undefined) dbUpdates.platform = updates.platform;
    if (updates.projectName !== undefined) dbUpdates.project_name = updates.projectName;
    if (updates.projectType !== undefined) dbUpdates.project_type = updates.projectType;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.expectedReturn !== undefined) dbUpdates.expected_return = updates.expectedReturn;
    if (updates.term !== undefined) dbUpdates.term = updates.term;
    if (updates.minInvestment !== undefined) dbUpdates.min_investment = updates.minInvestment;
    if (updates.targetAmount !== undefined) dbUpdates.target_amount = updates.targetAmount;
    if (updates.currentAmount !== undefined) dbUpdates.current_amount = updates.currentAmount;
    if (updates.fundingProgress !== undefined) dbUpdates.funding_progress = updates.fundingProgress;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.url !== undefined) dbUpdates.url = updates.url;
    if (updates.riskLevel !== undefined) dbUpdates.risk_level = updates.riskLevel;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await supabase.from('opportunities').update(dbUpdates).eq('id', id);
    if (error) { console.error('Error updating opportunity:', error); return; }
    setOpportunities(prev => prev.map(opp => opp.id === id ? { ...opp, ...updates, updatedAt: new Date().toISOString() } : opp));
  }, []);

  const deleteOpportunity = useCallback(async (id: string) => {
    const { error } = await supabase.from('opportunities').delete().eq('id', id);
    if (error) { console.error('Error deleting opportunity:', error); return; }
    setOpportunities(prev => prev.filter(opp => opp.id !== id));
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    const opportunity = opportunities.find(o => o.id === id);
    if (!opportunity) return;
    const { error } = await supabase.from('opportunities').update({ is_favorite: !opportunity.isFavorite }).eq('id', id);
    if (error) { console.error('Error toggling favorite:', error); return; }
    setOpportunities(prev => prev.map(opp => opp.id === id ? { ...opp, isFavorite: !opp.isFavorite, updatedAt: new Date().toISOString() } : opp));
  }, [opportunities]);

  const clearAllOpportunities = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from('opportunities').delete().eq('user_id', user.id);
    if (error) { console.error('Error clearing opportunities:', error); return; }
    setOpportunities([]);
    setLastScrapedAt(null);
  }, [user]);

  const filteredOpportunities = useMemo(() => {
    let result = [...opportunities];
    if (filters.platform) result = result.filter(o => o.platform === filters.platform);
    if (filters.minReturn !== undefined) result = result.filter(o => o.expectedReturn >= filters.minReturn!);
    if (filters.maxTerm !== undefined) result = result.filter(o => o.term <= filters.maxTerm!);
    if (filters.projectType) result = result.filter(o => o.projectType === filters.projectType);
    if (filters.riskLevel) result = result.filter(o => o.riskLevel === filters.riskLevel);
    if (filters.status) result = result.filter(o => o.status === filters.status);
    if (filters.favoritesOnly) result = result.filter(o => o.isFavorite);
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(o => o.projectName.toLowerCase().includes(search) || o.location.toLowerCase().includes(search) || o.description?.toLowerCase().includes(search));
    }
    result.sort((a, b) => {
      const aValue = a[sortConfig.field]; const bValue = b[sortConfig.field];
      if (typeof aValue === 'number' && typeof bValue === 'number') return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      if (typeof aValue === 'string' && typeof bValue === 'string') return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      return 0;
    });
    return result;
  }, [opportunities, filters, sortConfig]);

  const summary = useMemo(() => {
    const openOpportunities = opportunities.filter(o => o.status === 'open');
    const avgReturn = openOpportunities.length > 0 ? openOpportunities.reduce((sum, o) => sum + o.expectedReturn, 0) / openOpportunities.length : 0;
    return {
      total: opportunities.length, open: openOpportunities.length,
      favorites: opportunities.filter(o => o.isFavorite).length, averageReturn: avgReturn,
      byPlatform: opportunities.reduce((acc, o) => { acc[o.platform] = (acc[o.platform] || 0) + 1; return acc; }, {} as Record<Platform, number>),
    };
  }, [opportunities]);

  return {
    opportunities: filteredOpportunities, allOpportunities: opportunities,
    isLoading, error, isScraping, lastScrapedAt, scrapeError, requiresFirecrawlSetup,
    filters, setFilters, sortConfig, setSortConfig, summary,
    scrape, addOpportunity, updateOpportunity, deleteOpportunity,
    toggleFavorite, clearAllOpportunities, refetch: fetchOpportunities,
  };
}

function convertScrapedToOpportunity(scraped: ScrapedOpportunity, platform: Platform, scrapedAt?: string): Opportunity {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), platform,
    projectName: scraped.projectName || 'Proyecto sin nombre',
    projectType: (scraped.projectType as ProjectType) || 'other',
    location: scraped.location || '', expectedReturn: scraped.expectedReturn || 0,
    term: scraped.term || 12, minInvestment: scraped.minInvestment || 0,
    targetAmount: scraped.targetAmount || 0, currentAmount: scraped.currentAmount || 0,
    fundingProgress: scraped.fundingProgress || 0,
    status: (scraped.status as OpportunityStatus) || 'open',
    description: scraped.description, url: scraped.url,
    riskLevel: (scraped.riskLevel as RiskLevel) || 'medium',
    imageUrl: scraped.imageUrl, source: 'scraped', scrapedAt: scrapedAt || now,
    isFavorite: false, createdAt: now, updatedAt: now,
  };
}
