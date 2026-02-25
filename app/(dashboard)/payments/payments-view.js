"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { createPaymentAction, searchReceiptsForPaymentAction } from "./actions";

function formatDate(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("es-SV", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

export function PaymentsView({ initialPayments, fetchError }) {
  const router = useRouter();
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Payments
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Register payments for client service accounts (receipts).
        </p>
      </header>

      {fetchError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {fetchError}
        </div>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Register payment
        </h2>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4"
        >
          <div ref={comboboxRef} className="relative min-w-0 flex-1">
            <label
              htmlFor="payment-receipt-search"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Receipt (client · service · account) <span className="text-red-500">*</span>
            </label>
            {selectedReceipt ? (
              <div className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800/50">
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
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
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
          <div className="w-full sm:w-40">
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
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
              aria-invalid={!!formError}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !selectedReceipt}
            className="h-10 shrink-0 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-offset-zinc-900"
            aria-busy={isSubmitting}
            aria-label="Register payment"
          >
            {isSubmitting ? "Saving…" : "Register"}
          </button>
        </form>
        {formError && (
          <div
            role="alert"
            className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {formError}
          </div>
        )}
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Search by client name, service name, or account/receipt number. Select
          a result to register the payment.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Payment history
          </h2>
        </div>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No payments registered yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" role="grid">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Receipt (client · service · account)
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Amount
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                      {getPaymentReceiptDisplay(payment)}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                      {formatAmount(payment.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-500">
                      {formatDate(payment.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
