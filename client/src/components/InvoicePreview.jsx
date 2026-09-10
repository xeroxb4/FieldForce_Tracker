import { listPrintProfiles, getPrintProfile, setPrintProfile, printOrderInvoice } from '../utils/printInvoice';

export default function InvoicePreview({ open, onClose, invoice }) {
  if (!open || !invoice) return null;
  const profiles = listPrintProfiles();
  const current = getPrintProfile();

  const total = Number(invoice.total || 0).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3">
      <div className="w-full max-w-md rounded-2xl bg-white text-slate-900 shadow-xl overflow-hidden">
        <div className="bg-[#2596be] text-white px-4 py-3 flex justify-between items-center">
          <div>
            <div className="text-xs opacity-90">Order summary</div>
            <div className="font-bold">{invoice.shopName || 'Invoice'}</div>
          </div>
          <button type="button" onClick={onClose} className="text-white/90 text-sm font-bold">
            Close
          </button>
        </div>
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="text-xs text-slate-500">
            {invoice.date || new Date().toLocaleDateString()} · {invoice.repName}
            {invoice.paymentType === 'credit' ? ` · Credit ${invoice.creditDays || 7}d` : ' · Cash'}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-500 border-b">
                <th className="py-1">Item</th>
                <th className="py-1 text-center">Unit</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1 text-right">GHS</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lines || []).map((l, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{l.productName || l.name}</td>
                  <td className="py-2 text-center">{l.unit || 'PC'}</td>
                  <td className="py-2 text-right">{l.qty || l.quantity}</td>
                  <td className="py-2 text-right font-medium">
                    {Number(l.lineTotal || l.total || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between items-center pt-2 border-t-2 border-[#2596be]">
            <span className="font-bold text-slate-700">Total (tax incl.)</span>
            <span className="text-lg font-extrabold text-[#2596be]">GHS {total}</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1">Print size</div>
            <div className="flex gap-2">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPrintProfile(p.id)}
                  className={`flex-1 text-[11px] font-bold py-2 rounded-lg border ${
                    current === p.id
                      ? 'bg-[#2596be] text-white border-[#2596be]'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 flex gap-2 border-t">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 font-semibold text-slate-700"
          >
            Skip print
          </button>
          <button
            type="button"
            onClick={() => {
              printOrderInvoice(invoice);
              onClose();
            }}
            className="flex-1 py-3 rounded-xl bg-[#2596be] text-white font-bold"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
