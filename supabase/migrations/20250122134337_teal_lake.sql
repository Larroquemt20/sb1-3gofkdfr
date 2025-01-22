/*
  # Initial Schema Setup for WooCommerce Catalog Generator

  1. New Tables
    - `company_settings`
      - Company information and branding
    - `products`
      - Product information synced from WooCommerce
    - `pdf_history`
      - Record of generated PDFs
    - `pdf_products`
      - Products included in each PDF

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Company Settings Table
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  logo_url text,
  contact_phone text,
  contact_email text,
  woocommerce_url text NOT NULL,
  woocommerce_key text NOT NULL,
  woocommerce_secret text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users"
  ON company_settings
  FOR ALL
  TO authenticated
  USING (true);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  woo_id bigint UNIQUE NOT NULL,
  name text NOT NULL,
  price decimal(10,2) NOT NULL,
  description text,
  image_url text,
  category text,
  is_active boolean DEFAULT true,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow write access to authenticated users"
  ON products
  FOR ALL
  TO authenticated
  USING (true);

-- PDF History Table
CREATE TABLE IF NOT EXISTS pdf_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pdf_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users"
  ON pdf_history
  FOR ALL
  TO authenticated
  USING (true);

-- PDF Products Junction Table
CREATE TABLE IF NOT EXISTS pdf_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id uuid REFERENCES pdf_history(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  price_at_generation decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pdf_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users"
  ON pdf_products
  FOR ALL
  TO authenticated
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_woo_id ON products(woo_id);
CREATE INDEX IF NOT EXISTS idx_pdf_products_pdf_id ON pdf_products(pdf_id);
CREATE INDEX IF NOT EXISTS idx_pdf_products_product_id ON pdf_products(product_id);