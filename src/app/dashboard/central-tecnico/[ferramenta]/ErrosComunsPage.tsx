'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type ErrorBlock = {
  title: string;
  body?: string;
  items?: string[];
  warning?: string;
};

type BenchError = {
  title: string;
  quote?: string;
  description: string;
  blocks: ErrorBlock[];
  tags: string[];
};

const benchErrors: BenchError[] = [
  {
    title: 'Erro 1: Achar que calor resolve defeito',
    quote: '"Vou dar um calorzinho pra ver se volta."',
    description: 'Calor sem diagnóstico é intervenção arriscada.',
    blocks: [
      {
        title: 'O problema real',
        body: 'Calor não é diagnóstico, é intervenção. E toda intervenção sem diagnóstico é risco. Calor mal usado cria defeitos novos.',
      },
      {
        title: 'Quando o calor pode ser usado',
        items: ['Suspeita real de solda fria', 'Após medições e análise', 'Com tempo e temperatura controlados'],
      },
      {
        title: 'Quando NÃO usar',
        items: ['Como teste inicial', 'Por dica genérica de vídeo', '"Só pra ver se liga"'],
      },
    ],
    tags: ['calor', 'aquecimento', 'solda fria', 'temperatura'],
  },
  {
    title: 'Erro 2: Aquecer a placa sem saber medir',
    description: 'O técnico ainda não domina multímetro, leitura de consumo ou lógica de setores, mas aquece a placa inteira.',
    blocks: [
      {
        title: 'Consequência prática',
        items: ['O aparelho piora', 'Surge um novo defeito', 'Agora ele não sabe mais resolver'],
      },
      {
        title: 'Resultado',
        items: ['Prejuízo', 'Devolução problemática', 'Perda de confiança'],
        warning: 'Se você não sabe medir, não pode intervir.',
      },
    ],
    tags: ['medir', 'multimetro', 'consumo', 'prejuizo'],
  },
  {
    title: 'Erro 3: Ignorar o consumo na fonte',
    description: 'Consumo é o mapa do defeito. Sem ele, você trabalha no escuro.',
    blocks: [
      {
        title: 'Por que isso é grave',
        body: 'O consumo mostra se a placa tenta ligar, se existe curto e se algum setor trava a inicialização. Sem consumo você troca peça sem sentido e perde horas sem direção.',
      },
      {
        title: 'Erro vs Correto',
        items: [
          'Erro comum: "Aparelho carrega, então o setor de carga está ok." Carga não é inicialização.',
          'Correto: sempre medir consumo, mesmo que o aparelho carregue ou não ligue.',
        ],
      },
    ],
    tags: ['fonte', 'consumo', 'curto', 'carga'],
  },
  {
    title: 'Erro 4: Não fazer análise visual completa',
    description: 'Muitas vezes, o defeito está visível.',
    blocks: [
      {
        title: 'O que muitos fazem',
        body: 'Olham rápido, não viram a placa e não analisam conectores. Com isso, defeitos óbvios passam despercebidos.',
        items: ['Componente faltando', 'Oxidação', 'Trilha rompida', 'Pino torto'],
      },
      {
        title: 'Análise visual correta',
        items: ['Frente e verso', 'Com calma', 'Antes de medir'],
      },
    ],
    tags: ['analise visual', 'oxidacao', 'trilha', 'conector'],
  },
  {
    title: 'Erros 5, 6 e 7',
    description: 'Erros de interpretação e execução.',
    blocks: [
      {
        title: 'Erro 5: Confiar só em continuidade e resistência',
        body: 'Continuidade não garante funcionamento. Solda velha conduz, mas não comunica.',
        warning: 'Solução: combine consumo, tensão e comportamento ao ligar.',
      },
      {
        title: 'Erro 6: Aplicar solução pronta de vídeo',
        body: 'Defeito parece igual, mas causa pode ser diferente.',
        warning: 'Solução: primeiro analisar, depois comparar, só então testar referência.',
      },
      {
        title: 'Erro 7: Fazer reparo avançado sem preparo',
        body: 'Reballing, troca de CPU e troca de memória têm alto risco e custo alto. Nem todo serviço deve ser aceito.',
        warning: 'Quem só copia, não evolui.',
      },
    ],
    tags: ['continuidade', 'resistencia', 'video', 'cpu', 'reballing'],
  },
];

const actionRoadmap = [
  'Análise visual completa: frente e verso, com calma, antes de medir.',
  'Medição de consumo na fonte: mesmo que o aparelho não ligue.',
  'Identificação do setor suspeito: baseado no consumo e nos sintomas.',
  'Medições direcionadas: tensão, continuidade e resistência no setor.',
  'Intervenção consciente: com temperatura e tempo controlados.',
  'Teste e validação: verificar funcionamento completo.',
];

