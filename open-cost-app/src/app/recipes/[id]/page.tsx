"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { AppLayout } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { ArrowLeft, Trash2, ChefHat, Banknote, Settings, Coins } from "lucide-react"
import { cn } from "@/lib/utils"
// Import Database Types
import { Database } from "@/types/database.types"
import { getRecipeSalesWeights } from "@/lib/api/orders"

// Types
type IngredientRow = Database["public"]["Tables"]["ingredients"]["Row"]
type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"]
// Helper type for the recursive structure
interface CostItem {
    id: string
    name: string
    type: 'ingredient' | 'menu' | 'prep'
    quantity: number
    usage_unit: string
    unit_cost: number
    total_cost: number
    subItems?: CostItem[] // For Menu type
}

interface RecipeDetail {
    id: string
    name: string
    selling_price: number
    description: string | null
    category?: string
    ingredients: CostItem[]
}

// Helper to fetch recipe cost recursively (currently 1-level for view, but logic can be extended)
// We'll keep it inline for now to access state/supabase easily, but optimized.

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // Next.js 15+ params handling
    const { id } = use(params)
    const router = useRouter()

    const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
    const [overheadCost, setOverheadCost] = useState(0)
    const [isWeighted, setIsWeighted] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchRecipeData()
    }, [id])

    const fetchRecipeData = async () => {
        try {
            setLoading(true)

            // 0. Get User & Settings (For Allocation)
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: settings } = await supabase
                    .from("store_settings")
                    .select("*")
                    .eq("user_id", user.id)
                    .single()

                if (settings) {
                    const fixed = Number(settings.monthly_fixed_cost) || 0
                    const target = Number(settings.monthly_target_sales_count) || 1

                    // Advanced: Try to get actual sales weight
                    try {
                        const { weights, totalQty } = await getRecipeSalesWeights(30)
                        if (totalQty > 0) {
                            // If we have actual sales, per unit cost = fixed / totalQty
                            // (Because weighted per menu = (fixed * (qtyA/totalQty)) / qtyA = fixed / totalQty)
                            setOverheadCost(Math.round(fixed / totalQty))
                            setIsWeighted(true)
                        } else {
                            // Fallback to target
                            setOverheadCost(Math.round(fixed / target))
                            setIsWeighted(false)
                        }
                    } catch (err) {
                        console.error("Failed to fetch weights, using fallback", err)
                        setOverheadCost(Math.round(fixed / target))
                    }
                }
            }

            // 1. Fetch Recipe Info
            const { data: recipeData, error: recipeError } = await supabase
                .from("recipes")
                .select(`
                    *,
                    categories (
                        name
                    )
                `)
                .eq("id", id)
                .single()

            if (recipeError) throw recipeError


            // 2. Fetch Recipe Ingredients (Detailed)
            const { data: itemsData, error: itemsError } = await supabase
                .from("recipe_ingredients")
                .select("*")
                .eq("recipe_id", id)

            if (itemsError) throw itemsError

            if (!itemsData || itemsData.length === 0) {
                setRecipe({
                    id: recipeData.id,
                    name: recipeData.name,
                    selling_price: recipeData.selling_price || 0,
                    description: recipeData.description,
                    ingredients: [],
                    category: (recipeData as any).categories?.name || "단품"
                })
                return
            }

            // 3. Prepare Bulk Fetching Details
            const directIngIds = itemsData.filter((i: any) => i.item_type === 'ingredient').map((i: any) => i.item_id)
            const directMenuIds = itemsData.filter((i: any) => i.item_type === 'menu').map((i: any) => i.item_id)

            // Fetch Direct Ingredients Details
            let allIngMap = new Map<string, IngredientRow>()
            if (directIngIds.length > 0) {
                const { data: ings } = await supabase.from("ingredients").select("*").in("id", directIngIds)
                ings?.forEach(i => allIngMap.set(i.id, i))
            }

            // Fetch Direct Menus Details (Name, Price)
            let allMenuMap = new Map<string, RecipeRow>()
            let subRecipeIngredientsMap = new Map<string, any[]>()

            if (directMenuIds.length > 0) {
                // Get Menu Info
                const { data: menus } = await supabase.from("recipes").select("*").in("id", directMenuIds)
                menus?.forEach(m => allMenuMap.set(m.id, m))

                // Get Sub-Ingredients for these menus (Raw Links)
                const { data: subSchema } = await supabase
                    .from("recipe_ingredients")
                    .select("*")
                    .in("recipe_id", directMenuIds)

                // Collect sub-ingredient link IDs to fetch their details
                const subIngIds = subSchema?.filter(s => s.item_type === 'ingredient').map(s => s.item_id) || []

                // Fetch Sub-Ingredient Details
                if (subIngIds.length > 0) {
                    const { data: subIngs } = await supabase.from("ingredients").select("*").in("id", subIngIds)
                    subIngs?.forEach(i => allIngMap.set(i.id, i)) // Add to main map
                }

                // Group subSchema by recipe_id
                subSchema?.forEach(item => {
                    const current = subRecipeIngredientsMap.get(item.recipe_id) || []
                    current.push(item)
                    subRecipeIngredientsMap.set(item.recipe_id, current)
                })
            }

            // 4. Construct Final Data Tree
            const buildCostItem = (itemId: string, itemType: string, quantity: number): CostItem | null => {
                if (itemType === 'ingredient') {
                    const ing = allIngMap.get(itemId)
                    if (!ing) return null
                    const unitCost = (ing.purchase_price / ing.conversion_factor) / (1 - (ing.loss_rate || 0))
                    return {
                        id: ing.id,
                        name: ing.name,
                        type: 'ingredient',
                        quantity: quantity,
                        usage_unit: ing.usage_unit,
                        unit_cost: unitCost,
                        total_cost: unitCost * quantity
                    }
                } else if (itemType === 'menu' || itemType === 'prep') {
                    const menu = allMenuMap.get(itemId)
                    if (!menu) return null

                    const rawSubItems = subRecipeIngredientsMap.get(itemId) || []
                    const subItems: CostItem[] = []
                    let menuUnitCost = 0

                    rawSubItems.forEach(raw => {
                        const sub = buildCostItem(raw.item_id, raw.item_type, raw.quantity)
                        if (sub) {
                            subItems.push(sub)
                            menuUnitCost += sub.total_cost
                        }
                    })

                    return {
                        id: menu.id,
                        name: menu.name,
                        type: itemType as 'menu' | 'prep',
                        quantity: quantity,
                        usage_unit: '개',
                        unit_cost: menuUnitCost,
                        total_cost: menuUnitCost * quantity,
                        subItems: subItems
                    }
                }
                return null
            }

            const finalIngredients = itemsData.map((item: any) =>
                buildCostItem(item.item_id, item.item_type, item.quantity)
            ).filter((i): i is CostItem => i !== null)

            setRecipe({
                id: recipeData.id,
                name: recipeData.name,
                selling_price: recipeData.selling_price || 0,
                description: recipeData.description,
                ingredients: finalIngredients,
                category: (recipeData as any).categories?.name || "단품"
            })

        } catch (error) {
            console.error("Error fetching details:", error)
            alert("메뉴 정보를 불러오는데 실패했습니다.")
            router.push("/recipes")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("정말 이 메뉴를 삭제하시겠습니까?")) return
        const { error } = await supabase.from("recipes").delete().eq("id", id)
        if (error) {
            alert("삭제 실패")
        } else {
            alert("삭제되었습니다.")
            router.push("/recipes")
        }
    }

    if (loading) return (
        <AppLayout>
            <div className="flex h-64 items-center justify-center">
                <p className="animate-pulse text-muted-foreground">레시피 분석 중...</p>
            </div>
        </AppLayout>
    )

    if (!recipe) return null

    // Totals Calculation
    const materialCost = recipe.ingredients.reduce((sum, item) => sum + item.total_cost, 0)
    const totalCost = materialCost + overheadCost // New Total: Material + Overhead
    const margin = recipe.selling_price - totalCost
    const marginRate = recipe.selling_price > 0 ? (margin / recipe.selling_price) * 100 : 0
    const costRate = 100 - marginRate

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{recipe.name}</h1>
                            <p className="text-muted-foreground">{recipe.description || "설명 없음"}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/recipes/${id}/edit`}>
                            <Button variant="outline" size="icon" className="border-primary/50 text-primary hover:bg-primary/10">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Button variant="destructive" size="icon" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Overhead Alert */}
                {overheadCost > 0 ? (
                    <div className={cn(
                        "px-4 py-3 rounded-xl flex items-center text-sm border-2",
                        isWeighted
                            ? "bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400"
                            : "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400"
                    )}>
                        <Banknote className="h-4 w-4 mr-2" />
                        <span>
                            <b className="font-black uppercase tracking-tight mr-1">
                                {isWeighted ? "현장 데이터 기반 배분:" : "목표치 기반 배분:"}
                            </b>
                            최근 30일 데이터 기준, 개당 <b>{overheadCost.toLocaleString()}원</b>의 고정비가 할당되었습니다.
                        </span>
                    </div>
                ) : (
                    <div className="bg-amber-950/30 border-2 border-amber-500/30 text-amber-400 px-4 py-3 rounded-xl flex items-center justify-between text-sm backdrop-blur-sm">
                        <div className="flex items-center">
                            <Coins className="h-4 w-4 mr-2 text-amber-500" />
                            <span>
                                <b className="text-amber-300">고정비 배분 미설정:</b> 고정 지출을 반영하면 <b>실질적인 순수익</b>을 파악할 수 있습니다.
                            </span>
                        </div>
                        <Link href="/settings">
                            <Button variant="outline" size="sm" className="bg-amber-500/10 border-2 border-amber-500/50 hover:bg-amber-500/20 text-amber-400 h-8 font-black text-xs">
                                <Settings className="h-3 w-3 mr-2" /> 설정 바로가기
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Analysis Cards */}
                <div className="grid gap-6 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">판매가</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{recipe.selling_price.toLocaleString()}원</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">총 원가 (재료비+배분비용)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-500">
                                {Math.round(totalCost).toLocaleString()}원
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                <div className="flex justify-between">
                                    <span>순수 재료비:</span>
                                    <span>{Math.round(materialCost).toLocaleString()}원</span>
                                </div>
                                <div className={cn("flex justify-between font-medium", overheadCost > 0 ? "text-blue-600" : "text-amber-600")}>
                                    <span>배분 비용:</span>
                                    <span>+{overheadCost.toLocaleString()}원</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className={cn(marginRate < 20 ? "bg-red-50 dark:bg-red-900/10" : "bg-green-50 dark:bg-green-900/10")}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">최종 순이익 (Net Profit)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-2xl font-bold", marginRate < 20 ? "text-red-600" : "text-green-600")}>
                                {Math.round(margin).toLocaleString()}원
                            </div>
                            <p className={cn("text-xs font-medium", marginRate < 20 ? "text-red-500" : "text-green-500")}>
                                순이익률 {Math.round(marginRate)}%
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Ingredients List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ChefHat className="h-5 w-5 text-primary" />
                            원가 상세 구성
                        </CardTitle>
                        <CardDescription>
                            재료비와 배분 비용이 어떻게 구성되어 있는지 확인하세요.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Overhead Item - Always Visible */}
                        <div className={cn("flex items-center justify-between border-b pb-4 p-2 rounded", overheadCost > 0 ? "bg-blue-50/50" : "bg-amber-50/50")}>
                            <div className="flex items-center gap-2">
                                <div className={cn("p-1.5 rounded", overheadCost > 0 ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600")}>
                                    <Banknote className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className={cn("font-bold", overheadCost > 0 ? "text-blue-700" : "text-amber-700")}>
                                        고정비 배분 (Overhead)
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {overheadCost > 0 ? "매장 설정에 따른 자동 할당" : "설정되지 않음 (0원 적용)"}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                {overheadCost > 0 ? (
                                    <>
                                        <p className="font-medium text-blue-700">{overheadCost.toLocaleString()}원</p>
                                        <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className="h-full bg-blue-400"
                                                style={{ width: `${Math.min((overheadCost / totalCost) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <Link href="/settings">
                                        <Button variant="outline" size="sm" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100">
                                            설정하기
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* List Items */}
                        {recipe.ingredients.map((item) => (
                            <div key={item.id} className="border-b last:border-0 border-white/10 pb-4 last:pb-0">
                                {/* Main Item Row */}
                                <div className="flex items-center justify-between py-2 px-2">
                                    <div className="flex items-center gap-3">
                                        {/* Badge / Icon */}
                                        {item.type === 'menu' ? (
                                            <div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">세트메뉴</div>
                                        ) : item.type === 'prep' ? (
                                            <div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">반제품(Prep)</div>
                                        ) : (
                                            <div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">재료</div>
                                        )}

                                        <div>
                                            <p className="font-medium text-slate-200">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.quantity.toLocaleString()}{item.usage_unit}
                                                {item.unit_cost > 0 && ` × ${Math.round(item.unit_cost).toLocaleString()}원`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-slate-200">{Math.round(item.total_cost).toLocaleString()}원</p>
                                    </div>
                                </div>

                                {/* Sub Items (Nested View) */}
                                {(item.type === 'menu' || item.type === 'prep') && item.subItems && item.subItems.length > 0 && (
                                    <div className="ml-10 mt-1 p-3 bg-slate-900/50 rounded-lg border border-white/5 space-y-1">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center font-bold">
                                            <span className="w-1 h-1 bg-purple-500 rounded-full mr-2"></span>
                                            Composition
                                        </p>
                                        {item.subItems.map(sub => (
                                            <div key={sub.id} className="flex justify-between items-center text-xs text-slate-400 border-b border-white/5 last:border-0 py-1">
                                                <span>{sub.name} ({sub.quantity}{sub.usage_unit})</span>
                                                <span className="font-mono">{Math.round(sub.total_cost).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    )
}
