"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { createPaymentAction, updatePaymentAction, deletePaymentAction, searchReceiptsForPaymentAction } from "./actions";

const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function formatDate(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  const day = d.getDate();
  const month = MONTHS_ES[d.getMonth()];
  const year = d.getFullYear();
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "p." : "a.";
  h = h % 12 || 12;
  const min = m < 10 ? `0${m}` : String(m);
  return `${day} ${month} ${year}, ${h}:${min} ${ampm} m.`;
}

function formatAmount(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function getReceiptLabel(receipt) {
  if (!receipt) return "";
  const client = receipt.clients ?? receipt.client;
  const service = receipt.services ?? receipt.service;
  const clientName =
    client && (client.name || client.last_name)
      ? [client.name, client.last_name].filter(Boolean).join(" ")
      : "—";
  const serviceName = service?.name ?? "—";
  const account = receipt.account_receipt_number ?? "";
  return `${clientName} · ${serviceName}${account ? ` (${account})` : ""}`;
}

function getPaymentReceiptDisplay(payment) {
  const receipt = payment.receipt ?? payment.receipts;
  return getReceiptLabel(receipt);
}

function getPaymentClientPhone(payment) {
  const receipt = payment.receipt ?? payment.receipts;
  const client = receipt?.clients ?? receipt?.client;
  return client?.phone_number?.trim() ?? "";
}

/**
 * Normalize phone for wa.me: digits only; if 8 digits assume El Salvador (+503).
 */
function normalizePhoneForWhatsApp(phone) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length === 8 && !digits.startsWith("0")) {
    return "503" + digits;
  }
  if (digits.startsWith("503")) return digits;
  if (digits.startsWith("0")) return "503" + digits.slice(1);
  return digits;
}

/**
 * Build WhatsApp URL with the voucher as plain text.
 */
function buildWhatsAppVoucherUrl(payment) {
  const phone = getPaymentClientPhone(payment);
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) return null;

  const receipt = payment.receipt ?? payment.receipts;
  const client = receipt?.clients ?? receipt?.client;
  const service = receipt?.services ?? receipt?.service;
  const clientName =
    client && (client.name || client.last_name)
      ? [client.name, client.last_name].filter(Boolean).join(" ")
      : "Cliente";
  const serviceName = service?.name ?? "—";
  const account = receipt?.account_receipt_number ?? "";
  const invoiceAmount = Number(payment.total_amount) || 0;
  const serviceFee = 1;
  const total = invoiceAmount + serviceFee;
  const date = formatDate(payment.created_at);

  const message = [
    "———————————————",
    "     Comprobante de pago",
    "———————————————",
    `Número de Comprobante: ${payment.id}`,
    `Cliente: ${clientName}`,
    `Servicio: ${serviceName}${account ? ` ${account}` : ""}`,
    `Monto Factura: ${formatAmount(invoiceAmount)}`,
    `Costo por Servicio: ${formatAmount(serviceFee)}`,
    `Total: ${formatAmount(total)}`,
    `Fecha: ${date}`,
  ].join("\n");

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

