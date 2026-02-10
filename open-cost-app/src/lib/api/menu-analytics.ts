import { supabase } from "@/lib/supabase"
import { Database } from "@/types/database.types"

export interface MenuPerformance {
    id: string
    name: string
    category: string
    sellingPrice: number
    materialCost: number
    margin: number
    marginRate: number
    salesVolume: number
    totalProfit: number
    quadrant: 'star' | 'plowhorse' | 'puzzle' | 'dog'
}

export interface MatrixMetrics {
    avgVolume: number
    avgMargin: number
}

export async function getMenuPerformance(days: number = 30, storeId: string): Promise<{ data: MenuPerformance[], metrics: MatrixMetrics }> {
    if (!storeId) throw new Error("Store ID required")
    console.log(`[Analytics] Starting for store: ${storeId}`)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString()

    // 1. Fetch sales data (order items)
    console.log("[Analytics] Fetching sales data...")
    const { data: orderItems, error: salesError } = await supabase
        .from("order_items")
        .select(`
            menu_id,
            quantity,
            orders!inner(status, created_at, store_id)
        `)
        .eq("orders.store_id", storeId)
        .neq("orders.status", "cancelled")
        .gte("orders.created_at", startDateStr)

    if (salesError) {
        console.error("[Analytics] Sales Fetch Error:", salesError)
        throw salesError
    }
    console.log(`[Analytics] Fetched ${orderItems?.length || 0} order items`)

    // 2. Aggregate quantity per menu
    const salesMap: Record<string, number> = {}
    orderItems?.forEach(item => {
        salesMap[item.menu_id] = (salesMap[item.menu_id] || 0) + Number(item.quantity)
    })

    // 3. Fetch all recipes to calculate theoretical profit
    console.log("[Analytics] Fetching recipes...")
    const { data: recipes, error: recipesError } = await supabase
        .from("recipes")
        .select(`
            *,
            categories(name)
        `)
        .eq("store_id", storeId)

    if (recipesError) {
        console.error("[Analytics] Recipes Fetch Error:", recipesError)
        throw recipesError
    }
    console.log(`[Analytics] Fetched ${recipes?.length || 0} recipes`)

    // 4. Fetch all ingredients for recursive cost calculation
    console.log("[Analytics] Fetching ingredients...")
    const { data: allIngredients, error: ingError } = await supabase
        .from("ingredients")
        .select("*")
        .eq("store_id", storeId)

    if (ingError) {
        console.error("[Analytics] Ingredients Fetch Error:", ingError)
        throw ingError
    }
    const ingredientsMap = new Map(allIngredients?.map(i => [i.id, i]))
    console.log(`[Analytics] Fetched ${allIngredients?.length || 0} ingredients`)

    // Helper: Recursive cost calculation
    const calculateRecipeCost = (recipeId: string, recipeIngredients: any[]): number => {
        const links = recipeIngredients.filter(ri => ri.recipe_id === recipeId)
        let total = 0
        links.forEach(link => {
            if (link.item_type === 'ingredient') {
                const ing = ingredientsMap.get(link.item_id)
                if (ing) {
                    const lossRate = ing.loss_rate || 0
                    const divisor = lossRate >= 1 ? 0.001 : (1 - lossRate)
                    const unitCost = ((ing.purchase_price || 0) / (ing.conversion_factor || 1)) / divisor
                    total += (unitCost * link.quantity)
                }
            }
        })
        return total
    }

    // Optimization: Fetch all recipe_ingredients for THIS store at once
    console.log("[Analytics] Fetching recipe links...")
    const { data: allRecipeLinks, error: linksError } = await supabase
        .from("recipe_ingredients")
        .select(`
            *,
            recipes!inner(store_id)
        `)
        .eq("recipes.store_id", storeId)

    if (linksError) {
        console.error("[Analytics] Recipe Links Fetch Error:", linksError)
        throw linksError
    }
    console.log(`[Analytics] Fetched ${allRecipeLinks?.length || 0} recipe links`)

    console.log("[Analytics] Calculating performance data...")
    const performanceData: MenuPerformance[] = (recipes || []).map(recipe => {
        const materialCost = calculateRecipeCost(recipe.id, allRecipeLinks || [])
        const salesVolume = salesMap[recipe.id] || 0
        const margin = (recipe.selling_price || 0) - materialCost

        return {
            id: recipe.id,
            name: recipe.name,
            category: (recipe as any).categories?.name || "기타",
            sellingPrice: recipe.selling_price || 0,
            materialCost,
            margin,
            marginRate: recipe.selling_price > 0 ? (margin / recipe.selling_price) * 100 : 0,
            salesVolume,
            totalProfit: margin * salesVolume,
            quadrant: 'dog' // Placeholder
        }
    })

    // 5. Calculate Thresholds (Averages)
    const activeMenus = performanceData.filter(m => m.salesVolume > 0)

    console.log(`[Analytics] Stats: Total=${performanceData.length}, Active=${activeMenus.length}`)

    const avgVolume = activeMenus.length > 0
        ? activeMenus.reduce((sum, m) => sum + m.salesVolume, 0) / activeMenus.length
        : 0
    const avgMargin = activeMenus.length > 0
        ? activeMenus.reduce((sum, m) => sum + m.margin, 0) / activeMenus.length
        : 0

    // 6. Assign Quadrants
    performanceData.forEach(m => {
        const isHighVolume = m.salesVolume >= (avgVolume || 1)
        const isHighMargin = m.margin >= (avgMargin || 1)

        if (isHighVolume && isHighMargin) m.quadrant = 'star'
        else if (isHighVolume && !isHighMargin) m.quadrant = 'plowhorse'
        else if (!isHighVolume && isHighMargin) m.quadrant = 'puzzle'
        else m.quadrant = 'dog'
    })

    console.log("[Analytics] Completed successfully")
    return {
        data: performanceData.sort((a, b) => b.totalProfit - a.totalProfit),
        metrics: { avgVolume, avgMargin }
    }
}
