import { createClient } from "@/lib/supabase/server";
import { PaymentsView } from "./payments-view";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: payments = [], error: paymentsError } = await supabase
    .from("payments")
    .select(
      "id, receipt_id, total_amount, created_at, receipts(id, account_receipt_number, clients(name, last_name, phone_number), services(name))"
    )
    .order("created_at", { ascending: false });

  return (
    <PaymentsView
      initialPayments={paymentsError ? [] : payments}
      fetchError={paymentsError?.message ?? null}
    />
  );
}
