import { supabase } from "@/lib/supabase"

export interface InventoryLossReport {
    ingredientId: string
    name: string
    theoreticalUsage: number
    actualUsage: number
    lossQuantity: number
    lossRate: number
    lossValue: number
    unit: string
}

export const getInventoryLossReport = async (days = 30, storeId: string) => {
    if (!storeId) return []

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 1. Get all recipes and their ingredients for BOM mapping
    const { data: recipes } = await supabase.from("recipes").select("id, name").eq("store_id", storeId)
    const { data: recipeIngs } = await supabase.from("recipe_ingredients").select("*, recipes!inner(store_id)").eq("recipes.store_id", storeId)
    const { data: ingredients } = await supabase.from("ingredients").select("*").eq("store_id", storeId)

    if (!recipes || !recipeIngs || !ingredients) return []

    // 2. Get Sales Data (Order Items) for the period
    const { data: sales } = await supabase
        .from("order_items")
        .select(`
            menu_id,
            quantity,
            orders!inner(store_id, status, created_at)
        `)
        .eq("orders.store_id", storeId)
        .neq("orders.status", "cancelled")
        .gte("orders.created_at", startDate.toISOString())

    if (!sales) return []

    // 3. Calculate Theoretical Usage
    const theoreticalMap: Record<string, number> = {}

    const calculateUsageRecursive = (menuId: string, qty: number) => {
        const components = recipeIngs.filter(ri => ri.recipe_id === menuId)
        components.forEach(ri => {
            const totalQty = ri.quantity * qty
            if (ri.item_type === 'ingredient') {
                theoreticalMap[ri.item_id] = (theoreticalMap[ri.item_id] || 0) + totalQty
            } else {
                // menu or prep - Recurse
                calculateUsageRecursive(ri.item_id, totalQty)
            }
        })
    }

    sales.forEach(sale => {
        calculateUsageRecursive(sale.menu_id, sale.quantity)
    })

    // 4. Get Actual Usage (Stock Adjustments of type 'loss' or manual discrepancies)
    const { data: adjustments } = await supabase
        .from("stock_adjustment_logs")
        .select(`
            *,
            ingredients!inner(store_id)
        `)
        .eq("ingredients.store_id", storeId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })

    const actualLossMap: Record<string, number> = {}
    adjustments?.forEach(adj => {
        if (adj.adjustment_type === 'loss' || adj.adjustment_type === 'discard') {
            actualLossMap[adj.ingredient_id] = (actualLossMap[adj.ingredient_id] || 0) + Math.abs(adj.quantity)
        }
    })

    // 5. Combine and calculate report
    const report: InventoryLossReport[] = ingredients.map(ing => {
        const tUsage = theoreticalMap[ing.id] || 0 // Usage in usage_unit (e.g., g)
        const aLossInPurchaseUnit = actualLossMap[ing.id] || 0 // Loss in purchase_unit (e.g., kg)
        const factor = ing.conversion_factor || 1

        // Normalize everything to usage_unit for accurate rate calculation
        const aLossUsageUnit = aLossInPurchaseUnit * factor
        const totalActualUsage = tUsage + aLossUsageUnit

        const lossRate = totalActualUsage > 0 ? (aLossUsageUnit / totalActualUsage) * 100 : 0
        const unitCost = (ing.purchase_price / factor)

        return {
            ingredientId: ing.id,
            name: ing.name,
            theoreticalUsage: tUsage,
            actualUsage: totalActualUsage,
            lossQuantity: aLossInPurchaseUnit, // Keep in purchase unit for display
            lossRate: lossRate,
            lossValue: aLossInPurchaseUnit * (ing.purchase_price || 0),
            unit: ing.purchase_unit || "개"
        }
    }).filter(r => r.theoreticalUsage > 0 || r.lossQuantity > 0)

    return report.sort((a, b) => b.lossValue - a.lossValue)
}

