import { supabase } from "@/lib/supabase"
import { subMonths, subDays, format, getDaysInMonth } from "date-fns"
import { generateTestData } from "./seed-data"
import { seedExpenses } from "./seed-expenses"
import { seedSales } from "./seed-sales"

export const clearAllData = async (userId: string) => {
    console.log("Clearing all user data...")

    // 1. Transaction-like deletion (sequential)
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

                // Also log to stock logs
                await supabase.from("stock_adjustment_logs").insert({
                    ingredient_id: ing.id,
                    adjustment_type: 'purchase',
                    quantity: qty,
                    reason: `Seed Purchase #${purchase.id.slice(0, 8)}`
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
    console.log("Seeding detailed order logs (last 7 days)...")
    const { data: recipes } = await supabase.from("recipes").select("*").eq("user_id", userId).eq("type", "menu")
    if (!recipes || recipes.length === 0) return

    const today = new Date()

    // Seed 7 days of detailed orders
    for (let d = 0; d < 7; d++) {
        const orderDate = subDays(today, d)
        const dateStr = format(orderDate, "yyyy-MM-dd")

        // Number of orders per day
        const orderCount = 15 + Math.floor(Math.random() * 10)

        for (let o = 0; o < orderCount; o++) {
            const recipe = recipes[Math.floor(Math.random() * recipes.length)]
            const qty = 1 + (Math.random() > 0.8 ? 1 : 0) // Mostly 1, sometimes 2
            const totalAmount = Number(recipe.selling_price) * qty

            const { data: order } = await supabase.from("orders").insert({
                user_id: userId,
                total_amount: totalAmount,
                total_cost: 0, // Simplified for seed
                status: 'completed',
                created_at: new Date(orderDate.getTime() + (o * 30 * 60000)).toISOString() // Spread over day
            }).select().single()

            if (order) {
                await supabase.from("order_items").insert({
                    order_id: order.id,
                    menu_id: recipe.id,
                    quantity: qty,
                    price: recipe.selling_price
                })
            }
        }
    }
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

    console.log("UNIFIED SEEDING COMPLETE!")
    return true
}
