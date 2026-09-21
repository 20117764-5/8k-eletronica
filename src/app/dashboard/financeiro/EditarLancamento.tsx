"use client";

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface LancamentoEditavel {
  id: string;
  tabela: 'despesas' | 'receitas_manuais';
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  forma_pagamento?: string;
  observacoes?: string;
}

export default function EditarLancamento({ lancamento, categoriasDespesa, onClose, onSaved }: {
  lancamento: LancamentoEditavel;
  categoriasDespesa: string[];
  onClose: () => void;
  onSaved: (data: string) => void;
}) {
  const receita = lancamento.tabela === 'receitas_manuais';
  // A data chega do Supabase em ISO; os primeiros 10 caracteres preservam
  // o dia registrado sem deslocamento de fuso horário.
  const dataOriginal = /^\d{4}-\d{2}-\d{2}/.test(lancamento.data)
    ? lancamento.data.slice(0, 10)
    : '';
  const categorias = Array.from(new Set([lancamento.categoria, ...(receita ? ['Venda de placas', 'Serviços', 'Outros'] : categoriasDespesa)]));
  const pagamentos = Array.from(new Set([lancamento.forma_pagamento || '', 'Mercado Livre / Mercado Pago', 'Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência', 'Outro'])).filter(Boolean);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const trava = useRef(false);
  const campo = 'mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#0a6787]';

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trava.current) return;
    const form = new FormData(event.currentTarget);
    const descricao = String(form.get('descricao') || '').trim();
    const valor = Number(form.get('valor'));
    const data = String(form.get('data') || '');
    if (!descricao || !Number.isFinite(valor) || valor <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !dataOriginal) {
      setErro('Informe descrição, data e um valor maior que zero.');
      return;
    }
    trava.current = true;
    setSalvando(true);
    setErro('');
    try {
      const comum = { descricao, valor, categoria: String(form.get('categoria')) };
      const colunaData = receita ? 'data_receita' : 'data_despesa';
      const payload = receita ? {
        ...comum, data_receita: data,
        forma_pagamento: String(form.get('forma_pagamento')),
        observacoes: String(form.get('observacoes') || '').trim() || null,
      } : {
        ...comum,
        // Uma edição só de valor/descrição preserva exatamente a data armazenada.
        data_despesa: data === dataOriginal ? lancamento.data : new Date(`${data}T12:00:00`).toISOString(),
      };
      const { error } = await supabase.from(lancamento.tabela)
        .update(payload)
        .eq('id', lancamento.id)
        .eq('valor', lancamento.valor)
        .eq('descricao', lancamento.descricao)
        .eq(colunaData, receita ? lancamento.data.slice(0, 10) : lancamento.data)
        .select('id')
        .single();
      if (error) throw error;
      onSaved(data);
    } catch {
      setErro('Não foi possível salvar. Confira a conexão e a liberação da edição no banco. Se o lançamento foi alterado em outra tela, feche esta janela e atualize a página.');
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-edicao" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <h3 id="titulo-edicao" className="text-xl font-black text-[#0a6787]">Editar {receita ? 'receita' : 'despesa'}</h3>
        <p className="mt-2 text-sm text-gray-500">Corrija o lançamento e salve. Se mudar a data, ele será contabilizado no mês escolhido.</p>
        <form onSubmit={salvar} className="mt-5 space-y-4">
          <fieldset disabled={salvando} className="space-y-4 text-sm font-bold text-gray-600">
            <label className="block">Descrição *<input autoFocus name="descricao" required maxLength={receita ? 300 : undefined} defaultValue={lancamento.descricao} className={campo} /></label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>Valor (R$) *<input name="valor" type="number" required min="0.01" max="9999999999.99" step="0.01" defaultValue={lancamento.valor} className={campo} /></label>
              <label>Data *<input name="data" type="date" required defaultValue={dataOriginal} className={campo} /></label>
            </div>
            <label className="block">Categoria *<select name="categoria" required defaultValue={lancamento.categoria} className={campo}>{categorias.map(c => <option key={c}>{c}</option>)}</select></label>
            {receita && <>
              <label className="block">Forma de pagamento *<select name="forma_pagamento" required defaultValue={lancamento.forma_pagamento || ''} className={campo}><option value="" disabled>Selecione</option>{pagamentos.map(p => <option key={p}>{p}</option>)}</select></label>
              <label className="block">Observações<textarea name="observacoes" rows={3} maxLength={2000} defaultValue={lancamento.observacoes || ''} className={campo} /></label>
              <p className="text-xs font-normal">Informe o valor líquido recebido. As taxas não serão descontadas novamente.</p>
            </>}
          </fieldset>
          {erro && <p role="alert" className="text-sm font-bold text-red-600">{erro}</p>}
          <div className="flex justify-end gap-3 border-t pt-4">
            <button type="button" disabled={salvando} onClick={onClose} className="rounded-xl bg-gray-100 px-4 py-3 font-bold text-gray-600 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={salvando} className="rounded-xl bg-[#0a6787] px-4 py-3 font-bold text-white disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
