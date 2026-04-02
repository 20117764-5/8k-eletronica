"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Tenta fazer o login no Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        // Se der erro (senha errada, utilizador não existe, etc.)
        setErrorMessage('E-mail ou senha incorretos. Tente novamente.');
        return;
      }

      if (data.session) {
        // Sucesso! Redireciona para o painel
        router.push('/dashboard');
      }
      
    } catch (error) {
      console.error("Erro inesperado no login:", error);
      setErrorMessage('Ocorreu um erro no servidor. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f9ff] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Elementos de fundo decorativos */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#38bdf8] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#0a6787] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#e0f1f7] p-8 md:p-10 relative z-10">
        
        {/* Cabeçalho do Login */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#0a6787] rounded-2xl mx-auto flex items-center justify-center text-4xl font-black text-white shadow-lg mb-4 transform rotate-3 hover:rotate-0 transition-transform">
            💎
          </div>
          <h1 className="text-3xl font-black text-[#0a6787] tracking-tight">8K Eletrônica</h1>
          <p className="text-[#73a8bd] font-medium mt-2 text-sm uppercase tracking-widest">Sistema de Gestão</p>
        </div>

        {/* Mensagem de Erro (Só aparece se falhar o login) */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-sm font-bold text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-[#0a6787] uppercase tracking-wider mb-2">
              E-mail de Acesso
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@8keletronica.com.br" 
              className="w-full px-5 py-4 bg-[#f8fcff] border-2 border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold focus:outline-none focus:border-[#38bdf8] focus:ring-4 focus:ring-[#38bdf8]/10 transition-all placeholder:text-[#a3d8e8] placeholder:font-normal"
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-black text-[#0a6787] uppercase tracking-wider mb-2">
              Senha
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full px-5 py-4 bg-[#f8fcff] border-2 border-[#e0f1f7] rounded-xl text-[#0a6787] font-bold focus:outline-none focus:border-[#38bdf8] focus:ring-4 focus:ring-[#38bdf8]/10 transition-all placeholder:text-[#a3d8e8]"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !email || !password}
            className="w-full py-4 bg-[#0a6787] text-white font-black rounded-xl hover:bg-[#08526c] shadow-lg shadow-[#0a6787]/30 transition-all disabled:opacity-50 disabled:hover:bg-[#0a6787] flex justify-center items-center gap-2 mt-4"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Acessando...
              </>
            ) : (
              "Entrar no Sistema"
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center border-t border-[#e0f1f7] pt-6">
          <p className="text-xs text-[#73a8bd]">Área restrita a funcionários.</p>
        </div>

      </div>
    </div>
  );
}