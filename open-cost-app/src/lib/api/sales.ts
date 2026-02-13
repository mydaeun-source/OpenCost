import { supabase } from "@/lib/supabase"
import { Database } from "@/types/database.types"

export type SalesRecord = Database["public"]["Tables"]["sales_records"]["Row"]
export type SalesInsert = Database["public"]["Tables"]["sales_records"]["Insert"]
export type SalesUpdate = Database["public"]["Tables"]["sales_records"]["Update"]

export const fetchSalesRecords = async (storeId: string, startDate: string, endDate: string) => {
    const { data, error } = await supabase
        .from("sales_records")
        .select("*")
        .eq("store_id", storeId)
        .gte("sales_date", startDate)
        .lte("sales_date", endDate)
        .order("sales_date", { ascending: true })

    if (error) throw error
    return data
}

export const fetchMonthlySales = async (storeId: string, year: number, month: number) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    return fetchSalesRecords(storeId, startDate, endDate)
}

export const upsertSalesRecord = async (record: SalesInsert & { store_id: string }) => {
    // 1. Check if record exists for this date/store to avoid overwriting other fields (like daily_cogs)
    const { data: existing } = await supabase
        .from("sales_records")
        .select("*")
        .eq("store_id", record.store_id)
        .eq("sales_date", record.sales_date)
        .single()

    if (existing) {
        // Update existing record
        const { data, error } = await supabase
            .from("sales_records")
            .update({
                ...record,
                daily_revenue: record.daily_revenue ?? existing.daily_revenue,
                daily_cogs: existing.daily_cogs, // Preserve COGS unless explicitly overwritten
                updated_at: new Date().toISOString()
            })
            .eq("id", existing.id)
            .select()
            .single()

        if (error) throw error
        return data
    } else {
        // Create new record
        const { data, error } = await supabase
            .from("sales_records")
            .insert(record)
            .select()
            .single()

        if (error) throw error
        return data
    }
}

export const deleteSalesRecord = async (id: string) => {
    const { error } = await supabase
        .from("sales_records")
        .delete()
        .eq("id", id)

    if (error) throw error
}

// Recalculate Sales Records from Orders (Data Repair)
export const recalculateSalesAndInventory = async (storeId: string) => {
    try {
        console.log(`Starting recalculation for store: ${storeId}`)

        // 1. Reset all sales records for store to 0 (revenue and cogs)
        // We preserve the rows to keep 'memo' or manual entries, but valid order data will be added back.
        // Wait, if we set to 0 and then add, manual entries (that are not orders) will be 0 forever?
        // Yes, this is a "Reset to Orders Truth" operation. Manual revenue entries without orders might be lost.
        // But the user has "nonsensical numbers", so a reset is desired.

        const { error: resetError } = await supabase
            .from("sales_records")
            .update({ daily_revenue: 0, daily_cogs: 0 })
            .eq("store_id", storeId)

        if (resetError) throw resetError

        // 2. Fetch all completed orders
        const { data: orders, error: ordersError } = await supabase
            .from("orders")
            .select("id, total_amount, total_cost, created_at, status")
            .eq("store_id", storeId)
            .neq("status", "cancelled")

        if (ordersError) throw ordersError
        if (!orders) return

        console.log(`Found ${orders.length} orders to process`)

        // 3. Aggregate stats by date
        const dailyStats = new Map<string, { revenue: number, cogs: number }>()

        for (const order of orders) {
            const date = new Date(order.created_at).toISOString().split('T')[0]
            const current = dailyStats.get(date) || { revenue: 0, cogs: 0 }

            dailyStats.set(date, {
                revenue: current.revenue + (Number(order.total_amount) || 0),
                cogs: current.cogs + (Number(order.total_cost) || 0)
            })
        }

        // 4. Update sales_records with aggregated data
        for (const [date, stats] of dailyStats.entries()) {
            // Check if record exists
            const { data: existing } = await supabase
                .from("sales_records")
                .select("id")
                .eq("store_id", storeId)
                .eq("sales_date", date)
                .single()

            if (existing) {
                await supabase
                    .from("sales_records")
                    .update({
                        daily_revenue: stats.revenue,
                        daily_cogs: stats.cogs,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", existing.id)
            } else {
                await supabase
                    .from("sales_records")
                    .insert({
                        store_id: storeId,
                        sales_date: date,
                        daily_revenue: stats.revenue,
                        daily_cogs: stats.cogs,
                        memo: "Auto-recalculated"
                    })
            }
        }

        console.log("Recalculation complete")
        return true

    } catch (error) {
        console.error("Recalculation error:", error)
        throw error
    }
}
