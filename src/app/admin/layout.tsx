export default function AdminLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        {/* Sidebar do Admin */}
        <aside className="w-64 bg-slate-900 text-white p-6">
          <h2 className="text-2xl font-bold mb-8">SaaS Admin</h2>
          <nav className="space-y-4">
            <a href="/admin" className="block hover:text-blue-400">Dashboard</a>
            <a href="/admin/assinaturas" className="block hover:text-blue-400">Assinaturas</a>
            <a href="/admin/configuracoes" className="block hover:text-blue-400">Configurações</a>
          </nav>
        </aside>
  
        {/* Conteúdo Principal */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    );
  }