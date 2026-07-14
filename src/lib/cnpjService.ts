import {
  type BrasilApiCnpjResponse,
  type ClienteCnpjData,
  CnpjServiceError,
  limparCnpj,
  mapearBrasilApiParaCliente,
  validarCnpj,
} from './cnpjUtils';

const BRASIL_API_CNPJ_URL = 'https://brasilapi.com.br/api/cnpj/v1';
const CNPJ_WS_URL = 'https://publica.cnpj.ws/cnpj';

type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

function isBrasilApiCnpjResponse(value: unknown): value is BrasilApiCnpjResponse {
  if (!value || typeof value !== 'object') return false;
  return 'cnpj' in value || 'razao_social' in value;
}

type CnpjWsResponse = {
  razao_social?: string | null;
  estabelecimento?: {
    nome_fantasia?: string | null;
    ddd1?: string | null;
    telefone1?: string | null;
    email?: string | null;
    cep?: string | null;
    tipo_logradouro?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: {
      nome?: string | null;
    } | null;
    estado?: {
      sigla?: string | null;
    } | null;
  } | null;
};

function isCnpjWsResponse(value: unknown): value is CnpjWsResponse {
  if (!value || typeof value !== 'object') return false;
  return 'razao_social' in value || 'estabelecimento' in value;
}

function normalizarCampo(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function requestJson(url: string, fetchFn: FetchLike) {
  let response: Awaited<ReturnType<FetchLike>>;

  try {
    response = await fetchFn(url, {
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    throw new CnpjServiceError('FALHA_CONEXAO', 503);
  }

  if (response.status === 404) {
    throw new CnpjServiceError('CNPJ_NAO_ENCONTRADO', 404);
  }

  if (response.status === 429) {
    throw new CnpjServiceError('LIMITE_CONSULTAS', 429);
  }

  if (!response.ok) {
    throw new CnpjServiceError(
      response.status >= 500 ? 'API_INDISPONIVEL' : 'FALHA_CONEXAO',
      response.status,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new CnpjServiceError('RESPOSTA_INVALIDA', 502);
  }
}

async function consultarNaBrasilApi(cnpj: string, fetchFn: FetchLike) {
  const payload = await requestJson(`${BRASIL_API_CNPJ_URL}/${cnpj}`, fetchFn);

  if (!isBrasilApiCnpjResponse(payload)) {
    throw new CnpjServiceError('RESPOSTA_INVALIDA', 502);
  }

  return mapearBrasilApiParaCliente(payload);
}

function mapearCnpjWsParaCliente(data: CnpjWsResponse): ClienteCnpjData {
  const estabelecimento = data.estabelecimento;
  const tipoLogradouro = normalizarCampo(estabelecimento?.tipo_logradouro);
  const logradouro = normalizarCampo(estabelecimento?.logradouro);
  const telefone = [
    normalizarCampo(estabelecimento?.ddd1),
    normalizarCampo(estabelecimento?.telefone1),
  ]
    .filter(Boolean)
    .join('');

  return {
    razaoSocial: normalizarCampo(data.razao_social),
    nomeFantasia: normalizarCampo(estabelecimento?.nome_fantasia),
    telefone,
    email: normalizarCampo(estabelecimento?.email),
    cep: normalizarCampo(estabelecimento?.cep),
    logradouro: [tipoLogradouro, logradouro].filter(Boolean).join(' '),
    numero: normalizarCampo(estabelecimento?.numero),
    complemento: normalizarCampo(estabelecimento?.complemento),
    bairro: normalizarCampo(estabelecimento?.bairro),
    cidade: normalizarCampo(estabelecimento?.cidade?.nome),
    uf: normalizarCampo(estabelecimento?.estado?.sigla).toUpperCase(),
  };
}

async function consultarNoCnpjWs(cnpj: string, fetchFn: FetchLike) {
  const payload = await requestJson(`${CNPJ_WS_URL}/${cnpj}`, fetchFn);

  if (!isCnpjWsResponse(payload)) {
    throw new CnpjServiceError('RESPOSTA_INVALIDA', 502);
  }

  return mapearCnpjWsParaCliente(payload);
}

function deveTentarFallback(error: CnpjServiceError) {
  return !['CNPJ_INCOMPLETO', 'CNPJ_INVALIDO'].includes(error.code);
}

export async function consultarCnpjBrasilApi(
  value: string,
  fetchFn: FetchLike = fetch,
): Promise<ClienteCnpjData> {
  const cnpj = limparCnpj(value);

  if (cnpj.length < 14) {
    throw new CnpjServiceError('CNPJ_INCOMPLETO', 400);
  }

  if (cnpj.length !== 14 || !validarCnpj(cnpj)) {
    throw new CnpjServiceError('CNPJ_INVALIDO', 400);
  }

  try {
    return await consultarNaBrasilApi(cnpj, fetchFn);
  } catch (error) {
    if (!(error instanceof CnpjServiceError) || !deveTentarFallback(error)) {
      throw error;
    }

    try {
      return await consultarNoCnpjWs(cnpj, fetchFn);
    } catch (fallbackError) {
      if (fallbackError instanceof CnpjServiceError) {
        throw fallbackError.code === 'CNPJ_NAO_ENCONTRADO' ? fallbackError : error;
      }

      throw error;
    }
  }
}
