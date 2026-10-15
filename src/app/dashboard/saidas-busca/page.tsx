"use client";

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { buildPdfHeader, getPdfBrandImage } from '@/lib/pdfBranding';
import * as pdfMakeModule from 'pdfmake/build/pdfmake';
import * as pdfFontsModule from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

interface PdfMakeType {
  vfs: Record<string, string>;
  createPdf: (docDefinition: TDocumentDefinitions) => { print: () => void };
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

type DadosOsBusca = {
  os_id: number;
  cliente_nome: string;
  cliente_documento: string | null;
  cliente_telefone: string | null;
  cliente_endereco: string | null;
  aparelho_tipo: string;
  marca: string;
  modelo: string | null;
  serial_imei: string | null;
};

type ReciboBusca = DadosOsBusca & {
  id: number;
  valor_cobrado: number;
  data_busca: string;
  created_at?: string;
};

const UNIDADES = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const ESPECIAIS = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function porExtensoAte999(numero: number): string {
  if (numero === 0) return '';
  if (numero === 100) return 'cem';

  const partes: string[] = [];
  const centena = Math.floor(numero / 100);
  const restante = numero % 100;

  if (centena) partes.push(CENTENAS[centena]);
  if (restante >= 20) {
    const dezena = Math.floor(restante / 10);
    const unidade = restante % 10;
    partes.push(unidade ? `${DEZENAS[dezena]} e ${UNIDADES[unidade]}` : DEZENAS[dezena]);
  } else if (restante >= 10) {
    partes.push(ESPECIAIS[restante - 10]);
  } else if (restante > 0) {
    partes.push(UNIDADES[restante]);
  }

  return partes.join(' e ');
}

function inteiroPorExtenso(numero: number): string {
  if (numero === 0) return 'zero';
  if (numero < 1000) return porExtensoAte999(numero);

  if (numero >= 1000000) {
    const milhoes = Math.floor(numero / 1000000);
    const restante = numero % 1000000;
    const textoMilhoes = milhoes === 1 ? 'um milhão' : `${inteiroPorExtenso(milhoes)} milhões`;
    if (!restante) return textoMilhoes;
    return `${textoMilhoes}${restante < 100 ? ' e ' : ' '}${inteiroPorExtenso(restante)}`;
  }

  const milhares = Math.floor(numero / 1000);
  const restante = numero % 1000;
  const textoMilhares = milhares === 1 ? 'mil' : `${porExtensoAte999(milhares)} mil`;
  if (!restante) return textoMilhares;
  return `${textoMilhares}${restante <= 100 ? ' e ' : ' '}${porExtensoAte999(restante)}`;
}

function valorPorExtenso(valor: number) {
  const centavosTotal = Math.round((Number(valor) || 0) * 100);
  const reais = Math.floor(centavosTotal / 100);
  const centavos = centavosTotal % 100;
  const textoReais = `${inteiroPorExtenso(reais)} ${reais === 1 ? 'real' : 'reais'}`;

  if (!centavos) return textoReais;

  return `${textoReais} e ${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
}

function formatarData(data: string) {
  return new Date(`${data.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');
}

function reciboNumero(id: number) {
  return `BUS-${String(id).padStart(6, '0')}`;
}

function dadosSalvos(dados: DadosOsBusca, valor: number, dataBusca: string) {
  return {
    os_id: dados.os_id,
    valor_cobrado: valor,
    data_busca: dataBusca,
    cliente_nome: dados.cliente_nome,
    cliente_documento: dados.cliente_documento,
    cliente_telefone: dados.cliente_telefone,
    cliente_endereco: dados.cliente_endereco,
    aparelho_tipo: dados.aparelho_tipo,
    marca: dados.marca,
    modelo: dados.modelo,
    serial_imei: dados.serial_imei,
  };
}

export default function SaidasBuscaPage() {
  const [numeroOs, setNumeroOs] = useState('');
  const [dadosOs, setDadosOs] = useState<DadosOsBusca | null>(null);
  const [valorCobrado, setValorCobrado] = useState('');
  const [dataBusca, setDataBusca] = useState(() => new Date().toISOString().slice(0, 10));
  const [reciboEmEdicao, setReciboEmEdicao] = useState<ReciboBusca | null>(null);
  const [recibos, setRecibos] = useState<ReciboBusca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [buscandoOs, setBuscandoOs] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [idProcessando, setIdProcessando] = useState<number | null>(null);
  const [erro, setErro] = useState('');

  const carregarRecibos = useCallback(async () => {
    setCarregando(true);
    try {
      const { data, error: erroConsulta } = await supabase
        .from('saidas_busca')
        .select('*')
        .order('data_busca', { ascending: false })
        .order('id', { ascending: false })
        .limit(100);

      if (erroConsulta) throw erroConsulta;
      setRecibos((data || []) as ReciboBusca[]);
    } catch (error) {
      console.error('Erro ao carregar recibos de busca:', error);
      setErro('Não foi possível carregar os recibos. Execute o arquivo ativar-saidas-busca.sql no Supabase.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarRecibos();
  }, [carregarRecibos]);

  const limparFormulario = () => {
    setNumeroOs('');
    setDadosOs(null);
    setValorCobrado('');
    setDataBusca(new Date().toISOString().slice(0, 10));
    setReciboEmEdicao(null);
    setErro('');
  };

  const buscarOs = async () => {
    const idOs = Number(numeroOs.replace(/\D/g, ''));
    if (!Number.isInteger(idOs) || idOs <= 0) {
      setErro('Informe um número de O.S. válido.');
      return;
    }

    setBuscandoOs(true);
    setErro('');

    try {
      const { data, error: erroBusca } = await supabase
        .from('ordens_servico')
        .select('id, aparelho_tipo, marca, modelo, serial_imei, cliente:clientes(nome_completo, documento, telefone, endereco)')
        .eq('id', idOs)
        .single();

      if (erroBusca) throw erroBusca;

      const cliente = Array.isArray(data.cliente) ? data.cliente[0] : data.cliente;
      if (!cliente) throw new Error('Cliente não encontrado para esta O.S.');

      setDadosOs({
        os_id: data.id,
        cliente_nome: cliente.nome_completo || 'Cliente não informado',
        cliente_documento: cliente.documento || null,
        cliente_telefone: cliente.telefone || null,
        cliente_endereco: cliente.endereco || null,
        aparelho_tipo: data.aparelho_tipo || 'Aparelho não informado',
        marca: data.marca || 'Marca não informada',
        modelo: data.modelo || null,
        serial_imei: data.serial_imei || null,
      });
    } catch (error) {
      console.error('Erro ao buscar O.S.:', error);
      setDadosOs(null);
      setErro('O.S. não encontrada. Confira o número e tente novamente.');
    } finally {
      setBuscandoOs(false);
    }
  };

  const gerarPdfRecibo = async (recibo: ReciboBusca) => {
    const brandImage = await getPdfBrandImage();
    const valor = Number(recibo.valor_cobrado);
    const aparelho = [recibo.aparelho_tipo, recibo.marca, recibo.modelo].filter(Boolean).join(' - ');

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [38, 30, 38, 45],
      defaultStyle: { fontSize: 10 },
      footer: (paginaAtual, totalPaginas) => ({
        columns: [
          { text: '8K ELETRÔNICA - Comprovante de pagamento de busca/coleta', fontSize: 7, color: '#64748b' },
          { text: `Página ${paginaAtual} de ${totalPaginas}`, alignment: 'right', fontSize: 7, color: '#64748b' },
        ],
        margin: [38, 0, 38, 16],
      }),
      content: [
        buildPdfHeader({
          brandImage,
          title: 'RECIBO DE BUSCA / COLETA',
          accentColor: '#f4c400',
          rightLines: [
            { text: `RECIBO Nº ${reciboNumero(recibo.id)}`, fontSize: 11, bold: true, color: '#111111' },
            { text: `EMITIDO EM ${formatarData(recibo.data_busca)}`, fontSize: 8, color: '#475569' },
          ],
        }),
        {
          table: {
            widths: ['*', '*'],
            body: [[
              { stack: [{ text: 'ORDEM DE SERVIÇO', fontSize: 7, bold: true, color: '#0a6787', margin: [0, 0, 0, 3] }, { text: `Nº ${String(recibo.os_id).padStart(5, '0')}`, fontSize: 12, bold: true, color: '#1f2937' }] },
              { stack: [{ text: 'DATA DO SERVIÇO', fontSize: 7, bold: true, color: '#0a6787', margin: [0, 0, 0, 3] }, { text: formatarData(recibo.data_busca), fontSize: 12, bold: true, color: '#1f2937', alignment: 'right' }] },
            ]],
          },
          layout: {
            hLineWidth: () => 0.6,
            vLineWidth: () => 0.6,
            hLineColor: () => '#d8e8ee',
            vLineColor: () => '#d8e8ee',
            fillColor: () => '#f8fcfd',
            paddingLeft: () => 12,
            paddingRight: () => 12,
            paddingTop: () => 10,
            paddingBottom: () => 10,
          },
        },
        { text: 'DECLARAÇÃO DE PAGAMENTO', fontSize: 11, bold: true, color: '#0a6787', margin: [0, 24, 0, 8] },
        {
          text: `Recebemos de ${recibo.cliente_nome} a importância de ${formatarMoeda(valor)} (${valorPorExtenso(valor)}), referente ao serviço de busca/coleta do aparelho descrito neste recibo.`,
          fontSize: 11,
          alignment: 'justify',
          lineHeight: 1.35,
          color: '#1f2937',
        },
        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: 'VALOR RECEBIDO', fontSize: 8, bold: true, color: '#0a6787', alignment: 'center' },
                { text: formatarMoeda(valor), fontSize: 23, bold: true, color: '#047857', alignment: 'center', margin: [0, 5, 0, 2] },
                { text: `(${valorPorExtenso(valor)})`, fontSize: 9, italics: true, color: '#475569', alignment: 'center' },
              ],
              margin: [10, 11, 10, 11],
            }]],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#a7e1c4',
            vLineColor: () => '#a7e1c4',
            fillColor: () => '#ecfdf5',
          },
          margin: [0, 18, 0, 23],
        },
        { text: 'DADOS DO CLIENTE E DO APARELHO', fontSize: 11, bold: true, color: '#0a6787', margin: [0, 0, 0, 7] },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                { stack: [{ text: 'CLIENTE', fontSize: 7, bold: true, color: '#0a6787', margin: [0, 0, 0, 3] }, { text: recibo.cliente_nome, fontSize: 10, bold: true, color: '#1f2937' }] },
                { stack: [{ text: 'CPF/CNPJ', fontSize: 7, bold: true, color: '#0a6787', margin: [0, 0, 0, 3] }, { text: recibo.cliente_documento || 'Não informado', fontSize: 10, color: '#1f2937' }] },
              ],
              [
                { stack: [{ text: 'TELEFONE', fontSize: 7, bold: true, color: '#0a6787', margin: [0, 0, 0, 3] }, { text: recibo.cliente_telefone || 'Não informado', fontSize: 10, color: '#1f2937' }] },
                { stack: [{ text: 'APARELHO', fontSize: 7, bold: true, color: '#0a6787', margin: [0, 0, 0, 3] }, { text: aparelho, fontSize: 10, color: '#1f2937' }] },
              ],
              [
                { colSpan: 2, stack: [{ text: 'ENDEREÇO', fontSize: 7, bold: true, color: '#0a6787', margin: [0, 0, 0, 3] }, { text: recibo.cliente_endereco || 'Não informado', fontSize: 10, color: '#1f2937' }] },
                {},
              ],
              [
                { colSpan: 2, stack: [{ text: 'MODELO / IDENTIFICAÇÃO', fontSize: 7, bold: true, color: '#0a6787', margin: [0, 0, 0, 3] }, { text: `${recibo.modelo || 'Modelo não informado'}${recibo.serial_imei ? ` - Série/IMEI: ${recibo.serial_imei}` : ''}`, fontSize: 10, color: '#1f2937' }] },
                {},
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0.6,
            vLineWidth: () => 0.6,
            hLineColor: () => '#d8e8ee',
            vLineColor: () => '#d8e8ee',
            fillColor: () => '#f8fcfd',
            paddingLeft: () => 12,
            paddingRight: () => 12,
            paddingTop: () => 9,
            paddingBottom: () => 9,
          },
        },
        { text: 'Este recibo comprova exclusivamente o pagamento do serviço de busca/coleta do aparelho vinculado à O.S. acima.', fontSize: 8, color: '#64748b', margin: [0, 18, 0, 35] },
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 245,
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 245, y2: 0, lineWidth: 0.8, lineColor: '#0a6787' }], margin: [0, 0, 0, 8] },
                { text: '8K ELETRÔNICA', alignment: 'center', fontSize: 10, bold: true, color: '#1f2937' },
                { text: 'Responsável pelo recebimento', alignment: 'center', fontSize: 8, color: '#64748b', margin: [0, 3, 0, 0] },
              ],
            },
            { width: '*', text: '' },
          ],
        },
      ],
    };

    pdfMake.createPdf(docDefinition).print();
  };

  const salvarRecibo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valor = Number(valorCobrado.replace(',', '.'));

    if (!dadosOs || !Number.isFinite(valor) || valor <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(dataBusca)) {
      setErro('Localize uma O.S., informe a data e um valor maior que zero.');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      const dados = dadosSalvos(dadosOs, valor, dataBusca);
      const consulta = reciboEmEdicao
        ? supabase.from('saidas_busca').update(dados).eq('id', reciboEmEdicao.id).select('*').single()
        : supabase.from('saidas_busca').insert([dados]).select('*').single();
      const { data, error: erroSalvamento } = await consulta;

      if (erroSalvamento) throw erroSalvamento;

      const reciboSalvo = data as ReciboBusca;
      await gerarPdfRecibo(reciboSalvo);
      await carregarRecibos();
      limparFormulario();
      alert(reciboEmEdicao ? 'Recibo atualizado e aberto para impressão.' : 'Recibo salvo e aberto para impressão.');
    } catch (error) {
      console.error('Erro ao salvar recibo:', error);
      setErro('Não foi possível salvar o recibo. Verifique se o arquivo ativar-saidas-busca.sql foi executado no Supabase.');
    } finally {
      setSalvando(false);
    }
  };

  const editarRecibo = (recibo: ReciboBusca) => {
    setReciboEmEdicao(recibo);
    setNumeroOs(String(recibo.os_id));
    setDadosOs({
      os_id: recibo.os_id,
      cliente_nome: recibo.cliente_nome,
      cliente_documento: recibo.cliente_documento,
      cliente_telefone: recibo.cliente_telefone,
      cliente_endereco: recibo.cliente_endereco,
      aparelho_tipo: recibo.aparelho_tipo,
      marca: recibo.marca,
      modelo: recibo.modelo,
      serial_imei: recibo.serial_imei,
    });
    setValorCobrado(Number(recibo.valor_cobrado).toFixed(2));
    setDataBusca(recibo.data_busca.slice(0, 10));
    setErro('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const excluirRecibo = async (recibo: ReciboBusca) => {
    if (!window.confirm(`Excluir o recibo ${reciboNumero(recibo.id)}? Esta ação não pode ser desfeita.`)) return;

    setIdProcessando(recibo.id);
    try {
      const { error: erroExclusao } = await supabase.from('saidas_busca').delete().eq('id', recibo.id);
      if (erroExclusao) throw erroExclusao;
      if (reciboEmEdicao?.id === recibo.id) limparFormulario();
      await carregarRecibos();
    } catch (error) {
      console.error('Erro ao excluir recibo:', error);
      alert('Não foi possível excluir. Confira a liberação de exclusão no Supabase.');
    } finally {
      setIdProcessando(null);
    }
  };

  const reimprimirRecibo = async (recibo: ReciboBusca) => {
    setIdProcessando(recibo.id);
    try {
      await gerarPdfRecibo(recibo);
    } finally {
      setIdProcessando(null);
    }
  };

  const aparelhoOs = dadosOs ? [dadosOs.aparelho_tipo, dadosOs.marca, dadosOs.modelo].filter(Boolean).join(' - ') : '';

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="rounded-3xl border border-[#d8a900] bg-[#f4c400] p-7 shadow-lg">
        <h2 className="text-3xl font-black text-[#0a0a0a]">Saídas / Busca</h2>
        <p className="mt-1 font-medium text-[#0a0a0a]/70">Registre o pagamento da busca/coleta do aparelho e entregue o comprovante ao cliente.</p>
      </div>

      <form onSubmit={salvarRecibo} className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="space-y-5 rounded-3xl border border-[#e0f1f7] bg-white p-6 shadow-sm xl:col-span-5">
          <div className="flex items-start justify-between gap-4 border-b border-[#e0f1f7] pb-4">
            <div>
              <h3 className="text-lg font-black text-[#0a6787]">{reciboEmEdicao ? `Editar ${reciboNumero(reciboEmEdicao.id)}` : 'Novo comprovante'}</h3>
              <p className="mt-1 text-sm text-gray-500">Informe a O.S. e o valor cobrado pelo serviço.</p>
            </div>
            {reciboEmEdicao && <button type="button" onClick={limparFormulario} className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200">Cancelar edição</button>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#73a8bd]">Número da O.S. *</label>
            <div className="mt-1 flex gap-2">
              <input value={numeroOs} onChange={(event) => { setNumeroOs(event.target.value); setDadosOs(null); setErro(''); }} inputMode="numeric" placeholder="Ex: 00015" className="min-w-0 flex-1 rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-bold text-[#0a6787] outline-none focus:border-[#38bdf8]" required />
              <button type="button" onClick={buscarOs} disabled={buscandoOs} className="rounded-xl bg-[#0a6787] px-4 py-3 text-sm font-black text-white hover:bg-[#07536e] disabled:opacity-50">{buscandoOs ? 'Buscando...' : 'Buscar O.S.'}</button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold uppercase text-[#73a8bd]">Valor da busca/coleta (R$) *
              <input type="number" step="0.01" min="0.01" value={valorCobrado} onChange={(event) => setValorCobrado(event.target.value)} placeholder="0,00" className="mt-1 w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-black text-emerald-600 outline-none focus:border-emerald-400" required />
            </label>
            <label className="block text-xs font-bold uppercase text-[#73a8bd]">Data do serviço *
              <input type="date" value={dataBusca} onChange={(event) => setDataBusca(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-bold text-[#0a6787] outline-none focus:border-[#38bdf8]" required />
            </label>
          </div>

          {valorCobrado && Number(valorCobrado) > 0 && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800"><span className="font-black">Valor por extenso:</span> {valorPorExtenso(Number(valorCobrado))}.</div>}
          {erro && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{erro}</p>}

          <div className="flex flex-col-reverse gap-3 border-t border-[#e0f1f7] pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={limparFormulario} disabled={salvando} className="rounded-xl bg-gray-100 px-5 py-3 font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-50">Limpar</button>
            <button type="submit" disabled={salvando || !dadosOs} className="rounded-xl bg-emerald-600 px-6 py-3 font-black text-white shadow-md hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar e emitir PDF'}</button>
          </div>
        </section>

        <section className="rounded-3xl border border-[#e0f1f7] bg-white p-6 shadow-sm xl:col-span-7">
          <h3 className="border-b border-[#e0f1f7] pb-4 text-lg font-black text-[#0a6787]">Dados que aparecerão no recibo</h3>
          {!dadosOs ? (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-[#a3d8e8] bg-[#f8fcff] p-8 text-center text-sm font-medium text-[#73a8bd]">Busque uma O.S. para carregar automaticamente o cliente e os dados do aparelho.</div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-[#f8fcff] p-4"><p className="text-[10px] font-black uppercase text-[#73a8bd]">Cliente</p><p className="mt-1 font-black text-[#0a6787]">{dadosOs.cliente_nome}</p><p className="mt-2 text-sm text-gray-600">CPF/CNPJ: {dadosOs.cliente_documento || 'Não informado'}</p><p className="text-sm text-gray-600">Telefone: {dadosOs.cliente_telefone || 'Não informado'}</p></div>
              <div className="rounded-2xl bg-[#f8fcff] p-4"><p className="text-[10px] font-black uppercase text-[#73a8bd]">Aparelho</p><p className="mt-1 font-black text-[#0a6787]">O.S. Nº {String(dadosOs.os_id).padStart(5, '0')}</p><p className="mt-2 text-sm text-gray-600">{aparelhoOs}</p><p className="text-sm text-gray-600">Série/IMEI: {dadosOs.serial_imei || 'Não informado'}</p></div>
              <div className="rounded-2xl bg-[#f8fcff] p-4 md:col-span-2"><p className="text-[10px] font-black uppercase text-[#73a8bd]">Endereço de coleta</p><p className="mt-1 text-sm font-medium text-gray-700">{dadosOs.cliente_endereco || 'Não informado'}</p></div>
            </div>
          )}
        </section>
      </form>

      <section className="overflow-hidden rounded-3xl border border-[#e0f1f7] bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[#e0f1f7] bg-[#f0f9ff] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="font-black text-[#0a6787]">Comprovantes emitidos</h3><p className="mt-1 text-xs text-[#73a8bd]">Edite, exclua ou reimprima um recibo quando precisar.</p></div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0a6787]">{recibos.length} registro(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-[10px] font-black uppercase tracking-wider text-[#73a8bd]"><tr><th className="px-5 py-4">Recibo</th><th className="px-5 py-4">Data</th><th className="px-5 py-4">Cliente / Aparelho</th><th className="px-5 py-4">Valor</th><th className="px-5 py-4 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-[#f0f9ff]">
              {carregando ? <tr><td colSpan={5} className="px-5 py-10 text-center font-bold text-[#38bdf8]">Carregando comprovantes...</td></tr> : recibos.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">Nenhum comprovante emitido ainda.</td></tr> : recibos.map((recibo) => (
                <tr key={recibo.id} className="hover:bg-[#f8fcff]">
                  <td className="px-5 py-4 font-black text-[#0a6787]">{reciboNumero(recibo.id)}<div className="mt-1 text-xs font-medium text-gray-500">O.S. Nº {String(recibo.os_id).padStart(5, '0')}</div></td>
                  <td className="px-5 py-4 font-medium text-gray-600">{formatarData(recibo.data_busca)}</td>
                  <td className="px-5 py-4"><div className="font-bold text-gray-800">{recibo.cliente_nome}</div><div className="mt-1 text-xs text-gray-500">{[recibo.aparelho_tipo, recibo.marca, recibo.modelo].filter(Boolean).join(' - ')}</div></td>
                  <td className="px-5 py-4 font-black text-emerald-600">{formatarMoeda(recibo.valor_cobrado)}</td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => editarRecibo(recibo)} disabled={idProcessando === recibo.id} className="rounded-lg border border-[#a3d8e8] bg-[#e0f7ff] px-3 py-2 text-xs font-bold text-[#0a6787] hover:bg-[#0a6787] hover:text-white disabled:opacity-50">Editar</button><button type="button" onClick={() => reimprimirRecibo(recibo)} disabled={idProcessando === recibo.id} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white disabled:opacity-50">Reimprimir</button><button type="button" onClick={() => excluirRecibo(recibo)} disabled={idProcessando === recibo.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-500 hover:text-white disabled:opacity-50">Excluir</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
