
export interface ExportEntityField {
  name: string; // Target API field name
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
// You will need to update these with your actual target field names and validation requirements.
export const exportEntities: ExportEntity[] = [
  {
    id: 'tmsCustomer',
    name: 'TMS Customer',
    url: 'https://new.dev.portpro.io/carrier/addTMSCustomer', // Ensure this is the correct endpoint
    fields: [
      { name: 'customer_name', required: true, type: 'string' }, // This is the target API field name
      { name: 'email', required: true, type: 'email' },
      { name: 'phone', type: 'string' },
      { name: 'address_line1', type: 'string' }, // Assuming 'Address' from source might map to this
      // Add other fields relevant to TMS Customer (target API fields)
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
      // Add other fields relevant to Product List (target API fields)
    ],
  },
  // Add definitions for your other entities here, for example:
  // {
  //   id: 'trucks',
  //   name: 'Trucks',
  //   url: 'https://new.dev.portpro.io/carrier/addTrucks',
  //   fields: [
  //     { name: 'truck_identifier', required: true, type: 'string' },
  //     { name: 'license_plate', required: true, type: 'string' },
  //     { name: 'capacity_tons', type: 'number' },
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
      { name: 'targetApiFieldName', required: true, type: 'string' }, // This is the field name your API expects
      { name: 'anotherTargetApiField', type: 'number' },
      // ... other fields
    ]
  }
*/
