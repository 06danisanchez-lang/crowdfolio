import { supabase } from '@/integrations/supabase/client';
import { Platform } from '@/types/investment';

export interface ScrapeResult {
  success: boolean;
  error?: string;
  requiresSetup?: boolean;
  opportunities?: ScrapedOpportunity[];
  platform?: string;
  scrapedAt?: string;
}

export interface ScrapedOpportunity {
  projectName: string;
  projectType: string;
  location: string;
  expectedReturn: number;
  term: number;
  minInvestment: number;
  targetAmount: number;
  currentAmount: number;
  fundingProgress: number;
  status: string;
  description: string;
  url: string;
  riskLevel: string;
  imageUrl?: string;
}

export async function scrapeOpportunities(platform: Platform): Promise<ScrapeResult> {
  try {
    const { data, error } = await supabase.functions.invoke('scrape-opportunities', {
      body: { platform },
    });

    if (error) {
      console.error('Error invoking scrape function:', error);
      return { success: false, error: error.message };
    }

    return data as ScrapeResult;
  } catch (err) {
    console.error('Error scraping opportunities:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to scrape opportunities' 
    };
  }
}

export async function scrapeAllPlatforms(): Promise<ScrapeResult[]> {
  const platforms: Platform[] = ['urbanitae', 'housers', 'estateguru', 'brickstarter', 'wecity'];
  
  const results = await Promise.all(
    platforms.map(platform => scrapeOpportunities(platform))
  );
  
  return results;
}
