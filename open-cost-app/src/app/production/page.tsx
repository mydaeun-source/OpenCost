"use client"

import { useState, useEffect, useMemo } from "react"
import { useRecipes } from "@/hooks/useRecipes"
import { useIngredients } from "@/hooks/useIngredients"
import { createProductionRecord } from "@/lib/api/inventory-analytics"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Repeat, Loader2, CheckCircle2, AlertCircle, Plus, Minus, ChefHat, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function ProductionPage() {
    const { recipes, loading: recipesLoading, fetchRecipes } = useRecipes()
    const { ingredients, loading: ingredientsLoading } = useIngredients()
    const [productionQty, setProductionQty] = useState<Record<string, number>>({})
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null)
    const [expandedBOM, setExpandedBOM] = useState<Record<string, boolean>>({})
    const { toast } = useToast()

    useEffect(() => {
        fetchRecipes()
    }, [fetchRecipes])

    const prepRecipes = recipes.filter(r => r.type === 'prep')

    // Lookup table for ingredient/recipe names
    const itemLookup = useMemo(() => {
        const map: Record<string, { name: string, unit: string }> = {}
        ingredients.forEach(ing => {
            map[ing.id] = { name: ing.name, unit: ing.usage_unit }
        })
        recipes.forEach(rec => {
            map[rec.id] = { name: rec.name, unit: '개' } // Recipes usually in units
        })
        return map
    }, [ingredients, recipes])

    const toggleBOM = (id: string) => {
        setExpandedBOM(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const handleQtyChange = (id: string, val: number) => {
        setProductionQty(prev => ({
            ...prev,
            [id]: Math.max(0, val)
        }))
    }

    const handleProduce = async (recipeId: string) => {
        const qty = productionQty[recipeId] || 0
        if (qty <= 0) {
            toast({
                title: "수량 오류",
                description: "생산할 수량을 입력해주세요.",
                type: "destructive"
            })
            return
        }

        try {
            setIsSubmitting(recipeId)
            await createProductionRecord(recipeId, qty)

            toast({
                title: "생산 기록 완료",
                description: "재료 소진 및 생산 내역이 기록되었습니다.",
                type: "success"
            })

            setProductionQty(prev => ({ ...prev, [recipeId]: 0 }))
        } catch (error: any) {
            console.error("Production Error:", error)
            toast({
                title: "생산 실패",
                description: error.message || "생산 기록 중 오류가 발생했습니다.",
                type: "destructive"
            })
        } finally {
            setIsSubmitting(null)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Repeat className="h-8 w-8 text-indigo-500" />
                        배치 생산 관리
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        반제품(소스, 육수 등)의 대량 생산을 기록하고 재료 소진을 자동 반영합니다.
                    </p>
                </div>
            </div>

            <div className="grid gap-6">
                {recipesLoading || ingredientsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">로딩 중...</p>
                    </div>
                ) : prepRecipes.length === 0 ? (
                    <Card className="border-2 border-dashed border-slate-200 dark:border-slate-800 bg-transparent">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
                            <p className="text-xl font-bold text-slate-400">등록된 반제품(Prep) 레시피가 없습니다.</p>
                            <p className="text-sm text-slate-500 mt-2">메뉴 관리에서 타입을 'Prep'으로 설정하여 레시피를 만들어보세요.</p>
                            <Button variant="outline" className="mt-6 border-2" asChild>
                                <a href="/recipes">레시피 만들러 가기</a>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {prepRecipes.map(recipe => (
                            <Card key={recipe.id} className="overflow-hidden border-2 border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl transition-all hover:border-indigo-500/30 group">
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase">Semi-Finished</div>
                                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                            <Repeat className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <CardTitle className="text-lg font-black">{recipe.name}</CardTitle>
                                    <CardDescription className="text-xs line-clamp-1">{recipe.description || "대량 생산용 반제품 레시피입니다."}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-0">
                                    {/* BOM Section (Expandable) */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                        <button
                                            onClick={() => toggleBOM(recipe.id)}
                                            className="w-full flex items-center justify-between p-3 text-xs font-black text-slate-500 hover:text-indigo-500 transition-colors"
                                        >
                                            <span className="flex items-center gap-2">
                                                <ChefHat className="h-3.5 w-3.5" />
                                                레시피 구성 (BOM)
                                            </span>
                                            <div className={cn("transition-transform", expandedBOM[recipe.id] ? "rotate-180" : "")}>
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            </div>
                                        </button>

                                        {expandedBOM[recipe.id] && (
                                            <div className="px-3 pb-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {(recipe as any).recipe_ingredients?.map((ri: any) => {
                                                    const detail = itemLookup[ri.item_id] || { name: "알 수 없는 항목", unit: "" }
                                                    return (
                                                        <div key={ri.id} className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-200/50 dark:border-slate-700/50 last:border-0">
                                                            <span className="text-slate-700 dark:text-slate-300">{detail.name}</span>
                                                            <span className="text-indigo-500">{ri.quantity.toLocaleString()}{detail.unit}</span>
                                                        </div>
                                                    )
                                                })}
                                                {(!(recipe as any).recipe_ingredients || (recipe as any).recipe_ingredients.length === 0) && (
                                                    <p className="text-[10px] text-slate-400 text-center py-2 font-medium">구성 재료가 없습니다.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-slate-100 dark:border-slate-800">
                                        <button
                                            onClick={() => handleQtyChange(recipe.id, (productionQty[recipe.id] || 0) - 1)}
                                            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
                                        >
                                            <Minus className="h-4 w-4 text-slate-400" />
                                        </button>
                                        <div className="flex-1 text-center">
                                            <Input
                                                type="number"
                                                value={productionQty[recipe.id] || ""}
                                                onChange={(e) => handleQtyChange(recipe.id, parseFloat(e.target.value) || 0)}
                                                className="border-none bg-transparent text-center text-xl font-black text-slate-800 dark:text-white focus-visible:ring-0"
                                                placeholder="0"
                                            />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">생산 수량</p>
                                        </div>
                                        <button
                                            onClick={() => handleQtyChange(recipe.id, (productionQty[recipe.id] || 0) + 1)}
                                            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
                                        >
                                            <Plus className="h-4 w-4 text-slate-400" />
                                        </button>
                                    </div>

                                    <Button
                                        className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-600/20 gap-2 overflow-hidden relative"
                                        onClick={() => handleProduce(recipe.id)}
                                        disabled={isSubmitting === recipe.id}
                                    >
                                        {isSubmitting === recipe.id ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-5 w-5" />
                                                현 시간 생산 기록
                                            </>
                                        )}
                                        {isSubmitting === recipe.id && (
                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 animate-pulse" />
                                        )}
                                    </Button>

                                    <p className="text-[10px] text-center text-slate-500 font-bold leading-relaxed">
                                        기록 시 포함된 모든 하위 재료 재고가<br />즉시 차감됩니다.
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
