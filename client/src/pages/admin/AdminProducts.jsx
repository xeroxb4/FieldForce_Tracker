import { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

const CATEGORIES = ["Roll-on", "Spray", "Lotion", "Shower Gel", "Body Care", "Other"];

const empty = {
  name: "",
  skuCode: "",
  category: "Lotion",
  size: "",
  pricePc: "",
  pricePack: "",
  priceCarton: "",
  unitsPerPack: "6",
  unitsPerCarton: "12",
  image: "",
};

function compressImage(dataUrl, quality = 0.7, maxSide = 400) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        const r = Math.min(maxSide / width, maxSide / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      c.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function AdminProducts() {
  const { dark } = useTheme();
  const [list, setList] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);

  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm border-2 font-medium ${
    dark ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-[#2596be]/40 text-slate-900"
  }`;
  const card = dark ? "bg-slate-900 border-slate-700" : "bg-white border-[#2596be]/40 shadow-sm";

  const load = () => {
    setLoading(true);
    api
      .get("/admin/products")
      .then((r) => setList(r.data || []))
      .catch(() => setStatus({ type: "error", msg: "Failed to load products" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      let img = await compressImage(dataUrl, 0.72, 420);
      if (typeof img === "string" && img.length > 250_000) {
        img = await compressImage(img, 0.55, 320);
      }
      setForm((f) => ({ ...f, image: img }));
      setStatus({ type: "success", msg: "Image ready — save product to apply" });
    } catch {
      setStatus({ type: "error", msg: "Could not read image" });
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      const payload = {
        ...form,
        pricePc: Number(form.pricePc) || 0,
        pricePack: Number(form.pricePack) || 0,
        priceCarton: Number(form.priceCarton) || 0,
        unitsPerPack: Number(form.unitsPerPack) || 6,
        unitsPerCarton: Number(form.unitsPerCarton) || 12,
        image: form.image || "",
      };
      if (editing) {
        await api.put(`/admin/products/${editing}`, payload);
        setStatus({ type: "success", msg: "Product updated" });
      } else {
        await api.post("/admin/products", payload);
        setStatus({ type: "success", msg: "Product created" });
      }
      setForm(empty);
      setEditing(null);
      load();
    } catch (err) {
      setStatus({ type: "error", msg: err.response?.data?.message || "Save failed" });
    }
  };

  const startEdit = (p) => {
    setEditing(p._id);
    setForm({
      name: p.name || "",
      skuCode: p.skuCode || "",
      category: p.category || "Lotion",
      size: p.size || "",
      pricePc: String(p.pricePc ?? ""),
      pricePack: String(p.pricePack ?? ""),
      priceCarton: String(p.priceCarton ?? ""),
      unitsPerPack: String(p.unitsPerPack ?? "6"),
      unitsPerCarton: String(p.unitsPerCarton ?? "12"),
      image: p.image || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id) => {
    if (!window.confirm("Deactivate this product?")) return;
    try {
      await api.delete(`/admin/products/${id}`);
      load();
    } catch {
      setStatus({ type: "error", msg: "Remove failed" });
    }
  };

  return (
    <div className="space-y-4 pb-8 max-w-3xl mx-auto">
      <div>
        <h1 className={`text-lg font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>
          Products
        </h1>
        <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-600"}`}>
          Add or edit Nivea SKUs, prices, and product images for Log Shop.
        </p>
      </div>

      {status && (
        <div
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            status.type === "error"
              ? "bg-red-500/15 text-red-500"
              : "bg-emerald-500/15 text-emerald-600"
          }`}
        >
          {status.msg}
        </div>
      )}

      <form onSubmit={save} className={`rounded-2xl border-2 p-4 space-y-3 ${card}`}>
        <div className={`text-sm font-bold ${dark ? "text-white" : "text-slate-800"}`}>
          {editing ? "Edit product" : "New product"}
        </div>

        <div className="flex gap-3 items-start">
          <div
            className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex items-center justify-center shrink-0 ${
              dark ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-slate-50"
            }`}
          >
            {form.image ? (
              <img src={form.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">🧴</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-2 rounded-xl bg-[#117ea6] text-white text-sm font-bold"
            >
              {form.image ? "Change product image" : "Upload product image"}
            </button>
            {form.image && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, image: "" }))}
                className="w-full py-1.5 rounded-xl text-xs font-bold text-red-500 border border-red-500/30"
              >
                Remove image
              </button>
            )}
          </div>
        </div>

        <input
          className={inputCls}
          placeholder="Product name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputCls}
            placeholder="SKU code"
            value={form.skuCode}
            onChange={(e) => setForm({ ...form, skuCode: e.target.value })}
            required
            disabled={!!editing}
          />
          <select
            className={inputCls}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <input
          className={inputCls}
          placeholder="Size (e.g. 400ML)"
          value={form.size}
          onChange={(e) => setForm({ ...form, size: e.target.value })}
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            className={inputCls}
            type="number"
            step="0.01"
            placeholder="Price PC"
            value={form.pricePc}
            onChange={(e) => setForm({ ...form, pricePc: e.target.value })}
          />
          <input
            className={inputCls}
            type="number"
            step="0.01"
            placeholder="Price Pack"
            value={form.pricePack}
            onChange={(e) => setForm({ ...form, pricePack: e.target.value })}
          />
          <input
            className={inputCls}
            type="number"
            step="0.01"
            placeholder="Price Carton"
            value={form.priceCarton}
            onChange={(e) => setForm({ ...form, priceCarton: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputCls}
            type="number"
            placeholder="Units / pack"
            value={form.unitsPerPack}
            onChange={(e) => setForm({ ...form, unitsPerPack: e.target.value })}
          />
          <input
            className={inputCls}
            type="number"
            placeholder="Units / carton"
            value={form.unitsPerCarton}
            onChange={(e) => setForm({ ...form, unitsPerCarton: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#117ea6] text-white font-bold text-sm">
            {editing ? "Update product" : "Create product"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(empty);
              }}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold ${
                dark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
              }`}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <div
              key={p._id}
              className={`rounded-2xl border-2 p-3 ${card} ${!p.isActive ? "opacity-50" : ""}`}
            >
              <div className="flex justify-between gap-3">
                <div className="flex gap-3 min-w-0">
                  <div
                    className={`w-14 h-14 rounded-xl overflow-hidden border shrink-0 flex items-center justify-center ${
                      dark ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    {p.image ? (
                      <img src={p.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">🧴</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-bold text-sm truncate ${dark ? "text-white" : "text-slate-900"}`}>
                      {p.name}
                    </div>
                    <div className={`text-xs ${dark ? "text-slate-400" : "text-slate-600"}`}>
                      {p.skuCode} · {p.category} {p.size ? `· ${p.size}` : ""} · PC {p.pricePc} / Pack{" "}
                      {p.pricePack} / Ctn {p.priceCarton}
                    </div>
                    {!p.image && (
                      <div className="text-[10px] text-amber-500 font-semibold mt-0.5">No image yet</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => startEdit(p)} className="text-xs font-bold text-[#2596be]">
                    Edit
                  </button>
                  {p.isActive && (
                    <button type="button" onClick={() => remove(p._id)} className="text-xs font-bold text-red-500">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
