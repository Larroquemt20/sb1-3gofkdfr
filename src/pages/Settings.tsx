import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';

interface CompanySettings {
  company_name: string;
  logo_url: string;
  contact_phone: string;
  contact_email: string;
  woocommerce_url: string;
  woocommerce_key: string;
  woocommerce_secret: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: '',
    logo_url: '',
    contact_phone: '',
    contact_email: '',
    woocommerce_url: '',
    woocommerce_key: '',
    woocommerce_secret: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { error } = await supabase
        .from('company_settings')
        .upsert(settings);

      if (error) throw error;
      
      setSuccess(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Erro ao salvar as configurações. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="inline-flex items-center text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={20} />
            </a>
            <h1 className="text-3xl font-bold text-gray-900">
              Configurações
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          {loading ? (
            <div className="text-center py-4">Carregando...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Informações da Empresa</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                      Nome da Empresa
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      id="company_name"
                      value={settings.company_name}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700">
                      URL do Logo
                    </label>
                    <input
                      type="url"
                      name="logo_url"
                      id="logo_url"
                      value={settings.logo_url}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      name="contact_phone"
                      id="contact_phone"
                      value={settings.contact_phone}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
                      E-mail
                    </label>
                    <input
                      type="email"
                      name="contact_email"
                      id="contact_email"
                      value={settings.contact_email}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Configurações do WooCommerce</h2>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="woocommerce_url" className="block text-sm font-medium text-gray-700">
                      URL da Loja
                    </label>
                    <input
                      type="url"
                      name="woocommerce_url"
                      id="woocommerce_url"
                      value={settings.woocommerce_url}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                      placeholder="https://sua-loja.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="woocommerce_key" className="block text-sm font-medium text-gray-700">
                      Consumer Key
                    </label>
                    <input
                      type="text"
                      name="woocommerce_key"
                      id="woocommerce_key"
                      value={settings.woocommerce_key}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="woocommerce_secret" className="block text-sm font-medium text-gray-700">
                      Consumer Secret
                    </label>
                    <input
                      type="password"
                      name="woocommerce_secret"
                      id="woocommerce_secret"
                      value={settings.woocommerce_secret}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              {success && (
                <div className="rounded-md bg-green-50 p-4">
                  <div className="text-sm text-green-700">Configurações salvas com sucesso!</div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="mr-2" size={20} />
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}