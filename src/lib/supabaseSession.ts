import { supabase } from '@/lib/supabase';

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

type SupabaseQueryResult<T> = {
  data: T | null;
  error: SupabaseErrorLike | null;
};

export class SessionExpiredError extends Error {
  constructor() {
    super('Sessão expirada. Faça login novamente.');
    this.name = 'SessionExpiredError';
  }
}

function isJwtExpired(error: SupabaseErrorLike | null | undefined) {
  return error?.code === 'PGRST303' || error?.message?.toLowerCase().includes('jwt expired');
}

async function clearExpiredSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    await supabase.auth.signOut();
  }
}

export async function runSupabaseQuery<T>(
  operation: () => PromiseLike<SupabaseQueryResult<T>>
) {
  let result = await operation();

  if (!isJwtExpired(result.error)) {
    if (result.error) throw result.error;
    return result.data;
  }

  const { data, error } = await supabase.auth.refreshSession();

  if (error || !data.session) {
    await clearExpiredSession();
    throw new SessionExpiredError();
  }

  result = await operation();

  if (isJwtExpired(result.error)) {
    await clearExpiredSession();
    throw new SessionExpiredError();
  }

  if (result.error) throw result.error;
  return result.data;
}
