"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  type ClienteCnpjData,
  limparCnpj,
  mensagemErroCnpj,
  validarCnpj,
} from '@/lib/cnpjUtils';

type ClienteForm = {
  nome_completo: string;
  nome_fantasia: string;
  documento: string;
  telefone: string;
  email: string;
  numero: string;
  complemento: string;
};

type EnderecoForm = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

type CnpjMessage = {
  type: 'success' | 'error';
  text: string;
} | null;

const clienteInicial: ClienteForm = {
  nome_completo: '',
  nome_fantasia: '',
  documento: '',
  telefone: '',
  email: '',
  numero: '',
  complemento: '',
};

const enderecoInicial: EnderecoForm = {
  cep: '',
  logradouro: '',
  bairro: '',
  cidade: '',
  uf: '',
};

function aplicarCampoAtual(currentValue: string, apiValue: string) {
  return apiValue || currentValue;
}

export default function NovoClientePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConsultandoCnpj, setIsConsultandoCnpj] = useState(false);
  const [cnpjMessage, setCnpjMessage] = useState<CnpjMessage>(null);
  const [clienteForm, setClienteForm] = useState<ClienteForm>(clienteInicial);
  const [endereco, setEndereco] = useState<EnderecoForm>(enderecoInicial);

  const atualizarClienteForm = (field: keyof ClienteForm, value: string) => {
    setClienteForm((prev) => ({ ...prev, [field]: value }));

    if (field === 'documento') {
      setCnpjMessage(null);
    }
  };

  const atualizarEndereco = (field: keyof EnderecoForm, value: string) => {
    setEndereco((prev) => ({ ...prev, [field]: value }));
  };

  const aplicarDadosCnpj = (data: ClienteCnpjData) => {
    setClienteForm((prev) => ({
      ...prev,
      nome_completo: aplicarCampoAtual(prev.nome_completo, data.razaoSocial),
      nome_fantasia: aplicarCampoAtual(prev.nome_fantasia, data.nomeFantasia),
      telefone: aplicarCampoAtual(prev.telefone, data.telefone),
      email: aplicarCampoAtual(prev.email, data.email),
      numero: aplicarCampoAtual(prev.numero, data.numero),
      complemento: aplicarCampoAtual(prev.complemento, data.complemento),
    }));

    setEndereco((prev) => ({
      ...prev,
      cep: aplicarCampoAtual(prev.cep, data.cep),
      logradouro: aplicarCampoAtual(prev.logradouro, data.logradouro),
      bairro: aplicarCampoAtual(prev.bairro, data.bairro),
      cidade: aplicarCampoAtual(prev.cidade, data.cidade),
      uf: aplicarCampoAtual(prev.uf, data.uf),
    }));
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorCep = e.target.value;
    atualizarEndereco('cep', valorCep);

    const cepLimpo = valorCep.replace(/\D/g, '');

    if (cepLimpo.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setEndereco((prev) => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            uf: data.uf || prev.uf,
          }));
        } else {
          alert('CEP n\u00e3o encontrado!');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const handleConsultarCnpj = async () => {
    if (isConsultandoCnpj) return;

    const cnpj = limparCnpj(clienteForm.documento);

    if (cnpj.length < 14) {
      setCnpjMessage({ type: 'error', text: mensagemErroCnpj('CNPJ_INCOMPLETO') });
      return;
    }

    if (cnpj.length !== 14 || !validarCnpj(cnpj)) {
      setCnpjMessage({ type: 'error', text: mensagemErroCnpj('CNPJ_INVALIDO') });
      return;
    }

    setIsConsultandoCnpj(true);
    setCnpjMessage(null);

    try {
      const response = await fetch(`/api/cnpj/${cnpj}`);
      const payload = (await response.json().catch(() => null)) as
        | { data?: ClienteCnpjData; error?: { message?: string } }
        | null;

      if (!response.ok || !payload?.data) {
        setCnpjMessage({
          type: 'error',
          text:
            payload?.error?.message ||
            'N\u00e3o foi poss\u00edvel consultar o CNPJ neste momento. Voc\u00ea ainda pode preencher os dados manualmente.',
        });
        return;
      }

      aplicarDadosCnpj(payload.data);
      setCnpjMessage({
        type: 'success',
        text: 'Dados do CNPJ preenchidos. Confira antes de salvar.',
      });
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      setCnpjMessage({
        type: 'error',
        text: 'N\u00e3o foi poss\u00edvel consultar o CNPJ neste momento. Voc\u00ea ainda pode preencher os dados manualmente.',
      });
    } finally {
      setIsConsultandoCnpj(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const numero = formData.get('numero') || 'S/N';
      const complemento = formData.get('complemento') ? ` - ${formData.get('complemento')}` : '';
      const enderecoCompleto = `${endereco.logradouro}, ${numero}${complemento} - ${endereco.bairro}, ${endereco.cidade}/${endereco.uf} - CEP: ${endereco.cep}`;

      const novoCliente = {
        nome_completo: formData.get('nome_completo'),
        documento: formData.get('documento'),
        telefone: formData.get('telefone'),
        email: formData.get('email'),
        endereco: enderecoCompleto,
      };

      const { data, error } = await supabase
        .from('clientes')
        .insert([novoCliente])
        .select()
        .single();

      if (error) {
        throw error;
      }

      alert('Cliente cadastrado com sucesso!');
      router.push(`/dashboard/dados-os?clienteId=${data.id}`);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar o cliente. Verifique o console para mais detalhes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cnpjDigitado = limparCnpj(clienteForm.documento);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0a6787]">Incluindo um Novo Cliente</h2>
          <p className="text-sm text-[#73a8bd] mt-1">Preencha os dados abaixo para cadastrar na base.</p>
        </div>
        <Link href="/dashboard/nova-os" className="px-5 py-2 text-sm font-semibold text-[#0a6787] bg-[#e0f7ff] rounded-xl hover:bg-[#a3d8e8] transition-all">
          Voltar para Busca
        </Link>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#e0f1f7]">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-[#0a6787] border-b border-[#e0f1f7] pb-2 mb-5">Dados Principais</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="col-span-1 md:col-span-8">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Raz&atilde;o Social / Nome *</label>
                <input
                  name="nome_completo"
                  type="text"
                  value={clienteForm.nome_completo}
                  onChange={(event) => atualizarClienteForm('nome_completo', event.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] font-medium"
                  required
                />
              </div>

              <div className="col-span-1 md:col-span-4">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Pessoa</label>
                <select name="tipo_pessoa" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] font-medium appearance-none">
                  <option>F&iacute;sica</option>
                  <option>Jur&iacute;dica</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-6">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Nome Fantasia (Opcional)</label>
                <input
                  name="nome_fantasia"
                  type="text"
                  value={clienteForm.nome_fantasia}
                  onChange={(event) => atualizarClienteForm('nome_fantasia', event.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] font-medium"
                />
              </div>

              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">CNPJ / CPF</label>
                <div className="flex gap-2">
                  <input
                    name="documento"
                    type="text"
                    value={clienteForm.documento}
                    onChange={(event) => atualizarClienteForm('documento', event.target.value)}
                    className="min-w-0 flex-1 px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleConsultarCnpj}
                    disabled={isConsultandoCnpj}
                    title="Consultar CNPJ"
                    aria-label="Consultar CNPJ"
                    aria-busy={isConsultandoCnpj}
                    className="h-[46px] w-[46px] shrink-0 rounded-xl bg-[#f4c400] text-[#0a0a0a] border border-[#d8a900] shadow-sm hover:bg-[#ffd84d] focus:outline-none focus:ring-2 focus:ring-[#0a6787]/30 disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center transition-all"
                  >
                    {isConsultandoCnpj ? (
                      <span className="h-5 w-5 rounded-full border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a] animate-spin" aria-hidden="true" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-[#73a8bd]">
                  {cnpjDigitado.length === 14 ? 'CNPJ detectado. Use a lupa para consultar.' : 'CPF continua com preenchimento manual.'}
                </p>
                {cnpjMessage && (
                  <p
                    className={`mt-2 text-xs font-bold ${cnpjMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}
                    aria-live="polite"
                  >
                    {cnpjMessage.text}
                  </p>
                )}
              </div>

              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Ins. Est. / RG</label>
                <input name="rg_ie" type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] font-medium" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-[#0a6787] border-b border-[#e0f1f7] pb-2 mb-5">Endere&ccedil;o</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">CEP</label>
                <input
                  name="cep"
                  type="text"
                  maxLength={9}
                  value={endereco.cep}
                  onChange={handleCepChange}
                  placeholder="00000-000"
                  className="w-full px-4 py-2.5 bg-[#f0f9ff] border border-[#38bdf8]/50 rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] font-bold"
                />
              </div>

              <div className="col-span-1 md:col-span-7">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Endere&ccedil;o</label>
                <input
                  name="logradouro"
                  type="text"
                  value={endereco.logradouro}
                  onChange={(event) => atualizarEndereco('logradouro', event.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787]"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">N&uacute;mero</label>
                <input
                  name="numero"
                  type="text"
                  value={clienteForm.numero}
                  onChange={(event) => atualizarClienteForm('numero', event.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787]"
                />
              </div>

              <div className="col-span-1 md:col-span-4">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Complemento</label>
                <input
                  name="complemento"
                  type="text"
                  value={clienteForm.complemento}
                  onChange={(event) => atualizarClienteForm('complemento', event.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787]"
                />
              </div>

              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Bairro</label>
                <input
                  name="bairro"
                  type="text"
                  value={endereco.bairro}
                  onChange={(event) => atualizarEndereco('bairro', event.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787]"
                />
              </div>

              <div className="col-span-1 md:col-span-4">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Cidade</label>
                <input
                  name="cidade"
                  type="text"
                  value={endereco.cidade}
                  onChange={(event) => atualizarEndereco('cidade', event.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787]"
                />
              </div>

              <div className="col-span-1 md:col-span-1">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">UF</label>
                <input
                  name="uf"
                  type="text"
                  value={endereco.uf}
                  onChange={(event) => atualizarEndereco('uf', event.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] text-center uppercase"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-[#0a6787] border-b border-[#e0f1f7] pb-2 mb-5">Comunica&ccedil;&atilde;o e Contatos</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Celular / WhatsApp</label>
                <input
                  name="telefone"
                  type="text"
                  value={clienteForm.telefone}
                  onChange={(event) => atualizarClienteForm('telefone', event.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787]"
                />
              </div>
              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Telefone Fixo</label>
                <input name="telefone_fixo" type="text" className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787]" />
              </div>
              <div className="col-span-1 md:col-span-6">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">E-mail Principal</label>
                <input
                  name="email"
                  type="email"
                  value={clienteForm.email}
                  onChange={(event) => atualizarClienteForm('email', event.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787]"
                />
              </div>
              <div className="col-span-1 md:col-span-12">
                <label className="block text-xs font-bold text-[#73a8bd] uppercase mb-1">Observa&ccedil;&otilde;es</label>
                <textarea name="observacoes" rows={3} className="w-full px-4 py-2.5 bg-[#f8fcff] border border-[#e0f1f7] rounded-xl focus:ring-2 focus:ring-[#0a6787]/30 text-[#0a6787] resize-none"></textarea>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#e0f1f7] flex flex-col sm:flex-row items-center justify-end gap-4">
            <div className="flex w-full sm:w-auto gap-3">
              <Link href="/dashboard/nova-os" className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200 transition-all text-center">
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-8 py-3 bg-[#0a6787] text-white font-bold rounded-xl hover:bg-[#07536e] transition-all shadow-md shadow-[#0a6787]/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Gravar e Ir para O.S.'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
