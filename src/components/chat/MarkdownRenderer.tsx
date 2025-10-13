import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import { Copy, Check, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { handleExportClick } from "@/lib/export-handler";
import { marked } from "marked";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";

// Função de exportação integrada (caso o arquivo externo não esteja disponível)
async function exportToFile(payload: string) {
  console.log('=== EXPORT TO FILE STARTED ===');
  console.log('Raw payload:', payload);
  console.log('Payload type:', typeof payload);
  console.log('Payload length:', payload?.length);
  
  try {
    console.log('exportToFile called with payload:', payload);
    
    // Decodifica o payload se estiver em URL encoding
    let decodedPayload;
    try {
      decodedPayload = decodeURIComponent(payload);
    } catch (e) {
      // Se falhar a decodificação, usar o payload original
      decodedPayload = payload;
    }
    
    console.log('Decoded payload:', decodedPayload);
    
    // Parse do JSON
    const exportData = JSON.parse(decodedPayload);
    console.log('Parsed export data:', exportData);
    
    const { filename, content, type = 'text/plain' } = exportData;
    
    if (!filename || content === undefined) {
      throw new Error('Dados de exportação inválidos: filename e content são obrigatórios');
    }

    // Cria o blob com base no tipo
    let blob: Blob;
    let finalContent: string;
    
    if (typeof content === 'object') {
      finalContent = JSON.stringify(content, null, 2);
      blob = new Blob([finalContent], { type: 'application/json' });
    } else if (type === 'application/json') {
      finalContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      blob = new Blob([finalContent], { type: 'application/json' });
    } else if (type === 'text/csv') {
      finalContent = String(content);
      blob = new Blob([finalContent], { type: 'text/csv;charset=utf-8' });
    } else if (type === 'text/html') {
      finalContent = String(content);
      blob = new Blob([finalContent], { type: 'text/html;charset=utf-8' });
    } else {
      // Padrão para texto simples
      finalContent = String(content);
      blob = new Blob([finalContent], { type: 'text/plain;charset=utf-8' });
    }

    console.log('Created blob:', blob.size, 'bytes, type:', blob.type);

    // Método mais confiável para forçar download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Configurar o link
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    link.style.position = 'absolute';
    link.style.left = '-9999px';
    
    // Adicionar ao DOM
    document.body.appendChild(link);
    
    console.log('Created download link:', link.href, 'filename:', link.download);
    
    // Forçar o clique
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('Cleanup completed');
    }, 100);
    
    console.log(`Download de ${filename} iniciado com sucesso`);
    return true;
    
  } catch (error) {
    console.error('Erro detalhado ao exportar arquivo:', error);
    console.error('Payload original:', payload);
    throw new Error(`Falha ao exportar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// Helper to export conversation as PDF
async function exportConversationToPDF(content: string, filename: string, chatTitle?: string, eventDetails?: any, includeLogo?: boolean) {
  console.log('Exportando conversa em PDF:', { content, chatTitle, eventDetails, includeLogo });
  
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // AAAA-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-'); // HH-MM
  const pdfFilename = `Assistente_BuffetWiz_${dateStr}_${timeStr}.pdf`;
  const title = chatTitle || filename.replace(/\.pdf$/i, '');

  // Extract only lists and tables from content (strict)
  const extractListsOnly = (text: string): string => {
    const lines = text.split(/\r?\n/);
    const out: string[] = [];
    let inBlock = false;
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const t = line.trim();

      const isListItem = /^[-*•]\s+/.test(t) || /^\d+\.\s+/.test(t);
      const isTableHeader = /^\s*\|/.test(line) && ((line.match(/\|/g)?.length || 0) >= 2) && (i + 1 < lines.length) && /\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?/.test(lines[i + 1]);
      const isTableSep = inTable && /^[\|\-\s:]+$/.test(t);
      const isTableRow = inTable && /^\s*\|/.test(line);

      if (isListItem) {
        out.push(line);
        inBlock = true;
        inTable = false;
        continue;
      }

      if (isTableHeader) {
        out.push(line);
        out.push(lines[i + 1]);
        i += 1;
        inBlock = true;
        inTable = true;
        continue;
      }

      if (isTableSep || isTableRow) {
        out.push(line);
        inBlock = true;
        continue;
      }

      if (t === '' && inBlock) {
        out.push(line);
        continue;
      }

      // End of a list/table block
      inBlock = false;
      inTable = false;
    }

    return out.join('\n').trim();
  };

  // Process conversation content differently than lists-only
  const conversationContent = content.includes('👤 **Usuário**') || content.includes('🤖 **BuffetWiz**') 
    ? content 
    : extractListsOnly(content);

  // Build HTML strictly from lists and tables only
  function escapeHtml(str: string) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildConversationHTML(md: string): string {
    // Check if this is conversation content
    if (md.includes('👤 **Usuário**') || md.includes('🤖 **BuffetWiz**')) {
      const sections = md.split('---').filter(section => section.trim());
      const out: string[] = [];
      
      for (const section of sections) {
        const lines = section.trim().split('\n');
        if (lines.length === 0) continue;
        
        const firstLine = lines[0];
        const isUser = firstLine.includes('👤 **Usuário**');
        const isAssistant = firstLine.includes('🤖 **BuffetWiz**');
        
        if (isUser || isAssistant) {
          const timestamp = firstLine.match(/_\((.*?)\)_/)?.[1] || '';
          const messageContent = lines.slice(2).join('\n').trim();
          
          out.push(`
            <div class="message ${isUser ? 'user' : 'assistant'}">
              ${isAssistant ? '<div class="avatar">🤖</div>' : ''}
              <div class="bubble ${isUser ? 'user' : 'assistant'}">
                <div class="content markdown">${isAssistant ? (marked.parse(messageContent, { gfm: true, breaks: true }) as string) : escapeHtml(messageContent).replace(/\n/g, '<br>')}</div>
                <div class="timestamp">${escapeHtml(timestamp)}</div>
              </div>
              ${isUser ? '<div class="avatar">👤</div>' : ''}
            </div>
          `);
        }
      }
      
      return out.join('\n');
    }
    
    // Fallback to original list/table processing for non-conversation content
    const lines = md.split(/\r?\n/);
    const out: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const t = line.trim();

      // Table block (GFM)
      if (/^\s*\|/.test(line) && ((line.match(/\|/g)?.length || 0) >= 2) && i + 1 < lines.length && /\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?/.test(lines[i + 1])) {
        const headers = line.split('|').map(s => s.trim()).filter(Boolean);
        const rows: string[][] = [];
        let j = i + 2;
        while (j < lines.length && /^\s*\|/.test(lines[j])) {
          rows.push(lines[j].split('|').map(s => s.trim()).filter(Boolean));
          j++;
        }
        const thead = '<thead><tr>' + headers.map(h => `<th scope="col">${escapeHtml(h)}</th>`).join('') + '</tr></thead>';
        const tbody = '<tbody>' + rows.map(r => '<tr>' + headers.map((_, idx) => `<td>${escapeHtml(r[idx] ?? '')}</td>`).join('') + '</tr>').join('') + '</tbody>';
        out.push(`<table>${thead}${tbody}</table>`);
        i = j;
        continue;
      }

      // Unordered list block
      if (/^[-*•]\s+/.test(t)) {
        const items: string[] = [];
        while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
          i++;
        }
        out.push('<ul class="elegant-list">' + items.map(it => `<li class="list-item">${escapeHtml(it)}</li>`).join('') + '</ul>');
        continue;
      }

      // Ordered list block
      if (/^\d+\.\s+/.test(t)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
          i++;
        }
        out.push('<ol class="elegant-numbered-list">' + items.map(it => `<li class="numbered-item">${escapeHtml(it)}</li>`).join('') + '</ol>');
        continue;
      }

      // Skip any other content
      i++;
    }

    return out.join('\n');
  }

  const processedContent = buildConversationHTML(conversationContent);

  // Content already processed correctly above - no additional wrapping needed

  // No event details section in export - only lists

  // Logo section
  let logoSection = '';
  if (includeLogo) {
    logoSection = `
    <div class="logo-section">
      <img src="/logo.png" alt="BuffetWiz Logo" class="company-logo" />
    </div>`;
  }

  // Elegant HTML template (embedded container for html2pdf)
  const html = `
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
#bw-pdf-root {
  font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  color: #111827;
  width: 720px;
  margin: 0 auto;
  padding: 24px;
  background: #ffffff;
  line-height: 1.6;
}
.header { text-align: center; margin-bottom: 16px; }
.header h1 { font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 4px; }
.header p { font-size: 12px; color: #6B7280; }
.chat { display: flex; flex-direction: column; gap: 14px; }
.message { display: flex; align-items: flex-end; gap: 10px; break-inside: avoid; page-break-inside: avoid; }
.message.user { justify-content: flex-end; }
.avatar { width: 32px; height: 32px; flex: 0 0 32px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; background: #E5E7EB; color: #111827; font-size: 14px; font-weight: 600; }
.message.assistant .avatar { background: #6366F1; color: #ffffff; }
.message.user .avatar { background: #E5E7EB; color: #111827; }
.bubble { max-width: 85%; border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px 14px 8px 14px; background: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.04); break-inside: avoid; page-break-inside: avoid; }
.bubble.user { background: #6366F1; border-color: #4F46E5; color: #ffffff; }
.content.markdown { font-size: 14px; word-break: break-word; overflow-wrap: anywhere; white-space: normal; }
.content.markdown h1 { font-size: 18px; font-weight: 700; margin: 8px 0; }
.content.markdown h2 { font-size: 16px; font-weight: 600; margin: 8px 0; }
.content.markdown h3 { font-size: 15px; font-weight: 600; margin: 8px 0; }
.content.markdown p { margin: 8px 0; }
.content.markdown ul { margin: 8px 0 8px 20px; }
.content.markdown ol { margin: 8px 0 8px 20px; }
.content.markdown code { background: #F3F4F6; padding: 2px 4px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.bubble.user .content.markdown code { background: rgba(255,255,255,0.15); color: #fff; }
.content.markdown pre { background: #111827; color: #F9FAFB; padding: 12px; border-radius: 8px; overflow: visible; white-space: pre-wrap; }
.content.markdown table { width: 100%; border-collapse: collapse; margin: 8px 0; }
.content.markdown th, .content.markdown td { border: 1px solid #E5E7EB; padding: 6px 8px; text-align: left; }
.content.markdown thead { display: table-header-group; }
.content.markdown tr, .content.markdown td, .content.markdown th { page-break-inside: avoid; break-inside: avoid; }
.timestamp { font-size: 10px; color: #6B7280; margin-top: 8px; padding-top: 6px; border-top: 1px solid #E5E7EB; }
.bubble.user .timestamp { color: #E0E7FF; border-top-color: rgba(255,255,255,0.25); }
img { max-width: 100%; height: auto; page-break-inside: avoid; }
</style>
<div id="bw-pdf-root">
  <div class="header">
    <h1>Conversa com o Assistente BuffetWiz</h1>
    <p>Gerado em ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}</p>
  </div>
  <div class="chat">
    ${processedContent}
  </div>
</div>
`;

  try {
    // Generate PDF only
    const html2pdf = (window as any).html2pdf;
    if (html2pdf) {
      console.log('Gerando PDF...');

      // Create off-DOM container to ensure correct width
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-10000px';
      wrapper.style.top = '0';
      wrapper.style.width = '740px';
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);
      const target = wrapper.querySelector('#bw-pdf-root') as HTMLElement;

      const elementWidth = target?.scrollWidth || 740;
      const pdfBlob = await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true,
            letterRendering: true,
            allowTaint: false,
            windowWidth: Math.max(elementWidth, 740)
          },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
          },
        })
        .from(target)
        .outputPdf('blob');
      
      // Direct download of PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Cleanup
      document.body.removeChild(wrapper);
    }

    console.log('PDF gerado com sucesso');
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
}

// Process export links: robustly convert raw occurrences like "export:{...}" or "export:%7B...%7D" into markdown links, skipping code blocks
function processExportLinks(md: string): string {
  if (!md) return '';

  const wrapPercentEncoded = (segment: string) =>
    segment.replace(/(?<!\])\bexport:%7B[^\s)]+%7D\b/gi, (match) => `[📥 Baixar arquivo](${match})`);

  const wrapRawJson = (segment: string) => {
    let out = '';
    let i = 0;
    while (i < segment.length) {
      const idx = segment.indexOf('export:', i);
      if (idx === -1) {
        out += segment.slice(i);
        break;
      }
      // copy text up to the match
      out += segment.slice(i, idx);

      // Avoid wrapping if part of an existing markdown link like "](export:...)"
      if (idx > 0 && segment[idx - 1] === ']') {
        out += 'export:';
        i = idx + 7;
        continue;
      }

      let j = idx + 7; // after 'export:'
      // skip whitespace
      while (j < segment.length && /\s/.test(segment[j])) j++;
      if (segment[j] !== '{') {
        // not a raw JSON payload; just copy 'export:' and continue
        out += 'export:';
        i = idx + 7;
        continue;
      }

      // parse balanced JSON braces
      let brace = 0;
      let k = j;
      let found = false;
      while (k < segment.length) {
        const ch = segment[k];
        if (ch === '{') brace++;
        else if (ch === '}') {
          brace--;
          if (brace === 0) { k++; found = true; break; }
        }
        k++;
      }
      if (!found) {
        out += segment.slice(idx);
        i = segment.length;
        break;
      }

      const jsonStr = segment.slice(j, k);
      const encoded = encodeURIComponent(jsonStr);
      out += `[📥 Baixar arquivo](export:${encoded})`;
      i = k;
    }
    return out;
  };

  // Split content to avoid altering code blocks or inline code
  const parts = md.split(/(```[\s\S]*?```|`[^`]*`)/g);
  for (let p = 0; p < parts.length; p++) {
    const part = parts[p];
    if (!part) continue;
    if (part.startsWith('```') || part.startsWith('`')) continue; // skip code

    let processed = part;
    // keep existing markdown export links as-is
    processed = processed.replace(/(\[[^\]]+\]\(export:[^)]*\))/g, '$1');
    processed = wrapPercentEncoded(processed);
    processed = wrapRawJson(processed);

    // Convert bare bracketed download text like "[Download arquivo.pdf]" into an actionable exportpdf link
    processed = processed.replace(/(?<!\!)\[(?:Download|Baixar)\s+([^\]]+\.pdf)\](?!\()/gi, (_m, file) => {
      const safe = String(file).trim();
      return `[📥 Baixar ${safe}](exportpdf:${encodeURIComponent(safe)})`;
    });

    // Also handle non-PDF files: xlsx, csv, json
    processed = processed.replace(/(?<!\!)\[(?:Download|Baixar)\s+([^\]]+\.(xlsx|csv|json))\](?!\()/gi, (_m, file) => {
      const safe = String(file).trim();
      const payload = encodeURIComponent(`filename:"${safe}"`);
      return `[📥 Baixar ${safe}](export:${payload})`;
    });

    parts[p] = processed;
  }

  return parts.join('');
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  enableCodeCopy?: boolean;
  enableMath?: boolean;
  enableExports?: boolean;
}

export function MarkdownRenderer({ 
  content, 
  className = "",
  enableCodeCopy = true,
  enableMath = true,
  enableExports = true
}: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: "Copiado!",
        description: "Código copiado para a área de transferência",
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Erro",
        description: "Falha ao copiar código",
        variant: "destructive",
      });
    }
  };

  const handleExportClickLocal = async (payload: string) => {
    if (!enableExports) return;
    await handleExportClick(payload);
  };


  const remarkPlugins = [remarkGfm];
  const rehypePlugins: any[] = [rehypeHighlight, rehypeRaw];

  if (enableMath) {
    remarkPlugins.push(remarkMath as any);
    rehypePlugins.push(rehypeKatex as any);
  }

  const processedContent = processExportLinks(content);

  // Extrai dados de tabela do markdown atual para usar no export quando o link é genérico
  const extractTableDataFromMarkdown = (md: string): any[] => {
    try {
      if (!md) return [];
      const clean = (s: string) => s.replace(/\*\*|__/g, '').trim();
      const text = md.replace(/```[\s\S]*?```/g, '').trim();
      const lines = text.split(/\r?\n/);

      // Tenta detectar a última tabela em formato pipe (GFM)
      let i = 0;
      let lastTable: { headers: string[]; rows: string[][] } | null = null;
      while (i < lines.length) {
        if (/^\s*\|/.test(lines[i]) && ((lines[i].match(/\|/g)?.length || 0) >= 2)) {
          const headerLine = lines[i].trim();
          const sepLine = lines[i + 1] || '';
          if (/\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?/.test(sepLine)) {
            i += 2;
            const headers = headerLine.split('|').map((s) => clean(s)).filter(Boolean);
            const rowsArr: string[][] = [];
            while (i < lines.length && /^\s*\|/.test(lines[i])) {
              const row = lines[i].split('|').map((s) => clean(s)).filter(Boolean);
              if (row.length) rowsArr.push(row);
              i++;
            }
            lastTable = { headers, rows: rowsArr };
            continue;
          }
        }
        i++;
      }
      if (lastTable && lastTable.headers.length >= 2 && lastTable.rows.length) {
        const headers = lastTable.headers;
        return lastTable.rows.map((r) => {
          const obj: any = {};
          headers.forEach((h, idx) => (obj[h] = r[idx] ?? ''));
          return obj;
        });
      }

      // Fallback: detectar bloco de 2 colunas (nome + número ao fim)
      let headerIdx = lines.findIndex((l) => /insumo/i.test(l) && /(custo|total)/i.test(l));
      if (headerIdx === -1) {
        headerIdx = lines.findIndex((l) => /\S+\s{2,}\S+/.test(l));
      }
      if (headerIdx !== -1) {
        const headerParts = lines[headerIdx].split(/\t+| {2,}/).map((s) => clean(s)).filter(Boolean);
        const h1 = headerParts[0] || 'Coluna 1';
        const h2 = headerParts[1] || 'Coluna 2';
        const rows: any[] = [];
        for (let j = headerIdx + 1; j < lines.length; j++) {
          const line = lines[j].trim();
          if (!line) break;
          const m = line.match(/^(.+?)\s+([\d.,]+)$/);
          if (m) {
            rows.push({ [h1]: clean(m[1]), [h2]: m[2] });
          } else if (/^total/i.test(line)) {
            const totalNum = line.match(/([\d.,]+)$/)?.[1] || '';
            rows.push({ [h1]: 'TOTAL', [h2]: totalNum });
          } else {
            if (rows.length > 0) break;
          }
        }
        return rows;
      }

      return [];
    } catch {
      return [];
    }
  };

  const inferTypeFromFilename = (file: string): 'xlsx' | 'csv' | 'json' => {
    const f = (file || '').toLowerCase();
    if (f.endsWith('.csv')) return 'csv';
    if (f.endsWith('.json')) return 'json';
    return 'xlsx';
  };

  return (
    <div className={cn("prose prose-slate dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          // Headers with better styling
          h1: ({ className, ...props }) => (
            <h1 
              className={cn(
                "text-3xl font-bold tracking-tight mb-6 pb-3 border-b border-border/50 text-foreground", 
                className
              )} 
              {...props} 
            />
          ),
          h2: ({ className, ...props }) => (
            <h2 
              className={cn(
                "text-2xl font-semibold tracking-tight mt-8 mb-4 pb-2 border-b border-border/30 text-foreground", 
                className
              )} 
              {...props} 
            />
          ),
          h3: ({ className, ...props }) => (
            <h3 
              className={cn(
                "text-xl font-semibold tracking-tight mt-6 mb-3 text-foreground", 
                className
              )} 
              {...props} 
            />
          ),
          h4: ({ className, ...props }) => (
            <h4 
              className={cn(
                "text-lg font-semibold mt-4 mb-2 text-foreground", 
                className
              )} 
              {...props} 
            />
          ),

          // Improved paragraphs and text
          p: ({ className, ...props }) => (
            <p 
              className={cn(
                "leading-relaxed mb-4 text-foreground/90 [&:not(:first-child)]:mt-4", 
                className
              )} 
              {...props} 
            />
          ),

          // Enhanced lists
          ul: ({ className, ...props }) => (
            <ul 
              className={cn(
                "my-4 ml-6 list-disc space-y-2 [&>li]:mt-1 text-foreground/90", 
                className
              )} 
              {...props} 
            />
          ),
          ol: ({ className, ...props }) => (
            <ol 
              className={cn(
                "my-4 ml-6 list-decimal space-y-2 [&>li]:mt-1 text-foreground/90", 
                className
              )} 
              {...props} 
            />
          ),

          // Better blockquotes
          blockquote: ({ className, ...props }) => (
            <blockquote 
              className={cn(
                "mt-6 border-l-4 border-primary/40 bg-muted/40 pl-6 py-4 italic text-foreground/80 rounded-r-lg my-6", 
                className
              )} 
              {...props} 
            />
          ),

          // Enhanced tables
          table: ({ className, ...props }) => (
            <div className="my-6 w-full overflow-hidden rounded-lg border border-border">
              <table className={cn("w-full border-collapse", className)} {...props} />
            </div>
          ),
          thead: ({ className, ...props }) => (
            <thead className={cn("bg-muted/60", className)} {...props} />
          ),
          tbody: ({ className, ...props }) => (
            <tbody className={cn("bg-background", className)} {...props} />
          ),
          tr: ({ className, ...props }) => (
            <tr className={cn("border-b border-border/40 hover:bg-muted/20 transition-colors", className)} {...props} />
          ),
          th: ({ className, ...props }) => (
            <th 
              className={cn(
                "h-12 px-4 text-left align-middle font-semibold text-foreground [&:has([role=checkbox])]:pr-0", 
                className
              )} 
              {...props} 
            />
          ),
          td: ({ className, ...props }) => (
            <td 
              className={cn(
                "p-4 align-middle text-foreground/90 [&:has([role=checkbox])]:pr-0", 
                className
              )} 
              {...props} 
            />
          ),

          // Advanced code blocks with syntax highlighting
          code: ({ className, children, ...props }: any) => {
            const inline = props.inline;
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const code = String(children).replace(/\n$/, '');

            if (inline) {
              return (
                <code 
                  className="relative rounded bg-muted/60 px-[0.3rem] py-[0.2rem] font-mono text-sm font-medium text-foreground border border-border/30" 
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="relative group my-6">
                <div className="flex items-center justify-between bg-muted/80 px-4 py-2 rounded-t-lg border border-b-0 border-border/40">
                  {language && (
                    <Badge variant="secondary" className="text-xs">
                      {language}
                    </Badge>
                  )}
                  {enableCodeCopy && (
                    <Button
                      onClick={() => copyToClipboard(code)}
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                    >
                      {copiedCode === code ? (
                        <>
                          <Check className="h-3 w-3 mr-1 text-green-600" />
                          <span className="text-xs">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          <span className="text-xs">Copiar</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <pre className="overflow-x-auto rounded-b-lg border border-t-0 border-border/40 bg-slate-950 p-4 font-mono text-sm">
                  <code className={cn("text-slate-50", className)} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },

          // Enhanced links and export buttons
          a: ({ className, href, children, ...props }) => {
            if (href && href.startsWith('exportpdf:')) {
              const file = decodeURIComponent(href.replace(/^exportpdf:/, ''));
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                     exportConversationToPDF(content, file);
                  }}
                  className={cn(
                    "inline-flex items-center px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 rounded-md transition-all duration-200 shadow-sm hover:shadow-md text-primary-foreground cursor-pointer", 
                    className
                  )}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {children}
                </button>
              );
            }

            if (href && href.startsWith('export:')) {
              const payload = href.replace(/^export:/, '');
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleExportClickLocal(payload);
                  }}
                  className={cn(
                    "inline-flex items-center px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 rounded-md transition-all duration-200 shadow-sm hover:shadow-md text-primary-foreground cursor-pointer", 
                    className
                  )}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {children}
                </button>
              );
            }

            if (href && (href.startsWith('http') || href.startsWith('https'))) {
              const onSmartDownload = (e: React.MouseEvent<HTMLAnchorElement>) => {
                try {
                  const text = (e.currentTarget.textContent || '').toLowerCase();
                  // More flexible patterns for download detection
                  const patterns = [
                    /\bbaixar\s+([\w\-\s\.]+\.(xlsx|csv|json|pdf))\b/i,
                    /\bdownload\s+([\w\-\s\.]+\.(xlsx|csv|json|pdf))\b/i,
                    /([\w\-\s\.]+\.(xlsx|csv|json|pdf))/i // Just filename with extension
                  ];
                  
                  for (const pattern of patterns) {
                    const match = text.match(pattern);
                    if (match) {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = match[1].trim();
                      const ext = file.split('.').pop()?.toLowerCase();
                      if (ext === 'pdf') {
                        exportConversationToPDF(content, file);
                      } else {
                        const rows = extractTableDataFromMarkdown(content);
                        if (rows && rows.length) {
                          const type = inferTypeFromFilename(file);
                          const payload = JSON.stringify({ type, filename: file, data: rows });
                          handleExportClickLocal(payload);
                        } else {
                          handleExportClickLocal(`filename:"${file}"`);
                        }
                      }
                      break;
                    }
                  }
                } catch {}
              };
              return (
                <a 
                  className={cn(
                    "inline-flex items-center font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors", 
                    className
                  )} 
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onSmartDownload}
                  {...props}
                >
                  {children}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              );
            }

            // Default links: still support smart download by text
            const onSmartDownload = (e: React.MouseEvent<HTMLAnchorElement>) => {
              try {
                const text = (e.currentTarget.textContent || '').toLowerCase();
                // More flexible patterns for download detection
                const patterns = [
                  /\bbaixar\s+([\w\-\s\.]+\.(xlsx|csv|json|pdf))\b/i,
                  /\bdownload\s+([\w\-\s\.]+\.(xlsx|csv|json|pdf))\b/i,
                  /([\w\-\s\.]+\.(xlsx|csv|json|pdf))/i // Just filename with extension
                ];
                
                for (const pattern of patterns) {
                  const match = text.match(pattern);
                  if (match) {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = match[1].trim();
                    const ext = file.split('.').pop()?.toLowerCase();
                    if (ext === 'pdf') {
                      exportConversationToPDF(content, file);
                    } else {
                      const rows = extractTableDataFromMarkdown(content);
                      if (rows && rows.length) {
                        const type = inferTypeFromFilename(file);
                        const payload = JSON.stringify({ type, filename: file, data: rows });
                        handleExportClickLocal(payload);
                      } else {
                        handleExportClickLocal(`filename:"${file}"`);
                      }
                    }
                    break;
                  }
                }
              } catch {}
            };
            return (
              <a 
                className={cn(
                  "font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors", 
                  className
                )} 
                href={href} 
                onClick={onSmartDownload}
                {...props}
              >
                {children}
              </a>
            );
          },

          // Horizontal rules
          hr: ({ className, ...props }) => (
            <hr className={cn("my-8 border-border/60", className)} {...props} />
          ),

          // Text formatting
          strong: ({ className, ...props }) => (
            <strong className={cn("font-semibold text-foreground", className)} {...props} />
          ),
          em: ({ className, ...props }) => (
            <em className={cn("italic text-foreground/90", className)} {...props} />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

export { exportConversationToPDF };