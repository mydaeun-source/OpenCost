"use client"

import { useState, useEffect, useMemo } from "react"
import { useRecipes } from "@/hooks/useRecipes"
import { useIngredients } from "@/hooks/useIngredients"
import { createProductionRecord } from "@/lib/api/inventory-analytics"
import { Repeat, Loader2, CheckCircle2, AlertCircle, Plus, Minus, ChefHat, ChevronDown, History as HistoryIcon, Clock, Target } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { AppLayout } from "@/components/layout/AppLayout"
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard"
import { Button } from "@/components/ui/Button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"

export default function ProductionPage() {
    const { recipes, loading: recipesLoading, fetchRecipes } = useRecipes()
    const { ingredients, loading: ingredientsLoading } = useIngredients()
    const [productionQty, setProductionQty] = useState<Record<string, number>>({})
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null)
    const [expandedBOM, setExpandedBOM] = useState<Record<string, boolean>>({})
    const [history, setHistory] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        fetchRecipes()
        fetchHistory()
    }, [fetchRecipes])

    const fetchHistory = async () => {
        try {
            setHistoryLoading(true)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const { data, error } = await supabase
                .from("stock_adjustment_logs")
                .select("*, ingredients(name, purchase_unit)")
                .eq("adjustment_type", "correction")
                .ilike("reason", "[배치 생산]%")
                .gte("created_at", thirtyDaysAgo.toISOString())
                .order("created_at", { ascending: false })

            if (error) throw error
            setHistory(data || [])
        } catch (error) {
            console.error("Fetch History Error:", error)
        } finally {
            setHistoryLoading(false)
        }
    }

    const prepRecipes = recipes.filter(r => r.type === 'prep')

    // Lookup table for ingredient/recipe names
    const itemLookup = useMemo(() => {
        const map: Record<string, { name: string, unit: string }> = {}
        ingredients.forEach(ing => {
            map[ing.id] = { name: ing.name, unit: ing.usage_unit }
        })
        recipes.forEach(rec => {
            map[rec.id] = { name: rec.name, unit: '개' }
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
            fetchHistory()
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
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-24">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-8 rounded-3xl border border-white/5 transition-all hover:bg-white/10">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white italic flex items-center gap-3">
                            <Target className="h-8 w-8 text-indigo-500" />
                            배치 생산 관리 (Batch Production)
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium">
                            반제품(소스, 육수 등)의 대량 생산을 기록하고 재료 소진을 자동 반영합니다.
                        </p>
                    </div>
                </div>

                <div className="grid gap-6">
                    {(recipesLoading || ingredientsLoading) ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">로딩 중...</p>
                        </div>
                    ) : prepRecipes.length === 0 ? (
                        <Card className="border-none bg-white/5">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <AlertCircle className="h-12 w-12 text-slate-700 mb-4" />
                                <p className="text-xl font-bold text-slate-500">등록된 반제품(Prep) 레시피가 없습니다.</p>
                                <p className="text-sm text-slate-600 mt-2">메뉴 관리에서 타입을 'Prep'으로 설정하여 레시피를 만들어보세요.</p>
                                <Button variant="outline" className="mt-6 border-white/10 text-slate-400 hover:bg-white/5" asChild>
                                    <a href="/recipes">레시피 만들러 가기</a>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {prepRecipes.map(recipe => (
                                <Card key={recipe.id} className="overflow-hidden border-none bg-white/5 transition-all hover:bg-white/10 group">
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase">반제품 (Prep)</div>
                                            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                                <Repeat className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <CardTitle className="text-lg font-black text-white italic">{recipe.name}</CardTitle>
                                        <CardDescription className="text-xs line-clamp-1">{recipe.description || "대량 생산용 반제품 레시피입니다."}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-0">
                                        <div className="bg-slate-950/50 rounded-xl border border-white/5 overflow-hidden">
                                            <button
                                                onClick={() => toggleBOM(recipe.id)}
                                                className="w-full flex items-center justify-between p-3 text-xs font-black text-slate-500 hover:text-indigo-400 transition-colors"
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
                                                <div className="px-3 pb-3 space-y-2 animate-in fade-in slide-in-from-top-1">
                                                    {(recipe as any).recipe_ingredients?.map((ri: any) => {
                                                        const detail = itemLookup[ri.item_id] || { name: "알 수 없는 항목", unit: "" }
                                                        return (
                                                            <div key={ri.id} className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-white/5 last:border-0">
                                                                <span className="text-slate-400">{detail.name}</span>
                                                                <span className="text-indigo-400">{ri.quantity.toLocaleString()}{detail.unit}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-white/5">
                                            <button
                                                onClick={() => handleQtyChange(recipe.id, (productionQty[recipe.id] || 0) - 1)}
                                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <Minus className="h-4 w-4 text-slate-500" />
                                            </button>
                                            <div className="flex-1 text-center">
                                                <Input
                                                    type="number"
                                                    value={productionQty[recipe.id] || ""}
                                                    onChange={(e) => handleQtyChange(recipe.id, parseFloat(e.target.value) || 0)}
                                                    className="border-none bg-transparent text-center text-xl font-black text-white focus-visible:ring-0"
                                                    placeholder="0"
                                                />
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">생산 수량</p>
                                            </div>
                                            <button
                                                onClick={() => handleQtyChange(recipe.id, (productionQty[recipe.id] || 0) + 1)}
                                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <Plus className="h-4 w-4 text-slate-500" />
                                            </button>
                                        </div>

                                        <Button
                                            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-600/20 gap-2 uppercase text-xs tracking-widest"
                                            onClick={() => handleProduce(recipe.id)}
                                            disabled={isSubmitting === recipe.id}
                                        >
                                            {isSubmitting === recipe.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" />생산 기록 저장</>}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Production History Log */}
                <CollapsibleCard
                    title="최근 배치 생산 내역"
                    description="최근 30일간의 반제품 생산 및 재고 소진 기록입니다."
                    icon={<HistoryIcon className="h-4 w-4" />}
                    storageKey="production-history"
                >
                    <div className="rounded-xl border border-white/5 overflow-hidden bg-white/5">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-white/5 text-slate-500 font-black uppercase tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="p-4 pl-6">시간</th>
                                        <th className="p-4">생산 내용 (BOM 소진 상세)</th>
                                        <th className="p-4 text-right">소모량</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {history.length === 0 && !historyLoading ? (
                                        <tr>
                                            <td colSpan={3} className="p-10 text-center text-slate-600 font-bold italic">생산 내역이 없습니다.</td>
                                        </tr>
                                    ) : (
                                        history.map((log) => {
                                            // Parse reason like: [배치 생산] 소금빵 10단위 생산 소진 (500g 소모)
                                            const match = log.reason?.match(/\[배치 생산\] (.*?) (.*?) 생산 소진 \((.*?) 소모\)/)
                                            const prodName = match ? match[1] : "기록"
                                            const prodQty = match ? match[2] : ""

                                            return (
                                                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4 pl-6 text-slate-500 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="h-3 w-3" />
                                                            {format(new Date(log.created_at), "MM/dd HH:mm")}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-white font-black">{prodName}</span>
                                                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase">{prodQty} 생산</span>
                                                            <span className="text-slate-500 font-medium">→</span>
                                                            <span className="text-slate-400 font-bold">{log.ingredients?.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="text-rose-400 font-black">-{Math.abs(log.quantity).toLocaleString()}{log.ingredients?.purchase_unit}</span>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CollapsibleCard>
            </div>
        </AppLayout>
    )
}
