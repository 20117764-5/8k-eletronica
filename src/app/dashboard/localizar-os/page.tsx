"use client";

import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// Interfaces
interface ClienteResumo {
  id: number;
  nome_completo: string;
  telefone: string | null;
}

interface OSData {
  id: number;
  cliente_id: number;
  data_entrada: string;
  aparelho_tipo: string;
  marca: string;
  modelo: string | null;
  serial_imei: string | null;
  status: string;
  data_encerramento: string | null;
  // Campo que vai guardar os dados do cliente após o cruzamento
  cliente?: ClienteResumo; 
}

const LISTA_SITUACOES = [
  "Aguardando avaliação do técnico",
  "Aguardando autorização do orçamento",
  "Autorizada aguardando peça",
  "Reparo concluído",
  "Pronto cliente avisado",
  "Aparelho entregue reparado",
  "Aparelho devolvido sem reparo",
  "Aparelho sem defeito",
  "Equipamento condenado",
  "Devolução",
  "Lixo eletrônico",
  "Orçamento não aceito"
];

export default function LocalizarOsPage() {
  const [termoBusca, setTermoBusca] = useState('');
  const [tipoBusca, setTipoBusca] = useState('cliente'); // 'cliente' ou 'aparelho'
  
  const [estadoGeral, setEstadoGeral] = useState('todas'); // 'todas', 'abertas', 'encerradas'
  const [situacao, setSituacao] = useState('todas'); // Status especifico
  
  const [resultados, setResultados] = useState<OSData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [buscaRealizada, setBuscaRealizada] = useState(false);

  const handleBusca = async () => {
    setIsSearching(true);
    setBuscaRealizada(true);
    setResultados([]);

    try {
      let clientIdsFiltrados: number[] = [];

      // 1. SE A BUSCA FOR POR CLIENTE (e houver texto digitado)
      if (tipoBusca === 'cliente' && termoBusca.trim() !== '') {
        const { data: clientesData, error: errCli } = await supabase
          .from('clientes')
          .select('id')
          .or(`nome_completo.ilike.%${termoBusca}%,telefone.ilike.%${termoBusca}%,documento.ilike.%${termoBusca}%`);
          
        if (errCli) throw errCli;

        if (clientesData && clientesData.length > 0) {
          clientIdsFiltrados = clientesData.map(c => c.id);
        } else {
          // Se procurou por um cliente e não achou, a lista de OS fica vazia e paramos por aqui.
          setIsSearching(false);
          return;
        }
      }

      // 2. PREPARAR A BUSCA NAS ORDENS DE SERVIÇO
      let queryOs = supabase.from('ordens_servico').select('*');

      // Filtro de Estado Geral (Abertas vs Encerradas)
      if (estadoGeral === 'abertas') {
        queryOs = queryOs.is('data_encerramento', null);
      } else if (estadoGeral === 'encerradas') {
        queryOs = queryOs.not('data_encerramento', 'is', null);
      }

      // Filtro de Situação Específica
      if (situacao !== 'todas') {
        queryOs = queryOs.eq('status', situacao);
      }

      // Filtro de Texto Específico
      if (termoBusca.trim() !== '') {
        if (tipoBusca === 'cliente') {
          queryOs = queryOs.in('cliente_id', clientIdsFiltrados);
        } else if (tipoBusca === 'aparelho') {
          queryOs = queryOs.or(`aparelho_tipo.ilike.%${termoBusca}%,marca.ilike.%${termoBusca}%,modelo.ilike.%${termoBusca}%,serial_imei.ilike.%${termoBusca}%`);
        }
      }

      // Executa a busca nas O.S.
      const { data: osData, error: osError } = await queryOs.order('id', { ascending: false }).limit(100);
      if (osError) throw osError;

      // 3. SE ACHOU O.S., VAMOS BUSCAR OS NOMES DOS CLIENTES PARA APARECER NA TABELA
      if (osData && osData.length > 0) {
        const uniqueClientIds = Array.from(new Set(osData.map(os => os.cliente_id)));
        
        const { data: clientesTabela } = await supabase
          .from('clientes')
          .select('id, nome_completo, telefone')
          .in('id', uniqueClientIds);

        const mapaClientes = new Map(clientesTabela?.map(cli => [cli.id, cli]));

        // Cruza os dados
        const osComClientes = osData.map(os => ({
          ...os,
          cliente: mapaClientes.get(os.cliente_id)
        }));

        setResultados(osComClientes);
      }

    } catch (error) {
      console.error("Erro na busca detalhada:", error);
      alert("Ocorreu um erro ao buscar os dados.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBusca();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* HEADER */}
      <div className="bg-[#0a6787] p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -top-10 text-9xl opacity-10">🔍</div>
        <h2 className="text-3xl font-black text-white relative z-10">Localizar O.S.</h2>
        <p className="text-[#a3d8e8] font-medium mt-1 relative z-10">Busca avançada com cruzamento de dados de clientes, aparelhos e situações.</p>
      </div>

      {/* PAINEL DE FILTROS AVANÇADOS */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-[#e0f1f7]">
        
        {/* LINHA 1: FILTROS DE ESTADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          <div className="bg-[#f8fcff] p-5 rounded-2xl border border-[#e0f1f7]">
            <label className="block text-xs font-black text-[#0a6787] uppercase tracking-wider mb-3">Estado Geral da O.S.</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="estadoGeral" value="todas" checked={estadoGeral === 'todas'} onChange={(e) => setEstadoGeral(e.target.value)} className="w-4 h-4 text-[#0a6787]" />
                <span className="text-sm font-bold text-gray-700">Todas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="estadoGeral" value="abertas" checked={estadoGeral === 'abertas'} onChange={(e) => setEstadoGeral(e.target.value)} className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-amber-600">Apenas Abertas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="estadoGeral" value="encerradas" checked={estadoGeral === 'encerradas'} onChange={(e) => setEstadoGeral(e.target.value)} className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-emerald-600">Apenas Encerradas</span>
              </label>
            </div>
          </div>

          <div className="bg-[#f8fcff] p-5 rounded-2xl border border-[#e0f1f7]">
            <label className="block text-xs font-black text-[#0a6787] uppercase tracking-wider mb-3">Filtrar por Situação Específica</label>
            <select 
              value={situacao} 
              onChange={(e) => setSituacao(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-[#a3d8e8] rounded-xl text-sm font-bold text-[#0a6787] outline-none focus:ring-2 focus:ring-[#0a6787]/30"
            >
              <option value="todas">-- Exibir Todas as Situações --</option>
              {LISTA_SITUACOES.map((sit, idx) => (
                <option key={idx} value={sit}>{sit}</option>
              ))}
            </select>
          </div>

        </div>

        {/* LINHA 2: BARRA DE PESQUISA POR TEXTO */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          
          <div className="md:col-span-3">
            <label className="block text-xs font-black text-[#0a6787] uppercase tracking-wider mb-3">Buscar em:</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 text-sm font-medium text-[#0a6787] cursor-pointer">
                <input type="radio" name="tipoBusca" value="cliente" checked={tipoBusca === 'cliente'} onChange={(e) => setTipoBusca(e.target.value)} className="w-4 h-4 text-[#0a6787]" />
                <strong>Cliente</strong> (Nome, CPF, Tel)
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-[#0a6787] cursor-pointer">
                <input type="radio" name="tipoBusca" value="aparelho" checked={tipoBusca === 'aparelho'} onChange={(e) => setTipoBusca(e.target.value)} className="w-4 h-4 text-[#0a6787]" />
                <strong>Aparelho</strong> (Tipo, Marca, Mod)
              </label>
            </div>
          </div>

          <div className="md:col-span-9">
            <label className="block text-xs font-black text-[#0a6787] uppercase tracking-wider mb-3">Termo de Pesquisa (Opcional)</label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-5 py-4 bg-[#f0f9ff] border-2 border-[#e0f1f7] rounded-xl focus:outline-none focus:border-[#38bdf8] text-[#0a6787] font-bold transition-all placeholder:text-[#a3d8e8]"
                placeholder={tipoBusca === 'cliente' ? "Ex: João da Silva, 9999-9999..." : "Ex: TV Samsung, Smartphone, S23..."}
              />
              <button 
                onClick={handleBusca}
                disabled={isSearching}
                className="px-10 py-4 bg-[#0a6787] text-white font-black rounded-xl hover:bg-[#07536e] transition-all shadow-md flex items-center gap-2 disabled:opacity-70"
              >
                <span>{isSearching ? "⏳" : "🔍"}</span> 
                {isSearching ? "Pesquisando..." : "Localizar O.S."}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* TABELA DE RESULTADOS */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#e0f1f7] overflow-hidden">
        
        <div className="p-5 bg-gradient-to-r from-[#f0f9ff] to-white border-b border-[#e0f1f7] flex justify-between items-center">
          <h3 className="font-bold text-[#0a6787] flex items-center gap-2">
            <span className="w-2 h-6 bg-[#38bdf8] rounded-full"></span>
            Resultados Localizados ({resultados.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f0f9ff]/50 text-[11px] font-bold text-[#73a8bd] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Nº O.S.</th>
                <th className="px-6 py-4">Cliente / Contato</th>
                <th className="px-6 py-4">Aparelho</th>
                <th className="px-6 py-4">Status / Situação</th>
                <th className="px-6 py-4">Abertura</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f9ff]">
              
              {isSearching ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-[#73a8bd] font-bold text-lg animate-pulse">Buscando Ordens de Serviço...</td></tr>
              ) : !buscaRealizada ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-[#a3d8e8] font-medium">
                    <span className="text-4xl block mb-4 opacity-50">📋</span>
                    Selecione os filtros desejados e clique em <strong className="text-[#0a6787]">Localizar O.S.</strong> para listar.
                  </td>
                </tr>
              ) : resultados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
                    Nenhuma Ordem de Serviço encontrada com os filtros informados.
                  </td>
                </tr>
              ) : (
                resultados.map((os) => {
                  const isEncerrada = os.data_encerramento !== null;
                  return (
                    <tr key={os.id} className="hover:bg-[#f0f9ff] transition-colors group">
                      
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-black ${isEncerrada ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {String(os.id).padStart(5, '0')}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-[#0a6787] uppercase">{os.cliente?.nome_completo || 'Desconhecido'}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{os.cliente?.telefone || 'Sem telefone'}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-700">{os.aparelho_tipo}</div>
                        <div className="text-xs text-gray-500">{os.marca} {os.modelo ? `- ${os.modelo}` : ''}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-block border border-[#a3d8e8] bg-white text-[#0a6787] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          {os.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-gray-500 font-medium">
                        {new Date(os.data_entrada).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/dashboard/alterar-os?id=${os.id}`}
                          className="inline-flex items-center gap-1 px-5 py-2.5 bg-white border border-[#38bdf8] text-[#0a6787] font-bold rounded-xl hover:bg-[#38bdf8] hover:text-white transition-all text-xs shadow-sm"
                        >
                          Abrir O.S. <span>➡️</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}

            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}