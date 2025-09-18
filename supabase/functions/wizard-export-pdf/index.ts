import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { marked } from 'https://esm.sh/marked@12.0.2';

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
    const { chatId, messages, chatTitle } = await req.json();
    
    console.log('Processing PDF export for chat:', chatId);
    
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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // Create filename with proper date format
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // AAAA-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-'); // HH-MM
    const filename = `Assistente_BuffetWiz_${dateStr}_${timeStr}.pdf`;

    // Generate conversation HTML with chat-like layout
    const conversationHTML = messages
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(message => {
        const timestamp = new Date(message.created_at);
        const isUser = message.role === "user";
        
        return `
          <div class="message ${isUser ? 'user' : 'assistant'}">
            ${!isUser ? '<div class="avatar">🤖</div>' : ''}
            <div class="bubble ${isUser ? 'user' : 'assistant'}">
              <div class="content">${isUser ? escapeHtml(message.content).replace(/\n/g, '<br>') : parseMarkdown(message.content)}</div>
              <div class="timestamp">${timestamp.toLocaleDateString('pt-BR')} ${timestamp.toLocaleTimeString('pt-BR')}</div>
            </div>
            ${isUser ? '<div class="avatar">👤</div>' : ''}
          </div>
        `;
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
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Conversa BuffetWiz - ${chatTitle}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #111827;
            background: #ffffff;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 24px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 16px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
        }
        
        .header .meta {
            font-size: 14px;
            color: #6b7280;
        }
        
        .chat {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .message {
            display: flex;
            align-items: flex-end;
            gap: 12px;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .message.user {
            justify-content: flex-end;
        }
        
        .avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 600;
            flex-shrink: 0;
            background: #e5e7eb;
            color: #111827;
        }
        
        .message.assistant .avatar {
            background: #6366f1;
            color: #ffffff;
        }
        
        .bubble {
            max-width: 85%;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 16px;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .bubble.user {
            background: #6366f1;
            border-color: #4f46e5;
            color: #ffffff;
        }
        
        .content {
            font-size: 15px;
            word-wrap: break-word;
            overflow-wrap: anywhere;
        }
        
        .content strong {
            font-weight: 600;
        }
        
        .content em {
            font-style: italic;
        }
        
        .content code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'SFMono-Regular', Consolas, monospace;
            font-size: 14px;
        }
        
        .bubble.user .content code {
            background: rgba(255,255,255,0.2);
            color: #ffffff;
        }
        
        .content pre {
            background: #1f2937;
            color: #f9fafb;
            padding: 12px;
            border-radius: 8px;
            overflow: visible;
            white-space: pre-wrap;
            margin: 8px 0;
        }
        
        /* Lists */
        .content ul { margin: 8px 0 8px 22px; list-style: disc; }
        .content ol { margin: 8px 0 8px 22px; list-style: decimal; }
        .content li { margin: 4px 0; }
        
        /* Tables */
        .content table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        .content thead { background: #f3f4f6; }
        .content th, .content td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
        .content tr, .content td, .content th { page-break-inside: avoid; break-inside: avoid; }
        
        .timestamp {
            font-size: 12px;
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
        }
        
        .bubble.user .timestamp {
            color: #e0e7ff;
            border-top-color: rgba(255,255,255,0.3);
        }
        
        @media print {
            body { margin: 0; padding: 16px; }
            .message { page-break-inside: avoid; }
            .bubble { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Conversa com o Assistente BuffetWiz</h1>
        <div class="meta">
            Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}<br>
            Usuário: ${profile?.full_name || user.user.email}
        </div>
    </div>
    
    <div class="chat">
        ${conversationHTML}
    </div>
</body>
</html>`;

    // Use Puppeteer to generate PDF
    const puppeteer = await import('https://deno.land/x/puppeteer@16.2.0/mod.ts');
    
    try {
      console.log('Launching Puppeteer browser...');
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ]
      });

      const page = await browser.newPage();
      
      // Set viewport and content
      await page.setViewport({ width: 800, height: 1200 });
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      console.log('Generating PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true,
        preferCSSPageSize: true
      });

      await browser.close();
      
      console.log('PDF generated successfully, size:', pdfBuffer.length);

      return new Response(pdfBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString()
        },
      });

    } catch (puppeteerError) {
      console.error('Puppeteer error:', puppeteerError);
      
      // Fallback: return HTML for client-side generation
      return new Response(JSON.stringify({
        html,
        filename,
        fallback: true,
        error: 'Server PDF generation failed, using client fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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