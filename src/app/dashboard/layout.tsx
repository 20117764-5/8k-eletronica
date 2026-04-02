"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  
  // Estados para os Modais
  const [isAlterarModalOpen, setIsAlterarModalOpen] = useState(false);
  const [isOrcamentoModalOpen, setIsOrcamentoModalOpen] = useState(false);
  const [isEncerrarModalOpen, setIsEncerrarModalOpen] = useState(false);
  const [isReabrirModalOpen, setIsReabrirModalOpen] = useState(false); // NOVO ESTADO
  
  const [osNumber, setOsNumber] = useState('');

  const handleBuscarOS = (e: React.FormEvent) => {
    e.preventDefault();
    if (osNumber.trim() !== '') {
      setIsAlterarModalOpen(false);
      router.push(`/dashboard/alterar-os?id=${osNumber}`);
      setOsNumber('');
    }
  };

  const handleBuscarOrcamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (osNumber.trim() !== '') {
      setIsOrcamentoModalOpen(false);
      router.push(`/dashboard/orcamento?id=${osNumber}`);
      setOsNumber('');
    }
  };

  const handleBuscarEncerrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (osNumber.trim() !== '') {
      setIsEncerrarModalOpen(false);
      router.push(`/dashboard/encerrar-os?id=${osNumber}`);
      setOsNumber('');
    }
  };

  // NOVO: Função para Buscar e Reabrir
  const handleBuscarReabrir = (e: React.FormEvent) => {
    e.preventDefault();
    if (osNumber.trim() !== '') {
      setIsReabrirModalOpen(false);
      // Vai redirecionar para a página que vamos criar no próximo passo
      router.push(`/dashboard/reabrir-os?id=${osNumber}`);
      setOsNumber('');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f0f9ff] relative">
      
      {/* MODAL: ALTERAR O.S. */}
      {isAlterarModalOpen && (
        <div className="fixed inset-0 bg-[#0a6787]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm transform transition-all">
            <h3 className="text-2xl font-black text-[#0a6787] mb-2 flex items-center gap-2">
              <span>📝</span> Alterar O.S.
            </h3>
            <p className="text-sm text-[#73a8bd] mb-6">Digite o número da Ordem de Serviço para editar.</p>
            <form onSubmit={handleBuscarOS}>
              <div className="mb-6">
                <input type="number" value={osNumber} onChange={(e) => setOsNumber(e.target.value)} placeholder="Ex: 15" className="w-full px-5 py-4 bg-[#f0f9ff] border-2 border-[#e0f1f7] rounded-xl focus:outline-none focus:border-[#38bdf8] text-[#0a6787] font-black text-xl" autoFocus required />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsAlterarModalOpen(false)} className="px-5 py-3 text-[#73a8bd] font-bold hover:bg-[#f0f9ff] rounded-xl">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-[#0a6787] text-white font-black rounded-xl hover:bg-[#08526c] shadow-md flex items-center gap-2"><span>🔍</span> Buscar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GERAR ORÇAMENTO */}
      {isOrcamentoModalOpen && (
        <div className="fixed inset-0 bg-[#0a6787]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm transform transition-all">
            <h3 className="text-2xl font-black text-amber-500 mb-2 flex items-center gap-2">
              <span>💲</span> Gerar Orçamento
            </h3>
            <p className="text-sm text-[#73a8bd] mb-6">Digite o número da Ordem de Serviço para orçar.</p>
            <form onSubmit={handleBuscarOrcamento}>
              <div className="mb-6">
                <input type="number" value={osNumber} onChange={(e) => setOsNumber(e.target.value)} placeholder="Ex: 15" className="w-full px-5 py-4 bg-[#fff8ec] border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 text-amber-600 font-black text-xl" autoFocus required />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsOrcamentoModalOpen(false)} className="px-5 py-3 text-[#73a8bd] font-bold hover:bg-[#f0f9ff] rounded-xl">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-amber-500 text-white font-black rounded-xl hover:bg-amber-600 shadow-md flex items-center gap-2"><span>💲</span> Avançar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENCERRAR O.S. */}
      {isEncerrarModalOpen && (
        <div className="fixed inset-0 bg-[#0a6787]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm transform transition-all">
            <h3 className="text-2xl font-black text-emerald-500 mb-2 flex items-center gap-2">
              <span>🔒</span> Encerrar O.S.
            </h3>
            <p className="text-sm text-[#73a8bd] mb-6">Digite o número da Ordem de Serviço para finalizar.</p>
            <form onSubmit={handleBuscarEncerrar}>
              <div className="mb-6">
                <input type="number" value={osNumber} onChange={(e) => setOsNumber(e.target.value)} placeholder="Ex: 15" className="w-full px-5 py-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-400 text-emerald-600 font-black text-xl" autoFocus required />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsEncerrarModalOpen(false)} className="px-5 py-3 text-[#73a8bd] font-bold hover:bg-[#f0f9ff] rounded-xl">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 shadow-md flex items-center gap-2"><span>🔒</span> Avançar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REABRIR O.S. (NOVO) */}
      {isReabrirModalOpen && (
        <div className="fixed inset-0 bg-[#0a6787]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm transform transition-all">
            <h3 className="text-2xl font-black text-indigo-500 mb-2 flex items-center gap-2">
              <span>🔄</span> Reabrir O.S.
            </h3>
            <p className="text-sm text-[#73a8bd] mb-6">Digite o número da Ordem de Serviço para reabrir.</p>
            <form onSubmit={handleBuscarReabrir}>
              <div className="mb-6">
                <input type="number" value={osNumber} onChange={(e) => setOsNumber(e.target.value)} placeholder="Ex: 15" className="w-full px-5 py-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-400 text-indigo-600 font-black text-xl" autoFocus required />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsReabrirModalOpen(false)} className="px-5 py-3 text-[#73a8bd] font-bold hover:bg-[#f0f9ff] rounded-xl">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-indigo-500 text-white font-black rounded-xl hover:bg-indigo-600 shadow-md flex items-center gap-2"><span>🔄</span> Avançar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-[#0a6787] text-white flex flex-col p-6 space-y-8 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-2xl font-black text-[#e0f7ff]">💎</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">8K Eletrônica</h1>
            <p className="text-[10px] uppercase tracking-[2px] text-[#a3d8e8] font-semibold">Assistência Técnica</p>
          </div>
        </div>

        {/* Navegação Principal */}
        <nav className="flex-1 flex flex-col space-y-1">
          <p className="px-3 text-[10px] font-bold text-[#a3d8e8]/50 uppercase tracking-widest mb-2">Painel Geral</p>
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-[#e0f7ff]">
            <span className="text-lg">📊</span><span className="text-sm font-medium">Dashboard</span>
          </Link>

          <p className="px-3 text-[10px] font-bold text-[#a3d8e8]/50 uppercase tracking-widest mt-6 mb-2">Gestão de O.S.</p>
          <Link href="/dashboard/nova-os" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-[#e0f7ff]">
            <span className="text-lg">✨</span><span className="text-sm">Nova O.S.</span>
          </Link>
          
          <button onClick={() => setIsAlterarModalOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-[#e0f7ff] text-left">
            <span className="text-lg">📝</span><span className="text-sm">Alterar O.S.</span>
          </button>

          <button onClick={() => setIsOrcamentoModalOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-amber-500/20 text-amber-300 transition-all text-left">
            <span className="text-lg">💲</span><span className="text-sm font-bold">Gerar Orçamento</span>
          </button>
          
          <button onClick={() => setIsEncerrarModalOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-emerald-500/20 text-emerald-300 transition-all text-left">
            <span className="text-lg">🔒</span><span className="text-sm font-bold">Encerrar O.S.</span>
          </button>

          {/* NOVO BOTÃO DE REABRIR O.S. */}
          <button onClick={() => setIsReabrirModalOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-500/20 text-indigo-300 transition-all text-left">
            <span className="text-lg">🔄</span><span className="text-sm font-bold">Reabrir O.S.</span>
          </button>
          
          <Link href="/dashboard/localizar-os" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-[#e0f7ff]">
            <span className="text-lg">🔍</span><span className="text-sm">Localizar O.S.</span>
          </Link>
          <Link href="/dashboard/historico" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-[#e0f7ff]">
            <span className="text-lg">📜</span><span className="text-sm">Histórico de O.S.</span>
          </Link>

          <p className="px-3 text-[10px] font-bold text-[#a3d8e8]/50 uppercase tracking-widest mt-6 mb-2">Administrativo</p>
          <Link href="/dashboard/financeiro" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-[#e0f7ff]">
            <span className="text-lg">💰</span><span className="text-sm">Financeiro</span>
          </Link>
          <Link href="/dashboard/estoque" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-[#e0f7ff]">
            <span className="text-lg">📦</span><span className="text-sm">Estoque</span>
          </Link>
        </nav>

        <div className="pt-4 border-t border-white/10">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-200 transition-all">
            <span className="text-lg">🚪</span><span className="text-sm font-medium">Sair do Sistema</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}