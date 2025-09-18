import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { marked } from 'https://esm.sh/marked@12.0.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatId, messages, chatTitle } = await req.json();
    
    console.log(`Processing PDF export for chat: ${chatId}`);

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = 'https://bvubvqckuygqibjtmyhv.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dWJ2cWNrdXlncWlianRteWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MTU0MDYsImV4cCI6MjA3MTQ5MTQwNn0.S2fPnn0erhDkrc-Gkn54Ig1ZuGbFtO2wd1JZPlJ1Qk8';
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          authorization: authHeader,
        },
      },
    });

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Failed to authenticate user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile for display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const userDisplayName = profile?.full_name || user.email || 'Usuário';

    // Generate filename with current date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour12: false }).replace(/:/g, '-');
    const filename = `conversa-${dateStr}-${timeStr}.pdf`;

    // Format messages for display
    const formattedMessages = messages.map((msg: any) => {
      const timestamp = new Date(msg.created_at).toLocaleString('pt-BR');
      const role = msg.role === 'user' ? userDisplayName : 'Assistente';
      const content = parseMarkdown(msg.content);
      
      return {
        role,
        content,
        timestamp
      };
    })
    .join('\n');

    // Markdown to HTML using marked (supports GFM tables and lists)
    function parseMarkdown(text: string) {
      try {
        return marked.parse(text ?? '', { gfm: true, breaks: true }) as string;
      } catch (_) {
        return escapeHtml(text ?? '').replace(/\n/g, '<br>');
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Generate HTML content for the PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(chatTitle || 'Conversa')}</title>
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: #ffffff;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
        }
        
        .header .subtitle {
            font-size: 16px;
            color: #6b7280;
            font-weight: 400;
        }
        
        .message {
            margin-bottom: 32px;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .message-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f3f4f6;
        }
        
        .role {
            font-weight: 600;
            font-size: 16px;
            color: #374151;
        }
        
        .role.user {
            color: #059669;
        }
        
        .role.assistant {
            color: #2563eb;
        }
        
        .content {
            font-size: 14px;
            line-height: 1.7;
            color: #374151;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
            margin: 16px 0 8px 0;
            font-weight: 600;
            color: #111827;
        }
        
        .content h1 { font-size: 24px; }
        .content h2 { font-size: 20px; }
        .content h3 { font-size: 18px; }
        .content h4 { font-size: 16px; }
        .content h5 { font-size: 14px; }
        .content h6 { font-size: 12px; }
        
        .content p {
            margin: 8px 0;
        }
        
        .content strong {
            font-weight: 600;
            color: #111827;
        }
        
        .content em {
            font-style: italic;
        }
        
        .content code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 13px;
            color: #dc2626;
        }
        
        .content pre {
            background: #1f2937;
            color: #f9fafb;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 16px 0;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.5;
        }
        
        .content pre code {
            background: none;
            padding: 0;
            color: #f9fafb;
            border-radius: 0;
        }
        
        .content blockquote {
            border-left: 4px solid #d1d5db;
            padding-left: 16px;
            color: #6b7280;
            font-style: italic;
            margin: 8px 0;
        }
        
        /* Lists - Better alignment and spacing */
        .content ul { 
            margin: 12px 0; 
            padding-left: 20px; 
            list-style: disc; 
            list-style-position: outside; 
        }
        .content ol { 
            margin: 12px 0; 
            padding-left: 20px; 
            list-style: decimal; 
            list-style-position: outside; 
        }
        .content li { 
            margin: 6px 0; 
            padding-left: 4px; 
            line-height: 1.5; 
        }
        
        /* Tables - Enhanced styling with rounded corners and better colors */
        .content table { 
            width: 100%; 
            border-collapse: separate; 
            border-spacing: 0; 
            margin: 16px 0; 
            border-radius: 8px; 
            overflow: hidden; 
            border: 1px solid #d1d5db; 
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); 
        }
        .content thead { 
            background: #374151; 
            color: white; 
        }
        .content th { 
            padding: 12px 16px; 
            text-align: left; 
            font-weight: 600; 
            border-bottom: 1px solid #d1d5db; 
            font-size: 14px; 
        }
        .content td { 
            padding: 12px 16px; 
            border-bottom: 1px solid #e5e7eb; 
            background: #f9fafb; 
            font-size: 14px; 
        }
        .content tbody tr:last-child td { 
            border-bottom: none; 
        }
        .content tbody tr:nth-child(even) td { 
            background: #ffffff; 
        }
        .content tr, .content td, .content th { 
            page-break-inside: avoid; 
            break-inside: avoid; 
        }
        
        .timestamp {
            font-size: 12px;
            margin-top: 12px;
            color: #9ca3af;
            font-weight: 400;
            text-align: right;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
        }
        
        @media print {
            body {
                max-width: none;
                margin: 0;
                padding: 20px;
            }
            
            .message {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            .content pre {
                page-break-inside: avoid;
                break-inside: avoid;
            }
        }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${escapeHtml(chatTitle || 'Conversa')}</h1>
            <div class="subtitle">Exportado em ${new Date().toLocaleString('pt-BR')}</div>
        </div>
        
        <div class="messages">
            ${messages.map((msg: any) => {
              const timestamp = new Date(msg.created_at).toLocaleString('pt-BR');
              const role = msg.role === 'user' ? userDisplayName : 'Assistente';
              const content = parseMarkdown(msg.content);
              const roleClass = msg.role === 'user' ? 'user' : 'assistant';
              
              return `
                <div class="message">
                    <div class="message-header">
                        <span class="role ${roleClass}">${escapeHtml(role)}</span>
                    </div>
                    <div class="content">${content}</div>
                    <div class="timestamp">${timestamp}</div>
                </div>
              `;
            }).join('')}
        </div>
        
        <div class="footer">
            <p>Conversa exportada do sistema de chat</p>
        </div>
    </body>
    </html>
    `;

    // Return HTML content for client-side PDF generation
    return new Response(JSON.stringify({ 
      html: htmlContent, 
      filename 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in wizard-export-pdf function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