export function PaymentsView({ initialPayments, fetchError }) {
  const router = useRouter();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [dateFilter, setDateFilter] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const searchTimeoutRef = useRef(null);
  const comboboxRef = useRef(null);
  const filterDropdownRef = useRef(null);

  const runSearch = useCallback(async (query) => {
    const q = (query ?? "").trim();
    if (q.length < MIN_SEARCH_LENGTH) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    const result = await searchReceiptsForPaymentAction(q);
    setSearchLoading(false);
    if (result.error) {
      setSearchResults([]);
      return;
    }
    setSearchResults(result.receipts ?? []);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const q = searchQuery.trim();
    if (q.length < MIN_SEARCH_LENGTH) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => runSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, runSearch]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectReceipt = useCallback((receipt) => {
    setSelectedReceipt({ id: receipt.id, label: getReceiptLabel(receipt) });
    setSearchQuery("");
    setSearchResults([]);
    setDropdownOpen(false);
  }, []);

  const handleClearReceipt = useCallback(() => {
    setSelectedReceipt(null);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  const handleEditPayment = useCallback((payment) => {
    const receipt = payment.receipt ?? payment.receipts;
    setEditingPayment(payment);
    setSelectedReceipt({ id: payment.receipt_id, label: getReceiptLabel(receipt) });
    setAmount(String(payment.total_amount));
    setFormError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingPayment(null);
    setSelectedReceipt(null);
    setAmount("");
    setFormError(null);
  }, []);

  const handleDeleteClick = useCallback((payment) => {
    setDeleteTarget(payment);
    setDeleteError(null);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deletePaymentAction(deleteTarget.id);
    setIsDeleting(false);
    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  };

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null);
    setDeleteError(null);
  }, []);

  const getFilteredPayments = useCallback(() => {
    const referenceDate = new Date(selectedDate);
    
    return initialPayments.filter((payment) => {
      const paymentDate = new Date(payment.created_at);
      
      switch (dateFilter) {
        case "daily": {
          const paymentDay = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());
          const selectedDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
          return paymentDay.getTime() === selectedDay.getTime();
        }
        case "weekly": {
          const selectedDayStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
          const dayOfWeek = selectedDayStart.getDay();
          const weekStart = new Date(selectedDayStart);
          weekStart.setDate(weekStart.getDate() - dayOfWeek);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          return paymentDate >= weekStart && paymentDate <= weekEnd;
        }
        case "monthly": {
          return paymentDate.getMonth() === referenceDate.getMonth() && 
                 paymentDate.getFullYear() === referenceDate.getFullYear();
        }
        case "yearly": {
          return paymentDate.getFullYear() === referenceDate.getFullYear();
        }
        default:
          return true;
      }
    });
  }, [initialPayments, dateFilter, selectedDate]);

  const payments = getFilteredPayments();

  const getTotalAmount = useCallback(() => {
    return payments.reduce((sum, payment) => sum + (Number(payment.total_amount) || 0), 0);
  }, [payments]);

  const getFilterLabel = () => {
    switch (dateFilter) {
      case "daily":
        return "Diario";
      case "weekly":
        return "Semanal";
      case "monthly":
        return "Mensual";
      case "yearly":
        return "Anual";
      default:
        return "Diario";
    }
  };

  const formatSelectedDate = () => {
    const date = new Date(selectedDate);
    const day = date.getDate();
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const total_amount = amount.trim() === "" ? NaN : Number(amount);
    if (!selectedReceipt?.id) {
      setFormError("Busca y selecciona un recibo (cuenta de cliente).");
      return;
    }
    if (Number.isNaN(total_amount) || total_amount < 0) {
      setFormError("Ingresa un monto válido (0 o mayor).");
      return;
    }
    setIsSubmitting(true);
    
    let result;
    if (editingPayment) {
      result = await updatePaymentAction(editingPayment.id, {
        receipt_id: selectedReceipt.id,
        total_amount,
      });
    } else {
      result = await createPaymentAction({
        receipt_id: selectedReceipt.id,
        total_amount,
      });
    }
    
    setIsSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setEditingPayment(null);
    setSelectedReceipt(null);
    setAmount("");
    router.refresh();
  };

  const inputClass =
    "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30";

  return (
    <div className="space-y-6 tablet:space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tablet:text-3xl">
          Pagos
        </h1>
        <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 tablet:text-base">
          Registrar pagos para cuentas de servicio de clientes (recibos).
        </p>
      </header>

      {fetchError && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {fetchError}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 tablet:p-8">
        <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
          <div ref={filterDropdownRef} className="relative z-10 flex-1 tablet:max-w-xs">
            <button
              type="button"
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className="flex w-full items-center justify-between rounded-xl border border-zinc-300 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 transition-all hover:border-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:border-zinc-500"
              aria-expanded={filterDropdownOpen}
              aria-haspopup="listbox"
            >
              <span>{getFilterLabel()}</span>
              <svg
                className={`h-5 w-5 transition-transform duration-200 ${filterDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {filterDropdownOpen && (
              <ul
                role="listbox"
                className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
              >
                <li role="option" aria-selected={dateFilter === "daily"}>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter("daily");
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                      dateFilter === "daily"
                        ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    Diario
                  </button>
                </li>
                <li role="option" aria-selected={dateFilter === "weekly"}>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter("weekly");
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                      dateFilter === "weekly"
                        ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    Semanal
                  </button>
                </li>
                <li role="option" aria-selected={dateFilter === "monthly"}>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter("monthly");
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                      dateFilter === "monthly"
                        ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    Mensual
                  </button>
                </li>
                <li role="option" aria-selected={dateFilter === "yearly"}>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter("yearly");
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                      dateFilter === "yearly"
                        ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    Anual
                  </button>
                </li>
              </ul>
            )}
          </div>

          <div className="relative flex-1 tablet:max-w-sm">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 transition-all hover:border-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:border-zinc-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
              aria-label="Seleccionar fecha"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Total de pagos mostrados
            </span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {formatAmount(getTotalAmount())}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {payments.length} {payments.length === 1 ? "pago" : "pagos"}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 tablet:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {editingPayment ? "Editar pago" : "Registrar pago"}
          </h2>
          {editingPayment && (
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSubmitting}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-50"
              aria-label="Cancelar edición"
            >
              Cancelar
            </button>
          )}
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 tablet:flex-row tablet:items-end tablet:gap-4"
        >
          <div ref={comboboxRef} className="relative min-w-0 flex-1">
            <label
              htmlFor="payment-receipt-search"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Recibo (cliente · servicio · cuenta) <span className="text-red-500">*</span>
            </label>
            {selectedReceipt ? (
              <div className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-800/50">
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-900 dark:text-zinc-50">
                  {selectedReceipt.label}
                </span>
                <button
                  type="button"
                  onClick={handleClearReceipt}
                  disabled={isSubmitting}
                  className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                  aria-label="Limpiar selección"
                >
                  <span aria-hidden>×</span>
                </button>
              </div>
            ) : (
              <>
                <input
                  id="payment-receipt-search"
                  type="search"
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  disabled={isSubmitting}
                  placeholder="Buscar por nombre de cliente, servicio o número de cuenta…"
                  className={inputClass}
                  aria-invalid={!!formError}
                  aria-expanded={dropdownOpen}
                  aria-controls="receipt-search-results"
                  aria-autocomplete="list"
                  role="combobox"
                />
                {dropdownOpen && (
                  <ul
                    id="receipt-search-results"
                    role="listbox"
                    className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    {searchLoading ? (
                      <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Buscando…
                      </li>
                    ) : searchQuery.trim().length < MIN_SEARCH_LENGTH ? (
                      <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Escribe al menos {MIN_SEARCH_LENGTH} caracteres para buscar
                      </li>
                    ) : searchResults.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                        No se encontraron recibos
                      </li>
                    ) : (
                      searchResults.map((receipt) => (
                        <li key={receipt.id} role="option">
                          <button
                            type="button"
                            onClick={() => handleSelectReceipt(receipt)}
                            className="w-full px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none dark:text-zinc-50 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
                          >
                            {getReceiptLabel(receipt)}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </>
            )}
          </div>
          <div className="w-full tablet:w-40">
            <label
              htmlFor="payment-amount"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Monto <span className="text-red-500">*</span>
            </label>
            <input
              id="payment-amount"
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
              placeholder="0.00"
              className={inputClass}
              aria-invalid={!!formError}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !selectedReceipt}
            className="h-12 shrink-0 rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:focus:ring-offset-zinc-900"
            aria-busy={isSubmitting}
            aria-label={editingPayment ? "Guardar cambios" : "Registrar pago"}
          >
            {isSubmitting ? "Guardando…" : editingPayment ? "Guardar" : "Registrar"}
          </button>
        </form>
        {formError && (
          <div
            role="alert"
            className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {formError}
          </div>
        )}
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Busca por nombre de cliente, nombre de servicio o número de cuenta/recibo. Selecciona
          un resultado para registrar el pago.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200/80 bg-zinc-50/50 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-800/30 tablet:px-6">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Historial de pagos
          </h2>
        </div>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Aún no hay pagos registrados.
            </p>
          </div>
        ) : isMobile ? (
          <ul className="divide-y divide-zinc-200/80 px-4 py-2 dark:divide-zinc-800 tablet:px-6" role="list">
            {payments.map((payment) => {
              const whatsappUrl = buildWhatsAppVoucherUrl(payment);
              const hasPhone = !!getPaymentClientPhone(payment);
              return (
                <li
                  key={payment.id}
                  className="flex flex-col gap-2 py-4 first:pt-4 last:pb-4 tablet:py-5"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-900 dark:text-zinc-50">
                      {getPaymentReceiptDisplay(payment)}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {formatAmount(payment.total_amount)}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-500">
                      {formatDate(payment.created_at)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleEditPayment(payment)}
                      className="text-sm font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                      aria-label={`Editar pago de ${getPaymentReceiptDisplay(payment)}`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(payment)}
                      className="text-sm font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                      aria-label={`Eliminar pago de ${getPaymentReceiptDisplay(payment)}`}
                    >
                      Eliminar
                    </button>
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-cyan-500 hover:underline dark:text-cyan-400"
                        aria-label={`Enviar comprobante por WhatsApp a ${getPaymentReceiptDisplay(payment)}`}
                      >
                        Comprobante
                      </a>
                    ) : (
                      <span
                        className="text-sm text-zinc-400 dark:text-zinc-500"
                        title={hasPhone ? "Número de teléfono inválido" : "No hay número de teléfono para este cliente"}
                      >
                        Comprobante
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" role="grid">
              <thead>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800">
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Recibo (cliente · servicio · cuenta)
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Monto
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Fecha
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const whatsappUrl = buildWhatsAppVoucherUrl(payment);
                  const hasPhone = !!getPaymentClientPhone(payment);
                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-zinc-100 last:border-0 transition-colors hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
                    >
                      <td className="px-4 py-3.5 text-zinc-900 dark:text-zinc-50 tablet:px-6">
                        {getPaymentReceiptDisplay(payment)}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-50 tablet:px-6">
                        {formatAmount(payment.total_amount)}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-500 tablet:px-6">
                        {formatDate(payment.created_at)}
                      </td>
                      <td className="px-4 py-3.5 tablet:px-6">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleEditPayment(payment)}
                            className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                            aria-label={`Editar pago de ${getPaymentReceiptDisplay(payment)}`}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(payment)}
                            className="font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                            aria-label={`Eliminar pago de ${getPaymentReceiptDisplay(payment)}`}
                          >
                            Eliminar
                          </button>
                          {whatsappUrl ? (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-cyan-500 hover:underline dark:text-cyan-400"
                              aria-label={`Enviar comprobante por WhatsApp a ${getPaymentReceiptDisplay(payment)}`}
                            >
                              Comprobante
                            </a>
                          ) : (
                            <span
                              className="text-zinc-400 dark:text-zinc-500"
                              title={hasPhone ? "Número de teléfono inválido" : "No hay número de teléfono para este cliente"}
                            >
                              Comprobante
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-desc"
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="delete-dialog-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Eliminar pago
            </h2>
            <p id="delete-dialog-desc" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              ¿Estás seguro de que deseas eliminar este pago de{" "}
              <strong>{formatAmount(deleteTarget.total_amount)}</strong>
              ? Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <div
                role="alert"
                className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
              >
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                aria-label="Cancelar"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-zinc-900"
                aria-busy={isDeleting}
                aria-label="Eliminar pago"
              >
                {isDeleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
