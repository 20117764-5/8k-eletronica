"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Cliente {
  id: number;
  nome_completo: string;
  telefone: string | null;
  documento: string | null;
  endereco: string | null;
}

interface OSData {
  id: number;
  aparelho_tipo: string;
  marca: string;
  modelo: string | null;
  serial_imei: string | null;
  data_encerramento: string | null;
  condicao_encerramento: string | null;
}

export default function NovaOSPage() {
  const router = useRouter();
  const [termoBusca, setTermoBusca] = useState('');
  const [tipoBusca, setTipoBusca] = useState('nome_completo');
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [buscaRealizada, setBuscaRealizada] = useState(false);

  // Estados para o Modal de Histórico de Aparelhos
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [historicoAparelhos, setHistoricoAparelhos] = useState<OSData[]>([]);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);
  const [filtroAparelho, setFiltroAparelho] = useState('');

  const handleBusca = async () => {
    if (termoBusca.trim() === '') {
      setResultados([]);
      setBuscaRealizada(false);
      return;
    }

    setIsSearching(true);
    setBuscaRealizada(true);

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .ilike(tipoBusca, `%${termoBusca}%`)
        .order('nome_completo', { ascending: true })
        .limit(50);

      if (error) throw error;
      setResultados(data || []);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      alert("Ocorreu um erro ao buscar os clientes.");
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

  // Função para checar o histórico do cliente ao clicar em "Selecionar"
  const handleSelecionarCliente = async (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setIsLoadingHistorico(true);
    setIsHistoricoOpen(true);

    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('id, aparelho_tipo, marca, modelo, serial_imei, data_encerramento, condicao_encerramento')
        .eq('cliente_id', cliente.id)
        .order('id', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Se não tem histórico, vai direto para nova O.S em branco
        router.push(`/dashboard/dados-os?clienteId=${cliente.id}`);
      } else {
        // Se tem histórico, mostra na tela
        setHistoricoAparelhos(data);
      }
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      router.push(`/dashboard/dados-os?clienteId=${cliente.id}`); // Em caso de erro, segue o fluxo normal
    } finally {
      setIsLoadingHistorico(false);
    }
  };

  // Função que calcula se o aparelho ainda está nos 90 dias de garantia
  const verificaGarantia = (dataEncerramento: string | null, condicao: string | null) => {
    if (!dataEncerramento || condicao !== 'Entregue e Reparado') return false;
    const dataEnc = new Date(dataEncerramento);
    const hoje = new Date();
    const diffTime = Math.abs(hoje.getTime() - dataEnc.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 90;
  };

  // Função para iniciar a O.S. clonando os dados do aparelho selecionado
  const handleClonarAparelho = (osAntiga: OSData) => {
    const temGarantia = verificaGarantia(osAntiga.data_encerramento, osAntiga.condicao_encerramento);
    // Mandamos os dados pela URL para a próxima página preencher automaticamente
    router.push(`/dashboard/dados-os?clienteId=${clienteSelecionado?.id}&clonarOsId=${osAntiga.id}&garantia=${temGarantia}`);
  };

  // Filtra os aparelhos no modal (por marca, modelo ou serial)
  const aparelhosFiltrados = historicoAparelhos.filter(os => {
    const termo = filtroAparelho.toLowerCase();
    return (
      (os.marca || '').toLowerCase().includes(termo) ||
      (os.modelo || '').toLowerCase().includes(termo) ||
      (os.serial_imei || '').toLowerCase().includes(termo) ||
      (os.aparelho_tipo || '').toLowerCase().includes(termo)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      
      {/* MODAL DE HISTÓRICO DE APARELHOS */}
      {isHistoricoOpen && clienteSelecionado && (
        <div className="fixed inset-0 bg-[#0a6787]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 bg-[#0a6787] text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">Histórico de Aparelhos</h3>
                <p className="text-sm text-[#a3d8e8]">Cliente: {clienteSelecionado.nome_completo}</p>
              </div>
              <button onClick={() => setIsHistoricoOpen(false)} className="text-white hover:text-red-300 font-bold text-xl">✕</button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto bg-[#f0f9ff]">
              {isLoadingHistorico ? (
                <div className="text-center py-10 text-[#0a6787] font-bold animate-pulse">Buscando histórico de aparelhos...</div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center">
                    <input 
                      type="text" 
                      placeholder="Filtrar por marca, modelo ou serial..." 
                      value={filtroAparelho}
                      onChange={(e) => setFiltroAparelho(e.target.value)}
                      className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-[#a3d8e8] outline-none focus:ring-2 focus:ring-[#0a6787]"
                    />
                    <button 
                      onClick={() => router.push(`/dashboard/dados-os?clienteId=${clienteSelecionado.id}`)}
                      className="w-full md:w-auto px-6 py-3 bg-white border-2 border-[#0a6787] text-[#0a6787] font-bold rounded-xl hover:bg-[#e0f7ff] shadow-sm whitespace-nowrap"
                    >
                      + Cadastrar Novo Aparelho
                    </button>
                  </div>

                  <div className="space-y-4">
                    {aparelhosFiltrados.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">Nenhum aparelho encontrado com esse filtro.</div>
                    ) : (
                      aparelhosFiltrados.map(os => {
                        const temGarantia = verificaGarantia(os.data_encerramento, os.condicao_encerramento);
                        return (
                          <div key={os.id} className="bg-white p-5 rounded-2xl border border-[#e0f1f7] shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:border-[#38bdf8] transition-all">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="font-black text-[#0a6787] text-lg uppercase">{os.aparelho_tipo} - {os.marca}</h4>
                                {temGarantia && (
                                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                                    🟢 Na Garantia (O.S. {String(os.id).padStart(5, '0')})
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                <strong>Modelo:</strong> {os.modelo || 'N/A'} | <strong>Serial:</strong> {os.serial_imei || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">Última O.S.: {String(os.id).padStart(5, '0')}</p>
                            </div>
                            <button 
                              onClick={() => handleClonarAparelho(os)}
                              className="px-6 py-3 bg-[#38bdf8] text-white font-bold rounded-xl hover:bg-[#0a6787] shadow-md transition-all whitespace-nowrap"
                            >
                              Abrir O.S. para este Aparelho
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TELA PRINCIPAL DE BUSCA */}
      <div>
        <h2 className="text-2xl font-bold text-[#0a6787]">Nova Ordem de Serviço</h2>
        <p className="text-sm text-[#73a8bd] mt-1">Passo 1: Localize o cliente cadastrado ou adicione um novo.</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-[#e0f1f7]">
        <div className="flex flex-col md:flex-row gap-8">
          
          <div className="flex-1">
            <label className="block text-sm font-bold text-[#0a6787] mb-3">
              Digite o Nome, CPF/CNPJ ou Telefone:
            </label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-5 py-3.5 bg-[#f0f9ff] border border-[#e0f1f7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] font-medium transition-all placeholder:text-[#a3d8e8]"
                placeholder="Ex: João da Silva..."
                autoFocus
              />
              <button 
                onClick={handleBusca}
                disabled={isSearching}
                className="px-8 py-3.5 bg-[#0a6787] text-white font-bold rounded-xl hover:bg-[#07536e] transition-all shadow-md shadow-[#0a6787]/20 flex items-center gap-2 disabled:opacity-70"
              >
                <span className="text-lg">{isSearching ? "⏳" : "🔍"}</span> 
                <span className="hidden sm:inline">{isSearching ? "Buscando..." : "Listar"}</span>
              </button>
            </div>
          </div>

          <div className="md:w-64 bg-[#f0f9ff] p-4 rounded-2xl border border-[#e0f1f7]">
            <label className="block text-xs font-bold text-[#73a8bd] uppercase tracking-wider mb-3">
              Forma de Busca
            </label>
            <div className="space-y-2.5">
              <label className="flex items-center gap-3 text-sm font-medium text-[#0a6787] cursor-pointer group">
                <input type="radio" name="formaBusca" value="nome_completo" checked={tipoBusca === 'nome_completo'} onChange={(e) => setTipoBusca(e.target.value)} className="w-4 h-4 text-[#0a6787] focus:ring-[#0a6787] border-gray-300" />
                Nome / Razão Social
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-[#0a6787] cursor-pointer group">
                <input type="radio" name="formaBusca" value="documento" checked={tipoBusca === 'documento'} onChange={(e) => setTipoBusca(e.target.value)} className="w-4 h-4 text-[#0a6787] focus:ring-[#0a6787] border-gray-300" />
                CPF / CNPJ
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-[#0a6787] cursor-pointer group">
                <input type="radio" name="formaBusca" value="telefone" checked={tipoBusca === 'telefone'} onChange={(e) => setTipoBusca(e.target.value)} className="w-4 h-4 text-[#0a6787] focus:ring-[#0a6787] border-gray-300" />
                Telefone
              </label>
            </div>
          </div>

        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-[#e0f1f7] overflow-hidden">
        
        <div className="p-5 bg-gradient-to-r from-[#f0f9ff] to-white border-b border-[#e0f1f7] flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-[#0a6787] flex items-center gap-2">
            <span className="w-2 h-6 bg-[#38bdf8] rounded-full"></span>
            Resultados Localizados
          </h3>
          <Link href="/dashboard/novo-cliente" className="px-5 py-2.5 bg-white border-2 border-[#e0f1f7] text-[#0a6787] font-bold rounded-xl hover:bg-[#e0f7ff] hover:border-[#a3d8e8] transition-all flex items-center gap-2 text-sm">
            <span className="text-green-500 text-lg leading-none">+</span> 
            Novo Cliente (F2)
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f0f9ff]/50 text-[11px] font-bold text-[#73a8bd] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 w-1/3">Nome</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">CPF / CNPJ</th>
                <th className="px-6 py-4 w-1/3 truncate">Endereço Principal</th> 
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f9ff]">
              
              {isSearching ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#73a8bd] font-medium">Buscando clientes...</td></tr>
              ) : !buscaRealizada ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#a3d8e8] font-medium">
                    <span className="text-2xl block mb-2">🔍</span>
                    Digite um dado acima e clique em Listar ou pressione Enter.
                  </td>
                </tr>
              ) : resultados.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">Nenhum cliente encontrado com estes dados.</td></tr>
              ) : (
                resultados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-[#f0f9ff] transition-colors group">
                    <td className="px-6 py-4 font-bold text-[#0a6787] uppercase">{cliente.nome_completo}</td>
                    <td className="px-6 py-4 text-gray-500">{cliente.telefone || '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{cliente.documento || '-'}</td>
                    <td className="px-6 py-4 text-gray-500 truncate max-w-[200px]">{cliente.endereco || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      {/* BOTAO MODIFICADO PARA ABRIR O HISTÓRICO */}
                      <button 
                        onClick={() => handleSelecionarCliente(cliente)}
                        className="inline-block px-5 py-2 bg-[#e0f7ff] text-[#0a6787] font-bold rounded-lg hover:bg-[#0a6787] hover:text-white transition-all text-xs shadow-sm"
                      >
                        Selecionar
                      </button>
                    </td>
                  </tr>
                ))
              )}

            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-gray-50 text-center border-t border-[#e0f1f7]">
          <p className="text-xs text-gray-400">Pressione <strong className="text-gray-600">Enter</strong> para buscar ou clique no botão Listar.</p>
        </div>
      </div>

    </div>
  );
}