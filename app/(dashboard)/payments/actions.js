"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const SEARCH_DEBOUNCE_MIN_LENGTH = 2;
const SEARCH_RECEIPTS_LIMIT = 25;

/**
 * Search receipts by client name, last name, service name, or account/receipt number.
 * @param {string} query
 * @returns {Promise<{ error: string | null; receipts?: { id: string; account_receipt_number: string; clients: { name: string; last_name: string } | null; services: { name: string } | null }[] }>}
 */
export async function searchReceiptsForPaymentAction(query) {
  const q = (query ?? "").trim();
  if (q.length < SEARCH_DEBOUNCE_MIN_LENGTH) {
    return { receipts: [] };
  }

  const supabase = await createClient();
  const pattern = `%${q}%`;

  const [clientsRes, servicesRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id")
      .or(`name.ilike.${pattern},last_name.ilike.${pattern}`)
      .limit(50),
    supabase.from("services").select("id").ilike("name", pattern).limit(20),
  ]);

  const clientIds = (clientsRes.data ?? []).map((c) => c.id);
  const serviceIds = (servicesRes.data ?? []).map((s) => s.id);

  const receiptConditions = [`account_receipt_number.ilike.${pattern}`];
  if (clientIds.length > 0) {
    receiptConditions.push(`client_id.in.(${clientIds.map((id) => `"${id}"`).join(",")})`);
  }
  if (serviceIds.length > 0) {
    receiptConditions.push(`service_id.in.(${serviceIds.map((id) => `"${id}"`).join(",")})`);
  }

  const { data: receipts, error } = await supabase
    .from("receipts")
    .select("id, account_receipt_number, clients(name, last_name), services(name)")
    .or(receiptConditions.join(","))
    .order("created_at", { ascending: false })
    .limit(SEARCH_RECEIPTS_LIMIT);

  if (error) {
    return { error: error.message };
  }
  return { receipts: receipts ?? [] };
}

/**
 * @param {{ receipt_id: string; total_amount: number; payment_method_id: string }} payload
 * @returns {Promise<{ error: string | null }>}
 */
export async function createPaymentAction(payload) {
  const receipt_id = payload.receipt_id?.trim();
  const total_amount = Number(payload.total_amount);
  const payment_method_id = payload.payment_method_id?.trim();

  if (!receipt_id) {
    return { error: "El recibo es requerido." };
  }

  if (Number.isNaN(total_amount) || total_amount < 0) {
    return { error: "El monto debe ser cero o mayor." };
  }

  if (!payment_method_id) {
    return { error: "El método de pago es requerido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    receipt_id,
    total_amount,
    payment_method_id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/payments");
  revalidatePath("/");
  return { error: null };
}

/**
 * @param {string} id
 * @param {{ receipt_id: string; total_amount: number; payment_method_id: string }} payload
 * @returns {Promise<{ error: string | null }>}
 */
export async function updatePaymentAction(id, payload) {
  if (!id) {
    return { error: "El ID del pago es requerido." };
  }

  const receipt_id = payload.receipt_id?.trim();
  const total_amount = Number(payload.total_amount);
  const payment_method_id = payload.payment_method_id?.trim();

  if (!receipt_id) {
    return { error: "El recibo es requerido." };
  }

  if (Number.isNaN(total_amount) || total_amount < 0) {
    return { error: "El monto debe ser cero o mayor." };
  }

  if (!payment_method_id) {
    return { error: "El método de pago es requerido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({
      receipt_id,
      total_amount,
      payment_method_id,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/payments");
  revalidatePath("/");
  return { error: null };
}

/**
 * @param {string} id
 * @returns {Promise<{ error: string | null }>}
 */
export async function deletePaymentAction(id) {
  if (!id) {
    return { error: "El ID del pago es requerido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/payments");
  revalidatePath("/");
  return { error: null };
}
