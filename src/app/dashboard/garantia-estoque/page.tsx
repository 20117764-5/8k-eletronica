"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { buildPdfHeader, getPdfBrandImage } from '@/lib/pdfBranding';
import * as pdfMakeModule from 'pdfmake/build/pdfmake';
import * as pdfFontsModule from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

type StatusGarantia = 'Todos' | 'Vigente' | 'Vencendo' | 'Vencida';

interface VendaGarantiaEstoque {
  id: number;
  estoque_id: number | null;
  produto_nome: string | null;
  quantidade: number;
  valor_unitario: number | null;
  desconto: number | null;
  valor_total: number;
  forma_pagamento: string | null;
  data_venda: string;
  observacoes: string | null;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
}

interface ProdutoGarantiaEstoque {
  id: number;
  codigo_sku: string | null;
  nome: string | null;
  categoria: string | null;
  tipo_aparelho?: string | null;
  subcategoria?: string | null;
  marca: string | null;
  modelo_compativel: string | null;
  valor_venda: number | null;
  condicao: string | null;
  observacoes?: string | null;
}

interface PdfMakeType {
  vfs: Record<string, string>;
  createPdf: (docDefinition: TDocumentDefinitions) => {
    print: () => void;
    download: (name: string) => void;
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

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function normalizarTexto(valor?: string | null) {
  return (valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data: string | Date) {
  return new Date(data).toLocaleDateString('pt-BR');
}

function calcularDataGarantia(dataVenda: string) {
  const data = new Date(dataVenda);
  data.setDate(data.getDate() + 90);
  return data;
}

function diasAte(data: Date) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const alvo = new Date(data);
  alvo.setHours(0, 0, 0, 0);

  return Math.ceil((alvo.getTime() - hoje.getTime()) / 86400000);
}

function statusGarantia(dataVenda: string): Exclude<StatusGarantia, 'Todos'> {
  const dias = diasAte(calcularDataGarantia(dataVenda));
  if (dias < 0) return 'Vencida';
  if (dias <= 15) return 'Vencendo';
  return 'Vigente';
}

function extrairCampoObservacao(observacoes: string | null, label: string) {
  if (!observacoes) return '';
  const regex = new RegExp(`${label}:\\s*([^|]+)`, 'i');
  const match = observacoes.match(regex);
  return match?.[1]?.trim() || '';
}

function nomeClienteVenda(venda: VendaGarantiaEstoque) {
  return venda.cliente_nome?.trim() || extrairCampoObservacao(venda.observacoes, 'Cliente garantia') || 'Nao informado';
}

function telefoneClienteVenda(venda: VendaGarantiaEstoque) {
  return venda.cliente_telefone?.trim() || extrairCampoObservacao(venda.observacoes, 'Telefone garantia') || '';
}

function getAnos(vendas: VendaGarantiaEstoque[]) {
  const anoAtual = new Date().getFullYear();
  return Array.from(new Set([
    anoAtual,
    ...vendas.map((venda) => new Date(venda.data_venda).getFullYear()),
  ])).sort((a, b) => b - a);
}

function gerarNomeArquivoGarantia(venda: VendaGarantiaEstoque) {
  const data = new Date(venda.data_venda).toISOString().slice(0, 10);
  return `garantia-venda-${venda.id}-${data}.pdf`;
}

async function reimprimirPdfGarantia(venda: VendaGarantiaEstoque, produto?: ProdutoGarantiaEstoque) {
  const brandImage = await getPdfBrandImage();
  const quantidade = venda.quantidade || 1;
  const desconto = Number(venda.desconto || 0);
  const valorUnitario = Number(venda.valor_unitario ?? produto?.valor_venda ?? 0);
  const subtotal = valorUnitario * quantidade;
  const total = Number(venda.valor_total || Math.max(subtotal - desconto, 0));
  const dataVenda = formatarData(venda.data_venda);
  const dataGarantia = formatarData(calcularDataGarantia(venda.data_venda));
  const dataEmissao = new Date();
  const produtoNome = venda.produto_nome || produto?.nome || 'Produto nao informado';

  const termoGarantia = [
    'A garantia cobre exclusivamente defeito de fabricacao do acessorio/produto vendido, pelo prazo de 90 dias contados da data da venda.',
    'Para solicitar analise, o cliente deve apresentar este certificado, o produto completo, embalagem e acessorios fornecidos quando eles forem necessarios para identificacao, etiqueta, lote ou numero de serie.',
    'A garantia nao cobre mau uso, queda, amassado, trinca, risco profundo, contato com liquido, oxidacao, curto, calor excessivo, instalacao inadequada, adaptacao, corte, dobra, rompimento de cabo, conector forcado, fonte ou carregador incompativel, violacao de lacre/etiqueta ou tentativa de reparo por terceiros.',
    'A garantia nao cobre desgaste natural, danos esteticos apos a entrega, perda de embalagem sem possibilidade de identificar o produto, incompatibilidade causada por modelo informado incorretamente pelo cliente ou uso fora da finalidade do acessorio.',
    'Para acessorios de celular, computador, TV, som ou similares, a garantia nao cobre o aparelho do cliente, perda de dados, aplicativos, configuracoes, cartoes, chips, peliculas, capinhas ou itens nao descritos neste documento.',
    'A troca, reparo ou reembolso depende de avaliacao tecnica da 8K Eletronica. Quando constatado defeito coberto, a loja podera substituir por item igual, equivalente ou realizar o reparo conforme disponibilidade.',
    'Este documento deve ser guardado pelo cliente. Rasuras, informacoes divergentes ou ausencia de comprovacao podem exigir nova conferencia interna antes da garantia ser aceita.',
  ];

  const produtoRows = [
    ['Produto', produtoNome],
    ['SKU', produto?.codigo_sku || 'Nao informado'],
    ['Categoria', produto?.categoria || 'Nao informado'],
    ['Tipo / subfiltro', `${produto?.tipo_aparelho || 'Geral'} / ${produto?.subcategoria || 'Nao informado'}`],
    ['Marca / modelo', `${produto?.marca || 'Sem marca'} / ${produto?.modelo_compativel || 'Sem modelo'}`],
    ['Condicao', produto?.condicao || 'Nao informada'],
    ['Observacoes do produto', produto?.observacoes || 'Sem observacoes'],
  ];

  const vendaRows = [
    ['Data da venda', dataVenda],
    ['Quantidade de acessorios/produtos', String(quantidade)],
    ['Valor unitario', formatarMoeda(valorUnitario)],
    ['Subtotal', formatarMoeda(subtotal)],
    ['Desconto aplicado', desconto > 0 ? formatarMoeda(desconto) : 'Sem desconto'],
    ['Valor vendido', formatarMoeda(total)],
    ['Forma de pagamento', venda.forma_pagamento || 'Nao informado'],
    ['Garantia valida ate', dataGarantia],
    ['Cliente', nomeClienteVenda(venda)],
    ['Telefone', telefoneClienteVenda(venda) || 'Nao informado'],
    ['Observacoes da venda', venda.observacoes || 'Sem observacoes'],
  ];

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [20, 18, 20, 18],
    defaultStyle: { fontSize: 7.4 },
    info: {
      title: gerarNomeArquivoGarantia(venda),
    },
    content: [
      buildPdfHeader({
        brandImage,
        title: 'CERTIFICADO DE GARANTIA',
        subtitle: 'VENDA DE ACESSORIO / PRODUTO',
        compact: true,
        rightLines: [
          { text: `Venda #${venda.id}`, bold: true, fontSize: 8.2 },
          { text: `Reimpresso em ${dataEmissao.toLocaleDateString('pt-BR')} as ${dataEmissao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, fontSize: 7.2 },
        ],
      }),
      { text: 'Dados do produto vendido', style: 'sectionTitle' },
      {
        table: {
          widths: [96, '*'],
          body: produtoRows.map(([label, value]) => [
            { text: label, bold: true, fillColor: '#fff6bf' },
            { text: value },
          ]),
        },
        layout: {
          hLineColor: () => '#d9d9d9',
          vLineColor: () => '#d9d9d9',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
        margin: [0, 0, 0, 4],
      },
      { text: 'Resumo da venda', style: 'sectionTitle' },
      {
        table: {
          widths: [96, '*'],
          body: vendaRows.map(([label, value]) => [
            { text: label, bold: true, fillColor: '#fff6bf' },
            { text: value },
          ]),
        },
        layout: {
          hLineColor: () => '#d9d9d9',
          vLineColor: () => '#d9d9d9',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
        margin: [0, 0, 0, 4],
      },
      { text: 'Termos de garantia para venda de acessorios', style: 'sectionTitle' },
      {
        ol: termoGarantia,
        margin: [0, 0, 0, 5],
        fontSize: 6.8,
        lineHeight: 0.98,
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              {
                text: 'Declaro que recebi o produto acima, conferi quantidade, condicao aparente, compatibilidade informada e estou ciente dos termos de garantia.',
                colSpan: 2,
                alignment: 'center',
                bold: true,
                fontSize: 7,
                margin: [0, 2, 0, 2],
              },
              {},
            ],
            [
              { text: '\n\n\n\n______________________________________________\nAssinatura do cliente', alignment: 'center', fontSize: 7 },
              { text: '\n\n\n\n______________________________________________\n8K Eletronica', alignment: 'center', fontSize: 7 },
            ],
          ],
        },
        layout: {
          hLineColor: () => '#d9d9d9',
          vLineColor: () => '#d9d9d9',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
      },
    ],
    styles: {
      sectionTitle: {
        fontSize: 8,
        bold: true,
        color: '#111111',
        fillColor: '#f4c400',
        margin: [0, 4, 0, 2],
      },
    },
  };

  pdfMake.createPdf(docDefinition).print();
}

export default function GarantiaEstoquePage() {
  const hoje = new Date();
  const [vendas, setVendas] = useState<VendaGarantiaEstoque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusGarantia>('Todos');
  const [mesFiltro, setMesFiltro] = useState<number | 'Todos'>('Todos');
  const [anoFiltro, setAnoFiltro] = useState(hoje.getFullYear());
  const [produtosPorId, setProdutosPorId] = useState<Record<number, ProdutoGarantiaEstoque>>({});
  const [reimprimindoId, setReimprimindoId] = useState<number | null>(null);

  useEffect(() => {
    async function carregarVendas() {
      setIsLoading(true);
      setErro('');

      try {
        const [vendasResult, produtosResult] = await Promise.all([
          supabase
            .from('vendas_estoque')
            .select('*')
            .order('data_venda', { ascending: false }),
          supabase
            .from('estoque')
            .select('id, codigo_sku, nome, categoria, tipo_aparelho, subcategoria, marca, modelo_compativel, valor_venda, condicao, observacoes'),
        ]);

        const { data, error } = vendasResult;

        if (error) throw error;

        if (!produtosResult.error) {
          const mapaProdutos = (produtosResult.data || []).reduce<Record<number, ProdutoGarantiaEstoque>>((acc, produto) => {
            acc[Number(produto.id)] = {
              id: Number(produto.id),
              codigo_sku: produto.codigo_sku || null,
              nome: produto.nome || null,
              categoria: produto.categoria || null,
              tipo_aparelho: produto.tipo_aparelho || null,
              subcategoria: produto.subcategoria || null,
              marca: produto.marca || null,
              modelo_compativel: produto.modelo_compativel || null,
              valor_venda: produto.valor_venda == null ? null : Number(produto.valor_venda || 0),
              condicao: produto.condicao || null,
              observacoes: produto.observacoes || null,
            };
            return acc;
          }, {});

          setProdutosPorId(mapaProdutos);
        }

        setVendas((data || []).map((venda) => ({
          id: Number(venda.id),
          estoque_id: venda.estoque_id == null ? null : Number(venda.estoque_id),
          produto_nome: venda.produto_nome || null,
          quantidade: Number(venda.quantidade || 0),
          valor_unitario: venda.valor_unitario == null ? null : Number(venda.valor_unitario || 0),
          desconto: venda.desconto == null ? null : Number(venda.desconto || 0),
          valor_total: Number(venda.valor_total || 0),
          forma_pagamento: venda.forma_pagamento || null,
          data_venda: venda.data_venda,
          observacoes: venda.observacoes || null,
          cliente_nome: venda.cliente_nome || null,
          cliente_telefone: venda.cliente_telefone || null,
        })));
      } catch (error) {
        console.error('Erro ao carregar garantias do estoque:', error);
        setErro('Nao foi possivel carregar as garantias do estoque.');
      } finally {
        setIsLoading(false);
      }
    }

    carregarVendas();
  }, []);

  const anosDisponiveis = useMemo(() => getAnos(vendas), [vendas]);

  const vendasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);

    return vendas.filter((venda) => {
      const dataVenda = new Date(venda.data_venda);
      const status = statusGarantia(venda.data_venda);
      const texto = normalizarTexto([
        venda.produto_nome,
        nomeClienteVenda(venda),
        telefoneClienteVenda(venda),
        venda.forma_pagamento,
        venda.observacoes,
        venda.id.toString(),
      ].filter(Boolean).join(' '));

      const atendeBusca = termo === '' || texto.includes(termo);
      const atendeStatus = statusFiltro === 'Todos' || status === statusFiltro;
      const atendeMes = mesFiltro === 'Todos' || dataVenda.getMonth() === mesFiltro;
      const atendeAno = dataVenda.getFullYear() === anoFiltro;

      return atendeBusca && atendeStatus && atendeMes && atendeAno;
    });
  }, [anoFiltro, busca, mesFiltro, statusFiltro, vendas]);

  const garantiasVigentes = vendasFiltradas.filter((venda) => statusGarantia(venda.data_venda) === 'Vigente').length;
  const garantiasVencendo = vendasFiltradas.filter((venda) => statusGarantia(venda.data_venda) === 'Vencendo').length;
  const garantiasVencidas = vendasFiltradas.filter((venda) => statusGarantia(venda.data_venda) === 'Vencida').length;
  const valorTotalPeriodo = vendasFiltradas.reduce((total, venda) => total + venda.valor_total, 0);

  const handleReimprimirGarantia = async (venda: VendaGarantiaEstoque) => {
    setReimprimindoId(venda.id);

    try {
      await reimprimirPdfGarantia(
        venda,
        venda.estoque_id ? produtosPorId[venda.estoque_id] : undefined,
      );
    } catch (error) {
      console.error('Erro ao reimprimir garantia do estoque:', error);
      alert('Nao foi possivel reimprimir a garantia desta venda.');
    } finally {
      setReimprimindoId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="rounded-3xl border border-[#d8a900]/40 bg-[#f4c400] p-8 shadow-lg">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#6d6251]">Acompanhamento</p>
            <h2 className="mt-2 text-3xl font-black text-[#0a0a0a]">Garantia do Estoque</h2>
            <p className="mt-1 max-w-3xl text-sm font-bold text-[#6d6251]">
              Consulte vendas de acessorios, cliente, data da venda e prazo final de garantia.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              value={statusFiltro}
              onChange={(event) => setStatusFiltro(event.target.value as StatusGarantia)}
              className="h-11 rounded-xl border border-[#d8a900] bg-white px-3 text-sm font-black text-[#0a0a0a] outline-none"
            >
              {(['Todos', 'Vigente', 'Vencendo', 'Vencida'] as StatusGarantia[]).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={mesFiltro}
              onChange={(event) => setMesFiltro(event.target.value === 'Todos' ? 'Todos' : Number(event.target.value))}
              className="h-11 rounded-xl border border-[#d8a900] bg-white px-3 text-sm font-black text-[#0a0a0a] outline-none"
            >
              <option value="Todos">Todos os meses</option>
              {MESES.map((mes, index) => (
                <option key={mes} value={index}>{mes}</option>
              ))}
            </select>

            <select
              value={anoFiltro}
              onChange={(event) => setAnoFiltro(Number(event.target.value))}
              className="h-11 rounded-xl border border-[#d8a900] bg-white px-3 text-sm font-black text-[#0a0a0a] outline-none"
            >
              {anosDisponiveis.map((ano) => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#e0f1f7] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-gray-400">Vigentes</p>
          <p className="mt-2 text-3xl font-black text-emerald-500">{garantiasVigentes}</p>
        </div>
        <div className="rounded-2xl border border-[#e0f1f7] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-gray-400">Vencendo em 15 dias</p>
          <p className="mt-2 text-3xl font-black text-amber-500">{garantiasVencendo}</p>
        </div>
        <div className="rounded-2xl border border-[#e0f1f7] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-gray-400">Vencidas</p>
          <p className="mt-2 text-3xl font-black text-red-500">{garantiasVencidas}</p>
        </div>
        <div className="rounded-2xl border border-[#e0f1f7] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-gray-400">Vendido no filtro</p>
          <p className="mt-2 text-2xl font-black text-[#0a6787]">{formatarMoeda(valorTotalPeriodo)}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-[#e0f1f7] bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-black text-[#0a6787]">Historico de vendas com garantia</h3>
            <p className="text-sm font-bold text-[#73a8bd]">{vendasFiltradas.length} venda(s) encontradas</p>
          </div>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar cliente, produto, telefone ou pagamento..."
            className="h-11 w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 text-sm font-bold text-[#0a6787] outline-none focus:border-[#f4c400] md:max-w-md"
          />
        </div>

        {erro && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            {erro}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#e0f1f7] bg-[#f8fcff] text-[11px] uppercase tracking-wide text-[#73a8bd]">
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Cliente</th>
                <th className="px-5 py-4">Produto vendido</th>
                <th className="px-5 py-4">Venda</th>
                <th className="px-5 py-4">Garantia ate</th>
                <th className="px-5 py-4 text-right">Valor</th>
                <th className="px-5 py-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0f1f7]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center font-black text-[#38bdf8]">Carregando garantias...</td>
                </tr>
              ) : vendasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center font-bold text-gray-400">Nenhuma venda encontrada para os filtros atuais.</td>
                </tr>
              ) : (
                vendasFiltradas.map((venda) => {
                  const status = statusGarantia(venda.data_venda);
                  const dataGarantia = calcularDataGarantia(venda.data_venda);
                  const diasRestantes = diasAte(dataGarantia);
                  const statusClass = status === 'Vigente'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : status === 'Vencendo'
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-red-50 text-red-600 border-red-200';
                  const telefone = telefoneClienteVenda(venda);

                  return (
                    <tr key={venda.id} className="transition-colors hover:bg-[#f8fcff]">
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusClass}`}>
                          {status}
                        </span>
                        <div className="mt-1 text-[11px] font-bold text-gray-400">
                          {diasRestantes >= 0 ? `${diasRestantes} dia(s) restantes` : `${Math.abs(diasRestantes)} dia(s) vencida`}
                        </div>
                      </td>
                      <td className="min-w-[190px] px-5 py-4">
                        <div className="font-black text-[#0a6787]">{nomeClienteVenda(venda)}</div>
                        {telefone && <div className="mt-1 text-xs font-bold text-gray-500">{telefone}</div>}
                      </td>
                      <td className="min-w-[260px] px-5 py-4">
                        <div className="font-black text-[#0a0a0a]">{venda.produto_nome || 'Produto nao informado'}</div>
                        <div className="mt-1 text-xs font-bold text-gray-500">Qtd: {venda.quantidade}</div>
                        {venda.observacoes && <div className="mt-1 max-w-md text-[11px] text-gray-400">{venda.observacoes}</div>}
                      </td>
                      <td className="min-w-[150px] px-5 py-4">
                        <div className="font-black text-[#0a6787]">{formatarData(venda.data_venda)}</div>
                        <div className="mt-1 text-xs font-bold text-gray-500">{venda.forma_pagamento || 'Pagamento nao informado'}</div>
                      </td>
                      <td className="min-w-[150px] px-5 py-4">
                        <div className="font-black text-[#0a0a0a]">{formatarData(dataGarantia)}</div>
                        <div className="mt-1 text-xs font-bold text-gray-500">90 dias apos venda</div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="font-black text-emerald-500">{formatarMoeda(venda.valor_total)}</div>
                        <div className="mt-1 text-xs font-bold text-gray-500">
                          Desc: {formatarMoeda(Number(venda.desconto || 0))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleReimprimirGarantia(venda)}
                          disabled={reimprimindoId === venda.id}
                          className="inline-flex items-center justify-center rounded-xl bg-[#f4c400] px-4 py-2 text-xs font-black text-[#0a0a0a] shadow-sm transition-all hover:bg-[#ffd84d] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {reimprimindoId === venda.id ? 'Gerando...' : 'Reimprimir'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
