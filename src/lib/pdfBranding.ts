import type { Content } from 'pdfmake/interfaces';

let cachedBrandImage: Promise<string | null> | null = null;

export async function getPdfBrandImage() {
  if (!cachedBrandImage) {
    cachedBrandImage = fetch('/imagem1.png')
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

  return cachedBrandImage;
}

type PdfHeaderOptions = {
  brandImage: string | null;
  title: string;
  subtitle?: string;
  accentColor?: string;
  rightLines?: Array<string | { text: string; color?: string; bold?: boolean; fontSize?: number }>;
};

export function buildPdfHeader({
  brandImage,
  title,
  subtitle,
  accentColor = '#f4c400',
  rightLines = [],
}: PdfHeaderOptions): Content {
  const rightStack = rightLines.map((line) => {
    if (typeof line === 'string') {
      return { text: line, fontSize: 9, margin: [0, 1, 0, 1] };
    }

    return {
      text: line.text,
      fontSize: line.fontSize ?? 9,
      bold: line.bold,
      color: line.color,
      margin: [0, 1, 0, 1],
    };
  });

  return {
    table: {
      widths: [130, '*', 165],
      body: [
        [
          brandImage
            ? { image: brandImage, width: 118, alignment: 'left', margin: [0, 0, 10, 0] }
            : { text: '8K', bold: true, fontSize: 22, color: '#111111', margin: [0, 8, 10, 0] },
          {
            stack: [
              { text: '8K ELETRÔNICA', fontSize: 15, bold: true, color: '#111111' },
              { text: 'Assistência Técnica Especializada', fontSize: 8, bold: true, color: accentColor },
              { text: 'Av Dr Joaquim Nabuco, 1385 Loja 01 Varadouro, Olinda - PE', fontSize: 8, margin: [0, 5, 0, 0] },
              { text: '(81) 9 8267-5319 / (81) 9 9588-1414', fontSize: 8 },
              { text: 'contato@8keletronica.com.br', fontSize: 8 },
              /* { text: 'Chave PIX (CNPJ: 34.700.879/0001-04)', fontSize: 8 },*/
            ],
            margin: [0, 0, 10, 0],
          },
          {
            stack: [
              { text: title, fontSize: 10, bold: true, alignment: 'right', color: '#111111' },
              ...(subtitle ? [{ text: subtitle, fontSize: 14, bold: true, alignment: 'right', color: accentColor, margin: [0, 4, 0, 5] }] : []),
              ...rightStack.map((line) => ({ ...line, alignment: 'right' as const })),
            ],
          },
        ],
      ],
    },
    layout: {
      hLineColor: () => '#d9d9d9',
      vLineColor: () => '#d9d9d9',
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 12],
  } as Content;
}
