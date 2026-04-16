/**
 * Send Invoice skill handler.
 *
 * Reads customer data, drafts invoice, and sends email.
 * This is a legacy skill — no governance decorators yet.
 */

import { readFile } from 'node:fs/promises';

interface InvoiceRequest {
  customerId: string;
  items: { description: string; amount: number }[];
}

interface InvoiceResult {
  sent: boolean;
  invoiceId: string;
}

export async function handler(request: InvoiceRequest): Promise<InvoiceResult> {
  // Read customer data
  const customerData = await readFile(`customers/${request.customerId}.json`, 'utf-8');
  const customer = JSON.parse(customerData);

  // Draft invoice email
  const total = request.items.reduce((sum, item) => sum + item.amount, 0);
  const body = `Invoice for ${customer.name}: $${total.toFixed(2)}`;

  // Send email on behalf of user
  const response = await fetch('https://api.email-provider.example/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: customer.email,
      subject: `Invoice #${Date.now()}`,
      body,
    }),
  });

  const result = await response.json();

  return {
    sent: true,
    invoiceId: result.id,
  };
}
