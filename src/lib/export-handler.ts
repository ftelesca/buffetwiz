import { supabase } from "@/integrations/supabase/client";
import { parseExportPayload } from "./export-utils";
import { toast } from "@/hooks/use-toast";

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
            return { 'Produto': r.description, 'Custo Unitário (R$)': Number(uc ?? 0) };
          } catch {
            return { 'Produto': r.description, 'Custo Unitário (R$)': 0 };
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
          'Custo (R$)': e.cost || 0,
          'Preço (R$)': e.price || 0,
          'Cliente': e?.customer?.name || ''
        }));
      } else if (target === 'insumos') {
        const { data: items } = await supabase
          .from('item')
          .select('description, cost')
          .eq('user_id', userId)
          .limit(500);
        exportData = (items || []).map((i: any) => ({ 'Insumo': i.description, 'Custo (R$)': i.cost || 0 }));
      } else if (target === 'clientes') {
        const { data: customers } = await supabase
          .from('customer')
          .select('name, email, phone')
          .eq('user_id', userId)
          .limit(500);
        exportData = (customers || []).map((c: any) => ({ 'Cliente': c.name, 'Email': c.email || '', 'Telefone': c.phone || '' }));
      }

      console.log('📊 Dados obtidos:', { target, count: exportData.length });

      const fallbackData = { type: 'csv', filename, data: exportData };
      const { data: response, error } = await supabase.functions.invoke('wizard-export', {
        body: fallbackData
      });

      if (error) {
        console.error('❌ Erro na função de export (fallback):', error);
        throw error;
      }

      console.log('✅ Resposta da função (fallback):', response);
      await downloadFile(response, filename);
      return;
    }

    // Normal path with successfully parsed payload
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

  } catch (err) {
    console.error('💥 Erro durante exportação:', err);
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