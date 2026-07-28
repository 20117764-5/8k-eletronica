"use client";

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  type OsFoto,
  garantirTokenUploadFotos,
  isFotosSetupMissing,
  listarFotosOs,
  uploadFotoOs,
} from '@/lib/osFotos';

type OsFotosSectionProps = {
  osId?: number | null;
  uploadToken: string;
  onFotosCountChange?: (count: number) => void;
};

function formatarTamanho(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

function isLocalhostUrl(url: string) {
  return /localhost|127\.0\.0\.1/i.test(url);
}

export default function OsFotosSection({ osId, uploadToken, onFotosCountChange }: OsFotosSectionProps) {
  const [fotos, setFotos] = useState<OsFoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [baseUrlCelular, setBaseUrlCelular] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const uploadUrlCelular = useMemo(() => {
    const base = baseUrlCelular.replace(/\/$/, '');
    if (!base || !uploadToken) return '';
    return `${base}/os-foto-upload?token=${encodeURIComponent(uploadToken)}`;
  }, [baseUrlCelular, uploadToken]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrlCelular(window.location.origin);
    }
  }, []);

  useEffect(() => {
    onFotosCountChange?.(fotos.length);
  }, [fotos.length, onFotosCountChange]);

  useEffect(() => {
    async function prepararToken() {
      if (!uploadToken) return;

      try {
        await garantirTokenUploadFotos(uploadToken, osId);
        setSetupError('');
      } catch (error) {
        console.warn('Configuracao de fotos da O.S. pendente:', error);
        setSetupError(
          'A area de fotos precisa da tabela e do bucket no Supabase. A O.S. pode ser salva normalmente.',
        );
      }
    }

    void prepararToken();
  }, [osId, uploadToken]);

  useEffect(() => {
    async function carregarFotos() {
      if (!uploadToken && !osId) return;

      setIsLoading(true);
      try {
        const lista = await listarFotosOs({ osId, token: uploadToken });
        setFotos(lista);
        setSetupError('');
      } catch (error) {
        if (isFotosSetupMissing(error)) {
          setSetupError(
            'A area de fotos precisa da tabela e do bucket no Supabase. A O.S. pode ser salva normalmente.',
          );
        } else {
          console.error('Erro ao carregar fotos da O.S.:', error);
          setSetupError('Nao foi possivel carregar as fotos desta O.S.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void carregarFotos();
  }, [osId, uploadToken]);

  useEffect(() => {
    if (!uploadUrlCelular) {
      setQrCodeUrl('');
      return;
    }

    QRCode.toDataURL(uploadUrlCelular, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0a0a0a',
        light: '#ffffff',
      },
    })
      .then(setQrCodeUrl)
      .catch(() => setQrCodeUrl(''));
  }, [uploadUrlCelular]);

  const handleUploadArquivos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !uploadToken) return;

    setIsUploading(true);
    try {
      await garantirTokenUploadFotos(uploadToken, osId);
      const fotosEnviadas: OsFoto[] = [];

      for (const file of files) {
        const foto = await uploadFotoOs({
          file,
          token: uploadToken,
          osId,
          origem: 'computador',
        });
        fotosEnviadas.push(foto);
      }

      setFotos((listaAtual) => [...fotosEnviadas, ...listaAtual]);
      setSetupError('');
    } catch (error) {
      console.error('Erro ao enviar fotos da O.S.:', error);
      alert('Nao foi possivel enviar as fotos. Confira a configuracao do Supabase.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const recarregarFotos = async () => {
    setIsLoading(true);
    try {
      const lista = await listarFotosOs({ osId, token: uploadToken });
      setFotos(lista);
      setSetupError('');
    } catch (error) {
      console.error('Erro ao atualizar fotos da O.S.:', error);
      alert('Nao foi possivel atualizar a lista de fotos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-[#f4c400]/70 bg-[#fffdf3] p-5">
      <div className="mb-4 flex flex-col gap-3 border-b border-[#f4c400]/40 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-[#0a0a0a]">Fotos do aparelho</h3>
          <p className="mt-1 text-xs font-bold text-[#6d6251]">
            Anexe fotos pelo computador ou use o QR Code para enviar direto pelo celular.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#0a6787] px-4 py-2 text-xs font-black text-white shadow-sm transition-all hover:bg-[#08526c]">
            {isUploading ? 'Enviando...' : 'Anexar do computador'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={isUploading}
              onChange={handleUploadArquivos}
            />
          </label>
          <button
            type="button"
            onClick={recarregarFotos}
            disabled={isLoading}
            className="rounded-xl border border-[#d8a900] bg-white px-4 py-2 text-xs font-black text-[#0a0a0a] transition-all hover:bg-[#f4c400] disabled:opacity-60"
          >
            {isLoading ? 'Atualizando...' : 'Atualizar fotos'}
          </button>
        </div>
      </div>

      {setupError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700">
          {setupError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-[#efe3a7] bg-white p-4">
            <p className="text-xs font-black uppercase text-[#0a0a0a]">Enviar pelo celular</p>
            <p className="mt-1 text-[11px] font-bold text-[#6d6251]">
              Escaneie o QR Code no celular e tire/envie as fotos do aparelho.
            </p>

            <div className="mt-4 flex justify-center rounded-xl bg-[#f8fcff] p-3">
              {qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrCodeUrl} alt="QR Code para enviar fotos pelo celular" className="h-44 w-44" />
              ) : (
                <div className="flex h-44 w-44 items-center justify-center text-center text-xs font-bold text-gray-400">
                  Gerando QR Code...
                </div>
              )}
            </div>

            <label className="mt-4 block text-[10px] font-black uppercase text-[#6d6251]">Endereco usado no QR Code</label>
            <input
              type="text"
              value={baseUrlCelular}
              onChange={(event) => setBaseUrlCelular(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#efe3a7] bg-white px-3 py-2 text-xs font-bold text-[#0a6787] outline-none focus:border-[#f4c400]"
            />
            {isLocalhostUrl(baseUrlCelular) && (
              <p className="mt-2 text-[11px] font-bold text-amber-700">
                No celular, localhost nao abre o computador. Troque pelo IP do computador na rede, ex: http://192.168.0.10:3000.
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          {isLoading ? (
            <div className="rounded-2xl border border-[#efe3a7] bg-white p-8 text-center text-sm font-black text-[#0a6787]">
              Carregando fotos...
            </div>
          ) : fotos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#efe3a7] bg-white p-8 text-center text-sm font-bold text-[#6d6251]">
              Nenhuma foto anexada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {fotos.map((foto) => (
                <a
                  key={foto.id}
                  href={foto.signedUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-2xl border border-[#efe3a7] bg-white shadow-sm transition-all hover:border-[#f4c400] hover:shadow-md"
                >
                  <div className="aspect-square bg-[#f8fcff]">
                    {foto.signedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={foto.signedUrl} alt={foto.arquivo_nome || 'Foto da O.S.'} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-bold text-gray-400">Sem preview</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-black text-[#0a6787]">{foto.arquivo_nome || 'Foto da O.S.'}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-gray-400">
                      {foto.origem || 'upload'} {formatarTamanho(foto.tamanho_bytes)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