export const getPredictiveDepletion = async (storeId: string) => {
    if (!storeId) return []

    // 1. Get average daily usage from last 14 days
    const report = await getInventoryLossReport(14, storeId)
    const { data: ingredients } = await supabase.from("ingredients").select("*").eq("store_id", storeId)
    if (!ingredients) return []

    return ingredients.map(ing => {
        const usage = report.find(r => r.ingredientId === ing.id)
        const dailyRateUsageUnit = usage ? usage.actualUsage / 14 : 0
        const factor = ing.conversion_factor || 1
        const dailyRatePurchaseUnit = dailyRateUsageUnit / factor

        const currentStock = ing.current_stock || 0
        const daysLeft = dailyRatePurchaseUnit > 0 ? currentStock / dailyRatePurchaseUnit : (currentStock > 0 ? 999 : 0)

        return {
            id: ing.id,
            name: ing.name,
            currentStock,
            usagePerDay: Math.round(dailyRatePurchaseUnit * 100) / 100, // Show in purchase unit for consistency
            daysLeft: Math.round(daysLeft),
            unit: ing.purchase_unit // Change to purchase_unit for consistency with currentStock
        }
    }).filter(p => p.daysLeft < 7) // Show only items running out in < 1 week
}
export const getSourcingOptimization = async (storeId: string) => {
    if (!storeId) return []

    // 1. Get purchase items with supplier info
    const { data, error } = await supabase
        .from("purchase_items")
        .select(`
            ingredient_id,
            price,
            purchases!inner(supplier_name, store_id),
            ingredients(name)
        `)
        .eq("purchases.store_id", storeId)

    if (error || !data) return []

    // 2. Aggregate prices by ingredient and supplier
    const stats: Record<string, { name: string, suppliers: Record<string, number[]> }> = {}

    data.forEach(item => {
        const ingId = item.ingredient_id
        const supplier = (item.purchases as any).supplier_name
        const name = (item.ingredients as any).name || "Unknown"

        if (!stats[ingId]) stats[ingId] = { name, suppliers: {} }
        if (!stats[ingId].suppliers[supplier]) stats[ingId].suppliers[supplier] = []
        stats[ingId].suppliers[supplier].push(Number(item.price))
    })

    // 3. Find saving opportunities
    const opportunities = []
    for (const ingId in stats) {
        const ing = stats[ingId]
        const supplierAverages = Object.entries(ing.suppliers).map(([name, prices]) => ({
            name,
            avg: prices.reduce((a, b) => a + b, 0) / prices.length
        }))

        if (supplierAverages.length < 2) continue

        const sorted = supplierAverages.sort((a, b) => a.avg - b.avg)
        const best = sorted[0]
        const worst = sorted[sorted.length - 1]

        const potentialSaving = worst.avg - best.avg
        if (potentialSaving > 0) {
            opportunities.push({
                ingredientId: ingId,
                name: ing.name,
                bestSupplier: best.name,
                bestPrice: Math.round(best.avg),
                currentWorstSupplier: worst.name,
                potentialSavingPerUnit: Math.round(potentialSaving),
                savingPercent: Math.round((potentialSaving / worst.avg) * 100)
            })
        }
    }

    return opportunities.sort((a, b) => b.potentialSavingPerUnit - a.potentialSavingPerUnit)
}

export const createProductionRecord = async (recipeId: string, quantity: number, storeId: string) => {
    if (!storeId) throw new Error("Store ID required")

    // 1. Fetch Recipe and all ingredients for deduction
    const { data: recipeIngs } = await supabase.from("recipe_ingredients").select("*, recipes!inner(store_id)").eq("recipes.store_id", storeId)
    const { data: ingredients } = await supabase.from("ingredients").select("*").eq("store_id", storeId)

    if (!recipeIngs || !ingredients) throw new Error("Missing master data")

    const theoreticalMap: Record<string, number> = {}

    const calculateUsageRecursive = (menuId: string, qty: number) => {
        const components = recipeIngs.filter(ri => ri.recipe_id === menuId)
        components.forEach(ri => {
            const totalQty = ri.quantity * qty
            if (ri.item_type === 'ingredient') {
                theoreticalMap[ri.item_id] = (theoreticalMap[ri.item_id] || 0) + totalQty
            } else {
                calculateUsageRecursive(ri.item_id, totalQty)
            }
        })
    }

    calculateUsageRecursive(recipeId, quantity)

    // 2. Deduct Stock and Log
    const { data: recipe } = await supabase.from("recipes").select("name").eq("id", recipeId).single()

    for (const [ingId, qtyUsageUnit] of Object.entries(theoreticalMap)) {
        const ing = ingredients.find(i => i.id === ingId)
        if (ing) {
            const factor = ing.conversion_factor || 1
            const qtyPurchaseUnit = qtyUsageUnit / factor

            const newStock = (ing.current_stock || 0) - qtyPurchaseUnit

            // 2.1 Update main ingredient record
            await supabase.from("ingredients").update({
                current_stock: Math.max(0, newStock) // Prevent negative stock if desired, or allow it
            }).eq("id", ingId)

            // 2.2 Log Stock Adjustment in PURCHASE UNITS
            await supabase.from("stock_adjustment_logs").insert({
                ingredient_id: ingId,
                adjustment_type: 'correction', // or 'order' if specifically for sales
                quantity: -qtyPurchaseUnit,
                reason: `[배치 생산] ${recipe?.name || '반제품'} ${quantity}단위 생산 소진 (${qtyUsageUnit}${ing.usage_unit} 소모)`
            })
        }
    }

    return { success: true }
}
