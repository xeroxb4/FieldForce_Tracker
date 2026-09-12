/** Print profiles for FieldForce invoices */
const PROFILES = {
  a4: { id: 'a4', label: 'A4', pageWidth: '190mm', fontSize: '12px', titleSize: '28px' },
  thermal80: { id: 'thermal80', label: 'Thermal 80mm', pageWidth: '72mm', fontSize: '11px', titleSize: '18px' },
  thermal58: { id: 'thermal58', label: 'Thermal 58mm', pageWidth: '52mm', fontSize: '10px', titleSize: '16px' },
};

const STORAGE_KEY = 'ff_print_profile';

export function listPrintProfiles() {
  return Object.values(PROFILES);
}

export function getPrintProfile() {
  const id = localStorage.getItem(STORAGE_KEY) || 'a4';
  return PROFILES[id] || PROFILES.a4;
}

export function setPrintProfile(id) {
  if (PROFILES[id]) localStorage.setItem(STORAGE_KEY, id);
}

function invoiceNumber(opts = {}) {
  if (opts.invoiceNo) return opts.invoiceNo;
  const d = (opts.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const tail = String(Math.floor(Math.random() * 9000) + 1000);
  return `FF-${d}-${tail}`;
}

function buildLinesHtml(lines, compact) {
  return (lines || [])
    .map((l) => {
      const name = l.productName || l.name || 'Item';
      const unit = (l.unit || 'PC').toUpperCase();
      const qty = Number(l.qty || l.quantity || 0);
      const unitCost = Number(l.unitPrice || (qty ? (l.lineTotal || l.total || 0) / qty : 0));
      const amount = Number(l.lineTotal || l.total || unitCost * qty);
      if (compact) {
        return `<tr>
          <td class="desc"><strong>${name}</strong><div class="sub">${unit}</div></td>
          <td class="num">${qty}</td>
          <td class="num">${amount.toFixed(2)}</td>
        </tr>`;
      }
      return `<tr>
        <td class="desc">
          <strong>${name}</strong>
          <div class="sub">${unit} · unit cost GHS ${unitCost.toFixed(2)}</div>
        </td>
        <td class="num">${unitCost.toFixed(2)}</td>
        <td class="num">${qty}</td>
        <td class="num">${amount.toFixed(2)}</td>
      </tr>`;
    })
    .join('');
}

/**
 * Professional invoice print (TemplateLab-style layout)
 */
export function printOrderInvoice(opts = {}) {
  const profile = getPrintProfile();
  const compact = profile.id !== 'a4';
  const {
    shopName,
    contactName,
    contactPhone,
    address,
    repName,
    territory,
    distributor,
    date,
    paymentType,
    creditDays,
    lines,
    total,
    notes,
  } = opts;

  const invNo = invoiceNumber(opts);
  const issueDate = date || new Date().toLocaleDateString('en-GB');
  const grand = Number(total || 0);
  const payLabel =
    paymentType === 'credit' ? `Credit (${creditDays || 7} days)` : 'Cash';

  const tableHead = compact
    ? `<tr><th>Description</th><th class="num">Qty</th><th class="num">Amount</th></tr>`
    : `<tr><th>Description</th><th class="num">Unit cost</th><th class="num">Qty</th><th class="num">Amount</th></tr>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${invNo}</title>
  <style>
    @page { margin: 12mm; size: auto; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #1e293b;
      margin: 0 auto;
      padding: 16px;
      width: ${profile.pageWidth};
      max-width: 100%;
      font-size: ${profile.fontSize};
      line-height: 1.45;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
    }
    .logo {
      width: 48px; height: 48px;
      border-radius: 50%;
      border: 3px solid #2596be;
      display: flex; align-items: center; justify-content: center;
      color: #2596be; font-weight: 800; font-size: 14px;
    }
    .brand h1 {
      margin: 0;
      font-size: ${profile.titleSize};
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #2596be;
    }
    .brand .sub { color: #64748b; font-size: 0.85em; margin-top: 2px; }
    .meta {
      display: grid;
      grid-template-columns: ${compact ? '1fr' : '1fr 1fr 1fr'};
      gap: 12px;
      margin-bottom: 24px;
    }
    .meta label {
      display: block;
      font-size: 0.7em;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #2596be;
      margin-bottom: 4px;
    }
    .meta strong { font-size: 1.05em; }
    .parties {
      display: grid;
      grid-template-columns: ${compact ? '1fr' : '1fr 1fr'};
      gap: 20px;
      margin-bottom: 28px;
    }
    .parties label {
      display: block;
      font-size: 0.7em;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #2596be;
      margin-bottom: 6px;
    }
    .parties .name { font-size: 1.1em; font-weight: 700; margin-bottom: 4px; }
    .parties .muted { color: #64748b; font-size: 0.92em; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th {
      text-align: left;
      padding: 10px 6px;
      border-bottom: 2px solid #2596be;
      font-size: 0.72em;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #2596be;
    }
    th.num, td.num { text-align: right; }
    td {
      padding: 12px 6px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    td.desc .sub { color: #94a3b8; font-size: 0.85em; margin-top: 2px; }
    .totals {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .grand label {
      display: block;
      font-size: 0.75em;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #64748b;
    }
    .grand .value {
      font-size: 1.85em;
      font-weight: 800;
      color: #2596be;
      margin-top: 4px;
    }
    .sumbox { min-width: 180px; }
    .sumbox row, .sumbox .row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 0.95em;
    }
    .sumbox .row.total {
      font-weight: 800;
      border-top: 2px solid #2596be;
      margin-top: 6px;
      padding-top: 8px;
    }
    .footer-block { margin-top: 28px; }
    .footer-block label {
      display: block;
      font-size: 0.7em;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #2596be;
      margin-bottom: 6px;
    }
    .footer-block p { margin: 0; color: #475569; font-size: 0.9em; max-width: 420px; }
    .thanks {
      margin-top: 32px;
      text-align: ${compact ? 'left' : 'right'};
      color: #2596be;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="brand">
    <div class="logo">FF</div>
    <div>
      <h1>INVOICE</h1>
      <div class="sub">FieldForce Tracker · Tax inclusive</div>
    </div>
  </div>

  <div class="meta">
    <div>
      <label>Invoice #</label>
      <strong>${invNo}</strong>
    </div>
    <div>
      <label>Date of issue</label>
      <strong>${issueDate}</strong>
    </div>
    <div>
      <label>Payment</label>
      <strong>${payLabel}</strong>
    </div>
  </div>

  <div class="parties">
    <div>
      <label>Bill to</label>
      <div class="name">${shopName || '—'}</div>
      <div class="muted">
        ${contactName ? contactName + '<br/>' : ''}
        ${contactPhone ? contactPhone + '<br/>' : ''}
        ${address || territory || ''}
      </div>
    </div>
    <div>
      <label>From / Served by</label>
      <div class="name">${repName || 'FieldForce OMR'}</div>
      <div class="muted">
        ${distributor ? distributor + '<br/>' : ''}
        ${territory || ''}
        ${notes ? '<br/>' + notes : ''}
      </div>
    </div>
  </div>

  <table>
    <thead>${tableHead}</thead>
    <tbody>
      ${buildLinesHtml(lines, compact) || '<tr><td colspan="4">No line items</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <div class="grand">
      <label>Grand total</label>
      <div class="value">GHS ${grand.toFixed(2)}</div>
    </div>
    <div class="sumbox">
      <div class="row"><span>Subtotal</span><span>GHS ${grand.toFixed(2)}</span></div>
      <div class="row"><span>Tax</span><span>Inclusive</span></div>
      <div class="row total"><span>Total</span><span>GHS ${grand.toFixed(2)}</span></div>
    </div>
  </div>

  <div class="footer-block">
    <label>Terms &amp; conditions</label>
    <p>Prices are tax inclusive. Credit sales are due within the agreed period. Goods remain subject to standard distributor terms.</p>
  </div>

  <div class="thanks">THANK YOU FOR YOUR BUSINESS!</div>

  <script>
    window.onload = function () {
      window.print();
      setTimeout(function () { window.close(); }, 500);
    };
  </script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=720,height=900');
  if (!w) {
    alert('Allow pop-ups to print the invoice.');
    return false;
  }
  w.document.write(html);
  w.document.close();
  return true;
}

export function printOrderInvoiceWithPrompt(opts) {
  return printOrderInvoice(opts);
}
