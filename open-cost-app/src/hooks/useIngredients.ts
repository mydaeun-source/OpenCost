import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/types/database.types"
import { toast } from "./use-toast"

type Ingredient = Database["public"]["Tables"]["ingredients"]["Row"]
type NewIngredient = Database["public"]["Tables"]["ingredients"]["Insert"]

export function useIngredients() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([])
    const [stockLogs, setStockLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Calculate total inventory value
    const totalInventoryValue = ingredients.reduce((sum, ing) => {
        return sum + ((ing.current_stock || 0) * (ing.purchase_price || 0))
    }, 0)

    // Fetch ingredients
    const fetchIngredients = useCallback(async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("ingredients")
                .select("*")
                .order("created_at", { ascending: false })

            if (error) {
                throw error
            }

            setIngredients(data || [])
        } catch (error) {
            console.error("Error fetching ingredients:", error)
            toast({
                title: "불러오기 실패",
                description: "재료 목록을 가져오는 중 오류가 발생했습니다.",
                type: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }, [])

    // Fetch stock logs
    const fetchStockLogs = useCallback(async (ingredientId?: string) => {
        try {
            let query = supabase
                .from("stock_adjustment_logs")
                .select(`
                    *,
                    ingredient:ingredients(name, purchase_unit)
                `)
                .order("created_at", { ascending: false })
                .limit(50)

            if (ingredientId) {
                query = query.eq("ingredient_id", ingredientId)
            }

            const { data, error } = await query
            if (error) throw error
            setStockLogs(data || [])
        } catch (error) {
            console.error("Error fetching stock logs:", error)
        }
    }, [])

    // Initial fetch
    useEffect(() => {
        fetchIngredients()
        fetchStockLogs()
    }, [fetchIngredients, fetchStockLogs])

    // Add ingredient
    const addIngredient = async (newIngredient: NewIngredient) => {
        try {
            const { data, error } = await supabase
                .from("ingredients")
                .insert([newIngredient])
                .select()
                .single()

            if (error) {
                throw error
            }

            setIngredients((prev) => [data, ...prev])
            toast({
                title: "재료 추가됨",
                description: `"${data.name}" 재료가 성공적으로 등록되었습니다.`,
                type: "success",
            })
            return data
        } catch (error) {
            console.error("Error adding ingredient:", error)
            toast({
                title: "등록 실패",
                description: "재료 등록 중 오류가 발생했습니다. 다시 시도해주세요.",
                type: "destructive",
            })
            throw error
        }
    }

    // Delete ingredient
    const deleteIngredient = async (id: string) => {
        try {
            const { error } = await supabase
                .from("ingredients")
                .delete()
                .eq("id", id)

            if (error) {
                throw error
            }

            setIngredients((prev) => prev.filter((item) => item.id !== id))
            toast({
                title: "재료 삭제됨",
                description: "재료가 목록에서 삭제되었습니다.",
            })
        } catch (error) {
            console.error("Error deleting ingredient:", error)
            toast({
                title: "삭제 실패",
                description: "재료 삭제 중 오류가 발생했습니다.",
                type: "destructive",
            })
        }
    }

    const updateIngredient = async (id: string, updates: Partial<Database["public"]["Tables"]["ingredients"]["Update"]>) => {
        try {
            const { data, error } = await supabase
                .from("ingredients")
                .update({ ...updates, updated_at: new Date().toISOString() } as any)
                .eq("id", id)
                .select()
                .single()

            if (error) throw error

            setIngredients((prev) => prev.map((item) => (item.id === id ? data : item)))
            toast({
                title: "정보 수정됨",
                description: "재료 정보가 업데이트되었습니다.",
                type: "success"
            })
            return data
        } catch (error) {
            console.error("Error updating ingredient:", error)
            toast({
                title: "수정 실패",
                description: "재료 정보 수정 중 오류가 발생했습니다.",
                type: "destructive"
            })
            throw error
        }
    }

    const adjustStock = async (id: string, currentStock: number, adjustment: number, type: 'purchase' | 'spoilage' | 'correction', reason?: string) => {
        try {
            const newStock = currentStock + adjustment

            // 1. Update ingredient stock
            const { data, error } = await supabase
                .from("ingredients")
                .update({ current_stock: newStock, updated_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single()

            if (error) throw error

            // 2. Log adjustment
            const { error: logError } = await supabase
                .from("stock_adjustment_logs")
                .insert({
                    ingredient_id: id,
                    adjustment_type: type,
                    quantity: adjustment,
                    reason: reason || ""
                })

            if (logError) console.error("Log failed", logError)

            setIngredients((prev) => prev.map((item) => (item.id === id ? data : item)))
            // Refresh logs after adjustment
            fetchStockLogs()

            toast({
                title: "재고 조정 완료",
                description: `현재고가 ${newStock}으로 변경되었습니다.`,
                type: "success"
            })
            return data
        } catch (error) {
            console.error("Error adjusting stock:", error)
            toast({
                title: "조정 실패",
                description: "재고 조정 중 오류가 발생했습니다.",
                type: "destructive"
            })
            throw error
        }
    }

    return {
        ingredients,
        stockLogs,
        totalInventoryValue,
        loading,
        addIngredient,
        updateIngredient,
        adjustStock,
        deleteIngredient,
        refresh: fetchIngredients,
        refreshLogs: fetchStockLogs,
    }
}
