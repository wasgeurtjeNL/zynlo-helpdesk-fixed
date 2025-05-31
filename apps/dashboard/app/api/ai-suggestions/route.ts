import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

// Initialize OpenAI with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    // Initialize Supabase client with user's auth
    const cookieStore = cookies();
    const accessToken = cookieStore.get('sb-nkrytssezaefinbjgwnq-auth-token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request data
    const { 
      conversationHistory, 
      language = 'nl', 
      ticketId 
    } = await req.json();

    if (!conversationHistory || conversationHistory.length === 0) {
      return NextResponse.json({ error: 'Conversation history is required' }, { status: 400 });
    }

    // Start performance tracking
    const startTime = Date.now();

    // Check user's AI usage limit
    const { data: usageData, error: usageError } = await supabase
      .rpc('check_ai_usage', { user_id: user.id })
      .single();

    if (usageError || !usageData) {
      console.error('Usage check error:', usageError);
      return NextResponse.json({ error: 'Failed to check usage limits' }, { status: 500 });
    }

    // Type the usage data properly
    const usage = usageData as { can_use: boolean; requests_used?: number; requests_limit?: number };

    if (!usage.can_use) {
      return NextResponse.json({ 
        error: 'AI usage limit reached',
        usage: usage 
      }, { status: 429 });
    }

    // Get AI settings for system prompts
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('*')
      .single();

    // Use OpenAI to generate suggestions
    const systemPrompt = aiSettings?.system_prompts?.[language] || getDefaultSystemPrompt(language);
    
    // Prepare the conversation for OpenAI
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.isCustomer ? 'user' as const : 'assistant' as const,
        content: msg.content
      })),
      { 
        role: 'user' as const, 
        content: 'Geef 3 verschillende suggesties voor een reactie. Houd het professioneel en vriendelijk.' 
      }
    ];

    const response = await openai.chat.completions.create({
      model: aiSettings?.ai_config?.model || 'gpt-3.5-turbo',
      messages,
      temperature: aiSettings?.ai_config?.temperature || 0.7,
      max_tokens: aiSettings?.ai_config?.max_tokens || 500,
    });

    const aiSuggestions = response.choices[0]?.message?.content || '';
    const suggestions = aiSuggestions
      .split(/\d+\.\s+/)
      .filter(s => s.trim())
      .slice(0, 3);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Record AI usage
    await supabase.rpc('record_ai_usage', {
      p_user_id: user.id,
      p_tokens_used: response.usage?.total_tokens || 500,
      p_cost: (response.usage?.total_tokens || 500) * 0.000002, // Approximate cost
      p_model: aiSettings?.ai_config?.model || 'gpt-3.5-turbo',
      p_language: language
    });

    // Get updated usage for response
    const { data: updatedUsage } = await supabase
      .rpc('check_ai_usage', { user_id: user.id })
      .single();

    return NextResponse.json({ 
      suggestions,
      usage: updatedUsage,
      responseTime
    });

  } catch (error) {
    console.error('AI suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

function getDefaultSystemPrompt(language: string): string {
  const prompts: Record<string, string> = {
    nl: `Je bent een vriendelijke en professionele klantenservice medewerker. 
Je helpt klanten met hun vragen en problemen op een empathische en oplossingsgerichte manier.
Gebruik een natuurlijke, warme toon maar blijf professioneel.
Geef altijd duidelijke en concrete antwoorden.`,
    en: `You are a friendly and professional customer service representative.
You help customers with their questions and problems in an empathetic and solution-oriented manner.
Use a natural, warm tone but remain professional.
Always provide clear and concrete answers.`,
    de: `Sie sind ein freundlicher und professioneller Kundenservice-Mitarbeiter.
Sie helfen Kunden bei ihren Fragen und Problemen auf eine empathische und lösungsorientierte Weise.
Verwenden Sie einen natürlichen, warmen Ton, bleiben Sie aber professionell.
Geben Sie immer klare und konkrete Antworten.`,
    fr: `Vous êtes un représentant du service client amical et professionnel.
Vous aidez les clients avec leurs questions et problèmes de manière empathique et orientée solution.
Utilisez un ton naturel et chaleureux tout en restant professionnel.
Fournissez toujours des réponses claires et concrètes.`,
    es: `Eres un representante de servicio al cliente amable y profesional.
Ayudas a los clientes con sus preguntas y problemas de manera empática y orientada a soluciones.
Usa un tono natural y cálido pero mantente profesional.
Siempre proporciona respuestas claras y concretas.`
  };

  return prompts[language] || prompts['nl'];
} 