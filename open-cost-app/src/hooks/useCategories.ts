import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/types/database.types"
import { toast } from "./use-toast"
import { useStore } from "@/contexts/StoreContext"

type Category = Database["public"]["Tables"]["categories"]["Row"]
type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"]

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(false)
    const { activeStore } = useStore()

    // Fetch categories by type (optional)
    const fetchCategories = useCallback(async (type?: 'menu' | 'ingredient' | 'prep') => {
        try {
            setLoading(true)
            if (!activeStore) return

            let query = supabase
                .from("categories")
                .select("*")
                .eq("store_id", activeStore.id)
                .order("name")

            if (type) {
                query = query.eq("type", type)
            }

            const { data, error } = await query

            if (error) throw error
            setCategories(data || [])
        } catch (error) {
            console.error("Error fetching categories:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    // Ensure a category exists with retry logic for AbortErrors
    const ensureCategory = async (name: string, type: 'menu' | 'ingredient' | 'prep', retries = 3): Promise<string | null> => {
        for (let i = 0; i < retries; i++) {
            try {
                if (!activeStore) return null

                // 1. Check if exists
                const { data: existing, error: fetchError } = await supabase
                    .from("categories")
                    .select("id")
                    .eq("name", name)
                    .eq("type", type)
                    .eq("store_id", activeStore.id)
                    .single()

                // If found, return it
                if (existing) return existing.id

                // If error is NOT "Row not found" (PGRST116), throw it
                if (fetchError && fetchError.code !== 'PGRST116') {
                    throw fetchError
                }

                // 2. Create if not
                const { data: created, error } = await supabase
                    .from("categories")
                    .insert([{ name, type, store_id: activeStore.id }])
                    .select("id")
                    .single()

                if (error) throw error
                return created.id

            } catch (error: any) {
                // If it's the last retry, fail.
                if (i === retries - 1) {
                    console.error("Error ensuring category (Final Attempt):", error)
                    toast({
                        title: "카테고리 오류",
                        description: `'${name}' 처리에 실패했습니다: ${error?.message || "알 수 없는 오류"}`,
                        type: "destructive"
                    })
                    return null
                }

                // If AbortError or transient, wait and retry.
                console.warn(`Retry ${i + 1}/${retries} for category ensure...`)
                await new Promise(res => setTimeout(res, 500))
            }
        }
        return null
    }

    return {
        categories,
        loading,
        fetchCategories,
        ensureCategory
    }
}
