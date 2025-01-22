import { supabase } from './supabase';

interface WooCommerceProduct {
  id: number;
  name: string;
  price: string;
  description: string;
  images: Array<{ src: string }>;
  categories: Array<{ name: string }>;
  status: string;
}

export const syncProducts = async () => {
  try {
    // Get WooCommerce settings from Supabase
    const { data: settings, error: settingsError } = await supabase
      .from('company_settings')
      .select('woocommerce_url, woocommerce_key, woocommerce_secret')
      .single();

    if (settingsError) {
      throw new Error('Erro ao carregar configurações do WooCommerce. Por favor, configure primeiro.');
    }

    if (!settings) {
      throw new Error('Configurações do WooCommerce não encontradas. Por favor, configure primeiro.');
    }

    const { woocommerce_url: url, woocommerce_key: key, woocommerce_secret: secret } = settings;

    // Create Basic Auth token
    const token = btoa(`${key}:${secret}`);

    // Make sure the URL ends with a slash
    const baseUrl = url.endsWith('/') ? url : `${url}/`;
    const apiUrl = `${baseUrl}wp-json/wc/v3/products?per_page=100`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API do WooCommerce: ${response.status} - ${errorText}`);
    }

    const products: WooCommerceProduct[] = await response.json();

    if (!Array.isArray(products)) {
      throw new Error('Resposta inválida da API do WooCommerce');
    }

    return products.map(product => ({
      woo_id: product.id,
      name: product.name,
      price: parseFloat(product.price || '0'),
      description: product.description,
      image_url: product.images[0]?.src || null,
      category: product.categories[0]?.name || null,
      is_active: product.status === 'publish'
    }));
  } catch (error) {
    console.error('Error fetching WooCommerce products:', error);
    throw error instanceof Error ? error : new Error('Erro desconhecido ao sincronizar produtos');
  }
};