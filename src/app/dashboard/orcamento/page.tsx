"use client";

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';

// PDFMake Configurações
import * as pdfMakeModule from 'pdfmake/build/pdfmake';
import * as pdfFontsModule from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

interface PdfMakeType {
  vfs: Record<string, string>;
  createPdf: (docDefinition: TDocumentDefinitions) => { print: () => void; };
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

// Interfaces de Dados
interface ClienteData {
  id: number; nome_completo: string; endereco: string | null; telefone: string | null; documento: string | null;
}

// Interfaces dos Campos Dinâmicos (Sem any)
interface Servico { id: string; descricao: string; valor: number | string; }
interface Peca { id: string; descricao: string; valor: number | string; quantidade: number | string; data: string; }

interface OSData {
  id: number; 
  data_entrada: string; 
  aparelho_tipo: string; 
  marca: string; 
  modelo: string | null; 
  serial_imei: string | null; 
  defeito_reclamacao: string;
  // NOVOS CAMPOS PARA ORÇAMENTO E LAUDO
  servicos_orcamento?: Servico[] | null;
  pecas_orcamento?: Peca[] | null;
  laudo_tecnico?: string | null;
}

function OrcamentoForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const osId = searchParams.get('id');

  const [osData, setOsData] = useState<OSData | null>(null);
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados dos Formulários de Orçamento (Iniciam vazios por padrão)
  const [servicos, setServicos] = useState<Servico[]>([{ id: '1', descricao: '', valor: 0 }]);
  const [pecas, setPecas] = useState<Peca[]>([{ id: '1', descricao: '', valor: 0, quantidade: 1, data: new Date().toISOString().split('T')[0] }]);
  const [laudoTecnico, setLaudoTecnico] = useState('');

