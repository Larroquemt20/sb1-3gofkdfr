import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

interface Product {
  name: string;
  price: number;
  category?: string;
}

interface CompanyInfo {
  company_name: string;
  logo_url?: string;
  contact_phone?: string;
  contact_email?: string;
}

export const generateProductCatalog = async (
  products: Product[],
  companyInfo: CompanyInfo
): Promise<Blob> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Add company header
  doc.setFontSize(20);
  doc.text(companyInfo.company_name, pageWidth / 2, 20, { align: 'center' });
  
  // Add date
  doc.setFontSize(12);
  doc.text(
    `Catálogo de Produtos - ${format(new Date(), 'dd/MM/yyyy')}`,
    pageWidth / 2,
    30,
    { align: 'center' }
  );

  // Add products table
  const tableData = products.map(product => [
    product.name,
    product.category || '-',
    `R$ ${product.price.toFixed(2)}`
  ]);

  (doc as any).autoTable({
    head: [['Produto', 'Categoria', 'Preço']],
    body: tableData,
    startY: 40,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 5
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255
    }
  });

  // Add footer with contact information
  const footerY = doc.internal.pageSize.height - 20;
  doc.setFontSize(10);
  if (companyInfo.contact_phone) {
    doc.text(`Tel: ${companyInfo.contact_phone}`, 20, footerY);
  }
  if (companyInfo.contact_email) {
    doc.text(`Email: ${companyInfo.contact_email}`, pageWidth - 20, footerY, { align: 'right' });
  }

  return doc.output('blob');
};