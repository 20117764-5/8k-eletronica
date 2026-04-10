"use client";

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';

// PDFMake Configurações
import * as pdfMakeModule from 'pdfmake/build/pdfmake';
import * as pdfFontsModule from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

interface PdfMakeType {
  vfs: Record<string, string>;
  createPdf: (docDefinition: TDocumentDefinitions) => { print: () => void; download: (name: string) => void; };
  default?: unknown;
}
interface PdfFontsType {
  pdfMake?: { vfs: Record<string, string> };
  vfs?: Record<string, string>;
  default?: unknown;
}

const pdfMakeImport = pdfMakeModule as unknown as PdfMakeType;
const pdfFontsImport = pdfFontsModule as unknown as PdfFontsType;
const pdfMake = (pdfMakeImport.default || pdfMakeImport) as PdfMakeType;
const pdfFonts = (pdfFontsImport.default || pdfFontsImport) as PdfFontsType;
if (pdfMake && !pdfMake.vfs) {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : (pdfFonts.vfs || {});
}

interface Transacao {
  id_unica: string;
  tipo: 'ENTRADA' | 'SAIDA';
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  os_id?: number;
}

const CATEGORIAS_DESPESA = [
  "Aluguel", "Energia Elétrica", "Água", "Internet / Telefone", 
  "Material de Limpeza", "Compra de Peças (Estoque)", 
  "Salários / Comissões", "Impostos / Taxas", "Ferramentas / Equipamentos", "Outros"
];

