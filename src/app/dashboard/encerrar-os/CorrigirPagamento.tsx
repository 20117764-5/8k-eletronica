"use client";

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { calcularPagamento, TAXAS_CREDITO } from '@/lib/taxasCartao';

const FORMAS = ['Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Cortesia / Isento'];
type Pagamento = ReturnType<typeof calcularPagamento> & { forma_pagamento: string };

export default function CorrigirPagamento({ os, onSaved }: {
  os: { id: number; data_encerramento?: string | null; valor_final?: number | null; forma_pagamento?: string | null; parcelas?: number | null };
  onSaved: (pagamento: Pagamento) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [forma, setForma] = useState('');
  const [parcelas, setParcelas] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const trava = useRef(false);
  const valor = os.valor_final == null ? null : Number(os.valor_final);
  const valorValido = valor != null && Number.isFinite(valor) && valor >= 0;
  const numero = forma === 'Cartão de Crédito' ? Number(parcelas) : 1;
  const valido = valorValido && FORMAS.includes(forma) && Number.isInteger(numero) && numero >= 1 && numero <= 12;
  const previa = valido ? calcularPagamento(valor!, forma, numero) : null;
  const campo = 'mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#0a6787]';

  function abrir() {
    setForma(FORMAS.includes(os.forma_pagamento || '') ? os.forma_pagamento! : '');
    setParcelas(os.parcelas ? String(os.parcelas) : '');
    setErro('');
    setSucesso('');
    setAberto(true);
  }

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    if (trava.current) return;
    if (!previa || !os.data_encerramento) {
      setErro('Confira o pagamento e as parcelas. A O.S. precisa ter valor e data de encerramento registrados.');
      return;
    }
    trava.current = true;
    setSalvando(true);
    setErro('');
    try {
      // Atualiza somente o pagamento, usando o total efetivamente salvo na O.S.
      let query = supabase.from('ordens_servico')
        .update({ forma_pagamento: forma, ...previa })
        .eq('id', os.id)
        .eq('data_encerramento', os.data_encerramento)
        .eq('valor_final', valor!);
      query = os.forma_pagamento == null ? query.is('forma_pagamento', null) : query.eq('forma_pagamento', os.forma_pagamento);
      query = os.parcelas == null ? query.is('parcelas', null) : query.eq('parcelas', os.parcelas);
      const { data, error } = await query.select('forma_pagamento, parcelas, taxa_cartao_percentual, valor_taxa_cartao, valor_liquido').single();
      if (error) throw error;
      onSaved(data as Pagamento);
      setAberto(false);
      setSucesso('Pagamento corrigido. As taxas serão consideradas no Financeiro do mês original da O.S.');
    } catch {
      setErro('Não foi possível corrigir. Atualize a página se a O.S. foi alterada em outra tela e confira a conexão. Os campos de parcelas e taxas precisam estar ativados no banco.');
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={abrir} className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-600">Corrigir pagamento</button>
      {sucesso && <p role="status" className="mt-3 text-sm font-bold text-emerald-700">{sucesso}</p>}
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="titulo-correcao" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 text-left shadow-2xl">
            <h3 id="titulo-correcao" className="text-xl font-black text-[#0a6787]">Corrigir pagamento · O.S. {os.id}</h3>
            <p className="mt-2 text-sm text-gray-600">A data de encerramento, a garantia, o desconto e o total pago serão preservados.</p>
            <p className="my-4 font-bold text-[#0a6787]">Total pago registrado: {valorValido ? `R$ ${valor!.toFixed(2)}` : 'Não informado'}</p>
            <form onSubmit={salvar} className="space-y-4">
              <fieldset disabled={salvando} className="space-y-4">
                <label className="block text-sm font-bold text-gray-600">Forma de pagamento
                  <select autoFocus required value={forma} onChange={e => { setForma(e.target.value); setParcelas(''); }} className={campo}>
                    <option value="" disabled>Selecione</option>
                    {FORMAS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </label>
                {forma === 'Cartão de Crédito' && <label className="block text-sm font-bold text-gray-600">Número de parcelas
                  <select required value={parcelas} onChange={e => setParcelas(e.target.value)} className={campo}>
                    <option value="" disabled>Selecione as parcelas da venda</option>
                    {TAXAS_CREDITO.map((taxa, i) => <option key={i + 1} value={i + 1}>{i + 1}x — taxa {taxa.toFixed(2).replace('.', ',')}%</option>)}
                  </select>
                </label>}
              </fieldset>
              {previa && <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                <p>Taxa: {previa.taxa_cartao_percentual.toFixed(2).replace('.', ',')}% · R$ {previa.valor_taxa_cartao.toFixed(2)}</p>
                <p className="mt-2 font-black">Receita após taxa: R$ {previa.valor_liquido.toFixed(2)}</p>
                <p className="mt-2 text-xs">Cálculo pela tabela de taxas cadastrada atualmente.</p>
              </div>}
              {erro && <p role="alert" className="text-sm font-bold text-red-600">{erro}</p>}
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" disabled={salvando} onClick={() => setAberto(false)} className="rounded-xl bg-gray-100 px-4 py-3 font-bold text-gray-600 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={salvando || !valido || !os.data_encerramento} className="rounded-xl bg-[#0a6787] px-4 py-3 font-bold text-white disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar correção'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
