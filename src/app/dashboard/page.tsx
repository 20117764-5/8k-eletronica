import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      
      {/* Cards Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7] flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-[#f0f9ff] flex items-center justify-center text-[#0a6787] text-2xl">
            📑
          </div>
          <div>
            <p className="text-sm text-[#73a8bd]">Aguardando Peças</p>
            <p className="text-3xl font-bold text-[#0a6787]">2</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7] flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-[#e0f7ff] flex items-center justify-center text-[#0a6787] text-2xl">
            🛠️
          </div>
          <div>
            <p className="text-sm text-[#73a8bd]">Em Manutenção</p>
            <p className="text-3xl font-bold text-[#0a6787]">2</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7] flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-[#f0f9ff] flex items-center justify-center text-[#0a6787] text-2xl">
            ✅
          </div>
          <div>
            <p className="text-sm text-[#73a8bd]">Pronto p/ Entrega</p>
            <p className="text-3xl font-bold text-[#0a6787]">1</p>
          </div>
        </div>
      </div>

      {/* Seção Central e Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tabela de O.S. Recentes (Ocupa 2 colunas) */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-[#e0f1f7] overflow-hidden">
          <div className="p-6 border-b border-[#f0f9ff] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0a6787]">O.S. Recentes</h2>
            <div className="flex gap-3">
              <select className="px-4 py-2 text-sm bg-white border border-[#e0f1f7] rounded-xl text-[#73a8bd]">
                <option>Todos</option>
              </select>
              <Link href="/dashboard/nova-os" className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0a6787] rounded-xl hover:bg-[#07536e] transition-all flex items-center gap-2">
                <span>+</span> Nova O.S.
              </Link>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#f0f9ff] text-[11px] font-semibold text-[#73a8bd] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Cliente / Aparelho</th>
                  <th className="px-6 py-4">Defeito</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f9ff]">
                {/* O.S. 1 */}
                <tr className="hover:bg-[#f0f9ff]/50 transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-bold text-[#0a6787]">João Silva</p>
                    <p className="text-xs text-[#73a8bd] mt-1">iPhone 13 - Troca de Tela</p>
                  </td>
                  <td className="px-6 py-5 text-[#0a6787]">Troca de Tela</td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-full border border-amber-100">
                      Na Bancada
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="text-[#a3d8e8] hover:text-[#0a6787]">•••</button>
                  </td>
                </tr>
                {/* O.S. 2 */}
                <tr className="hover:bg-[#f0f9ff]/50 transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-bold text-[#0a6787]">Maria Oliveira</p>
                    <p className="text-xs text-[#73a8bd] mt-1">Notebook Dell - Formatação</p>
                  </td>
                  <td className="px-6 py-5 text-[#0a6787]">Formatação</td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-50 rounded-full border border-green-100">
                      Concluído
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="text-[#a3d8e8] hover:text-[#0a6787]">•••</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico Simulado */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f1f7]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-[#0a6787]">Fluxo de O.S.</h2>
            <select className="px-3 py-1 text-sm bg-white border border-[#e0f1f7] rounded-lg text-[#73a8bd]">
              <option>2026</option>
            </select>
          </div>
          
          {/* Placeholder Gráfico */}
          <div className="h-64 flex items-end justify-between px-2 gap-2 relative border-b border-[#f0f9ff] pb-6">
            <div className="absolute w-full border-t border-dashed border-[#f0f9ff] bottom-[15%]"></div>
            <div className="absolute w-full border-t border-dashed border-[#f0f9ff] bottom-[40%]"></div>
            <div className="absolute w-full border-t border-dashed border-[#f0f9ff] bottom-[65%]"></div>
            <div className="absolute w-full border-t border-dashed border-[#f0f9ff] bottom-[90%]"></div>

            <div className="w-8 bg-[#0a6787]/10 rounded-t-lg h-16"></div>
            <div className="w-8 bg-[#0a6787]/10 rounded-t-lg h-24"></div>
            <div className="w-8 bg-[#0a6787] rounded-t-lg h-36"></div>
            <div className="w-8 bg-[#0a6787]/10 rounded-t-lg h-20"></div>
          </div>
        </div>

      </div>
    </div>
  );
}