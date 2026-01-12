import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Eres un experto en plataformas de crowdfunding inmobiliario españolas. Analiza la imagen proporcionada y extrae los datos de la inversión PERSONAL del usuario.

Plataformas conocidas: Urbanitae, Housers, Estateguru, Crowdcube, Brickstarter, Wecity, Civislend, Housfy, Walliance, Recrea.

IMPORTANTE - DISTINCIÓN DE IMPORTES:
- Busca ESPECÍFICAMENTE la inversión personal del usuario: "mi inversión", "mi aportación", "cantidad aportada", "importe de tu inversión", "has invertido", "tu participación", "importe invertido", "capital invertido por ti"
- NO confundas con importes del proyecto: "objetivo de financiación", "préstamo total", "importe del proyecto", "capital objetivo", "financiación obtenida", "importe del préstamo", "volumen total", "financiación total"
- Las inversiones personales típicas están entre 50€ y 50.000€
- Si el importe supera 100.000€, probablemente sea el total del proyecto y NO la inversión personal
- Si solo encuentras el importe total del proyecto y no la inversión personal, devuelve amount: null

Extrae la siguiente información en formato JSON:
- platform: el identificador de la plataforma (urbanitae, housers, estateguru, crowdcube, brickstarter, wecity, other)
- customPlatformName: nombre de la plataforma si es "other"
- projectName: nombre del proyecto inmobiliario
- amount: TU inversión personal en euros (solo el número, sin símbolo €). Si solo ves el total del proyecto, usa null.
- expectedReturn: rentabilidad anual esperada en porcentaje (solo el número, sin símbolo %)
- investmentDate: fecha de inversión en formato YYYY-MM-DD (si está disponible)
- expectedEndDate: fecha de vencimiento estimada en formato YYYY-MM-DD (si está disponible)
- status: estado de la inversión (active, pending, completed, defaulted)
- notes: información adicional. Si no encontraste la inversión personal pero sí el total del proyecto, indica: "Solo se encontró el importe total del proyecto (X€), no la inversión personal"

Si no puedes determinar un campo con certeza, usa null.
Responde SOLO con el JSON, sin explicaciones adicionales.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      console.error('No image provided');
      return new Response(
        JSON.stringify({ error: 'Se requiere una imagen' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing image for investment extraction...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analiza esta imagen y extrae los datos de la inversión en crowdfunding inmobiliario.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de peticiones excedido. Inténtalo de nuevo más tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes para procesar la imagen.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Error al procesar la imagen' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse the JSON from the response
    let extractedData;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      extractedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'No se pudo extraer información de la imagen',
          rawResponse: content 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted data:', extractedData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-investment-from-image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
