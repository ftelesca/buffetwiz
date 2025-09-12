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
    const { chatId } = await req.json();
    
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

    // Get chat and messages
    const { data: chat, error: chatError } = await supabase
      .from('wizard_chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();

    if (chatError) throw chatError;

    const { data: messages, error: messagesError } = await supabase
      .from('wizard_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at');

    if (messagesError) throw messagesError;

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // Create professional HTML for PDF
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const currentTime = new Date().toLocaleTimeString('pt-BR');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Relatório BuffetWiz - ${chat.title}</title>
    <style>
        @page {
            margin: 2cm;
            @top-center {
                content: "BuffetWiz - Relatório de Consultoria";
            }
            @bottom-center {
                content: "Página " counter(page) " de " counter(pages);
            }
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            background: white;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
        }
        
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        
        .header .subtitle {
            font-size: 16px;
            opacity: 0.9;
            margin-top: 10px;
        }
        
        .meta-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .meta-info div {
            font-size: 14px;
        }
        
        .meta-info strong {
            color: #667eea;
            font-weight: 600;
        }
        
        .chat-title {
            font-size: 24px;
            font-weight: 600;
            color: #667eea;
            margin-bottom: 30px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
        }
        
        .message {
            margin-bottom: 30px;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .message.user {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin-left: 20px;
        }
        
        .message.assistant {
            background: white;
            border: 2px solid #e9ecef;
            margin-right: 20px;
        }
        
        .message-role {
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        .message.user .message-role {
            color: rgba(255,255,255,0.9);
        }
        
        .message.assistant .message-role {
            color: #667eea;
        }
        
        .message-content {
            font-size: 15px;
            line-height: 1.7;
            white-space: pre-wrap;
        }
        
        .message-time {
            font-size: 12px;
            opacity: 0.7;
            margin-top: 15px;
            text-align: right;
        }
        
        .summary {
            margin-top: 40px;
            padding: 25px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 5px solid #28a745;
        }
        
        .summary h3 {
            color: #28a745;
            margin-top: 0;
            font-size: 20px;
        }
        
        .footer {
            margin-top: 60px;
            padding: 30px;
            text-align: center;
            background: #667eea;
            color: white;
            border-radius: 10px;
            font-size: 14px;
        }
        
        .footer .logo {
            font-weight: 700;
            font-size: 18px;
            margin-bottom: 10px;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        @media print {
            body { margin: 0; }
            .message { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧙‍♂️ BuffetWiz</h1>
        <div class="subtitle">Relatório de Consultoria com Inteligência Artificial</div>
    </div>
    
    <div class="meta-info">
        <div>
            <strong>Data de Geração:</strong><br>
            ${currentDate} às ${currentTime}
        </div>
        <div>
            <strong>Usuário:</strong><br>
            ${profile?.full_name || user.user.email}
        </div>
        <div>
            <strong>Sessão:</strong><br>
            ${chat.created_at ? new Date(chat.created_at).toLocaleDateString('pt-BR') : 'N/A'}
        </div>
        <div>
            <strong>Mensagens:</strong><br>
            ${messages.length} interações
        </div>
    </div>
    
    <h2 class="chat-title">${chat.title}</h2>
    
    ${messages.map(message => `
        <div class="message ${message.role}">
            <div class="message-role">
                ${message.role === 'user' ? '👤 Consulta' : '🤖 Análise IA'}
            </div>
            <div class="message-content">${message.content}</div>
            <div class="message-time">
                ${new Date(message.created_at).toLocaleDateString('pt-BR')} às ${new Date(message.created_at).toLocaleTimeString('pt-BR')}
            </div>
        </div>
    `).join('')}
    
    <div class="summary">
        <h3>📊 Resumo da Consultoria</h3>
        <p><strong>Tema Principal:</strong> ${chat.title}</p>
        <p><strong>Total de Interações:</strong> ${messages.length}</p>
        <p><strong>Período:</strong> ${chat.created_at ? new Date(chat.created_at).toLocaleDateString('pt-BR') : 'N/A'} a ${currentDate}</p>
        <p><strong>Modelo de IA:</strong> GPT-5 2025 (Análise Avançada)</p>
        
        <p style="margin-top: 25px; font-style: italic; color: #666;">
            Este relatório foi gerado automaticamente pelo sistema BuffetWiz com base nas consultas realizadas 
            e análises da inteligência artificial. As recomendações são baseadas nos dados específicos do seu negócio.
        </p>
    </div>
    
    <div class="footer">
        <div class="logo">BuffetWiz</div>
        <div>Gestão de Eventos Descomplicada</div>
        <div style="margin-top: 10px; opacity: 0.8;">
            Powered by AI • Gerado em ${currentDate}
        </div>
    </div>
</body>
</html>`;

    // Return HTML for client-side PDF generation
    return new Response(JSON.stringify({
      html,
      filename: `BuffetWiz_${chat.title.replace(/[^a-zA-Z0-9]/g, '_')}_${currentDate.replace(/\//g, '-')}.pdf`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in wizard-export-pdf function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});