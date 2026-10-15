"use client";

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type ClienteForm = {
  nome_completo: string;
  documento: string;
  telefone: string;
  email: string;
};

type EnderecoForm = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

const clienteInicial: ClienteForm = {
  nome_completo: '',
  documento: '',
  telefone: '',
  email: '',
};

const enderecoInicial: EnderecoForm = {
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
};

function separarEndereco(enderecoCompleto?: string | null): EnderecoForm {
  const endereco = enderecoCompleto?.trim() || '';
  if (!endereco) return enderecoInicial;

  const resultado: EnderecoForm = { ...enderecoInicial };
  const cep = endereco.match(/CEP:\s*([^\s]+)/i);
  resultado.cep = cep?.[1] || '';
  const semCep = endereco.replace(/\s*-?\s*CEP:\s*[^\s]+/i, '').trim();
  const cidadeUf = semCep.match(/^(.*),\s*([^,/]+)\/([A-Za-z]{2})$/);
  const parteEndereco = cidadeUf ? cidadeUf[1] : semCep;

  if (cidadeUf) {
    resultado.cidade = cidadeUf[2].trim();
    resultado.uf = cidadeUf[3].trim().toUpperCase();
  }

  const primeiraVirgula = parteEndereco.indexOf(',');
  if (primeiraVirgula === -1) {
    resultado.logradouro = parteEndereco;
    return resultado;
  }

  resultado.logradouro = parteEndereco.slice(0, primeiraVirgula).trim();
  const demaisPartes = parteEndereco.slice(primeiraVirgula + 1).trim().split(' - ').map((parte) => parte.trim()).filter(Boolean);
  resultado.numero = demaisPartes[0] || '';

  if (demaisPartes.length === 2) {
    resultado.bairro = demaisPartes[1];
  } else if (demaisPartes.length >= 3) {
    resultado.complemento = demaisPartes.slice(1, -1).join(' - ');
    resultado.bairro = demaisPartes[demaisPartes.length - 1];
  }

  return resultado;
}

function montarEndereco(endereco: EnderecoForm) {
  const numero = endereco.numero.trim() || 'S/N';
  const complemento = endereco.complemento.trim() ? ` - ${endereco.complemento.trim()}` : '';
  const linhaEndereco = [endereco.logradouro.trim(), `${numero}${complemento}`].filter(Boolean).join(', ');
  const cidadeUf = [endereco.cidade.trim(), endereco.uf.trim().toUpperCase()].filter(Boolean).join('/');
  const localizacao = [endereco.bairro.trim(), cidadeUf].filter(Boolean).join(', ');
  const partes = [linhaEndereco, localizacao].filter(Boolean);
  const enderecoMontado = partes.join(' - ');

  return endereco.cep.trim() ? `${enderecoMontado}${enderecoMontado ? ' - ' : ''}CEP: ${endereco.cep.trim()}` : enderecoMontado;
}

function EditarClienteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteId = Number(searchParams.get('id'));
  const [cliente, setCliente] = useState<ClienteForm>(clienteInicial);
  const [endereco, setEndereco] = useState<EnderecoForm>(enderecoInicial);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregarCliente() {
      if (!Number.isInteger(clienteId) || clienteId <= 0) {
        setErro('Cliente não informado. Localize o cliente e clique em Editar dados.');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('nome_completo, documento, telefone, email, endereco')
          .eq('id', clienteId)
          .single();

        if (error) throw error;

        setCliente({
          nome_completo: data.nome_completo || '',
          documento: data.documento || '',
          telefone: data.telefone || '',
          email: data.email || '',
        });
        setEndereco(separarEndereco(data.endereco));
      } catch (error) {
        console.error('Erro ao carregar cliente:', error);
        setErro('Não foi possível carregar os dados deste cliente.');
      } finally {
        setIsLoading(false);
      }
    }

    carregarCliente();
  }, [clienteId]);

  const atualizarCampo = (campo: keyof ClienteForm, valor: string) => {
    setCliente((atual) => ({ ...atual, [campo]: valor }));
  };

  const atualizarEndereco = (campo: keyof EnderecoForm, valor: string) => {
    setEndereco((atual) => ({ ...atual, [campo]: valor }));
  };

  const buscarCep = async (valor: string) => {
    atualizarEndereco('cep', valor);
    const cep = valor.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await resposta.json();
      if (dados.erro) return;

      setEndereco((atual) => ({
        ...atual,
        logradouro: dados.logradouro || atual.logradouro,
        bairro: dados.bairro || atual.bairro,
        cidade: dados.localidade || atual.cidade,
        uf: dados.uf || atual.uf,
      }));
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const salvarCliente = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nome = cliente.nome_completo.trim();

    if (!nome) {
      setErro('Informe o nome do cliente.');
      return;
    }

    setIsSaving(true);
    setErro('');

    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nome_completo: nome,
          documento: cliente.documento.trim() || null,
          telefone: cliente.telefone.trim() || null,
          email: cliente.email.trim() || null,
          endereco: montarEndereco(endereco) || null,
        })
        .eq('id', clienteId);

      if (error) throw error;

      alert('Dados do cliente atualizados com sucesso!');
      router.push('/dashboard/localizar-clientes');
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      setErro('Não foi possível salvar. Confira a conexão e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-20 text-center font-bold text-[#0a6787]">Carregando dados do cliente...</div>;
  }

  if (erro && !cliente.nome_completo) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <p className="font-bold text-red-600">{erro}</p>
        <Link href="/dashboard/localizar-clientes" className="mt-5 inline-block rounded-xl bg-[#0a6787] px-5 py-3 font-bold text-white">Voltar para clientes</Link>
      </div>
    );
  }

  const campo = 'w-full rounded-xl border border-[#e0f1f7] bg-[#f8fcff] px-4 py-3 font-medium text-[#0a6787] outline-none focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/20';

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex flex-col gap-4 rounded-3xl border border-[#d8a900] bg-[#f4c400] p-7 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-black text-[#0a0a0a]">Editar dados do cliente</h2>
          <p className="mt-1 font-medium text-[#0a0a0a]/70">Atualize os dados de cadastro sem alterar as O.S. já registradas.</p>
        </div>
        <Link href="/dashboard/localizar-clientes" className="rounded-xl bg-white px-5 py-3 text-center text-sm font-black text-[#0a0a0a] shadow-sm hover:bg-[#fff8d8]">Voltar</Link>
      </div>

      <form onSubmit={salvarCliente} className="space-y-6 rounded-3xl border border-[#e0f1f7] bg-white p-6 shadow-sm sm:p-8">
        <section>
          <h3 className="border-b border-[#e0f1f7] pb-2 text-lg font-black text-[#0a6787]">Dados principais</h3>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="md:col-span-2 block text-xs font-bold uppercase text-[#73a8bd]">Nome completo / Razão social *
              <input value={cliente.nome_completo} onChange={(event) => atualizarCampo('nome_completo', event.target.value)} required className={`mt-1 ${campo}`} />
            </label>
            <label className="block text-xs font-bold uppercase text-[#73a8bd]">CPF / CNPJ
              <input value={cliente.documento} onChange={(event) => atualizarCampo('documento', event.target.value)} className={`mt-1 ${campo}`} />
            </label>
            <label className="block text-xs font-bold uppercase text-[#73a8bd]">Celular / WhatsApp
              <input value={cliente.telefone} onChange={(event) => atualizarCampo('telefone', event.target.value)} className={`mt-1 ${campo}`} />
            </label>
            <label className="md:col-span-2 block text-xs font-bold uppercase text-[#73a8bd]">E-mail
              <input type="email" value={cliente.email} onChange={(event) => atualizarCampo('email', event.target.value)} className={`mt-1 ${campo}`} />
            </label>
          </div>
        </section>

        <section>
          <h3 className="border-b border-[#e0f1f7] pb-2 text-lg font-black text-[#0a6787]">Endereço</h3>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-12">
            <label className="md:col-span-3 block text-xs font-bold uppercase text-[#73a8bd]">CEP
              <input value={endereco.cep} onChange={(event) => buscarCep(event.target.value)} maxLength={9} placeholder="00000-000" className={`mt-1 ${campo}`} />
            </label>
            <label className="md:col-span-7 block text-xs font-bold uppercase text-[#73a8bd]">Endereço
              <input value={endereco.logradouro} onChange={(event) => atualizarEndereco('logradouro', event.target.value)} className={`mt-1 ${campo}`} />
            </label>
            <label className="md:col-span-2 block text-xs font-bold uppercase text-[#73a8bd]">Número
              <input value={endereco.numero} onChange={(event) => atualizarEndereco('numero', event.target.value)} className={`mt-1 ${campo}`} />
            </label>
            <label className="md:col-span-4 block text-xs font-bold uppercase text-[#73a8bd]">Complemento
              <input value={endereco.complemento} onChange={(event) => atualizarEndereco('complemento', event.target.value)} className={`mt-1 ${campo}`} />
            </label>
            <label className="md:col-span-3 block text-xs font-bold uppercase text-[#73a8bd]">Bairro
              <input value={endereco.bairro} onChange={(event) => atualizarEndereco('bairro', event.target.value)} className={`mt-1 ${campo}`} />
            </label>
            <label className="md:col-span-4 block text-xs font-bold uppercase text-[#73a8bd]">Cidade
              <input value={endereco.cidade} onChange={(event) => atualizarEndereco('cidade', event.target.value)} className={`mt-1 ${campo}`} />
            </label>
            <label className="md:col-span-1 block text-xs font-bold uppercase text-[#73a8bd]">UF
              <input value={endereco.uf} onChange={(event) => atualizarEndereco('uf', event.target.value.toUpperCase())} maxLength={2} className={`mt-1 text-center uppercase ${campo}`} />
            </label>
          </div>
        </section>

        {erro && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{erro}</p>}

        <div className="flex flex-col-reverse gap-3 border-t border-[#e0f1f7] pt-6 sm:flex-row sm:justify-end">
          <Link href="/dashboard/localizar-clientes" className="rounded-xl bg-gray-100 px-6 py-3 text-center font-bold text-gray-600 hover:bg-gray-200">Cancelar</Link>
          <button type="submit" disabled={isSaving} className="rounded-xl bg-[#0a6787] px-7 py-3 font-black text-white shadow-md hover:bg-[#07536e] disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar alterações'}</button>
        </div>
      </form>
    </div>
  );
}

export default function EditarClientePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-bold text-[#0a6787]">Carregando...</div>}>
      <EditarClienteForm />
    </Suspense>
  );
}
