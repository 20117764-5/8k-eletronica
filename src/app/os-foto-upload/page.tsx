"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  type OsFoto,
  type OsFotoUploadToken,
  carregarTokenUploadFotos,
  isFotosSetupMissing,
  listarFotosOs,
  tokenUploadExpirado,
  uploadFotoOs,
} from '@/lib/osFotos';

function formatarTamanho(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

function FotoUploadMobile() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [tokenData, setTokenData] = useState<OsFotoUploadToken | null>(null);
  const [fotos, setFotos] = useState<OsFoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregarToken() {
      if (!token) {
        setErro('Link de envio invalido.');
        setIsLoading(false);
        return;
      }

      try {
        const data = await carregarTokenUploadFotos(token);

        if (tokenUploadExpirado(data)) {
          setErro('Este link de envio expirou. Gere um novo QR Code na tela da O.S.');
          return;
        }

        setTokenData(data);
        const lista = await listarFotosOs({
          osId: data.os_id,
          token: data.token,
        });
        setFotos(lista);
      } catch (error) {
        console.error('Erro ao carregar token de fotos:', error);
        setErro(
          isFotosSetupMissing(error)
            ? 'A area de fotos ainda precisa ser configurada no Supabase.'
            : 'Nao foi possivel validar este link de envio.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void carregarToken();
  }, [token]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !tokenData) return;

    setIsUploading(true);
    setMensagem('');
    setErro('');

    try {
      const novasFotos: OsFoto[] = [];

      for (const file of files) {
        const foto = await uploadFotoOs({
          file,
          token: tokenData.token,
          osId: tokenData.os_id,
          origem: 'celular',
        });
        novasFotos.push(foto);
      }

      setFotos((listaAtual) => [...novasFotos, ...listaAtual]);
      setMensagem(`${novasFotos.length} foto(s) enviada(s) com sucesso.`);
    } catch (error) {
      console.error('Erro ao enviar foto pelo celular:', error);
      setErro('Nao foi possivel enviar as fotos. Tente novamente ou avise a recepcao.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const bloqueado = isLoading || Boolean(erro) || !tokenData;

  return (
    <main className="min-h-screen bg-[#f0f9ff] px-4 py-6">
      <div className="mx-auto max-w-md space-y-5">
        <div className="rounded-3xl border border-[#d8a900]/40 bg-[#f4c400] p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
              <Image src="/logo.png" alt="8K Eletronica" width={48} height={48} className="h-12 w-12 rounded-full object-contain" priority />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#6d6251]">8K Eletronica</p>
              <h1 className="text-xl font-black text-[#0a0a0a]">Fotos da O.S.</h1>
            </div>
          </div>
          <p className="mt-4 text-sm font-bold text-[#6d6251]">
            Tire ou envie fotos do aparelho. Elas ficarao vinculadas automaticamente a esta O.S.
          </p>
        </div>

        {isLoading && (
          <div className="rounded-2xl bg-white p-5 text-center text-sm font-black text-[#0a6787] shadow-sm">
            Validando link...
          </div>
        )}

        {erro && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-600 shadow-sm">
            {erro}
          </div>
        )}

        {mensagem && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-700 shadow-sm">
            {mensagem}
          </div>
        )}

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <label className={`flex min-h-36 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-all ${bloqueado ? 'border-gray-200 bg-gray-50 text-gray-400' : 'border-[#f4c400] bg-[#fffdf3] text-[#0a0a0a]'}`}>
            <span className="text-4xl" aria-hidden="true">&#128247;</span>
            <span className="mt-3 text-base font-black">
              {isUploading ? 'Enviando fotos...' : 'Tirar ou escolher fotos'}
            </span>
            <span className="mt-1 text-xs font-bold text-[#6d6251]">
              Use a camera do celular ou selecione imagens da galeria.
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              disabled={bloqueado || isUploading}
              onChange={handleUpload}
            />
          </label>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase text-[#0a6787]">Fotos enviadas</h2>
            <span className="rounded-full bg-[#f0f9ff] px-3 py-1 text-xs font-black text-[#0a6787]">{fotos.length}</span>
          </div>

          {fotos.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#e0f1f7] p-5 text-center text-sm font-bold text-gray-400">
              Nenhuma foto enviada ainda.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {fotos.map((foto) => (
                <a key={foto.id} href={foto.signedUrl || '#'} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-2xl border border-[#e0f1f7]">
                  <div className="aspect-square bg-[#f8fcff]">
                    {foto.signedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={foto.signedUrl} alt={foto.arquivo_nome || 'Foto da O.S.'} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-bold text-gray-400">Sem preview</div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-[11px] font-black text-[#0a6787]">{foto.arquivo_nome || 'Foto'}</p>
                    <p className="text-[10px] font-bold uppercase text-gray-400">{formatarTamanho(foto.tamanho_bytes)}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function OsFotoUploadPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold text-[#0a6787]">Carregando...</div>}>
      <FotoUploadMobile />
    </Suspense>
  );
}
