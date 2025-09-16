import { supabase } from "@/integrations/supabase/client";
import { parseExportPayload } from "./export-utils";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

// Simple CSV generator (ChatGPT-like client-side fallback)
function generateCSV(rows: any[]): string {
  if (!rows || rows.length === 0) return '';
  const headersSet = new Set<string>();
  rows.forEach((r) => Object.keys(r || {}).forEach((k) => headersSet.add(k)));
  const headers = Array.from(headersSet);
  const escape = (val: any) => {
    if (val == null) return '';
    const s = String(val);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [
    headers.map((h) => escape(h)).join(','),
    ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(',')),
  ];
  return lines.join('\n');
}

function localDownloadXLSX(rows: any[], filename: string) {
  try {
    if (!rows || !Array.isArray(rows)) rows = [];
    const safeName = filename && filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename || 'export'}.xlsx`;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    // Use the library's writer to avoid encoding issues
    XLSX.writeFile(wb, safeName, { bookType: 'xlsx', compression: true });
  } catch (e) {
    // Fallback to Blob method
    const ws = XLSX.utils.json_to_sheet(rows || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'export.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export async function handleExportClick(payload: string): Promise<void> {
  console.log('🔄 Iniciando exportação...', { payload });
  
  // Show loading toast
  const loadingToast = toast({
    title: "Exportando...",
    description: "Preparando seu arquivo para download",
  });

  try {
    const parsed = parseExportPayload(payload);
    console.log('📝 Payload parseado:', parsed);

    if (!parsed) {
      console.warn('❌ Falha no parse, usando fallback');
      
      // Fallback: try to infer export target and rebuild data
      const cleaned = (payload || '').toLowerCase();
      const filenameMatch = cleaned.match(/filename\"?\s*:\s*\"([^\"]+)/);
      const filename = filenameMatch?.[1] || 'export';
      const filenameLower = filename.toLowerCase();
      const inferredType: 'csv' | 'json' | 'xlsx' = filenameLower.endsWith('.xlsx')
        ? 'xlsx'
        : filenameLower.endsWith('.json')
        ? 'json'
        : 'csv';

      let target: 'produtos' | 'eventos' | 'insumos' | 'clientes' = 'produtos';
      if (filenameLower.includes('evento')) target = 'eventos';
      else if (filenameLower.includes('insumo') || filenameLower.includes('item')) target = 'insumos';
      else if (filenameLower.includes('cliente')) target = 'clientes';

      console.log('🎯 Target inferido:', target);

      let exportData: any[] = [];
      const { data: userResp } = await supabase.auth.getUser();
      const userId = userResp.user?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      // Fetch data based on target
      if (target === 'produtos') {
        const { data: recipes } = await supabase
          .from('recipe')
          .select('id, description')
          .eq('user_id', userId)
          .limit(200);

        const rows = await Promise.all((recipes || []).map(async (r) => {
          try {
            const { data: uc } = await supabase.rpc('calculate_recipe_unit_cost', { recipe_id_param: r.id });
            return { 'Produto': r.description, 'Custo Unitário': Number(uc ?? 0) };
          } catch {
            return { 'Produto': r.description, 'Custo Unitário': 0 };
          }
        }));
        exportData = rows;
      } else if (target === 'eventos') {
        const { data: events } = await supabase
          .from('event')
          .select('title, date, numguests, cost, price, customer:customer(name)')
          .eq('user_id', userId)
          .limit(200);
        exportData = (events || []).map((e: any) => ({
          'Evento': e.title,
          'Data': e.date,
          'Convidados': e.numguests || 0,
          'Custo': e.cost || 0,
          'Preço': e.price || 0,
          'Cliente': e?.customer?.name || ''
        }));
      } else if (target === 'insumos') {
        const { data: items } = await supabase
          .from('item')
          .select('description, cost')
          .eq('user_id', userId)
          .limit(500);
        exportData = (items || []).map((i: any) => ({ 'Insumo': i.description, 'Custo': i.cost || 0 }));
      } else if (target === 'clientes') {
        const { data: customers } = await supabase
          .from('customer')
          .select('name, email, phone')
          .eq('user_id', userId)
          .limit(500);
        exportData = (customers || []).map((c: any) => ({ 'Cliente': c.name, 'Email': c.email || '', 'Telefone': c.phone || '' }));
      }

      console.log('📊 Dados obtidos:', { target, count: exportData.length });

      if (inferredType === 'xlsx') {
        localDownloadXLSX(exportData, filename);
        loadingToast.dismiss();
        toast({ title: 'Arquivo exportado', description: `${filename} foi baixado com sucesso` });
        return;
      }

      const fallbackData = { type: inferredType, filename, data: exportData };
      const { data: response, error } = await supabase.functions.invoke('wizard-export', {
        body: fallbackData
      });

      if (error) {
        console.error('❌ Erro na função de export (fallback):', error);
        throw error;
      }

      console.log('✅ Resposta da função (fallback):', response);
      await downloadFile(response, filename);
      loadingToast.dismiss();
      return;
    }

    // Normal path with successfully parsed payload
    // ChatGPT-like local export for CSV/JSON to avoid server call
    if ((parsed.type === 'csv' || parsed.type === 'json') && Array.isArray(parsed.data)) {
      const filename = parsed.filename || 'export';
      const contentType = parsed.type === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
      const contentStr = parsed.type === 'csv' ? generateCSV(parsed.data) : JSON.stringify(parsed.data, null, 2);
      const base64 = btoa(unescape(encodeURIComponent(contentStr)));
      const downloadUrl = `data:${contentType};base64,${base64}`;
      await downloadFile({ downloadUrl, filename }, filename);
      loadingToast.dismiss();
      return;
    }

    // Local XLSX generation when requested
    if ((parsed.type === 'xlsx' || parsed.type === 'excel') && Array.isArray(parsed.data)) {
      const filename = (parsed.filename && parsed.filename.toLowerCase().endsWith('.xlsx')) ? parsed.filename : `${parsed.filename || 'export'}.xlsx`;
      localDownloadXLSX(parsed.data, filename);
      loadingToast.dismiss();
      toast({ title: 'Arquivo exportado', description: `${filename} foi baixado com sucesso` });
      return;
    }

    console.log('📤 Invocando função wizard-export...');
    const { data: response, error } = await supabase.functions.invoke('wizard-export', {
      body: parsed
    });

    if (error) {
      console.error('❌ Erro na função de export:', error);
      throw error;
    }

    console.log('✅ Resposta da função:', response);
    await downloadFile(response, parsed.filename || 'export');
    loadingToast.dismiss();

  } catch (err) {
    console.error('💥 Erro durante exportação:', err);
    try { loadingToast.dismiss(); } catch {}
    toast({
      title: 'Erro na exportação',
      description: 'Não foi possível exportar o arquivo. Verifique os logs para mais detalhes.',
      variant: 'destructive',
    });
  }
}

async function downloadFile(response: any, filename: string): Promise<void> {
  if (!response?.downloadUrl) {
    throw new Error('URL de download não encontrada na resposta');
  }

  console.log('⬇️ Iniciando download...', { filename, downloadUrl: response.downloadUrl.substring(0, 50) + '...' });

  // Convert data URL to Blob and use object URL for reliable download
  const match = response.downloadUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (match) {
    const mime = match[1];
    const b64 = match[2];
    const byteChars = atob(b64);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNums)], { type: mime });
    const url = URL.createObjectURL(blob);
    
  const link = document.createElement('a');
  link.href = url;
  link.download = response.filename || filename;
  link.style.display = 'none';
  link.setAttribute('data-no-router', 'true');
  link.target = '_self';
  document.body.appendChild(link);
  link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ Download concluído via Blob');
  } else {
    // Fallback: open in new tab
    console.log('⚠️ Usando fallback: abrindo em nova aba');
    window.open(response.downloadUrl, '_blank');
  }

  toast({
    title: 'Arquivo exportado',
    description: `${response.filename || filename} foi baixado com sucesso`,
  });
}