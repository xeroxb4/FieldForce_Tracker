/**
 * Invoice print profiles: A4 (browser), Thermal 80mm, Thermal 58mm
 * Uses system print dialog — works with Bluetooth printers configured in OS.
 */

const PROFILES = {
  a4: {
    label: 'A4 / Letter',
    pageWidth: '210mm',
    fontSize: '13px',
    titleSize: '18px',
  },
  thermal80: {
    label: 'Thermal 80mm',
    pageWidth: '72mm',
    fontSize: '11px',
    titleSize: '14px',
  },
  thermal58: {
    label: 'Thermal 58mm',
    pageWidth: '48mm',
    fontSize: '10px',
    titleSize: '12px',
  },
};

export function getPrintProfile() {
  return localStorage.getItem('ff_print_profile') || 'a4';
}

export function setPrintProfile(id) {
  if (PROFILES[id]) localStorage.setItem('ff_print_profile', id);
}

export function listPrintProfiles() {
  return Object.entries(PROFILES).map(([id, p]) => ({ id, label: p.label }));
}

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
  profileId,
}) {
  const profile = PROFILES[profileId || getPrintProfile()] || PROFILES.a4;

  const rows = lines
    .map(
      (l) =>
        `<tr>
          <td style="padding:4px 0;border-bottom:1px dashed #ccc">${l.productName || l.name || ''}</td>
          <td style="padding:4px 0;border-bottom:1px dashed #ccc;text-align:center">${l.unit || 'PC'}</td>
          <td style="padding:4px 0;border-bottom:1px dashed #ccc;text-align:right">${l.qty || l.quantity || 0}</td>
          <td style="padding:4px 0;border-bottom:1px dashed #ccc;text-align:right">${Number(l.lineTotal || l.total || 0).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><title>Invoice - ${shopName || ''}</title>
    <style>
      @page { margin: 6mm; size: auto; }
      body {
        font-family: system-ui, sans-serif;
        padding: 8px;
        color: #0f172a;
        width: ${profile.pageWidth};
        max-width: 100%;
        margin: 0 auto;
        font-size: ${profile.fontSize};
      }
      h1 { font-size: ${profile.titleSize}; margin: 0 0 2px; color: #2596be; }
      .muted { color: #64748b; font-size: 0.9em; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { text-align: left; padding: 4px 0; border-bottom: 2px solid #2596be; font-size: 0.85em; text-transform: uppercase; color: #475569; }
      .total { font-size: 1.15em; font-weight: 700; margin-top: 10px; text-align: right; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>FieldForce — Invoice</h1>
    <div class="muted">Tax inclusive · ${profile.label}</div>
    <p style="margin-top:10px">
      <strong>Shop:</strong> ${shopName || '—'}<br/>
      ${contactName ? `<strong>Contact:</strong> ${contactName}<br/>` : ''}
      <strong>Rep:</strong> ${repName || '—'} · ${territory || ''}<br/>
      <strong>Date:</strong> ${date || new Date().toLocaleDateString()}<br/>
      <strong>Pay:</strong> ${paymentType === 'credit' ? `Credit (${creditDays || 7}d)` : 'Cash'}
    </p>
    <table>
      <thead><tr><th>Item</th><th>Unit</th><th style="text-align:right">Qty</th><th style="text-align:right">GHS</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">No lines</td></tr>'}</tbody>
    </table>
    <div class="total">Total: GHS ${Number(total || 0).toFixed(2)}</div>
    <p class="muted" style="margin-top:16px">Thank you · Nivea Field Force</p>
    <script>
      window.onload = function() {
        window.print();
        setTimeout(function(){ window.close(); }, 600);
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

/** Ask profile then print */
export function printOrderInvoiceWithPrompt(opts) {
  const profiles = listPrintProfiles();
  const current = getPrintProfile();
  const choice = window.prompt(
    `Print profile:\n1 = A4\n2 = Thermal 80mm\n3 = Thermal 58mm\n\nEnter 1, 2 or 3 (current: ${current})`,
    current === 'thermal80' ? '2' : current === 'thermal58' ? '3' : '1'
  );
  if (choice === null) return false;
  const map = { '1': 'a4', '2': 'thermal80', '3': 'thermal58', a4: 'a4', thermal80: 'thermal80', thermal58: 'thermal58' };
  const id = map[String(choice).trim()] || 'a4';
  setPrintProfile(id);
  return printOrderInvoice({ ...opts, profileId: id });
}
