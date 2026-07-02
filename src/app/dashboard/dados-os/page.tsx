"use client";

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase'; 
import { buildPdfHeader, getPdfBrandImage, getPdfCellAvariasImage } from '@/lib/pdfBranding';

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

const TIPOS_APARELHO_OS = [
  'TV',
  'Som',
  'Forno-microondas',
  'Computador',
  'Notebook',
  'Celular',
  'Tablet',
  'Inversor solar',
  'Monitor',
  'Projetor',
  'Videogame',
  'Outro aparelho eletrônico',
];

const DADOS_CELULAR_MARKER = '[DADOS DO CELULAR]';

const SINTOMAS_CELULAR = [
  'Não liga',
  'Em loop',
  'Sem NF',
  'Tela quebrada',
  'Sem chip',
  'Sem áudio',
  'Touch não funciona',
  'Microfone com defeito',
  'Entrada de fone com defeito',
  'Sem botão(ões)',
  'Não carrega',
  'Sem tampa',
  'Bateria inchada',
  'Câmera quebrada',
  'Sem nota fiscal',
];

const AVARIAS_CELULAR = [
  'Tela frontal',
  'Tampa traseira',
  'Laterais',
  'Botões',
  'Conector de carga',
  'Câmeras',
  'Chassi / carcaça',
  'Película / vidro',
  'Marcas de queda',
  'Oxidação aparente',
];

