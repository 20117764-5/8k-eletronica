export default function AdminDashboard() {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Visão Geral do Sistema</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-sm font-medium">Assistências Ativas</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">12</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-sm font-medium">O.S. Geradas Hoje</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">145</p>
          </div>
  
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-sm font-medium">Faturamento MRR</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">R$ 1.200,00</p>
          </div>
        </div>
      </div>
    );
  }