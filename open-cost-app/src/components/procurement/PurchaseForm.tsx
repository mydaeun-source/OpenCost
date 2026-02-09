"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Plus, Trash2, Search, Save, X, ShoppingCart, ChevronRight } from "lucide-react"
import { useIngredients } from "@/hooks/useIngredients"
import { cn } from "@/lib/utils"

import { createPurchase } from "@/lib/api/procurement"
import { useToast } from "@/hooks/use-toast"

interface PurchaseFormProps {
    onSuccess?: () => void
    onCancel: () => void
}

export function PurchaseForm({ onSuccess, onCancel }: PurchaseFormProps) {
    const { ingredients } = useIngredients()
    const { toast } = useToast()
    const [supplierName, setSupplierName] = useState("")
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
    const [selectedItems, setSelectedItems] = useState<{ ingredientId: string, quantity: number, price: number }[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(false)
    const [keepOpen, setKeepOpen] = useState(false)

    const searchInputRef = useRef<HTMLInputElement>(null)
    const [activeIndex, setActiveIndex] = useState(-1)

    const addItem = (ing: any) => {
        if (selectedItems.find(item => item.ingredientId === ing.id)) return
        setSelectedItems(prev => [...prev, {
            ingredientId: ing.id,
            quantity: 1,
            price: Number(ing.purchase_price) || 0
        }])
        setSearchQuery("")
        setActiveIndex(-1)
        setTimeout(() => searchInputRef.current?.focus(), 0)
    }

    const filteredIngredients = ingredients.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8)

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            setActiveIndex(prev => Math.min(prev + 1, filteredIngredients.length - 1))
            e.preventDefault()
        } else if (e.key === "ArrowUp") {
            setActiveIndex(prev => Math.max(prev - 1, -1))
            e.preventDefault()
        } else if (e.key === "Enter" && activeIndex >= 0) {
            addItem(filteredIngredients[activeIndex])
            e.preventDefault()
        }
    }

    const removeItem = (id: string) => {
        setSelectedItems(prev => prev.filter(item => item.ingredientId !== id))
    }

    const updateItem = (id: string, field: 'quantity' | 'price', value: number) => {
        setSelectedItems(prev => prev.map(item =>
            item.ingredientId === id ? { ...item, [field]: value } : item
        ))
    }

    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (selectedItems.length === 0) {
            toast({ title: "품목 누락", description: "최소 하나 이상의 품목을 추가해주세요.", type: "destructive" })
            return
        }

        try {
            setLoading(true)
            await createPurchase({ supplier_name: supplierName, purchase_date: purchaseDate }, selectedItems)

            toast({ title: "매입 등록 완료", description: "재고 및 지출에 즉시 반영되었습니다.", type: "success" })

            if (keepOpen) {
                // Reset items but keep supplier/date for continuous entry
                setSelectedItems([])
                setSearchQuery("")
                setTimeout(() => searchInputRef.current?.focus(), 100)
            } else {
                onSuccess?.()
            }
        } catch (err: any) {
            console.error(err)
            toast({ title: "등록 실패", description: err.message || "매입 내역 저장 중 오류가 발생했습니다.", type: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">공급처 (Supplier)</label>
                    <Input
                        placeholder="예: 마트, 도매시장, 식자재몰 등"
                        value={supplierName}
                        onChange={e => setSupplierName(e.target.value)}
                        required
                        className="border-slate-300 dark:border-slate-600 rounded-2xl h-12 text-lg font-bold"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">매입 일자</label>
                    <Input
                        type="date"
                        value={purchaseDate}
                        onChange={e => setPurchaseDate(e.target.value)}
                        required
                        className="border-slate-300 dark:border-slate-600 rounded-2xl h-12 text-lg font-bold"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest">Purchase Line Items</h3>
                    <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{selectedItems.length} 품목</div>
                </div>

                <div className="border-2 border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-xl transition-all focus-within:ring-4 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/20">
                    <div className="p-4 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="relative">
                            <Search className="absolute left-4 top-3.5 h-6 w-6 text-slate-500" />
                            <Input
                                ref={searchInputRef}
                                placeholder="재료 이름을 입력하여 검색하세요 (Enter로 추가)..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setActiveIndex(-1); }}
                                onKeyDown={handleKeyDown}
                                className="pl-12 h-14 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus-visible:ring-indigo-500 rounded-2xl text-lg font-bold shadow-inner"
                            />
                            {searchQuery && (
                                <div className="absolute left-0 right-0 top-16 z-[100] bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-slate-700 rounded-2xl shadow-2xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                    {filteredIngredients.length === 0 ? (
                                        <div className="p-10 text-base font-black text-slate-200 text-center italic">검색 결과가 없습니다.</div>
                                    ) : (
                                        filteredIngredients.map((ing, idx) => (
                                            <div
                                                key={ing.id}
                                                className={cn(
                                                    "p-4 cursor-pointer flex justify-between items-center transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0",
                                                    activeIndex === idx ? "bg-indigo-50 dark:bg-indigo-900/50" : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                                )}
                                                onClick={() => addItem(ing)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                                        <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <span className="text-base font-black block text-slate-900 dark:text-slate-100">{ing.name}</span>
                                                        <span className="text-xs text-slate-200 font-black tracking-wider uppercase bg-slate-800 px-1.5 py-0.5 rounded">최근 매입가: {Number(ing.purchase_price).toLocaleString()}원</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-1 rounded-lg font-black uppercase">{ing.purchase_unit}</div>
                                                    <ChevronRight className="h-5 w-5 text-slate-300" />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-inner">
                        {selectedItems.length === 0 ? (
                            <div className="p-16 text-center text-slate-400 italic text-sm space-y-4">
                                <div className="h-20 w-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
                                    <ShoppingCart className="h-10 w-10 opacity-20" />
                                </div>
                                <p>품목을 검색하여 추가해주세요.<br />구매한 재료의 수량과 단가를 입력하세요.</p>
                            </div>
                        ) : (
                            selectedItems.map(item => {
                                const ing = ingredients.find(i => i.id === item.ingredientId)
                                return (
                                    <div key={item.ingredientId} className="p-4 flex flex-wrap md:flex-nowrap items-center gap-5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex-1 min-w-[150px]">
                                            <p className="text-base font-black truncate text-slate-900 dark:text-slate-100">{ing?.name}</p>
                                            <p className="text-xs text-indigo-400 font-black uppercase tracking-widest">{ing?.purchase_unit} 단위</p>
                                        </div>
                                        <div className="w-24">
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 block uppercase">수량</label>
                                            <Input
                                                type="number"
                                                className="h-10 text-base font-black border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                                                value={item.quantity}
                                                onChange={e => updateItem(item.ingredientId, 'quantity', Number(e.target.value))}
                                                min="0.01"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 block uppercase">매입 단가 (원)</label>
                                            <Input
                                                type="number"
                                                className="h-10 text-base font-black border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                                                value={item.price}
                                                onChange={e => updateItem(item.ingredientId, 'price', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="w-28 text-right">
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 block uppercase">합계</label>
                                            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{(item.quantity * item.price).toLocaleString()}원</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            onClick={() => removeItem(item.ingredientId)}
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-indigo-600 dark:bg-indigo-700 rounded-3xl shadow-xl shadow-indigo-100 dark:shadow-none">
                <span className="font-black text-indigo-100 uppercase tracking-widest text-xs">Final Purchase Total</span>
                <span className="text-3xl font-black text-white">{totalAmount.toLocaleString()}원</span>
            </div>

            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3 px-2">
                    <input
                        type="checkbox"
                        id="keepOpen"
                        checked={keepOpen}
                        onChange={e => setKeepOpen(e.target.checked)}
                        className="h-5 w-5 rounded-lg border-2 border-slate-300 text-indigo-600 focus:ring-indigo-600 transition-all cursor-pointer"
                    />
                    <label htmlFor="keepOpen" className="text-sm font-black text-slate-200 cursor-pointer select-none">
                        저장 후 창을 닫지 않고 계속 다른 영수증 입력 (연속 입력 모드)
                    </label>
                </div>

                <div className="flex gap-4">
                    <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black text-lg border-2 hover:bg-slate-50" onClick={onCancel} type="button">취소</Button>
                    <Button className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white h-14 rounded-2xl text-lg font-black shadow-xl" disabled={loading} type="submit">
                        <Save className="mr-2 h-6 w-6" />
                        {loading ? "기록 중..." : "매입 완료 및 재고 반영"}
                    </Button>
                </div>
            </div>
        </form>
    )
}
