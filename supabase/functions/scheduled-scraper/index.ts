import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_URLS: Record<string, string> = {
  urbanitae: 'https://urbanitae.com/proyectos',
  housers: 'https://housers.com/es/oportunidades',
  estateguru: 'https://estateguru.co/home/marketplace',
  brickstarter: 'https://brickstarter.com/proyectos',
  wecity: 'https://wecity.com/proyectos',
};

const PLATFORMS = Object.keys(PLATFORM_URLS);

interface ScrapedOpportunity {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled opportunity scraper...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: subscriptions, error: usersError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .gte('updated_at', thirtyDaysAgo.toISOString());

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIds = subscriptions?.map(s => s.user_id) || [];
    console.log(`Found ${userIds.length} active users`);

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active users to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing opportunities to compare
    const { data: existingOpportunities } = await supabase
      .from('opportunities')
      .select('url, project_name, platform')
      .limit(1000);

    const existingKeys = new Set(
      (existingOpportunities || []).map(o => `${o.platform}-${o.project_name}`.toLowerCase())
    );
    const existingUrls = new Set(
      (existingOpportunities || []).map(o => o.url).filter(Boolean)
    );

    // Scrape all platforms
    const allScrapedOpportunities: Array<ScrapedOpportunity & { platform: string }> = [];

    for (const platform of PLATFORMS) {
      try {
        console.log(`Scraping ${platform}...`);
        const opportunities = await scrapePlatform(platform, firecrawlApiKey);
        allScrapedOpportunities.push(...opportunities.map(o => ({ ...o, platform })));
        console.log(`Found ${opportunities.length} opportunities from ${platform}`);
      } catch (error) {
        console.error(`Error scraping ${platform}:`, error);
      }
    }

    // Find new opportunities
    const newOpportunities = allScrapedOpportunities.filter(opp => {
      const key = `${opp.platform}-${opp.projectName}`.toLowerCase();
      const isNew = !existingKeys.has(key) && (!opp.url || !existingUrls.has(opp.url));
      return isNew;
    });

    console.log(`Found ${newOpportunities.length} new opportunities out of ${allScrapedOpportunities.length} total`);

    if (newOpportunities.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No new opportunities found',
          totalScraped: allScrapedOpportunities.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notifications for all active users
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: 'new_opportunity',
      title: `${newOpportunities.length} nuevas oportunidades`,
      message: `Hemos encontrado ${newOpportunities.length} nuevos proyectos de inversión en ${[...new Set(newOpportunities.map(o => o.platform))].join(', ')}`,
      data: { 
        opportunityCount: newOpportunities.length,
        platforms: [...new Set(newOpportunities.map(o => o.platform))],
        projects: newOpportunities.slice(0, 5).map(o => ({
          name: o.projectName,
          platform: o.platform,
          expectedReturn: o.expectedReturn
        }))
      },
      read: false
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Error creating notifications:', notifError);
    } else {
      console.log(`Created ${notifications.length} notifications for ${userIds.length} users`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newOpportunities: newOpportunities.length,
        totalScraped: allScrapedOpportunities.length,
        notifiedUsers: userIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scheduled scraper:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function scrapePlatform(platform: string, apiKey: string): Promise<ScrapedOpportunity[]> {
  const url = PLATFORM_URLS[platform];
  if (!url) return [];

  const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['extract'],
      extract: {
        prompt: `Extract all crowdfunding investment opportunities from this page. For each project, extract:
- projectName: the name of the project
- projectType: type of project (residential, commercial, logistics, hotel, mixed, land, or other)
- location: city and/or country
- expectedReturn: expected annual return percentage as a number (e.g., 12.5)
- term: investment term in months as a number
- minInvestment: minimum investment amount in euros as a number
- targetAmount: total funding goal in euros
- currentAmount: current amount funded in euros
- fundingProgress: funding progress as a percentage (0-100)
- status: one of "open", "coming_soon", "closed", or "funded"
- description: brief description of the project
- url: link to the project detail page (make absolute URL if relative)
- riskLevel: risk level - "low", "medium", or "high"
- imageUrl: project image URL if available

Return an array of objects with these fields. If a value is not available, use reasonable defaults.`,
        schema: {
          type: 'object',
          properties: {
            opportunities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  projectName: { type: 'string' },
                  projectType: { type: 'string' },
                  location: { type: 'string' },
                  expectedReturn: { type: 'number' },
                  term: { type: 'number' },
                  minInvestment: { type: 'number' },
                  targetAmount: { type: 'number' },
                  currentAmount: { type: 'number' },
                  fundingProgress: { type: 'number' },
                  status: { type: 'string' },
                  description: { type: 'string' },
                  url: { type: 'string' },
                  riskLevel: { type: 'string' },
                  imageUrl: { type: 'string' },
                },
              },
            },
          },
          required: ['opportunities'],
        },
      },
      onlyMainContent: true,
      waitFor: 3000,
    }),
  });

  const scrapeData = await scrapeResponse.json();

  if (!scrapeResponse.ok) {
    console.error(`Firecrawl error for ${platform}:`, scrapeData);
    return [];
  }

  const extractedData = scrapeData.data?.extract || scrapeData.extract || {};
  const opportunities: ScrapedOpportunity[] = extractedData.opportunities || [];

  return opportunities.map(opp => ({
    ...opp,
    projectType: normalizeProjectType(opp.projectType),
    status: normalizeStatus(opp.status),
    riskLevel: normalizeRiskLevel(opp.riskLevel),
    expectedReturn: Number(opp.expectedReturn) || 0,
    term: Number(opp.term) || 12,
    minInvestment: Number(opp.minInvestment) || 0,
    targetAmount: Number(opp.targetAmount) || 0,
    currentAmount: Number(opp.currentAmount) || 0,
    fundingProgress: Number(opp.fundingProgress) || 0,
  }));
}

function normalizeProjectType(type: string): string {
  const typeMap: Record<string, string> = {
    'residencial': 'residential',
    'comercial': 'commercial',
    'logístico': 'logistics',
    'logistico': 'logistics',
    'hotelero': 'hotel',
    'mixto': 'mixed',
    'suelo': 'land',
  };
  const lower = (type || '').toLowerCase();
  return typeMap[lower] || lower || 'other';
}

function normalizeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'abierto': 'open',
    'próximamente': 'coming_soon',
    'proximamente': 'coming_soon',
    'cerrado': 'closed',
    'financiado': 'funded',
    'completado': 'funded',
  };
  const lower = (status || '').toLowerCase();
  return statusMap[lower] || lower || 'open';
}

function normalizeRiskLevel(level: string): string {
  const levelMap: Record<string, string> = {
    'bajo': 'low',
    'medio': 'medium',
    'alto': 'high',
  };
  const lower = (level || '').toLowerCase();
  return levelMap[lower] || lower || 'medium';
}
