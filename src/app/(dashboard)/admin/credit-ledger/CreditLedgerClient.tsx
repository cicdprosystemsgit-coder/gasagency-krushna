"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, CreditCard, Search, User, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { createCreditEntry, addCustomer } from "@/app/actions/credit-ledger";
import type { Customer } from "@/generated/prisma";

interface Entry {
  id: string;
  date: Date | string;
  type: string;
  amount: number;
  description: string | null;
  customer: { name: string; phone: string };
  addedBy: { name: string };
}

interface CreditLedgerClientProps {
  customers: Customer[];
  initialEntries: Entry[];
  canEdit: boolean;
  userId: string;
}

export function CreditLedgerClient({ customers, initialEntries, canEdit, userId }: CreditLedgerClientProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [allCustomers, setAllCustomers] = useState(customers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [addCustomerModal, setAddCustomerModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ customerId: "", type: "CREDIT", amount: "", description: "" });
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", address: "", type: "COMMERCIAL" });

  const filtered = allCustomers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  function getCustomerBalance(customerId: string) {
    return entries
      .filter((e) => e.customer.name === allCustomers.find((c) => c.id === customerId)?.name)
      .reduce((a, e) => e.type === "CREDIT" ? a + e.amount : a - e.amount, 0);
  }

  function getCustomerEntries(customerId: string) {
    const name = allCustomers.find((c) => c.id === customerId)?.name;
    return entries.filter((e) => e.customer.name === name);
  }

  function handleEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) { setError("Please select a customer"); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError("Please enter a valid amount"); return; }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("addedById", userId);

    startTransition(async () => {
      const result = await createCreditEntry(fd);
      if (result.error) { setError(result.error); return; }
      if (result.entry) {
        setEntries((prev) => [result.entry!, ...prev]);
        setModalOpen(false);
        setForm({ customerId: "", type: "CREDIT", amount: "", description: "" });
      }
    });
  }

  function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!customerForm.name.trim()) { setError("Name is required"); return; }
    if (!/^[a-zA-Z\s]+$/.test(customerForm.name)) { setError("Name: only alphabetic characters allowed"); return; }
    if (!customerForm.phone.trim()) { setError("Phone is required"); return; }
    if (!/^\d{10}$/.test(customerForm.phone)) { setError("Phone: must be 10 digits only"); return; }

    const fd = new FormData();
    Object.entries(customerForm).forEach(([k, v]) => fd.append(k, v));

    startTransition(async () => {
      const result = await addCustomer(fd);
      if (result.error) { setError(result.error); return; }
      if (result.customer) {
        setAllCustomers((prev) => [...prev, result.customer!]);
        setAddCustomerModal(false);
        setCustomerForm({ name: "", phone: "", address: "", type: "COMMERCIAL" });
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Customer List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800">Customers</h3>
            {canEdit && (
              <button
                onClick={() => { setError(""); setAddCustomerModal(true); }}
                className="flex items-center gap-1.5 text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-800 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add New
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
          {filtered.map((c) => {
            const balance = getCustomerBalance(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCustomer(c)}
                className={`w-full px-4 py-3 flex items-center justify-between border-b border-slate-50 last:border-0 hover:bg-slate-50 transition text-left ${selectedCustomer?.id === c.id ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(Math.abs(balance))}
                  </p>
                  <p className="text-xs text-slate-400">{balance > 0 ? "Due" : "Paid"}</p>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-slate-400 text-sm">
              <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No customers found
            </div>
          )}
        </div>
      </div>

      {/* Customer Detail */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
        {!selectedCustomer ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
            <CreditCard className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">Select a customer to view credit history</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{selectedCustomer.name}</h3>
                  <p className="text-sm text-slate-500">{selectedCustomer.phone} · {selectedCustomer.address ?? "No address"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Outstanding Balance</p>
                  <p className={`text-xl font-bold ${getCustomerBalance(selectedCustomer.id) > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(Math.abs(getCustomerBalance(selectedCustomer.id)))}
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => { setForm({ ...form, customerId: selectedCustomer.id }); setError(""); setModalOpen(true); }}
                    className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 transition"
                  >
                    <Plus className="w-4 h-4" /> Log Credit / Payment
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-320px)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 sticky top-0">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">By</th>
                  </tr>
                </thead>
                <tbody>
                  {getCustomerEntries(selectedCustomer.id).map((entry) => (
                    <tr key={entry.id} className="table-row border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 text-slate-500">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {entry.type === "CREDIT" ? (
                            <ArrowUpCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <ArrowDownCircle className="w-4 h-4 text-green-500" />
                          )}
                          <span className={`text-xs font-semibold ${entry.type === "CREDIT" ? "text-red-600" : "text-green-600"}`}>
                            {entry.type === "CREDIT" ? "Credit Given" : "Payment Received"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(entry.amount)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{entry.description ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{entry.addedBy.name}</td>
                    </tr>
                  ))}
                  {getCustomerEntries(selectedCustomer.id).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">No credit entries yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Log Credit/Payment Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Credit / Payment" size="sm">
        <form onSubmit={handleEntry} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {["CREDIT", "PAYMENT"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition ${form.type === t ? (t === "CREDIT" ? "border-red-400 bg-red-50 text-red-700" : "border-green-400 bg-green-50 text-green-700") : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                >
                  {t === "CREDIT" ? "Credit Given" : "Payment Received"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (₹) *</label>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description (Optional)</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g., October delivery, partial payment..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
            <button type="submit" disabled={isPending} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition">
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Customer Modal */}
      <Modal open={addCustomerModal} onClose={() => setAddCustomerModal(false)} title="Add New Customer" size="md">
        <form onSubmit={handleAddCustomer} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Customer Name * (alphabets only)</label>
            <input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} placeholder="e.g., Sharma Restaurant" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number * (10 digits)</label>
            <input type="tel" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="9876543210" maxLength={10} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
            <input value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} placeholder="Full address" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type</label>
            <select value={customerForm.type} onChange={(e) => setCustomerForm({ ...customerForm, type: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="COMMERCIAL">Commercial (Hotel/Restaurant)</option>
              <option value="DOMESTIC">Domestic (Home)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setAddCustomerModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
            <button type="submit" disabled={isPending} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition">
              {isPending ? "Adding..." : "Add Customer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
