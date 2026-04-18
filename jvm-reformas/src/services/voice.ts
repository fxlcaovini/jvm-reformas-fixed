export interface ParsedVoiceAction {
  module: 'orcamento' | 'financeiro' | 'obra' | 'cliente' | 'desconhecido';
  intent: string;
  payload: Record<string, string | number>;
}

export function parseVoiceCommand(transcript: string): ParsedVoiceAction {
  const normalized = transcript.toLowerCase();

  if (normalized.includes('orçamento')) {
    const match = normalized.match(/item\s+(.+)\s+quantidade\s+(\d+)\s+valor\s+(\d+[\.,]?\d*)/i);
    if (match) {
      return {
        module: 'orcamento',
        intent: 'adicionar_item',
        payload: {
          nome: match[1],
          quantidade: Number(match[2]),
          valor: Number(String(match[3]).replace(',', '.'))
        }
      };
    }
    return { module: 'orcamento', intent: 'abrir_criacao', payload: {} };
  }

  if (normalized.includes('pagamento') || normalized.includes('gasto')) {
    return { module: 'financeiro', intent: 'lancar_movimento', payload: {} };
  }

  if (normalized.includes('obra')) {
    return { module: 'obra', intent: 'atualizar_obra', payload: {} };
  }

  if (normalized.includes('cliente')) {
    return { module: 'cliente', intent: 'cadastrar_cliente', payload: {} };
  }

  return { module: 'desconhecido', intent: 'sem_acao', payload: {} };
}
