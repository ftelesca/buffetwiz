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
    const queryHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${message}|${chatId || 'nochat'}|${model || 'gpt-4.1-mini-2025-04-14'}`));
    const hashArray = Array.from(new Uint8Array(queryHash));
    const queryHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check cache first
    let isCacheHit = false;
    let assistantResponse = '';
    let tokensUsed = 0;
    let cachedMeta: any = null;
    // Track counts to expose in metadata consistently
    let contextCounts: { events: number; recipes: number; items: number; customers: number } = {
      events: 0,
      recipes: 0,
      items: 0,
      customers: 0,
    };

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

      // Update counts for metadata
      contextCounts = {
        events: context.events.length,
        recipes: context.recipes.length,
        items: context.items.length,
        customers: context.customers.length,
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

🔗 CAPACIDADE DE EXPORTAÇÃO:
=============================
IMPORTANTE: VOCÊ TEM CAPACIDADE TOTAL DE GERAR ARQUIVOS PARA DOWNLOAD!

Quando o usuário solicitar exportações como:
• "exportar tabela para excel"
• "exportar produtos para csv" 
• "baixar lista de eventos"
• "gerar planilha dos insumos"

VOCÊ DEVE:
1. Processar e preparar os dados solicitados
2. Incluir na sua resposta um link especial no formato:
   [🔗 Baixar arquivo_nome.formato](export:dados_codificados)

⚠️ IMPORTANTE PARA EXPORTAÇÕES:
- NÃO use funções calculate_recipe_unit_cost() nos dados de exportação
- Os custos já serão calculados automaticamente pelo sistema
- Apenas mencione que o arquivo conterá os custos calculados
- Use uma linguagem simples como "Segue o arquivo Excel com a tabela dos produtos e seus custos unitários"

FORMATOS SUPORTADOS: xlsx, csv, json
O sistema processará automaticamente os dados e calculará os custos em tempo real.
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

      const selectedModel = (model && typeof model === 'string') ? model : 'gpt-4.1-mini-2025-04-14'; // Use faster model by default
      const isNewModel = /^(gpt-5|gpt-4\.1|o3|o4)/.test(selectedModel);

      // Build conversation history for context
      let historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      if (chatId) {
        const { data: history, error: historyError } = await supabase
          .from('wizard_messages')
          .select('role, content, created_at')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true })
          .limit(20);
        if (!historyError && history) {
          const trimmed = history.slice(-12);
          historyMessages = trimmed.map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content as string,
          }));
          console.log(`Including ${historyMessages.length} prior messages in context`);
        }
      }

      const messagesPayload = [
        { role: 'system', content: businessContext },
        ...historyMessages,
        { role: 'user', content: message }
      ];

      const payload: any = {
        model: selectedModel,
        messages: messagesPayload
      };
      if (isNewModel) {
        payload.max_completion_tokens = 3000; // Increased to allow longer responses
      } else {
        payload.max_tokens = 1500; // Reduced for faster responses
      }

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 20 second timeout

      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      if (!openAIResponse.ok) {
        let errorText = await openAIResponse.text();
        try {
          const errJson = JSON.parse(errorText);
          errorText = errJson.error?.message || JSON.stringify(errJson);
        } catch {}
        console.error('OpenAI API error:', errorText);

        const status = openAIResponse.status;

        if (status === 401) {
          return new Response(JSON.stringify({
            error: 'OPENAI_API_KEY inválida ou sem permissão.',
            hint: 'Verifique a sua chave na OpenAI e garanta que não há restrições de projeto/organização.',
            details: errorText
          }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (status === 429) {
          return new Response(JSON.stringify({
            error: 'Cota da OpenAI excedida',
            hint: 'Adicione créditos em https://platform.openai.com/account/billing ou verifique limites.',
            details: errorText
          }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (status === 400 && /max_tokens|max_completion_tokens|temperature/i.test(errorText)) {
          return new Response(JSON.stringify({
            error: 'Parâmetros incompatíveis com o modelo.',
            hint: 'Modelos GPT‑5/4.1/o3/o4 usam max_completion_tokens. gpt‑4o/4o‑mini usam max_tokens.',
            details: errorText
          }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({
          error: 'Falha na chamada à OpenAI',
          details: errorText
        }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const aiData = await openAIResponse.json();
      assistantResponse = aiData?.choices?.[0]?.message?.content || aiData?.choices?.[0]?.text || '';
      tokensUsed = aiData?.usage?.total_tokens ?? aiData?.usage?.output_tokens ?? 0;
      
      // Check for export requests and generate download links
      let hasExportRequest = false;
      if (assistantResponse && /exportar|export|baixar|download/i.test(assistantResponse)) {
        const exportMatch = assistantResponse.match(/exportar\s+(.*?)\s+para\s+(excel|csv|json)/i);
        if (exportMatch) {
          hasExportRequest = true;
          const dataType = exportMatch[1].toLowerCase();
          const format = exportMatch[2].toLowerCase();
          
          let exportData = [];
          
          // Determine what data to export based on the request
          if (dataType.includes('produto') || dataType.includes('receita')) {
            // Calculate unit costs for each recipe
            const recipesWithCosts = [];
            for (const recipe of context.recipes) {
              try {
                const { data: unitCost, error } = await supabase.rpc('calculate_recipe_unit_cost', { 
                  recipe_id_param: recipe.id 
                });
                
                recipesWithCosts.push({
                  'Produto': recipe.description,
                  'Custo Unitário (R$)': error ? 0 : (parseFloat(unitCost) || 0),
                  'Rendimento': recipe.efficiency || 1,
                  'Insumos': recipe.recipe_item?.length || 0
                });
              } catch (err) {
                recipesWithCosts.push({
                  'Produto': recipe.description,
                  'Custo Unitário (R$)': 0,
                  'Rendimento': recipe.efficiency || 1,
                  'Insumos': recipe.recipe_item?.length || 0
                });
              }
            }
            exportData = recipesWithCosts;
          } else if (dataType.includes('evento')) {
            exportData = context.events.map(event => ({
              'Evento': event.title,
              'Data': event.date,
              'Cliente': event.customer?.name || 'N/A',
              'Convidados': event.numguests || 0,
              'Custo (R$)': event.cost || 0,
              'Preço (R$)': event.price || 0
            }));
          } else if (dataType.includes('insumo') || dataType.includes('item')) {
            exportData = context.items.map(item => ({
              'Insumo': item.description,
              'Custo (R$)': item.cost || 0,
              'Unidade': 'un'
            }));
          } else if (dataType.includes('cliente')) {
            exportData = context.customers.map(customer => ({
              'Cliente': customer.name,
              'Email': customer.email || '',
              'Telefone': customer.phone || ''
            }));
          }
          
          if (exportData.length > 0) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const filename = `${dataType.replace(/\s+/g, '_')}_${timestamp}`;
            
            // Create export data object (raw data; JSON.stringify will escape it)
            const exportDataObj = {
              type: format,
              data: exportData,
              filename
            };
            
            // Encode payload to avoid breaking markdown/link parsing
            const payload = encodeURIComponent(JSON.stringify(exportDataObj));
            
            // Create a clean export link at the end of the response
            const exportLink = `\n\n📁 **Arquivo pronto para download:**\n\n[📥 Baixar ${filename}.${format}](export:${payload})`;
            
            // Remove any existing export links and JSON data, then add clean export link
            assistantResponse = assistantResponse
              .replace(/\[🔗[^\]]*\]\(export:[^)]*\)[\s\S]*/g, '')
              .replace(/\[📥[^\]]*\]\(export:[^)]*\)[\s\S]*/g, '')
              .trim() + exportLink;
          }
        }
      }

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

      // Sanitize export links even when using cached responses
      try {
        if (/\(export:\s*\{/.test(assistantResponse)) {
          const lower = assistantResponse.toLowerCase();
          let target: 'produtos'|'eventos'|'insumos'|'clientes' = 'produtos';
          if (/evento/.test(lower)) target = 'eventos';
          else if (/insumo|item/.test(lower)) target = 'insumos';
          else if (/cliente/.test(lower)) target = 'clientes';

          // Fetch minimal context for export regeneration
          const [eventsResponse, recipesResponse, itemsResponse, customersResponse] = await Promise.all([
            supabase.from('event').select('id, title, date, numguests, cost, price, customer:customer(name)').eq('user_id', userId).limit(50),
            supabase.from('recipe').select('id, description, efficiency, recipe_item(count)').eq('user_id', userId).limit(100),
            supabase.from('item').select('description, cost').eq('user_id', userId).limit(200),
            supabase.from('customer').select('name, email, phone').eq('user_id', userId).limit(50)
          ]);

          const context2: any = {
            events: eventsResponse.data || [],
            recipes: recipesResponse.data || [],
            items: itemsResponse.data || [],
            customers: customersResponse.data || []
          };

          let exportData: any[] = [];
          if (target === 'produtos') {
            for (const r of context2.recipes) {
              let unit = 0;
              try {
                const { data: uc } = await supabase.rpc('calculate_recipe_unit_cost', { recipe_id_param: r.id });
                unit = parseFloat(String(uc || 0)) || 0;
              } catch {}
              exportData.push({ 'Produto': r.description, 'Custo Unitário (R$)': unit });
            }
          } else if (target === 'eventos') {
            exportData = context2.events.map((e: any) => ({ 'Evento': e.title, 'Data': e.date, 'Convidados': e.numguests || 0, 'Custo (R$)': e.cost || 0, 'Preço (R$)': e.price || 0, 'Cliente': e.customer?.name || 'N/A' }));
          } else if (target === 'insumos') {
            exportData = context2.items.map((i: any) => ({ 'Insumo': i.description, 'Custo (R$)': i.cost || 0 }));
          } else if (target === 'clientes') {
            exportData = context2.customers.map((c: any) => ({ 'Cliente': c.name, 'Email': c.email || '', 'Telefone': c.phone || '' }));
          }

          const m = assistantResponse.match(/Baixar\s+([^\s]+)\.(xlsx|csv|json)/i);
          const filenameBase = m?.[1] || target;
          const format = m?.[2] || 'csv';
          const exportObj = { type: format, data: exportData, filename: `${filenameBase}` };
          const payload = encodeURIComponent(JSON.stringify(exportObj));
          const cleanLink = `\n\n📁 **Arquivo pronto para download:**\n\n[📥 Baixar ${filenameBase}.${format}](export:${payload})`;

          // Remove any previous export blobs and append clean link
          assistantResponse = assistantResponse
            .replace(/\(export:[^)]*\)/g, '(export:)')
            .replace(/\[.*?\]\(export:\)\s*/g, '')
            .trim() + cleanLink;
        }
      } catch (e) {
        console.warn('Export sanitize error', e);
      }

      // Cache the response for 1 hour
      const responseToCache = {
        response: assistantResponse,
        chatId: chatId,
        metadata: {
          model: model || 'gpt-4.1-mini-2025-04-14',
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
        metadata: isCacheHit 
          ? ({
              ...cachedMeta,
              context_items: (cachedMeta?.context_summary ?? contextCounts)
            })
          : {
              model: model || 'gpt-4.1-mini-2025-04-14',
              tokens_used: tokensUsed,
              context_items: contextCounts,
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
      metadata: isCacheHit 
        ? ({
            ...cachedMeta,
            cached: true,
            context_items: (cachedMeta?.context_summary ?? contextCounts),
          })
        : {
            model: model || 'gpt-4.1-mini-2025-04-14',
            tokens_used: tokensUsed,
            cached: false,
            context_items: contextCounts,
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