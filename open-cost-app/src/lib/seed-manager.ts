import { supabase } from "@/lib/supabase"
import { subMonths, subDays, format, getDaysInMonth } from "date-fns"
import { generateTestData } from "./seed-data"
import { seedExpenses } from "./seed-expenses"
import { seedSales } from "./seed-sales"

export const clearAllData = async (userId: string) => {
    console.log("Clearing all user data...")

    // Sequential deletion to avoid foreign key issues where possible
    // Note: Better to delete child tables first
    await supabase.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000")
    await supabase.from("orders").delete().eq("user_id", userId)
    await supabase.from("purchase_items").delete().neq("id", "00000000-0000-0000-0000-000000000000")
    await supabase.from("purchases").delete().eq("user_id", userId)
    await supabase.from("stock_adjustment_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000")
    await supabase.from("recipe_ingredients").delete().neq("id", "00000000-0000-0000-0000-000000000000")
    await supabase.from("recipes").delete().eq("user_id", userId)
    await supabase.from("ingredients").delete().eq("user_id", userId)
    await supabase.from("categories").delete().eq("user_id", userId)
    await supabase.from("expense_records").delete().eq("user_id", userId)
    await supabase.from("expense_categories").delete().eq("user_id", userId)
    await supabase.from("sales_records").delete().eq("user_id", userId)
    // Clear store settings to allow fresh start
    await supabase.from("store_settings").delete().eq("user_id", userId)

    console.log("All data cleared successfully.")
}

export const seedPurchases = async (userId: string) => {
    console.log("Seeding procurement history...")
    const { data: ingredients } = await supabase.from("ingredients").select("*").eq("user_id", userId)
    if (!ingredients || ingredients.length === 0) return

    const today = new Date()
    const purchases = []

    // Seed 6 months of weekly purchases
    for (let i = 0; i < 24; i++) {
        const purchaseDate = subDays(today, i * 7)
        const dateStr = format(purchaseDate, "yyyy-MM-dd")

        // Random supplier
        const suppliers = ["서울농수산", "CJ프레시웨이", "중부시장", "이마트 트레이더스"]
        const supplier = suppliers[Math.floor(Math.random() * suppliers.length)]

        const { data: purchase, error } = await supabase.from("purchases").insert({
            user_id: userId,
            supplier_name: supplier,
            purchase_date: dateStr,
            status: 'completed',
            total_amount: 0 // Will update later or set estimated
        }).select().single()

        if (purchase) {
            // Pick 3-5 random ingredients
            const items = []
            const selectedIngs = [...ingredients].sort(() => 0.5 - Math.random()).slice(0, 4)
            let total = 0

            for (const ing of selectedIngs) {
                const qty = 1 + Math.floor(Math.random() * 5)
                const price = Number(ing.purchase_price) || 10000
                items.push({
                    purchase_id: purchase.id,
                    ingredient_id: ing.id,
                    quantity: qty,
                    price: price
                })
                total += qty * price

                // Sync Current Stock: Increase stock
                const currentStock = Number(ing.current_stock) || 0
                await supabase.from("ingredients").update({
                    current_stock: currentStock + qty,
                    updated_at: new Date().toISOString()
                }).eq("id", ing.id)

                // Also log to stock logs with BACKDATED created_at
                await supabase.from("stock_adjustment_logs").insert({
                    ingredient_id: ing.id,
                    adjustment_type: 'purchase',
                    quantity: qty,
                    reason: `[샘플] ${supplier} 매입 입고`,
                    created_at: new Date(purchaseDate).toISOString()
                })
            }

            await supabase.from("purchase_items").insert(items)
            await supabase.from("purchases").update({ total_amount: total }).eq("id", purchase.id)

            // financial consistency: Create expense record for this purchase
            const { data: category } = await supabase.from("expense_categories").select("id").eq("name", "매입 (식자재)").single()
            if (category) {
                await supabase.from("expense_records").insert({
                    user_id: userId,
                    category_id: category.id,
                    amount: total,
                    expense_date: dateStr,
                    memo: `[샘플] ${supplier} 매입`
                })
            }
        }
    }
}

