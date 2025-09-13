import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Advanced chat request received');
    
    const { message, sessionId, context = [], model = 'gpt-5-2025-08-07' } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    console.log(`💬 Processing message for user ${user.id}:`, message.substring(0, 100));

    // Generate cache key for semantic caching
    const contextString = context.join(' ');
    const cacheKey = await generateCacheKey(message + contextString);
    
    // Check semantic cache first
    const cachedResponse = await checkSemanticCache(user.id, cacheKey);
    if (cachedResponse) {
      console.log('🎯 Cache hit - returning cached response');
      return new Response(
        JSON.stringify({
          response: cachedResponse.response_data.content,
          cached: true,
          model: cachedResponse.response_data.model || model,
          sessionId: sessionId || cachedResponse.response_data.sessionId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch business data for context
    const businessContext = await fetchBusinessContext(user.id);
    console.log('📊 Business context fetched');

    // Build enhanced system prompt with long-term memory
    const systemPrompt = buildAdvancedSystemPrompt(businessContext, context);

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    // Call OpenAI API with advanced parameters
    console.log(`🤖 Calling OpenAI API with model: ${model}`);
    
    const openaiParams: any = {
      model,
      messages,
      max_completion_tokens: 2048,
      stream: false,
      user: user.id
    };

    // Only add temperature for legacy models
    if (model.includes('gpt-4') && !model.includes('gpt-5')) {
      openaiParams.temperature = 0.7;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openaiParams),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;
    const tokensUsed = data.usage?.total_tokens || 0;

    console.log(`✅ Response generated (${tokensUsed} tokens)`);

    // Handle session creation/update
    let finalSessionId = sessionId;
    if (!sessionId) {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from('wizard_chats')
        .insert({
          user_id: user.id,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        })
        .select()
        .single();

      if (sessionError) {
        console.error('❌ Error creating session:', sessionError);
      } else {
        finalSessionId = newSession.id;
        console.log('📁 New session created:', finalSessionId);
      }
    }

    // Save messages to database
    if (finalSessionId) {
      const messagesToSave = [
        {
          chat_id: finalSessionId,
          role: 'user',
          content: message,
          metadata: { model, context_used: context.length > 0 }
        },
        {
          chat_id: finalSessionId,
          role: 'assistant',
          content: assistantResponse,
          metadata: { model, tokens: tokensUsed, context_provided: context.length }
        }
      ];

      const { error: messagesError } = await supabase
        .from('wizard_messages')
        .insert(messagesToSave);

      if (messagesError) {
        console.error('❌ Error saving messages:', messagesError);
      } else {
        console.log('💾 Messages saved to database');
      }

      // Update session timestamp
      await supabase
        .from('wizard_chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', finalSessionId);
    }

    // Cache the response semantically
    await cacheSemanticResponse(user.id, cacheKey, {
      content: assistantResponse,
      model,
      sessionId: finalSessionId,
      tokens: tokensUsed
    });

    return new Response(
      JSON.stringify({
        response: assistantResponse,
        sessionId: finalSessionId,
        model,
        tokens: tokensUsed,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateCacheKey(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkSemanticCache(userId: string, cacheKey: string) {
  try {
    const { data, error } = await supabase
      .from('wizard_cache')
      .select('*')
      .eq('user_id', userId)
      .eq('query_hash', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error('Cache check error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error checking semantic cache:', error);
    return null;
  }
}

async function cacheSemanticResponse(userId: string, cacheKey: string, responseData: any) {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Cache for 7 days

    const { error } = await supabase
      .from('wizard_cache')
      .upsert({
        user_id: userId,
        query_hash: cacheKey,
        response_data: responseData,
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      console.error('Error caching response:', error);
    } else {
      console.log('💾 Response cached successfully');
    }
  } catch (error) {
    console.error('Error in cache operation:', error);
  }
}

async function fetchBusinessContext(userId: string) {
  try {
    console.log('📊 Fetching business context...');
    
    const [eventsResult, recipesResult, itemsResult, customersResult] = await Promise.all([
      supabase.from('event').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(20),
      supabase.from('recipe').select('*, recipe_item(*, item(*))').eq('user_id', userId).limit(50),
      supabase.from('item').select('*').eq('user_id', userId).limit(100),
      supabase.from('customer').select('*').eq('user_id', userId).limit(50)
    ]);

    return {
      events: eventsResult.data || [],
      recipes: recipesResult.data || [],
      items: itemsResult.data || [],
      customers: customersResult.data || []
    };
  } catch (error) {
    console.error('Error fetching business context:', error);
    return { events: [], recipes: [], items: [], customers: [] };
  }
}

function buildAdvancedSystemPrompt(businessContext: any, relevantContext: string[]) {
  const { events, recipes, items, customers } = businessContext;
  
  let prompt = `Você é o BuffetWiz IA, um assistente especializado em gestão de buffets e catering. Você tem acesso aos dados completos do negócio do usuário e pode realizar análises avançadas.

## CAPACIDADES PRINCIPAIS
- Análise financeira detalhada de eventos e receitas
- Otimização de custos e preços
- Cálculos automáticos de rentabilidade
- Sugestões estratégicas baseadas em dados históricos
- Exportação de relatórios em Excel, CSV ou JSON

## DADOS DISPONÍVEIS
### Eventos (${events.length} registros)
${events.slice(0, 5).map(e => `- ${e.title}: ${e.date}, ${e.numguests} convidados, Custo: R$ ${e.cost || 'N/A'}, Preço: R$ ${e.price || 'N/A'}`).join('\n')}

### Receitas (${recipes.length} registros)
${recipes.slice(0, 5).map(r => `- ${r.description}: Eficiência ${r.efficiency || 1.0}`).join('\n')}

### Insumos (${items.length} registros)
${items.slice(0, 5).map(i => `- ${i.description}: R$ ${i.cost || 'N/A'} por ${i.unit_use || 'unidade'}`).join('\n')}

### Clientes (${customers.length} registros)
${customers.slice(0, 3).map(c => `- ${c.name}: ${c.email || 'sem email'}`).join('\n')}`;

  if (relevantContext.length > 0) {
    prompt += `\n\n## CONTEXTO RELEVANTE DA CONVERSA
${relevantContext.join('\n')}`;
  }

  prompt += `\n\n## INSTRUÇÕES
1. Use os dados reais para análises precisas
2. Calcule custos usando as funções: calculate_recipe_unit_cost(id), calculate_event_cost(id)
3. Para exportações, use o formato: [🔗 Baixar arquivo.xlsx](export:{"type":"xlsx","data":[...],"filename":"nome"})
4. Seja específico com números e métricas
5. Sugira melhorias baseadas nos dados
6. Use markdown para formatação clara

Sempre responda em português brasileiro com análises detalhadas e acionáveis.`;

  return prompt;
}