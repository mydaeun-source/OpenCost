// @ts-nocheck
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Use anon key for reading
)

async function run() {
    console.log("Fetching sales_records...")
    const { data: sales, error } = await supabase
        .from("sales_records")
        .select("*")
        .order("sales_date", { ascending: false })
        .limit(10)

    if (error) {
        console.error("Error fetching sales_records:", error)
    } else {
        console.log("Latest Sales Records:", sales)
    }

    console.log("\nFetching orders...")
    const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)

    if (ordersError) {
        console.error("Error fetching orders:", ordersError)
    } else {
        console.log("Latest Orders:", orders)
    }
}

run()
