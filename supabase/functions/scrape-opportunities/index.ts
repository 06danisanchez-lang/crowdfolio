import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'No autorizado - se requiere autenticación' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error('Invalid token:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Token de autenticación inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    const { platform } = await req.json();

    if (!platform) {
      return new Response(
        JSON.stringify({ success: false, error: 'Platform is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Firecrawl no está configurado. Por favor, conecta Firecrawl en la configuración del proyecto.',
          requiresSetup: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = PLATFORM_URLS[platform];
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: `Platform "${platform}" not supported for scraping` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scraping opportunities from ${platform}: ${url} for user ${userId}`);

    // Use Firecrawl to scrape the page with JSON extraction
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

Return an array of objects with these fields. If a value is not available, use reasonable defaults (0 for numbers, empty string for text, "medium" for riskLevel).`,
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
      console.error('Firecrawl API error:', scrapeData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: scrapeData.error || `Scraping failed with status ${scrapeResponse.status}` 
        }),
        { status: scrapeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract opportunities from response - Firecrawl v1 returns extract data in data.extract
    const extractedData = scrapeData.data?.extract || scrapeData.extract || {};
    const opportunities: ScrapedOpportunity[] = extractedData.opportunities || [];
    
    console.log(`Successfully scraped ${opportunities.length} opportunities from ${platform}`);

    // Normalize and validate opportunities
    const normalizedOpportunities = opportunities.map((opp: ScrapedOpportunity) => ({
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        opportunities: normalizedOpportunities,
        platform,
        scrapedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping opportunities:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape opportunities';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
