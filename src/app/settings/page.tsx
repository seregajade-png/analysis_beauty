"use client";

import { useState, useEffect } from "react";

interface Product {
  id?: string;
  name: string;
  category: string;
  characteristics: string;
  advantages: string;
  benefits: string;
  price: string;
  targetAudience: string;
  objections: Record<string, string>;
  isActive: boolean;
}

const EMPTY_PRODUCT: Product = {
  name: "",
  category: "",
  characteristics: "",
  advantages: "",
  benefits: "",
  price: "",
  targetAudience: "",
  objections: {},
  isActive: true,
};

export default function SettingsPage() {
  const [tab, setTab] = useState<"products" | "branding">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newObjKey, setNewObjKey] = useState("");
  const [newObjVal, setNewObjVal] = useState("");

  useEffect(() => {
    fetch("/api/settings/products")
      .then((r) => r.json())
      .then((data) => setProducts(data.map((p: Product & { price?: number | string }) => ({ ...p, price: p.price != null ? String(p.price) : "" }))));
  }, []);

  async function saveProduct() {
    if (!editingProduct?.name) return;
    setSaving(true);
    try {
      const method = editingProduct.id ? "PUT" : "POST";
      const res = await fetch("/api/settings/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct),
      });
      const saved = await res.json();

      if (editingProduct.id) {
        setProducts((p) => p.map((item) => item.id === saved.id ? { ...saved, price: saved.price?.toString() ?? "" } : item));
      } else {
        setProducts((p) => [...p, { ...saved, price: saved.price?.toString() ?? "" }]);
      }
      setShowForm(false);
      setEditingProduct(null);
    } catch {
      alert("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Удалить продукт?")) return;
    await fetch(`/api/settings/products?id=${id}`, { method: "DELETE" });
    setProducts((p) => p.filter((item) => item.id !== id));
  }

  function addObjection() {
    if (!newObjKey.trim() || !editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      objections: { ...editingProduct.objections, [newObjKey]: newObjVal },
    });
    setNewObjKey("");
    setNewObjVal("");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white">⚙</span>
          Настройки
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Управление продуктами, кейсами и брендингом платформы
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-6">
        {(["products", "branding"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t === "products" ? "Продукты / Услуги" : "Брендинг"}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {products.length} продуктов · используются в ХПВ-тестировании
            </p>
            <button
              onClick={() => { setEditingProduct(EMPTY_PRODUCT); setShowForm(true); }}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-all"
            >
              + Добавить продукт
            </button>
          </div>

          {/* Список продуктов */}
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.id} className="card-salon p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{p.name}</h3>
                      {p.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {p.category}
                        </span>
                      )}
                      {!p.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                          Отключён
                        </span>
                      )}
                    </div>
                    {p.price && (
                      <p className="text-sm text-primary font-medium mt-0.5">
                        {Number(p.price).toLocaleString("ru")} ₽
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingProduct(p); setShowForm(true); }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-all"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => deleteProduct(p.id!)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground mt-3">
                  <div>
                    <p className="font-medium text-foreground mb-0.5">Характеристики</p>
                    <p className="line-clamp-2">{p.characteristics}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-0.5">Преимущества</p>
                    <p className="line-clamp-2">{p.advantages}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-0.5">Выгоды</p>
                    <p className="line-clamp-2">{p.benefits}</p>
                  </div>
                </div>
              </div>
            ))}

            {products.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-3 opacity-30">◎</div>
                <p>Продукты не добавлены</p>
                <p className="text-xs mt-1">Добавьте услуги/продукты для ХПВ-тестирования</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "branding" && (
        <div className="card-salon p-6 max-w-md">
          <p className="text-sm text-muted-foreground mb-4">
            Настройка брендинга платформы (будет доступна в следующей версии)
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Название школы/салона</label>
              <input placeholder="Beauty Academy Pro" className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none" disabled />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Основной цвет</label>
              <div className="flex gap-2">
                {["#E5603A", "#2A8A65", "#7C3AED", "#0EA5E9"].map((color) => (
                  <div
                    key={color}
                    className="w-8 h-8 rounded-lg cursor-pointer border-2 border-transparent hover:border-foreground"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования продукта */}
      {showForm && editingProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-lg">
                {editingProduct.id ? "Редактировать продукт" : "Новый продукт"}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingProduct(null); }} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Название *</label>
                  <input
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    placeholder="Ботокс для волос"
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Категория</label>
                  <input
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    placeholder="Уход за волосами"
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none"
                  />
                </div>
              </div>

              {[
                { key: "characteristics", label: "Характеристики (Х)", placeholder: "Состав, технология, время процедуры..." },
                { key: "advantages", label: "Преимущества (П)", placeholder: "Что отличает эту услугу..." },
                { key: "benefits", label: "Выгоды для клиента (В)", placeholder: "Что получит клиент, как изменится его жизнь..." },
                { key: "targetAudience", label: "Целевая аудитория", placeholder: "Кому подходит эта услуга..." },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{field.label}</label>
                  <textarea
                    value={(editingProduct as unknown as Record<string, string>)[field.key] ?? ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Цена (₽)</label>
                <input
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                  placeholder="4500"
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none"
                />
              </div>

              {/* Возражения */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Возражения и ответы
                </label>
                <div className="space-y-2 mb-2">
                  {Object.entries(editingProduct.objections ?? {}).map(([key, val]) => (
                    <div key={key} className="p-2.5 rounded-xl bg-muted text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">«{key}»</span>
                        <button
                          onClick={() => {
                            const { [key]: _, ...rest } = editingProduct.objections;
                            setEditingProduct({ ...editingProduct, objections: rest });
                          }}
                          className="text-xs text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newObjKey}
                    onChange={(e) => setNewObjKey(e.target.value)}
                    placeholder="Возражение (напр. «дорого»)"
                    className="flex-1 px-3 py-2 rounded-xl border border-border text-xs focus:outline-none"
                  />
                  <input
                    value={newObjVal}
                    onChange={(e) => setNewObjVal(e.target.value)}
                    placeholder="Ответ"
                    className="flex-1 px-3 py-2 rounded-xl border border-border text-xs focus:outline-none"
                  />
                  <button
                    onClick={addObjection}
                    className="px-3 py-2 rounded-xl bg-muted text-xs hover:bg-border transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => { setShowForm(false); setEditingProduct(null); }}
                className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted"
              >
                Отмена
              </button>
              <button
                onClick={saveProduct}
                disabled={saving || !editingProduct.name}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/80 disabled:opacity-40"
              >
                {saving ? "Сохраняю..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
