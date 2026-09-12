import { listPrintProfiles, getPrintProfile, setPrintProfile, printOrderInvoice } from '../utils/printInvoice';

export default function InvoicePreview({ open, onClose, invoice }) {
  if (!open || !invoice) return null;
  const profiles = listPrintProfiles();
  const current = getPrintProfile();
  const total = Number(invoice.total || 0);
  const invNo =
    invoice.invoiceNo ||
    `FF-${(invoice.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3">
      <div className="w-full max-w-lg rounded-2xl bg-white text-slate-900 shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header like template */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full border-[3px] border-[#2596be] flex items-center justify-center text-[#2596be] font-extrabold text-sm">
              FF
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-wide text-[#2596be]">INVOICE</div>
              <div className="text-[11px] text-slate-500">FieldForce · Tax inclusive</div>
            </div>
            <button type="button" onClick={onClose} className="ml-auto text-slate-400 text-sm font-bold">
              Close
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#2596be]">Invoice #</div>
              <div className="font-semibold">{invNo}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#2596be]">Date</div>
              <div className="font-semibold">{invoice.date || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#2596be]">Payment</div>
              <div className="font-semibold">
                {invoice.paymentType === 'credit'
                  ? `Credit ${invoice.creditDays || 7}d`
                  : 'Cash'}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#2596be] mb-1">
                Bill to
              </div>
              <div className="font-bold">{invoice.shopName || '—'}</div>
              <div className="text-xs text-slate-500">
                {invoice.contactName}
                {invoice.contactPhone ? ` · ${invoice.contactPhone}` : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#2596be] mb-1">
                Served by
              </div>
              <div className="font-bold">{invoice.repName || '—'}</div>
              <div className="text-xs text-slate-500">{invoice.territory || ''}</div>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-[#2596be] border-b-2 border-[#2596be]">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Unit</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lines || []).map((l, i) => {
                const qty = Number(l.qty || l.quantity || 0);
                const amount = Number(l.lineTotal || l.total || 0);
                const unitCost = qty ? amount / qty : Number(l.unitPrice || 0);
                return (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2.5 pr-2">
                      <div className="font-medium">{l.productName || l.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {(l.unit || 'PC').toUpperCase()} · GHS {unitCost.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-slate-600">{unitCost.toFixed(2)}</td>
                    <td className="py-2.5 text-right">{qty}</td>
                    <td className="py-2.5 text-right font-semibold">{amount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-between items-end gap-4 pt-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Grand total
              </div>
              <div className="text-3xl font-extrabold text-[#2596be]">
                GHS {total.toFixed(2)}
              </div>
            </div>
            <div className="text-sm space-y-1 min-w-[140px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>GHS {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax</span>
                <span>Inclusive</span>
              </div>
              <div className="flex justify-between font-bold border-t-2 border-[#2596be] pt-1">
                <span>Total</span>
                <span>GHS {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Terms: Prices are tax inclusive. Credit due within the agreed period.
          </p>
          <p className="text-right text-sm font-bold text-[#2596be] tracking-wide">
            THANK YOU FOR YOUR BUSINESS!
          </p>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap gap-2 items-center bg-slate-50">
          <select
            className="text-xs border rounded-lg px-2 py-1.5 text-slate-800"
            value={current.id}
            onChange={(e) => setPrintProfile(e.target.value)}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => printOrderInvoice(invoice)}
            className="ml-auto px-4 py-2 rounded-xl bg-[#2596be] text-white text-sm font-bold"
          >
            Print invoice
          </button>
        </div>
      </div>
    </div>
  );
}
