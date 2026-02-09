import { supabase } from "@/lib/supabase"
import { Database } from "@/types/database.types"

export type Purchase = Database["public"]["Tables"]["purchases"]["Row"]
export type PurchaseInsert = Database["public"]["Tables"]["purchases"]["Insert"]
export type PurchaseItem = Database["public"]["Tables"]["purchase_items"]["Row"]
export type PurchaseItemInsert = Database["public"]["Tables"]["purchase_items"]["Insert"]

export const getPurchases = async (startDate?: string, endDate?: string) => {
    let query = supabase
        .from("purchases")
        .select(`
            *,
            items:purchase_items(
                *,
                ingredient:ingredients(name, purchase_unit)
            )
        `)
        .order("purchase_date", { ascending: false })

    if (startDate) {
        query = query.gte("purchase_date", startDate)
    }
    if (endDate) {
        query = query.lte("purchase_date", endDate)
    }

    const { data, error } = await query

    if (error) throw error
    return data
}

export const getPurchaseDetails = async (purchaseId: string) => {
    const { data: purchase, error: pError } = await supabase
        .from("purchases")
        .select("*")
        .eq("id", purchaseId)
        .single()

    if (pError) throw pError

    const { data: items, error: iError } = await supabase
        .from("purchase_items")
        .select(`
            *,
            ingredients (
                name,
                purchase_unit
            )
        `)
        .eq("purchase_id", purchaseId)

    if (iError) throw iError

    return { ...purchase, items }
}

export const createPurchase = async (
    purchaseData: Omit<PurchaseInsert, "total_amount" | "user_id">,
    items: { ingredientId: string, quantity: number, price: number }[]
) => {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("로그인 필요")

        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)

        // 1. Create Purchase Record
        const { data: purchase, error: pError } = await supabase
            .from("purchases")
            .insert({ ...purchaseData, user_id: user.id, total_amount: totalAmount })
            .select()
            .single()

        if (pError) throw pError
        if (!purchase) throw new Error("Failed to create purchase")

        // 2. Create Purchase Items
        const purchaseItemsData: PurchaseItemInsert[] = items.map(item => ({
            purchase_id: purchase.id,
            ingredient_id: item.ingredientId,
            quantity: item.quantity,
            price: item.price
        }))

        const { error: iError } = await supabase
            .from("purchase_items")
            .insert(purchaseItemsData)

        if (iError) throw iError

        // 3. Side Effects (Stock & Logs)
        for (const item of items) {
            // Fetch current ingredient to update price and stock
            const { data: ing } = await supabase
                .from("ingredients")
                .select("*")
                .eq("id", item.ingredientId)
                .single()

            if (ing) {
                const newStock = (ing.current_stock || 0) + item.quantity
                // Update stock and price (optional: update price to latest)
                await supabase
                    .from("ingredients")
                    .update({
                        current_stock: newStock,
                        purchase_price: item.price, // Update to latest purchase price
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", item.ingredientId)

                // Log Stock Adjustment
                await supabase
                    .from("stock_adjustment_logs")
                    .insert({
                        ingredient_id: item.ingredientId,
                        adjustment_type: 'purchase',
                        quantity: item.quantity,
                        reason: `Purchase #${purchase.id.slice(0, 8)} (${purchase.supplier_name || "Unknown"})`
                    })
            }
        }

        // 4. Automatic Expense Recording
        // First, check if "Purchase" or similar category exists in expense_categories
        const { data: category } = await supabase
            .from("expense_categories")
            .select("*")
            .eq("name", "매입 (식자재)")
            .single()

        let categoryId = category?.id

        if (!categoryId) {
            // Create category if missing
            const { data: newCat } = await supabase
                .from("expense_categories")
                .insert({ name: "매입 (식자재)", is_fixed: false })
                .select()
                .single()
            categoryId = newCat?.id
        }

        if (categoryId) {
            await supabase
                .from("expense_records")
                .insert({
                    user_id: purchase.user_id,
                    category_id: categoryId,
                    amount: totalAmount,
                    expense_date: purchase.purchase_date,
                    memo: `매입 건: ${purchase.supplier_name || "미지정"} (ID: ${purchase.id.slice(0, 8)})`
                })
        }

        return purchase
    } catch (error) {
        console.error("Create Purchase Error:", error)
        throw error
    }
}
