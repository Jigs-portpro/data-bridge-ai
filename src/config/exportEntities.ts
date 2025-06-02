
export interface ExportEntity {
  name: string;
  url: string;
}

const transformEntityNameToPath = (name: string): string => {
  if (name.toLowerCase() === 'customers') {
    return 'addTMSCustomer';
  }
  // Simple transformation: "Product List" -> "addProductList"
  return 'add' + name.replace(/\s+/g, '');
};

const entityNames: string[] = [
  "Charge Profile",
  "Trucks",
  "Customers",
  "Order List",
  "Driver Charge Profile",
  "Chassis",
  "Carrier Tariff",
  "Vehicle List",
  "Users",
  "Customer Employee",
  "Driver List",
  "Drivers",
  "Trailers",
  "Product List",
  "Fleet Owner",
  "Carrier",
  "Customer List",
  "Carrier Charge Profile",
  "Chassis Owner",
  "Load Tariff",
  "Driver Tariff"
];

export const exportEntities: ExportEntity[] = entityNames.map(name => ({
  name,
  url: `https://new.dev.portpro.io/carrier/${transformEntityNameToPath(name)}`,
}));

// Example of how to log for verification (optional)
// exportEntities.forEach(entity => console.log(`Entity: ${entity.name}, URL: ${entity.url}`));
