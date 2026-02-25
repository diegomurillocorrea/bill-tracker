"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * @typedef {Object} ClientFormData
 * @property {string} name
 * @property {string} last_name
 * @property {string} [phone_number]
 * @property {string} [reference]
 */

/**
 * @param {ClientFormData} formData
 * @returns {Promise<{ error: string | null; data?: { id: string } }>}
 */
export async function createClientAction(formData) {
  const name = formData.name?.trim();
  const last_name = formData.last_name?.trim();

  if (!name || !last_name) {
    return { error: "Name and last name are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name,
      last_name,
      phone_number: formData.phone_number?.trim() || null,
      reference: formData.reference?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  return { data: { id: data.id } };
}

/**
 * @param {string} id
 * @param {ClientFormData} formData
 * @returns {Promise<{ error: string | null }>}
 */
export async function updateClientAction(id, formData) {
  if (!id) {
    return { error: "Client ID is required." };
  }

  const name = formData.name?.trim();
  const last_name = formData.last_name?.trim();

  if (!name || !last_name) {
    return { error: "Name and last name are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      name,
      last_name,
      phone_number: formData.phone_number?.trim() || null,
      reference: formData.reference?.trim() || null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  return { error: null };
}

/**
 * @param {string} id
 * @returns {Promise<{ error: string | null }>}
 */
export async function deleteClientAction(id) {
  if (!id) {
    return { error: "Client ID is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  return { error: null };
}

// --- Receipts (client–service links) ---

/**
 * @returns {Promise<{ error: string | null; services?: { id: string; name: string }[] }>}
 */
export async function getServicesListAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    return { error: error.message };
  }
  return { services: data ?? [] };
}

/**
 * @param {string} clientId
 * @returns {Promise<{ error: string | null; receipts?: { id: string; service_id: string; account_receipt_number: string }[] }>}
 */
export async function getClientReceiptsAction(clientId) {
  if (!clientId) {
    return { error: "Client ID is required." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("receipts")
    .select("id, service_id, account_receipt_number")
    .eq("client_id", clientId);

  if (error) {
    return { error: error.message };
  }
  return { receipts: data ?? [] };
}

/**
 * @param {{ client_id: string; service_id: string; account_receipt_number: string }} payload
 * @returns {Promise<{ error: string | null }>}
 */
export async function createReceiptAction(payload) {
  const account_receipt_number = payload.account_receipt_number?.trim();
  if (!payload.client_id || !payload.service_id || !account_receipt_number) {
    return { error: "Client, service, and account/receipt number are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("receipts").insert({
    client_id: payload.client_id,
    service_id: payload.service_id,
    account_receipt_number,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  return { error: null };
}

/**
 * @param {string} clientId
 * @param {string} serviceId
 * @returns {Promise<{ error: string | null }>}
 */
export async function deleteReceiptAction(clientId, serviceId) {
  if (!clientId || !serviceId) {
    return { error: "Client ID and service ID are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("client_id", clientId)
    .eq("service_id", serviceId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  return { error: null };
}

/**
 * Delete a single receipt by id (allows multiple receipts per client+service).
 * @param {string} receiptId
 * @returns {Promise<{ error: string | null }>}
 */
export async function deleteReceiptByIdAction(receiptId) {
  if (!receiptId) {
    return { error: "Receipt ID is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("id", receiptId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  return { error: null };
}
