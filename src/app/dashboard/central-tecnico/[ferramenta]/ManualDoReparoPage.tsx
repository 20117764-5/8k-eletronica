'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type QuickDecision = {
  title: string;
  signal: string;
  chapters: number[];
  tags: string[];
};

type ManualSection = {
  heading: string;
  items: string[];
  note?: string;
};

type ManualChapter = {
  id: number;
  title: string;
  summary: string;
  sections: ManualSection[];
  tags: string[];
};

const quickDecisions: QuickDecision[] = [
  {
    title: 'Aparelho Não Liga / Placa Morta',
    signal: 'Na fonte: zero consumo.',
    chapters: [5, 6, 9],
    tags: ['nao liga', 'placa morta', 'zero consumo', 'fonte'],
  },
  {
    title: 'Curto Total na Placa',
    signal: 'Na fonte: consumo alto imediato ou fonte limitando corrente.',
    chapters: [8, 11, 12],
    tags: ['curto', 'consumo alto', 'aquecimento', 'injecao'],
  },
  {
    title: 'Consome e Trava',
    signal: 'Na fonte: consumo aparece, mas não finaliza o boot.',
    chapters: [5, 13, 14],
    tags: ['trava', 'boot', 'consumo travado'],
  },
  {
    title: 'Consome e Zera',
    signal: 'Na fonte: tenta iniciar e volta para zero.',
    chapters: [10, 13, 20],
    tags: ['zera', 'reinicia', 'bootloop'],
  },
  {
    title: 'Demora Muito / Sistema Bugado',
    signal: 'Sintomas: liga após minutos, Wi-Fi, câmera ou sensor falhando.',
    chapters: [7, 10, 13],
    tags: ['demora', 'sistema', 'bugado', 'perifericos'],
  },
  {
    title: 'Não Carrega / Carrega Lento',
    signal: 'Sintomas: conector ou bateria trocada, carga falsa ou lenta.',
    chapters: [9, 18, 19],
    tags: ['carga', 'bateria', 'conector', 'lento'],
  },
  {
    title: 'Falha de Carga ou Bateria',
    signal: 'Sintomas: raio falso, descarga rápida ou superaquecimento.',
    chapters: [19, 25, 26],
    tags: ['raio falso', 'bateria', 'superaquecimento'],
  },
  {
    title: 'Falhas de Rede & Sinal',
    signal: 'Sintomas: sem sinal, Wi-Fi ou Bluetooth falhando.',
    chapters: [21, 22],
    tags: ['rede', 'sinal', 'wifi', 'bluetooth'],
  },
  {
    title: 'Display, Backlight e USB',
    signal: 'Sintomas: tela preta, touch fantasma ou PC não reconhece.',
    chapters: [27, 28, 29],
    tags: ['display', 'backlight', 'usb', 'touch'],
  },
  {
    title: 'Looping e Desliga Sozinho',
    signal: 'Sintomas: trava na logo, reinicia ou desliga durante o uso.',
    chapters: [20, 31],
    tags: ['loop', 'desliga', 'reinicia', 'logo'],
  },
  {
    title: 'Câmera, Áudio ou Sensor',
    signal: 'Sintomas: câmera não abre, microfone ou proximidade falhando.',
    chapters: [23, 24, 30],
    tags: ['camera', 'audio', 'microfone', 'sensor'],
  },
  {
    title: 'Superaquecimento',
    signal: 'Sintomas: esquenta ao carregar ou em uso leve.',
    chapters: [8, 25, 26],
    tags: ['superaquece', 'temperatura', 'esquenta'],
  },
];

