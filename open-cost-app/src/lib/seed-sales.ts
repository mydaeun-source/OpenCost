import { SupabaseClient } from "@supabase/supabase-js"
import { subMonths, format, getDaysInMonth } from "date-fns"

export const seedSales = async (supabase: SupabaseClient, userId: string, storeId: string) => {
    // 1. Clean existing sales data for this store
    await supabase.from("sales_records").delete().eq("store_id", storeId)

    // 2. Generate 6 Months of Sales Records
    const records = []
    const today = new Date()

    // Loop for current month (0) + previous 5 months
    for (let i = 0; i < 6; i++) {
        const targetDate = subMonths(today, i)
        const daysInMonth = getDaysInMonth(targetDate)
        const yearMonth = format(targetDate, "yyyy-MM")

        // Simulate Daily Sales
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`
            const dateObj = new Date(dateStr)
            const dayOfWeek = dateObj.getDay() // 0(Sun) ~ 6(Sat)

            // Skip some days (e.g. closed on Mondays? let's say rarely closed for data density)
            // But let's vary revenue by day of week
            // Weekend (Fri, Sat, Sun) higher
            let baseRevenue = 400000
            if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
                baseRevenue = 600000
            }

            // Random variation +/- 30%
            const variation = 0.7 + (Math.random() * 0.6)
            const dailyRevenue = Math.round(baseRevenue * variation / 1000) * 1000 // Round to 1000 won

            // COGS estimate for historical data (35% of revenue)
            const dailyCogs = Math.round(dailyRevenue * 0.35)

            // Random memo
            let memo = ""
            if (dailyRevenue > 800000) memo = "단체 손님 방문"
            if (dailyRevenue < 200000) memo = "비가 많이 옴"

            records.push({
                user_id: userId,
                store_id: storeId,
                sales_date: dateStr,
                daily_revenue: dailyRevenue,
                daily_cogs: dailyCogs,
                memo: memo,
                updated_at: new Date().toISOString()
            })
        }
    }

    // Batch insert
    const { error } = await supabase.from("sales_records").insert(records)
    if (error) throw new Error("매출 데이터 생성 실패: " + error.message)

    return true
}
