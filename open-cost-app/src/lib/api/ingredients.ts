import { supabase } from "@/lib/supabase"
import { Database } from "@/types/database.types"

export type Ingredient = Database["public"]["Tables"]["ingredients"]["Row"]
export type IngredientInsert = Database["public"]["Tables"]["ingredients"]["Insert"]
export type StockLog = Database["public"]["Tables"]["stock_adjustment_logs"]["Row"]

export const getStockLogs = async (ingredientId?: string, limit = 50) => {
    let query = supabase
        .from("stock_adjustment_logs")
        .select(`
            *,
            ingredient:ingredients(name, purchase_unit)
        `)
        .order("created_at", { ascending: false })

    if (ingredientId) {
        query = query.eq("ingredient_id", ingredientId)
    }

    const { data, error } = await query.limit(limit)
    if (error) throw error
    return data
}

export const getInventoryValuation = async () => {
    const { data, error } = await supabase
        .from("ingredients")
        .select("current_stock, purchase_price")

    if (error) throw error

    return data.reduce((sum, ing) => {
        return sum + ((ing.current_stock || 0) * (ing.purchase_price || 0))
    }, 0)
}
