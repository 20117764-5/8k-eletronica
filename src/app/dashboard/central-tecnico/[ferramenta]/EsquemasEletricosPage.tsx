'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { runSupabaseQuery, SessionExpiredError } from '@/lib/supabaseSession';

type MarcaEsquema = 'Xiaomi' | 'Samsung' | 'Motorola' | 'LG' | 'Apple';

type EsquemaEletrico = {
  id: number;
  marca: MarcaEsquema | string;
  modelo: string;
  tipo: string;
  descricao: string | null;
  arquivo_nome: string;
  storage_path: string;
  arquivo_tamanho: number | null;
  criado_em: string;
};

type FormState = {
  marca: MarcaEsquema;
  modelo: string;
  tipo: string;
  descricao: string;
};

const BUCKET_NAME = 'esquemas-eletricos';

const marcas: MarcaEsquema[] = ['Xiaomi', 'Samsung', 'Motorola', 'LG', 'Apple'];

const tiposEsquema = [
  'Esquema elétrico',
  'Boardview',
  'Manual de serviço',
  'Diagrama de blocos',
  'Pinagem / conector',
  'Solução técnica',
  'Outro',
];

const formInicial: FormState = {
  marca: 'Motorola',
  modelo: '',
  tipo: 'Esquema elétrico',
  descricao: '',
};

