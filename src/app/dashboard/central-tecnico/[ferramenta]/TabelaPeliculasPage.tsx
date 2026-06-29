'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type FilmEntry = {
  model: string;
  compatible: string[];
};

type FilmGroup = {
  title: string;
  entries: FilmEntry[];
};

type FilmBrand = {
  title: string;
  groups: FilmGroup[];
};

const filmBrands: FilmBrand[] = [
  {
    title: 'Motorola',
    groups: [
      {
        title: 'Série E',
        entries: [
          {
            model: 'E6 Plus',
            compatible: ['E6S', 'Moto G7', 'G7 Plus', 'G8 Play', 'A10', 'A10s', 'M10', 'M20', 'K22', 'K40S', 'Mi 8A', 'Redmi 8'],
          },
          {
            model: 'E7 Plus',
            compatible: ['E7 Power', 'E20', 'G8 Power Lite', 'G9 Play', 'G10', 'G20', 'G30', 'G50 5G', 'A02S'],
          },
          { model: 'E13', compatible: ['A02', 'A02S'] },
          {
            model: 'E20',
            compatible: ['E7 Play', 'G9 Play', 'G10', 'G20', 'G30', 'One Fusion', 'A02S', 'A03', 'A03S', 'A23'],
          },
        ],
      },
      {
        title: 'Série G',
        entries: [
          { model: 'G7', compatible: ['G7 Plus', 'G8 Play', 'Moto E6S', 'E6 Plus', 'Moto One Macro'] },
          { model: 'G8 Play', compatible: ['Moto G7', 'G8 Plus', 'E6 Plus', 'Moto One Macro'] },
          {
            model: 'G9 Play',
            compatible: ['Moto G10', 'G20', 'G30', 'E7 Plus', 'One Fusion', 'A03', 'A12', 'A13', 'A42', 'Redmi 9', '9C', '9A'],
          },
          { model: 'G13', compatible: ['Moto G23', 'G73', 'E32'] },
        ],
      },
      {
        title: 'Série Edge',
        entries: [
          { model: 'Edge Plus', compatible: ['Edge 30 Ultra', 'Edge 40 Pro'] },
          { model: 'Edge 20', compatible: ['Edge 20 Pro'] },
          { model: 'Edge 30', compatible: ['Edge 30 Neo'] },
        ],
      },
    ],
  },
  {
    title: 'Realme e Samsung',
    groups: [
      {
        title: 'Realme',
        entries: [
          { model: '9 Pro Plus', compatible: ['9'] },
          { model: '9 5G', compatible: ['9 Pro', '9i', '9i 5G', '9 SE'] },
          { model: 'C35', compatible: ['C21Y', 'Samsung A02', 'A02S', 'A03', 'A03S', 'A12', 'A32 5G', 'M12'] },
          { model: 'C55', compatible: ['Redmi Note 12'] },
          { model: 'GT Master', compatible: ['9', '10'] },
          { model: '7', compatible: ['7 5G', '7 Pro', 'K30 Ultra'] },
        ],
      },
      {
        title: 'Samsung',
        entries: [
          { model: 'A02', compatible: ['A02S', 'A03', 'A03S', 'A13', 'A23', 'A70', 'G20', 'Moto G9 Play'] },
          { model: 'A13', compatible: ['A03', 'A03S', 'A03 Core', 'A12', 'A32 5G', 'A42', 'M12', 'M13', 'G9 Play'] },
          { model: 'A51', compatible: ['A52', 'A52s', 'A52 5G', 'S20 FE', 'Note 10', 'Note 11'] },
          { model: 'S20 FE', compatible: ['S20 Lite', 'A52', 'A51', 'A52S', 'Note 10 4G', 'Note 11'] },
          { model: 'S21 FE', compatible: ['S22 Plus'] },
          { model: 'M51', compatible: ['Redmi Note 11 Pro', 'Redmi Note 11 Pro Plus', 'A71'] },
          { model: 'M31', compatible: ['A20', 'A30', 'A30S', 'A31', 'M22', 'K40S', 'G8 Play', 'A51'] },
        ],
      },
    ],
  },
  {
    title: 'Xiaomi',
    groups: [
      {
        title: 'Série Redmi Note',
        entries: [
          { model: 'Note 11 Pro', compatible: ['Note 10 Pro', 'Note 12 Pro'] },
          { model: 'Note 10', compatible: ['Note 10s', 'Note 11', 'Samsung S20 FE'] },
          { model: 'Note 12', compatible: ['Note 9s', 'Note 9 Pro', 'Poco X3', 'Poco X4 Pro', 'Poco X5'] },
          { model: 'Note 9', compatible: ['Samsung M12', 'A12'] },
        ],
      },
      {
        title: 'Série Redmi',
        entries: [
          { model: 'Redmi 9', compatible: ['Redmi 9 Power', 'Samsung A20s'] },
          { model: 'Redmi 9A/9C/9i', compatible: ['LG K50S', 'Samsung A12', 'A20s', 'A23'] },
          { model: 'Redmi 10', compatible: ['Redmi 10C', 'Redmi 10 Power'] },
          { model: 'Redmi 12', compatible: ['Poco M6 Pro'] },
        ],
      },
      {
        title: 'Série Mi',
        entries: [
          { model: 'Mi 9', compatible: ['Mi 9 Lite', 'Redmi 8', 'Redmi 8A', 'Redmi 8A Pro'] },
          { model: 'Mi 11', compatible: ['Mi 11 Pro'] },
          { model: 'Mi A2', compatible: ['Redmi Note 5', 'Redmi 5 Plus', 'A8 Plus', 'J8', 'S2'] },
        ],
      },
      {
        title: 'Série Poco e Compatibilidade Cruzada',
        entries: [
          { model: 'Poco X3', compatible: ['Poco X4 Pro', 'Poco X5', 'Redmi Note 12'] },
          { model: 'Poco M3', compatible: ['Redmi 9T', 'Redmi 9 Power'] },
          { model: 'Poco M6 Pro', compatible: ['Redmi 12'] },
          { model: 'Poco F3', compatible: ['Redmi K40', 'Mi 11X'] },
        ],
      },
    ],
  },
];

