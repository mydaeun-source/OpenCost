"use client"

import { use, useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { RecipeBuilder } from "@/components/recipes/RecipeBuilder"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [initialData, setInitialData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchRecipeData()
    }, [id])

    const fetchRecipeData = async () => {
        try {
            setLoading(true)
            // 1. Fetch Recipe Info
            const { data: recipeData, error: recipeError } = await supabase
                .from("recipes")
                .select("*")
                .eq("id", id)
                .single()

            if (recipeError) throw recipeError

            // 2. Fetch Recipe Ingredients (ALL: Ingredient + Menu)
            const { data: itemsData, error: itemsError } = await supabase
                .from("recipe_ingredients")
                .select("item_id, item_type, quantity, id") // Explicitly select columns
                .eq("recipe_id", id)

            if (itemsError) throw itemsError

            // 3. Fetch Sub-Recipe Details (to know if they are Preps)
            const subRecipeIds = itemsData
                .filter((item: any) => item.item_type === 'menu' || item.item_type === 'prep')
                .map((item: any) => item.item_id)

            let subRecipeMap = new Map<string, any>()
            if (subRecipeIds.length > 0) {
                const { data: subRecipes } = await supabase
                    .from("recipes")
                    .select("id, type, batch_size, batch_unit, portion_size, portion_unit")
                    .in("id", subRecipeIds)

                subRecipes?.forEach(r => subRecipeMap.set(r.id, r))
            }

            console.log("EditPage Loaded Items:", itemsData) // Debug Log

            setInitialData({
                id: recipeData.id,
                name: recipeData.name,
                type: recipeData.type,
                selling_price: recipeData.selling_price || 0,
                ingredients: itemsData?.map((item: any) => {
                    const subInfo = subRecipeMap.get(item.item_id)
                    // If it's a menu but the referenced recipe is actually a prep, treat it as prep (or ensure type is passed)
                    // We will override itemType to 'prep' if database says it is a prep, even if `recipe_ingredients` says 'menu' (legacy data)
                    const realType = (item.item_type === 'menu' && subInfo?.type === 'prep') ? 'prep' : item.item_type

                    return {
                        itemId: item.item_id,
                        itemType: realType,
                        quantity: item.quantity,
                        // Pass extra info for unit conversion if needed (not strict requirement for this fix but helpful)
                        batchUnit: subInfo?.batch_unit,
                        portionUnit: subInfo?.portion_unit
                    }
                }) || []
            })
        } catch (error) {
            console.error("Error fetching recipe:", error)
            alert("레시피 정보를 불러올 수 없습니다.")
            router.push("/recipes")
        } finally {
            setLoading(false)
        }
    }

    if (loading) return (
        <AppLayout>
            <div className="flex h-64 items-center justify-center">
                <p className="animate-pulse text-muted-foreground">데이터 불러오는 중...</p>
            </div>
        </AppLayout>
    )

    if (!initialData) return null

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <Link href={`/recipes/${id}`}>
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">메뉴 수정</h1>
                        <p className="text-muted-foreground">재료 구성과 가격을 수정합니다.</p>
                    </div>
                </div>

                <RecipeBuilder initialData={initialData} />
            </div>
        </AppLayout>
    )
}
