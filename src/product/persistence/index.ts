// Public persistence contract. Test/preview adapters use explicit file imports
// so a product barrel cannot pull browser storage into the production graph.

export * from './persistence-client.ts';
