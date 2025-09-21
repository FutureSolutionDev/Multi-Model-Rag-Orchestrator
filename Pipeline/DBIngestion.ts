    import { VectorStore } from '../Router';
    import { getCustomerBundle } from '../Database/SQL';
    export async function upsertCustomerToRAG(customerId: number) {
      const bundle = await getCustomerBundle(customerId);
      if (!bundle.customer) throw new Error('Customer not found');
      const c = bundle.customer;
      const contracts = bundle.contracts || [];
      const histories = bundle.histories || [];
      const invoices = bundle.invoices || [];
      const contractsText = contracts.map(x => `# Contract ${x.ContractId}
        Type: ${x.ContractType || 'N/A'}
        Start: ${x.StartDate || 'N/A'} End: ${x.EndDate || 'N/A'}
        MonthlyFee: ${x.MonthlyFee || 'N/A'} Status: ${x.Status || 'N/A'}`).join('\n\n');

              const histText = histories.slice(0, 50).map(h => `- [${h.HistoryDate}] ${h.HistoryPosition}${h.HistoryNotes ? ' | ' + h.HistoryNotes : ''}`).join('\n');

              const invText = invoices.slice(0, 100).map(inv => `- Inv#${inv.InvoiceNumber || inv.InvoiceId} amount=${inv.Amount || 'N/A'} date=${inv.InvoiceDate} due=${inv.DueDate} status=${inv.Status || 'N/A'}`).join('\n');

              const text = `Customer #${c.CustomerId} — ${c.CustomerName || 'N/A'}
        Phone: ${c.Phone || 'N/A'} | Email: ${c.Email || 'N/A'}
        Notes: ${c.Notes || 'N/A'}
        ## Contracts
        ${contractsText || 'N/A'}
        ## Latest Histories
        ${histText || 'N/A'}
        ## Invoices
        ${invText || 'N/A'}
        `;
      await VectorStore.upsert([{
        id: `customer:${c.CustomerId}`,
        text,
        meta: { type: 'customer', customerId: c.CustomerId }
      }]);

      return { customerId: c.CustomerId, indexed: 1 };
    }
