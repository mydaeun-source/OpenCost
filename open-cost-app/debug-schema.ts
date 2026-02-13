// @ts-nocheck
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
    const { error } = await supabase.rpc("reload_schema")

    // If RPC fails (likely not defined), try direct SQL via RPC or similar if available, 
    // but usually in local dev we might need to just restart or wait.
    // Actually, standard way is NOTIFY pgrst. But we can't run raw SQL easily without a stored procedure.

    // Let's try adding a dummy column and removing it to force schema reload if we can't run NOTIFY directly.
    // Or just try to select from the column to see if it works.

    console.log("Checking if column exists...")
    const { data, error: selectError } = await supabase
        .from("orders")
        .select("total_cost")
        .limit(1)

    if (selectError) {
        console.error("Column check failed:", selectError)
    } else {
        console.log("Column exists!", data)
    }

    // Try to notify pgrst (this might fail if we don't have raw SQL access, but usually the migration tool does?)
    // Wait, the migration tool uses `postgres` connection usually? 
    // My run-migration-manual.ts uses `postgres` library directly with connection string?
    // Let's check run-migration-manual.ts content to see how it connects.
}

run()
