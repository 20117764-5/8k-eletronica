"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface OSRecente {
  id: number;
  aparelho_tipo: string;
  defeito_reclamacao: string;
  status: string;
  data_entrada: string;
  cliente: { nome_completo: string } | { nome_completo: string }[] | null;
}

export default function DashboardPage() {
  const [osRecentes, setOsRecentes] = useState<OSRecente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Contadores para os Cards Superiores
  const [kpis, setKpis] = useState({
    naBancada: 0,
    esperandoPecas: 0,
    prontos: 0
  });

  // Dados para o Gráfico dos Últimos 6 Meses
  const [dadosGrafico, setDadosGrafico] = useState<{ mes: string; total: number }[]>([]);
  const [maiorPicoGrafico, setMaiorPicoGrafico] = useState(1); // Evita divisão por zero

  useEffect(() => {
    async function carregarDashboard() {
      setIsLoading(true);

      try {
        // 1. BUSCAR ÚLTIMAS 6 O.S.
        const { data: recentesData, error: recError } = await supabase
          .from('ordens_servico')
          .select('id, aparelho_tipo, defeito_reclamacao, status, data_entrada, cliente:clientes(nome_completo)')
          .order('data_entrada', { ascending: false })
          .limit(6);

        if (recError) throw recError;
        setOsRecentes((recentesData as unknown) as OSRecente[]);

        // 2. BUSCAR TODAS AS O.S. ABERTAS PARA OS KPIS
        const { data: abertasData, error: abertasError } = await supabase
          .from('ordens_servico')
          .select('status')
          .is('data_encerramento', null);

        if (abertasError) throw abertasError;

        let bancada = 0;
        let pecas = 0;
        let prontos = 0;

        // LÓGICA INTELIGENTE DE CONTAGEM (Por palavras-chave)
        abertasData?.forEach(os => {
          const s = (os.status || '').toLowerCase();
          
          if (s.includes('peça')) {
            pecas++;
          } else if (s.includes('pronto') || s.includes('concluído')) {
            prontos++;
          } else if (s.includes('avaliação') || s.includes('análise') || s.includes('conserto') || s.includes('aprovação') || s.includes('autorização')) {
            bancada++;
          }
        });

        setKpis({ naBancada: bancada, esperandoPecas: pecas, prontos });

        // 3. CALCULAR DADOS DO GRÁFICO (Últimos 6 meses)
        const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const hoje = new Date();
        const ultimos6Meses: { mesStr: string; mesNum: number; ano: number; total: number }[] = [];

        // Monta o array dos últimos 6 meses de trás pra frente
        for (let i = 5; i >= 0; i--) {
          const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
          ultimos6Meses.push({
            mesStr: mesesNomes[d.getMonth()],
            mesNum: d.getMonth(),
            ano: d.getFullYear(),
            total: 0
          });
        }

        // Busca a data de entrada apenas dos últimos 6 meses para ser rápido
        const dataCorte = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1).toISOString();
        const { data: grafData } = await supabase
          .from('ordens_servico')
          .select('data_entrada')
          .gte('data_entrada', dataCorte);

        grafData?.forEach(os => {
          const d = new Date(os.data_entrada);
          const mes = d.getMonth();
          const ano = d.getFullYear();
          // Encontra o mês correspondente no nosso array e soma 1
          const idx = ultimos6Meses.findIndex(m => m.mesNum === mes && m.ano === ano);
          if (idx !== -1) ultimos6Meses[idx].total++;
        });

        const graficoFormatado = ultimos6Meses.map(m => ({ mes: m.mesStr, total: m.total }));
        setDadosGrafico(graficoFormatado);
        
        const pico = Math.max(...graficoFormatado.map(g => g.total), 5); // O gráfico terá no mínimo escala 5
        setMaiorPicoGrafico(pico);

      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }

    carregarDashboard();
  }, []);

  // Função para dar cores dinâmicas aos status
  const getCorStatus = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('pronto') || s.includes('concluído') || s.includes('entregue')) 
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (s.includes('peça')) 
      return 'text-purple-700 bg-purple-50 border-purple-200';
    if (s.includes('avaliação') || s.includes('autorização') || s.includes('análise')) 
      return 'text-amber-700 bg-amber-50 border-amber-200';
    if (s.includes('devolvido') || s.includes('condenado') || s.includes('lixo') || s.includes('não aceito') || s.includes('reprovado')) 
      return 'text-red-700 bg-red-50 border-red-200';
    
    return 'text-gray-700 bg-gray-50 border-gray-200'; // Default
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Cards Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7] flex items-center gap-5 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-6xl opacity-5">🛠️</div>
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 text-2xl shadow-inner">
            🛠️
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase">Na Bancada (Análise)</p>
            {isLoading ? (
              <div className="h-8 w-16 bg-gray-100 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-4xl font-black text-[#0a6787]">{kpis.naBancada}</p>
            )}
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7] flex items-center gap-5 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-6xl opacity-5">📦</div>
          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 text-2xl shadow-inner">
            📦
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase">Aguardando Peças</p>
            {isLoading ? (
              <div className="h-8 w-16 bg-gray-100 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-4xl font-black text-[#0a6787]">{kpis.esperandoPecas}</p>
            )}
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7] flex items-center gap-5 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-6xl opacity-5">✅</div>
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 text-2xl shadow-inner">
            ✅
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase">Pronto p/ Entrega</p>
            {isLoading ? (
              <div className="h-8 w-16 bg-gray-100 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-4xl font-black text-[#0a6787]">{kpis.prontos}</p>
            )}
          </div>
        </div>
      </div>

      {/* Seção Central e Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tabela de O.S. Recentes (Ocupa 2 colunas) */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-[#e0f1f7] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#f0f9ff] flex items-center justify-between bg-[#f8fcff]">
            <h2 className="text-xl font-black text-[#0a6787] flex items-center gap-2">
              <span className="w-2 h-6 bg-[#38bdf8] rounded-full"></span>
              Entradas Recentes
            </h2>
            <Link href="/dashboard/nova-os" className="px-5 py-2.5 text-sm font-black text-white bg-[#0a6787] rounded-xl hover:bg-[#07536e] transition-all flex items-center gap-2 shadow-md">
              <span>+</span> Nova O.S.
            </Link>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-[10px] font-bold text-[#73a8bd] uppercase tracking-wider border-b border-[#e0f1f7]">
                <tr>
                  <th className="px-6 py-4">O.S. / Data</th>
                  <th className="px-6 py-4">Cliente / Aparelho</th>
                  <th className="px-6 py-4">Status Atual</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f9ff]">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-[#38bdf8] font-bold animate-pulse">Carregando O.S. recentes...</td></tr>
                ) : osRecentes.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 font-medium">Nenhuma Ordem de Serviço encontrada.</td></tr>
                ) : (
                  osRecentes.map((os) => {
                    const clienteObj = os.cliente as { nome_completo: string } | { nome_completo: string }[] | null;
                    const clienteNome = Array.isArray(clienteObj) ? clienteObj[0]?.nome_completo : clienteObj?.nome_completo;

                    return (
                      <tr key={os.id} className="hover:bg-[#f8fcff] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-black text-[#0a6787]">{String(os.id).padStart(5, '0')}</div>
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                            {new Date(os.data_entrada).toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-800 uppercase">{clienteNome || 'Desconhecido'}</p>
                          <p className="text-xs text-gray-500 mt-1">{os.aparelho_tipo} <span className="text-[#a3d8e8]">•</span> {os.defeito_reclamacao?.substring(0, 30)}...</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full border ${getCorStatus(os.status)} inline-block text-center`}>
                            {os.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/dashboard/alterar-os?id=${os.id}`} className="inline-block px-4 py-2 bg-white border border-[#38bdf8] text-[#0a6787] font-bold rounded-lg hover:bg-[#38bdf8] hover:text-white transition-all text-xs shadow-sm">
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-gray-50 border-t border-[#e0f1f7] text-center">
            <Link href="/dashboard/localizar-os" className="text-xs font-bold text-[#0a6787] hover:underline">Ver todas as Ordens de Serviço ➡️</Link>
          </div>
        </div>

        {/* Gráfico Real com CSS */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-[#0a6787]">Volume de Entradas</h2>
            <span className="px-3 py-1 text-[10px] font-bold bg-[#f0f9ff] text-[#0a6787] rounded-lg uppercase border border-[#e0f1f7]">Últimos 6 meses</span>
          </div>
          
          <div className="flex-1 flex items-end justify-between px-2 gap-2 relative border-b border-[#f0f9ff] pb-6 mt-4">
            {/* Linhas de grade (Background) */}
            <div className="absolute w-full border-t border-dashed border-[#e0f1f7] bottom-[25%] z-0"></div>
            <div className="absolute w-full border-t border-dashed border-[#e0f1f7] bottom-[50%] z-0"></div>
            <div className="absolute w-full border-t border-dashed border-[#e0f1f7] bottom-[75%] z-0"></div>
            <div className="absolute w-full border-t border-dashed border-[#e0f1f7] bottom-[100%] z-0 text-[9px] text-gray-300 -mt-3 right-0">{maiorPicoGrafico}</div>

            {/* Barras do Gráfico */}
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-[#73a8bd] text-sm font-bold animate-pulse">Desenhando gráfico...</div>
            ) : (
              dadosGrafico.map((d, idx) => {
                const alturaPercentual = Math.round((d.total / maiorPicoGrafico) * 100);
                return (
                  <div key={idx} className="relative flex flex-col items-center z-10 w-full group">
                    {/* Tooltip (Hover) */}
                    <div className="absolute -top-8 bg-[#0a6787] text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {d.total} O.S.
                    </div>
                    {/* Barra */}
                    <div 
                      className={`w-full max-w-[40px] rounded-t-lg transition-all duration-1000 ease-out ${idx === dadosGrafico.length - 1 ? 'bg-[#38bdf8] shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 'bg-[#0a6787]/20 hover:bg-[#0a6787]/40'}`} 
                      style={{ height: `${alturaPercentual}%`, minHeight: d.total > 0 ? '10%' : '2%' }}
                    ></div>
                    {/* Label do Mês */}
                    <span className="absolute -bottom-6 text-[10px] font-bold text-gray-500">{d.mes}</span>
                  </div>
                )
              })
            )}
          </div>
          <div className="mt-8 text-center">
             <p className="text-xs text-gray-400 font-medium">O mês destacado representa o volume atual.</p>
          </div>
        </div>

      </div>
    </div>
  );
}