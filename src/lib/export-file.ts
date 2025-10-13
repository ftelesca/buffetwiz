// src/lib/export-file.ts
export async function exportToFile(payload: string) {
  try {
    // Decodifica o payload se estiver em URL encoding
    const decodedPayload = decodeURIComponent(payload);
    
    // Parse do JSON
    const exportData = JSON.parse(decodedPayload);
    
    const { filename, content, type = 'text/plain' } = exportData;
    
    if (!filename || !content) {
      throw new Error('Dados de exportação inválidos: filename e content são obrigatórios');
    }

    // Cria o blob com base no tipo
    let blob: Blob;
    
    if (type === 'application/json') {
      blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    } else if (type === 'text/csv') {
      blob = new Blob([content], { type: 'text/csv' });
    } else if (type === 'text/html') {
      blob = new Blob([content], { type: 'text/html' });
    } else {
      // Padrão para texto simples
      blob = new Blob([content], { type: 'text/plain' });
    }

    // Cria URL temporária e força o download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Adiciona ao DOM, clica e remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpa a URL temporária
    URL.revokeObjectURL(url);
    
    
    
  } catch (error) {
    console.error('Erro ao exportar arquivo:', error);
    throw new Error(`Falha ao exportar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}