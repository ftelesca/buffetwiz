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

// Helper to export current markdown content to PDF
async function exportMarkdownToPDF(markdown: string, filename: string) {
  const currentDate = new Date().toLocaleDateString('pt-BR');
  const currentTime = new Date().toLocaleTimeString('pt-BR');
  const title = filename.replace(/\.pdf$/i, '');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; line-height: 1.6; color: #111827; max-width: 800px; margin: 40px auto; padding: 24px; }
    .header { text-align: center; margin-bottom: 24px; padding: 16px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; border-radius: 8px; }
    .meta { margin-bottom: 16px; font-size: 12px; color: #374151; }
    .content { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
    pre { background: #0f172a; color: #e5e7eb; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin:0; font-size: 20px; font-weight: 700;">BuffetWiz • Resposta da IA</h1>
  </div>
  <div class="meta">Gerado em ${currentDate} às ${currentTime}</div>
  <div class="content">${markdown}</div>
</body>
</html>`;

  const element = document.createElement('div');
  element.innerHTML = html;
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.top = '-9999px';
  document.body.appendChild(element);
  try {
    const html2pdf = (window as any).html2pdf;
    if (html2pdf) {
      await html2pdf()
        .set({
          margin: 0.5,
          filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        })
        .from(element)
        .save();
    } else {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      } else {
        throw new Error('Popup bloqueado pelo navegador');
      }
    }
  } finally {
    document.body.removeChild(element);
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
    processed = processed.replace(/(\[[^\]]+\]\(export:[^)]+\))/g, '$1');
    processed = wrapPercentEncoded(processed);
    processed = wrapRawJson(processed);
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
                  const match = text.match(/\bbaixar\s+([\w\-\s]+\.(xlsx|csv|json|pdf))\b/i);
                  if (match) {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = match[1].trim();
                    const ext = file.split('.').pop()?.toLowerCase();
                    if (ext === 'pdf') {
                      exportMarkdownToPDF(content, file);
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
                const match = text.match(/\bbaixar\s+([\w\-\s]+\.(xlsx|csv|json|pdf))\b/i);
                if (match) {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = match[1].trim();
                  const ext = file.split('.').pop()?.toLowerCase();
                  if (ext === 'pdf') {
                    exportMarkdownToPDF(content, file);
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