import { supabase } from "@/lib/supabase"
import { subDays, differenceInDays } from "date-fns"

export interface ForecastItem {
    id: string
    name: string
    currentStock: number
    safetyStock: number
    avgDailyUsage: number
    daysRemaining: number | null // null if no usage
    suggestedPurchaseQty: number
    unit: string
}

export const getProcurementForecast = async (storeId: string): Promise<ForecastItem[]> => {
    if (!storeId) return []
    // 1. Fetch Ingredients
    const { data: ingredients } = await supabase.from("ingredients").select("*").eq("store_id", storeId)
    if (!ingredients) return []

    // 2. Fetch Stock Logs for usage analysis (last 30 days for trend)
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString()
    const { data: logs } = await supabase.from("stock_adjustment_logs")
        .select("*")
        .in("ingredient_id", ingredients.map(i => i.id))
        .gte("created_at", thirtyDaysAgo)
        .lt("quantity", 0) // Only consumption

    if (!logs) return ingredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        currentStock: Number(ing.current_stock) || 0,
        safetyStock: Number(ing.safety_stock) || 0,
        avgDailyUsage: 0,
        daysRemaining: null,
        suggestedPurchaseQty: 0,
        unit: ing.purchase_unit || 'ea'
    }))

    // 3. Calculate usage stats per ingredient
    const forecast: ForecastItem[] = ingredients.map(ing => {
        const ingLogs = logs.filter(l => l.ingredient_id === ing.id)
        const totalUsage = Math.abs(ingLogs.reduce((sum, l) => sum + Number(l.quantity), 0))
        const avgDailyUsage = totalUsage / 30

        let daysRemaining: number | null = null
        if (avgDailyUsage > 0) {
            daysRemaining = (Number(ing.current_stock) || 0) / avgDailyUsage
        }

        // Suggested purchase: enough to last another 14 days + safety stock buffer
        let suggestedPurchaseQty = 0
        if (daysRemaining !== null && daysRemaining < 7) {
            const desiredBuffer = (avgDailyUsage * 14) + (Number(ing.safety_stock) || 0)
            suggestedPurchaseQty = Math.max(0, desiredBuffer - (Number(ing.current_stock) || 0))
        }

        return {
            id: ing.id,
            name: ing.name,
            currentStock: Number(ing.current_stock) || 0,
            safetyStock: Number(ing.safety_stock) || 0,
            avgDailyUsage,
            daysRemaining,
            suggestedPurchaseQty: Math.ceil(suggestedPurchaseQty),
            unit: ing.purchase_unit || 'ea'
        }
    })

    return forecast.sort((a, b) => {
        // Prioritize items with fewer days remaining
        if (a.daysRemaining === null) return 1
        if (b.daysRemaining === null) return -1
        return a.daysRemaining - b.daysRemaining
    })
}
