import Link from 'next/link';
import { centralTecnicoTools, type CentralTecnicoSlug } from '@/lib/centralTecnico';

const iconClassName = 'h-10 w-10';

function ToolIcon({ slug }: { slug: CentralTecnicoSlug }) {
  if (slug === 'manual-do-reparo') {
    return (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 8.5 12 4l8 4.5-8 4.5L4 8.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M7 10.2v6.1c1.35 1.1 3.02 1.7 5 1.7s3.65-.6 5-1.7v-6.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (slug === 'erros-comuns-na-bancada') {
    return (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4 21 20H3L12 4Z" fill="currentColor" />
        <path d="M12 9v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 16h.01" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (slug === 'guia-de-abreviacoes') {
    return (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 8h4v4H7V8Zm10 0h4v4h-4V8Z" fill="currentColor" />
        <path d="M7 14c0 2.2-1 3.8-3 4.8M17 14c0 2.2-1 3.8-3 4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (slug === 'ordem-de-servico') {
    return (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 3v5h5M10 12h6M10 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (slug === 'tabela-de-peliculas') {
    return (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M10 7h4M10 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (slug === 'esquemas-eletricos') {
    return (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="8" y="8" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (slug === 'material-em-pdf') {
    return (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 3h7l4 4v14H7V3Z" fill="currentColor" />
        <path d="M14 3v5h5" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 10v6M9.5 13.5 12 16l2.5-2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.5a8.5 8.5 0 0 0-7.2 13l-.8 3 3.1-.8A8.5 8.5 0 1 0 12 3.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8.6 8.8c.2-.5.4-.6.8-.6h.6c.2 0 .5.1.6.5l.5 1.2c.1.3.1.5-.1.7l-.4.5c.7 1.2 1.7 2.1 3 2.8l.5-.5c.2-.2.4-.2.7-.1l1.3.6c.3.1.4.4.4.7v.6c0 .4-.2.7-.6.8-.7.3-1.6.2-2.8-.3-1.6-.7-3-1.8-4.1-3.3-1-1.3-1.4-2.6-.9-3.6Z" fill="currentColor" />
    </svg>
  );
}

export default function CentralTecnicoPage() {
  return (
    <section className="min-h-[calc(100vh-5rem)] pb-12">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6d6251]">Central do Técnico</p>
        <h1 className="mt-2 text-3xl font-black text-[#0a0a0a]">Bem-vindo</h1>
        <p className="mt-3 text-sm font-medium text-[#6d6251]">
          Selecione a ferramenta desejada para iniciar:
        </p>
      </header>

      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {centralTecnicoTools.map((tool) => {
          const isWhatsapp = tool.slug === 'suporte-whatsapp';

          return (
            <Link
              key={tool.slug}
              href={`/dashboard/central-tecnico/${tool.slug}`}
              className="group flex min-h-[150px] flex-col items-center justify-center border border-[#efe3a7] bg-white px-6 py-7 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#f4c400] hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#f4c400]/30"
            >
              <div className={`mb-5 flex h-12 w-12 items-center justify-center ${isWhatsapp ? 'text-emerald-500' : 'text-[#f4c400]'}`}>
                <ToolIcon slug={tool.slug} />
              </div>
              <h2 className={`text-base font-black ${isWhatsapp ? 'text-emerald-600' : 'text-[#0a0a0a]'} group-hover:text-[#d8a900]`}>
                {tool.title}
              </h2>
              <p className="mt-3 max-w-[210px] text-xs font-medium leading-5 text-[#4b5563]">
                {tool.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
