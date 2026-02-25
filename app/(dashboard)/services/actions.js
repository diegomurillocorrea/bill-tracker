"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * @param {{ name: string }} formData
 * @returns {Promise<{ error: string | null; data?: { id: string } }>}
 */
export async function createServiceAction(formData) {
  const name = formData.name?.trim();

  if (!name) {
    return { error: "Name is required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({ name })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/services");
  revalidatePath("/");
  return { data: { id: data.id } };
}

/**
 * @param {string} id
 * @param {{ name: string }} formData
 * @returns {Promise<{ error: string | null }>}
 */
export async function updateServiceAction(id, formData) {
  if (!id) {
    return { error: "Service ID is required." };
  }

  const name = formData.name?.trim();

  if (!name) {
    return { error: "Name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("services").update({ name }).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/services");
  revalidatePath("/");
  return { error: null };
}

/**
 * @param {string} id
 * @returns {Promise<{ error: string | null }>}
 */
export async function deleteServiceAction(id) {
  if (!id) {
    return { error: "Service ID is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("services").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/services");
  revalidatePath("/");
  return { error: null };
}
