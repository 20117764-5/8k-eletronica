import { NextResponse } from 'next/server';
import { consultarCnpjBrasilApi } from '@/lib/cnpjService';
import {
  type CnpjServiceErrorCode,
  CnpjServiceError,
  mensagemErroCnpj,
} from '@/lib/cnpjUtils';

export const dynamic = 'force-dynamic';

type CnpjRouteContext = {
  params: Promise<{
    cnpj: string;
  }>;
};

const STATUS_BY_CODE: Record<CnpjServiceErrorCode, number> = {
  CNPJ_INCOMPLETO: 400,
  CNPJ_INVALIDO: 400,
  CNPJ_NAO_ENCONTRADO: 404,
  API_INDISPONIVEL: 503,
  LIMITE_CONSULTAS: 429,
  FALHA_CONEXAO: 503,
  RESPOSTA_INVALIDA: 502,
};

export async function GET(_request: Request, context: CnpjRouteContext) {
  const { cnpj } = await context.params;

  try {
    const data = await consultarCnpjBrasilApi(cnpj);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof CnpjServiceError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: mensagemErroCnpj(error),
          },
        },
        { status: STATUS_BY_CODE[error.code] ?? 503 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'API_INDISPONIVEL',
          message: mensagemErroCnpj('API_INDISPONIVEL'),
        },
      },
      { status: 503 },
    );
  }
}