const tips = [
  {
    title: 'Verifique o Modelo',
    description: 'Sempre confirme o modelo exato do celular antes de comprar a película.',
  },
  {
    title: 'Compatibilidade Cruzada',
    description: 'Muitos modelos de marcas diferentes utilizam as mesmas películas.',
  },
  {
    title: 'Qualidade vs Preço',
    description: 'Invista em películas de boa qualidade para maior durabilidade e proteção.',
  },
  {
    title: 'Instalação Profissional',
    description: 'Considere a instalação profissional para evitar bolhas e imperfeições.',
  },
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function entryMatchesSearch(entry: FilmEntry, search: string) {
  return normalizeText([entry.model, ...entry.compatible].join(' ')).includes(search);
}

function filterBrands(search: string) {
  if (!search) return filmBrands;

  return filmBrands
    .map((brand) => {
      const brandMatches = normalizeText(brand.title).includes(search);
      const groups = brand.groups
        .map((group) => {
          const groupMatches = normalizeText(group.title).includes(search);

          if (brandMatches || groupMatches) {
            return group;
          }

          const entries = group.entries.filter((entry) => entryMatchesSearch(entry, search));
          return entries.length > 0 ? { ...group, entries } : null;
        })
        .filter((group): group is FilmGroup => Boolean(group));

      return groups.length > 0 ? { ...brand, groups } : null;
    })
    .filter((brand): brand is FilmBrand => Boolean(brand));
}

function CompatibilityGroup({ group }: { group: FilmGroup }) {
  return (
    <details className="group overflow-hidden border border-[#efe3a7] bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-[#fff8d8] px-4 py-3 text-sm font-black text-[#0a0a0a] transition-colors hover:bg-[#f4c400]/25 [&::-webkit-details-marker]:hidden">
        <span>{group.title}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#0a0a0a] text-sm text-[#f4c400] shadow-sm transition-transform group-open:rotate-45" aria-hidden="true">
          +
        </span>
      </summary>

      <div className="border-t border-[#efe3a7] px-4 py-4">
        <ul className="space-y-3 text-sm font-medium leading-6 text-[#171717]">
          {group.entries.map((entry) => (
            <li key={`${group.title}-${entry.model}`} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4c400]" aria-hidden="true" />
              <span>
                <strong>{entry.model}</strong>
                <span className="mx-1 font-black text-[#d8a900]">→</span>
                {entry.compatible.join(' / ')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export default function TabelaPeliculasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = normalizeText(searchTerm.trim());
  const filteredBrands = useMemo(() => filterBrands(normalizedSearch), [normalizedSearch]);

  return (
    <section id="topo-tabela-peliculas" className="-m-10 min-h-screen bg-[#fffdf3] pb-16 text-[#171717]">
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
              <h1 className="text-2xl font-black tracking-tight">Tabela de Películas</h1>
            </div>
          </div>

          <label className="relative block w-full max-w-lg">
            <span className="sr-only">Buscar modelo</span>
            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6d6251]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-12 w-full rounded border border-[#efe3a7] bg-white py-3 pl-12 pr-4 text-sm font-semibold text-[#171717] shadow-sm outline-none ring-2 ring-transparent transition-all placeholder:text-[#6d6251] focus:ring-[#f4c400]"
              placeholder="Buscar modelo..."
            />
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <section>
          <h2 className="text-2xl font-black uppercase tracking-wide text-[#0a0a0a]">Guia de Compatibilidade de Películas</h2>
          <div className="mt-5 space-y-4 text-sm font-medium leading-6 text-[#6d6251]">
            <p>
              Esta tabela de compatibilidade foi desenvolvida para facilitar a escolha da película de proteção ideal para seu celular.
              Com ela, você pode identificar rapidamente quais modelos compartilham o mesmo tipo de película.
            </p>
            <p>
              A compatibilidade entre diferentes modelos permite economia e praticidade na hora de proteger seu dispositivo.
            </p>
            <p className="font-black text-[#0a0a0a]">
              O símbolo <span className="text-[#d8a900]">(→)</span> indica compatibilidade entre os modelos listados.
            </p>
          </div>
        </section>

        {filteredBrands.length === 0 ? (
          <div className="mt-8 border border-[#efe3a7] bg-white p-8 text-center shadow-sm">
            <h3 className="text-xl font-black text-[#0a0a0a]">Nenhum modelo encontrado</h3>
            <p className="mt-2 text-sm font-medium text-[#6d6251]">Tente buscar por A02, G9 Play, Redmi 9, Note 12, E7 Plus ou S20 FE.</p>
          </div>
        ) : (
          <section className="mt-8 space-y-7">
            {filteredBrands.map((brand) => (
              <article key={brand.title} className="overflow-hidden border border-[#efe3a7] border-t-4 border-t-[#f4c400] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-[#0a0a0a]">{brand.title}</h2>
                <div className="mt-5 space-y-4">
                  {brand.groups.map((group) => (
                    <CompatibilityGroup key={`${brand.title}-${group.title}`} group={group} />
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}

        <section className="mt-8 overflow-hidden border border-[#efe3a7] border-t-4 border-t-[#f4c400] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#0a0a0a]">Dicas Importantes</h2>
          <div className="mt-5 grid grid-cols-1 gap-4">
            {tips.map((tip) => (
              <div key={tip.title} className="border border-[#efe3a7] bg-white px-5 py-4 shadow-sm">
                <h3 className="flex items-center gap-3 text-sm font-black text-[#0a0a0a]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f4c400] text-xs text-[#0a0a0a]" aria-hidden="true">
                    ✓
                  </span>
                  {tip.title}
                </h3>
                <p className="mt-3 text-sm font-medium leading-6 text-[#6d6251]">{tip.description}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-12 text-center text-xs font-bold text-[#6d6251]">
          © 2026 Central do Técnico. Todos os direitos reservados.
        </p>
      </main>

      <a
        href="#topo-tabela-peliculas"
        className="fixed bottom-6 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-[#f4c400] text-lg font-black text-[#0a0a0a] shadow-lg transition-colors hover:bg-[#ffd84a]"
        aria-label="Voltar ao topo"
      >
        ↑
      </a>
    </section>
  );
}
