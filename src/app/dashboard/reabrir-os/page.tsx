"use client";

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';

interface ClienteData {
  id: number;
  nome_completo: string;
}

interface OSData {
  id: number;
  cliente_id: number;
  aparelho_tipo: string;
  marca: string;
  modelo: string | null;
  status: string;
  data_encerramento: string | null;
  condicao_encerramento: string | null;
}

function ReabrirOsForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const osId = searchParams.get('id');

  const [osData, setOsData] = useState<OSData | null>(null);
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchDados() {
      if (!osId) return;
      setIsLoading(true);

      try {
        const { data: os, error: osError } = await supabase
          .from('ordens_servico')
          .select('id, cliente_id, aparelho_tipo, marca, modelo, status, data_encerramento, condicao_encerramento')
          .eq('id', osId)
          .single();

        if (osError) throw osError;

        if (os) {
          setOsData(os);
          const { data: cli } = await supabase.from('clientes').select('id, nome_completo').eq('id', os.cliente_id).single();
          if (cli) setCliente(cli);
        }
      } catch (err) {
        console.error("Erro:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDados();
  }, [osId]);

  const handleReabrir = async () => {
    if (!osData) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({
          status: 'Aguardando avaliação do técnico', // Volta para o status inicial
          data_encerramento: null,                   // Remove a data de fechamento
          condicao_encerramento: null,               // Remove a condição de fechamento
          forma_pagamento: null,                     // Reseta o pagamento
          desconto: 0,
          valor_final: null
        })
        .eq('id', osData.id);

      if (error) throw error;

      alert('O.S. Reaberta com sucesso! Ela já está disponível no painel novamente.');
      router.push('/dashboard');
      
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao reabrir a O.S.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="text-center p-20 text-indigo-600 font-bold">A carregar O.S...</div>;
  if (!osData) return <div className="text-center p-20 text-red-500 font-bold">O.S. não encontrada!</div>;

  // Se a O.S. NÃO estiver encerrada, avisa o usuário que não é necessário reabrir
  if (!osData.data_encerramento) {
    return (
      <div className="max-w-2xl mx-auto mt-10 bg-white p-10 rounded-3xl shadow-lg border-2 border-indigo-100 text-center space-y-6">
        <div className="w-24 h-24 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center text-5xl mx-auto">
          ⚠️
        </div>
        <div>
          <h2 className="text-3xl font-black text-indigo-600">O.S. Já está Aberta!</h2>
          <p className="text-gray-500 mt-2">A Ordem de Serviço Nº {String(osData.id).padStart(5, '0')} encontra-se ativa no sistema.</p>
          <p className="font-bold text-indigo-700 mt-1">Status atual: {osData.status}</p>
        </div>
        <div className="flex justify-center gap-4 pt-6 border-t border-gray-100">
          <Link href="/dashboard" className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">
            Voltar ao Início
          </Link>
          <Link href={`/dashboard/alterar-os?id=${osData.id}`} className="px-6 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 shadow-md">
            Editar esta O.S.
          </Link>
        </div>
      </div>
    );
  }

  // TELA DE CONFIRMAÇÃO DE REABERTURA
  return (
    <div className="max-w-3xl mx-auto mt-10 space-y-6 pb-12">
      <div className="bg-indigo-50 p-8 rounded-3xl shadow-sm border border-indigo-200 text-center relative overflow-hidden">
        <div className="absolute -right-4 -top-4 text-9xl opacity-10">🔄</div>
        <h2 className="text-3xl font-black text-indigo-700 uppercase mb-2">Reabrir O.S. {String(osData.id).padStart(5, '0')}</h2>
        <p className="text-indigo-600/80 font-bold">Tem certeza que deseja reabrir esta Ordem de Serviço?</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#e0f1f7]">
        <h3 className="text-sm font-black text-[#0a6787] uppercase mb-6 border-b border-[#e0f1f7] pb-2">Resumo da Ordem de Serviço</h3>
        
        <div className="space-y-4 text-sm">
          <div className="flex justify-between border-b border-gray-50 pb-2">
            <span className="text-gray-500 font-bold">Cliente:</span>
            <span className="text-[#0a6787] font-black uppercase">{cliente?.nome_completo}</span>
          </div>
          <div className="flex justify-between border-b border-gray-50 pb-2">
            <span className="text-gray-500 font-bold">Aparelho:</span>
            <span className="text-gray-800 font-medium">{osData.aparelho_tipo} {osData.marca} {osData.modelo}</span>
          </div>
          <div className="flex justify-between border-b border-gray-50 pb-2">
            <span className="text-gray-500 font-bold">Data de Encerramento:</span>
            <span className="text-red-500 font-bold">{new Date(osData.data_encerramento).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-bold">Condição Anterior:</span>
            <span className="text-gray-800 font-medium">{osData.condicao_encerramento}</span>
          </div>
        </div>

        <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 text-sm font-medium">
          <strong>Atenção:</strong> Ao reabrir, as informações de pagamento (desconto, valor final e forma de pagamento) serão resetadas, e o status voltará para &quot;Aguardando avaliação do técnico&quot;. Os serviços e peças adicionados anteriormente <strong>serão mantidos</strong>.
        </div>
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <Link href="/dashboard" className="px-8 py-4 bg-white text-gray-500 border border-gray-200 font-bold rounded-xl hover:bg-gray-50 transition-all">
          Cancelar
        </Link>
        <button 
          onClick={handleReabrir} 
          disabled={isSubmitting}
          className="px-10 py-4 bg-indigo-500 text-white font-black rounded-xl hover:bg-indigo-600 shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <span>{isSubmitting ? "⏳" : "🔄"}</span> 
          {isSubmitting ? 'Processando...' : 'Confirmar Reabertura'}
        </button>
      </div>
    </div>
  );
}

export default function ReabrirOsPage() {
  return (
    <Suspense fallback={<div className="text-center p-10 font-bold">A carregar interface...</div>}>
      <ReabrirOsForm />
    </Suspense>
  );
}