function FinanceiroForm() {
  const [mesAtual, setMesAtual] = useState(new Date());
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados do Modal de Nova Despesa
  const [isDespesaModalOpen, setIsDespesaModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [novaDespesa, setNovaDespesa] = useState({
    descricao: '', valor: 0, categoria: CATEGORIAS_DESPESA[0], data_despesa: new Date().toISOString().slice(0, 10)
  });

  const mesFormatado = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  const mesAnterior = () => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1));
  const proximoMes = () => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1));

  useEffect(() => {
    fetchFinanceiro();
  }, [mesAtual]);

  async function fetchFinanceiro() {
    setIsLoading(true);
    const primeiroDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1).toISOString();
    const ultimoDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0, 23, 59, 59).toISOString();

    try {
      // 1. Busca ENTRADAS (Ordens de Serviço Encerradas com valor)
      const { data: osData, error: osError } = await supabase
        .from('ordens_servico')
        .select('id, data_encerramento, valor_final, cliente:clientes(nome_completo), aparelho_tipo')
        .gte('data_encerramento', primeiroDia)
        .lte('data_encerramento', ultimoDia)
        .not('valor_final', 'is', null);

      if (osError) throw osError;

      // 2. Busca SAÍDAS (Tabela de Despesas)
      const { data: despesasData, error: despError } = await supabase
        .from('despesas')
        .select('*')
        .gte('data_despesa', primeiroDia)
        .lte('data_despesa', ultimoDia);

      if (despError) throw despError;

      // 3. Unifica e Ordena tudo
      const extrato: Transacao[] = [];

      osData?.forEach(os => {
        if (os.valor_final && os.valor_final > 0) {
          // CORREÇÃO: Definindo o tipo exato em vez de usar 'any' para agradar o ESLint
          const clienteObj = os.cliente as { nome_completo: string } | { nome_completo: string }[] | null;
          const clienteNome = Array.isArray(clienteObj) ? clienteObj[0]?.nome_completo : clienteObj?.nome_completo;

          extrato.push({
            id_unica: `os-${os.id}`,
            tipo: 'ENTRADA',
            descricao: `O.S. ${String(os.id).padStart(5, '0')} - ${clienteNome || 'Desconhecido'} (${os.aparelho_tipo})`,
            categoria: 'Receita de Serviços',
            valor: Number(os.valor_final),
            data: os.data_encerramento as string,
            os_id: os.id
          });
        }
      });

      despesasData?.forEach(desp => {
        extrato.push({
          id_unica: `desp-${desp.id}`,
          tipo: 'SAIDA',
          descricao: desp.descricao,
          categoria: desp.categoria,
          valor: Number(desp.valor),
          data: desp.data_despesa
        });
      });

      // Ordena por data (mais recente primeiro)
      extrato.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      
      setTransacoes(extrato);
    } catch (error) {
      console.error("Erro ao buscar dados financeiros:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSalvarDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('despesas').insert([{
        descricao: novaDespesa.descricao,
        valor: Number(novaDespesa.valor),
        categoria: novaDespesa.categoria,
        data_despesa: new Date(novaDespesa.data_despesa).toISOString()
      }]);

      if (error) throw error;

      setIsDespesaModalOpen(false);
      setNovaDespesa({ descricao: '', valor: 0, categoria: CATEGORIAS_DESPESA[0], data_despesa: new Date().toISOString().slice(0, 10) });
      fetchFinanceiro(); // Atualiza a tela
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar saída.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // CÁLCULOS E KPI'S
  // ==========================================
  const totalEntradas = transacoes.filter(t => t.tipo === 'ENTRADA').reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidas = transacoes.filter(t => t.tipo === 'SAIDA').reduce((acc, curr) => acc + curr.valor, 0);
  const saldoLiquido = totalEntradas - totalSaidas;
  const isPositivo = saldoLiquido >= 0;

  // Cálculos para o Gráfico de Barras CSS
  const maxBarValue = Math.max(totalEntradas, totalSaidas, 1); // Evita divisão por 0
  const percEntradas = (totalEntradas / maxBarValue) * 100;
  const percSaidas = (totalSaidas / maxBarValue) * 100;

  // Cálculo de Despesas por Categoria (Para o gráfico menor)
  const despesasPorCat = CATEGORIAS_DESPESA.map(cat => {
    const total = transacoes.filter(t => t.tipo === 'SAIDA' && t.categoria === cat).reduce((acc, curr) => acc + curr.valor, 0);
    return { categoria: cat, total };
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);


  // ==========================================
  // GERAR EXTRATO EM PDF
  // ==========================================
  const imprimirExtrato = () => {
    if (transacoes.length === 0) return alert("Não há transações para imprimir neste mês.");

    const tableBody = transacoes.map(t => [
      new Date(t.data).toLocaleDateString('pt-BR'),
      t.descricao,
      t.categoria,
      { text: t.tipo === 'ENTRADA' ? `R$ ${t.valor.toFixed(2)}` : '', color: 'green', alignment: 'right' as const },
      { text: t.tipo === 'SAIDA' ? `R$ ${t.valor.toFixed(2)}` : '', color: 'red', alignment: 'right' as const }
    ]);

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4', pageMargins: [30, 40, 30, 40],
      defaultStyle: { fontSize: 9 },
      content: [
        { text: '8K ELETRÔNICA', fontSize: 18, bold: true, alignment: 'center', color: '#0a6787' },
        { text: `EXTRATO FINANCEIRO - ${mesFormatado}`, fontSize: 12, bold: true, alignment: 'center', margin: [0, 5, 0, 20] },
        
        // Resumo
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                { text: `RECEITAS (Entradas):\nR$ ${totalEntradas.toFixed(2)}`, bold: true, fillColor: '#ecfdf5', color: '#047857', margin: [5, 10, 5, 10], alignment: 'center' },
                { text: `DESPESAS (Saídas):\nR$ ${totalSaidas.toFixed(2)}`, bold: true, fillColor: '#fef2f2', color: '#b91c1c', margin: [5, 10, 5, 10], alignment: 'center' },
                { text: `SALDO LÍQUIDO:\nR$ ${saldoLiquido.toFixed(2)}`, bold: true, fillColor: isPositivo ? '#eff6ff' : '#fef2f2', color: isPositivo ? '#1d4ed8' : '#b91c1c', margin: [5, 10, 5, 10], alignment: 'center' }
              ]
            ]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 20]
        },

        { text: 'MOVIMENTAÇÃO DETALHADA', bold: true, margin: [0, 0, 0, 10] },
        
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Data', bold: true, fillColor: '#0a6787', color: 'white' },
                { text: 'Descrição', bold: true, fillColor: '#0a6787', color: 'white' },
                { text: 'Categoria', bold: true, fillColor: '#0a6787', color: 'white' },
                { text: 'Entrada (+)', bold: true, fillColor: '#0a6787', color: 'white', alignment: 'right' as const },
                { text: 'Saída (-)', bold: true, fillColor: '#0a6787', color: 'white', alignment: 'right' as const }
              ],
              ...tableBody
            ]
          },
          layout: { fillColor: function (i) { return (i % 2 === 0 && i !== 0) ? '#f8fcff' : null; } }
        },
        
        { text: '\n\nGerado pelo Sistema 8K Eletrônica em: ' + new Date().toLocaleString('pt-BR'), fontSize: 8, alignment: 'right', color: 'gray' }
      ]
    };

    pdfMake.createPdf(docDefinition).print();
  };


  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 relative">
      
      {/* HEADER E NAVEGAÇÃO DE MESES */}
      <div className="bg-[#0a6787] p-8 rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute -right-10 -top-10 text-9xl opacity-10">💰</div>
        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-3xl font-black text-white">Gestão Financeira</h2>
          <p className="text-[#a3d8e8] font-medium mt-1">Acompanhe suas receitas, despesas e fluxo de caixa.</p>
        </div>

        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/20 backdrop-blur-sm">
            <button onClick={mesAnterior} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl text-white font-bold hover:bg-white hover:text-[#0a6787] transition-all">&lt;</button>
            <span className="w-40 text-center font-black text-white uppercase tracking-wider text-sm">{mesFormatado}</span>
            <button onClick={proximoMes} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl text-white font-bold hover:bg-white hover:text-[#0a6787] transition-all">&gt;</button>
          </div>
          <button onClick={() => setIsDespesaModalOpen(true)} className="px-6 py-3 w-full bg-red-500 text-white font-black rounded-xl hover:bg-red-600 transition-all shadow-lg flex items-center justify-center gap-2">
            <span>💸</span> Lançar Despesa
          </button>
        </div>
      </div>

      {/* KPI'S E GRÁFICOS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* COLUNA 1: CARDS DE RESUMO */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex justify-between items-center relative overflow-hidden">
            <div className="absolute right-[-10px] bottom-[-10px] text-6xl opacity-10">📈</div>
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Receitas (O.S.)</p>
              <h3 className="text-3xl font-black text-emerald-500">R$ {totalEntradas.toFixed(2)}</h3>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-100 flex justify-between items-center relative overflow-hidden">
             <div className="absolute right-[-10px] bottom-[-10px] text-6xl opacity-10">📉</div>
            <div>
              <p className="text-xs font-bold text-red-500 uppercase mb-1">Despesas (Saídas)</p>
              <h3 className="text-3xl font-black text-red-500">R$ {totalSaidas.toFixed(2)}</h3>
            </div>
          </div>

          <div className={`p-6 rounded-3xl shadow-sm border flex justify-between items-center relative overflow-hidden ${isPositivo ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
            <div>
              <p className={`text-xs font-bold uppercase mb-1 ${isPositivo ? 'text-blue-600' : 'text-red-600'}`}>Saldo Líquido</p>
              <h3 className={`text-4xl font-black ${isPositivo ? 'text-blue-600' : 'text-red-600'}`}>R$ {saldoLiquido.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        {/* COLUNA 2: GRÁFICOS VISUAIS CSS */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Gráfico 1: Receitas vs Despesas */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7] flex flex-col justify-center">
            <h3 className="text-sm font-black text-[#0a6787] uppercase mb-6 border-b border-[#e0f1f7] pb-2">Saúde Financeira</h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-emerald-500">Receitas</span>
                  <span className="text-emerald-500">{totalEntradas > 0 ? '100%' : '0%'} da meta de equilíbrio</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div className="bg-emerald-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${percEntradas}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-red-500">Despesas</span>
                  <span className="text-red-500">{maxBarValue > 1 ? Math.round((totalSaidas / maxBarValue)*100) : 0}% consumido</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden relative">
                  {/* Linha de aviso (Se a despesa passar da receita, fica vermelho total) */}
                  <div className={`h-4 rounded-full transition-all duration-1000 ${totalSaidas > totalEntradas ? 'bg-red-600' : 'bg-red-400'}`} style={{ width: `${percSaidas}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico 2: Top Categorias de Despesa */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7]">
            <h3 className="text-sm font-black text-[#0a6787] uppercase mb-4 border-b border-[#e0f1f7] pb-2">Top Despesas</h3>
            {despesasPorCat.length === 0 ? (
              <div className="text-center text-gray-400 font-medium text-sm mt-10">Nenhuma despesa registrada.</div>
            ) : (
              <div className="space-y-3">
                {despesasPorCat.slice(0, 4).map((d, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-[11px] font-bold mb-1 text-gray-600 uppercase">
                      <span>{d.categoria}</span>
                      <span>R$ {d.total.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${(d.total / totalSaidas) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* EXTRATO (LISTA DE TRANSAÇÕES) */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#e0f1f7] overflow-hidden">
        
        <div className="p-5 bg-gradient-to-r from-[#f0f9ff] to-white border-b border-[#e0f1f7] flex justify-between items-center">
          <h3 className="font-bold text-[#0a6787] flex items-center gap-2">
            <span className="w-2 h-6 bg-[#38bdf8] rounded-full"></span>
            Extrato Detalhado
          </h3>
          <button onClick={imprimirExtrato} className="px-5 py-2 bg-white border border-[#a3d8e8] text-[#0a6787] font-bold rounded-xl hover:bg-[#e0f7ff] transition-all text-xs flex items-center gap-2 shadow-sm">
            <span>🖨️</span> Imprimir Extrato
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f0f9ff]/50 text-[10px] font-bold text-[#73a8bd] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição / Origem</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f9ff]">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-[#38bdf8] font-bold animate-pulse">Carregando transações...</td></tr>
              ) : transacoes.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">Nenhuma movimentação neste mês.</td></tr>
              ) : (
                transacoes.map((t) => (
                  <tr key={t.id_unica} className="hover:bg-[#f8fcff] transition-colors group">
                    <td className="px-6 py-4 text-center">
                      {t.tipo === 'ENTRADA' ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">↓</div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black">↑</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-500">
                      {new Date(t.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#0a6787]">{t.descricao}</div>
                      {t.os_id && <div className="text-[10px] text-gray-400 uppercase mt-0.5">Venda de Serviço Registrada</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">{t.categoria}</span>
                    </td>
                    <td className={`px-6 py-4 text-right font-black ${t.tipo === 'ENTRADA' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {t.tipo === 'ENTRADA' ? '+' : '-'} R$ {t.valor.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: LANÇAR DESPESA */}
      {isDespesaModalOpen && (
        <div className="fixed inset-0 bg-[#0a6787]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            <div className="p-6 bg-red-500 text-white flex justify-between items-center">
              <h3 className="text-xl font-black flex items-center gap-2"><span>💸</span> Lançar Saída / Despesa</h3>
              <button onClick={() => setIsDespesaModalOpen(false)} className="text-white hover:text-red-200 font-bold text-xl">✕</button>
            </div>

            <form onSubmit={handleSalvarDespesa} className="p-6 space-y-5 bg-[#f8fcff]">
              <div>
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Descrição Breve *</label>
                <input type="text" value={novaDespesa.descricao} onChange={(e) => setNovaDespesa({...novaDespesa, descricao: e.target.value})} className="w-full px-4 py-3 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold outline-none focus:border-red-400" required placeholder="Ex: Conta de Luz, Aluguel Loja..." />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Valor (R$) *</label>
                  <input type="number" step="0.01" value={novaDespesa.valor || ''} onChange={(e) => setNovaDespesa({...novaDespesa, valor: Number(e.target.value)})} className="w-full px-4 py-3 bg-white border border-[#e0f1f7] rounded-xl text-red-500 font-black outline-none focus:border-red-400" required min="0.01" placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Data *</label>
                  <input type="date" value={novaDespesa.data_despesa} onChange={(e) => setNovaDespesa({...novaDespesa, data_despesa: e.target.value})} className="w-full px-4 py-3 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold outline-none focus:border-red-400" required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Categoria de Custo *</label>
                <select value={novaDespesa.categoria} onChange={(e) => setNovaDespesa({...novaDespesa, categoria: e.target.value})} className="w-full px-4 py-3 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold outline-none focus:border-red-400" required>
                  {CATEGORIAS_DESPESA.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="pt-4 border-t border-[#e0f1f7] flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsDespesaModalOpen(false)} className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-red-500 text-white font-black rounded-xl hover:bg-red-600 shadow-lg disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting ? "⏳ Registrando..." : "💾 Registrar Saída"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function FinanceiroPage() {
  return (
    <Suspense fallback={<div className="text-center p-10 font-bold">A carregar interface...</div>}>
      <FinanceiroForm />
    </Suspense>
  );
}