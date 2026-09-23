"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, naturalSortCompare } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, Package, Boxes, TrendingUp, TrendingDown,
  Coins, BarChart2, DollarSign, ArrowUpRight, RotateCcw, AlertTriangle,
  CheckCircle2, Info, Search, Unlink, Link2, ExternalLink, Loader2,
  GripVertical, ArrowUpDown
} from "lucide-react";
import {
  createProduct,
  updateProduct,
  deleteProducts,
  recoverProduct,
  permanentDeleteProduct,
  getProductLinkedHistory,
  unlinkProductRecord,
  unlinkAllProductRecords,
  updateProductsSortOrder,
} from "@/app/actions/products";
import type { Product } from "@/generated/prisma";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export type DeletedProductItem = Product & {
  _count?: {
    stockRecords: number;
    deliveryRecords: number;
    commercialSales: number;
    officeTransactions: number;
    godownInventory: number;
    companyPayments: number;
  };
};

interface InventoryClientProps {
  initialProducts: Product[];
  initialDeletedProducts?: DeletedProductItem[];
  isAdmin: boolean;
  dashboardData: {
    catalogCount: number;
    catalogCostValue: number;
    catalogSaleValue: number;

    godownStockTotal: number;
    godownStockCost: number;
    godownStockSale: number;

    officeStockTotal: number;
    officeStockCost: number;
    officeStockSale: number;

    salesTotalQty: number;
    salesTotalRevenue: number;
    salesTotalCOGS: number;

    stockValuationList: Array<{
      productId: string;
      productName: string;
      unitCost: number;
      saleRate: number;
      officeStock: number;
      godownStock: number;
      officeCostValuation: number;
      godownCostValuation: number;
      totalStock: number;
      totalCostValuation: number;
      totalSaleValuation: number;
    }>;

    salesList: Array<{
      productId: string;
      productName: string;
      qtySold: number;
      revenue: number;
      cogs: number;
      profit: number;
    }>;
  };
}

function StatCard({ title, value, sub, color, icon }: {
  title: string; value: string; sub?: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-4 bg-white border border-zinc-200 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">{title}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "15", color }}>
          {icon}
        </div>
      </div>
      <p className="text-[20px] font-bold tracking-tight text-zinc-900">{value}</p>
      {sub && <p className="text-[11px] mt-1 text-zinc-400 font-medium">{sub}</p>}
    </div>
  );
}

