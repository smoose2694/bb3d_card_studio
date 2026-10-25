// Synthetic orders created during the upload/Swish verification, never customer sales.
// Match exact IDs; customer names or the word "test" must not classify real orders.
const verificationOrders=new Set([
  'ddd7ea29-4a76-44d3-baf9-6302ba69a0b5',
  'ad20dafa-2418-4454-a1a0-5a3656d110dc'
]);
export const isTestOrder=order=>order.testOrder===true||verificationOrders.has(order.id);
