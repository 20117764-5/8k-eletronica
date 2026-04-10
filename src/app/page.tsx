"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Funcionario {
  id: number;
  nome: string;
  email: string;
  cargo: string | null;
}

export default function LoginPage() {
  const router = useRouter();
  
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [emailSelecionado, setEmailSelecionado] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFetching, setIsFetching] = useState(true);

  // Busca os funcionários no banco de dados assim que a tela abre
  useEffect(() => {
    async function carregarFuncionarios() {
      try {
        const { data, error } = await supabase
          .from('funcionarios')
          .select('*')
          .order('nome', { ascending: true });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setFuncionarios(data);
          setEmailSelecionado(data[0].email); // Já deixa o primeiro selecionado
        }
      } catch (error) {
        console.error("Erro ao carregar lista de funcionários:", error);
        setErrorMessage("Erro ao conectar com o banco de dados.");
      } finally {
        setIsFetching(false);
      }
    }
    carregarFuncionarios();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSelecionado) return setErrorMessage('Selecione um usuário.');

    setIsLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailSelecionado,
        password: password,
      });

      if (error) {
        setErrorMessage('Senha incorreta. Tente novamente.');
        return;
      }

      if (data.session) {
        router.push('/dashboard');
      }
      
    } catch (error) {
      console.error("Erro inesperado no login:", error);
      setErrorMessage('Ocorreu um erro de conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f9ff] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Elementos de fundo decorativos */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#38bdf8] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#0a6787] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#e0f1f7] p-8 relative z-10">
        
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#0a6787] rounded-2xl mx-auto flex items-center justify-center text-3xl font-black text-white shadow-lg mb-4 transform rotate-3">
            💎
          </div>
          <h1 className="text-2xl font-black text-[#0a6787] tracking-tight">8K Eletrônica</h1>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <p className="text-xs font-bold text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Formulário Estilo SH Oficina mas Moderno */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          <div>
            <label className="block text-[10px] font-black text-[#73a8bd] uppercase tracking-wider mb-1">
              Usuário
            </label>
            {isFetching ? (
              <div className="w-full px-4 py-3 bg-[#f8fcff] border-2 border-[#e0f1f7] rounded-xl text-[#73a8bd] font-bold animate-pulse text-sm">
                Carregando...
              </div>
            ) : (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">👤</span>
                <select 
                  value={emailSelecionado}
                  onChange={(e) => setEmailSelecionado(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[#f8fcff] border-2 border-[#e0f1f7] rounded-xl text-[#0a6787] font-black focus:outline-none focus:border-[#38bdf8] focus:ring-4 focus:ring-[#38bdf8]/10 transition-all text-sm appearance-none cursor-pointer"
                >
                  {funcionarios.map(func => (
                    <option key={func.id} value={func.email}>
                      {func.nome} {func.cargo ? `(${func.cargo})` : ''}
                    </option>
                  ))}
                </select>
                {/* Seta customizada do dropdown */}
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#0a6787]">
                  ▼
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#73a8bd] uppercase tracking-wider mb-1">
              Senha
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔒</span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full pl-12 pr-4 py-3 bg-[#f8fcff] border-2 border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold focus:outline-none focus:border-[#38bdf8] focus:ring-4 focus:ring-[#38bdf8]/10 transition-all tracking-[0.3em] text-lg"
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !password || isFetching}
            className="w-full py-4 bg-[#0a6787] text-white font-black rounded-xl hover:bg-[#08526c] shadow-lg shadow-[#0a6787]/30 transition-all disabled:opacity-50 disabled:hover:bg-[#0a6787] flex justify-center items-center gap-2 mt-2"
          >
            {isLoading ? "Acessando..." : "Entrar no Sistema"}
          </button>
        </form>

      </div>
    </div>
  );
}