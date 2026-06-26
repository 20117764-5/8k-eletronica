export const centralTecnicoTools = [
  {
    slug: 'manual-do-reparo',
    title: 'Manual do Reparo',
    description: 'Guia prático de diagnóstico passo a passo.',
  },
  {
    slug: 'erros-comuns-na-bancada',
    title: 'Erros Comuns na Bancada',
    description: 'Soluções rápidas para os erros mais frequentes.',
  },
  {
    slug: 'guia-de-abreviacoes',
    title: 'Guia de Abreviações',
    description: 'Dicionário de siglas em componentes eletrônicos.',
  },
  {
    slug: 'ordem-de-servico',
    title: 'Ordem de Serviço',
    description: 'Modelos e apoio para OS de clientes.',
  },
  {
    slug: 'tabela-de-peliculas',
    title: 'Tabela de Películas',
    description: 'Lista de películas compatíveis entre modelos.',
  },
  {
    slug: 'esquemas-eletricos',
    title: 'Esquemas Elétricos',
    description: 'Acesso organizado aos esquemas dos aparelhos.',
  },
  {
    slug: 'material-em-pdf',
    title: 'Material em PDF',
    description: 'Área para materiais técnicos em PDF.',
  },
  {
    slug: 'suporte-whatsapp',
    title: 'Suporte WhatsApp',
    description: 'Canal rápido para tirar dúvidas técnicas.',
  },
] as const;

export type CentralTecnicoTool = (typeof centralTecnicoTools)[number];
export type CentralTecnicoSlug = CentralTecnicoTool['slug'];

export function getCentralTecnicoTool(slug: string) {
  return centralTecnicoTools.find((tool) => tool.slug === slug);
}
