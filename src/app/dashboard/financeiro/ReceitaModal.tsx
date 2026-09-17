"use client";

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ReceitaModal({ onClose, onSaved }: { onClose: () => void; onSaved: (data: string) => void }) {
  const agora = new Date();
  const hoje = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [salvando, setSalvando] = useState(false);
  const trava = useRef(false);
  const [erro, setErro] = useState('');
  const campo = 'mt-1 w-full rounded-xl border border-[#e0f1f7] bg-white px-4 py-3 text-[#0a6787] outline-none focus:border-emerald-500';

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trava.current) return;
    const form = new FormData(event.currentTarget);
    const descricao = String(form.get('descricao') || '').trim();
    const valor = Number(form.get('valor'));
    const data = String(form.get('data_receita') || '');
    if (!descricao || !Number.isFinite(valor) || valor <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      setErro('Preencha a descrição, uma data válida e um valor maior que zero.');
      return;
    }
    trava.current = true;
    setSalvando(true);
    setErro('');
    try {
      const { error } = await supabase.from('receitas_manuais').insert({
        descricao, valor, data_receita: data,
        categoria: String(form.get('categoria')),
        forma_pagamento: String(form.get('forma_pagamento')),
        observacoes: String(form.get('observacoes') || '').trim() || null,
      });
      if (error) throw error;
      onSaved(data);
    } catch (error) {
      console.error('Erro ao registrar receita:', error);
      setErro('Não foi possível salvar. Verifique a conexão e se o cadastro de receitas foi ativado no banco de dados.');
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a6787]/80 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-receita" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-emerald-600 p-6 text-white">
          <h3 id="titulo-receita" className="text-xl font-black">Adicionar receita</h3>
          <button type="button" disabled={salvando} onClick={onClose} aria-label="Fechar cadastro de receita" className="text-xl disabled:opacity-50">✕</button>
        </div>
        <form onSubmit={salvar} className="space-y-4 bg-[#f8fcff] p-6">
          <fieldset disabled={salvando} className="space-y-4 text-sm font-bold text-[#0a6787] disabled:opacity-60">
            <label className="block">Descrição *<input autoFocus name="descricao" required maxLength={300} placeholder="Ex.: Placa vendida no Mercado Livre" className={campo} /></label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>Valor recebido (R$) *<input name="valor" type="number" required min="0.01" max="9999999999.99" step="0.01" placeholder="0,00" className={campo} /></label>
              <label>Data do recebimento *<input name="data_receita" type="date" required defaultValue={hoje} className={campo} /></label>
            </div>
            <p className="text-xs font-normal text-gray-600">No Mercado Livre, informe o valor líquido recebido, após as taxas. Registre apenas entradas que ainda não constam no financeiro.</p>
            <label className="block">Categoria *<select name="categoria" required className={campo}>{['Venda de placas', 'Serviços', 'Outros'].map(c => <option key={c}>{c}</option>)}</select></label>
            <label className="block">Forma de pagamento *<select name="forma_pagamento" required className={campo}>{['Mercado Livre / Mercado Pago', 'Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência', 'Outro'].map(p => <option key={p}>{p}</option>)}</select></label>
            <label className="block">Observações<textarea name="observacoes" rows={3} maxLength={2000} placeholder="Ex.: número do pedido" className={campo} /></label>
          </fieldset>
          {erro && <p role="alert" className="text-sm font-bold text-red-600">{erro}</p>}
          <div className="flex justify-end gap-3 border-t pt-4">
            <button type="button" disabled={salvando} onClick={onClose} className="rounded-xl bg-gray-100 px-5 py-3 font-bold text-gray-600 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={salvando} className="rounded-xl bg-emerald-600 px-5 py-3 font-black text-white hover:bg-emerald-700 disabled:opacity-50">{salvando ? 'Salvando...' : 'Registrar receita'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