function InventoryDashboard({
  data,
  isAdmin,
  onEdit,
  onDelete,
  onReorder,
}: {
  data: InventoryClientProps["dashboardData"];
  isAdmin: boolean;
  onEdit: (productId: string) => void;
  onDelete: (id: string, name: string) => void;
  onReorder?: (orderedIds: string[]) => void;
}) {
  const [items, setItems] = useState(data.stockValuationList);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    setItems(data.stockValuationList);
  }, [data.stockValuationList]);

  function handleDragStart(index: number) {
    setDraggedIdx(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    setDragOverIdx(index);
  }

  function handleDrop(index: number) {
    if (draggedIdx === null || draggedIdx === index) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const newItems = [...items];
    const [moved] = newItems.splice(draggedIdx, 1);
    newItems.splice(index, 0, moved);
    setItems(newItems);
    setDraggedIdx(null);
    setDragOverIdx(null);

    if (onReorder) {
      onReorder(newItems.map((it) => it.productId));
    }
  }

  function handleAutoSort() {
    const sorted = [...items].sort((a, b) => naturalSortCompare(a.productName, b.productName));
    setItems(sorted);
    if (onReorder) {
      onReorder(sorted.map((it) => it.productId));
    }
  }

  const marginPercent = data.salesTotalRevenue > 0 
    ? Math.round(((data.salesTotalRevenue - data.salesTotalCOGS) / data.salesTotalRevenue) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Catalog Products"
          value={`${data.catalogCount} Items`}
          sub={`Avg margin: ₹${Math.round(data.catalogSaleValue - data.catalogCostValue).toLocaleString()}`}
          color="#3B82F6"
          icon={<Boxes className="w-4 h-4" />}
        />
        <StatCard
          title="Godown Stock"
          value={formatCurrency(data.godownStockCost)}
          sub={`${data.godownStockTotal} units · Sale Val: ₹${data.godownStockSale.toLocaleString()}`}
          color="#F97316"
          icon={<Package className="w-4 h-4" />}
        />
        <StatCard
          title="Office Stock"
          value={formatCurrency(data.officeStockCost)}
          sub={`${data.officeStockTotal} units · Sale Val: ₹${data.officeStockSale.toLocaleString()}`}
          color="#10B981"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(data.salesTotalRevenue)}
          sub={`${data.salesTotalQty} units sold · Profit Margin: ${marginPercent}%`}
          color="#8B5CF6"
          icon={<Coins className="w-4 h-4" />}
        />
      </div>

      {/* Double Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Chart: Stock Distribution */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            <p className="text-[13px] font-bold text-zinc-800">Stock Distribution (Godown vs Office)</p>
          </div>
          {data.stockValuationList.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-[12px] text-zinc-400">No stock data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.stockValuationList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis dataKey="productName" tick={{ fontSize: 9, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 9, fill: "#71717A" }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                <Bar dataKey="godownStock" name="Godown Stock" fill="#F97316" radius={[3, 3, 0, 0]} />
                <Bar dataKey="officeStock" name="Office Stock" fill="#10B981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right Chart: Sales & Cost analysis */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-purple-600" />
            <p className="text-[13px] font-bold text-zinc-800">Monthly Revenue vs cost (COGS)</p>
          </div>
          {data.salesList.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-[12px] text-zinc-400">No sales transactions recorded this month</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.salesList} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis dataKey="productName" tick={{ fontSize: 9, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 9, fill: "#71717A" }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                <Bar dataKey="revenue" name="Sales Revenue" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cogs" name="Cost of Goods (COGS)" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Stock valuation breakdown table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-bold text-zinc-800">Inventory Stock Valuation &amp; Unit Costs</p>
              {isAdmin && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Drag &amp; Drop to Arrange
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Arranged by natural order (0-9 then A-Z). Drag rows using the grip handle to customize the sequence.
            </p>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            {isAdmin && (
              <button
                type="button"
                onClick={handleAutoSort}
                title="Sort automatically: 0-9 numerical sequence, then A-Z"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                Auto-Sort (0-9 &amp; A-Z)
              </button>
            )}
            <span className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-zinc-200/80 text-zinc-800 whitespace-nowrap">
              Total Valuation: {formatCurrency(data.godownStockCost + data.officeStockCost)}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                {isAdmin && (
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center w-12">
                    #
                  </th>
                )}
                {["Product", "Unit Cost", "Sale Rate", "Office Stock", "Godown Stock", "Total Stock", "Stock Cost Value", "Stock Sale Value", "Potential Margin"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">{h}</th>
                ))}
                {isAdmin && (
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[13px]">
              {items.map((sv, idx) => {
                const margin = sv.saleRate - sv.unitCost;
                const isDragging = draggedIdx === idx;
                const isOver = dragOverIdx === idx;

                return (
                  <tr
                    key={sv.productId}
                    draggable={isAdmin}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={() => {
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    className={`transition-all ${
                      isDragging
                        ? "opacity-30 bg-blue-50/70"
                        : isOver
                        ? "border-t-2 border-blue-500 bg-blue-50/20"
                        : "hover:bg-zinc-50/80"
                    }`}
                  >
                    {isAdmin && (
                      <td className="px-3 py-3 text-center cursor-grab active:cursor-grabbing text-zinc-400 hover:text-blue-600 transition-colors">
                        <div className="flex items-center justify-center gap-1.5" title="Drag to reorder series">
                          <GripVertical className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-mono font-semibold text-zinc-500">{idx + 1}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 font-semibold text-zinc-850">{sv.productName}</td>
                    <td className="px-4 py-3 text-zinc-500">{formatCurrency(sv.unitCost)}</td>
                    <td className="px-4 py-3 text-zinc-900 font-medium">{formatCurrency(sv.saleRate)}</td>
                    <td className="px-4 py-3 font-medium text-emerald-600">{sv.officeStock}</td>
                    <td className="px-4 py-3 font-medium text-orange-600">{sv.godownStock}</td>
                    <td className="px-4 py-3 font-bold text-zinc-900">{sv.totalStock}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-800">{formatCurrency(sv.totalCostValuation)}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-800">{formatCurrency(sv.totalSaleValuation)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">
                      {sv.totalStock > 0 ? formatCurrency(margin * sv.totalStock) : "—"}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onEdit(sv.productId)}
                            title="Edit Product"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => onDelete(sv.productId, sv.productName)}
                            title="Delete Product"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Product Sales valuation Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
          <p className="text-[14px] font-bold text-zinc-800">Monthly Product Sales &amp; Cost Valuation</p>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
            Total Profit: {formatCurrency(data.salesTotalRevenue - data.salesTotalCOGS)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                {["Product", "Units Sold", "Total COGS Cost", "Total Sales Revenue", "Net Profit", "Margin Achievement"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[13px]">
              {data.salesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 text-[12px]">
                    No sales recorded this month
                  </td>
                </tr>
              ) : (
                data.salesList.map((sl) => {
                  const itemMargin = sl.revenue > 0 ? Math.round((sl.profit / sl.revenue) * 100) : 0;
                  return (
                    <tr key={sl.productId} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-zinc-850">{sl.productName}</td>
                      <td className="px-4 py-3 font-bold text-zinc-800">{sl.qtySold}</td>
                      <td className="px-4 py-3 text-zinc-500 font-medium">{formatCurrency(sl.cogs)}</td>
                      <td className="px-4 py-3 text-zinc-900 font-semibold">{formatCurrency(sl.revenue)}</td>
                      <td className="px-4 py-3 text-emerald-600 font-bold">{formatCurrency(sl.profit)}</td>
                      <td className="px-4 py-3">
                        <span className="badge badge-approved font-semibold text-[11px]">
                          {itemMargin}% profit
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function InventoryClient({ initialProducts, initialDeletedProducts = [], isAdmin, dashboardData }: InventoryClientProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [products, setProducts] = useState(initialProducts);
  const [deletedProducts, setDeletedProducts] = useState<DeletedProductItem[]>(initialDeletedProducts);
  const [activeTab, setActiveTab] = useState<"dashboard" | "external" | "cylinders" | "deleted">("dashboard");
  const [selectedDeletedId, setSelectedDeletedId] = useState<string>("");
  const [deletedSearch, setDeletedSearch] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [form, setForm] = useState({ name: "", unitCost: "", saleRate: "", margin: "", isCylinder: "false", hsnCode: "" });

  // Drag and drop states for catalog
  const [catalogDraggedId, setCatalogDraggedId] = useState<string | null>(null);
  const [catalogDragOverId, setCatalogDragOverId] = useState<string | null>(null);

  function handleReorder(orderedIds: string[]) {
    startTransition(async () => {
      const res = await updateProductsSortOrder(orderedIds);
      if (res && res.error) {
        setError(res.error);
      }
    });
  }

  function handleCatalogDragStart(id: string) {
    setCatalogDraggedId(id);
  }

  function handleCatalogDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (catalogDraggedId === null || catalogDraggedId === id) return;
    setCatalogDragOverId(id);
  }

  function handleCatalogDrop(targetId: string) {
    if (!catalogDraggedId || catalogDraggedId === targetId) {
      setCatalogDraggedId(null);
      setCatalogDragOverId(null);
      return;
    }

    const fromIdx = products.findIndex((p) => p.id === catalogDraggedId);
    const toIdx = products.findIndex((p) => p.id === targetId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const newProducts = [...products];
      const [moved] = newProducts.splice(fromIdx, 1);
      newProducts.splice(toIdx, 0, moved);
      setProducts(newProducts);
      handleReorder(newProducts.map((p) => p.id));
    }
    setCatalogDraggedId(null);
    setCatalogDragOverId(null);
  }

  function handleCatalogAutoSort() {
    const sorted = [...products].sort((a, b) => naturalSortCompare(a.name, b.name));
    setProducts(sorted);
    handleReorder(sorted.map((p) => p.id));
    setSuccessMsg("Catalog auto-sorted sequentially (0-9 numerical sequence, followed by A-Z).");
  }

  // Recover modal states
  const [recoverModalOpen, setRecoverModalOpen] = useState(false);
  const [recoverTarget, setRecoverTarget] = useState<DeletedProductItem | null>(null);
  const [recoverForm, setRecoverForm] = useState({
    name: "",
    unitCost: "",
    saleRate: "",
    margin: "",
    isCylinder: "false",
    hsnCode: "",
    gstRate: "5",
  });
  const [recoverError, setRecoverError] = useState("");

  // Linked history states
  const [linkedHistory, setLinkedHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [isUnlinkingAll, setIsUnlinkingAll] = useState(false);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setDeletedProducts(initialDeletedProducts);
  }, [initialDeletedProducts]);

  useEffect(() => {
    if (!selectedDeletedId) {
      setLinkedHistory([]);
      return;
    }
    let active = true;
    setLoadingHistory(true);
    getProductLinkedHistory(selectedDeletedId).then((res) => {
      if (active) {
        if (res && res.records) {
          setLinkedHistory(res.records);
        } else {
          setLinkedHistory([]);
        }
        setLoadingHistory(false);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedDeletedId]);

  useEffect(() => {
    const cost = parseFloat(form.unitCost) || 0;
    const rate = parseFloat(form.saleRate) || 0;
    const computed = rate - cost;
    const computedStr = computed > 0 ? String(Number(computed.toFixed(2))) : "0";
    if (form.margin !== computedStr) {
      setForm((prev) => ({ ...prev, margin: computedStr }));
    }
  }, [form.unitCost, form.saleRate]);

  useEffect(() => {
    const cost = parseFloat(recoverForm.unitCost) || 0;
    const rate = parseFloat(recoverForm.saleRate) || 0;
    const computed = rate - cost;
    const computedStr = computed > 0 ? String(Number(computed.toFixed(2))) : "0";
    if (recoverForm.margin !== computedStr) {
      setRecoverForm((prev) => ({ ...prev, margin: computedStr }));
    }
  }, [recoverForm.unitCost, recoverForm.saleRate]);

  const filteredProducts = activeTab === "dashboard" || activeTab === "deleted"
    ? []
    : products.filter((p: any) => (activeTab === "cylinders" ? p.isCylinder : !p.isCylinder) && p.isActive !== false && !p.name?.endsWith("(Deleted)"));

  function openAdd() {
    setEditProduct(null);
    setForm({
      name: "",
      unitCost: "",
      saleRate: "",
      margin: "",
      isCylinder: activeTab === "cylinders" ? "true" : "false",
      hsnCode: ""
    });
    setError("");
    setModalOpen(true);
  }

  function openEdit(p: any) {
    setEditProduct(p);
    setForm({
      name: p.name,
      unitCost: String(p.unitCost),
      saleRate: String(p.saleRate),
      margin: String(p.margin),
      isCylinder: String(p.isCylinder ?? false),
      hsnCode: p.hsnCode ?? ""
    });
    setError("");
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Product name is required"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (editProduct) fd.append("id", editProduct.id);
    startTransition(async () => {
      const result = editProduct ? await updateProduct(fd) : await createProduct(fd);
      if (result.error) { setError(result.error); return; }
      if (result.product) {
        if (editProduct) setProducts((prev) => prev.map((p) => p.id === result.product!.id ? result.product! : p));
        else setProducts((prev) => [result.product!, ...prev]);
        setModalOpen(false);
        setSuccessMsg(editProduct ? `"${result.product.name}" updated successfully.` : `"${result.product.name}" added to catalog.`);
        router.refresh();
      }
    });
  }

  function handleEditFromDashboard(productId: string) {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      openEdit(prod);
    } else {
      const sv = dashboardData.stockValuationList.find((s) => s.productId === productId);
      if (sv) {
        openEdit({
          id: sv.productId,
          name: sv.productName,
          unitCost: sv.unitCost,
          saleRate: sv.saleRate,
          margin: sv.saleRate - sv.unitCost,
          isCylinder: false,
          hsnCode: "",
          isActive: true,
        });
      }
    }
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Delete ${selected.size} Product(s)?`,
      message: `Are you sure you want to delete ${selected.size} selected product(s)? They will be moved to the Deleted Items tab where you can review, recover, or permanently delete them.`,
      confirmText: `Delete (${selected.size})`,
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    const toDelete = new Set(selected);
    const fd = new FormData();
    Array.from(toDelete).forEach((id) => fd.append("ids", id));
    startTransition(async () => {
      const result = await deleteProducts(fd);
      if (result.success) {
        const deletedItems = products.filter((p) => toDelete.has(p.id));
        setProducts((prev) => prev.filter((p) => !toDelete.has(p.id)));
        if (deletedItems.length) {
          const newDeletedList: DeletedProductItem[] = deletedItems.map((di) => ({
            ...di,
            name: `${di.name.replace(/\s*\(Deleted\)$/i, "").trim()} (Deleted)`,
            isActive: false,
            isDeleted: true,
            deletedAt: new Date(),
            _count: (di as any)._count,
          }));
          setDeletedProducts((prev) => [...newDeletedList, ...prev.filter((p) => !toDelete.has(p.id))]);
        }
        setSelected((prev) => {
          const n = new Set(prev);
          toDelete.forEach((id) => n.delete(id));
          return n;
        });
        setError("");
        setSuccessMsg(`${toDelete.size} product(s) moved to Deleted Items.`);
        router.refresh();
      } else {
        setError(result.error || "Failed to delete product(s).");
      }
    });
  }

  async function handleDeleteSingle(id: string, name: string) {
    const clean = name.replace(/\s*\(Deleted\)$/i, "").trim();
    const ok = await confirm({
      title: `Delete "${clean}"?`,
      message: `Are you sure you want to delete "${clean}"? It will be safely moved to the Deleted Items tab. You can inspect its details, recover it anytime, or permanently delete it.`,
      confirmText: "Move to Deleted Items",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    const fd = new FormData();
    fd.append("ids", id);
    startTransition(async () => {
      const result = await deleteProducts(fd);
      if (result.success) {
        const deletedItem = products.find((p) => p.id === id);
        setProducts((prev) => prev.filter((p) => p.id !== id));
        if (deletedItem) {
          const newlyDeleted: DeletedProductItem = {
            ...deletedItem,
            name: `${clean} (Deleted)`,
            isActive: false,
            isDeleted: true,
            deletedAt: new Date(),
            _count: (deletedItem as any)._count,
          };
          setDeletedProducts((prev) => [newlyDeleted, ...prev.filter((p) => p.id !== id)]);
        }
        setSelected((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
        setError("");
        setSuccessMsg(`"${clean}" moved to Deleted Items.`);
        router.refresh();
      } else {
        setError(result.error || "Failed to delete product.");
      }
    });
  }

  function handleOpenRecover(p: DeletedProductItem) {
    const cleanName = p.name.replace(/\s*\(Deleted\)$/i, "").trim();
    setRecoverTarget(p);
    const cost = String(p.unitCost ?? 0);
    const rate = String(p.saleRate ?? 0);
    const margin = String(p.margin ?? Math.max(0, p.saleRate - p.unitCost));
    setRecoverForm({
      name: cleanName,
      unitCost: cost,
      saleRate: rate,
      margin,
      isCylinder: String(p.isCylinder ?? false),
      hsnCode: p.hsnCode ?? "",
      gstRate: String((p as any).gstRate ?? 5),
    });
    setRecoverError("");
    setRecoverModalOpen(true);
  }

  function handleRecoverSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recoverTarget) return;
    if (!recoverForm.name.trim()) {
      setRecoverError("Product name is required");
      return;
    }
    const fd = new FormData();
    fd.append("id", recoverTarget.id);
    Object.entries(recoverForm).forEach(([k, v]) => fd.append(k, v));

    startTransition(async () => {
      const result = await recoverProduct(fd);
      if (result.error) {
        setRecoverError(result.error);
        return;
      }
      if (result.product) {
        setDeletedProducts((prev) => prev.filter((dp) => dp.id !== recoverTarget.id));
        setProducts((prev) => [result.product!, ...prev.filter((p) => p.id !== result.product!.id)]);
        setRecoverModalOpen(false);
        setRecoverTarget(null);
        if (selectedDeletedId === recoverTarget.id) setSelectedDeletedId("");
        setError("");
        setSuccessMsg(`"${result.product.name}" successfully recovered and restored to active inventory!`);
        router.refresh();
      }
    });
  }

  async function handlePermanentDelete(id: string, name: string) {
    const clean = name.replace(/\s*\(Deleted\)$/i, "").trim();
    const ok = await confirm({
      title: "Permanently Delete Product?",
      message: `Are you sure you want to permanently delete "${clean}" from the database? This cannot be undone and will permanently remove this item.`,
      confirmText: "Delete Permanently",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await permanentDeleteProduct(id);
      if (result.success) {
        setDeletedProducts((prev) => prev.filter((p) => p.id !== id));
        if (selectedDeletedId === id) {
          setSelectedDeletedId("");
          setLinkedHistory([]);
        }
        setError("");
        setSuccessMsg(`"${clean}" was permanently deleted from the database.`);
        router.refresh();
      } else {
        setError(result.error || "Cannot permanently delete product.");
      }
    });
  }

  async function handleUnlinkSingle(recordType: any, recordId: string) {
    const ok = await confirm({
      title: "Unlink Record?",
      message: `Are you sure you want to unlink this record? Its product reference will be disconnected and permanently marked as "[Item Name] (Permanently Deleted)", allowing this product to be deleted safely while keeping financial and delivery audits intact.`,
      confirmText: "Unlink Record",
      variant: "warning",
    });
    if (!ok) return;

    setUnlinkingId(recordId);
    const res = await unlinkProductRecord(recordType, recordId);
    setUnlinkingId(null);
    if (res.success) {
      setLinkedHistory((prev) => prev.filter((r) => r.id !== recordId));
      setDeletedProducts((prev) =>
        prev.map((p) => {
          if (p.id !== selectedDeletedId) return p;
          const counts = { ...(p._count || {}) } as any;
          if (recordType === "delivery" && counts.deliveryRecords) counts.deliveryRecords--;
          if (recordType === "godown" && counts.godownInventory) counts.godownInventory--;
          if (recordType === "commercial" && counts.commercialSales) counts.commercialSales--;
          if (recordType === "stock" && counts.stockRecords) counts.stockRecords--;
          if (recordType === "office" && counts.officeTransactions) counts.officeTransactions--;
          if (recordType === "payment" && counts.companyPayments) counts.companyPayments--;
          return { ...p, _count: counts };
        })
      );
      setSuccessMsg("Record unlinked successfully.");
      router.refresh();
    } else {
      setError(res.error || "Failed to unlink record.");
    }
  }

  async function handleUnlinkAll() {
    if (!selectedDeletedProduct) return;
    const clean = selectedDeletedProduct.name.replace(/\s*\(Deleted\)$/i, "").trim();
    const count = linkedHistory.length;
    const ok = await confirm({
      title: `Unlink All Records for "${clean}"?`,
      message: `Are you sure you want to unlink ALL ${count} historical records linked to "${clean}"? Each record will be archived as "${clean} (Permanently Deleted)" so all past transactions, payments, and delivery logs stay preserved. Once unlinked, you can permanently delete this product.`,
      confirmText: `Unlink All (${count})`,
      variant: "warning",
    });
    if (!ok) return;

    setIsUnlinkingAll(true);
    const res = await unlinkAllProductRecords(selectedDeletedProduct.id);
    setIsUnlinkingAll(false);
    if (res.success) {
      setLinkedHistory([]);
      setDeletedProducts((prev) =>
        prev.map((p) => {
          if (p.id !== selectedDeletedProduct.id) return p;
          return {
            ...p,
            _count: {
              stockRecords: 0,
              deliveryRecords: 0,
              commercialSales: 0,
              officeTransactions: 0,
              godownInventory: 0,
              companyPayments: 0,
            },
          };
        })
      );
      setError("");
      setSuccessMsg(`All ${res.unlinkedCount ?? "historical"} records unlinked successfully! You can now permanently delete this product.`);
      router.refresh();
    } else {
      setError(res.error || "Failed to unlink records.");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const selectedDeletedProduct = deletedProducts.find((p) => p.id === selectedDeletedId);
  const filteredDeletedProducts = deletedProducts.filter((p) => {
    if (!deletedSearch.trim()) return true;
    const clean = p.name.replace(/\s*\(Deleted\)$/i, "").toLowerCase();
    return clean.includes(deletedSearch.toLowerCase()) || (p.hsnCode && p.hsnCode.toLowerCase().includes(deletedSearch.toLowerCase()));
  });

  return (
    <>
      {/* Category Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        <button
          onClick={() => { setActiveTab("dashboard"); setSelected(new Set()); }}
          className={`py-2 px-4 text-[13px] font-semibold border-b-2 whitespace-nowrap transition-all ${
            activeTab === "dashboard"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          📊 Inventory Analysis
        </button>
        <button
          onClick={() => { setActiveTab("cylinders"); setSelected(new Set()); }}
          className={`py-2 px-4 text-[13px] font-semibold border-b-2 whitespace-nowrap transition-all ${
            activeTab === "cylinders"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          🔥 Gas Cylinders
        </button>
        <button
          onClick={() => { setActiveTab("external"); setSelected(new Set()); }}
          className={`py-2 px-4 text-[13px] font-semibold border-b-2 whitespace-nowrap transition-all ${
            activeTab === "external"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          📦 External Accessories
        </button>
        <button
          onClick={() => { setActiveTab("deleted"); setSelected(new Set()); }}
          className={`py-2 px-4 text-[13px] font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === "deleted"
              ? "border-red-600 text-red-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          🗑️ Deleted Items
          {deletedProducts.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === "deleted" ? "bg-red-100 text-red-700" : "bg-zinc-200 text-zinc-600"
            }`}>
              {deletedProducts.length}
            </span>
          )}
        </button>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div
          className="flex items-center gap-2.5 text-[13px] px-4 py-3 rounded-lg mb-4"
          style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D" }}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span className="flex-1 font-medium">{successMsg}</span>
          <button
            onClick={() => setSuccessMsg("")}
            style={{ color: "#15803D", opacity: 0.6, cursor: "pointer", background: "none", border: "none", fontSize: 16, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="flex items-center gap-2.5 text-[13px] px-4 py-3 rounded-lg mb-4"
          style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}
        >
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} style={{ color: "#B91C1C", opacity: 0.6, cursor: "pointer", background: "none", border: "none", fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {activeTab === "dashboard" ? (
        <InventoryDashboard
          data={dashboardData}
          isAdmin={isAdmin}
          onEdit={handleEditFromDashboard}
          onDelete={handleDeleteSingle}
          onReorder={handleReorder}
        />
      ) : activeTab === "deleted" ? (
        <div className="space-y-6">
          {/* Deleted Products Dropdown / Selector Card */}
          <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-[15px] font-semibold text-zinc-900 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  Deleted Products Directory
                </h3>
                <p className="text-[12px] text-zinc-500 mt-0.5">
                  Select a deleted product from the dropdown to inspect its details, restore it to active inventory, or permanently delete it.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                  {deletedProducts.length} Deleted {deletedProducts.length === 1 ? "Item" : "Items"}
                </span>
              </div>
            </div>

            {/* Dropdown element */}
            <div className="max-w-xl">
              <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">
                Select Deleted Product from Dropdown:
              </label>
              <select
                value={selectedDeletedId}
                onChange={(e) => setSelectedDeletedId(e.target.value)}
                className="w-full text-[13px] border border-zinc-300 rounded-lg px-3 py-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose a deleted product from dropdown --</option>
                {deletedProducts.map((p) => {
                  const clean = p.name.replace(/\s*\(Deleted\)$/i, "").trim();
                  return (
                    <option key={p.id} value={p.id}>
                      {clean} ({p.isCylinder ? "Gas Cylinder" : "Accessory"}) — Rate: ₹{p.saleRate}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected item inspector card */}
            {selectedDeletedProduct && (
              <div className="mt-5 p-4 rounded-xl border border-zinc-200 bg-zinc-50/80">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[16px] font-bold text-zinc-900">
                        {selectedDeletedProduct.name.replace(/\s*\(Deleted\)$/i, "").trim()}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                        Deleted
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-200 text-zinc-700">
                        {selectedDeletedProduct.isCylinder ? "🔥 Gas Cylinder" : "📦 External Accessory"}
                      </span>
                    </div>

                    {/* Details pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[12px]">
                      <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                        <span className="text-zinc-400 block text-[11px]">Unit Cost</span>
                        <strong className="text-zinc-800 text-[13px]">{formatCurrency(selectedDeletedProduct.unitCost)}</strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                        <span className="text-zinc-400 block text-[11px]">Sale Rate</span>
                        <strong className="text-zinc-800 text-[13px]">{formatCurrency(selectedDeletedProduct.saleRate)}</strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                        <span className="text-zinc-400 block text-[11px]">Margin</span>
                        <strong className="text-emerald-600 text-[13px]">{formatCurrency(selectedDeletedProduct.margin)}</strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                        <span className="text-zinc-400 block text-[11px]">HSN & GST</span>
                        <strong className="text-zinc-800 text-[13px]">
                          {selectedDeletedProduct.hsnCode || "—"} ({(selectedDeletedProduct as any).gstRate ?? 5}%)
                        </strong>
                      </div>
                    </div>

                    {/* Linked records notice & detailed history section */}
                    {(() => {
                      const totalLinks =
                        linkedHistory.length > 0
                          ? linkedHistory.length
                          : (selectedDeletedProduct._count?.deliveryRecords ?? 0) +
                            (selectedDeletedProduct._count?.godownInventory ?? 0) +
                            (selectedDeletedProduct._count?.commercialSales ?? 0) +
                            (selectedDeletedProduct._count?.stockRecords ?? 0) +
                            (selectedDeletedProduct._count?.officeTransactions ?? 0) +
                            (selectedDeletedProduct._count?.companyPayments ?? 0);

                      return (
                        <div className="space-y-3 pt-2">
                          {totalLinks > 0 ? (
                            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                  <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[13px] font-bold text-amber-900">
                                        Linked Historical Records ({totalLinks})
                                      </span>
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-200/80 text-amber-900">
                                        Cannot delete directly
                                      </span>
                                    </div>
                                    <p className="text-[11.5px] text-amber-800 mt-1 leading-relaxed">
                                      This product is linked to past transactions. Click <strong>&quot;Unlink&quot;</strong> to decouple each record and stamp its name as <em>&quot;{selectedDeletedProduct.name.replace(/\s*\(Deleted\)$/i, "").trim()} (Permanently Deleted)&quot;</em>. This preserves all financial audits while allowing this product to be permanently deleted.
                                    </p>
                                  </div>
                                </div>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={handleUnlinkAll}
                                    disabled={isUnlinkingAll}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-300 border border-amber-300 transition-colors shadow-2xs whitespace-nowrap self-start sm:self-center"
                                  >
                                    {isUnlinkingAll ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Unlink className="w-3.5 h-3.5" />
                                    )}
                                    Unlink All ({totalLinks} Records)
                                  </button>
                                )}
                              </div>

                              {/* Detailed records breakdown table */}
                              {loadingHistory ? (
                                <div className="py-4 text-center text-amber-700 flex items-center justify-center gap-2 text-[12px]">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Loading detailed transaction history...
                                </div>
                              ) : linkedHistory.length > 0 ? (
                                <div className="rounded-lg border border-amber-200/80 bg-white overflow-hidden max-h-64 overflow-y-auto">
                                  <table className="w-full text-left text-[12px]">
                                    <thead className="bg-amber-50/70 border-b border-amber-100 text-amber-900 font-semibold uppercase text-[10px] tracking-wider">
                                      <tr>
                                        <th className="px-3 py-2">Record Type</th>
                                        <th className="px-3 py-2">Date</th>
                                        <th className="px-3 py-2">Details & References</th>
                                        <th className="px-3 py-2 text-right">Qty / Amount</th>
                                        {isAdmin && <th className="px-3 py-2 text-center">Action</th>}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-amber-100/60">
                                      {linkedHistory.map((rec) => (
                                        <tr key={rec.id} className="hover:bg-amber-50/40 transition-colors">
                                          <td className="px-3 py-2 font-medium">
                                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                                              rec.type === "delivery" ? "bg-blue-100 text-blue-800" :
                                              rec.type === "godown" ? "bg-purple-100 text-purple-800" :
                                              rec.type === "commercial" ? "bg-emerald-100 text-emerald-800" :
                                              rec.type === "stock" ? "bg-orange-100 text-orange-800" :
                                              rec.type === "office" ? "bg-sky-100 text-sky-800" :
                                              "bg-zinc-100 text-zinc-800"
                                            }`}>
                                              {rec.typeName}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">
                                            {new Date(rec.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                          </td>
                                          <td className="px-3 py-2 text-zinc-700">{rec.details}</td>
                                          <td className="px-3 py-2 text-right font-medium text-zinc-900 whitespace-nowrap">
                                            {rec.amountOrQty}
                                          </td>
                                          {isAdmin && (
                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                              <button
                                                type="button"
                                                onClick={() => handleUnlinkSingle(rec.type, rec.id)}
                                                disabled={unlinkingId === rec.id}
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition-colors"
                                                title="Unlink this record"
                                              >
                                                {unlinkingId === rec.id ? (
                                                  <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                  <Unlink className="w-3 h-3" />
                                                )}
                                                Unlink
                                              </button>
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-xl">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <span className="font-medium">
                                0 Linked Records. This product has no active database linkages and can be safely purged permanently.
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions for selected product */}
                  {isAdmin && (
                    <div className="flex flex-row md:flex-col gap-2 flex-shrink-0 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => handleOpenRecover(selectedDeletedProduct)}
                        className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Recover Item
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermanentDelete(selectedDeletedProduct.id, selectedDeletedProduct.name)}
                        className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 shadow-sm transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Permanent Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* All Deleted Items Table */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-bold text-zinc-800">All Deleted Items ({deletedProducts.length})</p>
                <p className="text-[11px] text-zinc-500">Click &quot;Recover&quot; to review details and restore the item back into active inventory.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search deleted items..."
                  value={deletedSearch}
                  onChange={(e) => setDeletedSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/70 border-b border-zinc-100">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Product Name</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Category</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-right">Cost</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-right">Sale Rate</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-right">Margin</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">HSN</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">Linked Records</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Status</th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-[13px]">
                  {filteredDeletedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-zinc-400">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-[13px] font-medium text-zinc-600">No deleted items found</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">When products are deleted from inventory, they will appear here.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDeletedProducts.map((p) => {
                      const cleanName = p.name.replace(/\s*\(Deleted\)$/i, "").trim();
                      const totalLinks =
                        (p._count?.deliveryRecords ?? 0) +
                        (p._count?.godownInventory ?? 0) +
                        (p._count?.commercialSales ?? 0) +
                        (p._count?.stockRecords ?? 0) +
                        (p._count?.officeTransactions ?? 0) +
                        (p._count?.companyPayments ?? 0);

                      return (
                        <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 bg-red-50 text-red-500">
                                <Package className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="font-semibold text-zinc-900">{cleanName}</p>
                                <span className="text-[10px] text-red-500 font-medium">Deleted</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-600 text-[12px]">
                            {p.isCylinder ? "🔥 Gas Cylinder" : "📦 Accessory"}
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-600">{formatCurrency(p.unitCost)}</td>
                          <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatCurrency(p.saleRate)}</td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-600">{formatCurrency(p.margin)}</td>
                          <td className="px-4 py-3 text-zinc-500 text-[12px]">{p.hsnCode || "—"}</td>
                          <td className="px-4 py-3 text-center">
                            {totalLinks > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDeletedId(p.id);
                                  window.scrollTo({ top: 180, behavior: "smooth" });
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 transition-colors"
                                title="Click to inspect linked history and unlink records"
                              >
                                <Unlink className="w-3 h-3 text-amber-700" />
                                {totalLinks} linked · Inspect
                              </button>
                            ) : (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                0 linked · Safe
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                              Deleted
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenRecover(p)}
                                  title="Recover item to active inventory"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Recover
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePermanentDelete(p.id, p.name)}
                                  title="Permanent Delete"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              {isAdmin && selected.size > 0 && (
                <button onClick={handleDeleteSelected} disabled={isPending} className="btn btn-danger">
                  <Trash2 className="w-3.5 h-3.5" /> Delete ({selected.size})
                </button>
              )}
              <span className="text-[13px]" style={{ color: "#A1A1AA" }}>
                {filteredProducts.length} {activeTab === "cylinders" ? "cylinder" : "accessory"}{filteredProducts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleCatalogAutoSort}
                  title="Sort automatically: 0-9 numerical sequence, then A-Z"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                  Auto-Sort (0-9 &amp; A-Z)
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={openAdd}
                  className="btn btn-primary"
                  style={{ boxShadow: "0 1px 4px rgba(37,99,235,0.25)" }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add {activeTab === "cylinders" ? "cylinder" : "accessory"}
                </button>
              )}
            </div>
          </div>

          {/* Product Cards (Mobile <768px) and Table (Desktop >=768px) */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)" }}>
            
            {/* MOBILE CARDS VIEW (<768px) */}
            <div className="block md:hidden divide-y divide-zinc-100">
              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-zinc-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-[13px] font-semibold text-zinc-600">No products found</p>
                  {isAdmin && <button onClick={openAdd} className="text-[12px] font-bold text-blue-600 mt-1">Add your first item →</button>}
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <div key={`mob-prod-${p.id}`} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {isAdmin && (
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="w-4 h-4 rounded accent-blue-600 flex-shrink-0"
                          />
                        )}
                        <div>
                          <p className="text-sm font-bold text-zinc-900 leading-snug">{p.name}</p>
                          <span className="text-[10px] text-zinc-400 font-mono">HSN: {p.hsnCode ?? "—"}</span>
                        </div>
                      </div>
                      <span className={`badge ${p.isActive ? "badge-approved" : "badge-neutral"}`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-zinc-50 p-2.5 rounded-lg text-center text-xs border border-zinc-100">
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase font-bold block">Cost</span>
                        <span className="font-semibold text-zinc-600">{formatCurrency(p.unitCost)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase font-bold block">Sale Rate</span>
                        <span className="font-bold text-zinc-900">{formatCurrency(p.saleRate)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase font-bold block">Margin</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(p.margin)}</span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-100">
                        <button
                          onClick={() => openEdit(p)}
                          className="px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(p.id, p.name)}
                          className="px-3 py-1 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* DESKTOP TABLE VIEW (>=768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    {isAdmin && (
                      <th style={{ width: 40 }} className="text-center">#</th>
                    )}
                    {isAdmin && (
                      <th style={{ width: 40 }}>
                        <input
                          type="checkbox"
                          checked={selected.size === filteredProducts.length && filteredProducts.length > 0}
                          onChange={() => selected.size === filteredProducts.length ? setSelected(new Set()) : setSelected(new Set(filteredProducts.map((p) => p.id)))}
                          className="w-3.5 h-3.5 rounded accent-blue-600"
                        />
                      </th>
                    )}
                    <th>Product name</th>
                    <th>HSN Code</th>
                    <th className="text-right">Unit cost</th>
                    <th className="text-right">Sale rate</th>
                    <th className="text-right">Margin</th>
                    <th className="text-center">Status</th>
                    {isAdmin && <th className="text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 6} className="py-14 text-center">
                        <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
                        <p className="text-[13px]" style={{ color: "#A1A1AA" }}>No products here yet</p>
                        {isAdmin && <button onClick={openAdd} className="text-[12px] font-medium mt-1.5" style={{ color: "#2563EB" }}>Add your first item →</button>}
                      </td>
                    </tr>
                  ) : filteredProducts.map((p, idx) => (
                    <tr
                      key={p.id}
                      draggable={isAdmin}
                      onDragStart={() => handleCatalogDragStart(p.id)}
                      onDragOver={(e) => handleCatalogDragOver(e, p.id)}
                      onDrop={() => handleCatalogDrop(p.id)}
                      onDragEnd={() => {
                        setCatalogDraggedId(null);
                        setCatalogDragOverId(null);
                      }}
                      className={`transition-all ${
                        catalogDraggedId === p.id
                          ? "opacity-30 bg-blue-50/70"
                          : catalogDragOverId === p.id
                          ? "border-t-2 border-blue-500 bg-blue-50/20"
                          : ""
                      }`}
                    >
                      {isAdmin && (
                        <td className="text-center cursor-grab active:cursor-grabbing text-zinc-400 hover:text-blue-600">
                          <div className="flex items-center justify-center gap-1" title="Drag to reorder series">
                            <GripVertical className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-mono text-zinc-500">{idx + 1}</span>
                          </div>
                        </td>
                      )}
                      {isAdmin && (
                        <td><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-3.5 h-3.5 rounded accent-blue-600" /></td>
                      )}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#EFF6FF" }}>
                            <Package className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                          </div>
                          <span className="text-[13px] font-medium" style={{ color: "#18181B" }}>{p.name}</span>
                        </div>
                      </td>
                      <td className="text-[13px]" style={{ color: "#52525B" }}>{p.hsnCode ?? "—"}</td>
                      <td className="text-right text-[13px]" style={{ color: "#52525B" }}>{formatCurrency(p.unitCost)}</td>
                      <td className="text-right text-[13px] font-medium" style={{ color: "#18181B" }}>{formatCurrency(p.saleRate)}</td>
                      <td className="text-right text-[13px] font-medium" style={{ color: "#16A34A" }}>{formatCurrency(p.margin)}</td>
                      <td className="text-center">
                        <span className={`badge ${p.isActive ? "badge-approved" : "badge-neutral"}`}>
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEdit(p)}
                              title="Edit product"
                              className="btn-action btn-action-primary"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSingle(p.id, p.name)}
                              title="Delete product"
                              className="btn-action btn-action-danger"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editProduct ? "Edit product" : "Add product"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-[13px] px-3 py-2.5 rounded-md" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}>
              {error}
            </div>
          )}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Product Category *</label>
            <select
              value={form.isCylinder}
              onChange={(e) => setForm({ ...form, isCylinder: e.target.value })}
              className="input"
            >
              <option value="false">External Accessory (Stoves, Regulators, Pipes, etc.)</option>
              <option value="true">Gas Cylinder (Commercial, Domestic, etc.)</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Product name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., 14.2 KG Cylinder" className="input" />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>HSN Code</label>
            <input value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} placeholder="e.g., 2711" className="input" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Unit cost (₹)", key: "unitCost" },
              { label: "Sale rate (₹)", key: "saleRate" },
              { label: "Margin (₹)", key: "margin" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>{f.label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder="0"
                  className={`input ${f.key === "margin" ? "bg-slate-50 cursor-not-allowed opacity-75 font-semibold text-slate-500" : ""}`}
                  readOnly={f.key === "margin"}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">
              {isPending ? "Saving…" : editProduct ? "Update" : "Add product"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Recover Product to Inventory Modal */}
      <Modal
        open={recoverModalOpen}
        onClose={() => setRecoverModalOpen(false)}
        title="Recover Product to Inventory"
        subtitle="Review and edit product details before restoring it back to active inventory catalog."
      >
        <form onSubmit={handleRecoverSubmit} className="space-y-4">
          {recoverError && (
            <div className="text-[13px] px-3 py-2.5 rounded-md bg-red-50 border border-red-200 text-red-700">
              {recoverError}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium mb-1.5 text-zinc-700">Product Category *</label>
            <select
              value={recoverForm.isCylinder}
              onChange={(e) => setRecoverForm({ ...recoverForm, isCylinder: e.target.value })}
              className="input"
            >
              <option value="true">Gas Cylinder (Commercial, Domestic, etc.)</option>
              <option value="false">External Accessory (Stoves, Regulators, Pipes, etc.)</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5 text-zinc-700">Product Name *</label>
            <input
              value={recoverForm.name}
              onChange={(e) => setRecoverForm({ ...recoverForm, name: e.target.value })}
              placeholder="e.g. 14.2 KG Domestic Cylinder"
              className="input font-medium"
              required
            />
            <p className="text-[11px] text-zinc-400 mt-1">The product will be restored to active inventory with this clean name.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5 text-zinc-700">HSN Code</label>
              <input
                value={recoverForm.hsnCode}
                onChange={(e) => setRecoverForm({ ...recoverForm, hsnCode: e.target.value })}
                placeholder="e.g. 2711"
                className="input"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5 text-zinc-700">GST Rate (%)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={recoverForm.gstRate}
                onChange={(e) => setRecoverForm({ ...recoverForm, gstRate: e.target.value })}
                placeholder="5"
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5 text-zinc-700">Unit Cost (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={recoverForm.unitCost}
                onChange={(e) => setRecoverForm({ ...recoverForm, unitCost: e.target.value })}
                placeholder="0"
                className="input"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5 text-zinc-700">Sale Rate (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={recoverForm.saleRate}
                onChange={(e) => setRecoverForm({ ...recoverForm, saleRate: e.target.value })}
                placeholder="0"
                className="input"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5 text-zinc-700">Margin (₹)</label>
              <input
                type="number"
                step="0.01"
                value={recoverForm.margin}
                onChange={(e) => setRecoverForm({ ...recoverForm, margin: e.target.value })}
                placeholder="0"
                className="input bg-slate-50 font-semibold text-emerald-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setRecoverModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
            >
              {isPending ? "Restoring..." : "Restore to Inventory"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