  // Busca inicial
  useEffect(() => {
    async function fetchDados() {
      if (!osId) return setIsLoading(false);

      // =========================================================================
      // CORREÇÃO: RESET DOS ESTADOS AQUI PARA NÃO VAZAR DADOS DE OUTRA O.S.
      // =========================================================================
      setIsLoading(true);
      setOsData(null);
      setCliente(null);
      setServicos([{ id: '1', descricao: '', valor: 0 }]);
      setPecas([{ id: '1', descricao: '', valor: 0, quantidade: 1, data: new Date().toISOString().split('T')[0] }]);
      setLaudoTecnico('');
      // =========================================================================

      try {
        const { data: os, error: osError } = await supabase.from('ordens_servico').select('*').eq('id', osId).single();
        
        if (osError) throw osError;

        if (os) {
          setOsData(os);

          // SE JÁ EXISTIREM DADOS SALVOS NESTA O.S., CARREGA PARA A TELA!
          if (os.servicos_orcamento && Array.isArray(os.servicos_orcamento) && os.servicos_orcamento.length > 0) {
            setServicos(os.servicos_orcamento);
          }
          if (os.pecas_orcamento && Array.isArray(os.pecas_orcamento) && os.pecas_orcamento.length > 0) {
            setPecas(os.pecas_orcamento);
          }
          if (os.laudo_tecnico) {
            setLaudoTecnico(os.laudo_tecnico);
          }

          const { data: cli } = await supabase.from('clientes').select('*').eq('id', os.cliente_id).single();
          if (cli) setCliente(cli);
        }
      } catch (err) {
        console.error("Erro ao procurar dados:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDados();
  }, [osId]);

  // Cálculos Automáticos
  const totalServicos = servicos.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalPecas = pecas.reduce((acc, curr) => acc + ((Number(curr.valor) || 0) * (Number(curr.quantidade) || 1)), 0);
  const totalGeral = totalServicos + totalPecas;

  // Gerenciamento de Listas (Adicionar itens)
  const addServico = () => setServicos([...servicos, { id: Math.random().toString(), descricao: '', valor: 0 }]);
  const addPeca = () => setPecas([...pecas, { id: Math.random().toString(), descricao: '', valor: 0, quantidade: 1, data: new Date().toISOString().split('T')[0] }]);

  // Atualizar itens nas listas 
  const updateServico = (id: string, field: keyof Servico, value: string | number) => {
    setServicos(servicos.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  const updatePeca = (id: string, field: keyof Peca, value: string | number) => {
    setPecas(pecas.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // Funções de Gerar PDF (Laudo e Orçamento)
  const imprimirLaudo = () => {
    if(!osData || !cliente) return;
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
      content: [
        { text: '8K ELETRÔNICA', fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 5] },
        { text: 'LAUDO TÉCNICO', fontSize: 14, bold: true, alignment: 'center', color: '#0a6787', margin: [0, 0, 0, 20] },
        { text: `O.S. Nº: ${String(osData.id).padStart(5, '0')}`, bold: true, margin: [0, 0, 0, 10] },
        { text: `CLIENTE: ${cliente.nome_completo}`, margin: [0, 0, 0, 5] },
        { text: `APARELHO: ${osData.aparelho_tipo} | MARCA: ${osData.marca} | MODELO: ${osData.modelo || 'N/A'}`, margin: [0, 0, 0, 20] },
        { text: 'DESCRIÇÃO DO LAUDO:', bold: true, margin: [0, 0, 0, 10] },
        { text: laudoTecnico || 'Nenhum laudo informado.', margin: [0, 0, 0, 50], alignment: 'justify' },
        { text: '____________________________________________________\nAssinatura do Técnico Responsável', alignment: 'center', fontSize: 10 }
      ]
    };
    pdfMake.createPdf(docDefinition).print();
  };

  const imprimirOrcamento = () => {
    if(!osData || !cliente) return;
    
    const servicosBody = servicos.filter(s => s.descricao.trim() !== '').map(s => [s.descricao, `R$ ${Number(s.valor).toFixed(2)}`]);
    const pecasBody = pecas.filter(p => p.descricao.trim() !== '').map(p => [p.descricao, p.quantidade.toString(), `R$ ${Number(p.valor).toFixed(2)}`, `R$ ${(Number(p.quantidade) * Number(p.valor)).toFixed(2)}`]);

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4', pageMargins: [30, 30, 30, 30],
      content: [
        { text: '8K ELETRÔNICA', fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 5] },
        { text: 'FICHA DE ORÇAMENTO', fontSize: 14, bold: true, alignment: 'center', color: '#f59e0b', margin: [0, 0, 0, 20] },
        { text: `O.S. Nº: ${String(osData.id).padStart(5, '0')}`, bold: true, margin: [0, 0, 0, 10] },
        { text: `CLIENTE: ${cliente.nome_completo}`, margin: [0, 0, 0, 5] },
        { text: `APARELHO: ${osData.aparelho_tipo} | MARCA: ${osData.marca} | MODELO: ${osData.modelo || 'N/A'}`, margin: [0, 0, 0, 20] },
        
        { text: 'SERVIÇOS / MÃO DE OBRA', bold: true, margin: [0, 10, 0, 5] },
        servicosBody.length > 0 ? {
          table: { widths: ['*', 100], body: [['Descrição', 'Valor'], ...servicosBody] }
        } : { text: 'Nenhum serviço inserido.', italics: true, color: 'gray' },

        { text: 'PEÇAS UTILIZADAS', bold: true, margin: [0, 20, 0, 5] },
        pecasBody.length > 0 ? {
          table: { widths: ['*', 50, 80, 80], body: [['Descrição', 'Qtd', 'V. Unitário', 'V. Total'], ...pecasBody] }
        } : { text: 'Nenhuma peça inserida.', italics: true, color: 'gray' },

        { text: '\nRESUMO FINANCEIRO', bold: true, margin: [0, 20, 0, 5] },
        { text: `Total Mão de Obra: R$ ${totalServicos.toFixed(2)}`, margin: [0, 2, 0, 2] },
        { text: `Total Peças: R$ ${totalPecas.toFixed(2)}`, margin: [0, 2, 0, 2] },
        { text: `TOTAL GERAL DO ORÇAMENTO: R$ ${totalGeral.toFixed(2)}`, bold: true, fontSize: 14, color: '#0a6787', margin: [0, 10, 0, 40] },

        { text: '____________________________________________________\nAssinatura do Cliente (Aprovação)', alignment: 'center', fontSize: 10 }
      ]
    };
    pdfMake.createPdf(docDefinition).print();
  };

  // GRAVAR NO SUPABASE
  const handleGravarOrcamento = async () => {
    if (!osData) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({
          servicos_orcamento: servicos, // O Supabase converte listas para JSON automaticamente
          pecas_orcamento: pecas,
          laudo_tecnico: laudoTecnico
        })
        .eq('id', osData.id);

      if (error) throw error;

      alert('Orçamento gravado com sucesso no sistema!');
      router.push('/dashboard');

    } catch (error) {
      console.error("Erro ao guardar o orçamento:", error);
      alert('Ocorreu um erro ao guardar. Verifica a conexão ou se as colunas foram criadas no Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="text-center p-20 text-[#0a6787] font-bold">A carregar O.S...</div>;
  if (!osData) return <div className="text-center p-20 text-red-500 font-bold">O.S. não encontrada!</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Info */}
      <div className="bg-amber-50 p-6 rounded-3xl shadow-sm border border-amber-200 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-amber-600">Orçamento O.S. Nº {String(osData.id).padStart(5, '0')}</h2>
          <p className="text-sm text-amber-700/70 font-bold mt-1">Cliente: {cliente?.nome_completo} | Aparelho: {osData.aparelho_tipo}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase font-bold text-amber-500">Valor Total Estimado</p>
          <p className="text-3xl font-black text-amber-600">R$ {totalGeral.toFixed(2).replace('.', ',')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SERVIÇOS E MÃO DE OBRA */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7]">
          <h3 className="text-sm font-black text-[#0a6787] uppercase mb-4 border-b border-[#e0f1f7] pb-2">🛠️ Mão de Obra / Serviços</h3>
          <div className="space-y-4">
            {servicos.map((srv) => (
              <div key={srv.id} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição do Serviço</label>
                  <input type="text" value={srv.descricao} onChange={(e) => updateServico(srv.id, 'descricao', e.target.value)} placeholder="Ex: Reparo de Placa" className="w-full px-3 py-2 bg-[#f8fcff] border border-[#e0f1f7] rounded-lg text-sm" />
                </div>
                <div className="w-32">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Valor (R$)</label>
                  <input type="number" value={srv.valor} onChange={(e) => updateServico(srv.id, 'valor', e.target.value)} className="w-full px-3 py-2 bg-[#f8fcff] border border-[#e0f1f7] rounded-lg text-sm" />
                </div>
              </div>
            ))}
            <button onClick={addServico} className="text-xs font-bold text-[#38bdf8] hover:text-[#0a6787]">+ Adicionar Novo Serviço</button>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-right">
            <span className="text-sm font-bold text-gray-500">Subtotal Serviços: <span className="text-[#0a6787]">R$ {totalServicos.toFixed(2)}</span></span>
          </div>
        </div>

        {/* PEÇAS UTILIZADAS */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7]">
          <h3 className="text-sm font-black text-[#0a6787] uppercase mb-4 border-b border-[#e0f1f7] pb-2">⚙️ Peças Utilizadas</h3>
          <div className="space-y-4">
            {pecas.map((peca) => (
              <div key={peca.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Peça</label>
                  <input type="text" value={peca.descricao} onChange={(e) => updatePeca(peca.id, 'descricao', e.target.value)} placeholder="Ex: Tela LCD" className="w-full px-2 py-2 bg-[#f8fcff] border border-[#e0f1f7] rounded-lg text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Qtd</label>
                  <input type="number" value={peca.quantidade} onChange={(e) => updatePeca(peca.id, 'quantidade', e.target.value)} className="w-full px-2 py-2 bg-[#f8fcff] border border-[#e0f1f7] rounded-lg text-sm" />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Valor Un.</label>
                  <input type="number" value={peca.valor} onChange={(e) => updatePeca(peca.id, 'valor', e.target.value)} className="w-full px-2 py-2 bg-[#f8fcff] border border-[#e0f1f7] rounded-lg text-sm" />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Data</label>
                  <input type="date" value={peca.data} onChange={(e) => updatePeca(peca.id, 'data', e.target.value)} className="w-full px-2 py-2 bg-[#f8fcff] border border-[#e0f1f7] rounded-lg text-[10px]" />
                </div>
              </div>
            ))}
            <button onClick={addPeca} className="text-xs font-bold text-[#38bdf8] hover:text-[#0a6787]">+ Adicionar Nova Peça</button>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-right">
            <span className="text-sm font-bold text-gray-500">Subtotal Peças: <span className="text-[#0a6787]">R$ {totalPecas.toFixed(2)}</span></span>
          </div>
        </div>
      </div>

      {/* LAUDO TÉCNICO */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7]">
        <div className="flex justify-between items-center mb-4 border-b border-[#e0f1f7] pb-2">
          <h3 className="text-sm font-black text-[#0a6787] uppercase">📝 Laudo Técnico (Opcional)</h3>
          <button onClick={imprimirLaudo} className="px-4 py-1.5 bg-[#f0f9ff] text-[#0a6787] text-xs font-bold rounded-lg hover:bg-[#e0f7ff] flex items-center gap-1 border border-[#a3d8e8]">
            <span>🖨️</span> Gerar Laudo em PDF
          </button>
        </div>
        <textarea 
          rows={4} 
          value={laudoTecnico}
          onChange={(e) => setLaudoTecnico(e.target.value)}
          placeholder="Digite aqui as observações técnicas sobre o equipamento, componentes testados, etc..." 
          className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] text-sm focus:ring-2 focus:ring-[#0a6787]/30 resize-none"
        ></textarea>
      </div>

      {/* AÇÕES FINAIS */}
      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={imprimirOrcamento} className="px-6 py-4 bg-white text-amber-500 border-2 border-amber-200 font-black rounded-xl hover:bg-amber-50 transition-all flex items-center gap-2">
          <span>🖨️</span> Imprimir Ficha de Orçamento
        </button>
        <button 
          onClick={handleGravarOrcamento} 
          disabled={isSubmitting}
          className="px-8 py-4 bg-amber-500 text-white font-black rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <span>{isSubmitting ? "⏳" : "💾"}</span> 
          {isSubmitting ? 'A guardar...' : 'Gravar Orçamento no Sistema'}
        </button>
      </div>

    </div>
  );
}

export default function OrcamentoPage() {
  return (
    <Suspense fallback={<div className="text-center p-10 font-bold">A carregar interface...</div>}>
      <OrcamentoForm />
    </Suspense>
  );
}