const conclusionItems = [
  'Menos chute: diagnóstico baseado em evidências.',
  'Menos prejuízo: economia de tempo e peças.',
  'Mais controle: processo previsível e eficiente.',
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function errorMatchesSearch(error: BenchError, search: string) {
  const haystack = normalizeText(
    [
      error.title,
      error.quote ?? '',
      error.description,
      ...error.tags,
      ...error.blocks.flatMap((block) => [
        block.title,
        block.body ?? '',
        block.warning ?? '',
        ...(block.items ?? []),
      ]),
    ].join(' '),
  );

  return haystack.includes(search);
}

function AccordionBlock({ block }: { block: ErrorBlock }) {
  return (
    <details className="group overflow-hidden border border-[#efe3a7] bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-[#fff8d8] px-4 py-3 text-sm font-black text-[#0a0a0a] transition-colors hover:bg-[#f4c400]/25 [&::-webkit-details-marker]:hidden">
        <span>{block.title}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#0a0a0a] text-sm text-[#f4c400] shadow-sm transition-transform group-open:rotate-45" aria-hidden="true">
          +
        </span>
      </summary>

      <div className="space-y-4 border-t border-[#efe3a7] px-4 py-4 text-sm font-medium leading-6 text-[#171717]">
        {block.body && <p>{block.body}</p>}

        {block.items && (
          <ul className="space-y-2">
            {block.items.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4c400]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {block.warning && (
          <p className="border-l-4 border-[#f4c400] bg-[#fff8d8] px-4 py-3 text-sm font-black text-[#0a0a0a]">
            {block.warning}
          </p>
        )}
      </div>
    </details>
  );
}

export default function ErrosComunsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = normalizeText(searchTerm.trim());

  const filteredErrors = useMemo(() => {
    if (!normalizedSearch) return benchErrors;
    return benchErrors.filter((error) => errorMatchesSearch(error, normalizedSearch));
  }, [normalizedSearch]);

  return (
    <section id="topo-erros-comuns" className="-m-10 min-h-screen bg-[#fffdf3] pb-16 text-[#171717]">
      <header className="sticky top-0 z-20 border-b border-[#f4c400]/60 bg-[#0a0a0a] px-6 py-5 shadow-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
              <h1 className="text-2xl font-black tracking-tight">Erros Comuns</h1>
            </div>
          </div>

          <label className="relative block w-full max-w-lg">
            <span className="sr-only">Buscar erro ou solução</span>
            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6d6251]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-12 w-full rounded border border-[#efe3a7] bg-white py-3 pl-12 pr-4 text-sm font-semibold text-[#171717] shadow-sm outline-none ring-2 ring-transparent transition-all placeholder:text-[#6d6251] focus:ring-[#f4c400]"
              placeholder="Buscar erro ou solução..."
            />
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <section>
          <h2 className="text-2xl font-black uppercase tracking-wide text-[#0a0a0a]">Erros Comuns na Bancada</h2>
          <p className="mt-3 text-sm font-medium text-[#6d6251]">
            Como evitar prejuízo, retrabalho e diagnósticos errados.
          </p>

          <div className="mt-6 space-y-4">
            <div className="border border-[#efe3a7] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black text-[#0a0a0a]">Para quem é este material:</h3>
              <ul className="mt-4 space-y-2 text-sm font-medium text-[#171717]">
                {[
                  'Quem está começando no reparo de placas',
                  'Técnicos que vivem travando em diagnósticos',
                  'Quem perde tempo, troca peça boa ou toma prejuízo',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4c400]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-l-4 border-[#f4c400] bg-white px-5 py-4 shadow-sm">
              <h3 className="text-sm font-black text-[#0a0a0a]">Entenda uma coisa antes de tudo:</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-[#6d6251]">
                Todo técnico erra. O problema não é errar, é errar sem método.
              </p>
            </div>
          </div>
        </section>

        {filteredErrors.length === 0 ? (
          <div className="mt-8 border border-[#efe3a7] bg-white p-8 text-center shadow-sm">
            <h3 className="text-xl font-black text-[#0a0a0a]">Nenhum erro encontrado</h3>
            <p className="mt-2 text-sm font-medium text-[#6d6251]">Tente buscar por calor, consumo, fonte, visual, CPU ou medição.</p>
          </div>
        ) : (
          <section className="mt-8 space-y-7">
            {filteredErrors.map((error) => (
              <article key={error.title} className="overflow-hidden border border-[#efe3a7] border-t-4 border-t-[#f4c400] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-[#0a0a0a]">{error.title}</h2>
                {error.quote && <p className="mt-3 text-sm font-bold italic text-[#6d6251]">{error.quote}</p>}
                <p className="mt-3 border-b border-[#efe3a7] pb-4 text-sm font-medium leading-6 text-[#6d6251]">{error.description}</p>

                <div className="mt-5 space-y-4">
                  {error.blocks.map((block) => (
                    <AccordionBlock key={block.title} block={block} />
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}

        <section className="mt-8 overflow-hidden border border-[#efe3a7] border-t-4 border-t-[#f4c400] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#0a0a0a]">Roteiro correto de ação na bancada</h2>
          <p className="mt-3 border-b border-[#efe3a7] pb-4 text-sm font-medium text-[#6d6251]">
            Metodologia traz eficiência e confiabilidade.
          </p>

          <AccordionBlock
            block={{
              title: 'Passo a Passo',
              items: actionRoadmap,
            }}
          />
        </section>

        <section className="mt-8 overflow-hidden border border-[#efe3a7] border-t-4 border-t-[#f4c400] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#0a0a0a]">Conclusão</h2>
          <p className="mt-3 border-b border-[#efe3a7] pb-4 text-sm font-medium text-[#6d6251]">
            A excelência no reparo vem da disciplina, não do acaso.
          </p>

          <AccordionBlock
            block={{
              title: 'O que você ganha com método',
              body: 'Evitar esses erros não te torna perfeito, mas te torna profissional. A diferença está no método, não na ausência de falhas.',
              items: conclusionItems,
            }}
          />
        </section>

        <p className="mt-12 text-center text-xs font-bold text-[#6d6251]">
          © 2026 Central do Técnico. Todos os direitos reservados.
        </p>
      </main>

      <a
        href="#topo-erros-comuns"
        className="fixed bottom-6 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-[#f4c400] text-lg font-black text-[#0a0a0a] shadow-lg transition-colors hover:bg-[#ffd84a]"
        aria-label="Voltar ao topo"
      >
        ↑
      </a>
    </section>
  );
}
