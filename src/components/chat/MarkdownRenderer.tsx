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
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from "docx";
import JSZip from "jszip";
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

// Helper to export conversation with elegant markdown formatting
async function exportConversationToPDFAndDOCX(content: string, filename: string, chatTitle?: string, eventDetails?: any, includeLogo?: boolean) {
  console.log('Exportando conversa em PDF + DOCX:', { content, chatTitle, eventDetails, includeLogo });
  
  const currentDate = new Date().toLocaleDateString('pt-BR');
  const currentTime = new Date().toLocaleTimeString('pt-BR');
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
              <div class="message-header">
                ${isUser ? '👤 Usuário' : '🤖 BuffetWiz'}
                <span class="message-timestamp">${escapeHtml(timestamp)}</span>
              </div>
              <div class="message-content">${escapeHtml(messageContent).replace(/\n/g, '<br>')}</div>
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

  // Elegant HTML template
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      color: #111827;
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 24px;
      background: #ffffff;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }
    .header p { font-size: 12px; color: #6B7280; }

    .chat { display: flex; flex-direction: column; gap: 12px; }
    .message { display: flex; align-items: flex-start; gap: 8px; }
    .message.user { justify-content: flex-end; }

    .avatar {
      width: 28px; height: 28px; flex: 0 0 28px; border-radius: 9999px;
      display: flex; align-items: center; justify-content: center;
      background: #E5E7EB; font-size: 14px;
    }
    .message.user .avatar { background: #E0E7FF; }

    .bubble {
      max-width: 75%;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 12px 14px;
      background: #F9FAFB;
    }
    .message.user .bubble { background: #EEF2FF; border-color: #C7D2FE; }

    .content.markdown {
      font-size: 14px; color: #111827;
    }
    .content.markdown h1 { font-size: 18px; font-weight: 700; margin: 8px 0; }
    .content.markdown h2 { font-size: 16px; font-weight: 600; margin: 8px 0; }
    .content.markdown h3 { font-size: 15px; font-weight: 600; margin: 8px 0; }
    .content.markdown p { margin: 8px 0; }
    .content.markdown ul { margin: 8px 0 8px 20px; }
    .content.markdown ol { margin: 8px 0 8px 20px; }
    .content.markdown code { background: #F3F4F6; padding: 2px 4px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .content.markdown pre { background: #111827; color: #F9FAFB; padding: 12px; border-radius: 8px; overflow: auto; }
    .content.markdown table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    .content.markdown th, .content.markdown td { border: 1px solid #E5E7EB; padding: 6px 8px; text-align: left; }

    .meta { font-size: 10px; color: #6B7280; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Conversa com o Assistente BuffetWiz</h1>
    <p>Gerado em ${currentDate} ${currentTime}</p>
  </div>
  <div class="chat">
    ${processedContent}
  </div>
</body>
</html>`;

  // Create enhanced DOCX content
  const docxContent = await createEnhancedDOCXContent(conversationContent, currentDate, currentTime, eventDetails);

  try {
    const zip = new JSZip();
    
    // Generate PDF
    const html2pdf = (window as any).html2pdf;
    if (html2pdf) {
      console.log('Gerando PDF elegante...');
      const pdfBlob = await html2pdf()
        .set({
          margin: [0.5, 0.5, 0.5, 0.5],
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true,
            letterRendering: true,
            allowTaint: false
          },
          jsPDF: { 
            unit: 'in', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
          },
        })
        .from(html)
        .outputPdf('blob');
      
      zip.file(`${title}.pdf`, pdfBlob);
    }

    // Generate DOCX
    console.log('Gerando DOCX elegante...');
    const docxBlob = await Packer.toBlob(docxContent);
    zip.file(`${title}.docx`, docxBlob);

    // Create and download ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BuffetWiz_Analise_${currentDate.replace(/\//g, '-')}.zip`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('Documentos elegantes gerados com sucesso');
    
  } catch (error) {
    console.error('Erro ao gerar documentos elegantes:', error);
    throw error;
  }
}

// Enhanced DOCX content creation (chat-like, simple header, no footer)
async function createEnhancedDOCXContent(content: string, currentDate: string, currentTime: string) {
  const children: any[] = [];

  // Header: centered, simple
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Conversa com o Assistente BuffetWiz", bold: true, size: 28 })],
      alignment: "center",
      spacing: { after: 120 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Gerado em ${currentDate} ${currentTime}`, size: 20, color: "6B7280" })],
      alignment: "center",
      spacing: { after: 300 },
    })
  );

  const toPlainRuns = (line: string) => {
    const runs: any[] = [];
    let i = 0;
    while (i < line.length) {
      const bold = line.indexOf('**', i);
      const italic = line.indexOf('*', i);
      if (bold !== -1 && (italic === -1 || bold < italic)) {
        if (bold > i) runs.push(new TextRun({ text: line.slice(i, bold) }));
        const end = line.indexOf('**', bold + 2);
        if (end !== -1) {
          runs.push(new TextRun({ text: line.slice(bold + 2, end), bold: true }));
          i = end + 2; continue;
        }
      }
      if (italic !== -1) {
        if (italic > i) runs.push(new TextRun({ text: line.slice(i, italic) }));
        const end = line.indexOf('*', italic + 1);
        if (end !== -1) {
          runs.push(new TextRun({ text: line.slice(italic + 1, end), italics: true }));
          i = end + 1; continue;
        }
      }
      runs.push(new TextRun({ text: line.slice(i) }));
      break;
    }
    if (!runs.length) runs.push(new TextRun({ text: line }));
    return runs;
  };

  const addBubble = (isUser: boolean, htmlOrMd: string, timestamp: string) => {
    // Header with role + timestamp, aligned left/right
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: isUser ? '👤 Usuário ' : '🤖 BuffetWiz ', bold: true }),
          new TextRun({ text: timestamp ? `(${timestamp})` : '', size: 16, color: '6B7280' }),
        ],
        alignment: isUser ? 'right' : 'left',
        spacing: { before: 120, after: 60 },
      })
    );

    // Convert markdown to plain paragraphs (basic support)
    const lines = htmlOrMd.split('\n');
    const paragraphs: any[] = [];
    let inCode = false;
    let codeBuffer: string[] = [];

    for (const raw of lines) {
      const line = raw.replace(/\r/g, '');
      if (line.trim().startsWith('```')) {
        if (!inCode) { inCode = true; codeBuffer = []; continue; }
        // close
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: codeBuffer.join('\n'), font: 'Consolas' })] }));
        inCode = false; codeBuffer = []; continue;
      }
      if (inCode) { codeBuffer.push(line); continue; }
      if (!line.trim()) { paragraphs.push(new Paragraph({ children: [new TextRun({ text: '' })] })); continue; }
      if (line.startsWith('# ')) { paragraphs.push(new Paragraph({ children: [new TextRun({ text: line.slice(2), bold: true, size: 26 })] })); continue; }
      if (line.startsWith('## ')) { paragraphs.push(new Paragraph({ children: [new TextRun({ text: line.slice(3), bold: true, size: 22 })] })); continue; }
      if (line.startsWith('### ')) { paragraphs.push(new Paragraph({ children: [new TextRun({ text: line.slice(4), bold: true, size: 20 })] })); continue; }
      if (/^[-*]\s+/.test(line)) { paragraphs.push(new Paragraph({ children: [new TextRun({ text: '• ' + line.replace(/^[-*]\s+/, '') })], indent: { left: 400 } })); continue; }
      if (/^\d+\.\s+/.test(line)) { paragraphs.push(new Paragraph({ children: [new TextRun({ text: line })], indent: { left: 400 } })); continue; }
      paragraphs.push(new Paragraph({ children: toPlainRuns(line) }));
    }

    // Wrap in a one-cell table to mimic a bubble and align left/right
    const cell = new TableCell({
      children: paragraphs,
      margins: { top: 120, bottom: 120, left: 180, right: 180 },
    });
    const row = new TableRow({ children: [cell] });
    const table = new Table({ rows: [row], width: { size: 6500, type: WidthType.DXA } });
    children.push(table);
  };

  if (content.includes('👤 **Usuário**') || content.includes('🤖 **BuffetWiz**')) {
    const sections = content.split('---').filter(s => s.trim());
    for (const section of sections) {
      const lines = section.trim().split('\n');
      if (!lines.length) continue;
      const first = lines[0];
      const isUser = first.includes('👤 **Usuário**');
      const timestamp = first.match(/_\((.*?)\)_/)?[1] || '';
      const msg = lines.slice(2).join('\n').trim();
      addBubble(isUser, msg, timestamp);
    }
  } else {
    addBubble(false, content, `${currentDate} ${currentTime}`);
  }

  return new Document({ sections: [{ properties: {}, children }] });
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
                     exportConversationToPDFAndDOCX(content, file);
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
                        exportConversationToPDFAndDOCX(content, file);
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
                      exportConversationToPDFAndDOCX(content, file);
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

export { exportConversationToPDFAndDOCX };