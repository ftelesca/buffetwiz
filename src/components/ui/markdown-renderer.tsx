import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [exportButtons, setExportButtons] = useState<Array<{id: string, text: string, data: string}>>([]);
  const { toast } = useToast();

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleExportClick = async (exportData: string) => {
    try {
      console.log('Raw export data:', exportData);
      
      // Clean the export data before parsing
      const cleanedData = exportData.trim();
      
      let parsedData;
      try {
        parsedData = JSON.parse(cleanedData);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw data that failed:', cleanedData);
        
        toast({
          title: "Erro de formato",
          description: "Os dados de exportação estão malformados. Tente novamente.",
          variant: "destructive",
        });
        return;
      }
      
      const { data: response, error } = await supabase.functions.invoke('wizard-export', {
        body: parsedData
      });

      if (error) throw error;

      if (response?.downloadUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        link.download = response.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Arquivo exportado",
          description: `${response.filename} foi baixado com sucesso`,
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o arquivo",
        variant: "destructive",
      });
    }
  };

  // Extract export buttons and clean content
  useEffect(() => {
    const exportMatches = content.match(/\[([^\]]+)\]\(export:([^)]+)\)/g);
    if (exportMatches) {
      const buttons = exportMatches.map((match) => {
        const [, linkText, exportData] = match.match(/\[([^\]]+)\]\(export:([^)]+)\)/) || [];
        return {
          id: `export-btn-${Math.random().toString(36).substr(2, 9)}`,
          text: linkText,
          data: exportData
        };
      });
      setExportButtons(buttons);
    } else {
      setExportButtons([]);
    }
  }, [content]);

  // Clean content by removing export links and their trailing JSON data
  const cleanContent = content
    .replace(/\[([^\]]+)\]\(export:([^)]+)\)[^]*$/g, '\n\n**Arquivo pronto para download:**\n\nEXPORT_BUTTON_PLACEHOLDER')
    .replace(/\[([^\]]+)\]\(export:([^)]+)\)/g, 'EXPORT_BUTTON_PLACEHOLDER');

  return (
    <div className={cn("markdown-content leading-7", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings with better styling
          h1: ({ className, ...props }) => (
            <h1
              className={cn(
                "scroll-m-20 text-2xl font-bold tracking-tight mb-4 pb-2 border-b border-border/40",
                className
              )}
              {...props}
            />
          ),
          h2: ({ className, ...props }) => (
            <h2
              className={cn(
                "scroll-m-20 text-xl font-semibold tracking-tight mt-6 mb-3 pb-1 border-b border-border/20",
                className
              )}
              {...props}
            />
          ),
          h3: ({ className, ...props }) => (
            <h3
              className={cn(
                "scroll-m-20 text-lg font-semibold tracking-tight mt-5 mb-2",
                className
              )}
              {...props}
            />
          ),

          // Enhanced paragraphs and lists
          p: ({ className, children, ...props }) => {
            // Handle export button placeholders
            if (typeof children === 'string' && children.includes('EXPORT_BUTTON_PLACEHOLDER')) {
              const buttonIndex = exportButtons.length > 0 ? 0 : -1;
              
              if (buttonIndex >= 0 && buttonIndex < exportButtons.length) {
                const beforeText = children.split('EXPORT_BUTTON_PLACEHOLDER')[0];
                
                return (
                  <div className={cn("leading-relaxed mb-4 text-foreground/90 [&:not(:first-child)]:mt-4", className)}>
                    {beforeText && <span>{beforeText}</span>}
                    <button
                      onClick={() => handleExportClick(exportButtons[buttonIndex].data)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors cursor-pointer shadow-sm"
                    >
                      📥 {exportButtons[buttonIndex].text}
                    </button>
                  </div>
                );
              }
            }
            
            return (
              <p
                className={cn("leading-relaxed mb-4 text-foreground/90 [&:not(:first-child)]:mt-4", className)}
                {...props}
              >
                {children}
              </p>
            );
          },
          ul: ({ className, ...props }) => (
            <ul className={cn("my-4 ml-6 list-disc space-y-1 [&>li]:mt-1", className)} {...props} />
          ),
          ol: ({ className, ...props }) => (
            <ol className={cn("my-4 ml-6 list-decimal space-y-1 [&>li]:mt-1", className)} {...props} />
          ),
          li: ({ className, ...props }) => (
            <li className={cn("text-foreground/90 leading-relaxed", className)} {...props} />
          ),

          // Enhanced blockquotes
          blockquote: ({ className, ...props }) => (
            <blockquote
              className={cn(
                "mt-6 border-l-4 border-primary/30 bg-muted/30 pl-6 py-3 italic text-foreground/80 rounded-r-lg",
                className
              )}
              {...props}
            />
          ),

          // Enhanced tables
          table: ({ className, ...props }) => (
            <div className="my-6 w-full overflow-y-auto">
              <table className={cn("w-full border-collapse border border-border/40 rounded-lg overflow-hidden", className)} {...props} />
            </div>
          ),
          tr: ({ className, ...props }) => (
            <tr
              className={cn("border-b border-border/40 transition-colors hover:bg-muted/30", className)}
              {...props}
            />
          ),
          th: ({ className, ...props }) => (
            <th
              className={cn(
                "h-12 px-4 text-left align-middle font-semibold text-foreground bg-muted/60 [&:has([role=checkbox])]:pr-0",
                className
              )}
              {...props}
            />
          ),
          td: ({ className, ...props }) => (
            <td
              className={cn("p-4 align-middle text-foreground/90 [&:has([role=checkbox])]:pr-0", className)}
              {...props}
            />
          ),

          // Enhanced code blocks with copy functionality
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            const code = String(children).replace(/\n$/, '');
            
            if (isInline) {
              return (
                <code
                  className={cn(
                    "relative rounded bg-muted/60 px-[0.3rem] py-[0.2rem] font-mono text-sm font-medium text-foreground border border-border/30",
                    className
                  )}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="relative group my-4">
                <pre className="overflow-x-auto rounded-lg border border-border/40 bg-muted/40 p-4 font-mono text-sm leading-relaxed">
                  <code className={cn("text-foreground/90", className)} {...props}>
                    {children}
                  </code>
                </pre>
                <button
                  onClick={() => copyToClipboard(code)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-md bg-background/80 hover:bg-background border border-border/40 shadow-sm"
                  title="Copiar código"
                >
                  {copiedCode === code ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </div>
            );
          },

          // Enhanced links
          a: ({ className, ...props }) => (
            <a
              className={cn(
                "font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors",
                className
              )}
              {...props}
            />
          ),

          // Enhanced horizontal rules
          hr: ({ ...props }) => <hr className="my-6 border-border/60" {...props} />,

          // Enhanced strong and emphasis
          strong: ({ className, ...props }) => (
            <strong className={cn("font-semibold text-foreground", className)} {...props} />
          ),
          em: ({ className, ...props }) => (
            <em className={cn("italic text-foreground/90", className)} {...props} />
          ),
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}