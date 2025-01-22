import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { FileText, Search, Share2, RefreshCw, AlertCircle, Download, Settings } from 'lucide-react';
import { syncProducts } from './lib/woocommerce';
import Settings from './pages/Settings';

interface Product {
  id: string;
  woo_id: number;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
}

function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSettings, setHasSettings] = useState<boolean | null>(null);

  useEffect(() => {
    checkSettings();
    fetchProducts();
  }, []);

  const checkSettings = async () => {
    const { count } = await supabase
      .from('company_settings')
      .select('*', { count: 'exact', head: true });
    
    setHasSettings(count === 1);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (supabaseError) throw supabaseError;
      
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Não foi possível carregar os produtos. Por favor, verifique sua conexão com o Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!hasSettings) {
      setError('Configure primeiro as informações do WooCommerce nas configurações.');
      return;
    }

    try {
      setSyncing(true);
      setError(null);

      const wooProducts = await syncProducts();

      const { error: upsertError } = await supabase
        .from('products')
        .upsert(
          wooProducts.map(product => ({
            ...product,
            updated_at: new Date().toISOString()
          })),
          { onConflict: 'woo_id' }
        );

      if (upsertError) throw upsertError;

      await fetchProducts();
    } catch (error) {
      console.error('Error syncing products:', error);
      setError(error instanceof Error ? error.message : 'Erro ao sincronizar produtos do WooCommerce.');
    } finally {
      setSyncing(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handlePriceUpdate = async (productId: string, newPrice: number) => {
    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({ price: newPrice })
        .eq('id', productId);

      if (updateError) throw updateError;
      
      setProducts(prev =>
        prev.map(p => p.id === productId ? { ...p, price: newPrice } : p)
      );
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Não foi possível atualizar o preço. Por favor, tente novamente.');
    }
  };

  const generatePDF = async () => {
    // PDF generation logic will be implemented here
    console.log('Generating PDF...');
  };

  const shareOnWhatsApp = () => {
    // WhatsApp sharing logic will be implemented here
    console.log('Sharing on WhatsApp...');
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Catálogo de Produtos
            </h1>
            <button
              onClick={() => window.location.href = '/settings'}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Settings className="mr-2" size={20} />
              Configurações
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-500" size={24} />
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Erro</h3>
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchProducts}
                className="mt-2 text-red-700 hover:text-red-800 font-medium flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Tentar Novamente
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className={`mr-2 ${syncing ? 'animate-spin' : ''}`} size={20} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar com WooCommerce'}
                </button>
                <button
                  onClick={generatePDF}
                  disabled={selectedProducts.size === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="mr-2" size={20} />
                  Gerar PDF
                </button>
                <button
                  onClick={shareOnWhatsApp}
                  disabled={selectedProducts.size === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Share2 className="mr-2" size={20} />
                  Compartilhar
                </button>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Selecionar
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preço
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="animate-spin h-5 w-5 text-gray-400" />
                            <span className="text-gray-500">Carregando produtos...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                          {searchTerm ? 'Nenhum produto encontrado' : hasSettings ? 'Clique em "Sincronizar com WooCommerce" para importar os produtos' : 'Configure as informações do WooCommerce nas configurações'}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(product.id)}
                              onChange={() => handleProductSelect(product.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {product.image_url && (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="h-10 w-10 rounded-full mr-3 object-cover"
                                />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {product.name}
                                </div>
                                {product.description && (
                                  <div className="text-sm text-gray-500">
                                    {product.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.category || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              value={product.price}
                              onChange={(e) => handlePriceUpdate(product.id, parseFloat(e.target.value))}
                              className="w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              step="0.01"
                              min="0"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return currentPath === '/settings' ? <Settings /> : <ProductList />;
}