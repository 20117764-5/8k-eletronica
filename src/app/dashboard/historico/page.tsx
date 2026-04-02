"use client";

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
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

interface OSData {
  id: number;
  data_entrada: string;
  data_encerramento: string | null;
  aparelho_tipo: string;
  marca: string;
  status: string;
  valor_final: number | null;
  cliente: { nome_completo: string } | null;
}

function HistoricoForm() {
  const [mesAtual, setMesAtual] = useState(new Date());
  const [historico, setHistorico] = useState<OSData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Métricas do Mês
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalEncerradas, setTotalEncerradas] = useState(0);
  const [faturamento, setFaturamento] = useState(0);

  // Função para formatar o mês por extenso
  const mesFormatado = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();

  // Navegação de Meses
  const mesAnterior = () => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1));
  const proximoMes = () => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1));

  useEffect(() => {
    async function fetchHistoricoMensal() {
      setIsLoading(true);
      
      const primeiroDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1).toISOString();
      const ultimoDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0, 23, 59, 59).toISOString();

      try {
        // Busca O.S. que entraram OU foram encerradas neste mês
        const { data, error } = await supabase
          .from('ordens_servico')
          .select(`
            id, data_entrada, data_encerramento, aparelho_tipo, marca, status, valor_final,
            cliente:clientes(nome_completo)
          `)
          .or(`data_entrada.gte.${primeiroDia},data_encerramento.gte.${primeiroDia}`)
          .or(`data_entrada.lte.${ultimoDia},data_encerramento.lte.${ultimoDia}`)
          .order('data_entrada', { ascending: false });

        if (error) throw error;

        const osList = (data as unknown) as OSData[];
        setHistorico(osList || []);

        // Calcular Métricas
        let entradas = 0;
        let encerradas = 0;
        let fat = 0;

        osList?.forEach(os => {
          const dEntrada = new Date(os.data_entrada);
          if (dEntrada.getMonth() === mesAtual.getMonth() && dEntrada.getFullYear() === mesAtual.getFullYear()) {
            entradas++;
          }
          if (os.data_encerramento) {
            const dEncerramento = new Date(os.data_encerramento);
            if (dEncerramento.getMonth() === mesAtual.getMonth() && dEncerramento.getFullYear() === mesAtual.getFullYear()) {
              encerradas++;
              fat += Number(os.valor_final || 0);
            }
          }
        });

        setTotalEntradas(entradas);
        setTotalEncerradas(encerradas);
        setFaturamento(fat);

      } catch (err) {
        console.error("Erro ao buscar histórico:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistoricoMensal();
  }, [mesAtual]);


  // ==========================================
  // EXPORTAR PARA EXCEL (CSV)
  // ==========================================
  const exportarCSV = () => {
    if (historico.length === 0) return alert("Não há dados para exportar neste mês.");
    
    // Cabeçalho do Excel
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Nº O.S.;Data Entrada;Data Encerramento;Cliente;Aparelho;Status;Valor Faturado\n";

    historico.forEach(os => {
      const id = String(os.id).padStart(5, '0');
      const entrada = new Date(os.data_entrada).toLocaleDateString('pt-BR');
      const encerramento = os.data_encerramento ? new Date(os.data_encerramento).toLocaleDateString('pt-BR') : 'Em aberto';
      const clienteNome = os.cliente?.nome_completo || 'N/A';
      const aparelho = `${os.aparelho_tipo} ${os.marca}`;
      const status = os.status;
      const valor = os.valor_final ? `R$ ${os.valor_final.toFixed(2).replace('.', ',')}` : 'R$ 0,00';

      // Junta as colunas separadas por ponto e vírgula
      const row = `"${id}";"${entrada}";"${encerramento}";"${clienteNome}";"${aparelho}";"${status}";"${valor}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Relatorio_OS_${mesFormatado.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // ==========================================
  // RELATÓRIO GERENCIAL EM PDF
  // ==========================================
  const imprimirRelatorio = () => {
    if (historico.length === 0) return alert("Não há dados para imprimir neste mês.");

    const tableBody = historico.map(os => [
      String(os.id).padStart(5, '0'),
      new Date(os.data_entrada).toLocaleDateString('pt-BR'),
      os.cliente?.nome_completo || 'N/A',
      `${os.aparelho_tipo} ${os.marca}`,
      os.status,
      os.valor_final ? `R$ ${os.valor_final.toFixed(2)}` : '-'
    ]);

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [30, 40, 30, 40],
      defaultStyle: { fontSize: 9 },
      content: [
        { text: '8K ELETRÔNICA', fontSize: 18, bold: true, alignment: 'center', color: '#0a6787' },
        { text: `RELATÓRIO GERENCIAL - ${mesFormatado}`, fontSize: 12, bold: true, alignment: 'center', margin: [0, 5, 0, 20] },
        
        // Quadros de Resumo no PDF corrigidos (Transformados em tabela sem borda para aceitar fillColor nativo)
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                { text: `Entradas no Mês:\n${totalEntradas}`, bold: true, fillColor: '#f0f9ff', margin: [5, 5, 5, 5], alignment: 'center' },
                { text: `O.S. Fechadas:\n${totalEncerradas}`, bold: true, fillColor: '#ecfdf5', margin: [5, 5, 5, 5], alignment: 'center' },
                { text: `Faturamento:\nR$ ${faturamento.toFixed(2)}`, bold: true, fillColor: '#fef3c7', margin: [5, 5, 5, 5], alignment: 'center' }
              ]
            ]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 20]
        },

        { text: 'DETALHAMENTO DE ORDENS DE SERVIÇO', bold: true, margin: [0, 0, 0, 10] },
        
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', '*', '*', 'auto', 'auto'],
            body: [
              // Cabeçalho da tabela
              [
                { text: 'O.S.', bold: true, fillColor: '#0a6787', color: 'white' },
                { text: 'Data', bold: true, fillColor: '#0a6787', color: 'white' },
                { text: 'Cliente', bold: true, fillColor: '#0a6787', color: 'white' },
                { text: 'Aparelho', bold: true, fillColor: '#0a6787', color: 'white' },
                { text: 'Status', bold: true, fillColor: '#0a6787', color: 'white' },
                { text: 'Valor', bold: true, fillColor: '#0a6787', color: 'white' }
              ],
              // Linhas de dados
              ...tableBody
            ]
          },
          layout: {
            fillColor: function (rowIndex) {
              return (rowIndex % 2 === 0 && rowIndex !== 0) ? '#f8fcff' : null;
            }
          }
        },
        
        { text: '\n\nGerado pelo Sistema 8K Eletrônica em: ' + new Date().toLocaleString('pt-BR'), fontSize: 8, alignment: 'right', color: 'gray' }
      ]
    };

    pdfMake.createPdf(docDefinition).print();
  };


  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* HEADER DE NAVEGAÇÃO */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7] flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0a6787] flex items-center gap-2">
            <span>📈</span> Histórico e Relatórios
          </h2>
          <p className="text-sm text-[#73a8bd]">Resumo de atividades e faturamento mensal.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-[#f0f9ff] p-2 rounded-2xl border border-[#a3d8e8]">
          <button onClick={mesAnterior} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-[#0a6787] font-bold hover:bg-[#0a6787] hover:text-white transition-all">
            &lt;
          </button>
          <span className="w-48 text-center font-black text-[#0a6787] uppercase tracking-wider">
            {mesFormatado}
          </span>
          <button onClick={proximoMes} disabled={mesAtual >= new Date()} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-[#0a6787] font-bold hover:bg-[#0a6787] hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-[#0a6787]">
            &gt;
          </button>
        </div>
      </div>

      {/* DASHBOARD DE KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-8xl opacity-20">📥</div>
          <p className="text-blue-100 font-bold uppercase tracking-wider text-xs mb-2">Novas Entradas (Mês)</p>
          <h3 className="text-5xl font-black">{totalEntradas} <span className="text-lg font-medium">O.S.</span></h3>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-8xl opacity-20">✅</div>
          <p className="text-emerald-100 font-bold uppercase tracking-wider text-xs mb-2">O.S. Concluídas (Mês)</p>
          <h3 className="text-5xl font-black">{totalEncerradas} <span className="text-lg font-medium">O.S.</span></h3>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-8xl opacity-20">💰</div>
          <p className="text-amber-100 font-bold uppercase tracking-wider text-xs mb-2">Faturamento Bruto (Mês)</p>
          <h3 className="text-4xl font-black mt-2">R$ {faturamento.toFixed(2).replace('.', ',')}</h3>
        </div>
      </div>

      {/* FERRAMENTAS DE EXPORTAÇÃO E LISTA */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#e0f1f7] overflow-hidden">
        
        <div className="p-5 bg-[#f8fcff] border-b border-[#e0f1f7] flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-[#0a6787]">Movimentações do Período</h3>
          <div className="flex gap-3">
            <button onClick={exportarCSV} className="px-5 py-2 bg-green-50 text-green-700 border border-green-200 font-bold rounded-xl hover:bg-green-100 transition-all text-xs flex items-center gap-2">
              <span>📊</span> Baixar Excel
            </button>
            <button onClick={imprimirRelatorio} className="px-5 py-2 bg-red-50 text-red-700 border border-red-200 font-bold rounded-xl hover:bg-red-100 transition-all text-xs flex items-center gap-2">
              <span>🖨️</span> Imprimir Relatório
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-[11px] font-bold text-[#73a8bd] uppercase tracking-wider border-b border-[#e0f1f7]">
              <tr>
                <th className="px-6 py-4">O.S.</th>
                <th className="px-6 py-4">Data Entrada</th>
                <th className="px-6 py-4">Cliente / Aparelho</th>
                <th className="px-6 py-4">Status Atual</th>
                <th className="px-6 py-4 text-right">Faturamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f9ff]">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-[#73a8bd] font-bold animate-pulse">Calculando relatório...</td></tr>
              ) : historico.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">Nenhuma movimentação registada neste mês.</td></tr>
              ) : (
                historico.map((os) => {
                  const isEncerrada = os.data_encerramento !== null;
                  return (
                    <tr key={os.id} className="hover:bg-[#f8fcff] transition-colors">
                      <td className="px-6 py-4 font-black text-[#0a6787]">
                        {String(os.id).padStart(5, '0')}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(os.data_entrada).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800 uppercase">{os.cliente?.nome_completo || 'Sem Nome'}</div>
                        <div className="text-xs text-gray-500">{os.aparelho_tipo} {os.marca}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${isEncerrada ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                          {os.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-[#0a6787]">
                        {os.valor_final ? `R$ ${os.valor_final.toFixed(2).replace('.', ',')}` : '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default function HistoricoPage() {
  return (
    <Suspense fallback={<div className="text-center p-10 font-bold">A carregar interface...</div>}>
      <HistoricoForm />
    </Suspense>
  );
}