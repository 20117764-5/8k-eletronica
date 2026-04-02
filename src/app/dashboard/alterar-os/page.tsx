"use client";

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';

// =========================================================================
// IMPORTAÇÕES PARA GERAR O PDF (Para poderes reimprimir)
// =========================================================================
import * as pdfMakeModule from 'pdfmake/build/pdfmake';
import * as pdfFontsModule from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

// Adicionado o comando "print" na interface para o TypeScript não reclamar
interface PdfMakeType {
  vfs: Record<string, string>;
  createPdf: (docDefinition: TDocumentDefinitions) => {
    download: (defaultFileName?: string) => void;
    print: () => void; 
    open: () => void;
  };
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

// =========================================================================
// INTERFACES (MOLDES DE DADOS)
// =========================================================================
interface ClienteData {
  id: number;
  nome_completo: string;
  endereco: string | null;
  telefone: string | null;
  documento: string | null;
  email: string | null;
}

interface OSData {
  id: number;
  cliente_id: number;
  data_entrada: string;
  aparelho_tipo: string;
  marca: string;
  modelo: string | null;
  serial_imei: string | null;
  valor_seguro: number;
  defeito_reclamacao: string;
  acessorios_deixados: string | null;
  observacoes: string | null;
  tecnico_resp: string | null;
  prioridade: string;
  status: string;
}

// =========================================================================
// COMPONENTE PRINCIPAL DO FORMULÁRIO DE EDIÇÃO
// =========================================================================
function AlterarOsForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const osId = searchParams.get('id');

