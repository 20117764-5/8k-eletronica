"use client";

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase'; 

// Importações para gerar o PDF
import * as pdfMakeModule from 'pdfmake/build/pdfmake';
import * as pdfFontsModule from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

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

function DadosOsForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const clienteId = searchParams.get('clienteId');
  const clonarOsId = searchParams.get('clonarOsId'); // Pega o ID da OS antiga
  const isGarantia = searchParams.get('garantia') === 'true'; // Verifica se está na garantia

  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [isLoadingCliente, setIsLoadingCliente] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataHoraAtual, setDataHoraAtual] = useState('');
  const [proximoNumeroOs, setProximoNumeroOs] = useState<string>('...');

  // Estados para preencher o formulário automaticamente
  const [aparelhoTipo, setAparelhoTipo] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [serial, setSerial] = useState('');
  const [observacoes, setObservacoes] = useState(''); // NOVO ESTADO PARA AS OBSERVAÇÕES

  // Busca o próximo número da O.S.
  useEffect(() => {
    async function fetchProximoNumero() {
      const { data } = await supabase.from('ordens_servico').select('id').order('id', { ascending: false }).limit(1).single();
      if (data) {
        setProximoNumeroOs(String(data.id + 1).padStart(5, '0'));
      } else {
        setProximoNumeroOs('00001');
      }
    }
    fetchProximoNumero();
  }, []);

  // Seta a data/hora atual
  useEffect(() => {
    const agora = new Date();
    const formatada = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setDataHoraAtual(formatada);
  }, []);

  // Busca Cliente e os Dados da O.S Antiga (se existir)
  useEffect(() => {
    async function fetchDados() {
      if (!clienteId) {
        setIsLoadingCliente(false);
        return;
      }

      // 1. Busca Cliente
      const { data: cliData } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
      if (cliData) setCliente(cliData);

      // 2. Busca OS antiga se foi mandada clonar
      if (clonarOsId) {
        const { data: osAntiga } = await supabase.from('ordens_servico').select('*').eq('id', clonarOsId).single();
        if (osAntiga) {
          setAparelhoTipo(osAntiga.aparelho_tipo || '');
          setMarca(osAntiga.marca || '');
          setModelo(osAntiga.modelo || '');
          setSerial(osAntiga.serial_imei || '');

          // SE FOR GARANTIA, PREENCHE AS OBSERVAÇÕES AUTOMATICAMENTE
          if (isGarantia) {
            setObservacoes(`RETORNO EM GARANTIA REFERENTE À O.S. Nº ${String(clonarOsId).padStart(5, '0')}`);
          }
        }
      }
      setIsLoadingCliente(false);
    }
    fetchDados();
  }, [clienteId, clonarOsId, isGarantia]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!cliente) {
      alert("Nenhum cliente vinculado a esta O.S.! Volte e selecione um cliente.");
      return;
    }
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const valorSeguroStr = formData.get('valor_seguro') as string;
    const valorSeguroTratado = valorSeguroStr ? parseFloat(valorSeguroStr.replace(',', '.')) : 0;

    const novaOS = {
      cliente_id: cliente.id,
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
      status: 'Aguardando avaliação do técnico'
    };

    try {
      const { data, error } = await supabase.from('ordens_servico').insert([novaOS]).select().single();
      if (error) throw error;
      gerarPdfOS(data as OSData, cliente);
      alert(`Sucesso! O.S. Nº ${data.id} gerada com sucesso. A impressão será iniciada.`);
      router.push('/dashboard'); 
    } catch (error) {
      console.error("Erro ao salvar O.S.:", error);
      alert("Ocorreu um erro ao gravar a O.S. Verifique o console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* BANNER DE GARANTIA (SÓ APARECE SE FOR RETORNO EM GARANTIA) */}
      {isGarantia && (
        <div className="bg-emerald-50 border-l-8 border-emerald-500 p-4 rounded-r-2xl shadow-sm flex items-center gap-4 animate-pulse">
          <div className="text-3xl">🟢</div>
          <div>
            <h3 className="font-black text-emerald-700 text-lg uppercase tracking-wide">Atenção: Aparelho na Garantia!</h3>
            <p className="text-emerald-600 font-medium text-sm">Este aparelho foi reparado na O.S. Nº {String(clonarOsId).padStart(5, '0')} há menos de 90 dias.</p>
          </div>
        </div>
      )}

      {/* Topo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a6787] p-6 rounded-3xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 px-4 py-2 rounded-xl border border-white/30 text-white font-black text-3xl tracking-wider shadow-inner">
            <span className="text-[#a3d8e8] text-lg mr-1 font-bold">O.S. Nº</span> 
            {proximoNumeroOs}
          </div>
          <span className={`px-3 py-1 text-white text-xs font-bold uppercase rounded-full shadow-sm ${isGarantia ? 'bg-emerald-500' : 'bg-amber-500'}`}>
            {isGarantia ? 'Retorno de Garantia' : 'Nova Abertura'}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="hidden md:block text-xs font-bold text-[#a3d8e8] uppercase">
            Data/Hora de Entrada:
          </label>
          <input 
            type="datetime-local" 
            name="data_entrada"
            value={dataHoraAtual}
            onChange={(e) => setDataHoraAtual(e.target.value)}
            className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:ring-2 focus:ring-white/30 outline-none" 
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e0f1f7]">
            <h3 className="font-bold text-[#0a6787] flex items-center gap-2">
              <span>👤</span> Cliente Localizado
            </h3>
            {cliente && <span className="text-xs font-bold text-[#73a8bd] bg-[#f0f9ff] px-3 py-1 rounded-lg">Cód: {cliente.id}</span>}
          </div>
          
          <div className="space-y-3">
            {isLoadingCliente ? (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="space-y-2"><div className="h-4 bg-gray-200 rounded"></div><div className="h-4 bg-gray-200 rounded w-5/6"></div></div>
                </div>
              </div>
            ) : cliente ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-[#0a6787] uppercase">{cliente.nome_completo}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mt-2">
                  <p><strong className="text-[#73a8bd]">Endereço:</strong> {cliente.endereco || 'Não informado'}</p>
                  <p><strong className="text-[#73a8bd]">Telefone:</strong> {cliente.telefone || 'Não informado'}</p>
                  <p><strong className="text-[#73a8bd]">Documento:</strong> {cliente.documento || 'Não informado'}</p>
                  <p><strong className="text-[#73a8bd]">E-mail:</strong> {cliente.email || 'Não informado'}</p>
                </div>
              </>
            ) : (
              <div className="text-red-500 font-medium">Nenhum cliente selecionado. Retorne à busca.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7] flex flex-col justify-center">
          <h3 className="text-xs font-bold text-[#73a8bd] uppercase mb-4 border-b border-[#e0f1f7] pb-2">Informações de Status</h3>
          <p className="text-[13px] text-[#73a8bd] italic leading-relaxed">
            {'* O status desta O.S. será automaticamente definido como "Aguardando avaliação do técnico" após a gravação.'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button type="button" className="px-6 py-3 bg-[#0a6787] text-white font-bold rounded-t-2xl shadow-sm">📱 Aparelho e Relato</button>
      </div>

      <div className="bg-white p-8 rounded-b-3xl rounded-tr-3xl shadow-sm border border-[#e0f1f7] -mt-2 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1">
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Aparelho (Tipo) *</label>
            <input name="aparelho_tipo" value={aparelhoTipo} onChange={(e)=>setAparelhoTipo(e.target.value)} type="text" placeholder="Ex: Smartphone, TV" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" required />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Marca *</label>
            <input name="marca" value={marca} onChange={(e)=>setMarca(e.target.value)} type="text" placeholder="Ex: Samsung" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" required />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Modelo</label>
            <input name="modelo" value={modelo} onChange={(e)=>setModelo(e.target.value)} type="text" placeholder="Ex: Galaxy S23" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1">
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Nº de Série / IMEI</label>
            <input name="serial_imei" value={serial} onChange={(e)=>setSerial(e.target.value)} type="text" placeholder="Serial do equipamento" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Valor do Seguro</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#38bdf8] font-bold">R$</span>
              <input name="valor_seguro" type="text" placeholder="0,00" className="w-full pl-11 pr-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Defeito / Reclamação *</label>
            <textarea name="defeito_reclamacao" rows={3} placeholder="Descreva o problema relatado pelo cliente..." className="w-full px-4 py-3 bg-[#f0f9ff] border border-[#38bdf8]/30 rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30 resize-none" required></textarea>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Acessórios Deixados</label>
            <textarea name="acessorios_deixados" rows={3} placeholder="Ex: Carregador, capinha, película..." className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30 resize-none"></textarea>
          </div>
        </div>

        <div className="grid grid-cols-1">
          <div>
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Observações Gerais</label>
            {/* O CAMPO OBSERVAÇÕES AGORA É CONTROLADO PELO ESTADO E RECEBE O TEXTO DA GARANTIA */}
            <textarea 
              name="observacoes" 
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2} 
              placeholder="Arranhões na tela, equipamento não liga, senhas de desbloqueio, etc..." 
              className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30 resize-none"
            ></textarea>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-[#e0f1f7] gap-4">
          <div className="flex gap-4 w-full md:w-auto">
            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Técnico Resp.</label>
              <select name="tecnico_resp" className="w-full px-3 py-2 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] text-sm focus:ring-2 focus:ring-[#0a6787]/30 outline-none">
                <option value="">Não definido</option>
                <option value="Thiago Vinicius">Thiago Vinicius</option>
              </select>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Prioridade</label>
              <select name="prioridade" className="w-full px-3 py-2 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] text-sm focus:ring-2 focus:ring-[#0a6787]/30 outline-none">
                <option value="Normal">Normal</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-8 mt-4 border-t border-[#e0f1f7]">
          <Link href="/dashboard/nova-os" className="px-6 py-3 bg-white text-[#73a8bd] border border-[#e0f1f7] font-bold rounded-xl hover:bg-[#f0f9ff] transition-all text-sm">
            Cancelar
          </Link>
          <button 
            type="submit" 
            disabled={isSubmitting || !cliente}
            className="px-8 py-3 bg-[#0a6787] text-white font-black rounded-xl hover:bg-[#08526c] transition-all shadow-md flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <span>{isSubmitting ? "⏳" : "✅"}</span> 
            {isSubmitting ? 'Gravando O.S...' : 'Gravar O.S.'}
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
      ...buildVia('VIA DO CLIENTE'),
      {
        text: '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - CORTE AQUI - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -',
        alignment: 'center',
        color: '#999',
        margin: [0, 15, 0, 15]
      },
      ...buildVia('VIA DA LOJA')
    ]
  };

  pdfMake.createPdf(docDefinition).print();
}

export default function DadosOsPage() {
  return (
    <Suspense fallback={<div className="text-center p-10 text-[#0a6787] font-bold">Carregando interface...</div>}>
      <DadosOsForm />
    </Suspense>
  );
}