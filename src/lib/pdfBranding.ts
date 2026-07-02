import type { Content } from 'pdfmake/interfaces';

let cachedBrandImage: Promise<string | null> | null = null;
let cachedCellAvariasImage: Promise<string | null> | null = null;

function fetchImageAsDataUrl(path: string) {
  return fetch(path)
    .then((response) => {
      if (!response.ok) return null;
      return response.blob();
    })
    .then((blob) => {
      if (!blob) return null;

      return new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    })
    .catch(() => null);
}

export async function getPdfBrandImage() {
  if (!cachedBrandImage) {
    cachedBrandImage = fetchImageAsDataUrl('/imagem1.png');
  }

  return cachedBrandImage;
}

export async function getPdfCellAvariasImage() {
  if (!cachedCellAvariasImage) {
    cachedCellAvariasImage = fetchImageAsDataUrl('/celular-avarias.png');
  }

  return cachedCellAvariasImage;
}

type PdfHeaderOptions = {
  brandImage: string | null;
  title: string;
  subtitle?: string;
  accentColor?: string;
  compact?: boolean;
  rightLines?: Array<string | { text: string; color?: string; bold?: boolean; fontSize?: number }>;
};

export function buildPdfHeader({
  brandImage,
  title,
  subtitle,
  accentColor = '#f4c400',
  compact = false,
  rightLines = [],
}: PdfHeaderOptions): Content {
  const rightStack = rightLines.map((line) => {
    if (typeof line === 'string') {
      return { text: line, fontSize: compact ? 8.4 : 9, margin: [0, 1, 0, 1] };
    }

    return {
      text: line.text,
      fontSize: line.fontSize ?? (compact ? 8.4 : 9),
      bold: line.bold,
      color: line.color,
      margin: [0, 1, 0, 1],
    };
  });

  return {
    table: {
      widths: compact ? [98, '*', 150] : [130, '*', 165],
      body: [
        [
          brandImage
            ? { image: brandImage, width: compact ? 88 : 118, alignment: 'left', margin: [0, 0, compact ? 5 : 10, 0] }
            : { text: '8K', bold: true, fontSize: compact ? 18 : 22, color: '#111111', margin: [0, compact ? 3 : 8, compact ? 5 : 10, 0] },
          {
            stack: [
              { text: '8K ELETRÔNICA', fontSize: compact ? 14 : 15, bold: true, color: '#111111' },
              { text: 'Assistência Técnica Especializada', fontSize: compact ? 7.4 : 8, bold: true, color: accentColor },
              { text: 'Av Dr Joaquim Nabuco, 1385 Loja 01 Varadouro, Olinda - PE', fontSize: compact ? 7.4 : 8, margin: [0, compact ? 3 : 5, 0, 0] },
              { text: '(81) 9 8267-5319 / (81) 9 9588-1414', fontSize: compact ? 7.4 : 8 },
              { text: 'contato@8keletronica.com.br', fontSize: compact ? 7.4 : 8 },
            ],
            margin: [0, 0, compact ? 5 : 10, 0],
          },
          {
            stack: [
              { text: title, fontSize: compact ? 8.5 : 10, bold: true, alignment: 'right', color: '#111111' },
              ...(subtitle ? [{ text: subtitle, fontSize: compact ? 11.5 : 14, bold: true, alignment: 'right', color: accentColor, margin: [0, 4, 0, compact ? 4 : 5] }] : []),
              ...rightStack.map((line) => ({ ...line, alignment: 'right' as const })),
            ],
          },
        ],
      ],
    },
    layout: {
      hLineColor: () => '#d9d9d9',
      vLineColor: () => '#d9d9d9',
      paddingLeft: () => (compact ? 4 : 6),
      paddingRight: () => (compact ? 4 : 6),
      paddingTop: () => (compact ? 4 : 6),
      paddingBottom: () => (compact ? 4 : 6),
    },
    margin: [0, 0, 0, compact ? 7 : 12],
  } as Content;
}
