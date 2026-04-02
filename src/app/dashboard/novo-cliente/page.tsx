"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
// ATENÇÃO: Verifique se o caminho para o seu arquivo supabase.ts está correto!
import { supabase } from '@/lib/supabase'; 

export default function NovoClientePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para controlar os campos de endereço e reagir ao CEP
  const [endereco, setEndereco] = useState({
    cep: '',
    logradouro: '',
    bairro: '',
    cidade: '',
    uf: '',
  });

  // Função que busca o CEP automaticamente
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorCep = e.target.value;
    setEndereco((prev) => ({ ...prev, cep: valorCep }));

    const cepLimpo = valorCep.replace(/\D/g, '');

    if (cepLimpo.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setEndereco((prev) => ({
            ...prev,
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf,
          }));
        } else {
          alert("CEP não encontrado!");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  // Função para salvar no Supabase
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Evita que a página recarregue
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      // Juntando os dados do endereço em uma única string, já que no banco temos apenas um campo "endereco"
      const numero = formData.get('numero') || 'S/N';
      const complemento = formData.get('complemento') ? ` - ${formData.get('complemento')}` : '';
      const enderecoCompleto = `${endereco.logradouro}, ${numero}${complemento} - ${endereco.bairro}, ${endereco.cidade}/${endereco.uf} - CEP: ${endereco.cep}`;

      // Montando o objeto que vai para o banco de dados
      const novoCliente = {
        nome_completo: formData.get('nome_completo'),
        documento: formData.get('documento'), // CNPJ/CPF
        telefone: formData.get('telefone'), // Celular/WhatsApp
        email: formData.get('email'),
        endereco: enderecoCompleto,
      };

      // Inserindo no Supabase
      const { data, error } = await supabase
        .from('clientes')
        .insert([novoCliente])
        .select() // Pede para o Supabase devolver os dados salvos (incluindo o ID gerado)
        .single();

      if (error) {
        throw error;
      }

      alert("Cliente cadastrado com sucesso!");
      
      // Redireciona para a tela da O.S. passando o ID do cliente recém criado na URL
      router.push(`/dashboard/dados-os?clienteId=${data.id}`);

    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      alert("Erro ao salvar o cliente. Verifique o console para mais detalhes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0a6787]">Incluindo um Novo Cliente</h2>
          <p className="text-sm text-[#73a8bd] mt-1">Preencha os dados abaixo para cadastrar na base.</p>
        </div>
        <Link href="/dashboard/nova-os" className="px-5 py-2 text-sm font-semibold text-[#0a6787] bg-[#e0f7ff] rounded-xl hover:bg-[#a3d8e8] transition-all">
          ← Voltar para Busca
        </Link>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#e0f1f7]">
        {/* Passamos o handleSubmit para o onSubmit do form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Seção 1: Dados Principais */}
          <div>
            <h3 className="text-lg font-bold text-[#0a6787] border-b border-[#e0f1f7] pb-2 mb-5">Dados Principais</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              <div className="col-span-1 md:col-span-8">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Razão Social / Nome *</label>
                <input name="nome_completo" type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] font-medium" required />
              </div>

              <div className="col-span-1 md:col-span-4">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Pessoa</label>
                <select name="tipo_pessoa" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] font-medium appearance-none">
                  <option>Física</option>
                  <option>Jurídica</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-6">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Nome Fantasia (Opcional)</label>
                <input name="nome_fantasia" type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] font-medium" />
              </div>

              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">CNPJ / CPF</label>
                <input name="documento" type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] font-medium" />
              </div>

              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Ins. Est. / RG</label>
                <input name="rg_ie" type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] font-medium" />
              </div>
            </div>
          </div>

          {/* Seção 2: Endereço (Com Autocomplete) */}
          <div>
            <h3 className="text-lg font-bold text-[#0a6787] border-b border-[#e0f1f7] pb-2 mb-5">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">CEP</label>
                <input 
                  type="text" 
                  maxLength={9}
                  value={endereco.cep}
                  onChange={handleCepChange}
                  placeholder="00000-000"
                  className="w-full px-4 py-2.5 bg-[#f0f9ff] border border-[#38bdf8]/50 rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] font-bold" 
                />
              </div>

              <div className="col-span-1 md:col-span-7">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Endereço</label>
                <input type="text" value={endereco.logradouro} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-[#e0f1f7] rounded-xl text-gray-600" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Número</label>
                <input name="numero" type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787]" />
              </div>

              <div className="col-span-1 md:col-span-4">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Complemento</label>
                <input name="complemento" type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787]" />
              </div>

              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Bairro</label>
                <input type="text" value={endereco.bairro} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-[#e0f1f7] rounded-xl text-gray-600" />
              </div>

              <div className="col-span-1 md:col-span-4">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Cidade</label>
                <input type="text" value={endereco.cidade} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-[#e0f1f7] rounded-xl text-gray-600" />
              </div>

              <div className="col-span-1 md:col-span-1">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">UF</label>
                <input type="text" value={endereco.uf} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-[#e0f1f7] rounded-xl text-gray-600 text-center uppercase" />
              </div>
            </div>
          </div>

          {/* Seção 3: Contatos */}
          <div>
            <h3 className="text-lg font-bold text-[#0a6787] border-b border-[#e0f1f7] pb-2 mb-5">Comunicação e Contatos</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Celular / WhatsApp</label>
                <input name="telefone" type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787]" />
              </div>
              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Telefone Fixo</label>
                <input name="telefone_fixo" type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787]" />
              </div>
              <div className="col-span-1 md:col-span-6">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">E-mail Principal</label>
                <input name="email" type="email" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787]" />
              </div>
              <div className="col-span-1 md:col-span-12">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Observações</label>
                <textarea name="observacoes" rows={3} className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] resize-none"></textarea>
              </div>
            </div>
          </div>

          {/* Barra de Botões Fixa no Fundo */}
          <div className="pt-6 border-t border-[#e0f1f7] flex flex-col sm:flex-row items-center justify-end gap-4">
            <div className="flex w-full sm:w-auto gap-3">
              <Link href="/dashboard/nova-os" className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200 transition-all text-center">
                Cancelar
              </Link>
              
              {/* Transformado em um botão de Submit real */}
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-8 py-3 bg-[#0a6787] text-white font-bold rounded-xl hover:bg-[#07536e] transition-all shadow-md shadow-[#0a6787]/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isSubmitting ? "⏳" : "💾"}</span> 
                {isSubmitting ? 'Salvando...' : 'Gravar e Ir para O.S.'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}