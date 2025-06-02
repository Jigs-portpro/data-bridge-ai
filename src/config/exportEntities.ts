
export interface ExportEntityField {
  name: string; // Target API field name
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'date';
  minLength?: number; // For string, email
  maxLength?: number; // For string, email
  pattern?: string;   // For string, email (regex as string)
  minValue?: number;  // For number
  maxValue?: number;  // For number
  // dateFormat?: string; // For date, if specific format is needed beyond ISO (consider for future)
  // allowedValues?: (string | number)[]; // For enum-like behavior (consider for future)
}

export interface ExportEntity {
  id: string; // Unique identifier for the entity
  name:string; // User-friendly name for the dropdown
  url: string; // API endpoint URL
  fields: ExportEntityField[];
}

// Example Entity Definitions:
// You will need to update these with your actual target field names and validation requirements.
// Use the Setup page in the application to generate this JSON structure,
// then copy it from the "Generated JSON Configuration" textarea on that page
// and paste it here, REPLACING THE ENTIRE ARRAY CONTENT assigned to the
// `export const exportEntities: ExportEntity[] = ...;` line below.
export const exportEntities: ExportEntity[] = [
  {
    id: 'tmsCustomer',
    name: 'TMS Customer',
    url: 'https://new.dev.portpro.io/carrier/addTMSCustomer',
    fields: [
      { name: 'customer_name', required: true, type: 'string', minLength: 2, maxLength: 100 },
      { name: 'email', required: true, type: 'email', pattern: "^[\\w\\-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" },
      { name: 'phone', type: 'string', pattern: "^[\\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$" },
      { name: 'address_line1', type: 'string', maxLength: 200 },
      { name: 'registration_date', type: 'date', required: false },
      { name: 'loyalty_points', type: 'number', minValue: 0, maxValue: 10000 },
      { name: 'is_active', type: 'boolean', required: true },
    ],
  },
  {
    id: 'productList',
    name: 'Product List',
    url: 'https://new.dev.portpro.io/carrier/addProductList',
    fields: [
      { name: 'product_name', required: true, type: 'string', minLength: 3, maxLength: 150 },
      { name: 'sku', required: true, type: 'string', pattern: "^[A-Z0-9]{5,10}$" }, // Example: SKU like "ABC12345"
      { name: 'price', type: 'number', required: true, minValue: 0.01 },
      { name: 'stock_qty', type: 'number', required: true, minValue: 0 },
      { name: 'expiry_date', type: 'date' },
      { name: 'category', type: 'string' },
    ],
  },
];
