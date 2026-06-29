import Link from 'next/link';
import { notFound } from 'next/navigation';
import { centralTecnicoTools, getCentralTecnicoTool } from '@/lib/centralTecnico';
import ErrosComunsPage from './ErrosComunsPage';
import GuiaAbreviacoesPage from './GuiaAbreviacoesPage';
import ManualDoReparoPage from './ManualDoReparoPage';
import TabelaPeliculasPage from './TabelaPeliculasPage';

export function generateStaticParams() {
  return centralTecnicoTools.map((tool) => ({
    ferramenta: tool.slug,
  }));
}

export default async function CentralTecnicoFerramentaPage({
  params,
}: {
  params: Promise<{ ferramenta: string }>;
}) {
  const { ferramenta } = await params;
  const tool = getCentralTecnicoTool(ferramenta);

  if (!tool) {
    notFound();
  }

  if (tool.slug === 'manual-do-reparo') {
    return <ManualDoReparoPage />;
  }

  if (tool.slug === 'erros-comuns-na-bancada') {
    return <ErrosComunsPage />;
  }

  if (tool.slug === 'guia-de-abreviacoes') {
    return <GuiaAbreviacoesPage />;
  }

  if (tool.slug === 'tabela-de-peliculas') {
    return <TabelaPeliculasPage />;
  }

  return (
    <section className="min-h-[calc(100vh-5rem)] pb-12">
      <Link
        href="/dashboard/central-tecnico"
        className="inline-flex items-center gap-2 text-sm font-black text-[#0a0a0a] transition-colors hover:text-[#d8a900]"
      >
        <span aria-hidden="true">←</span>
        Voltar para a Central
      </Link>

      <div className="mt-8 border border-[#efe3a7] bg-white p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6d6251]">Central do Técnico</p>
        <h1 className="mt-3 text-3xl font-black text-[#0a0a0a]">{tool.title}</h1>
        <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-[#4b5563]">
          {tool.description}
        </p>

        <div className="mt-8 border-l-4 border-[#f4c400] bg-[#fff8d8] px-5 py-4">
          <p className="text-sm font-bold text-[#0a0a0a]">
            Essa área já está reservada para montarmos a função completa.
          </p>
        </div>
      </div>
    </section>
  );
}
