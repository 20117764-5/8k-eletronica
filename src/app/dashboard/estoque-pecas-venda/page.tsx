"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type CondicaoPeca = 'Nova' | 'Usada';
type StatusPeca = 'Disponível' | 'Vendido';
type FiltroStatus = 'disponiveis' | 'vendidos' | 'todos';

interface PecaVenda {
  id: number;
  data_cadastro: string;
  nome_peca: string;
  marca: string;
  modelo: string;
  versao: string | null;
  codigo: string | null;
  condicao: CondicaoPeca;
  local_armazenamento: string;
  status: StatusPeca;
  data_venda: string | null;
}

interface PecaForm {
  data_cadastro: string;
  nome_peca: string;
  marca: string;
  modelo: string;
  versao: string;
  codigo: string;
  condicao: CondicaoPeca;
  local_armazenamento: string;
}

function dataHojeLocal() {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function criarFormInicial(): PecaForm {
  return {
    data_cadastro: dataHojeLocal(),
    nome_peca: '',
    marca: '',
    modelo: '',
    versao: '',
    codigo: '',
    condicao: 'Usada',
    local_armazenamento: '',
  };
}

function normalizarTexto(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function formatarData(valor: string) {
  if (!valor) return 'Não informada';
  const data = new Date(`${valor.slice(0, 10)}T12:00:00`);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString('pt-BR');
}

function formatarDataHora(valor: string | null) {
  if (!valor) return '';
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? valor
    : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function mensagemDoErro(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Erro desconhecido';
}

function normalizarPeca(item: Record<string, unknown>): PecaVenda {
  return {
    id: Number(item.id),
    data_cadastro: String(item.data_cadastro || ''),
    nome_peca: String(item.nome_peca || ''),
    marca: String(item.marca || ''),
    modelo: String(item.modelo || ''),
    versao: item.versao ? String(item.versao) : null,
    codigo: item.codigo ? String(item.codigo) : null,
    condicao: item.condicao === 'Nova' ? 'Nova' : 'Usada',
    local_armazenamento: String(item.local_armazenamento || ''),
    status: item.status === 'Vendido' ? 'Vendido' : 'Disponível',
    data_venda: item.data_venda ? String(item.data_venda) : null,
  };
}

export default function EstoquePecasVendaPage() {
  const [pecas, setPecas] = useState<PecaVenda[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('disponiveis');
  const [isLoading, setIsLoading] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pecaEditando, setPecaEditando] = useState<PecaVenda | null>(null);
  const [formData, setFormData] = useState<PecaForm>(criarFormInicial());
  const [isSalvando, setIsSalvando] = useState(false);
  const [idProcessando, setIdProcessando] = useState<number | null>(null);

  async function carregarPecas() {
    setIsLoading(true);
    setErroCarregamento('');

    try {
      const { data, error } = await supabase
        .from('estoque_pecas_venda')
        .select('*')
        .order('data_cadastro', { ascending: false })
        .order('id', { ascending: false });

      if (error) throw error;
      setPecas((data || []).map((item) => normalizarPeca(item as Record<string, unknown>)));
    } catch (error) {
      console.error('Erro ao carregar estoque de peças para venda:', error);
      setErroCarregamento(
        `Não foi possível carregar este estoque. Execute o arquivo supabase-estoque-pecas-venda.sql no Supabase. Detalhe: ${mensagemDoErro(error)}`,
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    carregarPecas();
  }, []);

  const pecasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);

    return pecas.filter((peca) => {
      const atendeStatus =
        filtroStatus === 'todos'
        || (filtroStatus === 'disponiveis' && peca.status === 'Disponível')
        || (filtroStatus === 'vendidos' && peca.status === 'Vendido');

      const dadosPesquisaveis = normalizarTexto([
        peca.nome_peca,
        peca.marca,
        peca.modelo,
        peca.versao,
        peca.codigo,
        peca.condicao,
        peca.local_armazenamento,
        peca.status,
        formatarData(peca.data_cadastro),
      ].filter(Boolean).join(' '));

      return atendeStatus && (termo === '' || dadosPesquisaveis.includes(termo));
    });
  }, [busca, filtroStatus, pecas]);

  const disponiveis = pecas.filter((peca) => peca.status === 'Disponível');
  const vendidas = pecas.filter((peca) => peca.status === 'Vendido');
  const novasDisponiveis = disponiveis.filter((peca) => peca.condicao === 'Nova').length;
  const usadasDisponiveis = disponiveis.filter((peca) => peca.condicao === 'Usada').length;

  function abrirCadastro() {
    setPecaEditando(null);
    setFormData(criarFormInicial());
    setIsModalOpen(true);
  }

  function abrirEdicao(peca: PecaVenda) {
    setPecaEditando(peca);
    setFormData({
      data_cadastro: peca.data_cadastro.slice(0, 10),
      nome_peca: peca.nome_peca,
      marca: peca.marca,
      modelo: peca.modelo,
      versao: peca.versao || '',
      codigo: peca.codigo || '',
      condicao: peca.condicao,
      local_armazenamento: peca.local_armazenamento,
    });
    setIsModalOpen(true);
  }

  function fecharModal() {
    if (isSalvando) return;
    setIsModalOpen(false);
    setPecaEditando(null);
    setFormData(criarFormInicial());
  }

  async function salvarPeca(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSalvando(true);

    const payload = {
      data_cadastro: formData.data_cadastro,
      nome_peca: formData.nome_peca.trim(),
      marca: formData.marca.trim(),
      modelo: formData.modelo.trim(),
      versao: formData.versao.trim() || null,
      codigo: formData.codigo.trim() || null,
      condicao: formData.condicao,
      local_armazenamento: formData.local_armazenamento.trim(),
    };

    try {
      if (pecaEditando) {
        const { error } = await supabase
          .from('estoque_pecas_venda')
          .update(payload)
          .eq('id', pecaEditando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('estoque_pecas_venda')
          .insert([{ ...payload, status: 'Disponível' }]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setPecaEditando(null);
      setFormData(criarFormInicial());
      await carregarPecas();
    } catch (error) {
      console.error('Erro ao salvar peça:', error);
      alert(`Não foi possível salvar a peça. ${mensagemDoErro(error)}`);
    } finally {
      setIsSalvando(false);
    }
  }

  async function marcarComoVendido(peca: PecaVenda) {
    const confirmou = window.confirm(
      `Dar baixa em “${peca.nome_peca}” como vendido?\n\nA peça sairá da lista de disponíveis e ficará no histórico de vendidos.`,
    );
    if (!confirmou) return;

    setIdProcessando(peca.id);
    try {
      const dataVenda = new Date().toISOString();
      const { error } = await supabase
        .from('estoque_pecas_venda')
        .update({ status: 'Vendido', data_venda: dataVenda })
        .eq('id', peca.id)
        .eq('status', 'Disponível');

      if (error) throw error;
      setPecas((lista) => lista.map((item) => (
        item.id === peca.id ? { ...item, status: 'Vendido', data_venda: dataVenda } : item
      )));
    } catch (error) {
      console.error('Erro ao dar baixa na peça:', error);
      alert(`Não foi possível registrar a venda. ${mensagemDoErro(error)}`);
    } finally {
      setIdProcessando(null);
    }
  }

  async function excluirPeca(peca: PecaVenda) {
    const confirmou = window.confirm(
      `Excluir permanentemente “${peca.nome_peca}”?\n\nEssa ação não poderá ser desfeita.`,
    );
    if (!confirmou) return;

    setIdProcessando(peca.id);
    try {
      const { error } = await supabase
        .from('estoque_pecas_venda')
        .delete()
        .eq('id', peca.id);

      if (error) throw error;
      setPecas((lista) => lista.filter((item) => item.id !== peca.id));
    } catch (error) {
      console.error('Erro ao excluir peça:', error);
      alert(`Não foi possível excluir a peça. ${mensagemDoErro(error)}`);
    } finally {
      setIdProcessando(null);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-3xl bg-[#0a6787] p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#a3d8e8]">Controle separado</p>
            <h2 className="mt-2 text-3xl font-black">Estoque de Peças para Venda</h2>
            <p className="mt-2 max-w-3xl text-sm font-medium text-[#d8f3fc]">
              Cadastre placas, barras de LED e outras peças novas ou usadas anunciadas na internet.
            </p>
          </div>
          <button
            type="button"
            onClick={abrirCadastro}
            className="h-12 rounded-xl bg-[#f4c400] px-6 font-black text-[#0a0a0a] shadow-lg transition-all hover:bg-white"
          >
            + Cadastrar peça
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-gray-400">Disponíveis</p>
          <p className="mt-1 text-3xl font-black text-emerald-600">{disponiveis.length}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-gray-400">Novas</p>
          <p className="mt-1 text-3xl font-black text-blue-600">{novasDisponiveis}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-gray-400">Usadas</p>
          <p className="mt-1 text-3xl font-black text-amber-600">{usadasDisponiveis}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-gray-400">Vendidas</p>
          <p className="mt-1 text-3xl font-black text-gray-700">{vendidas.length}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-[#e0f1f7] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <label className="mb-2 block text-xs font-black uppercase text-[#0a6787]">Buscar peça</label>
            <input
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Nome, marca, modelo, versão, código ou local (ex.: caixa 1)..."
              className="w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-medium text-[#0a6787] outline-none focus:border-[#38bdf8]"
            />
          </div>
          <div className="lg:col-span-3">
            <label className="mb-2 block text-xs font-black uppercase text-[#0a6787]">Situação</label>
            <select
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value as FiltroStatus)}
              className="w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-bold text-[#0a6787] outline-none focus:border-[#38bdf8]"
            >
              <option value="disponiveis">Disponíveis</option>
              <option value="vendidos">Vendidos</option>
              <option value="todos">Todos</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => { setBusca(''); setFiltroStatus('disponiveis'); }}
            className="rounded-xl border border-[#e0f1f7] bg-white px-4 py-3 font-bold text-[#0a6787] hover:bg-[#f0f9ff] lg:col-span-1"
          >
            Limpar
          </button>
        </div>
      </section>

      {erroCarregamento && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          {erroCarregamento}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-[#e0f1f7] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f0f9ff] text-[10px] font-black uppercase tracking-wider text-[#73a8bd]">
              <tr>
                <th className="px-5 py-4">Cadastro / status</th>
                <th className="px-5 py-4">Peça</th>
                <th className="px-5 py-4">Aplicação</th>
                <th className="px-5 py-4">Condição</th>
                <th className="px-5 py-4">Local</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f9ff]">
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center font-bold text-[#38bdf8]">Carregando peças...</td></tr>
              ) : pecasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-lg font-black text-[#0a6787]">Nenhuma peça encontrada</p>
                    <p className="mt-1 text-sm text-gray-500">Ajuste a busca ou cadastre uma nova peça.</p>
                  </td>
                </tr>
              ) : pecasFiltradas.map((peca) => {
                const foiVendida = peca.status === 'Vendido';
                return (
                  <tr key={peca.id} className={`transition-colors hover:bg-[#f8fcff] ${foiVendida ? 'bg-gray-50/70' : ''}`}>
                    <td className="min-w-[155px] px-5 py-4">
                      <div className="font-bold text-gray-700">{formatarData(peca.data_cadastro)}</div>
                      <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase ${
                        foiVendida
                          ? 'border-gray-300 bg-gray-100 text-gray-600'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      }`}>
                        {peca.status}
                      </span>
                      {peca.data_venda && <div className="mt-1 text-[10px] text-gray-400">{formatarDataHora(peca.data_venda)}</div>}
                    </td>
                    <td className="min-w-[220px] px-5 py-4">
                      <div className="font-black text-[#0a6787]">{peca.nome_peca}</div>
                      <div className="mt-1 text-xs text-gray-500">{peca.marca}</div>
                      <div className="mt-1 font-mono text-[11px] text-gray-400">Código: {peca.codigo || 'Não informado'}</div>
                    </td>
                    <td className="min-w-[190px] px-5 py-4">
                      <div className="font-bold text-gray-800">{peca.modelo}</div>
                      <div className="mt-1 text-xs text-gray-500">Versão: {peca.versao || 'Não informada'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                        peca.condicao === 'Nova' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {peca.condicao}
                      </span>
                    </td>
                    <td className="min-w-[150px] px-5 py-4 font-bold text-gray-700">{peca.local_armazenamento}</td>
                    <td className="min-w-[230px] px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        {!foiVendida && (
                          <button
                            type="button"
                            onClick={() => marcarComoVendido(peca)}
                            disabled={idProcessando === peca.id}
                            className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-black text-white hover:bg-emerald-600 disabled:opacity-50"
                          >
                            Vendido
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => abrirEdicao(peca)}
                          disabled={idProcessando === peca.id}
                          className="rounded-lg bg-[#e0f7ff] px-4 py-2 text-xs font-bold text-[#0a6787] hover:bg-[#0a6787] hover:text-white disabled:opacity-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirPeca(peca)}
                          disabled={idProcessando === peca.id}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-500 hover:text-white disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a6787]/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#0a6787] p-6 text-white">
              <div>
                <h3 className="text-xl font-black">{pecaEditando ? 'Editar peça' : 'Cadastrar peça para venda'}</h3>
                <p className="mt-1 text-sm font-medium text-[#a3d8e8]">Identificação e localização física do item.</p>
              </div>
              <button type="button" onClick={fecharModal} className="h-10 w-10 rounded-full bg-white/10 text-xl font-black hover:bg-white/20" aria-label="Fechar">×</button>
            </div>

            <form onSubmit={salvarPeca} className="overflow-y-auto p-6 md:p-8">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-black uppercase text-[#73a8bd]">Data do cadastro *</label>
                  <input type="date" required value={formData.data_cadastro} onChange={(event) => setFormData({ ...formData, data_cadastro: event.target.value })} className="w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-bold text-[#0a6787] outline-none focus:border-[#38bdf8]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase text-[#73a8bd]">Condição *</label>
                  <select required value={formData.condicao} onChange={(event) => setFormData({ ...formData, condicao: event.target.value as CondicaoPeca })} className="w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-bold text-[#0a6787] outline-none focus:border-[#38bdf8]">
                    <option value="Nova">Nova</option>
                    <option value="Usada">Usada</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-black uppercase text-[#73a8bd]">Nome da peça *</label>
                  <input type="text" required value={formData.nome_peca} onChange={(event) => setFormData({ ...formData, nome_peca: event.target.value })} placeholder="Ex.: Placa principal, placa da fonte, T-Con, barras de LED..." className="w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-bold text-[#0a6787] outline-none focus:border-[#38bdf8]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase text-[#73a8bd]">Marca *</label>
                  <input type="text" required value={formData.marca} onChange={(event) => setFormData({ ...formData, marca: event.target.value })} placeholder="Ex.: LG, Samsung, Philips" className="w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-medium text-[#0a6787] outline-none focus:border-[#38bdf8]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase text-[#73a8bd]">Modelo do aparelho *</label>
                  <input type="text" required value={formData.modelo} onChange={(event) => setFormData({ ...formData, modelo: event.target.value })} placeholder="Ex.: 43LM6300" className="w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-medium text-[#0a6787] outline-none focus:border-[#38bdf8]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase text-[#73a8bd]">Versão</label>
                  <input type="text" value={formData.versao} onChange={(event) => setFormData({ ...formData, versao: event.target.value })} placeholder="Ex.: REV 1.2" className="w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-medium text-[#0a6787] outline-none focus:border-[#38bdf8]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase text-[#73a8bd]">Código da peça</label>
                  <input type="text" value={formData.codigo} onChange={(event) => setFormData({ ...formData, codigo: event.target.value })} placeholder="Código impresso na placa ou etiqueta" className="w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-mono text-[#0a6787] outline-none focus:border-[#38bdf8]" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-black uppercase text-[#73a8bd]">Local de armazenamento *</label>
                  <input type="text" required value={formData.local_armazenamento} onChange={(event) => setFormData({ ...formData, local_armazenamento: event.target.value })} placeholder="Ex.: Caixa 1, Gaveta 2, Prateleira B" className="w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-bold text-[#0a6787] outline-none focus:border-[#38bdf8]" />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-[#e0f1f7] pt-6">
                <button type="button" onClick={fecharModal} className="rounded-xl px-5 py-3 font-bold text-gray-500 hover:bg-gray-100">Cancelar</button>
                <button type="submit" disabled={isSalvando} className="rounded-xl bg-[#0a6787] px-8 py-3 font-black text-white shadow-lg hover:bg-[#08526c] disabled:opacity-50">
                  {isSalvando ? 'Salvando...' : pecaEditando ? 'Salvar alterações' : 'Cadastrar peça'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