  const [osData, setOsData] = useState<OSData | null>(null);
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataHoraFormatada, setDataHoraFormatada] = useState('');

  useEffect(() => {
    async function fetchOsECliente() {
      if (!osId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: os, error: osError } = await supabase
          .from('ordens_servico')
          .select('*')
          .eq('id', osId)
          .single();

        if (osError) throw osError;
        
        if (os) {
          setOsData(os);
          
          if (os.data_entrada) {
            const dataObj = new Date(os.data_entrada);
            const formatada = new Date(dataObj.getTime() - dataObj.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
            setDataHoraFormatada(formatada);
          }

          const { data: cli, error: cliError } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', os.cliente_id)
            .single();

          if (cliError) throw cliError;
          if (cli) setCliente(cli);
        }
      } catch (error) {
        console.error("Erro ao procurar dados:", error);
        alert("Ordem de Serviço não encontrada ou ocorreu um erro.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOsECliente();
  }, [osId]);

  const handleAtualizar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!osData || !cliente) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    // ============================================
    // 1. PREPARAR DADOS DO CLIENTE PARA ATUALIZAR
    // ============================================
    const clienteAtualizado = {
      nome_completo: formData.get('cliente_nome'),
      telefone: formData.get('cliente_telefone'),
      documento: formData.get('cliente_documento'),
      endereco: formData.get('cliente_endereco'),
      email: formData.get('cliente_email'),
    };

    // ============================================
    // 2. PREPARAR DADOS DA O.S. PARA ATUALIZAR
    // ============================================
    const valorSeguroStr = formData.get('valor_seguro') as string;
    const valorSeguroTratado = valorSeguroStr ? parseFloat(valorSeguroStr.replace(',', '.')) : 0;

    const osAtualizada = {
      data_entrada: formData.get('data_entrada'),
      aparelho_tipo: formData.get('aparelho_tipo'),
      marca: formData.get('marca'),
      modelo: formData.get('modelo'),
      serial_imei: formData.get('serial_imei'),
      valor_seguro: valorSeguroTratado,
      defeito_reclamacao: formData.get('defeito_reclamacao'),
      acessorios_deixados: formData.get('acessorios_deixados'),
      observacoes: formData.get('observacoes'),
      tecnico_resp: formData.get('tecnico_resp'),
      prioridade: formData.get('prioridade'),
      status: formData.get('status') 
    };

    try {
      // 1º: Salva o Cliente
      const { error: erroCliente } = await supabase
        .from('clientes')
        .update(clienteAtualizado)
        .eq('id', cliente.id);

      if (erroCliente) throw erroCliente;

      // 2º: Salva a O.S.
      const { error: erroOs } = await supabase
        .from('ordens_servico')
        .update(osAtualizada)
        .eq('id', osData.id);

      if (erroOs) throw erroOs;

      alert(`Sucesso! Os dados do cliente e da O.S. Nº ${osData.id} foram atualizados.`);
      router.push('/dashboard');
      
    } catch (error) {
      console.error("Erro ao atualizar O.S./Cliente:", error);
      alert("Ocorreu um erro ao guardar as alterações.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-20 text-[#0a6787] font-bold text-xl animate-pulse">A procurar Ordem de Serviço...</div>;
  }

  if (!osData || !cliente) {
    return (
      <div className="text-center p-20 space-y-4">
        <h2 className="text-2xl font-bold text-red-500">O.S. Não Encontrada!</h2>
        <p className="text-[#73a8bd]">Verifique se digitou o número corretamente.</p>
        <Link href="/dashboard" className="inline-block px-6 py-3 bg-[#0a6787] text-white rounded-xl font-bold">Voltar ao Início</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleAtualizar} className="max-w-7xl mx-auto space-y-6 pb-12">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a6787] p-6 rounded-3xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 px-4 py-2 rounded-xl border border-white/30 text-white font-black text-3xl tracking-wider shadow-inner">
            <span className="text-[#a3d8e8] text-lg mr-1 font-bold">O.S. Nº</span> 
            {String(osData.id).padStart(5, '0')}
          </div>
          <span className="px-3 py-1 bg-[#38bdf8] text-white text-xs font-bold uppercase rounded-full shadow-sm">
            Modo de Edição Total
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="hidden md:block text-xs font-bold text-[#a3d8e8] uppercase">
            Data/Hora de Entrada:
          </label>
          <input 
            type="datetime-local" 
            name="data_entrada"
            defaultValue={dataHoraFormatada}
            className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:ring-2 focus:ring-white/30 outline-none" 
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* =========================================================== */}
        {/* BLOCO DE EDIÇÃO DO CLIENTE */}
        {/* =========================================================== */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e0f1f7]">
            <h3 className="font-bold text-[#0a6787] flex items-center gap-2">
              <span>👤</span> Editar Dados do Cliente
            </h3>
            <span className="text-xs font-bold text-[#73a8bd] bg-[#f0f9ff] px-3 py-1 rounded-lg">Cód: {cliente.id}</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Nome Completo *</label>
              <input 
                name="cliente_nome" 
                defaultValue={cliente.nome_completo} 
                type="text" 
                className="w-full px-4 py-2 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-black focus:ring-2 focus:ring-[#0a6787]/30" 
                required 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Telefone</label>
                <input 
                  name="cliente_telefone" 
                  defaultValue={cliente.telefone || ''} 
                  type="text" 
                  className="w-full px-4 py-2 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">CPF/CNPJ</label>
                <input 
                  name="cliente_documento" 
                  defaultValue={cliente.documento || ''} 
                  type="text" 
                  className="w-full px-4 py-2 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Endereço</label>
                <input 
                  name="cliente_endereco" 
                  defaultValue={cliente.endereco || ''} 
                  type="text" 
                  className="w-full px-4 py-2 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">E-mail</label>
                <input 
                  name="cliente_email" 
                  defaultValue={cliente.email || ''} 
                  type="email" 
                  className="w-full px-4 py-2 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* STATUS DA O.S. */}
        <div className="lg:col-span-4 bg-[#e0f7ff] p-6 rounded-3xl shadow-sm border-2 border-[#a3d8e8] flex flex-col justify-center">
          <h3 className="text-sm font-black text-[#0a6787] uppercase mb-4 border-b border-[#a3d8e8] pb-2">Status da Ordem de Serviço</h3>
          <select 
            name="status" 
            defaultValue={osData.status}
            className="w-full px-4 py-3 bg-white border-2 border-[#38bdf8] rounded-xl text-[#0a6787] font-bold text-sm focus:ring-4 focus:ring-[#38bdf8]/30 outline-none transition-all cursor-pointer"
          >
            <option value="Aguardando avaliação do técnico">Aguardando avaliação do técnico</option>
            <option value="Orçamento em análise">Orçamento em análise</option>
            <option value="Aguardando aprovação do cliente">Aguardando aprovação do cliente</option>
            <option value="Orçamento Aprovado (Em conserto)">Orçamento Aprovado (Em conserto)</option>
            <option value="Orçamento Reprovado">Orçamento Reprovado</option>
            <option value="Aguardando Peça">Aguardando Peça</option>
            <option value="Consertado / Pronto para entrega">Consertado / Pronto para entrega</option>
            <option value="Entregue ao Cliente">Entregue ao Cliente</option>
            <option value="Devolvido sem conserto">Devolvido sem conserto</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mt-4">
        <button type="button" className="px-6 py-3 bg-[#0a6787] text-white font-bold rounded-t-2xl shadow-sm">📱 Aparelho e Relato</button>
      </div>

      <div className="bg-white p-8 rounded-b-3xl rounded-tr-3xl shadow-sm border border-[#e0f1f7] -mt-2 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1">
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Aparelho (Tipo) *</label>
            <input name="aparelho_tipo" defaultValue={osData.aparelho_tipo} type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" required />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Marca *</label>
            <input name="marca" defaultValue={osData.marca} type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" required />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Modelo</label>
            <input name="modelo" defaultValue={osData.modelo || ''} type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1">
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Nº de Série / IMEI</label>
            <input name="serial_imei" defaultValue={osData.serial_imei || ''} type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Valor do Seguro</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#38bdf8] font-bold">R$</span>
              <input name="valor_seguro" defaultValue={osData.valor_seguro.toFixed(2).replace('.', ',')} type="text" className="w-full pl-11 pr-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Defeito / Reclamação *</label>
            <textarea name="defeito_reclamacao" defaultValue={osData.defeito_reclamacao} rows={3} className="w-full px-4 py-3 bg-[#f0f9ff] border border-[#38bdf8]/30 rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30 resize-none" required></textarea>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Acessórios Deixados</label>
            <textarea name="acessorios_deixados" defaultValue={osData.acessorios_deixados || ''} rows={3} className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30 resize-none"></textarea>
          </div>
        </div>

        <div className="grid grid-cols-1">
          <div>
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Observações Gerais</label>
            <textarea name="observacoes" defaultValue={osData.observacoes || ''} rows={2} className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30 resize-none"></textarea>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-[#e0f1f7] gap-4">
          <div className="flex gap-4 w-full md:w-auto">
            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Técnico Resp.</label>
              <select name="tecnico_resp" defaultValue={osData.tecnico_resp || ''} className="w-full px-3 py-2 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] text-sm focus:ring-2 focus:ring-[#0a6787]/30 outline-none">
                <option value="">Não definido</option>
                <option value="Thiago Vinicius">Thiago Vinicius</option>
              </select>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Prioridade</label>
              <select name="prioridade" defaultValue={osData.prioridade} className="w-full px-3 py-2 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] text-sm focus:ring-2 focus:ring-[#0a6787]/30 outline-none">
                <option value="Normal">Normal</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-8 mt-4 border-t border-[#e0f1f7]">
          {/* BOTÃO PARA REIMPRIMIR A O.S. (Avisa para salvar primeiro se houver edição) */}
          <button 
            type="button" 
            onClick={() => {
              alert("Dica: Se alteraste dados do cliente ou aparelho, guarda as alterações primeiro para que elas saiam na impressão!");
              gerarPdfOS(osData, cliente);
            }}
            className="px-6 py-3 bg-[#f0f9ff] text-[#0a6787] border border-[#a3d8e8] font-bold rounded-xl hover:bg-[#e0f7ff] transition-all text-sm flex items-center gap-2 mr-auto"
          >
            <span>🖨️</span> Reimprimir Via
          </button>

          <Link href="/dashboard" className="px-6 py-3 bg-white text-[#73a8bd] border border-[#e0f1f7] font-bold rounded-xl hover:bg-[#f0f9ff] transition-all text-sm">
            Cancelar
          </Link>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-8 py-3 bg-[#0a6787] text-white font-black rounded-xl hover:bg-[#08526c] transition-all shadow-md flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <span>{isSubmitting ? "⏳" : "💾"}</span> 
            {isSubmitting ? 'A guardar...' : 'Guardar Alterações'}
          </button>
        </div>

      </div>
    </form>
  );
}

// =========================================================================
// FUNÇÃO QUE DESENHA E MANDA DIRETO PARA IMPRESSÃO 
// =========================================================================
function gerarPdfOS(osData: OSData, cliente: ClienteData) {
  const dataEntrada = new Date(osData.data_entrada);
  const dataFormatada = dataEntrada.toLocaleDateString('pt-BR');
  const horaFormatada = dataEntrada.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const buildVia = (tituloVia: string): Content[] => {
    return [
      {
        table: {
          widths: ['*', 200],
          body: [
            [
              {
                text: [
                  { text: '8K ELETRÔNICA\n', fontSize: 16, bold: true },
                  { text: 'Av. Eng. Antonio de Goes, 340 Loja 01 Recife - PE\n', fontSize: 9 },
                  { text: '(81) 3465-6042 / 98883-9428\n', fontSize: 9 },
                  { text: 'contato@8keletronica.com.br\n', fontSize: 9 },
                  { text: 'Chave PIX (CNPJ: 34.700.879/0001-04)', fontSize: 9 }
                ],
                border: [true, true, false, true],
                margin: [5, 5, 0, 5]
              },
              {
                text: [
                  { text: `ORDEM DE SERVIÇO - ${tituloVia}\n`, fontSize: 10, bold: true, alignment: 'right', color: '#555' },
                  { text: `Nº ${String(osData.id).padStart(5, '0')}\n\n`, fontSize: 18, bold: true, alignment: 'right', color: 'red' },
                  { text: `DATA ENTRADA: ${dataFormatada} ${horaFormatada}`, alignment: 'right', fontSize: 10, bold: true }
                ],
                border: [false, true, true, true],
                margin: [0, 5, 5, 5]
              }
            ]
          ]
        },
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          widths: ['*', '*', 120],
          body: [
            [
              { text: `NOME: ${cliente.nome_completo.toUpperCase()}`, colSpan: 2, bold: true },
              {},
              { text: `CPF/CNPJ: ${cliente.documento || ''}` }
            ],
            [
              { text: `ENDEREÇO: ${cliente.endereco || ''}`, colSpan: 3 },
              {},
              {}
            ],
            [
              { text: `TELEFONE: ${cliente.telefone || ''}` },
              { text: `EMAIL: ${cliente.email || ''}`, colSpan: 2 },
              {}
            ]
          ]
        },
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          widths: ['*', '*', '*', 100],
          body: [
            [
              { text: `APARELHO: ${osData.aparelho_tipo.toUpperCase()}` },
              { text: `MARCA: ${osData.marca.toUpperCase()}` },
              { text: `MODELO: ${osData.modelo || ''}` },
              { text: `SERIAL: ${osData.serial_imei || ''}` }
            ],
            [
              { text: `DEFEITO / RECLAMAÇÃO:\n${osData.defeito_reclamacao}`, colSpan: 4, margin: [0, 2, 0, 5], bold: true },
              {}, {}, {}
            ],
            [
              { text: `ACESSÓRIOS:\n${osData.acessorios_deixados || 'Nenhum'}`, colSpan: 2, margin: [0, 2, 0, 5] },
              {},
              { text: `OBSERVAÇÕES:\n${osData.observacoes || ''}`, colSpan: 2, margin: [0, 2, 0, 5] },
              {}
            ],
            [
              { text: `VALOR DO SEGURO: R$ ${osData.valor_seguro.toFixed(2)}`, colSpan: 4, alignment: 'right' },
              {}, {}, {}
            ]
          ]
        },
        margin: [0, 0, 0, 10]
      },
      {
        text: 'TERMOS E CONDIÇÕES DA ASSISTÊNCIA',
        bold: true,
        fontSize: 8,
        margin: [0, 0, 0, 2]
      },
      {
        text: [
          '1 - Não nos responsabilizamos por arquivos ou programas instalados no equipamento e por defeitos NÃO INFORMADOS no ato da entrada do equipamento na assistência.\n',
          '2 - Após 60 dias da entrada, os aparelhos que não forem retirados serão descartados para o lixo eletrônico ou doados para instituições de caridade.\n',
          '3 - Para a retirada do aparelho é obrigatória a apresentação da Ordem de Serviço (O.S). Sem a O.S. só retirará quem a assinou.\n',
          '4 - O serviço só será realizado após o PAGAMENTO DE PELO MENOS 50% do valor do mesmo.\n',
          '5 - Após autorização do serviço, o prazo MÉDIO para entrega do aparelho consertado é de 20 dias úteis.\n',
          '6 - Informações sobre a O.S. serão fornecidas por meio do seu nº ou pelas confirmações dos dados fornecidos pelo cliente.\n',
          '7 - Deverá ser retirado o aparelho desta O.S, no prazo máximo de 90 dias após notificação, sob pena de venda para ressarcimento.'
        ],
        fontSize: 7,
        alignment: 'justify',
        margin: [0, 0, 0, 15] 
      },
      {
        columns: [
          {
            width: '*',
            text: '____________________________________________________\nASSINATURA DO CLIENTE',
            alignment: 'center',
            fontSize: 8
          },
          {
            width: '*',
            text: '____________________________________________________\n8K ELETRÔNICA - RECEPÇÃO',
            alignment: 'center',
            fontSize: 8
          }
        ]
      }
    ];
  };

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [20, 15, 20, 15], 
    defaultStyle: {
      fontSize: 9,
      color: '#333'
    },
    content: [
      ...buildVia('VIA DO CLIENTE (REIMPRESSÃO)'),
      {
        text: '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - CORTE AQUI - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -',
        alignment: 'center',
        color: '#999',
        margin: [0, 15, 0, 15]
      },
      ...buildVia('VIA DA LOJA (REIMPRESSÃO)')
    ]
  };

  pdfMake.createPdf(docDefinition).print();
}

export default function AlterarOsPage() {
  return (
    <Suspense fallback={<div className="text-center p-10 text-[#0a6787] font-bold">A carregar interface...</div>}>
      <AlterarOsForm />
    </Suspense>
  );
}