"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import {
  createClientAction,
  updateClientAction,
  deleteClientAction,
  getServicesListAction,
  getClientReceiptsAction,
  createReceiptAction,
  deleteReceiptByIdAction,
} from "./actions";

const EMPTY_FORM = {
  name: "",
  last_name: "",
  phone_number: "",
  reference: "",
};

function formatDate(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("es-SV", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ClientsView({ initialClients, fetchError }) {
  const router = useRouter();
  const clients = initialClients;
  const [formOpen, setFormOpen] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [servicesList, setServicesList] = useState([]);
  const [clientReceipts, setClientReceipts] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [linkForm, setLinkForm] = useState({ serviceId: null, accountNumber: "" });
  const [linkError, setLinkError] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const [unlinkingReceiptId, setUnlinkingReceiptId] = useState(null);

  const isEditing = formOpen && formOpen !== "create";

  useEffect(() => {
    if (!isEditing || !formOpen?.id) {
      setServicesList([]);
      setClientReceipts([]);
      return;
    }
    let cancelled = false;
    setServicesLoading(true);
    Promise.all([
      getServicesListAction(),
      getClientReceiptsAction(formOpen.id),
    ]).then(([servicesRes, receiptsRes]) => {
      if (cancelled) return;
      setServicesLoading(false);
      if (servicesRes.error) return;
      if (receiptsRes.error) return;
      setServicesList(servicesRes.services ?? []);
      setClientReceipts(receiptsRes.receipts ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [isEditing, formOpen?.id]);

  const openCreate = useCallback(() => {
    setFormOpen("create");
    setFormData(EMPTY_FORM);
    setFormError(null);
  }, []);

  const openEdit = useCallback((client) => {
    setFormOpen(client);
    setFormData({
      name: client.name ?? "",
      last_name: client.last_name ?? "",
      phone_number: client.phone_number ?? "",
      reference: client.reference ?? "",
    });
    setFormError(null);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setLinkForm({ serviceId: null, accountNumber: "" });
    setLinkError(null);
  }, []);

  const getReceiptsForService = useCallback(
    (serviceId) =>
      clientReceipts.filter((r) => r.service_id === serviceId),
    [clientReceipts]
  );

  const handleLinkService = async (e, serviceId) => {
    e.preventDefault();
    const accountNumber =
      serviceId === linkForm.serviceId
        ? linkForm.accountNumber?.trim()
        : "";
    if (!isEditing || !serviceId || !accountNumber) {
      setLinkError("Account/receipt number is required.");
      return;
    }
    setLinkError(null);
    setIsLinking(true);
    const result = await createReceiptAction({
      client_id: formOpen.id,
      service_id: serviceId,
      account_receipt_number: accountNumber,
    });
    setIsLinking(false);
    if (result.error) {
      setLinkError(result.error);
      return;
    }
    setLinkForm({ serviceId: null, accountNumber: "" });
    const receiptsRes = await getClientReceiptsAction(formOpen.id);
    if (!receiptsRes.error) setClientReceipts(receiptsRes.receipts ?? []);
    router.refresh();
  };

  const handleUnlinkReceipt = async (receiptId) => {
    if (!isEditing) return;
    setUnlinkingReceiptId(receiptId);
    const result = await deleteReceiptByIdAction(receiptId);
    setUnlinkingReceiptId(null);
    if (!result.error) {
      setClientReceipts((prev) => prev.filter((r) => r.id !== receiptId));
      router.refresh();
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (isEditing) {
      const result = await updateClientAction(formOpen.id, formData);
      setIsSubmitting(false);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      closeForm();
      router.refresh();
      return;
    }

    const result = await createClientAction(formData);
    setIsSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    closeForm();
    router.refresh();
  };

  const handleDeleteClick = useCallback((client) => {
    setDeleteTarget(client);
    setDeleteError(null);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteClientAction(deleteTarget.id);
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Clients
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            View and manage clients. Add or edit clients and assign services.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-offset-zinc-900"
          aria-label="Add client"
        >
          Add client
        </button>
      </header>

      {fetchError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {fetchError}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Client list
          </h2>
        </div>

        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No clients yet. Add your first client to get started.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="text-sm font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
              aria-label="Add client"
            >
              Add client
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" role="grid">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Name
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Last name
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Phone
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Reference
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Created
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                      {client.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                      {client.last_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {client.phone_number || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {client.reference || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-500">
                      {formatDate(client.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(client)}
                          className="font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
                          aria-label={`Edit ${client.name} ${client.last_name}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(client)}
                          className="font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                          aria-label={`Delete ${client.name} ${client.last_name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-form-title"
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            onKeyDown={(e) => e.key === "Escape" && closeForm()}
          >
            <h2 id="client-form-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {isEditing ? "Edit client" : "Add client"}
            </h2>
            <form
              onSubmit={handleFormSubmit}
              className="mt-4 flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="client-name"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="client-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
                  aria-invalid={!!formError}
                />
              </div>
              <div>
                <label
                  htmlFor="client-last-name"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Last name <span className="text-red-500">*</span>
                </label>
                <input
                  id="client-last-name"
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
                  aria-invalid={!!formError}
                />
              </div>
              <div>
                <label
                  htmlFor="client-phone"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Phone number
                </label>
                <input
                  id="client-phone"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone_number: e.target.value,
                    }))
                  }
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
                />
              </div>
              <div>
                <label
                  htmlFor="client-reference"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Reference
                </label>
                <input
                  id="client-reference"
                  type="text"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      reference: e.target.value,
                    }))
                  }
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
                />
              </div>
              </div>

              {isEditing && (
                <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
                  <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Services
                  </h3>
                  <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                    Link or unlink services. You can add multiple accounts per
                    service (e.g. two Claro accounts with different
                    account/receipt numbers).
                  </p>
                  {servicesLoading ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Loading services…
                    </p>
                  ) : servicesList.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No services defined yet. Add services in the Services
                      section first.
                    </p>
                  ) : (
                    <ul className="grid grid-cols-2 gap-3" role="list">
                      {servicesList.map((service) => {
                        const receipts = getReceiptsForService(service.id);
                        return (
                          <li
                            key={service.id}
                            className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50"
                          >
                            <span className="font-medium text-zinc-900 dark:text-zinc-50">
                              {service.name}
                            </span>
                            {receipts.length > 0 && (
                              <ul className="space-y-1.5" role="list">
                                {receipts.map((receipt) => {
                                  const isUnlinking =
                                    unlinkingReceiptId === receipt.id;
                                  return (
                                    <li
                                      key={receipt.id}
                                      className="flex items-center justify-between gap-2 rounded border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-800"
                                    >
                                      <span className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                                        {receipt.account_receipt_number}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUnlinkReceipt(receipt.id)
                                        }
                                        disabled={isUnlinking}
                                        className="shrink-0 text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                                        aria-label={`Remove ${receipt.account_receipt_number}`}
                                      >
                                        {isUnlinking ? "…" : "Unlink"}
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Account/receipt number"
                                value={
                                  linkForm.serviceId === service.id
                                    ? linkForm.accountNumber
                                    : ""
                                }
                                onChange={(e) =>
                                  setLinkForm({
                                    serviceId: service.id,
                                    accountNumber: e.target.value,
                                  })
                                }
                                onFocus={() =>
                                  setLinkForm((prev) =>
                                    prev.serviceId === service.id
                                      ? prev
                                      : {
                                          serviceId: service.id,
                                          accountNumber: "",
                                        }
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleLinkService(e, service.id);
                                  }
                                }}
                                disabled={isLinking}
                                className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
                                aria-label={`Account/receipt number for ${service.name}`}
                              />
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleLinkService(e, service.id)
                                }
                                disabled={
                                  isLinking ||
                                  (linkForm.serviceId !== service.id
                                    ? true
                                    : !linkForm.accountNumber?.trim())
                                }
                                className="rounded bg-zinc-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                aria-label={`Add ${service.name} account`}
                              >
                                {receipts.length === 0 ? "Link" : "Add"}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {linkError && (
                    <div
                      role="alert"
                      className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
                    >
                      {linkError}
                    </div>
                  )}
                </div>
              )}

              {formError && (
                <div
                  role="alert"
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
                >
                  {formError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-offset-zinc-900"
                  aria-busy={isSubmitting}
                  aria-label={isEditing ? "Save changes" : "Create client"}
                >
                  {isSubmitting
                    ? "Saving…"
                    : isEditing
                      ? "Save"
                      : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-desc"
        >
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Delete client
            </h2>
            <p id="delete-dialog-desc" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to delete{" "}
              <strong>
                {deleteTarget.name} {deleteTarget.last_name}
              </strong>
              ? This cannot be undone.
            </p>
            {deleteError && (
              <div
                role="alert"
                className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
              >
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                aria-label="Cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-zinc-900"
                aria-busy={isDeleting}
                aria-label="Delete client"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
