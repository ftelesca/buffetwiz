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

    // Get user's business data for RAG context
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

⚠️ IMPORTANTE - SUAS CAPACIDADES:
• POSSO: Analisar TODOS os dados fornecidos (eventos, produtos, insumos, clientes), calcular custos, sugerir otimizações, responder perguntas detalhadas, executar funções de cálculo
• TENHO ACESSO COMPLETO: A todos os dados do negócio fornecidos no contexto para análise e consulta
• NÃO POSSO: Gravar, editar ou modificar dados no sistema (sou apenas para consulta e análise)
• Quando o usuário pedir para "salvar" ou "atualizar" algo, SEMPRE explique que ele precisa fazer isso manualmente na aplicação

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

Para usar essas funções, você pode referenciar: "Calcule o custo do produto 'Nome do Produto'" ou "Qual o custo do evento 'Nome do Evento'"

DADOS DISPONÍVEIS:
- ${context.events.length} eventos cadastrados
- ${context.recipes.length} produtos no cardápio  
- ${context.items.length} insumos disponíveis
- ${context.customers.length} clientes cadastrados

EVENTOS RECENTES:
${context.events.slice(0, 10).map(event => `
• "${event.title}" - ${event.date} (${event.numguests} convidados)
  Cliente: ${event.customer?.name || 'N/A'}
  Custo: R$ ${event.cost || 'N/A'} | Preço: R$ ${event.price || 'N/A'}
  Menu: ${event.event_menu?.map(m => `${m.recipe?.description} (${m.qty})`).join(', ') || 'Vazio'}
`).join('\n')}

PRODUTOS PRINCIPAIS:
${context.recipes.slice(0, 15).map(recipe => `
• "${recipe.description}" (Rendimento: ${recipe.efficiency || 1})
  Insumos: ${recipe.recipe_item?.map(ri => `${ri.item?.description} (${ri.qty} ${ri.item?.unit_use?.description || 'un'})`).join(', ') || 'N/A'}
`).join('\n')}

INSUMOS E CUSTOS:
${context.items.slice(0, 20).map(item => `
• "${item.description}": R$ ${item.cost || 'N/A'} por ${item.unit_use?.description || 'unidade'}
`).join('\n')}

CLIENTES:
${context.customers.slice(0, 10).map(customer => `
• "${customer.name}" - ${customer.email || 'N/A'} | ${customer.phone || 'N/A'}
`).join('\n')}

INSTRUÇÕES:
1. Analise os dados fornecidos para responder perguntas sobre custos, rentabilidade, otimizações
2. Use as funções de cálculo disponíveis quando precisar de custos precisos
3. Sugira melhorias baseadas nos dados reais do usuário
4. Identifique oportunidades de economia e aumento de margem
5. Responda em português brasileiro de forma profissional
6. Use dados específicos do negócio do usuário sempre que possível
7. Forneça insights acionáveis e práticos
8. SEMPRE seja claro sobre suas limitações - você NÃO PODE modificar dados, apenas consultar
9. Quando usar funções de cálculo, informe o resultado obtido ao usuário
10. IMPORTANTE: SEMPRE use "produto" ou "product", NUNCA "receita" ou "recipe" em suas respostas
11. IMPORTANTE: SEMPRE use "insumo", NUNCA "item", "ingrediente" ou "ingredient" em suas respostas
12. IMPORTANTE: SEMPRE use NOMES/DESCRIÇÕES, NUNCA IDs ao se comunicar com o usuário
`;

    // Fast path: handle requests to list all products and their unit costs without calling the LLM
    const normalizedMsg = (message || '').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const wantsProductUnitCostList =
      (normalizedMsg.includes('listar') || normalizedMsg.includes('liste') || normalizedMsg.includes('lista') || normalizedMsg.includes('todos')) &&
      (normalizedMsg.includes('produto') || normalizedMsg.includes('produtos')) &&
      normalizedMsg.includes('custo') &&
      (normalizedMsg.includes('unit') || normalizedMsg.includes('unitario') || normalizedMsg.includes('unitaria'));

    if (!isCacheHit && !assistantResponse && wantsProductUnitCostList) {
      console.log('Fast path: listing products with unit costs for user:', userId);
      const { data: allRecipes, error: allRecipesError } = await supabase
        .from('recipe')
        .select('id, description')
        .eq('user_id', userId)
        .order('description', { ascending: true })
        .limit(1000);

      if (allRecipesError) {
        console.error('Error fetching recipes for fast path:', allRecipesError);
      } else if (!allRecipes || allRecipes.length === 0) {
        assistantResponse = 'Não encontrei produtos cadastrados.';
      } else {
        // Calculate unit cost for each product in small concurrent batches
        const batchSize = 20;
        const costsMap: Record<string, number> = {};

        for (let i = 0; i < allRecipes.length; i += batchSize) {
          const batch = allRecipes.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (rec) => {
              const { data, error } = await supabase.rpc('calculate_recipe_unit_cost', { recipe_id_param: rec.id });
              if (error) {
                console.warn('Unit cost RPC failed for recipe', rec.id, error);
                costsMap[String(rec.id)] = 0;
              } else {
                costsMap[String(rec.id)] = Number(data ?? 0);
              }
            })
          );
        }

        const lines = allRecipes.map((rec) => {
          const cost = costsMap[String(rec.id)] ?? 0;
          return `• "${rec.description}": R$ ${Number(cost).toFixed(2)} por unidade`;
        });

        assistantResponse = `Aqui está a lista de produtos com seu custo unitário:\n\n${lines.join('\n')}\n\nTotal de produtos: ${allRecipes.length}.`;
      }
    }

    // Call GPT-5 only if no valid cache
    if (!isCacheHit && !assistantResponse) {
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
        metadata: {
          model: 'gpt-5-2025-08-07',
          tokens_used: tokensUsed,
          context_items: {
            events: context.events.length,
            recipes: context.recipes.length,
            items: context.items.length,
            customers: context.customers.length
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

    // Cache the response for 1 hour (only when not from cache)
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

    if (!isCacheHit) {
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

    return new Response(JSON.stringify(responseToCache), {
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