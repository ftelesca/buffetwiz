import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
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
    if (!authorization) throw new Error('No authorization header');

    // Get user from JWT
    const jwt = authorization.replace('Bearer ', '');
    const { data: user, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user.user) throw new Error('Invalid authorization');

    const userId = user.user.id;
    console.log('Processing request for user:', userId);

    // 🔑 define currentChatId logo no início
    let currentChatId = chatId;

    // Create query hash for cache
    const queryHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(message + (model || 'gpt-5-2025-08-07'))
    );
    const hashArray = Array.from(new Uint8Array(queryHash));
    const queryHashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Check cache first
    let isCacheHit = false;
    let assistantResponse = '';
    let tokensUsed = 0;
    let cachedMeta = null;

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

    // Get user data for RAG context - only if no cache hit
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

      const context = {
        events: eventsResponse.data || [],
        recipes: recipesResponse.data || [],
        items: itemsResponse.data || [],
        customers: customersResponse.data || []
      };

      const businessContext = `
CONTEXTO DO NEGÓCIO - BUFFETWIZ:
... (mantive suas instruções completas aqui)
      `;

      // Call GPT only if no valid cache
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ||
        'sk-proj-xxxxxxxx'; // fallback opcional para teste local
      if (!OPENAI_API_KEY) {
        console.error('Missing OPENAI_API_KEY secret');
        return new Response(JSON.stringify({
          error: 'OPENAI_API_KEY não configurada',
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: businessContext },
            { role: 'user', content: message }
          ],
          max_completion_tokens: 2000
        })
      });

      if (!openAIResponse.ok) {
        const error = await openAIResponse.text();
        console.error('OpenAI API error:', error);
        throw new Error(`OpenAI API error: ${openAIResponse.status}`);
      }

      const aiData = await openAIResponse.json();
      assistantResponse = aiData?.choices?.[0]?.message?.content || '';
      tokensUsed = aiData?.usage?.total_tokens || 0;

      // Cache the response for 1 hour
      const responseToCache = {
        response: assistantResponse,
        chatId: currentChatId,
        metadata: {
          model: model || 'gpt-4.1-mini',
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

      await supabase.from('wizard_cache').insert({
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

    // Ensure chat exists
    if (!currentChatId) {
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
    const { error: userMsgError } = await supabase.from('wizard_messages').insert({
      chat_id: currentChatId,
      role: 'user',
      content: message
    });
    if (userMsgError) throw userMsgError;

    // Save assistant response
    const { error: assistantMsgError } = await supabase.from('wizard_messages').insert({
      chat_id: currentChatId,
      role: 'assistant',
      content: assistantResponse,
      metadata: isCacheHit ? cachedMeta : {
        model: model || 'gpt-4.1-mini',
        tokens_used: tokensUsed
      }
    });
    if (assistantMsgError) throw assistantMsgError;

    // Update chat timestamp
    await supabase.from('wizard_chats').update({
      updated_at: new Date().toISOString()
    }).eq('id', currentChatId);

    // Final response
    const finalResponse = {
      response: assistantResponse,
      chatId: currentChatId,
      metadata: isCacheHit ? cachedMeta : {
        model: model || 'gpt-4.1-mini',
        tokens_used: tokensUsed,
        cached: isCacheHit
      }
    };

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in wizard-chat function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
