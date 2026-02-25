"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { createPaymentAction, searchReceiptsForPaymentAction } from "./actions";

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
  const amount = formatAmount(payment.total_amount);
  const date = formatDate(payment.created_at);

  const message = [
    "Comprobante de pago",
    "—",
    `Cliente: ${clientName}`,
    `Servicio: ${serviceName}${account ? ` (${account})` : ""}`,
    `Monto: ${amount}`,
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
  const payments = initialPayments;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchTimeoutRef = useRef(null);
  const comboboxRef = useRef(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const total_amount = amount.trim() === "" ? NaN : Number(amount);
    if (!selectedReceipt?.id) {
      setFormError("Search and select a receipt (client account).");
      return;
    }
    if (Number.isNaN(total_amount) || total_amount < 0) {
      setFormError("Enter a valid amount (0 or greater).");
      return;
    }
    setIsSubmitting(true);
    const result = await createPaymentAction({
      receipt_id: selectedReceipt.id,
      total_amount,
    });
    setIsSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
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
          Payments
        </h1>
        <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 tablet:text-base">
          Register payments for client service accounts (receipts).
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

      <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 tablet:p-8">
        <h2 className="mb-5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Register payment
        </h2>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 tablet:flex-row tablet:items-end tablet:gap-4"
        >
          <div ref={comboboxRef} className="relative min-w-0 flex-1">
            <label
              htmlFor="payment-receipt-search"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Receipt (client · service · account) <span className="text-red-500">*</span>
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
                  aria-label="Clear selection"
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
                  placeholder="Search by client name, service, or account number…"
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
                        Searching…
                      </li>
                    ) : searchQuery.trim().length < MIN_SEARCH_LENGTH ? (
                      <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Type at least {MIN_SEARCH_LENGTH} characters to search
                      </li>
                    ) : searchResults.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                        No receipts found
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
              Amount <span className="text-red-500">*</span>
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
            aria-label="Register payment"
          >
            {isSubmitting ? "Saving…" : "Register"}
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
          Search by client name, service name, or account/receipt number. Select
          a result to register the payment.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200/80 bg-zinc-50/50 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-800/30 tablet:px-6">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Payment history
          </h2>
        </div>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No payments registered yet.
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
                  <div className="pt-1">
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                        aria-label={`Send voucher via WhatsApp to ${getPaymentReceiptDisplay(payment)}`}
                      >
                        <span aria-hidden>Send Voucher</span>
                        <svg
                          className="h-4 w-4 shrink-0"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </a>
                    ) : (
                      <span
                        className="text-sm text-zinc-400 dark:text-zinc-500"
                        title={hasPhone ? "Invalid phone number" : "No phone number for this client"}
                      >
                        Send Voucher
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
                    Receipt (client · service · account)
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Amount
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Date
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    <span className="sr-only">Actions</span>
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
                        {whatsappUrl ? (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                            aria-label={`Send voucher via WhatsApp to ${getPaymentReceiptDisplay(payment)}`}
                          >
                            <span aria-hidden>Send Voucher</span>
                            <svg
                              className="h-4 w-4 shrink-0"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                          </a>
                        ) : (
                          <span
                            className="text-sm text-zinc-400 dark:text-zinc-500"
                            title={hasPhone ? "Invalid phone number" : "No phone number for this client"}
                          >
                            Send Voucher
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
