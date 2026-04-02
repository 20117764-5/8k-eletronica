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

// Interfaces - ADICIONADO O EMAIL AQUI
interface ClienteData { 
  id: number; 
  nome_completo: string; 
  endereco: string | null; 
  telefone: string | null; 
  documento: string | null; 
  email: string | null; 
}

interface Servico { id: string; descricao: string; valor: number | string; }
interface Peca { id: string; descricao: string; valor: number | string; quantidade: number | string; data: string; }

interface OSData {
  id: number; cliente_id: number; data_entrada: string; aparelho_tipo: string; marca: string; modelo: string | null; serial_imei: string | null; defeito_reclamacao: string;
  servicos_orcamento?: Servico[] | null; pecas_orcamento?: Peca[] | null; laudo_tecnico?: string | null;
  status: string; data_encerramento?: string | null; condicao_encerramento?: string | null; desconto?: number | null; forma_pagamento?: string | null; valor_final?: number | null;
}

function EncerrarOsForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const osId = searchParams.get('id');

  const [osData, setOsData] = useState<OSData | null>(null);
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Status de bloqueio se já foi encerrada
  const [isJaEncerrada, setIsJaEncerrada] = useState(false);

  // Estados do Formulário de Encerramento
  const [condicao, setCondicao] = useState('Entregue e Reparado');
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  const [desconto, setDesconto] = useState<string | number>(0);

  useEffect(() => {
    async function fetchDados() {
      if (!osId) return;
      setIsLoading(true);

      try {
        const { data: os, error: osError } = await supabase.from('ordens_servico').select('*').eq('id', osId).single();
        if (osError) throw osError;

        if (os) {
          setOsData(os);
          
          // Verifica se a OS já está fechada
          if (os.data_encerramento || os.condicao_encerramento) {
            setIsJaEncerrada(true);
            if (os.condicao_encerramento) setCondicao(os.condicao_encerramento);
            if (os.forma_pagamento) setFormaPagamento(os.forma_pagamento);
            if (os.desconto) setDesconto(os.desconto);
          }

          const { data: cli } = await supabase.from('clientes').select('*').eq('id', os.cliente_id).single();
          if (cli) setCliente(cli);
        }
      } catch (err) {
        console.error("Erro:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDados();
  }, [osId]);

  // Cálculos baseados no Orçamento guardado
  const servicos = osData?.servicos_orcamento || [];
  const pecas = osData?.pecas_orcamento || [];
  
  const totalServicos = servicos.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalPecas = pecas.reduce((acc, curr) => acc + ((Number(curr.valor) || 0) * (Number(curr.quantidade) || 1)), 0);
  const subTotal = totalServicos + totalPecas;
  
  const valorDesconto = Number(desconto) || 0;
  const valorFinal = subTotal - valorDesconto;

  // GERAR PDF DE ENCERRAMENTO (Com ou Sem Garantia)
  const gerarPdfEncerramento = () => {
    if (!osData || !cliente) return;

    const dataAtual = new Date();
    const dataAtualStr = dataAtual.toLocaleDateString('pt-BR');
    const horaAtualStr = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Calculo de 90 dias de garantia
    const dataGarantia = new Date(dataAtual);
    dataGarantia.setDate(dataGarantia.getDate() + 90);
    const dataGarantiaStr = dataGarantia.toLocaleDateString('pt-BR');

    const isReparado = condicao === 'Entregue e Reparado';

    const servicosBody = servicos.map(s => [s.descricao, '1', `R$ ${Number(s.valor).toFixed(2)}`, `R$ ${Number(s.valor).toFixed(2)}`]);
    const pecasBody = pecas.map(p => [p.descricao, p.quantidade.toString(), `R$ ${Number(p.valor).toFixed(2)}`, `R$ ${(Number(p.quantidade) * Number(p.valor)).toFixed(2)}`]);

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4', pageMargins: [30, 30, 30, 30],
      defaultStyle: { fontSize: 9 },
      content: [
        {
          table: {
            widths: ['*', 150],
            body: [
              [
                { text: '8K ELETRÔNICA\nAv. Eng. Antonio de Goes, 340 Loja 01 Recife - PE\n(81) 3465-6042 / 98883-9428\nChave PIX (CNPJ: 34.700.879/0001-04)', margin: [0, 5, 0, 5] },
                { text: `O.S. Nº: ${String(osData.id).padStart(5, '0')}\nDATA SAÍDA:\n${dataAtualStr} às ${horaAtualStr}`, alignment: 'right', bold: true, margin: [0, 5, 5, 5] }
              ]
            ]
          }, margin: [0, 0, 0, 10]
        },
        {
          table: {
            widths: ['*', '*', 100],
            body: [
              [{ text: `CLIENTE: ${cliente.nome_completo}`, colSpan: 2, bold: true }, {}, { text: `CPF/CNPJ: ${cliente.documento || ''}` }],
              [{ text: `ENDEREÇO: ${cliente.endereco || ''}`, colSpan: 3 }, {}, {}],
              [{ text: `TELEFONE: ${cliente.telefone || ''}` }, { text: `EMAIL: ${cliente.email || ''}`, colSpan: 2 }, {}]
            ]
          }, margin: [0, 0, 0, 10]
        },
        {
          table: {
            widths: ['*', '*', '*', 100],
            body: [
              [{ text: `APARELHO: ${osData.aparelho_tipo}` }, { text: `MARCA: ${osData.marca}` }, { text: `MODELO: ${osData.modelo || ''}` }, { text: `SERIAL: ${osData.serial_imei || ''}` }],
              [{ text: `DEFEITO RECLAMADO: ${osData.defeito_reclamacao}`, colSpan: 4, bold: true }, {}, {}, {}],
              [{ text: `CONDIÇÃO DE ENTREGA: ${condicao}`, colSpan: 4, bold: true, color: isReparado ? 'green' : 'red' }, {}, {}, {}]
            ]
          }, margin: [0, 0, 0, 15]
        },

        // Só mostra a tabela de orçamento se foi reparado ou se quiser mostrar o que foi feito
        isReparado ? { text: 'PEÇAS SUBSTITUÍDAS E SERVIÇOS', bold: true, margin: [0, 0, 0, 5] } : '',
        isReparado && pecasBody.length > 0 ? {
          table: { widths: ['*', 30, 60, 60], body: [['Peça', 'Qtd', 'V. Un.', 'V. Total'], ...pecasBody] }, margin: [0, 0, 0, 10]
        } : '',
        isReparado && servicosBody.length > 0 ? {
          table: { widths: ['*', 30, 60, 60], body: [['Serviço', 'Qtd', 'V. Un.', 'V. Total'], ...servicosBody] }, margin: [0, 0, 0, 10]
        } : '',

        // Resumo Financeiro
        {
          table: {
            widths: ['*', 100],
            body: [
              [{ text: 'SUBTOTAL (Peças + Mão de Obra):', alignment: 'right' }, { text: `R$ ${subTotal.toFixed(2)}`, alignment: 'right' }],
              [{ text: 'DESCONTO:', alignment: 'right' }, { text: `R$ ${valorDesconto.toFixed(2)}`, alignment: 'right' }],
              [{ text: 'TOTAL PAGO:', alignment: 'right', bold: true }, { text: `R$ ${valorFinal.toFixed(2)}`, alignment: 'right', bold: true }],
              [{ text: `FORMA DE PAGAMENTO: ${formaPagamento}`, colSpan: 2, alignment: 'right', italics: true }, {}]
            ]
          }, margin: [0, 0, 0, 20], layout: 'noBorders'
        },

        // TEXTO DE GARANTIA OU TERMO DE DEVOLUÇÃO
        isReparado ? {
          text: 'TERMO DE GARANTIA', bold: true, fontSize: 10, margin: [0, 0, 0, 5]
        } : {
          text: 'TERMO DE DEVOLUÇÃO SEM REPARO', bold: true, fontSize: 10, margin: [0, 0, 0, 5]
        },
        
        isReparado ? {
          text: [
            '1 - A garantia cobre as peças substituídas, até 90 dias a contar da data deste certificado.\n',
            '2 - Caso o equipamento apresente novo defeito durante este período, somente serão cobradas peças não trocadas.\n',
            '3 - A garantia perderá efeito se for identificada violação de lacre, queda, conexão em voltagem errada ou danos da natureza.\n\n',
            { text: `VÁLIDO ATÉ: ${dataGarantiaStr} (90 dias)`, bold: true, fontSize: 12 }
          ]
        } : {
          text: [
            `O aparelho acima descrito está sendo devolvido ao cliente na condição de: "${condicao}".\n`,
            'Declaro que estou retirando o equipamento no mesmo estado em que foi deixado na assistência, isentando a 8K Eletrônica de garantias futuras sobre o defeito reclamado, visto que o reparo não foi aprovado ou executado.\n'
          ]
        },

        { text: '\n\nDeclaro estar recebendo o equipamento constante nesta Ordem de Serviço.', alignment: 'center', margin: [0, 30, 0, 20] },
        {
          columns: [
            { text: '____________________________________________________\nASSINATURA DO CLIENTE', alignment: 'center' },
            { text: '____________________________________________________\n8K ELETRÔNICA', alignment: 'center' }
          ]
        }
      ]
    };

    pdfMake.createPdf(docDefinition).print();
  };

  const handleEncerrar = async () => {
    if (!osData) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({
          status: condicao, // Atualiza o status geral da O.S. para a condição escolhida
          condicao_encerramento: condicao,
          data_encerramento: new Date().toISOString(),
          forma_pagamento: formaPagamento,
          desconto: valorDesconto,
          valor_final: valorFinal
        })
        .eq('id', osData.id);

      if (error) throw error;

      alert('O.S. Encerrada com sucesso!');
      setIsJaEncerrada(true);
      gerarPdfEncerramento(); // Já abre a impressão na hora
      
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao encerrar a O.S.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="text-center p-20 text-emerald-600 font-bold">A carregar O.S...</div>;
  if (!osData) return <div className="text-center p-20 text-red-500 font-bold">O.S. não encontrada!</div>;

  // TELA DE BLOQUEIO SE JÁ ESTIVER ENCERRADA
  if (isJaEncerrada) {
    return (
      <div className="max-w-2xl mx-auto mt-10 bg-white p-10 rounded-3xl shadow-lg border-2 border-emerald-100 text-center space-y-6">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-5xl mx-auto">
          🔒
        </div>
        <div>
          <h2 className="text-3xl font-black text-emerald-600">O.S. Já Encerrada!</h2>
          <p className="text-gray-500 mt-2">A Ordem de Serviço Nº {String(osData.id).padStart(5, '0')} foi finalizada em {new Date(osData.data_encerramento || '').toLocaleDateString('pt-BR')}.</p>
          <p className="font-bold text-emerald-700 mt-1">Situação: {condicao}</p>
        </div>
        <div className="flex justify-center gap-4 pt-6 border-t border-gray-100">
          <Link href="/dashboard" className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">
            Voltar ao Início
          </Link>
          <button onClick={gerarPdfEncerramento} className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-md flex items-center gap-2">
            <span>🖨️</span> Reimprimir Ficha de Saída
          </button>
        </div>
      </div>
    );
  }

  // TELA NORMAL DE ENCERRAMENTO
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="bg-emerald-50 p-6 rounded-3xl shadow-sm border border-emerald-200 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-emerald-700 uppercase">Encerrar O.S. {String(osData.id).padStart(5, '0')}</h2>
          <p className="text-sm text-emerald-700/70 font-bold mt-1">Cliente: {cliente?.nome_completo} | Aparelho: {osData.aparelho_tipo}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LADO ESQUERDO: CONDIÇÃO E PAGAMENTO */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7]">
            <h3 className="text-sm font-black text-[#0a6787] uppercase mb-4 border-b border-[#e0f1f7] pb-2">📦 Condição de Saída</h3>
            <select 
              value={condicao}
              onChange={(e) => setCondicao(e.target.value)}
              className="w-full px-4 py-4 bg-[#f8fcff] border-2 border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold text-lg focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 cursor-pointer transition-all"
            >
              <option value="Entregue e Reparado">✅ Entregue e Reparado (Gera Garantia)</option>
              <option value="Devolvido sem reparo (Orçamento Reprovado)">❌ Devolvido sem reparo (Orçamento Reprovado)</option>
              <option value="Devolvido sem conserto (Sem peça/solução)">⚠️ Devolvido sem conserto (Sem peça/solução)</option>
              <option value="Aparelho não apresentou defeito">🔍 Aparelho não apresentou defeito</option>
            </select>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7]">
            <h3 className="text-sm font-black text-[#0a6787] uppercase mb-4 border-b border-[#e0f1f7] pb-2">💳 Processo de Pagamento</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Desconto (R$)</label>
                <input 
                  type="number" 
                  value={desconto} 
                  onChange={(e) => setDesconto(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Forma de Pagamento</label>
                <select 
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold outline-none"
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Cortesia / Isento">Cortesia / Isento</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: RESUMO FINANCEIRO */}
        <div className="lg:col-span-5 bg-[#0a6787] text-white p-8 rounded-3xl shadow-lg flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 text-9xl opacity-10">💲</div>
          <h3 className="text-sm font-black text-[#a3d8e8] uppercase mb-6 border-b border-white/20 pb-2">Resumo Financeiro da O.S.</h3>
          
          <div className="space-y-4 text-sm font-medium">
            <div className="flex justify-between items-center">
              <span className="text-[#a3d8e8]">Total Peças:</span>
              <span>R$ {totalPecas.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#a3d8e8]">Total Serviços:</span>
              <span>R$ {totalServicos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-white/20">
              <span className="text-[#a3d8e8]">Subtotal:</span>
              <span className="text-lg">R$ {subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-red-300">
              <span>Desconto Aplicado:</span>
              <span>- R$ {valorDesconto.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-6 border-t border-white/20">
              <span className="text-xl font-black text-emerald-300">TOTAL A PAGAR:</span>
              <span className="text-3xl font-black text-emerald-400">R$ {valorFinal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Link href="/dashboard" className="px-6 py-4 bg-white text-gray-500 border border-gray-200 font-bold rounded-xl hover:bg-gray-50 transition-all">
          Cancelar
        </Link>
        <button 
          onClick={handleEncerrar} 
          disabled={isSubmitting}
          className="px-8 py-4 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <span>{isSubmitting ? "⏳" : "🔒"}</span> 
          {isSubmitting ? 'Encerrando...' : 'Encerrar O.S. e Imprimir Recibo'}
        </button>
      </div>

    </div>
  );
}

export default function EncerrarOsPage() {
  return (
    <Suspense fallback={<div className="text-center p-10 font-bold">A carregar interface...</div>}>
      <EncerrarOsForm />
    </Suspense>
  );
}