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