export const seedDetailedOrders = async (userId: string) => {
    console.log("Seeding detailed order logs (last 6 months)...")
    const { data: recipes } = await supabase.from("recipes").select("*").eq("user_id", userId).eq("type", "menu")
    if (!recipes || recipes.length === 0) return

    const today = new Date()

    // Seed 180 days (6 months) of detailed orders
    for (let d = 0; d < 180; d++) {
        const orderDate = subDays(today, d)
        const dayOfWeek = orderDate.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
        const orderCount = (isWeekend ? 20 : 10) + Math.floor(Math.random() * 8)

        // Bulk insert orders for the day to be faster
        const dayOrders: any[] = []
        for (let o = 0; o < orderCount; o++) {
            const recipe = recipes[Math.floor(Math.random() * recipes.length)]
            const qty = 1 + (Math.random() > 0.9 ? 1 : 0)
            const totalAmount = Number(recipe.selling_price) * qty

            const orderTime = new Date(orderDate)
            orderTime.setHours(10 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60))

            dayOrders.push({
                user_id: userId,
                total_amount: totalAmount,
                total_cost: 0,
                status: 'completed',
                created_at: orderTime.toISOString()
            })
        }

        const { data: insertedOrders } = await supabase.from("orders").insert(dayOrders).select()

        if (insertedOrders) {
            const dayItems: any[] = []
            insertedOrders.forEach((order, idx) => {
                // Find matching recipe by price/index or just pick random if count mismatch (should match)
                const recipe = recipes.find(r => r.selling_price === (dayOrders[idx].total_amount / (dayOrders[idx].total_amount > 5000 ? 2 : 1))) || recipes[Math.floor(Math.random() * recipes.length)]
                const qty = dayOrders[idx].total_amount / Number(recipe.selling_price)

                dayItems.push({
                    order_id: order.id,
                    menu_id: recipe.id,
                    quantity: Math.max(1, Math.round(qty)),
                    price: recipe.selling_price,
                    created_at: order.created_at
                })
            })
            await supabase.from("order_items").insert(dayItems)
        }

        if (d % 30 === 0) console.log(`Seeded ${d} days...`)
    }
    console.log("Detailed orders (6 months) seeded.")
}

/**
 * Bulk Stock Correction based on seeded data
 * Decoupled from individual order insertion for performance
 */
export const syncSeededStock = async (userId: string) => {
    console.log("Synchronizing stock levels with seeded history (Optimized)...")

    // 1. Fetch all necessary data once
    const { data: orderItems } = await supabase.from("order_items").select("quantity, menu_id")
    const { data: allRecipeIngredients } = await supabase.from("recipe_ingredients").select("*")
    const { data: ingredients } = await supabase.from("ingredients").select("*").eq("user_id", userId)

    if (!orderItems || !allRecipeIngredients || !ingredients) return

    // 2. Aggregate Consumption in-memory
    const consumptionMap: Record<string, number> = {} // ing_id -> total_usage_unit

    const resolveUsageInMem = (recipeId: string, multiplier: number) => {
        const components = allRecipeIngredients.filter(ri => ri.recipe_id === recipeId)
        for (const comp of components) {
            if (comp.item_type === 'ingredient') {
                consumptionMap[comp.item_id] = (consumptionMap[comp.item_id] || 0) + (comp.quantity * multiplier)
            } else {
                resolveUsageInMem(comp.item_id, comp.quantity * multiplier)
            }
        }
    }

    console.log("Processing consumption logic...")
    for (const item of orderItems) {
        if (!item.menu_id) continue
        resolveUsageInMem(item.menu_id, item.quantity)
    }

    // 3. Apply to Ingredients
    console.log("Updating ingredient stock levels...")
    for (const ing of ingredients) {
        const usageAmount = consumptionMap[ing.id] || 0
        if (usageAmount > 0) {
            const factor = ing.conversion_factor || 1
            const usagePurchaseUnit = usageAmount / factor
            const newStock = Math.max(0, (ing.current_stock || 0) - usagePurchaseUnit)

            await supabase.from("ingredients").update({ current_stock: newStock }).eq("id", ing.id)

            // Log Bulk Consumption
            await supabase.from("stock_adjustment_logs").insert({
                ingredient_id: ing.id,
                adjustment_type: 'correction',
                quantity: -usagePurchaseUnit,
                reason: `[샘플 데이터] 주문 내역 기반 대량 재고 소진 보정`,
                created_at: new Date().toISOString()
            })
        }
    }
    console.log("Stock levels synchronized.")
}

export const runUnifiedSeed = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("User not found")

    // 1. Clear
    await clearAllData(user.id)

    // 2. Foundation (Ingredients, Menus, Store Settings)
    await generateTestData()

    // 3. Financials (Revenue, Expenses)
    await seedSales(supabase, user.id)
    await seedExpenses(supabase, user.id)

    // 4. Procurement & Logs (6 months)
    await seedPurchases(user.id)

    // 5. Detailed Orders (Last 7 days)
    await seedDetailedOrders(user.id)

    // 6. Final Stock Sync (Correct counts based on history)
    await syncSeededStock(user.id)

    console.log("UNIFIED SEEDING COMPLETE!")
    return true
}
