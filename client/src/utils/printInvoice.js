/**
 * Print a tax-inclusive invoice via the browser print dialog.
 * OS shows available printers; user can cancel if none.
 */
export function printOrderInvoice({
  shopName,
  contactName,
  repName,
  territory,
  date,
  lines = [],
  paymentType = 'cash',
  creditDays,
  total,
}) {
  const rows = lines
    .map(
      (l) =>
        `<tr>
          <td style="padding:6px;border-bottom:1px solid #e2e8f0">${l.productName || l.name || ''}</td>
          <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center">${l.unit || 'PC'}</td>
          <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:right">${l.qty || l.quantity || 0}</td>
          <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:right">${Number(l.lineTotal || l.total || 0).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><title>Invoice - ${shopName || ''}</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 24px; color: #0f172a; }
      h1 { font-size: 18px; margin: 0 0 4px; color: #2596be; }
      .muted { color: #64748b; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
      th { text-align: left; padding: 6px; border-bottom: 2px solid #2596be; font-size: 11px; text-transform: uppercase; color: #475569; }
      .total { font-size: 16px; font-weight: 700; margin-top: 12px; text-align: right; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>FieldForce Tracker — Sales Invoice</h1>
    <div class="muted">All prices are tax-inclusive</div>
    <p style="margin-top:12px">
      <strong>Shop:</strong> ${shopName || '—'}<br/>
      ${contactName ? `<strong>Contact:</strong> ${contactName}<br/>` : ''}
      <strong>Rep:</strong> ${repName || '—'} · ${territory || ''}<br/>
      <strong>Date:</strong> ${date || new Date().toLocaleDateString()}<br/>
      <strong>Payment:</strong> ${paymentType === 'credit' ? `Credit (${creditDays || 7} days)` : 'Cash'}
    </p>
    <table>
      <thead><tr><th>Product</th><th>Unit</th><th style="text-align:right">Qty</th><th style="text-align:right">Amount (GHS)</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">No lines</td></tr>'}</tbody>
    </table>
    <div class="total">Total (tax incl.): GHS ${Number(total || 0).toFixed(2)}</div>
    <p class="muted" style="margin-top:24px">Thank you · Nivea Field Force</p>
    <script>
      window.onload = function() {
        window.print();
        setTimeout(function(){ window.close(); }, 500);
      };
    </script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=480,height=640');
  if (!w) {
    alert('Allow pop-ups to print the invoice.');
    return false;
  }
  w.document.write(html);
  w.document.close();
  return true;
}
