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
