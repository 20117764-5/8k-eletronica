import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { consultarCnpjBrasilApi } from './cnpjService';
import {
  type CnpjServiceErrorCode,
  CnpjServiceError,
  limparCnpj,
  mapearBrasilApiParaCliente,
  validarCnpj,
} from './cnpjUtils';

function mockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function expectCnpjError(code: CnpjServiceErrorCode) {
  return (error: unknown) => {
    assert.ok(error instanceof CnpjServiceError);
    assert.equal(error.code, code);
    return true;
  };
}

describe('CNPJ helpers', () => {
  it('limpa pontos, barras, espacos e tracos da mascara', () => {
    assert.equal(limparCnpj(' 04.252.011/0001-10 '), '04252011000110');
  });

  it('valida matematicamente um CNPJ valido', () => {
    assert.equal(validarCnpj('04.252.011/0001-10'), true);
  });

  it('rejeita um CNPJ matematicamente invalido', () => {
    assert.equal(validarCnpj('11.111.111/1111-11'), false);
  });

  it('mapeia campos ausentes ou nulos sem gerar null ou undefined', () => {
    const mapped = mapearBrasilApiParaCliente({
      cnpj: '04252011000110',
      razao_social: null,
      nome_fantasia: undefined,
      ddd_telefone_1: null,
      email: undefined,
      cep: null,
      logradouro: undefined,
      numero: null,
      complemento: undefined,
      bairro: null,
      municipio: undefined,
      uf: null,
    });

    assert.deepEqual(mapped, {
      razaoSocial: '',
      nomeFantasia: '',
      telefone: '',
      email: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
    });
  });
});

describe('consultarCnpjBrasilApi', () => {
  it('nao consulta a API quando o CNPJ e invalido', async () => {
    let fetchCalled = false;

    await assert.rejects(
      consultarCnpjBrasilApi('11.111.111/1111-11', async () => {
        fetchCalled = true;
        return mockResponse(200, {});
      }),
      expectCnpjError('CNPJ_INVALIDO'),
    );

    assert.equal(fetchCalled, false);
  });

  it('retorna CNPJ incompleto antes de consultar a API', async () => {
    await assert.rejects(
      consultarCnpjBrasilApi('04.252.011', async () => mockResponse(200, {})),
      expectCnpjError('CNPJ_INCOMPLETO'),
    );
  });

  it('consulta a API e mapeia uma resposta bem-sucedida', async () => {
    const result = await consultarCnpjBrasilApi('04.252.011/0001-10', async (url) => {
      assert.equal(url, 'https://brasilapi.com.br/api/cnpj/v1/04252011000110');

      return mockResponse(200, {
        cnpj: '04252011000110',
        razao_social: ' 8K ELETRONICA LTDA ',
        nome_fantasia: ' 8K ELETRONICA ',
        ddd_telefone_1: '8134656042',
        email: 'contato@8keletronica.com.br',
        cep: '50000000',
        logradouro: 'Av. Eng. Antonio de Goes',
        numero: '340',
        complemento: 'Loja 01',
        bairro: 'Pina',
        municipio: 'Recife',
        uf: 'pe',
      });
    });

    assert.deepEqual(result, {
      razaoSocial: '8K ELETRONICA LTDA',
      nomeFantasia: '8K ELETRONICA',
      telefone: '8134656042',
      email: 'contato@8keletronica.com.br',
      cep: '50000000',
      logradouro: 'Av. Eng. Antonio de Goes',
      numero: '340',
      complemento: 'Loja 01',
      bairro: 'Pina',
      cidade: 'Recife',
      uf: 'PE',
    });
  });

  it('usa fallback quando a BrasilAPI falha para um CNPJ ativo', async () => {
    const urls: string[] = [];

    const result = await consultarCnpjBrasilApi('06.990.590/0001-23', async (url) => {
      urls.push(url);

      if (url.startsWith('https://brasilapi.com.br')) {
        return mockResponse(500, {});
      }

      return mockResponse(200, {
        razao_social: 'GOOGLE BRASIL INTERNET LTDA.',
        estabelecimento: {
          nome_fantasia: null,
          ddd1: '11',
          telefone1: '23958400',
          email: 'googlebrasil@google.com',
          cep: '04538133',
          tipo_logradouro: 'AV',
          logradouro: 'BRIG FARIA LIMA',
          numero: '3477',
          complemento: null,
          bairro: 'ITAIM BIBI',
          cidade: { nome: 'Sao Paulo' },
          estado: { sigla: 'SP' },
        },
      });
    });

    assert.deepEqual(urls, [
      'https://brasilapi.com.br/api/cnpj/v1/06990590000123',
      'https://publica.cnpj.ws/cnpj/06990590000123',
    ]);
    assert.deepEqual(result, {
      razaoSocial: 'GOOGLE BRASIL INTERNET LTDA.',
      nomeFantasia: '',
      telefone: '1123958400',
      email: 'googlebrasil@google.com',
      cep: '04538133',
      logradouro: 'AV BRIG FARIA LIMA',
      numero: '3477',
      complemento: '',
      bairro: 'ITAIM BIBI',
      cidade: 'Sao Paulo',
      uf: 'SP',
    });
  });

  it('trata CNPJ nao encontrado', async () => {
    await assert.rejects(
      consultarCnpjBrasilApi('04.252.011/0001-10', async () => mockResponse(404, {})),
      expectCnpjError('CNPJ_NAO_ENCONTRADO'),
    );
  });

  it('trata erro da API', async () => {
    await assert.rejects(
      consultarCnpjBrasilApi('04.252.011/0001-10', async () => mockResponse(500, {})),
      expectCnpjError('API_INDISPONIVEL'),
    );
  });

  it('trata resposta inesperada da API', async () => {
    await assert.rejects(
      consultarCnpjBrasilApi('04.252.011/0001-10', async () => mockResponse(200, { erro: true })),
      expectCnpjError('RESPOSTA_INVALIDA'),
    );
  });
});
