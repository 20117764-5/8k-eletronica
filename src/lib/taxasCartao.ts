// Percentuais informados pela loja. A taxa incide uma vez sobre o total.
export const TAXAS_CREDITO = [3.37, 6.71, 8.47, 9.47, 10.47, 11.47, 12.47, 13.27, 13.27, 13.27, 13.27, 13.27] as const;
export const TAXA_DEBITO = 1.44;

export function isCartao(forma?: string | null) {
  return (forma || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('cartao');
}

export function calcularPagamento(valor: number, forma: string, parcelas = 1) {
  if (!Number.isFinite(valor) || valor < 0) throw new Error('Valor inválido.');
  const credito = forma === 'Cartão de Crédito';
  if (credito && (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12)) throw new Error('Selecione de 1 a 12 parcelas.');
  const percentual = credito ? TAXAS_CREDITO[parcelas - 1] : forma === 'Cartão de Débito' ? TAXA_DEBITO : 0;
  const brutoCentavos = Math.round((valor + Number.EPSILON) * 100);
  const taxaCentavos = Math.round(brutoCentavos * Math.round(percentual * 100) / 10000);
  return {
    parcelas: credito ? parcelas : 1,
    taxa_cartao_percentual: percentual,
    valor_taxa_cartao: taxaCentavos / 100,
    valor_liquido: (brutoCentavos - taxaCentavos) / 100,
  };
}

// Cartões antigos sem taxa registrada não podem ser tratados como taxa zero.
export function liquidoRegistrado(valor: number, forma?: string | null, liquido?: number | null): number | null {
  if (liquido != null) return Number(liquido);
  return isCartao(forma) ? null : valor;
}
