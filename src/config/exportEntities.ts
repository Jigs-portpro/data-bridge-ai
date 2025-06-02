
export interface ExportEntityField {
  name: string; // Column name in the source data
  apiName?: string; // Optional: field name expected by the API if different
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email'; // Add more types as needed
  // Future validation options:
  // minLength?: number;
  // maxLength?: number;
  // pattern?: RegExp;
  // minValue?: number;
  // maxValue?: number;
}

export interface ExportEntity {
  id: string; // Unique identifier for the entity
  name: string; // User-friendly name for the dropdown
  url: string; // API endpoint URL
  fields: ExportEntityField[];
}

// Example Entity Definitions:
// You will need to update these with your actual field names, API names, and validation requirements.
export const exportEntities: ExportEntity[] = [
  {
    id: 'tmsCustomer',
    name: 'TMS Customer',
    url: 'https://new.dev.portpro.io/carrier/addTMSCustomer', // Ensure this is the correct endpoint
    fields: [
      { name: 'CustomerName', apiName: 'customer_name', required: true, type: 'string' },
      { name: 'EmailAddress', apiName: 'email', required: true, type: 'email' },
      { name: 'PhoneNumber', apiName: 'phone', type: 'string' },
      { name: 'Address', type: 'string' },
      // Add other fields relevant to TMS Customer
    ],
  },
  {
    id: 'productList',
    name: 'Product List',
    url: 'https://new.dev.portpro.io/carrier/addProductList', // Example endpoint
    fields: [
      { name: 'ProductName', apiName: 'product_name', required: true, type: 'string' },
      { name: 'SKU', apiName: 'sku', required: true, type: 'string' },
      { name: 'Price', type: 'number' },
      { name: 'StockQuantity', apiName: 'stock_qty', type: 'number' },
      // Add other fields relevant to Product List
    ],
  },
  // Add definitions for your other 19 entities here, for example:
  // {
  //   id: 'trucks',
  //   name: 'Trucks',
  //   url: 'https://new.dev.portpro.io/carrier/addTrucks',
  //   fields: [
  //     { name: 'TruckID', apiName: 'truck_identifier', required: true, type: 'string' },
  //     { name: 'LicensePlate', apiName: 'license_plate', required: true, type: 'string' },
  //     { name: 'Capacity', type: 'number' },
  //   ],
  // },
  // ... and so on for all entities
];

// To add more entities, copy the structure above and fill in the details.
// For example:
/*
 {
    id: 'newEntityId', // must be unique
    name: 'User Friendly Name for New Entity',
    url: 'https://your.api.endpoint/for/newEntity',
    fields: [
      { name: 'ColumnNameInYourFile', apiName: 'fieldNameExpectedByAPI', required: true, type: 'string' },
      { name: 'AnotherColumn', type: 'number' },
      // ... other fields
    ]
  }
*/
