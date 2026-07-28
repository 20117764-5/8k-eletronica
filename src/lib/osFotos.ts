import { supabase } from '@/lib/supabase';

export const OS_FOTOS_BUCKET = 'os-fotos';
const TOKEN_EXPIRACAO_HORAS = 24;
const SIGNED_URL_SECONDS = 60 * 60;

export interface OsFoto {
  id: number;
  os_id: number | null;
  upload_token: string | null;
  arquivo_path: string;
  arquivo_nome: string | null;
  tipo_arquivo: string | null;
  tamanho_bytes: number | null;
  origem: string | null;
  created_at: string;
  signedUrl?: string | null;
}

export interface OsFotoUploadToken {
  id: number;
  token: string;
  os_id: number | null;
  expires_at: string;
  created_at: string;
}

export function criarTokenUploadFotos() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getTokenExpiresAt() {
  return new Date(Date.now() + TOKEN_EXPIRACAO_HORAS * 60 * 60 * 1000).toISOString();
}

function sanitizarNomeArquivo(nome: string) {
  const partes = nome.split('.');
  const extensao = partes.length > 1 ? partes.pop() : '';
  const base = partes.join('.') || nome;
  const nomeSeguro = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'foto-os';

  return extensao ? `${nomeSeguro}.${extensao.toLowerCase()}` : nomeSeguro;
}

function montarPathFoto(file: File, token: string, osId?: number | null) {
  const nomeSeguro = sanitizarNomeArquivo(file.name);
  const prefixo = osId ? `os-${osId}` : `pendentes/${token}`;
  return `${prefixo}/${Date.now()}-${nomeSeguro}`;
}

function normalizarFoto(row: Record<string, unknown>): OsFoto {
  return {
    id: Number(row.id),
    os_id: row.os_id === null || row.os_id === undefined ? null : Number(row.os_id),
    upload_token: typeof row.upload_token === 'string' ? row.upload_token : null,
    arquivo_path: String(row.arquivo_path || ''),
    arquivo_nome: typeof row.arquivo_nome === 'string' ? row.arquivo_nome : null,
    tipo_arquivo: typeof row.tipo_arquivo === 'string' ? row.tipo_arquivo : null,
    tamanho_bytes: row.tamanho_bytes === null || row.tamanho_bytes === undefined ? null : Number(row.tamanho_bytes),
    origem: typeof row.origem === 'string' ? row.origem : null,
    created_at: String(row.created_at || ''),
  };
}

export function isFotosSetupMissing(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  const details = 'details' in error && typeof error.details === 'string' ? error.details : '';
  const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : '';
  const text = `${message} ${details} ${hint}`.toLowerCase();

  return (
    text.includes('os_fotos') ||
    text.includes('os_foto_upload_tokens') ||
    text.includes('bucket not found') ||
    text.includes('bucket') ||
    text.includes('schema cache') ||
    text.includes('does not exist') ||
    text.includes('not found')
  );
}

export async function garantirTokenUploadFotos(token: string, osId?: number | null) {
  const payload = {
    token,
    os_id: osId ?? null,
    expires_at: getTokenExpiresAt(),
  };

  const { error } = await supabase
    .from('os_foto_upload_tokens')
    .upsert([payload], { onConflict: 'token' });

  if (error) throw error;
}

export async function carregarTokenUploadFotos(token: string) {
  const { data, error } = await supabase
    .from('os_foto_upload_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error) throw error;

  return data as OsFotoUploadToken;
}

export function tokenUploadExpirado(tokenData: OsFotoUploadToken) {
  return new Date(tokenData.expires_at).getTime() < Date.now();
}

export async function vincularFotosTokenAoOs(token: string, osId: number) {
  const { error: fotosError } = await supabase
    .from('os_fotos')
    .update({ os_id: osId })
    .eq('upload_token', token)
    .is('os_id', null);

  if (fotosError) {
    if (isFotosSetupMissing(fotosError)) return;
    throw fotosError;
  }

  const { error: tokenError } = await supabase
    .from('os_foto_upload_tokens')
    .update({ os_id: osId })
    .eq('token', token);

  if (tokenError && !isFotosSetupMissing(tokenError)) {
    throw tokenError;
  }
}

export async function listarFotosOs({ osId, token }: { osId?: number | null; token?: string }) {
  let query = supabase
    .from('os_fotos')
    .select('*')
    .order('created_at', { ascending: false });

  if (osId) {
    query = query.eq('os_id', osId);
  } else if (token) {
    query = query.eq('upload_token', token);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) throw error;

  const fotos = (data || []).map((item) => normalizarFoto(item as Record<string, unknown>));

  return Promise.all(
    fotos.map(async (foto) => {
      const { data: signedData } = await supabase.storage
        .from(OS_FOTOS_BUCKET)
        .createSignedUrl(foto.arquivo_path, SIGNED_URL_SECONDS);

      return {
        ...foto,
        signedUrl: signedData?.signedUrl || null,
      };
    }),
  );
}

export async function uploadFotoOs({
  file,
  token,
  osId,
  origem,
}: {
  file: File;
  token: string;
  osId?: number | null;
  origem: 'computador' | 'celular';
}) {
  const path = montarPathFoto(file, token, osId);

  const { error: uploadError } = await supabase.storage
    .from(OS_FOTOS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from('os_fotos')
    .insert([{
      os_id: osId ?? null,
      upload_token: token,
      arquivo_path: path,
      arquivo_nome: file.name,
      tipo_arquivo: file.type || null,
      tamanho_bytes: file.size,
      origem,
    }])
    .select()
    .single();

  if (insertError) throw insertError;

  const foto = normalizarFoto(data as Record<string, unknown>);
  const { data: signedData } = await supabase.storage
    .from(OS_FOTOS_BUCKET)
    .createSignedUrl(foto.arquivo_path, SIGNED_URL_SECONDS);

  return {
    ...foto,
    signedUrl: signedData?.signedUrl || null,
  };
}
