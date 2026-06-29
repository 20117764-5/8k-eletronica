'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type Abbreviation = {
  abbr: string;
  meaning: string;
};

type AbbreviationGroup = {
  title: string;
  entries: Abbreviation[];
};

type AbbreviationSection = {
  title: string;
  description: string;
  groups: AbbreviationGroup[];
};

const abbreviationSections: AbbreviationSection[] = [
  {
    title: '1. Componentes Básicos e Suas Abreviações',
    description: 'Identificação dos componentes fundamentais em esquemas elétricos.',
    groups: [
      {
        title: 'Componentes Fundamentais',
        entries: [
          { abbr: 'R / RES', meaning: 'Resistor' },
          { abbr: 'C / CAP', meaning: 'Capacitor' },
          { abbr: 'L', meaning: 'Bobina ou indutor' },
          { abbr: 'D', meaning: 'Diodo' },
          { abbr: 'ZD', meaning: 'Diodo zener' },
          { abbr: 'LED', meaning: 'Diodo emissor de luz' },
          { abbr: 'Q', meaning: 'Transistor' },
          { abbr: 'FET', meaning: 'Transistor de efeito de campo' },
          { abbr: 'IC / CI / U', meaning: 'Circuito integrado' },
          { abbr: 'J / CN / CON', meaning: 'Conector' },
          { abbr: 'SW', meaning: 'Chave ou botão' },
          { abbr: 'F / FUSE', meaning: 'Fusível' },
          { abbr: 'TP', meaning: 'Ponto de teste' },
          { abbr: 'X / Y / OSC', meaning: 'Cristal ou oscilador' },
        ],
      },
      {
        title: 'Resistores e Capacitores',
        entries: [
          { abbr: 'FB', meaning: 'Ferrite bead, usado para filtro de ruído' },
          { abbr: 'VR', meaning: 'Resistor variável' },
          { abbr: 'NTC', meaning: 'Termistor de coeficiente negativo' },
          { abbr: 'PTC', meaning: 'Termistor de coeficiente positivo' },
          { abbr: 'MLCC', meaning: 'Capacitor cerâmico multicamadas' },
          { abbr: 'ECAP', meaning: 'Capacitor eletrolítico' },
          { abbr: 'TANT', meaning: 'Capacitor de tântalo' },
        ],
      },
      {
        title: 'Semicondutores / Osciladores',
        entries: [
          { abbr: 'TVS', meaning: 'Diodo de proteção contra surto' },
          { abbr: 'BJT', meaning: 'Transistor bipolar' },
          { abbr: 'MOSFET', meaning: 'Transistor de efeito de campo metal-óxido' },
          { abbr: 'XTAL', meaning: 'Cristal oscilador' },
          { abbr: 'XO', meaning: 'Oscilador' },
          { abbr: 'CLK', meaning: 'Clock ou sinal de relógio' },
        ],
      },
      {
        title: 'Circuitos Integrados e Especiais',
        entries: [
          { abbr: 'PMIC', meaning: 'Circuito integrado de gerenciamento de energia' },
          { abbr: 'CODEC', meaning: 'Circuito de áudio' },
          { abbr: 'PA', meaning: 'Amplificador de potência' },
          { abbr: 'LNA', meaning: 'Amplificador de baixo ruído' },
          { abbr: 'BGA', meaning: 'Encapsulamento com esferas de solda' },
          { abbr: 'FPC', meaning: 'Conector ou cabo flexível' },
          { abbr: 'FFC', meaning: 'Cabo flexível plano' },
        ],
      },
    ],
  },
  {
    title: '2. Tensões/Circuitos de Alimentação e Energia',
    description: 'Siglas relacionadas a energia, bateria e gerenciamento da placa.',
    groups: [
      {
        title: 'Tensões e Correntes',
        entries: [
          { abbr: 'VCC', meaning: 'Tensão de circuito comum' },
          { abbr: 'VDD', meaning: 'Tensão positiva de alimentação' },
          { abbr: 'VSS', meaning: 'Terra ou referência negativa' },
          { abbr: 'GND', meaning: 'Terra do circuito' },
          { abbr: 'VBAT / VBATT', meaning: 'Tensão da bateria' },
          { abbr: 'B+', meaning: 'Linha positiva da bateria' },
          { abbr: 'VBUS', meaning: 'Tensão da entrada USB' },
          { abbr: 'VIN', meaning: 'Tensão de entrada' },
          { abbr: 'VOUT', meaning: 'Tensão de saída' },
          { abbr: 'VREG', meaning: 'Tensão regulada' },
          { abbr: 'VPH_PWR', meaning: 'Linha principal de alimentação em muitos aparelhos' },
        ],
      },
      {
        title: 'Gerenciamento de Energia',
        entries: [
          { abbr: 'PMIC / PMU', meaning: 'Gerenciador principal de energia' },
          { abbr: 'LDO', meaning: 'Regulador linear de baixa queda' },
          { abbr: 'BUCK', meaning: 'Conversor redutor de tensão' },
          { abbr: 'BOOST', meaning: 'Conversor elevador de tensão' },
          { abbr: 'SMPS', meaning: 'Fonte chaveada' },
          { abbr: 'CHG', meaning: 'Circuito ou sinal de carga' },
          { abbr: 'FG / FUEL GAUGE', meaning: 'Medição e controle de nível da bateria' },
          { abbr: 'BMS', meaning: 'Sistema de gerenciamento da bateria' },
          { abbr: 'OVP', meaning: 'Proteção contra sobretensão' },
          { abbr: 'OCP', meaning: 'Proteção contra sobrecorrente' },
        ],
      },
      {
        title: 'Bateria / Circuito de Alimentação',
        entries: [
          { abbr: 'BAT / BAT+', meaning: 'Terminal positivo da bateria' },
          { abbr: 'BAT-', meaning: 'Terminal negativo da bateria' },
          { abbr: 'BSI / ID', meaning: 'Identificação da bateria' },
          { abbr: 'NTC / THERM', meaning: 'Sensor de temperatura da bateria' },
          { abbr: 'BAT_SENSE', meaning: 'Linha de leitura da tensão da bateria' },
          { abbr: 'CHG_EN', meaning: 'Habilitação do carregamento' },
          { abbr: 'BATT_DET', meaning: 'Detecção da bateria conectada' },
          { abbr: 'PACK', meaning: 'Conjunto ou pacote da bateria' },
        ],
      },
      {
        title: 'Outras Terminologias de Alimentação',
        entries: [
          { abbr: 'PWRKEY', meaning: 'Sinal do botão power' },
          { abbr: 'RESET / RST', meaning: 'Sinal de reinicialização' },
          { abbr: 'WAKE', meaning: 'Sinal para acordar o circuito' },
          { abbr: 'SLEEP', meaning: 'Modo de repouso' },
          { abbr: 'PG / PGOOD', meaning: 'Power good, alimentação válida' },
          { abbr: 'EN / ENABLE', meaning: 'Habilitação de circuito' },
          { abbr: 'PP', meaning: 'Power path ou linha de alimentação em alguns esquemas' },
        ],
      },
    ],
  },
  {
    title: '3. Componentes de Comunicação e Interface',
    description: 'Siglas de protocolos, barramentos e dispositivos de entrada/saída.',
    groups: [
      {
        title: 'Interface de Conexão',
        entries: [
          { abbr: 'USB', meaning: 'Barramento serial universal' },
          { abbr: 'D+ / DP', meaning: 'Linha positiva de dados USB' },
          { abbr: 'D- / DM', meaning: 'Linha negativa de dados USB' },
          { abbr: 'CC1 / CC2', meaning: 'Canais de configuração do USB-C' },
          { abbr: 'MIPI', meaning: 'Interface usada em câmeras e displays' },
          { abbr: 'DSI', meaning: 'Interface de display' },
          { abbr: 'CSI', meaning: 'Interface de câmera' },
          { abbr: 'FPC / FFC', meaning: 'Conectores e cabos flexíveis' },
          { abbr: 'JTAG', meaning: 'Interface de teste e programação' },
        ],
      },
      {
        title: 'Protocolos e Sinais',
        entries: [
          { abbr: 'I2C', meaning: 'Barramento serial de comunicação' },
          { abbr: 'SDA', meaning: 'Linha de dados do I2C' },
          { abbr: 'SCL', meaning: 'Linha de clock do I2C' },
          { abbr: 'SPI', meaning: 'Interface periférica serial' },
          { abbr: 'MOSI', meaning: 'Saída do mestre para entrada do escravo' },
          { abbr: 'MISO', meaning: 'Entrada do mestre a partir do escravo' },
          { abbr: 'SCLK', meaning: 'Clock do SPI' },
          { abbr: 'CS', meaning: 'Chip select ou seleção do dispositivo' },
          { abbr: 'UART', meaning: 'Comunicação serial assíncrona' },
          { abbr: 'TX / RX', meaning: 'Transmissão e recepção de dados' },
        ],
      },
      {
        title: 'Entrada e Saída',
        entries: [
          { abbr: 'BUTTON / KEY', meaning: 'Botão ou tecla' },
          { abbr: 'PWRKEY', meaning: 'Botão power' },
          { abbr: 'VOL+ / VOL-', meaning: 'Botões de volume' },
          { abbr: 'LCD', meaning: 'Display de cristal líquido' },
          { abbr: 'OLED / AMOLED', meaning: 'Tecnologia de tela' },
          { abbr: 'TP / TOUCH', meaning: 'Painel de toque' },
          { abbr: 'CAM', meaning: 'Câmera' },
          { abbr: 'MIC', meaning: 'Microfone' },
          { abbr: 'SPK', meaning: 'Alto-falante' },
          { abbr: 'RCV', meaning: 'Alto-falante auricular' },
          { abbr: 'VIB', meaning: 'Motor vibracall' },
          { abbr: 'SIM / SD', meaning: 'Chip de operadora e cartão de memória' },
        ],
      },
      {
        title: 'Dispositivos de Interface',
        entries: [
          { abbr: 'DIGITIZER', meaning: 'Camada responsável pelo toque' },
          { abbr: 'NFC', meaning: 'Comunicação por aproximação' },
          { abbr: 'GPS', meaning: 'Sistema de localização' },
          { abbr: 'BT', meaning: 'Bluetooth' },
          { abbr: 'WLAN / Wi-Fi', meaning: 'Rede sem fio' },
          { abbr: 'ANT', meaning: 'Antena' },
          { abbr: 'COAX', meaning: 'Cabo coaxial de sinal' },
        ],
      },
    ],
  },
  {
    title: '4. Componentes de Controle e Processamento',
    description: 'Siglas de processamento, memória e sinais de controle.',
    groups: [
      {
        title: 'Controladores e Sinais',
        entries: [
          { abbr: 'RST / RESET', meaning: 'Reinicialização do circuito' },
          { abbr: 'EN / ENABLE', meaning: 'Habilitação' },
          { abbr: 'INT / IRQ', meaning: 'Interrupção' },
          { abbr: 'CLK', meaning: 'Clock ou sincronismo' },
          { abbr: 'GPIO', meaning: 'Entrada e saída de uso geral' },
          { abbr: 'ADC', meaning: 'Conversor analógico para digital' },
          { abbr: 'PWM', meaning: 'Modulação por largura de pulso' },
          { abbr: 'BOOT', meaning: 'Inicialização' },
          { abbr: 'DEBUG', meaning: 'Interface de depuração' },
        ],
      },
      {
        title: 'Processadores e Memória',
        entries: [
          { abbr: 'CPU / AP', meaning: 'Processador principal' },
          { abbr: 'BB / BASEBAND', meaning: 'Processador de comunicação celular' },
          { abbr: 'GPU', meaning: 'Processador gráfico' },
          { abbr: 'RAM / DRAM', meaning: 'Memória volátil' },
          { abbr: 'ROM', meaning: 'Memória somente leitura' },
          { abbr: 'NAND', meaning: 'Memória flash' },
          { abbr: 'eMMC / UFS', meaning: 'Armazenamento interno' },
          { abbr: 'EEPROM', meaning: 'Memória regravável' },
        ],
      },
      {
        title: 'Sinais de Controle',
        entries: [
          { abbr: 'REQ', meaning: 'Requisição' },
          { abbr: 'ACK', meaning: 'Confirmação' },
          { abbr: 'SENSE', meaning: 'Linha de leitura ou detecção' },
          { abbr: 'DET', meaning: 'Detecção' },
          { abbr: 'STAT', meaning: 'Status' },
          { abbr: 'FAULT', meaning: 'Falha detectada' },
          { abbr: 'PROTECT', meaning: 'Proteção ativa' },
        ],
      },
      {
        title: 'Circuitos Especializados',
        entries: [
          { abbr: 'RF', meaning: 'Radiofrequência' },
          { abbr: 'PA', meaning: 'Amplificador de potência RF' },
          { abbr: 'FEM', meaning: 'Módulo frontal de RF' },
          { abbr: 'ANT SW', meaning: 'Chave de antena' },
          { abbr: 'T-CON', meaning: 'Controlador de temporização de display' },
          { abbr: 'ISP', meaning: 'Processador de sinal de imagem' },
          { abbr: 'AUDIO AMP', meaning: 'Amplificador de áudio' },
        ],
      },
    ],
  },
  {
    title: '5. Outras Terminologias Técnicas',
    description: 'Medição, especificação e diagnóstico em eletrônica.',
    groups: [
      {
        title: 'Medição e Especificações',
        entries: [
          { abbr: 'DC', meaning: 'Corrente contínua' },
          { abbr: 'AC', meaning: 'Corrente alternada' },
          { abbr: 'V', meaning: 'Volts, unidade de tensão' },
          { abbr: 'A / mA / uA', meaning: 'Ampere, miliampere e microampere' },
          { abbr: 'ohm / kohm / Mohm', meaning: 'Unidades de resistência' },
          { abbr: 'Hz / kHz / MHz', meaning: 'Unidades de frequência' },
          { abbr: 'OL', meaning: 'Circuito aberto ou fora da escala do multímetro' },
          { abbr: 'DIODE MODE', meaning: 'Modo diodo do multímetro' },
        ],
      },
      {
        title: 'Diagnóstico e Componentes',
        entries: [
          { abbr: 'SHORT', meaning: 'Curto-circuito' },
          { abbr: 'OPEN', meaning: 'Circuito aberto' },
          { abbr: 'LEAK', meaning: 'Fuga de corrente' },
          { abbr: 'DROP', meaning: 'Queda de tensão' },
          { abbr: 'LOAD', meaning: 'Carga aplicada ao circuito' },
          { abbr: 'NO BOOT', meaning: 'Não inicializa' },
          { abbr: 'BOOT LOOP', meaning: 'Reinicialização em ciclo' },
          { abbr: 'DEAD', meaning: 'Placa morta ou sem consumo' },
          { abbr: 'COLD SOLDER', meaning: 'Solda fria' },
          { abbr: 'REBALL / REWORK', meaning: 'Retrabalho em componente BGA' },
        ],
      },
      {
        title: 'Terminologia Específica',
        entries: [
          { abbr: 'ESD', meaning: 'Descarga eletrostática' },
          { abbr: 'EMI / EMC', meaning: 'Interferência e compatibilidade eletromagnética' },
          { abbr: 'PAD', meaning: 'Ilha de solda' },
          { abbr: 'VIA', meaning: 'Passagem entre camadas da placa' },
          { abbr: 'TRACE', meaning: 'Trilha da placa' },
          { abbr: 'NET', meaning: 'Rede elétrica no esquema' },
          { abbr: 'RAIL', meaning: 'Linha de alimentação' },
          { abbr: 'JUMPER', meaning: 'Ligação alternativa entre pontos' },
          { abbr: 'SCHEMATIC', meaning: 'Esquema elétrico' },
          { abbr: 'BOARDVIEW', meaning: 'Mapa visual da placa' },
        ],
      },
      {
        title: 'Tecnologias de Informação',
        entries: [
          { abbr: 'GSM / LTE / 5G', meaning: 'Tecnologias de rede celular' },
          { abbr: 'IMEI', meaning: 'Identificação internacional do aparelho' },
          { abbr: 'BASEBAND', meaning: 'Setor de comunicação celular' },
          { abbr: 'SIM', meaning: 'Cartão de operadora' },
          { abbr: 'DFU / RECOVERY', meaning: 'Modos de recuperação' },
          { abbr: 'ADB', meaning: 'Interface de depuração Android' },
          { abbr: 'ISP', meaning: 'Gravação ou acesso direto à memória' },
        ],
      },
    ],
  },
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function groupMatchesSearch(group: AbbreviationGroup, search: string) {
  const haystack = normalizeText([
    group.title,
    ...group.entries.flatMap((entry) => [entry.abbr, entry.meaning]),
  ].join(' '));

  return haystack.includes(search);
}

function filterSections(search: string) {
  if (!search) return abbreviationSections;

  return abbreviationSections
    .map((section) => {
      const sectionMatches = normalizeText(`${section.title} ${section.description}`).includes(search);
      const groups = section.groups
        .map((group) => {
          if (sectionMatches || groupMatchesSearch(group, search)) {
            return group;
          }

          const entries = group.entries.filter((entry) =>
            normalizeText(`${entry.abbr} ${entry.meaning}`).includes(search),
          );

          return entries.length > 0 ? { ...group, entries } : null;
        })
        .filter((group): group is AbbreviationGroup => Boolean(group));

      return groups.length > 0 ? { ...section, groups } : null;
    })
    .filter((section): section is AbbreviationSection => Boolean(section));
}

function AbbreviationGroupCard({ group }: { group: AbbreviationGroup }) {
  return (
    <details className="group overflow-hidden border border-[#efe3a7] bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-[#fff8d8] px-4 py-3 text-sm font-black text-[#0a0a0a] transition-colors hover:bg-[#f4c400]/25 [&::-webkit-details-marker]:hidden">
        <span>{group.title}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#0a0a0a] text-sm text-[#f4c400] shadow-sm transition-transform group-open:rotate-45" aria-hidden="true">
          +
        </span>
      </summary>

      <div className="border-t border-[#efe3a7] px-4 py-4">
        <ul className="space-y-2 text-sm font-medium leading-6 text-[#171717]">
          {group.entries.map((entry) => (
            <li key={`${entry.abbr}-${entry.meaning}`} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4c400]" aria-hidden="true" />
              <span>
                <strong>{entry.abbr}:</strong> {entry.meaning}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export default function GuiaAbreviacoesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = normalizeText(searchTerm.trim());
  const filteredSections = useMemo(() => filterSections(normalizedSearch), [normalizedSearch]);

  return (
    <section id="topo-guia-abreviacoes" className="-m-10 min-h-screen bg-[#fffdf3] pb-16 text-[#171717]">
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
              <h1 className="text-2xl font-black tracking-tight">Guia de Abreviações</h1>
            </div>
          </div>

          <label className="relative block w-full max-w-lg">
            <span className="sr-only">Buscar sigla ou componente</span>
            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6d6251]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-12 w-full rounded border border-[#efe3a7] bg-white py-3 pl-12 pr-4 text-sm font-semibold text-[#171717] shadow-sm outline-none ring-2 ring-transparent transition-all placeholder:text-[#6d6251] focus:ring-[#f4c400]"
              placeholder="Buscar sigla ou componente..."
            />
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <section>
          <h2 className="text-2xl font-black uppercase tracking-wide text-[#0a0a0a]">Guia de Abreviações e Siglas</h2>
          <p className="mt-3 text-sm font-medium leading-6 text-[#6d6251]">
            Referência completa para interpretar diagramas e placas de circuitos eletrônicos.
          </p>
        </section>

        {filteredSections.length === 0 ? (
          <div className="mt-8 border border-[#efe3a7] bg-white p-8 text-center shadow-sm">
            <h3 className="text-xl font-black text-[#0a0a0a]">Nenhuma sigla encontrada</h3>
            <p className="mt-2 text-sm font-medium text-[#6d6251]">Tente buscar por PMIC, VBAT, I2C, USB, resistor, bateria ou sensor.</p>
          </div>
        ) : (
          <section className="mt-8 space-y-7">
            {filteredSections.map((section) => (
              <article key={section.title} className="overflow-hidden border border-[#efe3a7] border-t-4 border-t-[#f4c400] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-[#0a0a0a]">{section.title}</h2>
                <p className="mt-3 border-b border-[#efe3a7] pb-4 text-sm font-medium leading-6 text-[#6d6251]">{section.description}</p>

                <div className="mt-5 space-y-4">
                  {section.groups.map((group) => (
                    <AbbreviationGroupCard key={group.title} group={group} />
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}

        <section className="mt-8 overflow-hidden border border-[#efe3a7] border-t-4 border-t-[#f4c400] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#0a0a0a]">Importância do Conhecimento Técnico</h2>
          <p className="mt-3 border-b border-[#efe3a7] pb-4 text-sm font-medium text-[#6d6251]">
            Por que aprender essas siglas?
          </p>

          <details className="group mt-5 overflow-hidden border border-[#efe3a7] bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-[#fff8d8] px-4 py-3 text-sm font-black text-[#0a0a0a] transition-colors hover:bg-[#f4c400]/25 [&::-webkit-details-marker]:hidden">
              <span>Aplicação na bancada</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#0a0a0a] text-sm text-[#f4c400] shadow-sm transition-transform group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="border-t border-[#efe3a7] px-4 py-4 text-sm font-medium leading-6 text-[#171717]">
              <p>
                Compreender essas abreviações ajuda o técnico a interpretar esquemas, identificar linhas críticas, reconhecer
                componentes e evitar diagnósticos por tentativa. Quem entende a linguagem da placa trabalha com mais método,
                menos retrabalho e mais segurança.
              </p>
            </div>
          </details>
        </section>

        <p className="mt-12 text-center text-xs font-bold text-[#6d6251]">
          © 2026 Central do Técnico. Todos os direitos reservados.
        </p>
      </main>

      <a
        href="#topo-guia-abreviacoes"
        className="fixed bottom-6 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-[#f4c400] text-lg font-black text-[#0a0a0a] shadow-lg transition-colors hover:bg-[#ffd84a]"
        aria-label="Voltar ao topo"
      >
        ↑
      </a>
    </section>
  );
}
