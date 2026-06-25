"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { runSupabaseQuery, SessionExpiredError } from '@/lib/supabaseSession';

interface Cliente {
  id: number;
  nome_completo: string;
  telefone: string | null;
  documento: string | null;
  email: string | null;
  endereco: string | null;
}

interface OSResumo {
  id: number;
  cliente_id: number;
  aparelho_tipo: string;
  marca: string;
  modelo: string | null;
  status: string;
  data_entrada: string;
}

interface ClienteResultado extends Cliente {
  total_os: number;
  ultima_os: OSResumo | null;
}

type TipoBusca = 'nome' | 'telefone' | 'documento' | 'os';

const BUSCAS: Array<{ id: TipoBusca; label: string; placeholder: string }> = [
  { id: 'nome', label: 'Nome', placeholder: 'Ex: João da Silva' },
  { id: 'telefone', label: 'Telefone', placeholder: 'Ex: 81999999999' },
  { id: 'documento', label: 'CPF / CNPJ', placeholder: 'Ex: 000.000.000-00' },
  { id: 'os', label: 'O.S.', placeholder: 'Ex: 00015' },
];

function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, '');
}

function formatarData(data?: string | null) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

export default function LocalizarClientesPage() {
  const router = useRouter();
  const [tipoBusca, setTipoBusca] = useState<TipoBusca>('nome');
  const [termoBusca, setTermoBusca] = useState('');
  const [resultados, setResultados] = useState<ClienteResultado[]>([]);
  const [buscaRealizada, setBuscaRealizada] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const buscaAtual = BUSCAS.find((busca) => busca.id === tipoBusca) || BUSCAS[0];

  const carregarResumoOS = async (clientes: Cliente[]) => {
    if (clientes.length === 0) return [];

    const ids = clientes.map((cliente) => cliente.id);
    const osData = await runSupabaseQuery<OSResumo[]>(() =>
      supabase
        .from('ordens_servico')
        .select('id, cliente_id, aparelho_tipo, marca, modelo, status, data_entrada')
        .in('cliente_id', ids)
        .order('id', { ascending: false })
    );

    const resumoPorCliente = new Map<number, { total: number; ultima: OSResumo | null }>();

    (osData as OSResumo[] | null)?.forEach((os) => {
      const atual = resumoPorCliente.get(os.cliente_id) || { total: 0, ultima: null };
      resumoPorCliente.set(os.cliente_id, {
        total: atual.total + 1,
        ultima: atual.ultima || os,
      });
    });

    return clientes.map((cliente) => {
      const resumo = resumoPorCliente.get(cliente.id);
      return {
        ...cliente,
        total_os: resumo?.total || 0,
        ultima_os: resumo?.ultima || null,
      };
    });
  };

  const handleBusca = async () => {
    const termo = termoBusca.trim();
    setIsSearching(true);
    setBuscaRealizada(true);
    setResultados([]);

    try {
      let clientes: Cliente[] = [];

      if (tipoBusca === 'os') {
        const osNumero = Number(somenteDigitos(termo));
        if (!osNumero) {
          setIsSearching(false);
          return;
        }

        const osEncontradas = await runSupabaseQuery<Array<{ cliente_id: number }>>(() =>
          supabase
            .from('ordens_servico')
            .select('cliente_id')
            .eq('id', osNumero)
        );

        const clienteIds = Array.from(new Set((osEncontradas || []).map((os) => os.cliente_id)));
        if (clienteIds.length === 0) {
          setIsSearching(false);
          return;
        }

        const data = await runSupabaseQuery<Cliente[]>(() =>
          supabase
            .from('clientes')
            .select('id, nome_completo, telefone, documento, email, endereco')
            .in('id', clienteIds)
            .order('nome_completo', { ascending: true })
        );
        clientes = data || [];
      } else {
        let coluna = 'nome_completo';
        if (tipoBusca === 'telefone') coluna = 'telefone';
        if (tipoBusca === 'documento') coluna = 'documento';

        let query = supabase
          .from('clientes')
          .select('id, nome_completo, telefone, documento, email, endereco')
          .order('nome_completo', { ascending: true })
          .limit(80);

        if (termo) {
          query = query.ilike(coluna, `%${termo}%`);
        }

        const data = await runSupabaseQuery<Cliente[]>(() => query);
        clientes = data || [];
      }

      const clientesComResumo = await carregarResumoOS(clientes);
      setResultados(clientesComResumo);
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        alert('Sua sessão expirou. Faça login novamente para continuar.');
        router.push('/');
        return;
      }
      console.error('Erro ao localizar clientes:', error);
      alert('Ocorreu um erro ao localizar clientes.');
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
      <div className="bg-[#f4c400] p-8 rounded-3xl shadow-lg border border-[#d8a900]">
        <h2 className="text-3xl font-black text-[#0a0a0a]">Localizar Clientes</h2>
        <p className="text-[#0a0a0a]/70 font-bold mt-1">Encontre clientes por nome, telefone, CPF/CNPJ ou número da O.S.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7] grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
        <div className="lg:col-span-4">
          <label className="block text-xs font-black text-[#0a0a0a] uppercase mb-2">Filtro</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BUSCAS.map((busca) => (
              <button
                key={busca.id}
                type="button"
                onClick={() => setTipoBusca(busca.id)}
                className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${
                  tipoBusca === busca.id
                    ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]'
                    : 'bg-[#fff8d8] text-[#0a0a0a] border-[#efe3a7] hover:border-[#d8a900]'
                }`}
              >
                {busca.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6">
          <label className="block text-xs font-black text-[#0a0a0a] uppercase mb-2">Termo de busca</label>
          <input
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={buscaAtual.placeholder}
            className="w-full px-4 py-3 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl text-[#0a0a0a] font-bold outline-none focus:border-[#38bdf8]"
          />
        </div>

        <div className="lg:col-span-2 flex gap-2">
          <button
            onClick={handleBusca}
            disabled={isSearching}
            className="flex-1 px-5 py-3 bg-[#0a0a0a] text-white font-black rounded-xl hover:bg-[#242424] disabled:opacity-50"
          >
            {isSearching ? 'Buscando...' : 'Localizar'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-[#e0f1f7] overflow-hidden">
        <div className="p-5 bg-[#fff8d8] border-b border-[#e0f1f7] flex items-center justify-between">
          <h3 className="font-black text-[#0a0a0a]">Clientes encontrados ({resultados.length})</h3>
          <Link href="/dashboard/novo-cliente" className="px-5 py-2.5 bg-white border border-[#d8a900] text-[#0a0a0a] font-black rounded-xl hover:bg-[#f4c400]">
            Novo cliente
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-[11px] font-black text-[#6d6251] uppercase tracking-wider border-b border-[#e0f1f7]">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Última O.S.</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f9ff]">
              {isSearching ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-[#d8a900] font-black animate-pulse">Buscando clientes...</td></tr>
              ) : !buscaRealizada ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">Escolha um filtro e clique em Localizar.</td></tr>
              ) : resultados.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">Nenhum cliente encontrado.</td></tr>
              ) : (
                resultados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-[#fff8d8] transition-colors">
                    <td className="px-6 py-4 min-w-[260px]">
                      <div className="font-black text-[#0a0a0a] uppercase">{cliente.nome_completo}</div>
                      <div className="text-xs text-gray-500 mt-1">Cód. {cliente.id} • {cliente.total_os} O.S.</div>
                      <div className="text-xs text-gray-400 mt-1 truncate max-w-[320px]">{cliente.endereco || 'Endereço não informado'}</div>
                    </td>
                    <td className="px-6 py-4 min-w-[190px]">
                      <div className="font-bold text-gray-700">{cliente.telefone || '-'}</div>
                      <div className="text-xs text-gray-500">{cliente.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{cliente.documento || '-'}</td>
                    <td className="px-6 py-4 min-w-[230px]">
                      {cliente.ultima_os ? (
                        <>
                          <div className="font-black text-[#0a0a0a]">O.S. {String(cliente.ultima_os.id).padStart(5, '0')}</div>
                          <div className="text-xs text-gray-500 mt-1">{cliente.ultima_os.aparelho_tipo} {cliente.ultima_os.marca} {cliente.ultima_os.modelo || ''}</div>
                          <div className="text-xs text-gray-400 mt-1">{formatarData(cliente.ultima_os.data_entrada)} • {cliente.ultima_os.status}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">Sem O.S. registrada</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/dados-os?clienteId=${cliente.id}`} className="px-4 py-2 bg-[#0a0a0a] text-white text-xs font-black rounded-lg hover:bg-[#242424]">
                          Nova O.S.
                        </Link>
                        {cliente.ultima_os && (
                          <Link href={`/dashboard/alterar-os?id=${cliente.ultima_os.id}`} className="px-4 py-2 bg-[#fff8d8] border border-[#d8a900] text-[#0a0a0a] text-xs font-black rounded-lg hover:bg-[#f4c400]">
                            Abrir O.S.
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
