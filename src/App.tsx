import React, { useState, useEffect } from 'react';
import { useTable } from 'react-table'; // Import useTable hook
import { Button } from '@mui/material';
import { supabase } from './lib/supabase';
import { FileText, Search, Share2, RefreshCw, AlertCircle, Download, Settings as IconSettings } from 'lucide-react';
import { syncProducts } from './lib/woocommerce';
import SettingsComponent from './pages/Settings';
import { generateProductCatalog } from './lib/pdf';

interface Product {
  name: string;
  price: number;
  category?: string;
}

interface ProductDetails {
  id: string;
  woo_id: number;
  description: string | null;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  price: number;
  catalog_price: number | null;
}

function ProductList() {
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSettings, setHasSettings] = useState<boolean | null>(null);

  const columns = React.useMemo(
    () => [
      {
        Header: 'Selecionar',
        accessor: 'selection', // Usaremos para a lógica de seleção
      },
      {
        Header: 'Imagem',
        accessor: 'image_url',
      },
      {
        Header: 'Título Produto',
        accessor: 'description',
      },
      {
        Header: 'Descrição Produto',
        accessor: 'description',
      },
      {
        Header: 'Categoria',
        accessor: 'category',
      },
      {
        Header: 'Preço API',
        accessor: 'price',
      },
      {
        Header: 'Preço Catálogo',
        accessor: 'catalog_price',
      },
      {
        Header: 'Editar Preço Catálogo',
        accessor: 'edit_price', // Usaremos para o input de edição
      },
    ],
    []
  );

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
        .select('*, catalog_price') // Simplificar a query para selecionar apenas 'id'

      if (supabaseError) throw supabaseError;

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      console.log('Supabase error object:', error); // Logar o objeto de erro completo
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

  const handlePriceUpdate = async (productId: string, newCatalogPrice: number) => {
    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({ catalog_price: newCatalogPrice })
        .eq('id', productId);

      if (updateError) throw updateError;

      setProducts(prev =>
        prev.map(p => p.id === productId ? { ...p, catalog_price: newCatalogPrice } : p)
      );
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Não foi possível atualizar o preço. Por favor, tente novamente.');
    }
  };

  const generatePDF = async () => {
    if (selectedProducts.size === 0) {
      setError('Selecione pelo menos um produto para gerar o PDF.');
      return;
    }

    const companySettings = await supabase
      .from('company_settings')
      .select('*')
      .single();

    if (companySettings.error || !companySettings.data) {
      setError('Não foi possível carregar as configurações da empresa para gerar o PDF.');
      return;
    }

    const selectedProductList = products.filter(product => selectedProducts.has(product.id));

    try {
      const pdfBlob = await generateProductCatalog(
        selectedProductList.map(product => ({
          name: product.description || 'Sem nome',
          price: product.price,
          category: product.category || undefined
        })),
        companySettings.data
      );

      const blobURL = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobURL;
      downloadLink.download = 'catalogo-produtos.pdf';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobURL);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setError('Erro ao gerar PDF. Por favor, tente novamente.');
    }
  };

  const shareOnWhatsApp = () => {
    // WhatsApp sharing logic will be implemented here
    console.log('Sharing on WhatsApp...');
  };

  const filteredProducts = products.filter(product =>
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
              <IconSettings className="mr-2" size={20} />
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

            <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
              <div className="overflow-x-auto">
                <table className="table-fixed divide-y divide-gray-200 w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 border border-gray-300 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Selecionar
                      </th>
                      <th scope="col" className="px-6 py-3 border border-gray-300 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Imagem
                      </th>
                      <th scope="col" className="px-6 py-3 border border-gray-300 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Título Produto
                      </th>
                      <th scope="col" className="px-6 py-3 border border-gray-300 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descrição Produto
                      </th>
                      <th scope="col" className="px-6 py-3 border border-gray-300 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th scope="col" className="px-6 py-3 border border-gray-300 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preço API
                      </th>
                      <th scope="col" className="px-6 py-3 border border-gray-300 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preço Catálogo
                      </th>
                      <th scope="col" className="px-6 py-3 border border-gray-300 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Editar Preço Catálogo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="animate-spin h-5 w-5 text-gray-400" />
                            <span className="text-gray-500">Carregando produtos...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          {searchTerm ? 'Nenhum produto encontrado' : hasSettings ? 'Clique em "Sincronizar com WooCommerce" para importar os produtos' : 'Configure as informações do WooCommerce nas configurações'}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <tr key={product.id} className={selectedProducts.has(product.id) ? 'bg-green-100' : ''}>
                          <td className="px-6 py-4 text-center border border-gray-300">
                            <button
                              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleProductSelect(product.id)}
                            >
                              Selecionar
                            </button>
                          </td>
                          <td className="px-4 py-4 break-words text-center align-middle border border-gray-300">
                            {product.image_url && (
                              <img
                                src={product.image_url}
                                alt={product.description || 'Imagem do produto'}
                                className="rounded-full object-contain h-32 w-32"
                              />
                            )}
                          </td>
                          <td className="px-1 py-4 break-words text-left border border-gray-300 align-top">
                            <div className="text-base font-semibold text-gray-900 break-words">
                              {product.description?.split(' - ')[0]?.replace(/<[^>]*>/g, '')}
                            </div>
                          </td>
                          <td className="px-1 py-4 break-words text-left align-middle border border-gray-300 max-w-[200px]">
                            <div className="text-gray-500 text-sm mt-1 break-words max-w-[200px]">
                              {product.description?.replace(/<[^>]*>/g, '')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 break-words border border-gray-300">
                            {product.category || '-'}</td>
                          <td className="px-6 py-4 border border-gray-300 rounded p-1">
                            R$ {product.price}
                          </td>
                          <td className="px-6 py-4 border border-gray-300 rounded p-1">
                            R$ {product.catalog_price !== null ? product.catalog_price : product.price}
                          </td>
                          <td className="px-6 py-4 border border-gray-300">
                            <input
                                  type="number"
                                  defaultValue={product.catalog_price || 0}
                                  onBlur={(e) => handlePriceUpdate(product.id, parseFloat(e.target.value))}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('pushstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pushstate', handleLocationChange);
    };
  }, []);

  return currentPath === '/settings' ? <SettingsComponent /> : <ProductList />;
}

export default App;
