import Link from 'next/link';

const ordemServicoPdfHref = '/ORDEM%20DE%20SERVI%C3%87O.pdf';

export default function OrdemServicoPage() {
  return (
    <section className="-m-10 flex min-h-screen flex-col bg-[#fffdf3] text-[#171717]">
      <header className="border-b border-[#f4c400]/60 bg-[#0a0a0a] px-6 py-5 shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-white">
            <Link
              href="/dashboard/central-tecnico"
              className="inline-flex h-10 w-10 items-center justify-center rounded bg-[#f4c400] text-xl font-black text-[#0a0a0a] transition-colors hover:bg-[#ffd84a]"
              aria-label="Voltar para a Central do Técnico"
            >
              ←
            </Link>
            <div className="flex items-center gap-3">
              <svg className="h-7 w-7 text-[#f4c400]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M14 3v5h5M10 12h5M10 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h1 className="text-2xl font-black tracking-tight">Ordem de Serviço</h1>
            </div>
          </div>

          <a
            href={ordemServicoPdfHref}
            download="ORDEM DE SERVIÇO.pdf"
            className="hidden items-center gap-2 rounded border border-[#f4c400]/60 px-4 py-2 text-sm font-black text-[#f4c400] transition-colors hover:bg-[#f4c400] hover:text-[#0a0a0a] sm:inline-flex"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Baixar PDF
          </a>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <section className="w-full max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-[#6d6251]">Central do Técnico</p>
          <h2 className="mt-4 text-3xl font-black uppercase tracking-wide text-[#0a0a0a]">
            Modelo de Ordem de Serviço
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-8 text-[#6d6251]">
            Baixe o modelo padrão de Ordem de Serviço em formato A4, pronto para impressão e uso na sua assistência técnica.
          </p>

          <div className="mt-10 flex justify-center">
            <a
              href={ordemServicoPdfHref}
              download="ORDEM DE SERVIÇO.pdf"
              className="inline-flex min-h-[82px] w-full max-w-[460px] items-center justify-center gap-4 rounded bg-[#f4c400] px-8 py-5 text-left text-lg font-black leading-7 text-[#0a0a0a] shadow-lg shadow-[#0a0a0a]/15 transition-all hover:-translate-y-0.5 hover:bg-[#ffd84a] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#f4c400]/35"
            >
              <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Ordem de Serviço - Layout A4 pronto para impressão</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="px-5 py-6 text-center text-xs font-bold text-[#6d6251]">
        © 2026 Central do Técnico. Todos os direitos reservados.
      </footer>
    </section>
  );
}
