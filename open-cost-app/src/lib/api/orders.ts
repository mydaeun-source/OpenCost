import { supabase } from "@/lib/supabase"
import { Database } from "@/types/database.types"

export type Order = Database["public"]["Tables"]["orders"]["Row"]
export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"]
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"]
export type OrderItemInsert = Database["public"]["Tables"]["order_items"]["Insert"]

// Helper: Calculate total ingredient usage AND cost for a menu (Recursive)
async function getIngredientUsage(menuId: string, quantity: number, usageMap: Map<string, number>, ingredients: any[]): Promise<number> {
    const { data: items } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", menuId)

    if (!items) return 0

    let totalCost = 0

    for (const item of items) {
        const totalQty = item.quantity * quantity
        if (item.item_type === 'ingredient') {
            const current = usageMap.get(item.item_id) || 0
            usageMap.set(item.item_id, current + totalQty)

            // Calculate cost for this ingredient
            const ing = ingredients.find(i => i.id === item.item_id)
            if (ing) {
                const lossRate = ing.loss_rate || 0
                const divisor = lossRate >= 1 ? 0.001 : (1 - lossRate)
                const unitCost = ((ing.purchase_price || 0) / (ing.conversion_factor || 1)) / divisor
                totalCost += (unitCost * totalQty)
            }
        } else if (item.item_type === 'menu') {
            const subCost = await getIngredientUsage(item.item_id, totalQty, usageMap, ingredients)
            totalCost += subCost
        }
    }
    return totalCost
}

export const createOrder = async (
    orderData: Omit<OrderInsert, "total_cost">,
    items: { menuId: string, quantity: number, price: number }[],
    customDate?: string
) => {
    try {
        // 0. Preliminary: Fetch all ingredients for cost calculation
        const { data: allIngredients } = await supabase.from("ingredients").select("*")
        if (!allIngredients) throw new Error("Could not fetch ingredients for cost calculation")

        // 1. Calculate COGS and Usage
        const usageMap = new Map<string, number>()
        let totalCost = 0
        for (const item of items) {
            const itemCost = await getIngredientUsage(item.menuId, item.quantity, usageMap, allIngredients)
            totalCost += itemCost
        }

        // 1.1 Override created_at for manual/historical orders
        const insertData = { ...orderData, total_cost: totalCost }
        if (customDate) {
            // Set created_at to the start of the selected date to maintain order
            (insertData as any).created_at = new Date(customDate).toISOString()
        }

        // 2. Create Order
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .insert(insertData as any)
            .select()
            .single()

        if (orderError) throw orderError
        if (!order) throw new Error("Failed to create order")

        // 3. Create Order Items
        const orderItemsData: OrderItemInsert[] = items.map(item => ({
            order_id: order.id,
            menu_id: item.menuId,
            quantity: item.quantity,
            price: item.price,
            created_at: order.created_at // Sync with order date
        }))

        const { error: itemsError } = await supabase
            .from("order_items")
            .insert(orderItemsData)

        if (itemsError) throw itemsError

        // 4. Deduct Stock (Best Effort)
        for (const [ingId, qty] of usageMap.entries()) {
            const ing = allIngredients.find(i => i.id === ingId)
            if (ing) {
                const newStock = (ing.current_stock || 0) - qty
                await supabase
                    .from("ingredients")
                    .update({ current_stock: newStock })
                    .eq("id", ingId)

                // Log Stock Adjustment
                await supabase
                    .from("stock_adjustment_logs")
                    .insert({
                        ingredient_id: ingId,
                        adjustment_type: 'order',
                        quantity: -qty,
                        reason: `Order #${order.id.slice(0, 8)}`,
                        created_at: order.created_at // Sync with order date
                    })
            }
        }
        // 5. Update Sales Record (Daily Aggregation)
        const salesDate = customDate || new Date().toISOString().split('T')[0]
        const { data: existingSales } = await supabase
            .from("sales_records")
            .select("*")
            .eq("sales_date", salesDate)
            .eq("user_id", order.user_id)
            .single()

        if (existingSales) {
            await supabase
                .from("sales_records")
                .update({
                    daily_revenue: Number(existingSales.daily_revenue) + Number(order.total_amount),
                    daily_cogs: Number(existingSales.daily_cogs || 0) + Number(totalCost),
                    updated_at: new Date().toISOString()
                })
                .eq("id", existingSales.id)
        } else {
            await supabase
                .from("sales_records")
                .insert({
                    user_id: order.user_id,
                    sales_date: salesDate,
                    daily_revenue: order.total_amount,
                    daily_cogs: totalCost,
                    memo: customDate ? "Manually entered sales" : "Auto-generated from POS"
                })
        }

        return order
    } catch (error) {
        console.error("Create Order Error:", error)
        throw error
    }
}

export const getOrders = async (startDate?: string, endDate?: string, limit = 100, includeItems = false) => {
    let selectString = "*"
    if (includeItems) {
        selectString = `
            *,
            order_items (
                *,
                recipes (name)
            )
        `
    }

    let query = supabase
        .from("orders")
        .select(selectString)
        .order("created_at", { ascending: false })

    if (startDate) {
        query = query.gte("created_at", `${startDate}T00:00:00`)
    }
    if (endDate) {
        query = query.lte("created_at", `${endDate}T23:59:59`)
    }

    const { data, error } = await query.limit(limit)

    if (error) throw error
    return data as any[]
}

export const getOrderItems = async (orderId: string) => {
    const { data, error } = await supabase
        .from("order_items")
        .select(`
            *,
            recipes (
                name
            )
        `)
        .eq("order_id", orderId)

    if (error) throw error
    return data
}

export const cancelOrder = async (order: Order) => {
    try {
        if (order.status === 'cancelled') return

        // 1. Get items and ingredients to restore
        const items = await getOrderItems(order.id)
        const usageMap = new Map<string, number>()
        const { data: allIngredients } = await supabase.from("ingredients").select("*")
        if (!allIngredients) throw new Error("Could not fetch ingredients")

        for (const item of items) {
            await getIngredientUsage(item.menu_id, item.quantity, usageMap, allIngredients)
        }

        // 2. Restore Stock
        for (const [ingId, qty] of usageMap.entries()) {
            const ing = allIngredients.find(i => i.id === ingId)
            if (ing) {
                const newStock = (ing.current_stock || 0) + qty
                await supabase
                    .from("ingredients")
                    .update({ current_stock: newStock })
                    .eq("id", ingId)

                // Log Stock Adjustment
                await supabase
                    .from("stock_adjustment_logs")
                    .insert({
                        ingredient_id: ingId,
                        adjustment_type: 'refund',
                        quantity: qty,
                        reason: `Cancel Order #${order.id.slice(0, 8)}`
                    })
            }
        }

        // 3. Update Order Status
        const { error: orderError } = await supabase
            .from("orders")
            .update({ status: 'cancelled' })
            .eq("id", order.id)

        if (orderError) throw orderError

        // 4. Update Sales Record (Deduct from daily totals)
        const salesDate = order.created_at.split('T')[0]
        const { data: sales } = await supabase
            .from("sales_records")
            .select("*")
            .eq("sales_date", salesDate)
            .eq("user_id", order.user_id)
            .single()

        if (sales) {
            await supabase
                .from("sales_records")
                .update({
                    daily_revenue: Number(sales.daily_revenue) - Number(order.total_amount),
                    daily_cogs: Number(sales.daily_cogs || 0) - Number(order.total_cost || 0),
                    updated_at: new Date().toISOString()
                })
                .eq("id", sales.id)
        }

        return true
    } catch (error) {
        console.error("Cancel Order Error:", error)
        throw error
    }
}

