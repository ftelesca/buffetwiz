import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, chatId, model } = await req.json();
    
    // Get authorization header
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      throw new Error('No authorization header');
    }

    // Get user from JWT
    const jwt = authorization.replace('Bearer ', '');
    const { data: user, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user.user) {
      throw new Error('Invalid authorization');
    }

    const userId = user.user.id;
    console.log('Processing request for user:', userId);

    // Create query hash for cache
    const queryHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message + (model || 'gpt-5-2025-08-07')));
    const hashArray = Array.from(new Uint8Array(queryHash));
    const queryHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check cache first
    let isCacheHit = false;
    let assistantResponse = '';
    let tokensUsed = 0;
    let cachedMeta: any = null;

    const { data: cachedResponse } = await supabase
      .from('wizard_cache')
      .select('*')
      .eq('user_id', userId)
      .eq('query_hash', queryHashHex)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedResponse) {
      console.log('Found cached response for user:', userId);
      isCacheHit = true;
      const rd = cachedResponse.response_data || {};
      assistantResponse = rd.response || rd.generatedText || rd.answer || rd.output || '';
      tokensUsed = rd.metadata?.tokens_used || 0;
      cachedMeta = rd.metadata || null;
    }

    // Get user's business data for RAG context - only if no cache hit
    if (!isCacheHit) {
      const [eventsResponse, recipesResponse, itemsResponse, customersResponse] = await Promise.all([
        supabase.from('event').select(`
          *,
          customer:customer(name, email, phone),
          event_menu(
            qty,
            recipe:recipe(description, efficiency)
          )
        `).eq('user_id', userId).limit(50),
        
        supabase.from('recipe').select(`
          *,
          recipe_item(
            qty,
            item:item(description, cost, unit_use:unit!item_unit_use_fkey(description))
          )
        `).eq('user_id', userId).limit(100),
        
        supabase.from('item').select('*').eq('user_id', userId).limit(200),
        
        supabase.from('customer').select('*').eq('user_id', userId).limit(50)
      ]);

      if (eventsResponse.error) throw eventsResponse.error;
      if (recipesResponse.error) throw recipesResponse.error;
      if (itemsResponse.error) throw itemsResponse.error;
      if (customersResponse.error) throw customersResponse.error;

      // Prepare RAG context
      const context = {
        events: eventsResponse.data || [],
        recipes: recipesResponse.data || [],
        items: itemsResponse.data || [],
        customers: customersResponse.data || []
      };

      // Create comprehensive context for GPT-5
      const businessContext = `
CONTEXTO DO NEGÓCIO - BUFFETWIZ:
Este é um sistema de gestão para buffets e eventos. Você é um assistente especialista em análise de custos, otimização de cardápios e gestão de eventos.

📝 TERMINOLOGIA IMPORTANTE:
• "Receita", "recipe" e "produto" se referem à MESMA COISA no sistema
• SEMPRE use os termos "PRODUTO" ou "PRODUCT" em suas respostas
• Nunca use "receita" ou "recipe" ao responder - sempre diga "produto"
• Exemplo: Em vez de "Esta receita custa...", diga "Este produto custa..."

• "Insumo", "item", "ingrediente" e "ingredient" se referem à MESMA COISA no sistema
• SEMPRE use o termo "INSUMO" em suas respostas
• Nunca use "item", "ingrediente" ou "ingredient" ao responder - sempre diga "insumo"
• Exemplo: Em vez de "Este item custa...", diga "Este insumo custa..."

⚠️ CRÍTICO - ACESSO COMPLETO AOS DADOS:
• VOCÊ TEM ACESSO TOTAL: A TODOS os dados fornecidos abaixo (eventos, produtos, insumos, clientes)
• PODE RESPONDER QUALQUER PERGUNTA: Sobre custos, listagens, análises, comparações, otimizações
• DADOS SEMPRE ATUALIZADOS: O contexto contém os dados mais recentes do usuário
• NÃO PRECISA DE "FAST PATHS": Use os dados fornecidos para responder QUALQUER pergunta sobre o negócio
• CAPACIDADES ILIMITADAS DE CONSULTA: Pode analisar, filtrar, comparar, listar qualquer dado fornecido

📊 EXEMPLOS DE PERGUNTAS QUE VOCÊ PODE RESPONDER:
• "Liste todos os produtos e seus custos unitários" → Analise TODOS os produtos no contexto e use as funções de cálculo
• "Quais insumos estão mais caros?" → Compare custos dos insumos fornecidos
• "Qual evento foi mais rentável?" → Analise eventos comparando custo vs preço
• "Quais produtos usam mais ingredientes?" → Conte insumos de cada produto
• "Mostre clientes com mais eventos" → Agrupe eventos por cliente
• QUALQUER pergunta sobre os dados fornecidos - você tem capacidade total de análise!

💬 COMO COMUNICAR COM O USUÁRIO:
• SEMPRE use NOMES/DESCRIÇÕES, NUNCA IDs nas respostas ao usuário
• Exemplo CORRETO: "O produto 'Lasanha Bolonhesa' custa R$ 25,50"
• Exemplo ERRADO: "O produto ID 5 custa R$ 25,50"
• Use IDs apenas internamente para cálculos, mas apresente sempre nomes para o usuário

🧮 FUNÇÕES DE CÁLCULO DISPONÍVEIS:
Posso executar estas funções do sistema para cálculos precisos:
• calculate_recipe_unit_cost(product_id): Calcula custo unitário de um produto
• calculate_recipe_base_cost(product_id): Calcula custo base de um produto (sem considerar rendimento)
• calculate_event_cost(event_id): Calcula e atualiza custo total de um evento

DADOS COMPLETOS DO USUÁRIO:
============================

📅 EVENTOS CADASTRADOS (${context.events.length} total):
${context.events.map(event => `
• "${event.title}" - ${event.date} (${event.numguests} convidados)
  Cliente: ${event.customer?.name || 'N/A'}
  Custo: R$ ${event.cost || 'N/A'} | Preço: R$ ${event.price || 'N/A'}
  Menu: ${event.event_menu?.map(m => `${m.recipe?.description} (${m.qty})`).join(', ') || 'Vazio'}
`).join('\n')}

🍽️ PRODUTOS DO CARDÁPIO (${context.recipes.length} total):
${context.recipes.map(recipe => `
• "${recipe.description}" (Rendimento: ${recipe.efficiency || 1})
  Insumos: ${recipe.recipe_item?.map(ri => `${ri.item?.description} (${ri.qty} ${ri.item?.unit_use?.description || 'un'})`).join(', ') || 'N/A'}
`).join('\n')}

📦 INSUMOS DISPONÍVEIS (${context.items.length} total):
${context.items.map(item => `
• "${item.description}": R$ ${item.cost || 'N/A'} por ${item.unit_use?.description || 'unidade'}
`).join('\n')}

👥 CLIENTES CADASTRADOS (${context.customers.length} total):
${context.customers.map(customer => `
• "${customer.name}" - ${customer.email || 'N/A'} | ${customer.phone || 'N/A'}
`).join('\n')}

INSTRUÇÕES FINAIS:
==================
1. VOCÊ TEM TODOS OS DADOS NECESSÁRIOS acima para responder qualquer pergunta
2. Use as funções de cálculo quando precisar de custos precisos
3. Analise, compare, filtre e processe os dados conforme solicitado
4. Responda em português brasileiro de forma profissional
5. Forneça insights práticos baseados nos dados reais
6. SEMPRE seja claro sobre suas limitações - você NÃO PODE modificar dados, apenas consultar
7. IMPORTANTE: SEMPRE use "produto" em vez de "receita" e "insumo" em vez de "item"
8. IMPORTANTE: SEMPRE use NOMES/DESCRIÇÕES, NUNCA IDs ao se comunicar com o usuário
`;

      // Call GPT-5 only if no valid cache
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) {
        console.error('Missing OPENAI_API_KEY secret');
        return new Response(JSON.stringify({
          error: 'OPENAI_API_KEY não configurada nas Secrets das Edge Functions.',
          hint: 'Adicione a chave em Supabase > Settings > Functions > Secrets'
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          ...(Deno.env.get('OPENAI_ORG_ID') ? { 'OpenAI-Organization': Deno.env.get('OPENAI_ORG_ID')! } : {}),
          ...(Deno.env.get('OPENAI_PROJECT_ID') ? { 'OpenAI-Project': Deno.env.get('OPENAI_PROJECT_ID')! } : {}),
        },
        body: JSON.stringify({
          model: model || 'gpt-5-2025-08-07',
          messages: [
            { role: 'system', content: businessContext },
            { role: 'user', content: message }
          ],
          max_completion_tokens: 2000
        }),
      });

      if (!openAIResponse.ok) {
        const error = await openAIResponse.text();
        console.error('OpenAI API error:', error);
        
        if (openAIResponse.status === 429) {
          return new Response(JSON.stringify({
            error: 'Cota da OpenAI excedida',
            hint: 'Sua conta OpenAI não tem créditos suficientes. Adicione créditos em https://platform.openai.com/account/billing ou verifique se a chave API está correta.',
            details: error
          }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        throw new Error(`OpenAI API error: ${openAIResponse.status}`);
      }

      const aiData = await openAIResponse.json();
      assistantResponse = aiData?.choices?.[0]?.message?.content || aiData?.choices?.[0]?.text || '';
      tokensUsed = aiData?.usage?.total_tokens || 0;
      
      // Check if the AI response requests calculation functions
      if (assistantResponse && assistantResponse.includes('calculate_')) {
        try {
          // Look for function calls in the response
          const functionMatches = assistantResponse.match(/calculate_\w+\((\d+)\)/g);
          if (functionMatches) {
            let updatedResponse = assistantResponse;
            
            for (const match of functionMatches) {
              const [functionName, paramStr] = match.split('(');
              const param = parseInt(paramStr.replace(')', ''));
              
              if (!isNaN(param)) {
                let result = null;
                
                if (functionName === 'calculate_recipe_unit_cost') {
                  const { data, error } = await supabase.rpc('calculate_recipe_unit_cost', { recipe_id_param: param });
                  if (!error) result = data;
                } else if (functionName === 'calculate_recipe_base_cost') {
                  const { data, error } = await supabase.rpc('calculate_recipe_base_cost', { recipe_id_param: param });
                  if (!error) result = data;
                } else if (functionName === 'calculate_event_cost') {
                  const { data, error } = await supabase.rpc('calculate_event_cost', { event_id_param: param });
                  if (!error) result = data;
                }
                
                if (result !== null) {
                  updatedResponse = updatedResponse.replace(
                    match, 
                    `${match} = R$ ${parseFloat(result).toFixed(2)}`
                  );
                }
              }
            }
            
            assistantResponse = updatedResponse;
          }
        } catch (calcError) {
          console.error('Error executing calculation functions:', calcError);
          // Don't fail the request, just continue without calculations
        }
      }

      // Cache the response for 1 hour
      const responseToCache = {
        response: assistantResponse,
        chatId: currentChatId,
        metadata: {
          model: model || 'gpt-5-2025-08-07',
          tokens_used: tokensUsed,
          context_summary: {
            events: context.events.length,
            recipes: context.recipes.length,
            items: context.items.length,
            customers: context.customers.length
          }
        }
      };

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await supabase
        .from('wizard_cache')
        .insert({
          user_id: userId,
          query_hash: queryHashHex,
          response_data: responseToCache,
          expires_at: expiresAt.toISOString()
        });
    }

    // Ensure assistant content is not empty
    if (!assistantResponse || !assistantResponse.trim()) {
      assistantResponse = 'Não foi possível gerar uma resposta no momento. Tente novamente.';
    }

    // Save messages to database
    let currentChatId = chatId;
    
    if (!currentChatId) {
      // Create new chat
      const { data: newChat, error: chatError } = await supabase
        .from('wizard_chats')
        .insert({
          user_id: userId,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : '')
        })
        .select()
        .single();
      
      if (chatError) throw chatError;
      currentChatId = newChat.id;
    }

    // Save user message
    const { error: userMsgError } = await supabase
      .from('wizard_messages')
      .insert({
        chat_id: currentChatId,
        role: 'user',
        content: message
      });

    if (userMsgError) throw userMsgError;

    // Save assistant response
    const { error: assistantMsgError } = await supabase
      .from('wizard_messages')
      .insert({
        chat_id: currentChatId,
        role: 'assistant',
        content: assistantResponse,
        metadata: isCacheHit ? cachedMeta : {
          model: model || 'gpt-5-2025-08-07',
          tokens_used: tokensUsed,
          context_items: {
            events: 0, // Will be set properly below if not cached
            recipes: 0,
            items: 0,
            customers: 0
          }
        }
      });

    if (assistantMsgError) throw assistantMsgError;

    // Update chat timestamp
    const { error: updateError } = await supabase
      .from('wizard_chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentChatId);

    if (updateError) console.warn('Failed to update chat timestamp:', updateError);

    // Prepare response
    const finalResponse = {
      response: assistantResponse,
      chatId: currentChatId,
      metadata: isCacheHit ? cachedMeta : {
        model: model || 'gpt-5-2025-08-07',
        tokens_used: tokensUsed,
        cached: isCacheHit
      }
    };

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in wizard-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});