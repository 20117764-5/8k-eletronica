"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { buildPdfHeader, getPdfBrandImage } from '@/lib/pdfBranding';
import * as pdfMakeModule from 'pdfmake/build/pdfmake';
import * as pdfFontsModule from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

type TipoAparelho =
  | 'TV'
  | 'Som'
  | 'Forno-microondas'
  | 'Computadores'
  | 'Notebooks'
  | 'Celulares'
  | 'Inversores solares'
  | 'Geral / Oficina';

type FormaPagamento = 'Pix' | 'Dinheiro' | 'Cartao de credito' | 'Cartao de debito' | 'Transferencia' | 'Outro';

interface Produto {
  id: number;
  codigo_sku: string | null;
  nome: string;
  categoria: string;
  tipo_aparelho?: TipoAparelho | string | null;
  subcategoria?: string | null;
  marca: string | null;
  modelo_compativel: string | null;
  quantidade: number;
  estoque_minimo: number;
  valor_custo: number;
  valor_venda: number;
  condicao: string;
  localizacao: string | null;
  observacoes?: string | null;
}

interface VendaForm {
  quantidade: number;
  desconto: number;
  forma_pagamento: FormaPagamento;
  data_venda: string;
  observacoes: string;
  cliente_nome: string;
  cliente_telefone: string;
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

interface VendaEstoqueResumo {
  id: number;
  quantidade: number;
  valor_total: number;
  lucro: number | null;
  data_venda: string;
}

const CATALOGO_ESTOQUE: Record<TipoAparelho, string[]> = {
  TV: [
    'Placa principal',
    'Placa da fonte',
    'Placa T-Con',
    'Display / tela',
    'Barramento LED / backlight',
    'Flat cable',
    'Alto-falante',
    'Controle remoto',
    'Módulo Wi-Fi / Bluetooth',
    'Fonte externa',
  ],
  Som: [
    'Placa amplificadora',
    'Fonte',
    'Alto-falante',
    'Tweeter',
    'Potenciômetro',
    'Display',
    'Conector P2 / RCA / USB',
    'Transformador',
    'Controle remoto',
  ],
  'Forno-microondas': [
    'Magnetron',
    'Transformador',
    'Placa eletrônica',
    'Capacitor de alta tensão',
    'Diodo de alta tensão',
    'Membrana / teclado',
    'Fusível',
    'Prato / suporte',
    'Lâmpada',
    'Motor do prato',
  ],
  Computadores: [
    'Placa-mãe',
    'Fonte ATX',
    'Memória RAM',
    'SSD / HD',
    'Processador',
    'Cooler',
    'Placa de vídeo',
    'Gabinete',
    'Cabo / adaptador',
    'Periférico',
  ],
  Notebooks: [
    'Display / tela',
    'Teclado',
    'Bateria',
    'Carregador',
    'Placa-mãe',
    'Memória RAM',
    'SSD / HD',
    'Dobradiça',
    'Carcaça',
    'Flat cable',
    'Cooler',
    'Conector DC jack',
  ],
  Celulares: [
    'Display / tela',
    'Bateria',
    'Botão volume / power',
    'Conector de carga',
    'Câmera',
    'Alto-falante auricular',
    'Campainha / buzzer',
    'Microfone',
    'Placa de carga',
    'Tampa traseira',
    'Flex',
    'Biometria',
    'Gaveta SIM',
  ],
  'Inversores solares': [
    'Placa de potência',
    'Placa de controle',
    'Display',
    'Ventoinha',
    'Capacitor',
    'Relé / contator',
    'Fusível',
    'Varistor',
    'Conector MC4',
    'Dissipador',
  ],
  'Geral / Oficina': [
    'Componentes eletrônicos',
    'Capacitores',
    'Resistores',
    'CIs',
    'Solda / estanho',
    'Fluxo / pasta',
    'Cabos',
    'Ferramentas',
    'Aparelho sucata',
    'Acessórios',
  ],
};

const TIPOS_APARELHO = Object.keys(CATALOGO_ESTOQUE) as TipoAparelho[];

const CONDICOES = [
  'Novo',
  'Retirado / usado',
  'Recondicionado',
  'Sucata para retirada',
  'Teste pendente',
];

const FORMAS_PAGAMENTO: FormaPagamento[] = [
  'Pix',
  'Dinheiro',
  'Cartao de credito',
  'Cartao de debito',
  'Transferencia',
  'Outro',
];

const MESES_FILTRO = [
  { valor: 0, label: 'Janeiro' },
  { valor: 1, label: 'Fevereiro' },
  { valor: 2, label: 'Março' },
  { valor: 3, label: 'Abril' },
  { valor: 4, label: 'Maio' },
  { valor: 5, label: 'Junho' },
  { valor: 6, label: 'Julho' },
  { valor: 7, label: 'Agosto' },
  { valor: 8, label: 'Setembro' },
  { valor: 9, label: 'Outubro' },
  { valor: 10, label: 'Novembro' },
  { valor: 11, label: 'Dezembro' },
];

const criarVendaInicial = (): VendaForm => ({
  quantidade: 1,
  desconto: 0,
  forma_pagamento: 'Pix',
  data_venda: dataAtualFormulario(),
  observacoes: '',
  cliente_nome: '',
  cliente_telefone: '',
});

const criarFormInicial = (tipo: TipoAparelho = 'Celulares', nome = '') => ({
  codigo_sku: '',
  nome,
  categoria: `${tipo} - ${CATALOGO_ESTOQUE[tipo][0]}`,
  tipo_aparelho: tipo,
  subcategoria: CATALOGO_ESTOQUE[tipo][0],
  marca: '',
  modelo_compativel: '',
  quantidade: 0,
  estoque_minimo: 2,
  valor_custo: 0,
  valor_venda: 0,
  condicao: 'Novo',
  localizacao: '',
  observacoes: '',
});

function normalizarTexto(valor?: string | null) {
  return (valor || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function dataAtualFormulario() {
  const data = new Date();
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
  return data.toISOString().slice(0, 10);
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataFormularioParaIso(data: string) {
  return new Date(`${data}T12:00:00`).toISOString();
}

function dataFormularioParaData(data: string) {
  return new Date(`${data}T12:00:00`);
}

function formatarDataPtBr(data: string) {
  return dataFormularioParaData(data).toLocaleDateString('pt-BR');
}

function gerarDataGarantia(data: string) {
  const dataGarantia = dataFormularioParaData(data);
  dataGarantia.setDate(dataGarantia.getDate() + 90);
  return dataGarantia.toLocaleDateString('pt-BR');
}

function erroColunaVendaGarantia(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  const details = 'details' in error && typeof error.details === 'string' ? error.details : '';
  const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : '';
  const texto = normalizarTexto(`${message} ${details} ${hint}`);

  return texto.includes('cliente_nome') || texto.includes('cliente_telefone') || texto.includes('schema cache');
}

function montarObservacoesVendaFallback(venda: VendaForm) {
  const observacoes = venda.observacoes.trim();
  const cliente = venda.cliente_nome.trim();
  const telefone = venda.cliente_telefone.trim();
  const dadosGarantia = [
    cliente ? `Cliente garantia: ${cliente}` : '',
    telefone ? `Telefone garantia: ${telefone}` : '',
  ].filter(Boolean).join(' | ');

  return [observacoes, dadosGarantia].filter(Boolean).join(' | ') || null;
}

function inferirTipo(categoria?: string | null): TipoAparelho {
  const texto = normalizarTexto(categoria);
  if (texto.includes('celular') || texto.includes('iphone') || texto.includes('smartphone')) return 'Celulares';
  if (texto.includes('notebook')) return 'Notebooks';
  if (texto.includes('computador') || texto.includes('pc')) return 'Computadores';
  if (texto.includes('micro') || texto.includes('magnetron')) return 'Forno-microondas';
  if (texto.includes('solar') || texto.includes('inversor')) return 'Inversores solares';
  if (texto.includes('som') || texto.includes('amplificador')) return 'Som';
  if (texto.includes('placa') || texto.includes('t-con') || texto.includes('display') || texto.includes('backlight')) return 'TV';
  return 'Geral / Oficina';
}

function normalizarProduto(produto: Produto): Produto {
  const tipo = (produto.tipo_aparelho as TipoAparelho | undefined) || inferirTipo(produto.categoria);
  return {
    ...produto,
    tipo_aparelho: tipo,
    subcategoria: produto.subcategoria || produto.categoria || CATALOGO_ESTOQUE[tipo][0],
    quantidade: Number(produto.quantidade || 0),
    estoque_minimo: Number(produto.estoque_minimo || 0),
    valor_custo: Number(produto.valor_custo || 0),
    valor_venda: Number(produto.valor_venda || 0),
  };
}

type GarantiaVendaPdfData = {
  produto: Produto;
  venda: VendaForm;
  quantidadeVendida: number;
  subtotal: number;
  desconto: number;
  total: number;
};

async function gerarPdfGarantiaVenda({
  produto,
  venda,
  quantidadeVendida,
  subtotal,
  desconto,
  total,
}: GarantiaVendaPdfData) {
  const brandImage = await getPdfBrandImage();
  const dataVenda = formatarDataPtBr(venda.data_venda);
  const dataGarantia = gerarDataGarantia(venda.data_venda);
  const dataEmissao = new Date();
  const dataEmissaoStr = dataEmissao.toLocaleDateString('pt-BR');
  const horaEmissaoStr = dataEmissao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const nomeArquivo = `garantia-venda-${produto.id}-${venda.data_venda}.pdf`;

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
    ['Produto', produto.nome],
    ['SKU', produto.codigo_sku || 'Nao informado'],
    ['Categoria', produto.categoria || 'Nao informado'],
    ['Tipo / subfiltro', `${produto.tipo_aparelho || 'Geral'} / ${produto.subcategoria || 'Nao informado'}`],
    ['Marca / modelo', `${produto.marca || 'Sem marca'} / ${produto.modelo_compativel || 'Sem modelo'}`],
    ['Condicao', produto.condicao || 'Nao informada'],
    ['Observacoes do produto', produto.observacoes || 'Sem observacoes'],
  ];

  const vendaRows = [
    ['Data da venda', dataVenda],
    ['Quantidade de acessorios/produtos', String(quantidadeVendida)],
    ['Valor unitario', formatarMoeda(produto.valor_venda)],
    ['Subtotal', formatarMoeda(subtotal)],
    ['Desconto aplicado', desconto > 0 ? formatarMoeda(desconto) : 'Sem desconto'],
    ['Valor vendido', formatarMoeda(total)],
    ['Forma de pagamento', venda.forma_pagamento],
    ['Garantia valida ate', dataGarantia],
    ['Cliente', venda.cliente_nome.trim() || 'Nao informado'],
    ['Telefone', venda.cliente_telefone.trim() || 'Nao informado'],
    ['Observacoes da venda', venda.observacoes.trim() || 'Sem observacoes'],
  ];

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [20, 18, 20, 18],
    defaultStyle: { fontSize: 7.4 },
    content: [
      buildPdfHeader({
        brandImage,
        title: 'CERTIFICADO DE GARANTIA',
        subtitle: 'VENDA DE ACESSORIO / PRODUTO',
        compact: true,
        rightLines: [
          { text: `Produto #${produto.id}`, bold: true, fontSize: 8.2 },
          { text: `Emitido em ${dataEmissaoStr} as ${horaEmissaoStr}`, fontSize: 7.2 },
        ],
      }),
      {
        text: 'Dados do produto vendido',
        style: 'sectionTitle',
      },
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
      {
        text: 'Resumo da venda',
        style: 'sectionTitle',
      },
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
      {
        text: 'Termos de garantia para venda de acessorios',
        style: 'sectionTitle',
      },
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

  pdfMake.createPdf(docDefinition).download(nomeArquivo);
}

export default function EstoquePage() {
  const dataAtual = new Date();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendasEstoque, setVendasEstoque] = useState<VendaEstoqueResumo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoAparelho | 'Todos'>('Todos');
  const [filtroSubcategoria, setFiltroSubcategoria] = useState('Todas');
  const [filtroAlerta, setFiltroAlerta] = useState(false);
  const [mesVendasFiltro, setMesVendasFiltro] = useState(dataAtual.getMonth());
  const [anoVendasFiltro, setAnoVendasFiltro] = useState(dataAtual.getFullYear());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [formData, setFormData] = useState(criarFormInicial());
  const [isVendaModalOpen, setIsVendaModalOpen] = useState(false);
  const [isVendaSubmitting, setIsVendaSubmitting] = useState(false);
  const [produtoVenda, setProdutoVenda] = useState<Produto | null>(null);
  const [vendaData, setVendaData] = useState<VendaForm>(criarVendaInicial());
  const [isExcluindoId, setIsExcluindoId] = useState<number | null>(null);

  useEffect(() => {
    fetchEstoque();
    fetchVendasEstoque();
  }, []);

  useEffect(() => {
    setFiltroSubcategoria('Todas');
  }, [filtroTipo]);

  async function fetchEstoque() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('estoque').select('*').order('nome', { ascending: true });
      if (error) throw error;
      setProdutos((data || []).map((item) => normalizarProduto(item as Produto)));
    } catch (error) {
      console.error("Erro ao buscar estoque:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchVendasEstoque() {
    try {
      const { data, error } = await supabase
        .from('vendas_estoque')
        .select('id, quantidade, valor_total, lucro, data_venda')
        .order('data_venda', { ascending: false });

      if (error) throw error;
      setVendasEstoque((data || []).map((venda) => ({
        id: Number(venda.id),
        quantidade: Number(venda.quantidade || 0),
        valor_total: Number(venda.valor_total || 0),
        lucro: venda.lucro === null ? null : Number(venda.lucro || 0),
        data_venda: venda.data_venda,
      })));
    } catch (error) {
      console.warn('Nao foi possivel carregar os indicadores de vendas do estoque:', error);
      setVendasEstoque([]);
    }
  }

  const subcategoriasDisponiveis = useMemo(() => {
    if (filtroTipo !== 'Todos') return CATALOGO_ESTOQUE[filtroTipo];
    return Array.from(new Set(TIPOS_APARELHO.flatMap((tipo) => CATALOGO_ESTOQUE[tipo]))).sort();
  }, [filtroTipo]);

  const totalItens = produtos.reduce((acc, curr) => acc + curr.quantidade, 0);
  const valorCustoTotal = produtos.reduce((acc, curr) => acc + (curr.quantidade * curr.valor_custo), 0);
  const valorVendaTotal = produtos.reduce((acc, curr) => acc + (curr.quantidade * curr.valor_venda), 0);
  const produtosBaixoEstoque = produtos.filter((p) => p.quantidade <= p.estoque_minimo);
  const produtosEmFalta = produtos.filter((p) => p.quantidade === 0);

  const valorVendidoTotal = vendasEstoque.reduce((acc, venda) => acc + venda.valor_total, 0);
  const lucroVendidoTotal = vendasEstoque.reduce((acc, venda) => acc + Number(venda.lucro || 0), 0);
  const unidadesVendidasTotal = vendasEstoque.reduce((acc, venda) => acc + venda.quantidade, 0);
  const anosVendasDisponiveis = Array.from(new Set([
    dataAtual.getFullYear(),
    ...vendasEstoque.map((venda) => new Date(venda.data_venda).getFullYear()),
  ])).sort((a, b) => b - a);
  const vendasPeriodo = vendasEstoque.filter((venda) => {
    const dataVenda = new Date(venda.data_venda);
    return dataVenda.getMonth() === mesVendasFiltro && dataVenda.getFullYear() === anoVendasFiltro;
  });
  const valorVendidoPeriodo = vendasPeriodo.reduce((acc, venda) => acc + venda.valor_total, 0);
  const lucroVendidoPeriodo = vendasPeriodo.reduce((acc, venda) => acc + Number(venda.lucro || 0), 0);
  const unidadesVendidasPeriodo = vendasPeriodo.reduce((acc, venda) => acc + venda.quantidade, 0);
  const ticketMedioPeriodo = vendasPeriodo.length > 0 ? valorVendidoPeriodo / vendasPeriodo.length : 0;
  const margemPeriodo = valorVendidoPeriodo > 0 ? (lucroVendidoPeriodo / valorVendidoPeriodo) * 100 : 0;
  const periodoSelecionadoLabel = `${MESES_FILTRO[mesVendasFiltro].label}/${anoVendasFiltro}`;

  const produtosFiltrados = produtos.filter((p) => {
    const termo = normalizarTexto(busca);
    const textoProduto = normalizarTexto([
      p.nome,
      p.modelo_compativel,
      p.codigo_sku,
      p.marca,
      p.categoria,
      p.tipo_aparelho,
      p.subcategoria,
      p.localizacao,
      p.observacoes,
    ].filter(Boolean).join(' '));

    const atendeBusca = termo === '' || textoProduto.includes(termo);
    const atendeTipo = filtroTipo === 'Todos' || p.tipo_aparelho === filtroTipo;
    const atendeSubcategoria = filtroSubcategoria === 'Todas' || p.subcategoria === filtroSubcategoria;
    const atendeAlerta = !filtroAlerta || p.quantidade <= p.estoque_minimo;

    return atendeBusca && atendeTipo && atendeSubcategoria && atendeAlerta;
  });

  const abrirModalNovo = (nomeInicial = '') => {
    const tipoInicial = filtroTipo === 'Todos' ? 'Celulares' : filtroTipo;
    setProdutoEditando(null);
    setFormData(criarFormInicial(tipoInicial, nomeInicial));
    setIsModalOpen(true);
  };

  const abrirModalEditar = (produto: Produto) => {
    const tipo = (produto.tipo_aparelho as TipoAparelho) || inferirTipo(produto.categoria);
    setProdutoEditando(produto);
    setFormData({
      codigo_sku: produto.codigo_sku || '',
      nome: produto.nome,
      categoria: produto.categoria,
      tipo_aparelho: tipo,
      subcategoria: produto.subcategoria || CATALOGO_ESTOQUE[tipo][0],
      marca: produto.marca || '',
      modelo_compativel: produto.modelo_compativel || '',
      quantidade: produto.quantidade,
      estoque_minimo: produto.estoque_minimo,
      valor_custo: produto.valor_custo,
      valor_venda: produto.valor_venda,
      condicao: produto.condicao,
      localizacao: produto.localizacao || '',
      observacoes: produto.observacoes || '',
    });
    setIsModalOpen(true);
  };

  const fecharModalVenda = () => {
    if (isVendaSubmitting) return;
    setIsVendaModalOpen(false);
    setProdutoVenda(null);
    setVendaData(criarVendaInicial());
  };

  const abrirModalVenda = (produto: Produto) => {
    if (produto.quantidade <= 0) {
      alert('Produto em falta. Nao ha quantidade disponivel para vender.');
      return;
    }

    setProdutoVenda(produto);
    setVendaData({
      ...criarVendaInicial(),
      quantidade: Math.min(1, produto.quantidade),
    });
    setIsVendaModalOpen(true);
  };

  const atualizarTipoFormulario = (tipo: TipoAparelho) => {
    const subcategoria = CATALOGO_ESTOQUE[tipo][0];
    setFormData({
      ...formData,
      tipo_aparelho: tipo,
      subcategoria,
      categoria: `${tipo} - ${subcategoria}`,
    });
  };

  const atualizarSubcategoriaFormulario = (subcategoria: string) => {
    setFormData({
      ...formData,
      subcategoria,
      categoria: `${formData.tipo_aparelho} - ${subcategoria}`,
    });
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      codigo_sku: formData.codigo_sku.trim() || null,
      nome: formData.nome.trim(),
      categoria: `${formData.tipo_aparelho} - ${formData.subcategoria}`,
      tipo_aparelho: formData.tipo_aparelho,
      subcategoria: formData.subcategoria,
      marca: formData.marca.trim() || null,
      modelo_compativel: formData.modelo_compativel.trim() || null,
      quantidade: Number(formData.quantidade) || 0,
      estoque_minimo: Number(formData.estoque_minimo) || 0,
      valor_custo: Number(formData.valor_custo) || 0,
      valor_venda: Number(formData.valor_venda) || 0,
      condicao: formData.condicao,
      localizacao: formData.localizacao.trim() || null,
      observacoes: formData.observacoes.trim() || null,
    };

    try {
      if (produtoEditando) {
        const { error } = await supabase.from('estoque').update(payload).eq('id', produtoEditando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('estoque').insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchEstoque();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar o produto. Se ainda não atualizou o Supabase, aplique o SQL informado pelo Codex.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const ajustarEstoqueRapido = async (id: number, novaQtd: number) => {
    if (novaQtd < 0) return;
    try {
      const { error } = await supabase.from('estoque').update({ quantidade: novaQtd }).eq('id', id);
      if (error) throw error;
      setProdutos(produtos.map((p) => p.id === id ? { ...p, quantidade: novaQtd } : p));
    } catch (err) {
      console.error(err);
      alert("Não foi possível ajustar a quantidade.");
    }
  };

  const excluirProduto = async (produto: Produto) => {
    const confirmou = window.confirm(
      `Excluir "${produto.nome}" do estoque?\n\nEssa acao remove o produto da lista, mas nao apaga vendas ou despesas ja registradas no financeiro.`
    );

    if (!confirmou) return;

    setIsExcluindoId(produto.id);

    try {
      const { error } = await supabase
        .from('estoque')
        .delete()
        .eq('id', produto.id);

      if (error) throw error;

      setProdutos((lista) => lista.filter((item) => item.id !== produto.id));
      if (produtoVenda?.id === produto.id) fecharModalVenda();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      alert('Nao foi possivel excluir o produto. Confira a policy de DELETE da tabela estoque no Supabase.');
    } finally {
      setIsExcluindoId(null);
    }
  };

  const subtotalVenda = produtoVenda ? vendaData.quantidade * produtoVenda.valor_venda : 0;
  const descontoVenda = Math.min(Math.max(Number(vendaData.desconto) || 0, 0), subtotalVenda);
  const totalVenda = Math.max(subtotalVenda - descontoVenda, 0);
  const custoVenda = produtoVenda ? vendaData.quantidade * produtoVenda.valor_custo : 0;
  const lucroVenda = totalVenda - custoVenda;

  const handleRegistrarVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoVenda) return;

    const quantidadeVendida = Number(vendaData.quantidade) || 0;
    const descontoInformado = Number(vendaData.desconto) || 0;

    if (!Number.isInteger(quantidadeVendida) || quantidadeVendida <= 0) {
      alert('Informe uma quantidade valida para venda.');
      return;
    }

    if (quantidadeVendida > produtoVenda.quantidade) {
      alert(`Quantidade indisponivel. Em estoque: ${produtoVenda.quantidade}.`);
      return;
    }

    if (descontoInformado > subtotalVenda) {
      alert('O desconto nao pode ser maior que o subtotal da venda.');
      return;
    }

    const novaQuantidade = produtoVenda.quantidade - quantidadeVendida;
    setIsVendaSubmitting(true);

    try {
      const { error: updateError } = await supabase
        .from('estoque')
        .update({ quantidade: novaQuantidade })
        .eq('id', produtoVenda.id);

      if (updateError) throw updateError;

      const vendaPayloadBase = {
        estoque_id: produtoVenda.id,
        produto_nome: produtoVenda.nome,
        quantidade: quantidadeVendida,
        valor_unitario: produtoVenda.valor_venda,
        desconto: descontoVenda,
        valor_total: totalVenda,
        custo_total: custoVenda,
        lucro: lucroVenda,
        forma_pagamento: vendaData.forma_pagamento,
        data_venda: dataFormularioParaIso(vendaData.data_venda),
        observacoes: vendaData.observacoes.trim() || null,
      };

      const vendaPayloadComGarantia = {
        ...vendaPayloadBase,
        cliente_nome: vendaData.cliente_nome.trim() || null,
        cliente_telefone: vendaData.cliente_telefone.trim() || null,
      };

      const { error: vendaErrorInicial } = await supabase.from('vendas_estoque').insert([vendaPayloadComGarantia]);
      let vendaError = vendaErrorInicial;

      if (vendaErrorInicial && erroColunaVendaGarantia(vendaErrorInicial)) {
        const { error: fallbackError } = await supabase.from('vendas_estoque').insert([{
          ...vendaPayloadBase,
          observacoes: montarObservacoesVendaFallback(vendaData),
        }]);
        vendaError = fallbackError;
      }

      if (vendaError) {
        await supabase
          .from('estoque')
          .update({ quantidade: produtoVenda.quantidade })
          .eq('id', produtoVenda.id);
        throw vendaError;
      }

      setProdutos((lista) => lista.map((produto) =>
        produto.id === produtoVenda.id ? { ...produto, quantidade: novaQuantidade } : produto
      ));
      await fetchVendasEstoque();
      let pdfGerado = true;
      try {
        await gerarPdfGarantiaVenda({
          produto: produtoVenda,
          venda: vendaData,
          quantidadeVendida,
          subtotal: subtotalVenda,
          desconto: descontoVenda,
          total: totalVenda,
        });
      } catch (pdfError) {
        pdfGerado = false;
        console.error('Erro ao gerar PDF de garantia da venda:', pdfError);
      }
      fecharModalVenda();
      alert(pdfGerado
        ? 'Venda registrada com sucesso. O PDF de garantia foi gerado.'
        : 'Venda registrada, mas nao foi possivel gerar o PDF de garantia.'
      );
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      alert('Nao foi possivel registrar a venda. Confira se a tabela vendas_estoque existe e se as policies foram aplicadas no Supabase.');
    } finally {
      setIsVendaSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 relative">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-1 md:col-span-4 bg-[#0a6787] p-8 rounded-3xl shadow-lg flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-black text-white">Estoque Multitécnico</h2>
            <p className="text-[#a3d8e8] font-medium mt-1">Peças por aparelho, subcategoria, quantidade, custo, venda e localização.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-[#a3d8e8]">Mês</label>
              <select
                value={mesVendasFiltro}
                onChange={(e) => setMesVendasFiltro(Number(e.target.value))}
                className="h-11 min-w-36 rounded-xl border border-white/20 bg-white px-3 text-sm font-black text-[#0a6787] outline-none"
              >
                {MESES_FILTRO.map((mes) => (
                  <option key={mes.valor} value={mes.valor}>{mes.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-[#a3d8e8]">Ano</label>
              <select
                value={anoVendasFiltro}
                onChange={(e) => setAnoVendasFiltro(Number(e.target.value))}
                className="h-11 min-w-28 rounded-xl border border-white/20 bg-white px-3 text-sm font-black text-[#0a6787] outline-none"
              >
                {anosVendasDisponiveis.map((ano) => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
            <button onClick={() => abrirModalNovo()} className="h-11 px-6 bg-[#38bdf8] text-[#0a6787] font-black rounded-xl hover:bg-white transition-all shadow-lg">
              Novo item
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e0f1f7]">
          <p className="text-xs font-bold text-gray-400 uppercase">Itens físicos</p>
          <p className="text-3xl font-black text-[#0a6787]">{totalItens} <span className="text-sm font-medium text-gray-500">unids</span></p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e0f1f7]">
          <p className="text-xs font-bold text-gray-400 uppercase">Capital investido</p>
          <p className="text-3xl font-black text-amber-500">{formatarMoeda(valorCustoTotal)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e0f1f7]">
          <p className="text-xs font-bold text-gray-400 uppercase">Potencial de venda</p>
          <p className="text-3xl font-black text-emerald-500">{formatarMoeda(valorVendaTotal)}</p>
        </div>
        <button
          type="button"
          onClick={() => setFiltroAlerta(!filtroAlerta)}
          className={`p-5 rounded-2xl shadow-sm border text-left transition-all ${filtroAlerta ? 'bg-red-500 border-red-600' : 'bg-red-50 border-red-100 hover:bg-red-100'}`}
        >
          <p className={`text-xs font-bold uppercase ${filtroAlerta ? 'text-red-100' : 'text-red-500'}`}>Reposição</p>
          <p className={`text-3xl font-black ${filtroAlerta ? 'text-white' : 'text-red-600'}`}>
            {produtosBaixoEstoque.length} <span className="text-sm font-medium">baixos</span>
          </p>
          <p className={`text-xs mt-1 ${filtroAlerta ? 'text-red-100' : 'text-red-500'}`}>{produtosEmFalta.length} em falta</p>
        </button>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100">
          <p className="text-xs font-bold text-gray-400 uppercase">Vendido em {periodoSelecionadoLabel}</p>
          <p className="text-3xl font-black text-emerald-600">{formatarMoeda(valorVendidoPeriodo)}</p>
          <p className="text-xs font-bold text-gray-400 mt-1">Geral: {formatarMoeda(valorVendidoTotal)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100">
          <p className="text-xs font-bold text-gray-400 uppercase">Lucro em {periodoSelecionadoLabel}</p>
          <p className={`text-3xl font-black ${lucroVendidoPeriodo >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
            {formatarMoeda(lucroVendidoPeriodo)}
          </p>
          <p className="text-xs font-bold text-gray-400 mt-1">Margem: {margemPeriodo.toFixed(1)}% | Geral: {formatarMoeda(lucroVendidoTotal)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-indigo-100">
          <p className="text-xs font-bold text-gray-400 uppercase">Ticket médio</p>
          <p className="text-3xl font-black text-indigo-600">{formatarMoeda(ticketMedioPeriodo)}</p>
          <p className="text-xs font-bold text-gray-400 mt-1">{vendasPeriodo.length} venda(s) no período</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e0f1f7]">
          <p className="text-xs font-bold text-gray-400 uppercase">Unidades vendidas</p>
          <p className="text-3xl font-black text-[#0a6787]">{unidadesVendidasPeriodo} <span className="text-sm font-medium text-gray-500">unids</span></p>
          <p className="text-xs font-bold text-gray-400 mt-1">Geral: {unidadesVendidasTotal} unids</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7] grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
        <div className="lg:col-span-5">
          <label className="block text-xs font-black text-[#0a6787] uppercase mb-2">Busca rápida</label>
          <input
            type="text"
            placeholder="Ex: display iphone 13, placa fonte LG, bateria Samsung..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium outline-none focus:border-[#38bdf8]"
          />
        </div>

        <div className="lg:col-span-3">
          <label className="block text-xs font-black text-[#0a6787] uppercase mb-2">Tipo de aparelho</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as TipoAparelho | 'Todos')}
            className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium outline-none focus:border-[#38bdf8]"
          >
            <option value="Todos">Todos</option>
            {TIPOS_APARELHO.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
          </select>
        </div>

        <div className="lg:col-span-3">
          <label className="block text-xs font-black text-[#0a6787] uppercase mb-2">Subfiltro / peça</label>
          <select
            value={filtroSubcategoria}
            onChange={(e) => setFiltroSubcategoria(e.target.value)}
            className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium outline-none focus:border-[#38bdf8]"
          >
            <option value="Todas">Todas</option>
            {subcategoriasDisponiveis.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setBusca('');
            setFiltroTipo('Todos');
            setFiltroSubcategoria('Todas');
            setFiltroAlerta(false);
          }}
          className="lg:col-span-1 px-4 py-3 bg-white border border-[#e0f1f7] text-[#0a6787] font-bold rounded-xl hover:bg-[#f0f9ff]"
        >
          Limpar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {TIPOS_APARELHO.map((tipo) => (
          <button
            key={tipo}
            type="button"
            onClick={() => setFiltroTipo(tipo)}
            className={`px-3 py-2 text-xs font-black rounded-xl border transition-all ${filtroTipo === tipo ? 'bg-[#0a6787] text-white border-[#0a6787]' : 'bg-white text-[#0a6787] border-[#e0f1f7] hover:border-[#38bdf8]'}`}
          >
            {tipo}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-[#e0f1f7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f0f9ff]/50 text-[10px] font-bold text-[#73a8bd] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Aplicação</th>
                <th className="px-6 py-4 text-center">Qtd</th>
                <th className="px-6 py-4">Financeiro</th>
                <th className="px-6 py-4">Local</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f9ff]">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-[#38bdf8] font-bold animate-pulse">Carregando estoque...</td></tr>
              ) : produtosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-2xl font-black text-red-600">Em falta</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Nenhum item encontrado para a busca ou filtros atuais.
                    </p>
                    {busca.trim() && (
                      <button onClick={() => abrirModalNovo(busca.trim())} className="mt-4 px-5 py-2.5 bg-[#0a6787] text-white font-bold rounded-xl hover:bg-[#08526c]">
                        Cadastrar item pesquisado
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                produtosFiltrados.map((p) => {
                  const baixoEstoque = p.quantidade <= p.estoque_minimo;
                  const semEstoque = p.quantidade === 0;

                  return (
                    <tr key={p.id} className="hover:bg-[#f8fcff] transition-colors group">
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black uppercase border ${semEstoque ? 'bg-red-50 text-red-600 border-red-200' : baixoEstoque ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                          {semEstoque ? 'Em falta' : baixoEstoque ? 'Baixo' : 'OK'}
                        </span>
                      </td>
                      <td className="px-6 py-4 min-w-[260px]">
                        <div className="font-black text-[#0a6787]">{p.nome}</div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          {p.codigo_sku && <span className="font-mono">SKU: {p.codigo_sku} • </span>}
                          {p.marca || 'Sem marca'} {p.modelo_compativel ? `• P/ ${p.modelo_compativel}` : ''}
                        </div>
                        {p.observacoes && <div className="text-[11px] text-gray-400 mt-1">{p.observacoes}</div>}
                      </td>
                      <td className="px-6 py-4 min-w-[220px]">
                        <div className="font-bold text-gray-800">{p.tipo_aparelho}</div>
                        <div className="text-xs text-[#6d6251] mt-1">{p.subcategoria}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => ajustarEstoqueRapido(p.id, p.quantidade - 1)} className="w-7 h-7 rounded bg-red-50 text-red-500 font-bold hover:bg-red-500 hover:text-white">-</button>
                          <span className={`text-lg font-black w-10 text-center ${semEstoque ? 'text-red-500' : baixoEstoque ? 'text-amber-500' : 'text-[#0a6787]'}`}>
                            {p.quantidade}
                          </span>
                          <button onClick={() => ajustarEstoqueRapido(p.id, p.quantidade + 1)} className="w-7 h-7 rounded bg-emerald-50 text-emerald-500 font-bold hover:bg-emerald-500 hover:text-white">+</button>
                        </div>
                        <div className="text-[9px] text-gray-400 mt-1">Mínimo: {p.estoque_minimo}</div>
                      </td>
                      <td className="px-6 py-4 min-w-[150px]">
                        <div className="text-xs text-gray-500">Custo: <span className="font-bold">R$ {p.valor_custo.toFixed(2)}</span></div>
                        <div className="text-xs text-[#0a6787] mt-1">Venda: <span className="font-black">R$ {p.valor_venda.toFixed(2)}</span></div>
                      </td>
                      <td className="px-6 py-4 min-w-[170px]">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">
                          {p.condicao}
                        </span>
                        <div className="text-xs text-gray-500 mt-2 font-medium">
                          {p.localizacao || 'Sem localização'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col gap-2 items-end">
                          <button
                            onClick={() => abrirModalVenda(p)}
                            disabled={semEstoque}
                            className="px-4 py-2 bg-emerald-500 text-white text-xs font-black rounded-lg hover:bg-emerald-600 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            Vender
                          </button>
                          <button onClick={() => abrirModalEditar(p)} className="px-4 py-2 bg-[#e0f7ff] text-[#0a6787] text-xs font-bold rounded-lg hover:bg-[#0a6787] hover:text-white transition-all">
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => excluirProduto(p)}
                            disabled={isExcluindoId === p.id}
                            title="Excluir produto"
                            aria-label={`Excluir ${p.nome}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-all hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0a6787]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 bg-[#0a6787] text-white flex justify-between items-center">
              <h3 className="text-xl font-black">
                {produtoEditando ? 'Editar item do estoque' : 'Novo item do estoque'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-red-300 font-bold text-xl">x</button>
            </div>

            <div className="p-6 overflow-y-auto bg-[#f8fcff]">
              <form id="formEstoque" onSubmit={handleSalvar} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Produto / peça *</label>
                    <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold outline-none focus:border-[#38bdf8]" required placeholder="Ex: Display iPhone 13, placa fonte LG..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">SKU</label>
                    <input type="text" value={formData.codigo_sku} onChange={(e) => setFormData({...formData, codigo_sku: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-mono outline-none focus:border-[#38bdf8]" placeholder="Opcional" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Tipo de aparelho *</label>
                    <select value={formData.tipo_aparelho} onChange={(e) => atualizarTipoFormulario(e.target.value as TipoAparelho)} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium outline-none focus:border-[#38bdf8]">
                      {TIPOS_APARELHO.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Subfiltro / peça *</label>
                    <select value={formData.subcategoria} onChange={(e) => atualizarSubcategoriaFormulario(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium outline-none focus:border-[#38bdf8]">
                      {CATALOGO_ESTOQUE[formData.tipo_aparelho].map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Marca</label>
                    <input type="text" value={formData.marca} onChange={(e) => setFormData({...formData, marca: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] outline-none focus:border-[#38bdf8]" placeholder="Ex: Apple, Samsung, LG..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Modelo compatível</label>
                    <input type="text" value={formData.modelo_compativel} onChange={(e) => setFormData({...formData, modelo_compativel: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] outline-none focus:border-[#38bdf8]" placeholder="Ex: iPhone 13, UN43J5200..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-2xl border border-[#e0f1f7]">
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Quantidade *</label>
                    <input type="number" value={formData.quantidade} onChange={(e) => setFormData({...formData, quantidade: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-[#f0f9ff] border border-[#a3d8e8] rounded-xl text-[#0a6787] font-black outline-none focus:border-[#38bdf8]" required min="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Estoque mínimo *</label>
                    <input type="number" value={formData.estoque_minimo} onChange={(e) => setFormData({...formData, estoque_minimo: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-amber-600 font-bold outline-none focus:border-amber-400" required min="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Valor de custo (R$)</label>
                    <input type="number" step="0.01" value={formData.valor_custo} onChange={(e) => setFormData({...formData, valor_custo: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-red-500 font-bold outline-none focus:border-red-400" min="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Valor de venda (R$)</label>
                    <input type="number" step="0.01" value={formData.valor_venda} onChange={(e) => setFormData({...formData, valor_venda: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-emerald-500 font-bold outline-none focus:border-emerald-400" min="0" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Condição</label>
                    <select value={formData.condicao} onChange={(e) => setFormData({...formData, condicao: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold outline-none focus:border-[#38bdf8]">
                      {CONDICOES.map((condicao) => <option key={condicao} value={condicao}>{condicao}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Localização física</label>
                    <input type="text" value={formData.localizacao} onChange={(e) => setFormData({...formData, localizacao: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] outline-none focus:border-[#38bdf8]" placeholder="Ex: Gaveta C2, prateleira B..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Observações</label>
                    <input type="text" value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] outline-none focus:border-[#38bdf8]" placeholder="Ex: original, similar, com aro..." />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 bg-white border-t border-[#e0f1f7] flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">Cancelar</button>
              <button form="formEstoque" type="submit" disabled={isSubmitting} className="px-8 py-3 bg-[#0a6787] text-white font-black rounded-xl hover:bg-[#08526c] shadow-lg disabled:opacity-50">
                {isSubmitting ? "Salvando..." : "Salvar item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isVendaModalOpen && produtoVenda && (
        <div className="fixed inset-0 bg-[#0a6787]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 bg-emerald-500 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">Vender produto</h3>
                <p className="text-sm font-bold text-emerald-50 mt-1">{produtoVenda.nome}</p>
              </div>
              <button onClick={fecharModalVenda} className="text-white hover:text-emerald-100 font-bold text-xl">x</button>
            </div>

            <form onSubmit={handleRegistrarVenda} className="p-6 space-y-5 bg-[#f8fcff]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-[#e0f1f7] bg-white p-4">
                <div>
                  <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Cliente para garantia</label>
                  <input
                    type="text"
                    value={vendaData.cliente_nome}
                    onChange={(e) => setVendaData({ ...vendaData, cliente_nome: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold outline-none focus:border-emerald-400"
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Telefone do cliente</label>
                  <input
                    type="text"
                    value={vendaData.cliente_telefone}
                    onChange={(e) => setVendaData({ ...vendaData, cliente_telefone: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold outline-none focus:border-emerald-400"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Quantidade vendida *</label>
                  <input
                    type="number"
                    value={vendaData.quantidade}
                    onChange={(e) => setVendaData({ ...vendaData, quantidade: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-black outline-none focus:border-emerald-400"
                    required
                    min="1"
                    max={produtoVenda.quantidade}
                  />
                  <p className="mt-1 text-[11px] font-bold text-gray-400">Disponivel: {produtoVenda.quantidade}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Desconto total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={vendaData.desconto}
                    onChange={(e) => setVendaData({ ...vendaData, desconto: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-white border border-[#e0f1f7] rounded-xl text-amber-600 font-bold outline-none focus:border-amber-400"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Pagamento *</label>
                  <select
                    value={vendaData.forma_pagamento}
                    onChange={(e) => setVendaData({ ...vendaData, forma_pagamento: e.target.value as FormaPagamento })}
                    className="w-full px-4 py-3 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold outline-none focus:border-emerald-400"
                    required
                  >
                    {FORMAS_PAGAMENTO.map((forma) => <option key={forma} value={forma}>{forma}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Data da venda *</label>
                  <input
                    type="date"
                    value={vendaData.data_venda}
                    onChange={(e) => setVendaData({ ...vendaData, data_venda: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Observacoes</label>
                  <input
                    type="text"
                    value={vendaData.observacoes}
                    onChange={(e) => setVendaData({ ...vendaData, observacoes: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] outline-none focus:border-emerald-400"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white border border-[#e0f1f7] rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase text-gray-400">Unitario</p>
                  <p className="text-lg font-black text-[#0a6787]">{formatarMoeda(produtoVenda.valor_venda)}</p>
                </div>
                <div className="bg-white border border-[#e0f1f7] rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase text-gray-400">Subtotal</p>
                  <p className="text-lg font-black text-[#0a6787]">{formatarMoeda(subtotalVenda)}</p>
                </div>
                <div className="bg-white border border-[#e0f1f7] rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase text-gray-400">Receita</p>
                  <p className="text-lg font-black text-emerald-500">{formatarMoeda(totalVenda)}</p>
                </div>
                <div className="bg-white border border-[#e0f1f7] rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase text-gray-400">Lucro estimado</p>
                  <p className={`text-lg font-black ${lucroVenda >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {formatarMoeda(lucroVenda)}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-[#e0f1f7] flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button type="button" onClick={fecharModalVenda} className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">Cancelar</button>
                <button type="submit" disabled={isVendaSubmitting} className="px-8 py-3 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 shadow-lg disabled:opacity-50">
                  {isVendaSubmitting ? 'Registrando...' : 'Confirmar venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