const manualChapters: ManualChapter[] = [
  {
    id: 1,
    title: 'Mentalidade do Diagnóstico',
    summary: 'Diagnóstico é decisão guiada, não tentativa.',
    sections: [
      {
        heading: 'Princípios Básicos',
        items: [
          'Nunca comece trocando peça sem medir e observar.',
          'Pergunte o que aconteceu antes do defeito.',
          'Observe o comportamento do aparelho antes de abrir.',
          'Escolha a ferramenta depois de formar uma hipótese.',
        ],
      },
    ],
    tags: ['diagnostico', 'metodo', 'bancada'],
  },
  {
    id: 2,
    title: 'Coleta de Informações',
    summary: 'O que perguntar ao cliente em ordem lógica.',
    sections: [
      {
        heading: 'Perguntas Essenciais',
        items: [
          'Houve queda?',
          'Houve contato com líquido?',
          'Parou carregando ou em uso normal?',
          'Já foi aberto ou reparado antes?',
          'Anote tudo: informação errada atrapalha diagnóstico.',
        ],
      },
    ],
    tags: ['cliente', 'informacoes', 'entrada'],
  },
  {
    id: 3,
    title: 'Teste na Fonte de Alimentação',
    summary: 'Identifica rapidamente se a placa está viva, em curto ou em fuga.',
    sections: [
      {
        heading: 'Passo a Passo Operacional',
        items: [
          'Configure a fonte em 4.2V e corrente entre 2A e 5A.',
          'Remova capa, chip e cartão. Se houver suspeita, isole periféricos.',
          'Conecte positivo no VBAT e negativo no GND.',
          'Observe o consumo antes de pressionar power.',
          'Pressione power e observe pico, subida, queda ou travamento.',
        ],
      },
      {
        heading: 'Padrões Mais Comuns',
        items: [
          '0.100A a 0.200A: placa responde, mas ainda precisa interpretação.',
          'Sobe e zera: tentativa de boot com falha na inicialização.',
          'Alto imediato: suspeita de curto na malha principal.',
        ],
      },
    ],
    tags: ['fonte', 'consumo', 'vbat'],
  },
  {
    id: 4,
    title: 'Padrões de Consumo',
    summary: 'Mapa rápido: consumo é comportamento.',
    sections: [
      {
        heading: 'Fuga de Corrente',
        items: [
          'Consumo antes do power indica algo drenando energia.',
          'Comece por aquecimento controlado e análise visual.',
        ],
      },
      {
        heading: 'Curto Total na Placa',
        items: [
          'Consumo alto imediato e fonte limitando corrente indicam curto direto.',
          'Use injeção de tensão com cuidado e limite de corrente.',
        ],
      },
      {
        heading: 'Consome e Trava',
        items: [
          'Pico aparece, consumo sobe e fica preso.',
          'Suspeite de falha de inicialização, periférico ou tensão secundária.',
        ],
      },
      {
        heading: 'Consome e Zera',
        items: [
          'O boot começa e a proteção derruba o consumo.',
          'Teste sem periféricos e confirme tensões principais.',
        ],
      },
      {
        heading: 'Zero Consumo',
        items: [
          'Nenhum consumo mesmo acionando power indica linha interrompida ou falha básica.',
          'Volte para análise visual, power, multímetro e continuidade.',
        ],
      },
    ],
    tags: ['consumo', 'curto', 'fuga', 'zero'],
  },
  {
    id: 5,
    title: 'Teste de Boot',
    summary: 'Responde se a placa ainda tenta iniciar.',
    sections: [
      {
        heading: 'Resultados e Interpretação',
        items: [
          'Tem boot: há pico rápido e tentativa de inicialização.',
          'Não tem boot: nenhuma alteração de consumo.',
          'Boot e zera: o consumo cai logo após tentar iniciar.',
          'Boot e trava: consumo sobe e fica travado.',
        ],
        note: 'Sem boot costuma apontar para problema elétrico básico. Com boot, avance para inicialização, periféricos e sistema.',
      },
    ],
    tags: ['boot', 'inicializacao'],
  },
  {
    id: 6,
    title: 'Análise Visual',
    summary: 'Filtro mais rápido da bancada.',
    sections: [
      {
        heading: 'O que procurar',
        items: [
          'Oxidação em conector de bateria, carga, PMIC e regiões de entrada.',
          'Componentes trincados, capacitores quebrados e bobinas danificadas.',
          'Solda fria em PMIC, FPCs e conectores.',
          'Trilhas rompidas em bordas, botão power e região de carga.',
        ],
      },
    ],
    tags: ['visual', 'oxidacao', 'solda fria'],
  },
  {
    id: 7,
    title: 'Teste sem Periféricos',
    summary: 'Forma rápida de isolar defeitos externos à placa principal.',
    sections: [
      {
        heading: 'Ordem de Remoção e Teste',
        items: [
          'Câmeras: curto em câmera pode causar bootloop.',
          'Subplaca: desconecte o flex e observe se o consumo muda.',
          'Tela: display em curto pode derrubar tensões.',
          'Flex power: verifique se não está pressionado ou travado.',
          'Se ligar sem periféricos, conecte um por vez e teste novamente.',
        ],
      },
    ],
    tags: ['perifericos', 'flex', 'camera', 'subplaca'],
  },
  {
    id: 8,
    title: 'Teste de Aquecimento',
    summary: 'Localiza defeitos em curto ou fuga com rapidez.',
    sections: [
      {
        heading: 'Métodos e Interpretação',
        items: [
          'Use toque controlado, álcool isopropílico, breu ou câmera térmica.',
          'Capacitor aquece: curto direto ou parcial na linha.',
          'Bobina aquece: analise a malha depois da bobina.',
          'PMIC aquece: pode ser defeito interno ou sobrecarga externa.',
          'Nada aquece: avance para injeção ou método Kelvin.',
        ],
      },
    ],
    tags: ['aquecimento', 'curto', 'temperatura'],
  },
  {
    id: 9,
    title: 'Multímetro na Prática',
    summary: 'Confirma ou elimina hipóteses levantadas pela fonte.',
    sections: [
      {
        heading: 'Ordem Correta de Medição',
        items: [
          'Continuidade com a placa desligada.',
          'Resistência para mapear curto-circuito.',
          'Comparação entre lados ou placas boas quando possível.',
          'Medição de tensões com a placa alimentada.',
        ],
      },
    ],
    tags: ['multimetro', 'continuidade', 'tensao'],
  },
  {
    id: 10,
    title: 'Uso do Esquema Elétrico',
    summary: 'Transforma suspeita em confirmação.',
    sections: [
      {
        heading: 'Passo a Passo na Bancada',
        items: [
          'Identifique modelo, versão e revisão da placa.',
          'Localize a malha envolvida: VBAT, VDD_MAIN ou secundárias.',
          'Entenda a função da malha antes de condenar componente.',
          'Confira tensão de trabalho, como 1.8V, 3.0V ou 5V.',
          'Identifique componentes críticos: capacitores, bobinas e CIs.',
        ],
        note: 'Erro clássico: achar que toda malha bipando é curto.',
      },
    ],
    tags: ['esquema', 'malha', 'tensao'],
  },
  {
    id: 11,
    title: 'Injeção de Tensão',
    summary: 'Força o defeito a aparecer quando curto ou fuga não são óbvios.',
    sections: [
      {
        heading: 'Como e Quando Fazer',
        items: [
          'Use quando há curto identificado sem aquecimento claro.',
          'Identifique a malha correta no esquema.',
          'Isole a malha quando possível, removendo bobina ou resistor de entrada.',
          'Injete tensão com positivo na malha e negativo no GND.',
          'Observe consumo, aquecimento e limite a corrente.',
        ],
      },
    ],
    tags: ['injecao', 'curto', 'tensao'],
  },
  {
    id: 12,
    title: 'Método Kelvin',
    summary: 'Localização precisa de curto quando a injeção não revela o ponto.',
    sections: [
      {
        heading: 'Passo a Passo',
        items: [
          'Energize apenas a linha suspeita.',
          'Localize dois pontos distantes na mesma linha.',
          'Configure o multímetro em milivolts.',
          'Meça a queda de tensão entre os pontos.',
          'Maior queda de tensão indica maior proximidade do curto.',
        ],
      },
    ],
    tags: ['kelvin', 'curto', 'milivolts'],
  },
  {
    id: 13,
    title: 'Consome e Não Liga',
    summary: 'A placa responde, consome, mas não finaliza inicialização.',
    sections: [
      {
        heading: 'Sequência de Análise',
        items: [
          'Observe se o consumo muda ao pressionar power.',
          'Confira PMIC e tensões primárias.',
          'Meça tensões secundárias que alimentam Wi-Fi, RF, sensores e câmera.',
          'Suspeite de CPU apenas depois de eliminar alimentação e periféricos.',
        ],
        note: 'CPU e memória são consequência, não ponto de partida.',
      },
    ],
    tags: ['consome', 'nao liga', 'pmic', 'cpu'],
  },
  {
    id: 14,
    title: 'Técnica do Jumper no Power',
    summary: 'Mantém o aparelho em tentativa contínua para observar o comportamento.',
    sections: [
      {
        heading: 'Como Fazer e Observar',
        items: [
          'Localize os dois pontos do botão power.',
          'Faça o acionamento controlado por poucos segundos.',
          'Observe consumo, aquecimento e resposta do PMIC.',
          'Use apenas como teste, nunca como solução definitiva.',
        ],
      },
    ],
    tags: ['jumper', 'power', 'teste'],
  },
  {
    id: 15,
    title: 'Defeitos Crônicos',
    summary: 'Defeitos recorrentes que aparecem diariamente na bancada.',
    sections: [
      {
        heading: 'Lista de Atalhos',
        items: [
          'Bootloop: solda fria em CPU/memória, periférico ou sistema.',
          'Consome e não liga: PMIC liberando parcialmente ou tensão ausente.',
          'Curto na linha principal: capacitor cerâmico ou CI aquecendo.',
          'Demora muito: setor secundário defeituoso ou periférico travando.',
          'Não carrega: FPC, conector, CI de carga ou trilha aberta.',
        ],
      },
    ],
    tags: ['cronico', 'multimarca', 'atalhos'],
  },
  {
    id: 16,
    title: 'Fluxograma Geral de Diagnóstico',
    summary: 'Caminho correto para evitar retrabalho e condenação errada.',
    sections: [
      {
        heading: 'Passo a Passo do Fluxograma',
        items: [
          'Aparelho chegou desligado: colete relato e sinais de líquido ou queda.',
          'Teste no USB charger: consumo direto alto indica curto.',
          'Teste na fonte: zero consumo, sobe e zera, ou aparece e trava.',
          'Desconecte periféricos para isolar defeitos externos.',
          'Use jumper, esquema e medições apenas após a triagem inicial.',
          'Pare quando os testes principais já apontarem a causa provável.',
        ],
      },
    ],
    tags: ['fluxograma', 'triagem', 'diagnostico'],
  },
  {
    id: 17,
    title: 'Consumo Anormal / Linha em Curto',
    summary: 'O aparelho não liga, mas puxa corrente na fonte.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Conecte na fonte em 4.2V com limite de corrente.',
          'Consumo antes do power aponta curto na linha primária.',
          'Consumo só após power aponta falha de comunicação ou tensão secundária.',
          'Consumo pulsa e zera pode indicar falha de inicialização.',
        ],
      },
    ],
    tags: ['curto', 'linha', 'corrente'],
  },
  {
    id: 18,
    title: 'Bateria Boa, mas Aparelho Não Liga',
    summary: 'Funciona na fonte, mas ignora a bateria.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Meça a bateria: abaixo de 3.7V pode impedir partida.',
          'Confira pino BSI/ID e trilhas de identificação.',
          'Se liga na fonte e não liga com bateria nova, verifique circuito de carga.',
          'Se desliga ao tirar carregador, confira conector e encaixe da bateria.',
        ],
      },
    ],
    tags: ['bateria', 'bsi', 'fonte'],
  },
  {
    id: 19,
    title: 'Carrega, mas Não Sobe Porcentagem',
    summary: 'O raio aparece, mas a carga é falsa.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Teste com USB charger e amperímetro.',
          'Consumo abaixo de 0.45A indica que o CI de carga pode não estar chaveando.',
          'Consumo normal, mas porcentagem não sobe: verifique linha fuel gauge.',
          'Ícone de temperatura alta pode indicar falha no termistor NTC.',
        ],
      },
    ],
    tags: ['carga', 'porcentagem', 'fuel gauge', 'ntc'],
  },
  {
    id: 20,
    title: 'Loop Infinito',
    summary: 'O aparelho tenta ligar e reinicia em ciclo.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Teste boot sem periféricos: câmeras, sensores, biometria e subplaca.',
          'Se liga sem câmera, substitua a câmera defeituosa.',
          'Se continua em loop, teste software, recovery ou DFU quando aplicável.',
          'Se trava na logo e esquenta, investigue CPU, memória ou setor gráfico.',
        ],
      },
    ],
    tags: ['loop', 'bootloop', 'reinicia'],
  },
  {
    id: 21,
    title: 'Sem Rede / Sem Sinal',
    summary: 'Aparelho com chip inserido, mas sem serviço.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Digite *#06# e confirme IMEI.',
          'Sem IMEI ou baseband em branco: confira alimentação do setor RF.',
          'IMEI ok, mas só emergência: confira antena e amplificador de sinal.',
          'Sinal oscilando: verifique filtros, coaxial e conexão de antena.',
        ],
      },
    ],
    tags: ['rede', 'sinal', 'imei', 'baseband'],
  },
  {
    id: 22,
    title: 'Wi-Fi ou Bluetooth Não Ativa',
    summary: 'Falha ao tentar ativar serviços de rede sem fio.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Tente ativar nas configurações.',
          'Botão cinza indica que o sistema não detecta o hardware.',
          'Meça linha always-on de 1.8V do CI de Wi-Fi.',
          'Ativa, mas não acha redes: confira antena, filtro e continuidade.',
        ],
      },
    ],
    tags: ['wifi', 'bluetooth', 'rede sem fio'],
  },
  {
    id: 23,
    title: 'Microfone ou Áudio Falhando',
    summary: 'Problemas na captura ou reprodução de som.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Grave áudio no sistema e teste alto-falante.',
          'Áudio baixo ou abafado pode ser sujeira física nas grades.',
          'Sem áudio em microfone e falante: suspeite de codec de áudio.',
          'Ruído de estática aponta aterramento ou componente de linha.',
        ],
      },
    ],
    tags: ['audio', 'microfone', 'codec'],
  },
  {
    id: 24,
    title: 'Câmera Não Abre',
    summary: 'Aplicativo da câmera apresenta tela preta ou erro.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Abra o app de lanterna antes da câmera.',
          'Lanterna não liga: suspeite de curto na linha da câmera traseira.',
          'Remova a câmera principal e teste a lanterna.',
          'Tela preta ao abrir app: meça tensões no conector FPC.',
        ],
      },
    ],
    tags: ['camera', 'lanterna', 'fpc'],
  },
  {
    id: 25,
    title: 'Superaquecimento',
    summary: 'O aparelho esquenta excessivamente durante uso ou carga.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Localize onde esquenta com breu, álcool ou câmera térmica.',
          'Esquenta ao carregar: investigue CI de carga e capacitores próximos.',
          'Esquenta em uso leve: procure curto parcial em malha secundária.',
          'Identifique o componente antes de aplicar injeção de tensão.',
        ],
      },
    ],
    tags: ['superaquecimento', 'temperatura', 'aquecimento'],
  },
  {
    id: 26,
    title: 'Descarga Rápida de Bateria',
    summary: 'A bateria não dura o tempo esperado.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Monitore consumo em repouso.',
          'Consumo acima de 0.010A em repouso indica fuga de corrente.',
          'Confira CIs de periféricos como Wi-Fi, áudio e câmera.',
          'Se consumo zerado em repouso e bateria desce rápido, teste bateria original.',
        ],
      },
    ],
    tags: ['bateria', 'descarga', 'fuga'],
  },
  {
    id: 27,
    title: 'Tela Funciona Parcialmente',
    summary: 'Problemas visuais ou toques fantasmas no display/touch.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Faça teste de touch movendo ícone por toda a tela.',
          'Linha vertical ou horizontal costuma indicar quebra física ou display.',
          'Toques fantasmas podem vir de oxidação no FPC da placa.',
          'Limpe conector com pincel e álcool isopropílico antes de condenar placa.',
        ],
      },
    ],
    tags: ['tela', 'display', 'touch'],
  },
  {
    id: 28,
    title: 'Sem Iluminação',
    summary: 'O aparelho liga, mas a tela fica completamente escura.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Use lanterna contra a tela para verificar imagem ao fundo.',
          'Tem imagem sem luz: falha no circuito booster de backlight.',
          'Teste diodo de backlight, bobina principal e trilhas do display.',
          'Confirme tela e FPC antes de mexer na placa.',
        ],
      },
    ],
    tags: ['backlight', 'display', 'sem luz'],
  },
  {
    id: 29,
    title: 'Conecta USB, mas Não Reconhece no PC',
    summary: 'Comunicação de dados falha, mesmo podendo carregar.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Teste com cabo de dados original.',
          'Se carrega e não reconhece, confira linhas D+ e D- do USB.',
          'Meça continuidade reversa nas linhas de dados.',
          'Se alterado, suspeite de conector, subplaca ou CI de interface.',
        ],
      },
    ],
    tags: ['usb', 'dados', 'pc'],
  },
  {
    id: 30,
    title: 'Sensor de Proximidade Não Funciona',
    summary: 'A tela não apaga durante ligações.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Faça ligação e tampe o sensor.',
          'Se a tela não apaga, confira película, tela trocada e janela do sensor.',
          'Limpe a janela do sensor por dentro.',
          'Teste flex ou sensor se a alimentação estiver correta.',
        ],
      },
    ],
    tags: ['sensor', 'proximidade', 'ligacao'],
  },
  {
    id: 31,
    title: 'Desliga Sozinho',
    summary: 'O aparelho desliga inesperadamente durante o uso.',
    sections: [
      {
        heading: 'Teste Inicial e Análise',
        items: [
          'Verifique panic log quando aplicável ou log do sistema.',
          'Desliga ao balançar: contato de bateria frouxo.',
          'Aperte e limpe as garras do conector da bateria.',
          'Desliga em carga pesada: investigue falha térmica e capacitores de filtro.',
        ],
      },
    ],
    tags: ['desliga', 'panic log', 'bateria'],
  },
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function chapterLabel(chapters: number[]) {
  if (chapters.length === 1) return `Ver Capítulo ${chapters[0]}`;
  const last = chapters[chapters.length - 1];
  return `Ver Capítulos ${chapters.slice(0, -1).join(', ')} e ${last}`;
}

