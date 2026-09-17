import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularPagamento, liquidoRegistrado } from './taxasCartao';

test('taxas de débito e das 12 opções de crédito sobre R$ 1.000', () => {
  assert.deepEqual(calcularPagamento(1000, 'Cartão de Débito', 12), { parcelas: 1, taxa_cartao_percentual: 1.44, valor_taxa_cartao: 14.4, valor_liquido: 985.6 });
  const taxas = [33.7, 67.1, 84.7, 94.7, 104.7, 114.7, 124.7, 132.7, 132.7, 132.7, 132.7, 132.7];
  taxas.forEach((taxa, i) => {
    const resultado = calcularPagamento(1000, 'Cartão de Crédito', i + 1);
    assert.equal(resultado.valor_taxa_cartao, taxa);
    assert.equal(resultado.valor_liquido, (100000 - Math.round(taxa * 100)) / 100);
    assert.equal(resultado.parcelas, i + 1);
  });
});
test('centavos, valor após desconto e troca de cartão para PIX', () => {
  assert.equal(calcularPagamento(10.01, 'Cartão de Crédito', 3).valor_liquido, 9.16);
  assert.equal(calcularPagamento(900, 'Cartão de Crédito', 3).valor_liquido, 823.77);
  assert.deepEqual(calcularPagamento(900, 'PIX', 12), { parcelas: 1, taxa_cartao_percentual: 0, valor_taxa_cartao: 0, valor_liquido: 900 });
  assert.equal(calcularPagamento(0, 'Cartão de Débito').valor_liquido, 0);
});
test('parcelas e valores inválidos são rejeitados', () => {
  for (const parcelas of [0, 13, 1.5, NaN]) assert.throws(() => calcularPagamento(100, 'Cartão de Crédito', parcelas));
  for (const valor of [-1, NaN, Infinity]) assert.throws(() => calcularPagamento(valor, 'PIX'));
});
test('histórico sem parcelas não inventa taxas; snapshots e receitas manuais são preservados', () => {
  assert.equal(liquidoRegistrado(1000, 'Cartão de Crédito'), null);
  assert.equal(liquidoRegistrado(1000, 'Cartão de Débito'), null);
  assert.equal(liquidoRegistrado(1000, 'Dinheiro'), 1000);
  assert.equal(liquidoRegistrado(1000, 'Cartão de Crédito', 900), 900);
  assert.equal(liquidoRegistrado(915.3, 'Cartão de Crédito', 915.3), 915.3);
});
