"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import {
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
} from "./actions";

function formatDate(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("es-SV", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ServicesView({ initialServices, fetchError }) {
  const router = useRouter();
  const services = initialServices;
  const [formOpen, setFormOpen] = useState(null);
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const isEditing = formOpen && formOpen !== "create";

  const openCreate = useCallback(() => {
    setFormOpen("create");
    setFormName("");
    setFormError(null);
  }, []);

  const openEdit = useCallback((service) => {
    setFormOpen(service);
    setFormName(service.name ?? "");
    setFormError(null);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(null);
    setFormName("");
    setFormError(null);
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (isEditing) {
      const result = await updateServiceAction(formOpen.id, { name: formName });
      setIsSubmitting(false);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      closeForm();
      router.refresh();
      return;
    }

    const result = await createServiceAction({ name: formName });
    setIsSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    closeForm();
    router.refresh();
  };

  const handleDeleteClick = useCallback((service) => {
    setDeleteTarget(service);
    setDeleteError(null);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteServiceAction(deleteTarget.id);
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
            Services
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Bill types (e.g. Water, Electrical Power, Internet). Add, edit, or
            remove services.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-offset-zinc-900"
          aria-label="Add service"
        >
          Add service
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
            Service list
          </h2>
        </div>

        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No services yet. Add your first service (e.g. Water, Electrical
              Power, Internet) to get started.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="text-sm font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
              aria-label="Add service"
            >
              Add service
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
                    Created
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr
                    key={service.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                      {service.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-500">
                      {formatDate(service.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(service)}
                          className="font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
                          aria-label={`Edit ${service.name}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(service)}
                          className="font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                          aria-label={`Delete ${service.name}`}
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
          aria-labelledby="service-form-title"
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            onKeyDown={(e) => e.key === "Escape" && closeForm()}
          >
            <h2
              id="service-form-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {isEditing ? "Edit service" : "Add service"}
            </h2>
            <form
              onSubmit={handleFormSubmit}
              className="mt-4 flex flex-col gap-4"
            >
              <div>
                <label
                  htmlFor="service-name"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="service-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
                  aria-invalid={!!formError}
                />
              </div>
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
                  aria-label={isEditing ? "Save changes" : "Create service"}
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
            <h2
              id="delete-dialog-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Delete service
            </h2>
            <p
              id="delete-dialog-desc"
              className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
            >
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.name}</strong>? This cannot be undone.
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
                aria-label="Delete service"
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
