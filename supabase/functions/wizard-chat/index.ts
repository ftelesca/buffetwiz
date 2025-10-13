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
      console.error('Missing authorization header');
      throw new Error('No authorization header');
    }

    // Get user from JWT
    const jwt = authorization.replace('Bearer ', '');
    console.log('JWT received:', jwt.substring(0, 20) + '...');
    
    const { data: user, error: userError } = await supabase.auth.getUser(jwt);
    
    console.log('Auth response:', { user: user?.user?.id, error: userError?.message });
    
    if (userError || !user.user) {
      console.error('Auth error:', userError);
      throw new Error(`Invalid authorization: ${userError?.message || 'User not found'}`);
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
      const [eventsResponse, recipesResponse, itemsResponse, customersResponse, unitsResponse] = await Promise.all([
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
        
        supabase.from('customer').select('*').eq('user_id', userId).limit(50),
        
        supabase.from('unit').select('description').limit(100)
      ]);

      if (eventsResponse.error) throw eventsResponse.error;
      if (recipesResponse.error) throw recipesResponse.error;
      if (itemsResponse.error) throw itemsResponse.error;
      if (customersResponse.error) throw customersResponse.error;
      if (unitsResponse.error) throw unitsResponse.error;

      // Prepare RAG context
      const context = {
        events: eventsResponse.data || [],
        recipes: recipesResponse.data || [],
        items: itemsResponse.data || [],
        customers: customersResponse.data || [],
        units: unitsResponse.data || []
      };

      // Update counts for metadata
      contextCounts = {
        events: context.events.length,
        recipes: context.recipes.length,
        items: context.items.length,
        customers: context.customers.length,
      };

      // Create comprehensive context for Lovable AI (Gemini 2.5 Flash)
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

⚡ GESTÃO DE RECURSOS E LIMITES:
• O sistema usa Lovable AI Gateway com Google Gemini 2.5 Flash
• Atualmente TODOS os modelos Gemini são GRATUITOS até 13 de Outubro de 2025
• Após essa data, haverá limites de taxa baseados no plano do workspace
• Se receber erro 429 (rate limit), aguarde alguns segundos antes de tentar novamente
• Se receber erro 402 (payment required), informe o usuário para adicionar créditos ao workspace
• NUNCA exponha detalhes técnicos da API ao usuário - mantenha mensagens amigáveis

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

🔍 ANÁLISE OTIMIZADA DE DADOS ESTRUTURADOS:
O modelo atual (Gemini 2.5 Flash) é especialmente eficiente para:
• Análise de grandes volumes de dados tabulares
• Comparações multi-dimensionais (custo x preço x lucro)
• Detecção de padrões em histórico de eventos
• Agregações complexas (totais, médias, tendências)
• Correlações entre diferentes entidades (eventos → clientes → produtos → insumos)

QUANDO RESPONDER CONSULTAS ANALÍTICAS:
1. Processe TODO o dataset disponível (não se limite a poucos exemplos)
2. Apresente insights acionáveis, não apenas dados brutos
3. Use tabelas formatadas para comparações complexas
4. Adicione contexto e recomendações baseadas nos padrões encontrados

💬 COMO COMUNICAR COM O USUÁRIO:
• SEMPRE use NOMES/DESCRIÇÕES, NUNCA IDs nas respostas ao usuário
• Exemplo CORRETO: "O produto 'Lasanha Bolonhesa' custa 25,50"
• Exemplo ERRADO: "O produto ID 5 custa R$ 25,50"
• Use IDs apenas internamente para cálculos, mas apresente sempre nomes para o usuário

⚠️ CRÍTICO - FORMATAÇÃO DE VALORES:
• NUNCA use símbolos de moeda como "R$" ou "R" nas respostas
• Apresente APENAS os valores numéricos seguidos da palavra "reais" quando necessário
• Exemplo CORRETO: "custa 25,50" ou "custa 25,50 reais"
• Exemplo ERRADO: "custa R$ 25,50" ou "custa R 25,50"
• Em cálculos, use formato simples: "13 unidades x 39,05 = 507,65"
• NUNCA escreva "R 39,05" ou "R$ 39,05"

🧮 FUNÇÕES DE CÁLCULO DISPONÍVEIS:
VOCÊ DEVE EXECUTAR IMEDIATAMENTE estas funções do banco de dados para obter custos precisos:
• calculate_recipe_unit_cost(product_id): Calcula custo unitário exato de um produto
• calculate_recipe_base_cost(product_id): Calcula custo base de um produto (sem considerar rendimento)  
• calculate_event_cost(event_id): Calcula e atualiza custo total de um evento

⚠️ REGRA CRÍTICA PARA USO DAS FUNÇÕES:
NUNCA diga "vou calcular" ou "aguarde" ou "executando cálculos" - EXECUTE IMEDIATAMENTE!
SEMPRE execute as funções NA MESMA resposta quando o usuário perguntar sobre custos.

🔥 PROCESSO OBRIGATÓRIO:
1. Usuário pergunta sobre custo → EXECUTE a função IMEDIATAMENTE
2. Obtenha o resultado da função → APRESENTE o valor real calculado
3. NUNCA use placeholders como "R$ X,XX" - sempre valores reais
4. NUNCA prometa executar depois - execute AGORA na mesma resposta

📊 EXEMPLOS CORRETOS:
• Usuário: "Qual o custo do produto Lasanha?" 
  → EXECUTE: calculate_recipe_unit_cost(5)
  → RESPONDA: "O custo unitário da Lasanha é R$ 25,50 (baseado no cálculo atual dos insumos)"

• Usuário: "Custos dos produtos de massa?"
  → EXECUTE: calculate_recipe_unit_cost() para CADA produto de massa
  → RESPONDA: Lista com valores reais calculados, não placeholders

🚫 NUNCA FAÇA:
- "Estou calculando..." → Execute direto
- "Aguarde um instante..." → Execute direto  
- "R$ X,XX" → Execute e mostre valor real
- "Vou executar..." → Execute agora
- "[EXECUTO...]" → Execute de verdade

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

📏 UNIDADES DE MEDIDA DO SISTEMA:
${context.units?.map(unit => `
• ${unit.description}
`).join('\n') || 'N/A'}

👥 CLIENTES CADASTRADOS (${context.customers.length} total):
${context.customers.map(customer => `
• "${customer.name}" - ${customer.email || 'N/A'} | ${customer.phone || 'N/A'}
`).join('\n')}

INSTRUÇÕES FINAIS:
==================
1. DADOS DO NEGÓCIO: Os dados acima são específicos do BuffetWiz e devem ser sua fonte primária
2. CONHECIMENTO GERAL: Quando não tiver dados específicos, use seu conhecimento geral sobre:
   • Preços de mercado (ingredientes, fornecedores, etc.)
   • Tendências do setor de buffets e eventos
   • Melhores práticas gastronômicas
   • Informações nutricionais e de segurança alimentar
   • Estratégias de negócios para buffets
3. TRANSPARÊNCIA DE FONTE: SEMPRE indique claramente a origem da informação:
   • "Baseado nos seus dados do BuffetWiz..."
   • "Considerando o mercado geral..." 
   • "Segundo informações de mercado..."
4. Use as funções de cálculo quando precisar de custos precisos dos dados internos
5. Analise, compare, filtre e processe os dados conforme solicitado
6. Responda em português brasileiro de forma profissional
7. Forneça insights práticos baseados tanto nos dados reais quanto no conhecimento geral
8. SEMPRE seja claro sobre suas limitações - você NÃO PODE modificar dados, apenas consultar
9. IMPORTANTE: SEMPRE use "produto" em vez de "receita" e "insumo" em vez de "item"
10. IMPORTANTE: SEMPRE use NOMES/DESCRIÇÕES, NUNCA IDs ao se comunicar com o usuário
11. HÍBRIDO: Combine dados internos com conhecimento externo para respostas mais completas

📊 APRESENTAÇÃO DE DADOS EM TABELAS:
SEMPRE que apresentar dados em formato de tabela, inclua totalizações quando relevante:
• Para valores monetários: Some custos, preços, valores totais
• Para quantidades: Some quantidades de insumos, produtos, convidados
• Para eventos: Totalize custos, número de convidados, etc.
• Use linha de TOTAL ao final da tabela com valores calculados
• Exemplo de tabela com total:

| Produto | Custo Unitário | Quantidade | Total |
|---------|---------------|------------|-------|
| Lasanha | 25,50 | 10 | 255,00 |
| Pizza | 18,00 | 15 | 270,00 |
| **TOTAL** | **-** | **25** | **525,00** |

⚠️ REGRA CRÍTICA PARA EXPORTAÇÃO:
Quando o usuário solicitar exportar uma tabela ou lista que você mostrou, exporte EXATAMENTE os mesmos campos que foram exibidos. Se você mostrou apenas nomes de produtos em uma lista simples, NÃO adicione custos ou outros campos na exportação. Mantenha a coerência entre o que foi exibido e o que será exportado.

🔗 CAPACIDADE DE EXPORTAÇÃO:
=============================
IMPORTANTE: VOCÊ TEM CAPACIDADE TOTAL DE GERAR ARQUIVOS PARA DOWNLOAD!

⚠️ REGRA CRÍTICA DE EXPORTAÇÃO - APENAS CAMPOS VISÍVEIS:
• NUNCA adicione campos extras que não estavam sendo exibidos ao usuário
• EXPORTE APENAS os campos que estão sendo mostrados na conversa atual
• Se o usuário viu uma lista simples com apenas descrições, exporte APENAS as descrições
• Se o usuário viu uma tabela com 3 colunas, exporte APENAS essas 3 colunas
• NÃO adicione custos, preços ou outros dados se não estavam sendo mostrados
• SEJA PRECISO: Não diga "vou exportar unidades de medida" se na verdade está exportando produtos
• DESCREVA CORRETAMENTE: Sempre mencione exatamente o que está sendo exportado

📊 EXEMPLOS CORRETOS:
• Usuário viu lista: "Lasanha, Pizza, Salada" → Exportar: apenas nomes dos produtos
• Usuário viu tabela: "Produto | Quantidade" → Exportar: apenas produto e quantidade
• Usuário viu: "Produto | Custo" → Exportar: produto e custo (pois estava visível)

🚫 EXEMPLOS INCORRETOS:
• Usuário viu apenas nomes → NÃO adicionar custos automaticamente
• Usuário viu lista simples → NÃO adicionar colunas extras de IDs, datas, etc.

PROCESSO OBRIGATÓRIO:
1. REVISAR: Que campos/colunas estavam sendo exibidos na conversa?
2. EXPORTAR: APENAS esses mesmos campos, na mesma estrutura
3. FORMATAR: Manter a simplicidade da exibição original

📄 FORMATOS DE EXPORTAÇÃO SUPORTADOS:
• **PDF**: Ideal para relatórios formatados e apresentações
• **XLSX**: Ideal para análise em Excel com múltiplas planilhas
• **CSV**: Ideal para importação em outros sistemas
• **JSON**: Ideal para integração com APIs e sistemas externos

🎯 QUANDO USAR CADA FORMATO:
• PDF: Relatórios gerenciais, listas para impressão, apresentações
• XLSX: Análises complexas, dados com múltiplas dimensões, gráficos
• CSV: Dados simples, importação em outros softwares
• JSON: Backup de dados, integração técnica

📄 EXPORTAÇÃO PARA PDF:
Quando o usuário solicitar "exportar para PDF" ou "baixar PDF", você DEVE:
1. Responder com a lista/dados solicitados
2. SEMPRE incluir o link de download no formato: [Download NomeDoArquivo.pdf]
3. NUNCA esquecer de incluir o link - o usuário precisa clicar no link para baixar
4. Usar nomes de arquivo descritivos (ex: Produtos_Bacalhau.pdf, não arquivo.pdf)

EXEMPLO CORRETO DE RESPOSTA PDF:
"Aqui estão os produtos que contêm bacalhau:

• Bacalhau Confitado  
• Bacalhau Tradicional
• Camada de Bacalhau

[Download Lista_Produtos_Bacalhau.pdf]"

⚠️ IMPORTANTE PARA EXPORTAÇÕES:
- Use exatamente os mesmos campos que foram mostrados ao usuário
- NÃO use funções calculate_recipe_unit_cost() nos dados de exportação  
- NÃO adicione informações que não estavam na tela/contexto
- Mantenha a simplicidade: se foi lista simples, exporte lista simples
- SEMPRE inclua o link [Download arquivo.ext] quando solicitar exportação
- Use nomes de arquivo descritivos e significativos
`;

      // Call Lovable AI only if no valid cache
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        console.error('Missing LOVABLE_API_KEY secret');
        return new Response(JSON.stringify({
          error: 'LOVABLE_API_KEY não configurada. Verifique as configurações do workspace.',
          hint: 'Contate o suporte se o problema persistir'
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const selectedModel = (model && typeof model === 'string') ? model : 'google/gemini-2.5-flash';
      
      // Model metadata for user context
      const modelInfo: Record<string, { name: string; status: string; strengths: string }> = {
        'google/gemini-2.5-flash': { 
          name: 'Gemini 2.5 Flash', 
          status: 'GRATUITO até 13/Out/2025',
          strengths: 'Análise de dados, comparações, agregações'
        },
        'google/gemini-2.5-pro': { 
          name: 'Gemini 2.5 Pro', 
          status: 'GRATUITO até 13/Out/2025',
          strengths: 'Raciocínio complexo, visual + texto'
        },
        'google/gemini-2.5-flash-lite': { 
          name: 'Gemini 2.5 Flash Lite', 
          status: 'GRATUITO até 13/Out/2025',
          strengths: 'Velocidade, classificação simples'
        },
        'openai/gpt-5': { 
          name: 'GPT-5', 
          status: 'PAGO',
          strengths: 'Precisão máxima, raciocínio nuançado'
        }
      };

      const currentModelInfo = modelInfo[selectedModel] || { 
        name: selectedModel, 
        status: 'Modelo customizado',
        strengths: 'Uso geral'
      };

      console.log(`Using model: ${currentModelInfo.name} (${currentModelInfo.status})`);
      
      const isNewModel = /^(gpt-5|gpt-4\.1|o3|o4)/.test(selectedModel);

      // Build conversation history for context
      let historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      if (chatId) {
        const { data: history, error: historyError } = await supabase
          .from('wizard_messages')
          .select('role, content, created_at')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true }); // Removed limit to include all messages
        if (!historyError && history) {
          // Include ALL messages from the conversation
          historyMessages = history.map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content as string,
          }));
          console.log(`Including ALL ${historyMessages.length} messages in context`);
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

      const openAIResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
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
        console.error('Lovable AI Gateway error:', errorText);

        const status = openAIResponse.status;
        
        // Handle Lovable AI specific errors
        if (status === 429) {
          return new Response(JSON.stringify({
            error: 'Limite de requisições atingido. Aguarde alguns segundos e tente novamente.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 5
          }), { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        if (status === 402) {
          return new Response(JSON.stringify({
            error: 'Créditos insuficientes no workspace. Adicione créditos em Settings → Workspace → Usage.',
            code: 'PAYMENT_REQUIRED'
          }), { 
            status: 402, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

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
            // Export only basic product names unless costs were specifically mentioned in the conversation
            const previousMessages = messagesPayload.slice(-5).map(m => m.content).join(' ');
            const shouldIncludeCosts = /custo|preço|valor|R\$/i.test(previousMessages);
            
            if (shouldIncludeCosts) {
              // Calculate unit costs for each recipe only if costs were being discussed
              const recipesWithCosts = [];
              for (const recipe of context.recipes) {
                try {
                  const { data: unitCost, error } = await supabase.rpc('calculate_recipe_unit_cost', { 
                    recipe_id_param: recipe.id 
                  });
                  
                  recipesWithCosts.push({
                    'Produto': recipe.description,
                    'Custo Unitário': error ? 0 : (parseFloat(unitCost) || 0)
                  });
                } catch (err) {
                  recipesWithCosts.push({
                    'Produto': recipe.description,
                    'Custo Unitário': 0
                  });
                }
              }
              exportData = recipesWithCosts;
            } else {
              // Export only product names if costs weren't being discussed
              exportData = context.recipes.map(recipe => ({
                'Produto': recipe.description
              }));
            }
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
            // Check if costs were being discussed in recent messages
            const previousMessages = messagesPayload.slice(-5).map(m => m.content).join(' ');
            const shouldIncludeCosts = /custo|preço|valor|R\$/i.test(previousMessages);
            
            if (shouldIncludeCosts) {
              exportData = context.items.map(item => ({
                'Insumo': item.description,
                'Custo': item.cost || 0
              }));
            } else {
              exportData = context.items.map(item => ({
                'Insumo': item.description
              }));
            }
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