function normalizarTextoBase(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isTipoCelular(tipo: string) {
  const texto = normalizarTextoBase(tipo);
  return texto.includes('celular') || texto.includes('smartphone') || texto.includes('iphone');
}

function getFormString(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === 'string' ? valor.trim() : '';
}

function getFormList(formData: FormData, campo: string) {
  return formData
    .getAll(campo)
    .filter((valor): valor is string => typeof valor === 'string')
    .map((valor) => valor.trim())
    .filter(Boolean);
}

function formatarDataCampo(valor: string) {
  const [ano, mes, dia] = valor.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
}

function dataLocalParaIso(valor: string) {
  if (!valor) return valor;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? valor : data.toISOString();
}

function removerBlocoDadosCelular(observacoes: string) {
  const index = observacoes.indexOf(DADOS_CELULAR_MARKER);
  return index >= 0 ? observacoes.slice(0, index).trim() : observacoes.trim();
}

function separarObservacoesCelular(observacoes?: string | null) {
  const texto = observacoes || '';
  const index = texto.indexOf(DADOS_CELULAR_MARKER);

  if (index < 0) {
    return {
      observacoesGerais: texto.trim(),
      dadosCelular: '',
    };
  }

  return {
    observacoesGerais: texto.slice(0, index).trim(),
    dadosCelular: texto.slice(index).replace(DADOS_CELULAR_MARKER, '').trim(),
  };
}

function montarObservacoesComDadosCelular(observacoes: string, formData: FormData) {
  const sintomas = getFormList(formData, 'celular_sintomas');
  const avarias = getFormList(formData, 'celular_avarias');
  const senha = getFormString(formData, 'celular_senha');
  const chip = getFormString(formData, 'celular_chip');
  const bateria = getFormString(formData, 'celular_bateria');
  const previsaoOrcamento = getFormString(formData, 'celular_previsao_orcamento');
  const previsaoEntrega = getFormString(formData, 'celular_previsao_entrega');
  const total = getFormString(formData, 'celular_total');
  const garantia = getFormString(formData, 'celular_garantia');
  const observacaoCelular = getFormString(formData, 'celular_observacoes');

  const bloco = [
    DADOS_CELULAR_MARKER,
    `Relatos marcados: ${sintomas.length ? sintomas.join(', ') : 'Nenhum'}`,
    `Avarias visíveis: ${avarias.length ? avarias.join(', ') : 'Nenhuma'}`,
    senha ? `Senha/padrão informado: ${senha}` : '',
    chip ? `Chip/operadora: ${chip}` : '',
    bateria ? `Bateria na entrada: ${bateria}` : '',
    previsaoOrcamento ? `Data prevista para orçamento: ${formatarDataCampo(previsaoOrcamento)}` : '',
    previsaoEntrega ? `Data prevista para entrega: ${formatarDataCampo(previsaoEntrega)}` : '',
    total ? `Total previsto: R$ ${total}` : '',
    garantia ? `Garantia informada: ${garantia}` : '',
    observacaoCelular ? `Observações do celular: ${observacaoCelular}` : '',
  ].filter(Boolean).join('\n');

  return [removerBlocoDadosCelular(observacoes), bloco].filter(Boolean).join('\n\n');
}

function normalizarTelefoneWhatsApp(telefone: string | null) {
  const digitos = (telefone || '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.startsWith('55')) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

function montarMensagemWhatsApp(osData: OSData, cliente: ClienteData) {
  const osNumero = String(osData.id).padStart(5, '0');
  const modelo = osData.modelo ? ` ${osData.modelo}` : '';
  const serial = osData.serial_imei ? `\nSérie/IMEI: ${osData.serial_imei}` : '';

  return [
    `Olá, ${cliente.nome_completo}!`,
    '',
    `Sua Ordem de Serviço nº ${osNumero} foi aberta na 8K Eletrônica.`,
    '',
    `Aparelho: ${osData.aparelho_tipo}`,
    `Marca/modelo: ${osData.marca}${modelo}`,
    serial,
    `Defeito informado: ${osData.defeito_reclamacao}`,
    '',
    'A equipe técnica vai avaliar o aparelho e avisar você sobre o andamento.',
    '',
    '8K Eletrônica - Assistência Técnica Especializada',
  ].filter(Boolean).join('\n');
}

function abrirWhatsAppOS(osData: OSData, cliente: ClienteData, janela?: Window | null) {
  const telefone = normalizarTelefoneWhatsApp(cliente.telefone);
  if (!telefone) {
    janela?.close();
    alert('O cliente não possui telefone cadastrado para envio pelo WhatsApp.');
    return;
  }

  const mensagem = encodeURIComponent(montarMensagemWhatsApp(osData, cliente));
  const url = `https://wa.me/${telefone}?text=${mensagem}`;

  if (janela && !janela.closed) {
    janela.location.href = url;
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
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
  const [modoCelular, setModoCelular] = useState(false);

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
          setModoCelular(isTipoCelular(osAntiga.aparelho_tipo || ''));

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

  function selecionarOsConvencional() {
    setModoCelular(false);
    setAparelhoTipo((valorAtual) => (isTipoCelular(valorAtual) ? '' : valorAtual));
  }

  function selecionarOsCelular() {
    setModoCelular(true);
    setAparelhoTipo((valorAtual) => valorAtual.trim() || 'Celular');
  }

  function handleAparelhoTipoChange(valor: string) {
    setAparelhoTipo(valor);
    setModoCelular(isTipoCelular(valor));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!cliente) {
      alert("Nenhum cliente vinculado a esta O.S.! Volte e selecione um cliente.");
      return;
    }
    setIsSubmitting(true);
    const whatsappPopup = cliente.telefone ? window.open('about:blank', '_blank') : null;
    const formData = new FormData(e.currentTarget);
    const valorSeguroStr = formData.get('valor_seguro') as string;
    const valorSeguroTratado = valorSeguroStr ? parseFloat(valorSeguroStr.replace(',', '.')) : 0;
    const tipoAparelho = getFormString(formData, 'aparelho_tipo');
    const dataEntradaLocal = getFormString(formData, 'data_entrada');
    const observacoesFormulario = getFormString(formData, 'observacoes');
    const observacoesTratadas = modoCelular || isTipoCelular(tipoAparelho)
      ? montarObservacoesComDadosCelular(observacoesFormulario, formData)
      : removerBlocoDadosCelular(observacoesFormulario);

    const novaOS = {
      cliente_id: cliente.id,
      data_entrada: dataLocalParaIso(dataEntradaLocal),
      aparelho_tipo: tipoAparelho,
      marca: formData.get('marca'),
      modelo: formData.get('modelo'),
      serial_imei: formData.get('serial_imei'),
      valor_seguro: valorSeguroTratado,
      defeito_reclamacao: formData.get('defeito_reclamacao'),
      acessorios_deixados: formData.get('acessorios_deixados'),
      observacoes: observacoesTratadas,
      tecnico_resp: formData.get('tecnico_resp'),
      prioridade: formData.get('prioridade'),
      status: 'Aguardando avaliação do técnico'
    };

    try {
      const { data, error } = await supabase.from('ordens_servico').insert([novaOS]).select().single();
      if (error) throw error;
      const osCriada = data as OSData;
      await gerarPdfOS(osCriada, cliente);
      abrirWhatsAppOS(osCriada, cliente, whatsappPopup);
      alert(`Sucesso! O.S. Nº ${data.id} gerada com sucesso. A impressão será iniciada.`);
      router.push('/dashboard'); 
    } catch (error) {
      whatsappPopup?.close();
      console.error("Erro ao salvar O.S.:", error);
      alert("Ocorreu um erro ao gravar a O.S. Verifique o console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-6 pb-12">
      <datalist id="tipos-aparelho-os">
        {TIPOS_APARELHO_OS.map((tipo) => <option key={tipo} value={tipo} />)}
      </datalist>
      
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
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#f4c400]/40 bg-[#fff8d8] p-4 md:grid-cols-2">
          <button
            type="button"
            onClick={selecionarOsConvencional}
            className={`rounded-xl border px-5 py-3 text-sm font-black transition-all ${!modoCelular ? 'border-[#0a0a0a] bg-[#0a0a0a] text-[#f4c400]' : 'border-[#e6d58a] bg-white text-[#0a0a0a] hover:border-[#0a0a0a]'}`}
          >
            OS convencional
          </button>
          <button
            type="button"
            onClick={selecionarOsCelular}
            className={`rounded-xl border px-5 py-3 text-sm font-black transition-all ${modoCelular ? 'border-[#0a0a0a] bg-[#f4c400] text-[#0a0a0a]' : 'border-[#e6d58a] bg-white text-[#0a0a0a] hover:border-[#f4c400]'}`}
          >
            OS para celular
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1">
            <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Aparelho (Tipo) *</label>
            <input name="aparelho_tipo" list="tipos-aparelho-os" value={aparelhoTipo} onChange={(e)=>handleAparelhoTipoChange(e.target.value)} type="text" placeholder="Ex: Celular, TV, notebook..." className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium focus:ring-2 focus:ring-[#0a6787]/30" required />
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

        {modoCelular && (
          <section className="space-y-5 rounded-2xl border-2 border-[#f4c400] bg-[#fffdf3] p-5">
            <div className="flex flex-col gap-1 border-b border-[#f4c400]/40 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wide text-[#0a0a0a]">Dados do aparelho celular</h3>
              <p className="text-xs font-bold text-[#6d6251]">Checklist específico para celulares, conforme a ficha de entrada.</p>
            </div>

            <div>
              <span className="mb-3 block text-xs font-black uppercase text-[#0a0a0a]">Relato / condição de entrada</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {SINTOMAS_CELULAR.map((item) => (
                  <label key={item} className="flex min-h-11 items-center gap-3 rounded-xl border border-[#efe3a7] bg-white px-3 py-2 text-sm font-bold text-[#171717]">
                    <input type="checkbox" name="celular_sintomas" value={item} className="h-4 w-4 accent-[#f4c400]" />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-3 block text-xs font-black uppercase text-[#0a0a0a]">Avarias visíveis</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {AVARIAS_CELULAR.map((item) => (
                  <label key={item} className="flex min-h-11 items-center gap-3 rounded-xl border border-[#efe3a7] bg-white px-3 py-2 text-sm font-bold text-[#171717]">
                    <input type="checkbox" name="celular_avarias" value={item} className="h-4 w-4 accent-[#f4c400]" />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-[#6d6251] uppercase mb-1">Senha / padrão</label>
                <input name="celular_senha" type="text" placeholder="Ex: 1234 ou padrão autorizado" className="w-full rounded-xl border border-[#efe3a7] bg-white px-4 py-2.5 text-[#171717] font-medium focus:ring-2 focus:ring-[#f4c400]/40" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6d6251] uppercase mb-1">Chip / operadora</label>
                <input name="celular_chip" type="text" placeholder="Ex: sem chip, Claro, Vivo..." className="w-full rounded-xl border border-[#efe3a7] bg-white px-4 py-2.5 text-[#171717] font-medium focus:ring-2 focus:ring-[#f4c400]/40" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6d6251] uppercase mb-1">Bateria na entrada</label>
                <input name="celular_bateria" type="text" placeholder="Ex: 35%, inchada, descarregada" className="w-full rounded-xl border border-[#efe3a7] bg-white px-4 py-2.5 text-[#171717] font-medium focus:ring-2 focus:ring-[#f4c400]/40" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="block text-xs font-bold text-[#6d6251] uppercase mb-1">Previsão orçamento</label>
                <input name="celular_previsao_orcamento" type="date" className="w-full rounded-xl border border-[#efe3a7] bg-white px-4 py-2.5 text-[#171717] font-medium focus:ring-2 focus:ring-[#f4c400]/40" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6d6251] uppercase mb-1">Previsão entrega</label>
                <input name="celular_previsao_entrega" type="date" className="w-full rounded-xl border border-[#efe3a7] bg-white px-4 py-2.5 text-[#171717] font-medium focus:ring-2 focus:ring-[#f4c400]/40" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6d6251] uppercase mb-1">Total previsto</label>
                <input name="celular_total" type="text" placeholder="0,00" className="w-full rounded-xl border border-[#efe3a7] bg-white px-4 py-2.5 text-[#171717] font-medium focus:ring-2 focus:ring-[#f4c400]/40" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6d6251] uppercase mb-1">Garantia</label>
                <input name="celular_garantia" type="text" placeholder="Ex: 90 dias" className="w-full rounded-xl border border-[#efe3a7] bg-white px-4 py-2.5 text-[#171717] font-medium focus:ring-2 focus:ring-[#f4c400]/40" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6d6251] uppercase mb-1">Observações do celular</label>
              <textarea name="celular_observacoes" rows={3} placeholder="Marcas, trincos, pontos específicos e autorização do cliente..." className="w-full resize-none rounded-xl border border-[#efe3a7] bg-white px-4 py-3 text-[#171717] font-medium focus:ring-2 focus:ring-[#f4c400]/40"></textarea>
            </div>
          </section>
        )}

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
async function gerarPdfOS(osData: OSData, cliente: ClienteData) {
  const brandImage = await getPdfBrandImage();
  const dataEntrada = new Date(osData.data_entrada);
  const dataFormatada = dataEntrada.toLocaleDateString('pt-BR');
  const horaFormatada = dataEntrada.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const observacoesSeparadas = separarObservacoesCelular(osData.observacoes);
  const isOsCelular = isTipoCelular(osData.aparelho_tipo) || Boolean(observacoesSeparadas.dadosCelular);
  const avariasCelularImage = isOsCelular ? await getPdfCellAvariasImage() : null;

  const buildVia = (tituloVia: string): Content[] => {
    return [
      buildPdfHeader({
        brandImage,
        title: `ORDEM DE SERVIÇO - ${tituloVia}`,
        compact: isOsCelular,
        rightLines: [
          { text: `Nº ${String(osData.id).padStart(5, '0')}`, fontSize: isOsCelular ? 16 : 18, bold: true, color: '#d11a1a' },
          { text: `DATA ENTRADA: ${dataFormatada} ${horaFormatada}`, fontSize: isOsCelular ? 8.5 : 10, bold: true },
        ],
      }),
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
        margin: isOsCelular ? [0, 0, 0, 4] : [0, 0, 0, 10]
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
              { text: `OBSERVAÇÕES:\n${observacoesSeparadas.observacoesGerais || ''}`, colSpan: 2, margin: [0, 2, 0, 5] },
              {}
            ],
            [
              { text: `VALOR DO SEGURO: R$ ${osData.valor_seguro.toFixed(2)}`, colSpan: 4, alignment: 'right' },
              {}, {}, {}
            ]
          ]
        },
        margin: isOsCelular ? [0, 0, 0, 4] : [0, 0, 0, 10]
      },
      ...(observacoesSeparadas.dadosCelular ? ([{
        table: {
          widths: ['*'],
          body: [
            [{ text: 'DADOS ESPECÍFICOS DO CELULAR', bold: true, color: '#0a0a0a', fillColor: '#f4c400' }],
            [{ text: observacoesSeparadas.dadosCelular, fontSize: isOsCelular ? 6.7 : 7, lineHeight: isOsCelular ? 1.08 : 1.1 }]
          ]
        },
        margin: isOsCelular ? [0, 0, 0, 4] : [0, 0, 0, 10]
      }] as Content[]) : []),
      {
        text: 'TERMOS E CONDIÇÕES DA ASSISTÊNCIA',
        bold: true,
        fontSize: isOsCelular ? 7.4 : 8,
        margin: [0, 0, 0, isOsCelular ? 2 : 2]
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
        fontSize: isOsCelular ? 6.15 : 7,
        alignment: 'justify',
        margin: isOsCelular ? [0, 0, 0, 7] : [0, 0, 0, 15] 
      },
      {
        columns: [
          {
            width: '*',
            text: '____________________________________________________\nASSINATURA DO CLIENTE',
            alignment: 'center',
            fontSize: isOsCelular ? 7.5 : 8
          },
          {
            width: '*',
            text: '____________________________________________________\n8K ELETRÔNICA - RECEPÇÃO',
            alignment: 'center',
            fontSize: isOsCelular ? 7.5 : 8
          }
        ]
      }
    ];
  };

  const folhaAvariasCelular: Content[] = isOsCelular
    ? ([
        avariasCelularImage
          ? {
              image: avariasCelularImage,
              fit: [760, 520],
              alignment: 'center',
              pageBreak: 'before',
              pageOrientation: 'landscape',
              margin: [0, 30, 0, 0],
            }
          : {
              text: 'Folha de avarias visíveis do celular não encontrada.',
              pageBreak: 'before',
              alignment: 'center',
              margin: [0, 260, 0, 0],
            },
      ] as Content[])
    : [];

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: isOsCelular ? [15, 8, 15, 8] : [20, 15, 20, 15], 
    defaultStyle: {
      fontSize: isOsCelular ? 8.25 : 9,
      color: '#333'
    },
    content: isOsCelular
      ? [
          ...buildVia('VIA DO CLIENTE'),
          {
            text: '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - CORTE AQUI - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -',
            alignment: 'center',
            color: '#999',
            fontSize: 6,
            margin: [0, 7, 0, 7]
          },
          ...buildVia('VIA DA LOJA'),
          ...folhaAvariasCelular,
        ]
      : [
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
