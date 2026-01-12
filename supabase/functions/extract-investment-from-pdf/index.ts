import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - esm.sh dynamic import
const unpdf = await import("https://esm.sh/unpdf@0.12.1");
const { extractText } = unpdf;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionó ningún PDF' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Extract text from PDF using unpdf (Deno-compatible via esm.sh)
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const pdfData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    console.log('Processing PDF, size:', pdfData.length, 'bytes');
    
    const { text: extractedText, totalPages } = await extractText(pdfData, { mergePages: true });

    console.log('Extracted text from PDF (', totalPages, 'pages):', extractedText.substring(0, 500) + '...');

    if (!extractedText || !extractedText.trim()) {
      return new Response(
        JSON.stringify({ 
          error: 'No se pudo extraer texto del PDF. Puede ser un documento escaneado. Prueba subiendo un pantallazo en su lugar.',
          isScannedDocument: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send extracted text to Gemini for analysis
    const systemPrompt = `Eres un experto en análisis de documentos de inversión en crowdfunding inmobiliario español.
Tu tarea es extraer información de la inversión PERSONAL del usuario de documentos PDF de plataformas como Urbanitae, Housers, Estateguru, Crowdcube, Brickstarter, Wecity, etc.

IMPORTANTE - DISTINCIÓN DE IMPORTES:
- Busca ESPECÍFICAMENTE la inversión personal del usuario: "mi inversión", "mi aportación", "cantidad aportada", "importe de tu inversión", "has invertido", "tu participación", "importe invertido", "capital invertido", "tu aportación"
- NO confundas con importes del proyecto total: "objetivo de financiación", "préstamo total", "importe del proyecto", "capital objetivo", "financiación obtenida", "importe del préstamo", "volumen total", "financiación total", "importe total del proyecto"
- Las inversiones personales típicas están entre 50€ y 50.000€
- Si el importe supera 100.000€, probablemente sea el total del proyecto y NO la inversión personal
- Si solo encuentras el importe total del proyecto y no la inversión personal, devuelve amount: null

Analiza el texto extraído del PDF y devuelve SOLO un objeto JSON con la siguiente estructura:
{
  "platform": "urbanitae" | "housers" | "estateguru" | "crowdcube" | "brickstarter" | "wecity" | "other",
  "customPlatformName": "nombre si es 'other'",
  "projectName": "nombre del proyecto",
  "amount": número (TU inversión personal en euros, sin símbolo) o null si solo se encontró el total del proyecto,
  "expectedReturn": número (rentabilidad anual esperada en porcentaje, ej: 12.5),
  "investmentDate": "YYYY-MM-DD",
  "expectedEndDate": "YYYY-MM-DD" o null,
  "status": "active" | "pending" | "completed" | "defaulted",
  "notes": "información adicional relevante. Si no encontraste la inversión personal pero sí el total del proyecto, indica: 'Solo se encontró el importe total del proyecto (X€), no la inversión personal'",
  "confidence": número entre 0 y 1 indicando confianza en la extracción
}

Instrucciones adicionales:
- Busca rentabilidad: "TIR", "rentabilidad", "rendimiento", "interés anual"
- Busca fechas: "fecha de inversión", "fecha de aportación", "vencimiento", "duración"
- Identifica la plataforma por el logo, nombre o formato del documento
- Si el proyecto está "en curso", "activo", "financiando" → status: "active"
- Si está "pendiente", "próximamente" → status: "pending"
- Si está "finalizado", "completado", "devuelto" → status: "completed"
- Si hay "impago", "default", "morosidad" → status: "defaulted"
- Convierte importes con formato español (1.000,50) a número (1000.50)
- Si no puedes extraer un campo, usa null`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analiza este texto extraído de un PDF de inversión y extrae los datos:\n\n${extractedText}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de solicitudes excedido. Inténtalo de nuevo en unos momentos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA agotados. Contacta con soporte.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No se recibió respuesta de la IA');
    }

    console.log('AI response:', content);

    // Parse JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta');
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData,
        source: 'pdf'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing PDF:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error procesando el PDF',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});