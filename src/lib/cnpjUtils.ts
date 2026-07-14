export type CnpjServiceErrorCode =
  | 'CNPJ_INCOMPLETO'
  | 'CNPJ_INVALIDO'
  | 'CNPJ_NAO_ENCONTRADO'
  | 'API_INDISPONIVEL'
  | 'LIMITE_CONSULTAS'
  | 'FALHA_CONEXAO'
  | 'RESPOSTA_INVALIDA';

export interface BrasilApiCnpjResponse {
  cnpj?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  ddd_telefone_1?: string | null;
  email?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  [key: string]: unknown;
}

export interface ClienteCnpjData {
  razaoSocial: string;
  nomeFantasia: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export class CnpjServiceError extends Error {
  code: CnpjServiceErrorCode;
  status?: number;

  constructor(code: CnpjServiceErrorCode, status?: number) {
    super(code);
    this.name = 'CnpjServiceError';
    this.code = code;
    this.status = status;
  }
}

const CNPJ_ERROR_MESSAGES: Record<CnpjServiceErrorCode, string> = {
  CNPJ_INCOMPLETO: 'Digite o CNPJ completo.',
  CNPJ_INVALIDO: 'Digite um CNPJ v\u00e1lido.',
  CNPJ_NAO_ENCONTRADO: 'CNPJ n\u00e3o encontrado.',
  API_INDISPONIVEL:
    'N\u00e3o foi poss\u00edvel consultar o CNPJ neste momento. Voc\u00ea ainda pode preencher os dados manualmente.',
  LIMITE_CONSULTAS:
    'Limite de consultas atingido. Tente novamente em alguns instantes ou preencha manualmente.',
  FALHA_CONEXAO:
    'Falha de conex\u00e3o ao consultar o CNPJ. Voc\u00ea ainda pode preencher os dados manualmente.',
  RESPOSTA_INVALIDA:
    'A consulta retornou uma resposta inesperada. Voc\u00ea ainda pode preencher os dados manualmente.',
};

export function limparCnpj(value: string) {
  return value.replace(/\D/g, '');
}

export function validarCnpj(value: string) {
  const cnpj = limparCnpj(value);

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcularDigito = (base: string, pesos: number[]) => {
    const soma = base
      .split('')
      .reduce((total, digito, index) => total + Number(digito) * pesos[index], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiroDigito = calcularDigito(cnpj.slice(0, 12), [
    5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);
  const segundoDigito = calcularDigito(cnpj.slice(0, 13), [
    6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);

  return primeiroDigito === Number(cnpj[12]) && segundoDigito === Number(cnpj[13]);
}

export function mensagemErroCnpj(error: CnpjServiceErrorCode | CnpjServiceError) {
  const code = error instanceof CnpjServiceError ? error.code : error;
  return CNPJ_ERROR_MESSAGES[code] ?? CNPJ_ERROR_MESSAGES.API_INDISPONIVEL;
}

function normalizarCampo(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function mapearBrasilApiParaCliente(data: BrasilApiCnpjResponse): ClienteCnpjData {
  return {
    razaoSocial: normalizarCampo(data.razao_social),
    nomeFantasia: normalizarCampo(data.nome_fantasia),
    telefone: normalizarCampo(data.ddd_telefone_1),
    email: normalizarCampo(data.email),
    cep: normalizarCampo(data.cep),
    logradouro: normalizarCampo(data.logradouro),
    numero: normalizarCampo(data.numero),
    complemento: normalizarCampo(data.complemento),
    bairro: normalizarCampo(data.bairro),
    cidade: normalizarCampo(data.municipio),
    uf: normalizarCampo(data.uf).toUpperCase(),
  };
}
