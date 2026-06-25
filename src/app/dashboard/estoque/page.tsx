"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type TipoAparelho =
  | 'TV'
  | 'Som'
  | 'Forno-microondas'
  | 'Computadores'
  | 'Notebooks'
  | 'Celulares'
  | 'Inversores solares'
  | 'Geral / Oficina';

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

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoAparelho | 'Todos'>('Todos');
  const [filtroSubcategoria, setFiltroSubcategoria] = useState('Todas');
  const [filtroAlerta, setFiltroAlerta] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [formData, setFormData] = useState(criarFormInicial());

  useEffect(() => {
    fetchEstoque();
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

  const subcategoriasDisponiveis = useMemo(() => {
    if (filtroTipo !== 'Todos') return CATALOGO_ESTOQUE[filtroTipo];
    return Array.from(new Set(TIPOS_APARELHO.flatMap((tipo) => CATALOGO_ESTOQUE[tipo]))).sort();
  }, [filtroTipo]);

  const totalItens = produtos.reduce((acc, curr) => acc + curr.quantidade, 0);
  const valorCustoTotal = produtos.reduce((acc, curr) => acc + (curr.quantidade * curr.valor_custo), 0);
  const valorVendaTotal = produtos.reduce((acc, curr) => acc + (curr.quantidade * curr.valor_venda), 0);
  const produtosBaixoEstoque = produtos.filter((p) => p.quantidade <= p.estoque_minimo);
  const produtosEmFalta = produtos.filter((p) => p.quantidade === 0);

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 relative">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-1 md:col-span-4 bg-[#0a6787] p-8 rounded-3xl shadow-lg flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-black text-white">Estoque Multitécnico</h2>
            <p className="text-[#a3d8e8] font-medium mt-1">Peças por aparelho, subcategoria, quantidade, custo, venda e localização.</p>
          </div>
          <button onClick={() => abrirModalNovo()} className="px-6 py-3 bg-[#38bdf8] text-[#0a6787] font-black rounded-xl hover:bg-white transition-all shadow-lg">
            Novo item
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e0f1f7]">
          <p className="text-xs font-bold text-gray-400 uppercase">Itens físicos</p>
          <p className="text-3xl font-black text-[#0a6787]">{totalItens} <span className="text-sm font-medium text-gray-500">unids</span></p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e0f1f7]">
          <p className="text-xs font-bold text-gray-400 uppercase">Capital investido</p>
          <p className="text-3xl font-black text-amber-500">R$ {valorCustoTotal.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e0f1f7]">
          <p className="text-xs font-bold text-gray-400 uppercase">Potencial de venda</p>
          <p className="text-3xl font-black text-emerald-500">R$ {valorVendaTotal.toFixed(2)}</p>
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
                        <button onClick={() => abrirModalEditar(p)} className="px-4 py-2 bg-[#e0f7ff] text-[#0a6787] text-xs font-bold rounded-lg hover:bg-[#0a6787] hover:text-white transition-all">
                          Editar
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
    </div>
  );
}
