
export interface ExportEntityField {
  name: string; // Target API field name
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'date'; // Added 'date'
  // Future validation options:
  // minLength?: number;
  // maxLength?: number;
  // pattern?: RegExp; // For string, email
  // minValue?: number; // For number, date (as timestamp)
  // maxValue?: number; // For number, date (as timestamp)
  // dateFormat?: string; // For date, if specific format is needed beyond ISO
}

export interface ExportEntity {
  id: string; // Unique identifier for the entity
  name: string; // User-friendly name for the dropdown
  url: string; // API endpoint URL
  fields: ExportEntityField[];
}

// Example Entity Definitions:
// You will need to update these with your actual target field names and validation requirements.
export const exportEntities: ExportEntity[] = [
  {
    id: 'tmsCustomer',
    name: 'TMS Customer',
    url: 'https://new.dev.portpro.io/carrier/addTMSCustomer', // Ensure this is the correct endpoint
    fields: [
      { name: 'customer_name', required: true, type: 'string' },
      { name: 'email', required: true, type: 'email' },
      { name: 'phone', type: 'string' },
      { name: 'address_line1', type: 'string' },
      { name: 'registration_date', type: 'date', required: false },
    ],
  },
  {
    id: 'productList',
    name: 'Product List',
    url: 'https://new.dev.portpro.io/carrier/addProductList', // Example endpoint
    fields: [
      { name: 'product_name', required: true, type: 'string' },
      { name: 'sku', required: true, type: 'string' },
      { name: 'price', type: 'number' },
      { name: 'stock_qty', type: 'number' },
      { name: 'expiry_date', type: 'date' },
    ],
  },
];

// To add more entities or update existing ones, modify the array above.
// You can also use the Setup page in the application to generate this JSON structure,
// then copy it from the "Generated JSON Configuration" textarea on that page
// and paste it here, replacing the existing array content.
// Make sure the export line remains: export const exportEntities: ExportEntity[] = [ ...your content... ];