function chapterMatchesSearch(chapter: ManualChapter, search: string) {
  const haystack = normalizeText(
    [
      chapter.title,
      chapter.summary,
      ...chapter.tags,
      ...chapter.sections.flatMap((section) => [section.heading, section.note ?? '', ...section.items]),
    ].join(' '),
  );

  return haystack.includes(search);
}

function decisionMatchesSearch(decision: QuickDecision, search: string) {
  const haystack = normalizeText([
    decision.title,
    decision.signal,
    ...decision.tags,
    ...decision.chapters.map(String),
  ].join(' '));

  return haystack.includes(search);
}

export default function ManualDoReparoPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = normalizeText(searchTerm.trim());

  const filteredDecisions = useMemo(() => {
    if (!normalizedSearch) return quickDecisions;
    return quickDecisions.filter((decision) => decisionMatchesSearch(decision, normalizedSearch));
  }, [normalizedSearch]);

  const filteredChapters = useMemo(() => {
    if (!normalizedSearch) return manualChapters;
    return manualChapters.filter((chapter) => chapterMatchesSearch(chapter, normalizedSearch));
  }, [normalizedSearch]);

  return (
    <section className="-m-10 min-h-screen bg-[#eef2f5] pb-12 text-[#24313f]">
      <header className="sticky top-0 z-20 border-b border-[#0b3d7a]/30 bg-[#0f4f9e] px-6 py-5 shadow-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-white">
            <Link
              href="/dashboard/central-tecnico"
              className="inline-flex h-10 w-10 items-center justify-center rounded bg-white/10 text-xl font-black transition-colors hover:bg-white/20"
              aria-label="Voltar para a Central do Técnico"
            >
              ←
            </Link>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">Central do Técnico</p>
              <h1 className="text-2xl font-black tracking-tight">Guia de Reparo</h1>
            </div>
          </div>

          <label className="relative block w-full max-w-xl">
            <span className="sr-only">Buscar defeito, sintoma ou capítulo</span>
            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748b]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-12 w-full rounded border-0 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-[#0f172a] shadow-sm outline-none ring-2 ring-transparent transition-all placeholder:text-[#64748b] focus:ring-[#f4c400]"
              placeholder="Buscar defeito, sintoma ou capítulo"
            />
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <section className="text-center">
          <h2 className="text-3xl font-black uppercase tracking-wide text-[#0f4f9e]">Página de Decisão Rápida</h2>
          <p className="mx-auto mt-5 max-w-3xl text-base font-medium leading-7 text-[#475569]">
            Use esta página quando o aparelho chegar na bancada. Leia o comportamento, encontre o sintoma mais próximo e avance para os capítulos indicados.
          </p>
          <p className="mt-2 text-lg font-black text-[#334155]">Diagnóstico é método. Tentativa é prejuízo.</p>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredDecisions.map((decision) => (
            <article key={decision.title} className="flex min-h-[164px] flex-col justify-between border border-[#d8dee6] bg-white p-5 shadow-sm">
              <div>
                <h3 className="text-lg font-black leading-7 text-[#1785df]">{decision.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#475569]">
                  <strong>Sintomas:</strong> {decision.signal.replace(/^Na fonte: /, '').replace(/^Sintomas: /, '')}
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {decision.chapters.map((chapter) => (
                  <a
                    key={`${decision.title}-${chapter}`}
                    href={`#cap-${chapter}`}
                    className="inline-flex items-center rounded bg-[#e3f2ff] px-3 py-2 text-sm font-black text-[#1785df] transition-colors hover:bg-[#cfe9ff]"
                  >
                    Cap. {chapter}
                  </a>
                ))}
              </div>
              <p className="mt-3 rounded bg-[#e3f2ff] px-3 py-2 text-sm font-black text-[#1785df]">{chapterLabel(decision.chapters)}</p>
            </article>
          ))}
        </section>

        {filteredChapters.length === 0 ? (
          <div className="mt-10 border border-[#d8dee6] bg-white p-8 text-center shadow-sm">
            <h3 className="text-xl font-black text-[#0f4f9e]">Nenhum resultado encontrado</h3>
            <p className="mt-2 text-sm font-medium text-[#64748b]">Tente buscar por consumo, bateria, carga, tela, rede, boot ou curto.</p>
          </div>
        ) : (
          <section className="mt-10 space-y-8">
            {filteredChapters.map((chapter) => (
              <article
                key={chapter.id}
                id={`cap-${chapter.id}`}
                className="scroll-mt-28 overflow-hidden border border-[#d8dee6] border-t-4 border-t-[#1785df] bg-white shadow-sm"
              >
                <div className="p-6 sm:p-8">
                  <h2 className="text-2xl font-black leading-tight text-[#0f4f9e] sm:text-3xl">
                    Cap. {chapter.id} - {chapter.title}
                  </h2>
                  <p className="mt-4 border-b border-[#e5e7eb] pb-5 text-base font-medium leading-7 text-[#475569]">
                    {chapter.summary}
                  </p>

                  <div className="mt-6 space-y-5">
                    {chapter.sections.map((section) => (
                      <details key={section.heading} className="group overflow-hidden border border-[#d8dee6] bg-white">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-[#e3f2ff] px-5 py-4 text-lg font-black text-[#1785df] transition-colors hover:bg-[#cfe9ff] [&::-webkit-details-marker]:hidden">
                          <span>{section.heading}</span>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white text-base shadow-sm transition-transform group-open:rotate-180" aria-hidden="true">
                            ↓
                          </span>
                        </summary>
                        <div className="border-t border-[#d8dee6] px-5 py-5">
                          <ul className="space-y-3 text-sm font-medium leading-6 text-[#334155]">
                            {section.items.map((item) => (
                              <li key={item} className="flex gap-3">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1785df]" aria-hidden="true" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                          {section.note && (
                            <p className="mt-5 border-l-4 border-[#f4c400] bg-[#fff8d8] px-4 py-3 text-sm font-bold italic leading-6 text-[#334155]">
                              {section.note}
                            </p>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </section>
  );
}