function normalizarTexto(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function slugify(valor: string) {
  return normalizarTexto(valor)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function formatarTamanho(bytes?: number | null) {
  if (!bytes) return 'Tamanho não informado';
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function formatarData(data?: string | null) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

function ordenarEsquemas(esquemas: EsquemaEletrico[]) {
  return [...esquemas].sort((a, b) => {
    const marca = a.marca.localeCompare(b.marca);
    if (marca !== 0) return marca;
    return a.modelo.localeCompare(b.modelo);
  });
}

function normalizarMarca(marca: string): MarcaEsquema {
  return marcas.includes(marca as MarcaEsquema) ? (marca as MarcaEsquema) : 'Motorola';
}

export default function EsquemasEletricosPage() {
  const [esquemas, setEsquemas] = useState<EsquemaEletrico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningId, setIsOpeningId] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [marcaFiltro, setMarcaFiltro] = useState<MarcaEsquema | 'Todas'>('Todas');
  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [formData, setFormData] = useState<FormState>(formInicial);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [esquemaEditando, setEsquemaEditando] = useState<EsquemaEletrico | null>(null);
  const [erroConfig, setErroConfig] = useState('');

  useEffect(() => {
    carregarEsquemas();
  }, []);

  async function carregarEsquemas() {
    setIsLoading(true);
    setErroConfig('');

    try {
      const data = await runSupabaseQuery<EsquemaEletrico[]>(() =>
        supabase
          .from('esquemas_eletricos')
          .select('*')
          .order('marca', { ascending: true })
          .order('modelo', { ascending: true })
      );

      setEsquemas(ordenarEsquemas(data || []));
    } catch (error) {
      console.error('Erro ao carregar esquemas:', error);
      const mensagem = error instanceof Error ? error.message : String(error);
      if (error instanceof SessionExpiredError) {
        setErroConfig('Sua sessão expirou. Faça login novamente para acessar os esquemas.');
      } else if (
        mensagem.toLowerCase().includes('esquemas_eletricos') ||
        mensagem.toLowerCase().includes('schema cache') ||
        mensagem.toLowerCase().includes('does not exist')
      ) {
        setErroConfig('A tabela/bucket dos esquemas ainda não foi criada no Supabase. Veja o passo a passo que vou te passar.');
      } else {
        setErroConfig('Não foi possível carregar os esquemas. Confira a configuração do Supabase.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  const tiposCadastrados = useMemo(() => {
    const tipos = Array.from(new Set(esquemas.map((esquema) => esquema.tipo).filter(Boolean)));
    return ['Todos', ...tipos.sort()];
  }, [esquemas]);

  const esquemasFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca.trim());

    return esquemas.filter((esquema) => {
      const atendeMarca = marcaFiltro === 'Todas' || esquema.marca === marcaFiltro;
      const atendeTipo = tipoFiltro === 'Todos' || esquema.tipo === tipoFiltro;
      const texto = normalizarTexto([
        esquema.marca,
        esquema.modelo,
        esquema.tipo,
        esquema.descricao || '',
        esquema.arquivo_nome,
      ].join(' '));

      return atendeMarca && atendeTipo && (!termo || texto.includes(termo));
    });
  }, [busca, esquemas, marcaFiltro, tipoFiltro]);

  const totalPorMarca = useMemo(() => {
    return marcas.reduce<Record<string, number>>((acc, marca) => {
      acc[marca] = esquemas.filter((esquema) => esquema.marca === marca).length;
      return acc;
    }, {});
  }, [esquemas]);

  function atualizarForm(campo: keyof FormState, valor: string) {
    setFormData((atual) => ({ ...atual, [campo]: valor }));
  }

  function abrirModalNovo() {
    setEsquemaEditando(null);
    setFormData(formInicial);
    setArquivos([]);
    setIsModalOpen(true);
  }

  function abrirModalEdicao(esquema: EsquemaEletrico) {
    setEsquemaEditando(esquema);
    setFormData({
      marca: normalizarMarca(esquema.marca),
      modelo: esquema.modelo,
      tipo: esquema.tipo,
      descricao: esquema.descricao || '',
    });
    setArquivos([]);
    setIsModalOpen(true);
  }

  function fecharModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEsquemaEditando(null);
    setFormData(formInicial);
    setArquivos([]);
  }

  async function abrirEsquema(esquema: EsquemaEletrico) {
    setIsOpeningId(esquema.id);

    try {
      const { data, error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(esquema.storage_path, 60 * 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Erro ao abrir esquema:', error);
      alert('Não foi possível abrir o PDF. Confira se o bucket foi criado e se o arquivo existe.');
    } finally {
      setIsOpeningId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const modelo = formData.modelo.trim();
    const tipo = formData.tipo.trim();

    if (esquemaEditando) {
      if (!modelo || !tipo) {
        alert('Preencha marca, modelo e tipo.');
        return;
      }

      setIsSubmitting(true);

      try {
        await runSupabaseQuery<EsquemaEletrico[]>(() =>
          supabase
            .from('esquemas_eletricos')
            .update({
              marca: formData.marca,
              modelo,
              tipo,
              descricao: formData.descricao.trim() || null,
            })
            .eq('id', esquemaEditando.id)
            .select()
        );

        setFormData(formInicial);
        setArquivos([]);
        setEsquemaEditando(null);
        setIsModalOpen(false);
        await carregarEsquemas();
        alert('Esquema atualizado com sucesso.');
      } catch (error) {
        console.error('Erro ao atualizar esquema:', error);
        alert('Não foi possível atualizar o esquema. Confira a policy de UPDATE da tabela no Supabase.');
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (!modelo || !tipo || arquivos.length === 0) {
      alert('Preencha marca, modelo, tipo e anexe pelo menos um PDF.');
      return;
    }

    const arquivoInvalido = arquivos.find((arquivoAtual) =>
      arquivoAtual.type !== 'application/pdf' && !arquivoAtual.name.toLowerCase().endsWith('.pdf')
    );

    if (arquivoInvalido) {
      alert(`Anexe apenas arquivos PDF. Arquivo inválido: ${arquivoInvalido.name}`);
      return;
    }

    setIsSubmitting(true);
    const arquivosEnviados: string[] = [];

    try {
      const marcaSlug = slugify(formData.marca);
      const modeloSlug = slugify(modelo) || 'modelo';
      const registros: Array<{
        marca: MarcaEsquema;
        modelo: string;
        tipo: string;
        descricao: string | null;
        arquivo_nome: string;
        storage_path: string;
        arquivo_tamanho: number;
      }> = [];

      for (const [index, arquivoAtual] of arquivos.entries()) {
        const nomeArquivo = `${Date.now()}-${index + 1}-${slugify(arquivoAtual.name.replace(/\.pdf$/i, '')) || 'esquema'}.pdf`;
        const storagePath = `${marcaSlug}/${modeloSlug}/${nomeArquivo}`;

        const { error: uploadError } = await supabase
          .storage
          .from(BUCKET_NAME)
          .upload(storagePath, arquivoAtual, {
            contentType: 'application/pdf',
            upsert: false,
          });

        if (uploadError) throw uploadError;
        arquivosEnviados.push(storagePath);

        registros.push({
          marca: formData.marca,
          modelo,
          tipo,
          descricao: formData.descricao.trim() || null,
          arquivo_nome: arquivoAtual.name,
          storage_path: storagePath,
          arquivo_tamanho: arquivoAtual.size,
        });
      }

      await runSupabaseQuery<EsquemaEletrico[]>(() =>
        supabase
          .from('esquemas_eletricos')
          .insert(registros)
          .select()
      );

      setFormData(formInicial);
      setArquivos([]);
      setIsModalOpen(false);
      await carregarEsquemas();
      alert(arquivos.length === 1 ? 'Esquema cadastrado com sucesso.' : `${arquivos.length} esquemas cadastrados com sucesso.`);
    } catch (error) {
      console.error('Erro ao cadastrar esquema:', error);
      if (arquivosEnviados.length > 0) {
        await supabase.storage.from(BUCKET_NAME).remove(arquivosEnviados);
      }
      const mensagem = error instanceof Error ? error.message : String(error);
      if (mensagem.toLowerCase().includes('bucket')) {
        alert('Não foi possível enviar o PDF. Confira se o bucket esquemas-eletricos foi criado no Supabase.');
      } else {
        alert('Não foi possível cadastrar o esquema. Confira a tabela e as permissões no Supabase.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="topo-esquemas" className="-m-10 min-h-screen bg-[#fffdf3] pb-16 text-[#171717]">
      <header className="sticky top-0 z-20 border-b border-[#f4c400]/60 bg-[#0a0a0a] px-6 py-5 shadow-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-white">
            <Link
              href="/dashboard/central-tecnico"
              className="inline-flex h-10 w-10 items-center justify-center rounded bg-[#f4c400] text-xl font-black text-[#0a0a0a] transition-colors hover:bg-[#ffd84a]"
              aria-label="Voltar para a Central do Técnico"
            >
              ←
            </Link>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#f4c400]">Central do Técnico</p>
              <h1 className="text-2xl font-black tracking-tight">Esquemas Elétricos</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirModalNovo}
            className="inline-flex items-center justify-center gap-2 rounded bg-[#f4c400] px-5 py-3 text-sm font-black text-[#0a0a0a] shadow-sm transition-colors hover:bg-[#ffd84a]"
          >
            <span className="text-lg" aria-hidden="true">+</span>
            Acrescentar novo esquema
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <section>
          <h2 className="text-2xl font-black uppercase tracking-wide text-[#0a0a0a]">Biblioteca de Esquemas</h2>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#6d6251]">
            Organize seus PDFs por marca, modelo e tipo de material. Os arquivos enviados pelo site ficam no Supabase Storage,
            e esta tela guarda os dados para busca rápida na bancada.
          </p>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => setMarcaFiltro('Todas')}
            className={`border px-4 py-4 text-left shadow-sm transition-all ${marcaFiltro === 'Todas' ? 'border-[#f4c400] bg-[#f4c400]' : 'border-[#efe3a7] bg-white hover:border-[#f4c400]'}`}
          >
            <span className="block text-xs font-black uppercase text-[#6d6251]">Todas</span>
            <span className="mt-1 block text-2xl font-black text-[#0a0a0a]">{esquemas.length}</span>
          </button>
          {marcas.map((marca) => (
            <button
              key={marca}
              type="button"
              onClick={() => setMarcaFiltro(marca)}
              className={`border px-4 py-4 text-left shadow-sm transition-all ${marcaFiltro === marca ? 'border-[#f4c400] bg-[#f4c400]' : 'border-[#efe3a7] bg-white hover:border-[#f4c400]'}`}
            >
              <span className="block text-xs font-black uppercase text-[#6d6251]">{marca}</span>
              <span className="mt-1 block text-2xl font-black text-[#0a0a0a]">{totalPorMarca[marca] || 0}</span>
            </button>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 border border-[#efe3a7] bg-white p-5 shadow-sm lg:grid-cols-12">
          <label className="lg:col-span-7">
            <span className="mb-2 block text-xs font-black uppercase text-[#0a0a0a]">Buscar</span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              className="h-12 w-full border border-[#efe3a7] px-4 text-sm font-semibold outline-none transition-colors focus:border-[#f4c400] focus:ring-2 focus:ring-[#f4c400]/25"
              placeholder="Buscar por modelo, marca, tipo ou nome do arquivo..."
            />
          </label>
          <label className="lg:col-span-3">
            <span className="mb-2 block text-xs font-black uppercase text-[#0a0a0a]">Tipo</span>
            <select
              value={tipoFiltro}
              onChange={(event) => setTipoFiltro(event.target.value)}
              className="h-12 w-full border border-[#efe3a7] bg-white px-4 text-sm font-semibold outline-none transition-colors focus:border-[#f4c400] focus:ring-2 focus:ring-[#f4c400]/25"
            >
              {tiposCadastrados.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end lg:col-span-2">
            <button
              type="button"
              onClick={() => {
                setBusca('');
                setMarcaFiltro('Todas');
                setTipoFiltro('Todos');
              }}
              className="h-12 w-full border border-[#0a0a0a] px-4 text-sm font-black text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
            >
              Limpar
            </button>
          </div>
        </section>

        {erroConfig && (
          <div className="mt-6 border-l-4 border-[#f4c400] bg-white px-5 py-4 shadow-sm">
            <h3 className="text-sm font-black text-[#0a0a0a]">Configuração necessária</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-[#6d6251]">{erroConfig}</p>
          </div>
        )}

        <section className="mt-8">
          {isLoading ? (
            <div className="border border-[#efe3a7] bg-white p-8 text-center text-sm font-black text-[#6d6251] shadow-sm">
              Carregando esquemas...
            </div>
          ) : esquemasFiltrados.length === 0 ? (
            <div className="border border-[#efe3a7] bg-white p-8 text-center shadow-sm">
              <h3 className="text-xl font-black text-[#0a0a0a]">Nenhum esquema encontrado</h3>
              <p className="mt-2 text-sm font-medium text-[#6d6251]">
                Cadastre o primeiro PDF ou ajuste os filtros da busca.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {esquemasFiltrados.map((esquema) => (
                <article key={esquema.id} className="border border-[#efe3a7] border-t-4 border-t-[#f4c400] bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6d6251]">{esquema.marca}</p>
                      <h3 className="mt-2 text-xl font-black text-[#0a0a0a]">{esquema.modelo}</h3>
                    </div>
                    <span className="shrink-0 rounded bg-[#fff8d8] px-3 py-2 text-xs font-black text-[#0a0a0a]">
                      {esquema.tipo}
                    </span>
                  </div>

                  {esquema.descricao && (
                    <p className="mt-4 text-sm font-medium leading-6 text-[#6d6251]">{esquema.descricao}</p>
                  )}

                  <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-[#efe3a7] pt-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-black uppercase text-[#6d6251]">Arquivo</dt>
                      <dd className="mt-1 font-bold text-[#171717]">{esquema.arquivo_nome}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black uppercase text-[#6d6251]">Detalhes</dt>
                      <dd className="mt-1 font-bold text-[#171717]">{formatarTamanho(esquema.arquivo_tamanho)} • {formatarData(esquema.criado_em)}</dd>
                    </div>
                  </dl>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => abrirEsquema(esquema)}
                      disabled={isOpeningId === esquema.id}
                      className="inline-flex w-full items-center justify-center gap-2 rounded bg-[#f4c400] px-5 py-3 text-sm font-black text-[#0a0a0a] transition-colors hover:bg-[#ffd84a] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                        <path d="M14 3v5h5M10 13h5M10 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      {isOpeningId === esquema.id ? 'Abrindo...' : 'Abrir PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirModalEdicao(esquema)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded border border-[#0a0a0a] bg-white px-5 py-3 text-sm font-black text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
                    >
                      Editar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            <div className="border-b border-[#efe3a7] bg-[#0a0a0a] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f4c400]">
                    {esquemaEditando ? 'Editar cadastro' : 'Novos PDFs'}
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {esquemaEditando ? 'Editar esquema' : 'Acrescentar esquema'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={fecharModal}
                  className="flex h-10 w-10 items-center justify-center rounded bg-white/10 text-xl font-black transition-colors hover:bg-white/20"
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs font-black uppercase text-[#0a0a0a]">Marca</span>
                  <select
                    value={formData.marca}
                    onChange={(event) => atualizarForm('marca', event.target.value as MarcaEsquema)}
                    className="h-12 w-full border border-[#efe3a7] bg-white px-4 text-sm font-semibold outline-none focus:border-[#f4c400] focus:ring-2 focus:ring-[#f4c400]/25"
                    required
                  >
                    {marcas.map((marca) => (
                      <option key={marca} value={marca}>{marca}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-black uppercase text-[#0a0a0a]">Tipo</span>
                  <select
                    value={formData.tipo}
                    onChange={(event) => atualizarForm('tipo', event.target.value)}
                    className="h-12 w-full border border-[#efe3a7] bg-white px-4 text-sm font-semibold outline-none focus:border-[#f4c400] focus:ring-2 focus:ring-[#f4c400]/25"
                    required
                  >
                    {tiposEsquema.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                <span className="mb-2 block text-xs font-black uppercase text-[#0a0a0a]">Modelo</span>
                <input
                  value={formData.modelo}
                  onChange={(event) => atualizarForm('modelo', event.target.value)}
                  className="h-12 w-full border border-[#efe3a7] px-4 text-sm font-semibold outline-none focus:border-[#f4c400] focus:ring-2 focus:ring-[#f4c400]/25"
                  placeholder="Ex: Moto G9 Play, Redmi Note 12, iPhone 11"
                  required
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase text-[#0a0a0a]">Descrição</span>
                <textarea
                  value={formData.descricao}
                  onChange={(event) => atualizarForm('descricao', event.target.value)}
                  className="min-h-24 w-full border border-[#efe3a7] px-4 py-3 text-sm font-semibold outline-none focus:border-[#f4c400] focus:ring-2 focus:ring-[#f4c400]/25"
                  placeholder="Ex: esquema completo, setor de carga, placa principal..."
                />
              </label>

              {esquemaEditando ? (
                <div className="border border-[#efe3a7] bg-[#fff8d8] px-4 py-3">
                  <span className="mb-2 block text-xs font-black uppercase text-[#0a0a0a]">PDF atual</span>
                  <p className="text-sm font-black text-[#171717]">{esquemaEditando.arquivo_nome}</p>
                  <p className="mt-1 text-xs font-bold text-[#6d6251]">
                    {formatarTamanho(esquemaEditando.arquivo_tamanho)}
                  </p>
                </div>
              ) : (
                <label>
                  <span className="mb-2 block text-xs font-black uppercase text-[#0a0a0a]">PDFs</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  onChange={(event) => setArquivos(Array.from(event.target.files || []))}
                  className="block w-full border border-[#efe3a7] bg-white px-4 py-3 text-sm font-semibold file:mr-4 file:rounded file:border-0 file:bg-[#f4c400] file:px-4 file:py-2 file:text-sm file:font-black file:text-[#0a0a0a]"
                  required
                />
                {arquivos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-black uppercase text-[#6d6251]">
                      {arquivos.length === 1 ? '1 PDF selecionado' : `${arquivos.length} PDFs selecionados`}
                    </p>
                    <ul className="space-y-1 text-xs font-bold text-[#6d6251]">
                      {arquivos.map((arquivoAtual) => (
                        <li key={`${arquivoAtual.name}-${arquivoAtual.size}`}>
                          {arquivoAtual.name} • {formatarTamanho(arquivoAtual.size)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                </label>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-[#efe3a7] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="rounded border border-[#0a0a0a] px-5 py-3 text-sm font-black text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded bg-[#f4c400] px-5 py-3 text-sm font-black text-[#0a0a0a] transition-colors hover:bg-[#ffd84a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? (esquemaEditando ? 'Salvando...' : 'Enviando...')
                    : (esquemaEditando ? 'Salvar alterações' : 'Salvar esquema(s)')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
