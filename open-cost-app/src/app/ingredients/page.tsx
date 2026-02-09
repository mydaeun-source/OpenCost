"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Dialog } from "@/components/ui/Dialog"
import { IngredientForm } from "@/components/ingredients/IngredientForm"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { useIngredients } from "@/hooks/useIngredients"
import { Plus, Trash2, Package, LayoutGrid, List, TrendingUp, History, Banknote, Coins, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useViewMode } from "@/hooks/useViewMode"
import { StockAdjustmentDialog } from "@/components/ingredients/StockAdjustmentDialog"
import { StockHistory } from "@/components/ingredients/StockHistory"
import { supabase } from "@/lib/supabase"
import { MarketPriceCard } from "@/components/analytics/MarketPriceCard"
import { ProcurementForecast } from "@/components/analytics/ProcurementForecast"
import { getProcurementForecast, ForecastItem } from "@/lib/api/procurement-predictor"
import { subDays } from "date-fns"
import { Clock } from "lucide-react"

export default function IngredientsPage() {
    const { ingredients, stockLogs, totalInventoryValue, loading, addIngredient, updateIngredient, deleteIngredient, adjustStock } = useIngredients()
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [adjustmentId, setAdjustmentId] = useState<string | null>(null)
    const { viewMode, setViewMode, mounted } = useViewMode('ingredients-view-mode', 'grid')
    const [forecasts, setForecasts] = useState<Record<string, ForecastItem>>({})

    useEffect(() => {
        const fetchForecastData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const data = await getProcurementForecast(user.id)
                const map: Record<string, ForecastItem> = {}
                data.forEach(item => map[item.id] = item)
                setForecasts(map)
            }
        }
        if (ingredients.length > 0) {
            fetchForecastData()
        }
    }, [ingredients.length])

    const handleSubmit = async (data: any) => {
        if (editingId) {
            await updateIngredient(editingId, data)
        } else {
            await addIngredient(data)
        }
        setIsAddOpen(false)
        setEditingId(null)
    }

    const handleAdjust = async (id: string, current: number, adj: number, type: any, reason?: string) => {
        await adjustStock(id, current, adj, type, reason)
        setAdjustmentId(null)
    }

    // Deletion State
    const [deleteItem, setDeleteItem] = useState<{ id: string, name: string } | null>(null)

    const confirmDelete = async () => {
        if (deleteItem) {
            await deleteIngredient(deleteItem.id)
            setDeleteItem(null)
        }
    }

    // Prevent hydration mismatch
    if (!mounted) return null

    const editingItem = ingredients.find(i => i.id === editingId)

    return (
        <AppLayout>
            <div className="space-y-6 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">재료 및 자산 관리</h1>
                        <p className="text-muted-foreground mt-1">식자재의 구매 가격, 재고 및 총 가치를 실시간으로 관리합니다.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-muted/20 p-1 rounded-lg border border-white/5 mx-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-2 rounded-md transition-all",
                                    viewMode === 'grid' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                                title="카드 보기"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-2 rounded-md transition-all",
                                    viewMode === 'list' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                        <Button onClick={() => setIsAddOpen(true)} className="rounded-xl shadow-lg shadow-indigo-500/20">
                            <Plus className="mr-2 h-4 w-4" />
                            재료 추가
                        </Button>
                    </div>
                </div>

                {/* AI Procurement Forecast Section */}
                <div className="mb-8">
                    <ProcurementForecast />
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="bg-slate-900/60 border-slate-700 shadow-xl border-l-4 border-l-indigo-500 overflow-hidden group hover:bg-slate-900/80 transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-black text-slate-300 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">총 재고 가치</CardTitle>
                            <Banknote className="h-4 w-4 text-indigo-400 opacity-70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-white italic tracking-tight">{totalInventoryValue.toLocaleString()}원</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/60 border-slate-700 shadow-xl border-l-4 border-l-emerald-500 overflow-hidden group hover:bg-slate-900/80 transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-black text-slate-300 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">재료 품목 수</CardTitle>
                            <Package className="h-4 w-4 text-emerald-400 opacity-70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-white italic tracking-tight">{ingredients.length}개</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/60 border-slate-700 shadow-xl border-l-4 border-l-rose-500 overflow-hidden group hover:bg-slate-900/80 transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-black text-slate-300 uppercase tracking-widest group-hover:text-rose-400 transition-colors">재고 부족 품목</CardTitle>
                            <AlertCircle className="h-4 w-4 text-rose-400 opacity-70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-white italic tracking-tight">
                                {ingredients.filter(i => (i.current_stock || 0) <= (i.safety_stock || 0)).length}개
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-muted-foreground animate-pulse">데이터를 불러오는 중...</p>
                    </div>
                ) : (
                    <>
                        {ingredients.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center p-12 border rounded-lg border-dashed bg-muted/20 text-muted-foreground">
                                <Package className="h-12 w-12 mb-4 opacity-50" />
                                <p className="text-lg font-medium">등록된 재료가 없습니다.</p>
                                <p className="text-sm">새로운 재료를 등록하여 원가 및 재고 관리를 시작해보세요.</p>
                            </div>
                        ) : (
                            viewMode === 'grid' ? (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                                    {ingredients.map((ingredient) => {
                                        const isLowStock = (ingredient.current_stock || 0) <= (ingredient.safety_stock || 0)
                                        const kamisMappingRaw = typeof window !== "undefined" ? (localStorage.getItem(`kamis_mapping_${ingredient.id}`) || localStorage.getItem(`kamis_mapping_name_${ingredient.name}`)) : null
                                        const kamisMapping = kamisMappingRaw ? JSON.parse(kamisMappingRaw) : null

                                        return (
                                            <Card
                                                key={ingredient.id}
                                                className={cn("overflow-hidden transition-all hover:border-primary/50 cursor-pointer", isLowStock && "border-red-500/50 bg-red-500/5")}
                                                onClick={() => setEditingId(ingredient.id)}
                                            >
                                                {/* Market Comparison Card (Subtle) */}
                                                {kamisMapping && (
                                                    <div className="px-4 pt-4">
                                                        <MarketPriceCard
                                                            itemCode={kamisMapping.code}
                                                            categoryCode={kamisMapping.category}
                                                            myPrice={ingredient.purchase_price}
                                                            unit={ingredient.purchase_unit}
                                                        />
                                                    </div>
                                                )}

                                                <CardHeader className="pb-3 bg-secondary/10">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <CardTitle className="text-lg flex items-center gap-2">
                                                                {ingredient.name}
                                                                {isLowStock && <span className="text-xs bg-rose-600 text-white px-2 py-0.5 rounded-full font-black animate-pulse shadow-[0_0_10px_rgba(225,29,72,0.4)]">부족</span>}
                                                                {forecasts[ingredient.id]?.daysRemaining !== null && forecasts[ingredient.id].daysRemaining! < 14 && (
                                                                    <span className={cn(
                                                                        "text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1",
                                                                        forecasts[ingredient.id].daysRemaining! < 3 ? "bg-rose-500/20 text-rose-500" : "bg-amber-500/20 text-amber-500"
                                                                    )}>
                                                                        <Clock className="h-3 w-3" />
                                                                        {Math.floor(forecasts[ingredient.id].daysRemaining!)}일 후 고갈
                                                                    </span>
                                                                )}
                                                            </CardTitle>
                                                            <CardDescription className="text-xs mt-1">
                                                                구매: {Number(ingredient.purchase_price).toLocaleString()}원 / {ingredient.purchase_unit}
                                                            </CardDescription>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-primary hover:bg-primary/10"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setAdjustmentId(ingredient.id)
                                                                }}
                                                                title="재고 조정"
                                                            >
                                                                <History className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setDeleteItem({ id: ingredient.id, name: ingredient.name })
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-4 text-sm space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-300 font-bold">현재 재고</span>
                                                        <span className={cn("font-black text-base", isLowStock ? "text-rose-400" : "text-white")}>
                                                            {ingredient.current_stock?.toLocaleString()} {ingredient.purchase_unit}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-300 font-bold text-xs uppercase tracking-widest">환산 비율</span>
                                                        <span className="font-black text-xs text-slate-300 italic">1 : {ingredient.conversion_factor} ({ingredient.usage_unit})</span>
                                                    </div>
                                                    <div className="border-t border-slate-800 pt-2 mt-2 flex justify-between items-center">
                                                        <span className="font-black text-xs text-indigo-400 uppercase tracking-widest bg-slate-800 px-2 py-0.5 rounded outline outline-1 outline-slate-700">실질 단가 ({ingredient.usage_unit})</span>
                                                        <span className="text-lg font-black text-primary italic">
                                                            {(((ingredient.purchase_price || 0) / (ingredient.conversion_factor || 1)) / (1 - (ingredient.loss_rate || 0))).toLocaleString(undefined, { maximumFractionDigits: 2 })}원
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-white/10 overflow-hidden bg-card text-card-foreground shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-800 text-slate-300 font-black border-b border-slate-700">
                                            <tr>
                                                <th className="p-4 pl-6 uppercase tracking-widest text-xs">재료명</th>
                                                <th className="p-4 text-right uppercase tracking-widest text-xs">구매가 (단위)</th>
                                                <th className="p-4 text-right uppercase tracking-widest text-xs">현재 재고</th>
                                                <th className="p-4 text-center uppercase tracking-widest text-xs">환산비</th>
                                                <th className="p-4 text-right font-black text-primary uppercase tracking-widest text-xs">실질단가 ({ingredients[0]?.usage_unit || "단위"})</th>
                                                <th className="p-4 text-center w-[80px] uppercase tracking-widest text-xs">관리</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {ingredients.map((ingredient) => {
                                                const isLowStock = (ingredient.current_stock || 0) <= (ingredient.safety_stock || 0)
                                                return (
                                                    <tr
                                                        key={ingredient.id}
                                                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                                                        onClick={() => setEditingId(ingredient.id)}
                                                    >
                                                        <td className="p-4 pl-6 font-medium">
                                                            <div className="flex items-center gap-2">
                                                                {ingredient.name}
                                                                {isLowStock && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="재고 부족" />}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            {Number(ingredient.purchase_price).toLocaleString()}원
                                                            <span className="text-xs text-muted-foreground ml-1">/ {ingredient.purchase_unit}</span>
                                                        </td>
                                                        <td className={cn("p-4 text-right font-medium", isLowStock ? "text-red-500" : "")}>
                                                            {ingredient.current_stock?.toLocaleString()} {ingredient.purchase_unit}
                                                        </td>
                                                        <td className="p-4 text-center text-muted-foreground">
                                                            1 : {ingredient.conversion_factor}
                                                        </td>
                                                        <td className="p-4 text-right font-bold text-primary">
                                                            {(((ingredient.purchase_price || 0) / (ingredient.conversion_factor || 1)) / (1 - (ingredient.loss_rate || 0))).toLocaleString(undefined, { maximumFractionDigits: 2 })}원
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-primary hover:bg-primary/10"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setAdjustmentId(ingredient.id)
                                                                    }}
                                                                >
                                                                    <History className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setDeleteItem({ id: ingredient.id, name: ingredient.name })
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}

                        {/* Stock History View */}
                        <div className="pt-8">
                            <StockHistory logs={stockLogs} />
                        </div>
                    </>
                )}

                <Dialog
                    isOpen={isAddOpen || !!editingId}
                    onClose={() => { setIsAddOpen(false); setEditingId(null); }}
                    title={editingId ? "재료 수정" : "새 재료 등록"}
                    description={editingId ? "재료 정보 및 재고수량을 수정합니다." : "재료의 구매 정보와 사용 단위를 입력해주세요."}
                >
                    <IngredientForm
                        initialData={editingItem}
                        onSubmit={handleSubmit}
                        onCancel={() => { setIsAddOpen(false); setEditingId(null); }}
                    />
                </Dialog>

                {adjustmentId && (
                    <StockAdjustmentDialog
                        isOpen={!!adjustmentId}
                        onClose={() => setAdjustmentId(null)}
                        ingredient={ingredients.find(i => i.id === adjustmentId)!}
                        onAdjust={handleAdjust}
                    />
                )}

                <ConfirmDialog
                    isOpen={!!deleteItem}
                    onClose={() => setDeleteItem(null)}
                    onConfirm={confirmDelete}
                    title="재료 삭제"
                    description={`정말 "${deleteItem?.name}" 재료를 삭제하시겠습니까? 이 재료를 사용하는 모든 레시피의 원가 계산에 영향을 줄 수 있습니다.`}
                    confirmText="삭제"
                />
            </div>
        </AppLayout>
    )
}
