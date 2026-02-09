import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/types/database.types"
import { toast } from "./use-toast"
import { useRouter } from "next/navigation"

type Recipe = Database["public"]["Tables"]["recipes"]["Row"]
type RecipeInsert = Database["public"]["Tables"]["recipes"]["Insert"]
type RecipeIngredientInsert = Database["public"]["Tables"]["recipe_ingredients"]["Insert"]

export function useRecipes() {
    const [recipes, setRecipes] = useState<Recipe[]>([])
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    // Fetch recipes
    const fetchRecipes = useCallback(async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("recipes")
                .select(`
                    *,
                    categories (
                        name
                    ),
                    recipe_ingredients (
                        id,
                        item_id,
                        item_type,
                        quantity
                    )
                `)
                .order("created_at", { ascending: false })

            if (error) throw error
            setRecipes(data || [])
        } catch (error: any) {
            console.error("Error fetching recipes:", error)
            if (error.message) {
                console.error("Error message:", error.message)
                console.error("Error details:", error.details)
                console.error("Error hint:", error.hint)
            }
            toast({
                title: "불러오기 실패",
                description: `레시피 목록을 불러오지 못했습니다. ${error.message || ""}`,
                type: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }, [])

    // Create Recipe (Transaction-like: Insert Recipe -> Insert Items)
    const createRecipe = async (
        recipeData: RecipeInsert,
        ingredients: { item_id: string; item_type: 'ingredient' | 'menu' | 'prep'; quantity: number }[]
    ) => {
        try {
            setLoading(true)

            // 1. Insert Recipe
            const { data: recipe, error: recipeError } = await supabase
                .from("recipes")
                .insert([recipeData])
                .select()
                .single()

            if (recipeError) throw recipeError
            if (!recipe) throw new Error("No recipe returned")

            // 2. Insert Recipe Ingredients
            if (ingredients.length > 0) {
                const recipeIngredients: RecipeIngredientInsert[] = ingredients.map(item => ({
                    recipe_id: recipe.id,
                    item_id: item.item_id,
                    item_type: item.item_type,
                    quantity: item.quantity
                }))

                const { error: ingredientsError } = await supabase
                    .from("recipe_ingredients")
                    .insert(recipeIngredients)

                if (ingredientsError) {
                    // Rollback (Manual delete) if ingredients fail
                    // Note: In a real prod env, use RPC or Postgres Functions for atomic transactions.
                    await supabase.from("recipes").delete().eq("id", recipe.id)
                    throw ingredientsError
                }
            }

            toast({
                title: "메뉴 생성 완료",
                description: `"${recipe.name}" 메뉴가 등록되었습니다.`,
                type: "success",
            })

            router.push("/recipes") // Redirect to list
            return recipe

        } catch (error) {
            console.error("Error creating recipe:", error)
            toast({
                title: "생성 실패",
                description: "메뉴 등록 중 오류가 발생했습니다.",
                type: "destructive",
            })
            throw error
        } finally {
        }
    }

    // Update Recipe (Update details -> Replace Ingredients)
    const updateRecipe = async (
        recipeId: string,
        recipeData: Partial<RecipeInsert>,
        ingredients: { item_id: string; item_type: 'ingredient' | 'menu' | 'prep'; quantity: number }[],
        retries = 3
    ) => {
        setLoading(true)
        for (let i = 0; i < retries; i++) {
            try {
                // 1. Update Recipe Details
                const { error: recipeError } = await supabase
                    .from("recipes")
                    .update(recipeData)
                    .eq("id", recipeId)

                if (recipeError) throw recipeError

                // 2. Replace Ingredients (Delete All -> Insert New)
                // A. Delete existing
                const { error: deleteError } = await supabase
                    .from("recipe_ingredients")
                    .delete()
                    .eq("recipe_id", recipeId)

                if (deleteError) throw deleteError

                // B. Insert new
                if (ingredients.length > 0) {
                    const recipeIngredients: RecipeIngredientInsert[] = ingredients.map(item => ({
                        recipe_id: recipeId,
                        item_id: item.item_id,
                        item_type: item.item_type,
                        quantity: item.quantity
                    }))

                    const { error: insertError } = await supabase
                        .from("recipe_ingredients")
                        .insert(recipeIngredients)

                    if (insertError) throw insertError
                }

                toast({
                    title: "수정 완료",
                    description: "메뉴 정보가 수정되었습니다.",
                    type: "success",
                })

                router.push(`/recipes/${recipeId}`) // Return to detail page
                return // Success, exit loop

            } catch (error: any) {
                // If last retry, throw/toast
                if (i === retries - 1) {
                    console.error("Error updating recipe (Final Attempt):", error)
                    toast({
                        title: "수정 실패",
                        description: `메뉴 수정 중 오류가 발생했습니다: ${error?.message || "알 수 없는 오류"}`,
                        type: "destructive",
                    })
                    // Don't throw to prevent unhandled promise rejection crashing UI if catch is missing upstream
                    // But we should probably let the caller know? 
                    // Existing code caught it.
                } else {
                    console.warn(`Retry ${i + 1}/${retries} for recipe update...`)
                    await new Promise(res => setTimeout(res, 500))
                }
            }
        }
        setLoading(false)
    }

    // Delete Recipe
    const deleteRecipe = async (id: string) => {
        try {
            setLoading(true)

            // Delete recipe (Cascade should handle ingredients, but explicit delete is safer/clearer if no cascade)
            // Assuming DB has cascade delete on FK. If not, delete ingredients first.
            // Let's rely on Supabase/Postgres FK Cascade for 'recipe_ingredients' -> 'recipe'

            const { error } = await supabase
                .from("recipes")
                .delete()
                .eq("id", id)

            if (error) throw error

            setRecipes(prev => prev.filter(r => r.id !== id))

            toast({
                title: "삭제 완료",
                description: "메뉴가 삭제되었습니다.",
            })

        } catch (error) {
            console.error("Error deleting recipe:", error)
            toast({
                title: "삭제 실패",
                description: "메뉴 삭제 중 오류가 발생했습니다.",
                type: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return {
        recipes,
        loading,
        fetchRecipes,
        createRecipe,
        updateRecipe,
        deleteRecipe
    }
}
