"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Search, Trash2, Save, Calendar, BarChart3, ListChecks, ChevronRight, Plus } from "lucide-react"
import { useRecipes } from "@/hooks/useRecipes"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { createOrder } from "@/lib/api/orders"
import { upsertSalesRecord } from "@/lib/api/sales"
import { cn } from "@/lib/utils"

interface SalesEntryDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function SalesEntryDialog({ isOpen, onClose, onSuccess }: SalesEntryDialogProps) {
    const { recipes, fetchRecipes } = useRecipes()
    const { toast } = useToast()

    // Fetch recipes on mount to enable search
    useEffect(() => {
        fetchRecipes()
    }, [fetchRecipes])

    const [activeTab, setActiveTab] = useState<"revenue" | "menu">("revenue")
    const [salesDate, setSalesDate] = useState(new Date().toISOString().split('T')[0])
    const [loading, setLoading] = useState(false)

    // Revenue Mode State
    const [revenue, setRevenue] = useState<number>(0)
    const [memo, setMemo] = useState("")

    // Menu Mode State
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedItems, setSelectedItems] = useState<{ recipeId: string, name: string, quantity: number, price: number }[]>([])

    const filteredRecipes = recipes.filter(r =>
        r.type === 'menu' &&
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5)

    const addItem = (recipe: any) => {
        if (selectedItems.find(i => i.recipeId === recipe.id)) return
        setSelectedItems([...selectedItems, {
            recipeId: recipe.id,
            name: recipe.name,
            quantity: 1,
            price: Number(recipe.selling_price) || 0
        }])
        setSearchQuery("")
    }

    const removeItem = (id: string) => {
        setSelectedItems(selectedItems.filter(i => i.recipeId !== id))
    }

    const updateItemQty = (id: string, qty: number) => {
        setSelectedItems(selectedItems.map(i => i.recipeId === id ? { ...i, quantity: qty } : i))
    }

    const handleRevenueSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("로그인이 필요합니다.")

            await upsertSalesRecord({
                user_id: user.id,
                sales_date: salesDate,
                daily_revenue: revenue,
                memo: memo || "Manual Revenue Entry"
            })

            toast({ title: "매출 기록 완료", description: "일일 매출 합계가 수동으로 업데이트되었습니다." })
            onSuccess()
            onClose()
        } catch (error: any) {
            toast({ title: "저장 실패", description: error.message, type: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleMenuSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (selectedItems.length === 0) return toast({ title: "품목 없음", description: "최소 하나 이상의 메뉴를 추가해주세요.", type: "destructive" })

        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("로그인이 필요합니다.")

            const totalAmount = selectedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)

            await createOrder(
                {
                    user_id: user.id,
                    total_amount: totalAmount,
                    payment_method: 'cash',
                    status: 'completed'
                },
                selectedItems.map(i => ({ menuId: i.recipeId, quantity: i.quantity, price: i.price })),
                salesDate
            )

            toast({ title: "매출 등록 완료", description: "메뉴 판매 내역이 기록되고 재고가 차감되었습니다." })
            onSuccess()
            onClose()
        } catch (error: any) {
            toast({ title: "저장 실패", description: error.message, type: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="매출 직접 등록"
            description="POS 연동 없이 매출을 수동으로 입력하거나 보정할 수 있습니다."
        >
            <div className="py-2 space-y-5">
                <div className="flex items-center gap-3 bg-indigo-50/50 dark:bg-slate-800 p-4 rounded-2xl border-2 border-indigo-100 dark:border-slate-700">
                    <Calendar className="h-6 w-6 text-indigo-500" />
                    <div className="flex-1">
                        <label className="text-xs font-black text-indigo-400 uppercase block tracking-widest mb-1.5">매출 발생 일자</label>
                        <Input
                            type="date"
                            className="bg-transparent border-none shadow-none focus-visible:ring-0 p-0 h-auto font-black text-xl text-slate-900 dark:text-slate-100"
                            value={salesDate}
                            onChange={e => setSalesDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                        className={cn(
                            "flex-1 flex items-center justify-center py-2.5 text-xs font-black rounded-lg transition-all",
                            activeTab === 'revenue' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-600" : "text-slate-500 hover:text-slate-700"
                        )}
                        onClick={() => setActiveTab('revenue')}
                    >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        일일 합계 입력
                    </button>
                    <button
                        className={cn(
                            "flex-1 flex items-center justify-center py-2.5 text-xs font-black rounded-lg transition-all",
                            activeTab === 'menu' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-600" : "text-slate-500 hover:text-slate-700"
                        )}
                        onClick={() => setActiveTab('menu')}
                    >
                        <ListChecks className="h-4 w-4 mr-2" />
                        메뉴별 상세 입력
                    </button>
                </div>

                {activeTab === 'revenue' ? (
                    <form onSubmit={handleRevenueSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="space-y-2">
                            <label className="text-sm font-black text-slate-700 dark:text-slate-200">일일 총 매출액 (수익)</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="0"
                                    className="text-right pr-12 h-16 text-3xl font-black rounded-2xl border-slate-300 dark:border-slate-600"
                                    value={revenue}
                                    onChange={e => setRevenue(Number(e.target.value))}
                                />
                                <span className="absolute right-4 top-5 text-slate-400 font-black text-xl">원</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black text-slate-700 dark:text-slate-200">메모 (특이사항)</label>
                            <Input
                                placeholder="예: 비 오는 날, 저녁 단체 예약 등"
                                className="border-slate-300 dark:border-slate-600 rounded-xl h-12"
                                value={memo}
                                onChange={e => setMemo(e.target.value)}
                            />
                        </div>
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 rounded-2xl text-lg font-black shadow-lg shadow-indigo-100 dark:shadow-none" disabled={loading}>
                            <Save className="mr-2 h-5 w-5" />
                            {loading ? "저장 중..." : "합계 저장 및 기록"}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleMenuSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="relative">
                            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                            <Input
                                placeholder="판매된 메뉴 이름을 입력하세요..."
                                className="pl-12 h-12 border-slate-300 dark:border-slate-600 rounded-xl focus-visible:ring-indigo-500"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <div className="absolute left-0 right-0 top-14 z-50 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-slate-700 rounded-2xl shadow-2xl max-h-56 overflow-y-auto">
                                    {filteredRecipes.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-sm italic">검색 결과가 없습니다.</div>
                                    ) : (
                                        filteredRecipes.map(r => (
                                            <div
                                                key={r.id}
                                                className="p-4 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center border-b border-slate-50 dark:border-slate-700 last:border-0"
                                                onClick={() => addItem(r)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                                        <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-black block text-slate-900 dark:text-slate-100">{r.name}</span>
                                                        <span className="text-xs text-slate-200 font-black uppercase bg-slate-800 px-1.5 py-0.5 rounded">
                                                            {Number(r.selling_price).toLocaleString()}원
                                                        </span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-300" />
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="max-h-64 overflow-y-auto border-2 border-slate-100 dark:border-slate-700 rounded-2xl divide-y dark:divide-slate-700 bg-white dark:bg-slate-900 shadow-inner">
                            {selectedItems.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 italic text-sm space-y-4">
                                    <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
                                        <ListChecks className="h-8 w-8 opacity-20" />
                                    </div>
                                    <p>판매된 메뉴를 추가해주세요.<br />각 메뉴별 레시피에 따라 재료 재고가 차감됩니다.</p>
                                </div>
                            ) : (
                                selectedItems.map(item => (
                                    <div key={item.recipeId} className="p-4 flex items-center justify-between gap-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black truncate text-slate-900 dark:text-slate-100">{item.name}</p>
                                            <p className="text-xs text-slate-200 font-black">{item.price.toLocaleString()}원</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center">
                                                <Input
                                                    type="number"
                                                    className="w-16 h-10 text-center font-black rounded-lg border-slate-200 dark:border-slate-700"
                                                    value={item.quantity}
                                                    onChange={e => updateItemQty(item.recipeId, Number(e.target.value))}
                                                    min="1"
                                                />
                                                <span className="ml-2 text-sm font-black text-slate-200 uppercase tracking-widest">개</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={() => removeItem(item.recipeId)}
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-5 bg-indigo-600 dark:bg-indigo-700 rounded-2xl flex justify-between items-center shadow-lg shadow-indigo-200 dark:shadow-none">
                            <span className="text-sm font-black text-indigo-100">총 예상 매출</span>
                            <span className="text-3xl font-black text-white">
                                {selectedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}원
                            </span>
                        </div>

                        <Button className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 h-16 rounded-2xl text-lg font-black shadow-xl" disabled={loading}>
                            <Save className="mr-3 h-6 w-6" />
                            {loading ? "기록 중..." : "판매 수량 및 재고 일괄 반영"}
                        </Button>
                    </form>
                )}
            </div>
        </Dialog>
    )
}
