"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Produto {
  id: number;
  codigo_sku: string | null;
  nome: string;
  categoria: string;
  marca: string | null;
  modelo_compativel: string | null;
  quantidade: number;
  estoque_minimo: number;
  valor_custo: number;
  valor_venda: number;
  condicao: string;
  localizacao: string | null;
}

const CATEGORIAS = [
  "Componentes (CIs, Capacitores, etc)",
  "Placas (Principal, Fonte, T-Con)",
  "Telas / Displays",
  "Insumos (Solda, Pasta, Fluxo)",
  "Acessórios (Cabos, Controles)",
  "Aparelho Sucata (Doador)"
];

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroAlerta, setFiltroAlerta] = useState(false);

  // Modal de Cadastro/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);

  // Estados do Formulário
  const [formData, setFormData] = useState({
    codigo_sku: '', nome: '', categoria: CATEGORIAS[0], marca: '', modelo_compativel: '',
    quantidade: 0, estoque_minimo: 2, valor_custo: 0, valor_venda: 0, condicao: 'Novo', localizacao: ''
  });

  useEffect(() => {
    fetchEstoque();
  }, []);

  async function fetchEstoque() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('estoque').select('*').order('nome', { ascending: true });
      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error("Erro ao buscar estoque:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // KPIs
  const totalItens = produtos.reduce((acc, curr) => acc + curr.quantidade, 0);
  const valorCustoTotal = produtos.reduce((acc, curr) => acc + (curr.quantidade * curr.valor_custo), 0);
  const valorVendaTotal = produtos.reduce((acc, curr) => acc + (curr.quantidade * curr.valor_venda), 0);
  const produtosBaixoEstoque = produtos.filter(p => p.quantidade <= p.estoque_minimo);

  // Filtragem Dinâmica
  const produtosFiltrados = produtos.filter(p => {
    const atendeBusca = (p.nome.toLowerCase().includes(busca.toLowerCase())) || 
                        (p.modelo_compativel?.toLowerCase().includes(busca.toLowerCase())) ||
                        (p.codigo_sku?.toLowerCase().includes(busca.toLowerCase())) ||
                        (p.marca?.toLowerCase().includes(busca.toLowerCase()));
    
    const atendeCategoria = filtroCategoria === 'Todas' || p.categoria === filtroCategoria;
    const atendeAlerta = !filtroAlerta || p.quantidade <= p.estoque_minimo;

    return atendeBusca && atendeCategoria && atendeAlerta;
  });

  const abrirModalNovo = () => {
    setProdutoEditando(null);
    setFormData({
      codigo_sku: '', nome: '', categoria: CATEGORIAS[0], marca: '', modelo_compativel: '',
      quantidade: 0, estoque_minimo: 2, valor_custo: 0, valor_venda: 0, condicao: 'Novo', localizacao: ''
    });
    setIsModalOpen(true);
  };

  const abrirModalEditar = (produto: Produto) => {
    setProdutoEditando(produto);
    setFormData({
      codigo_sku: produto.codigo_sku || '',
      nome: produto.nome,
      categoria: produto.categoria,
      marca: produto.marca || '',
      modelo_compativel: produto.modelo_compativel || '',
      quantidade: produto.quantidade,
      estoque_minimo: produto.estoque_minimo,
      valor_custo: produto.valor_custo,
      valor_venda: produto.valor_venda,
      condicao: produto.condicao,
      localizacao: produto.localizacao || ''
    });
    setIsModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (produtoEditando) {
        // Atualizar
        const { error } = await supabase.from('estoque').update(formData).eq('id', produtoEditando.id);
        if (error) throw error;
      } else {
        // Criar Novo
        const { error } = await supabase.from('estoque').insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchEstoque(); // Recarrega os dados
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar o produto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const ajustarEstoqueRapido = async (id: number, novaQtd: number) => {
    if (novaQtd < 0) return;
    try {
      const { error } = await supabase.from('estoque').update({ quantidade: novaQtd }).eq('id', id);
      if (error) throw error;
      setProdutos(produtos.map(p => p.id === id ? { ...p, quantidade: novaQtd } : p));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 relative">
      
      {/* HEADER E KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-1 md:col-span-4 bg-[#0a6787] p-8 rounded-3xl shadow-lg relative overflow-hidden flex justify-between items-center">
          <div className="absolute -right-10 -top-10 text-9xl opacity-10">📦</div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white">Estoque Inteligente</h2>
            <p className="text-[#a3d8e8] font-medium mt-1">Gerencie peças, insumos e placas de sucata.</p>
          </div>
          <button onClick={abrirModalNovo} className="relative z-10 px-6 py-3 bg-[#38bdf8] text-white font-black rounded-xl hover:bg-white hover:text-[#0a6787] transition-all shadow-lg flex items-center gap-2">
            <span>➕</span> Novo Item
          </button>
        </div>

        {/* CARDS DE RESUMO */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e0f1f7]">
          <p className="text-xs font-bold text-gray-400 uppercase">Total de Itens Físicos</p>
          <p className="text-3xl font-black text-[#0a6787]">{totalItens} <span className="text-sm font-medium text-gray-500">unids</span></p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e0f1f7]">
          <p className="text-xs font-bold text-gray-400 uppercase">Capital Investido (Custo)</p>
          <p className="text-3xl font-black text-amber-500">R$ {valorCustoTotal.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e0f1f7]">
          <p className="text-xs font-bold text-gray-400 uppercase">Potencial de Venda</p>
          <p className="text-3xl font-black text-emerald-500">R$ {valorVendaTotal.toFixed(2)}</p>
        </div>
        <div 
          onClick={() => setFiltroAlerta(!filtroAlerta)}
          className={`p-5 rounded-2xl shadow-sm border cursor-pointer transition-all ${filtroAlerta ? 'bg-red-500 border-red-600' : 'bg-red-50 border-red-100 hover:bg-red-100'}`}
        >
          <p className={`text-xs font-bold uppercase ${filtroAlerta ? 'text-red-100' : 'text-red-400'}`}>⚠️ Alerta de Reposição</p>
          <p className={`text-3xl font-black ${filtroAlerta ? 'text-white' : 'text-red-600'}`}>
            {produtosBaixoEstoque.length} <span className="text-sm font-medium">produtos</span>
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7] flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-black text-[#0a6787] uppercase mb-2">Busca Rápida</label>
          <input 
            type="text" 
            placeholder="Nome, Modelo, Marca ou SKU..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium outline-none focus:border-[#38bdf8]"
          />
        </div>
        <div className="w-full md:w-64">
          <label className="block text-xs font-black text-[#0a6787] uppercase mb-2">Filtrar Categoria</label>
          <select 
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium outline-none focus:border-[#38bdf8]"
          >
            <option value="Todas">Todas as Categorias</option>
            {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* TABELA DE ESTOQUE */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#e0f1f7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f0f9ff]/50 text-[10px] font-bold text-[#73a8bd] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Produto / Descrição</th>
                <th className="px-6 py-4 text-center">Quantidade</th>
                <th className="px-6 py-4">Financeiro (Unid)</th>
                <th className="px-6 py-4">Local / Condição</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f9ff]">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-[#38bdf8] font-bold animate-pulse">Carregando prateleiras...</td></tr>
              ) : produtosFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">Nenhum produto encontrado.</td></tr>
              ) : (
                produtosFiltrados.map((p) => {
                  const baixoEstoque = p.quantidade <= p.estoque_minimo;
                  const semEstoque = p.quantidade === 0;
                  return (
                    <tr key={p.id} className="hover:bg-[#f8fcff] transition-colors group">
                      <td className="px-6 py-4">
                        {semEstoque ? (
                          <span className="w-3 h-3 bg-red-500 rounded-full inline-block shadow-sm shadow-red-500/50" title="Sem Estoque"></span>
                        ) : baixoEstoque ? (
                          <span className="w-3 h-3 bg-amber-500 rounded-full inline-block shadow-sm shadow-amber-500/50" title="Estoque Baixo"></span>
                        ) : (
                          <span className="w-3 h-3 bg-emerald-500 rounded-full inline-block shadow-sm shadow-emerald-500/50" title="Estoque Ok"></span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#0a6787]">{p.nome}</div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          <span className="font-bold text-[#38bdf8]">{p.categoria}</span> 
                          {p.marca && ` • ${p.marca}`} 
                          {p.modelo_compativel && ` • P/ ${p.modelo_compativel}`}
                        </div>
                        {p.codigo_sku && <div className="text-[10px] text-gray-400 font-mono mt-1">SKU: {p.codigo_sku}</div>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => ajustarEstoqueRapido(p.id, p.quantidade - 1)} className="w-6 h-6 rounded bg-red-50 text-red-500 font-bold hover:bg-red-500 hover:text-white flex items-center justify-center">-</button>
                          <span className={`text-lg font-black w-8 text-center ${semEstoque ? 'text-red-500' : baixoEstoque ? 'text-amber-500' : 'text-[#0a6787]'}`}>
                            {p.quantidade}
                          </span>
                          <button onClick={() => ajustarEstoqueRapido(p.id, p.quantidade + 1)} className="w-6 h-6 rounded bg-emerald-50 text-emerald-500 font-bold hover:bg-emerald-500 hover:text-white flex items-center justify-center">+</button>
                        </div>
                        <div className="text-[9px] text-gray-400 mt-1">Mínimo: {p.estoque_minimo}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-500">Custo: <span className="font-bold">R$ {p.valor_custo.toFixed(2)}</span></div>
                        <div className="text-xs text-[#0a6787] mt-1">Venda: <span className="font-black">R$ {p.valor_venda.toFixed(2)}</span></div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${p.condicao === 'Novo' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {p.condicao}
                        </span>
                        <div className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-1">
                          📍 {p.localizacao || 'Sem local'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => abrirModalEditar(p)} className="px-4 py-2 bg-[#e0f7ff] text-[#0a6787] text-xs font-bold rounded-lg hover:bg-[#0a6787] hover:text-white transition-all">
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0a6787]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 bg-[#0a6787] text-white flex justify-between items-center">
              <h3 className="text-xl font-black flex items-center gap-2">
                {produtoEditando ? '✏️ Editar Produto' : '📦 Novo Produto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-red-300 font-bold text-xl">✕</button>
            </div>

            <div className="p-6 overflow-y-auto bg-[#f8fcff]">
              <form id="formEstoque" onSubmit={handleSalvar} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Nome do Produto / Peça *</label>
                    <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold outline-none focus:border-[#38bdf8]" required placeholder="Ex: Placa Principal TV LG..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Cód. SKU</label>
                    <input type="text" value={formData.codigo_sku} onChange={(e) => setFormData({...formData, codigo_sku: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-mono outline-none focus:border-[#38bdf8]" placeholder="OPCIONAL" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Categoria *</label>
                    <select value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-medium outline-none focus:border-[#38bdf8]">
                      {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Marca</label>
                    <input type="text" value={formData.marca} onChange={(e) => setFormData({...formData, marca: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] outline-none focus:border-[#38bdf8]" placeholder="Ex: LG, Samsung..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Modelos Compatíveis</label>
                    <input type="text" value={formData.modelo_compativel} onChange={(e) => setFormData({...formData, modelo_compativel: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] outline-none focus:border-[#38bdf8]" placeholder="Ex: UN43J5200, etc..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-2xl border border-[#e0f1f7]">
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Qtd Atual *</label>
                    <input type="number" value={formData.quantidade} onChange={(e) => setFormData({...formData, quantidade: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-[#f0f9ff] border border-[#a3d8e8] rounded-xl text-[#0a6787] font-black outline-none focus:border-[#38bdf8]" required min="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Estoque Mínimo *</label>
                    <input type="number" value={formData.estoque_minimo} onChange={(e) => setFormData({...formData, estoque_minimo: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-amber-600 font-bold outline-none focus:border-amber-400" required min="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Valor de Custo (R$)</label>
                    <input type="number" step="0.01" value={formData.valor_custo} onChange={(e) => setFormData({...formData, valor_custo: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-red-500 font-bold outline-none focus:border-red-400" min="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Valor de Venda (R$)</label>
                    <input type="number" step="0.01" value={formData.valor_venda} onChange={(e) => setFormData({...formData, valor_venda: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-emerald-500 font-bold outline-none focus:border-emerald-400" min="0" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Condição da Peça</label>
                    <select value={formData.condicao} onChange={(e) => setFormData({...formData, condicao: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold outline-none focus:border-[#38bdf8]">
                      <option value="Novo">Novo (Fábrica)</option>
                      <option value="Retirado (Usado)">Retirado / Usado (Sucata)</option>
                      <option value="Recondicionado">Recondicionado / Reparado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Localização (Física)</label>
                    <input type="text" value={formData.localizacao} onChange={(e) => setFormData({...formData, localizacao: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#e0f1f7] rounded-xl text-[#0a6787] outline-none focus:border-[#38bdf8]" placeholder="Ex: Gaveta 4, Prateleira B..." />
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-6 bg-white border-t border-[#e0f1f7] flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">Cancelar</button>
              <button form="formEstoque" type="submit" disabled={isSubmitting} className="px-8 py-3 bg-[#0a6787] text-white font-black rounded-xl hover:bg-[#08526c] shadow-lg disabled:opacity-50 flex items-center gap-2">
                {isSubmitting ? "⏳ Salvando..." : "💾 Salvar Produto"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}