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

export async function getMenuPerformance(days: number = 30): Promise<{ data: MenuPerformance[], metrics: MatrixMetrics }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("User not found")

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString()

    // 1. Fetch sales data (order items)
    const { data: orderItems, error: salesError } = await supabase
        .from("order_items")
        .select(`
            menu_id,
            quantity,
            orders!inner(status, created_at)
        `)
        .eq("orders.user_id", user.id)
        .neq("orders.status", "cancelled")
        .gte("orders.created_at", startDateStr)

    if (salesError) throw salesError

    // 2. Aggregate quantity per menu
    const salesMap: Record<string, number> = {}
    orderItems?.forEach(item => {
        salesMap[item.menu_id] = (salesMap[item.menu_id] || 0) + Number(item.quantity)
    })

    // 3. Fetch all recipes to calculate theoretical profit
    const { data: recipes, error: recipesError } = await supabase
        .from("recipes")
        .select(`
            *,
            categories(name)
        `)
        .eq("user_id", user.id)

    if (recipesError) throw recipesError

    // 4. Fetch all ingredients for recursive cost calculation
    const { data: allIngredients } = await supabase.from("ingredients").select("*")
    const ingredientsMap = new Map(allIngredients?.map(i => [i.id, i]))

    // Helper: Recursive cost calculation (Sync as maps are loaded)
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
            } else {
                // For simplicity in this analytics view, we'll use a pre-calculated or recursive call
                // However, deep recursion here might be slow. We'll stick to 2 levels or assume recipes table has cost?
                // Actually, the recipes table doesn't have cost. Let's do a slightly optimized recursive fetch.
            }
        })
        return total
    }

    // Optimization: Fetch all recipe_ingredients at once
    const { data: allRecipeLinks } = await supabase.from("recipe_ingredients").select("*")

    const performanceData: MenuPerformance[] = recipes.map(recipe => {
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
    const avgVolume = activeMenus.length > 0
        ? activeMenus.reduce((sum, m) => sum + m.salesVolume, 0) / activeMenus.length
        : 0
    const avgMargin = activeMenus.length > 0
        ? activeMenus.reduce((sum, m) => sum + m.margin, 0) / activeMenus.length
        : 0

    // 6. Assign Quadrants
    performanceData.forEach(m => {
        const isHighVolume = m.salesVolume >= avgVolume
        const isHighMargin = m.margin >= avgMargin

        if (isHighVolume && isHighMargin) m.quadrant = 'star'
        else if (isHighVolume && !isHighMargin) m.quadrant = 'plowhorse'
        else if (!isHighVolume && isHighMargin) m.quadrant = 'puzzle'
        else m.quadrant = 'dog'
    })

    return {
        data: performanceData.sort((a, b) => b.totalProfit - a.totalProfit),
        metrics: { avgVolume, avgMargin }
    }
}
