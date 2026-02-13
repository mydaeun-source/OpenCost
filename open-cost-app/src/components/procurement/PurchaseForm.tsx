"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { NumericInput } from "@/components/ui/NumericInput"
import { Card, CardContent } from "@/components/ui/Card"
import { Search, Save, Camera, Loader2, Filter, ShoppingCart, User, Calendar } from "lucide-react"
import { useIngredients } from "@/hooks/useIngredients"
import { cn, formatNumber } from "@/lib/utils"
import { createPurchase, getSuppliers } from "@/lib/api/procurement"
import { useToast } from "@/hooks/use-toast"
import { processReceiptImage } from "@/lib/ocr-service"
import { useStore } from "@/contexts/StoreContext"

interface PurchaseFormProps {
    onSuccess?: () => void
    onCancel: () => void
}

type DraftItem = { quantity: number; price: number }

export function PurchaseForm({ onSuccess, onCancel }: PurchaseFormProps) {
    const { activeStore } = useStore()
    const { ingredients } = useIngredients()
    const { toast } = useToast()

    // Form State
    const [supplierName, setSupplierName] = useState("")
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
    const [draftItems, setDraftItems] = useState<Record<string, DraftItem>>({})
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(false)
    const [keepOpen, setKeepOpen] = useState(false)
    const [onlySelected, setOnlySelected] = useState(false)

    // Supplier Search State
    const [suppliers, setSuppliers] = useState<string[]>([])
    const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [ocrLoading, setOcrLoading] = useState(false)

    // Fetch Suppliers
    useEffect(() => {
        const fetchSuppliers = async () => {
            if (!activeStore?.id) return
            try {
                const data = await getSuppliers(activeStore.id)
                setSuppliers(data)
            } catch (err) {
                console.error("Failed to fetch suppliers:", err)
            }
        }
        fetchSuppliers()
    }, [activeStore?.id])

    const filteredSuppliers = useMemo(() =>
        suppliers.filter(s => s.toLowerCase().includes(supplierName.toLowerCase())).slice(0, 5),
        [suppliers, supplierName])

    // Filter Ingredients
    const filteredIngredients = useMemo(() => {
        let items = ingredients.filter(i => {
            // Exclude 'prep' (semi-finished) items
            if ((i.category as any)?.type === 'prep') return false

            return i.name.toLowerCase().includes(searchQuery.toLowerCase())
        })
        if (onlySelected) {
            items = items.filter(i => draftItems[i.id]?.quantity > 0)
        }
        return items
    }, [ingredients, searchQuery, onlySelected, draftItems])

    // Handlers
    const updateDraft = (id: string, field: keyof DraftItem, value: number) => {
        setDraftItems(prev => {
            const current = prev[id] || {
                quantity: 0,
                price: Number(ingredients.find(i => i.id === id)?.purchase_price) || 0
            }
            const updated = { ...current, [field]: value }

            // If both 0, remove from draft to keep clean? 
            // Better to keep it if user interacted, but remove if quantity is 0 for submission logic
            return { ...prev, [id]: updated }
        })
    }

    const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setOcrLoading(true)
            const result = await processReceiptImage(file)

            if (result.supplierName) setSupplierName(result.supplierName)
            if (result.purchaseDate) setPurchaseDate(result.purchaseDate)

            // Dynamic Ingredient Matching
            if (result.potentialItems.length > 0) {
                const newDraft = { ...draftItems }
                let matchCount = 0

                result.potentialItems.forEach(pItem => {
                    const match = ingredients.find(ing =>
                        ing.name.toLowerCase().includes(pItem.name.toLowerCase()) ||
                        pItem.name.toLowerCase().includes(ing.name.toLowerCase())
                    )

                    if (match) {
                        newDraft[match.id] = {
                            quantity: pItem.quantity,
                            price: pItem.price
                        }
                        matchCount++
                    }
                })

                setDraftItems(newDraft)
                setOnlySelected(true) // Switch to view selected to show results
                toast({
                    title: "영수증 인식 완료",
                    description: `${matchCount}개의 품목이 매칭되었습니다.`,
                    type: "success"
                })
            } else {
                toast({ title: "영수증 인식 완료", description: "날짜와 공급처가 입력되었습니다." })
            }
        } catch (err) {
            console.error("OCR Error:", err)
            toast({ title: "인식 실패", description: "영수증을 읽을 수 없습니다.", type: "destructive" })
        } finally {
            setOcrLoading(false)
        }
    }

    const totalAmount = useMemo(() => {
        return Object.values(draftItems).reduce((sum, item) => sum + (item.quantity * item.price), 0)
    }, [draftItems])

    const totalItems = useMemo(() => {
        return Object.values(draftItems).filter(i => i.quantity > 0).length
    }, [draftItems])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const itemsToSubmit = Object.entries(draftItems)
            .filter(([_, data]) => data.quantity > 0)
            .map(([id, data]) => ({
                ingredientId: id,
                quantity: data.quantity,
                price: data.price
            }))

        if (itemsToSubmit.length === 0) {
            toast({ title: "품목 누락", description: "수량이 입력된 품목이 없습니다.", type: "destructive" })
            return
        }

        if (!activeStore?.id) {
            toast({ title: "오류", description: "선택된 매장이 없습니다.", type: "destructive" })
            return
        }

        try {
            setLoading(true)
            await createPurchase(
                { supplier_name: supplierName, purchase_date: purchaseDate },
                itemsToSubmit,
                activeStore.id
            )

            toast({ title: "매입 등록 완료", description: `${itemsToSubmit.length}개 품목이 입고되었습니다.`, type: "success" })

            if (keepOpen) {
                setDraftItems({})
                setSearchQuery("")
                setOnlySelected(false)
            } else {
                onSuccess?.()
            }
        } catch (err: any) {
            console.error(err)
            toast({ title: "등록 실패", description: err.message, type: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-[80vh] max-h-[800px]">
            {/* Header Section */}
            <div className="flex-none space-y-4 pb-4 border-b border-border">
                {/* Receipt OCR Button */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <ShoppingCart className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-foreground uppercase tracking-tight">매입 일괄 등록</h2>
                            <p className="text-[10px] text-muted-foreground font-bold">여러 품목을 한 번에 입력하세요</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-2 border-dashed border-amber-500/50 text-amber-600 hover:bg-amber-50"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={ocrLoading}
                    >
                        {ocrLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                        <span className="text-xs font-bold">영수증 스캔</span>
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleReceiptScan} />
                </div>

                {/* Info Inputs */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 relative">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">공급처</label>
                        <div className="relative">
                            <Input
                                placeholder="공급처 입력..."
                                value={supplierName}
                                onChange={e => {
                                    setSupplierName(e.target.value)
                                    setShowSupplierSuggestions(true)
                                }}
                                onFocus={() => setShowSupplierSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSupplierSuggestions(false), 200)}
                                className="h-9 font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                            />
                            {showSupplierSuggestions && filteredSuppliers.length > 0 && (
                                <div className="absolute left-0 right-0 top-10 z-50 bg-popover border rounded-md shadow-md">
                                    {filteredSuppliers.map((s, idx) => (
                                        <div key={idx} className="p-2 text-sm cursor-pointer hover:bg-accent" onClick={() => { setSupplierName(s); setShowSupplierSuggestions(false); }}>{s}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">입고일자</label>
                        <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="h-9 font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex gap-2 bg-muted/30 p-1 rounded-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="재료명 검색..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="h-9 pl-9 border-none bg-white dark:bg-slate-950 focus-visible:ring-0 placeholder:text-muted-foreground/50 text-slate-900 dark:text-white font-bold"
                        />
                    </div>
                    <Button
                        type="button"
                        variant={onlySelected ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setOnlySelected(!onlySelected)}
                        className={cn("h-9 gap-2", onlySelected && "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300")}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold">선택됨 ({totalItems})</span>
                    </Button>
                </div>
            </div>

            {/* Table Section (Scrollable) */}
            <div className="flex-1 overflow-auto -mx-1 px-1 mt-2">
                <div className="border rounded-md overflow-hidden bg-background shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0 z-10 text-[10px] uppercase font-black text-muted-foreground">
                            <tr>
                                <th className="p-3 text-left w-[35%]">재료명 / 현재고</th>
                                <th className="p-3 text-center w-[20%]">입고 수량</th>
                                <th className="p-3 text-center w-[25%]">입고 단가</th>
                                <th className="p-3 text-right w-[20%]">합계</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredIngredients.map(ing => {
                                const draft = draftItems[ing.id]
                                const qty = draft?.quantity || 0
                                const price = draft?.price ?? ing.purchase_price ?? 0
                                const isActive = qty > 0

                                return (
                                    <tr key={ing.id} className={cn(
                                        "group transition-colors hover:bg-muted/30",
                                        isActive ? "bg-indigo-50/50 dark:bg-indigo-900/10" : ""
                                    )}>
                                        <td className="p-3">
                                            <div className="font-bold text-foreground">{ing.name}</div>
                                            <div className="text-[10px] text-muted-foreground flex gap-1 items-center">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded-sm bg-muted",
                                                    (ing.current_stock || 0) <= (ing.safety_stock || 0) ? "text-rose-500 bg-rose-50" : ""
                                                )}>
                                                    재고: {formatNumber(ing.current_stock)} {ing.purchase_unit}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-2">
                                            <div className="relative">
                                                <NumericInput
                                                    className={cn(
                                                        "h-9 text-center font-bold transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white",
                                                        isActive ? "border-indigo-500 ring-1 ring-indigo-500/20" : "border-border opacity-70 group-hover:opacity-100"
                                                    )}
                                                    placeholder="0"
                                                    value={qty}
                                                    onChange={val => updateDraft(ing.id, 'quantity', val)}
                                                />
                                                <span className="absolute right-2 top-2.5 text-[10px] text-muted-foreground pointer-events-none">{ing.purchase_unit}</span>
                                            </div>
                                        </td>
                                        <td className="p-2">
                                            <div className="relative">
                                                <NumericInput
                                                    className="h-9 text-right pr-6 font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:text-slate-900 dark:focus:text-white"
                                                    placeholder="0"
                                                    value={price}
                                                    onChange={val => updateDraft(ing.id, 'price', val)}
                                                />
                                                <span className="absolute right-2 top-2.5 text-[10px] text-muted-foreground pointer-events-none">원</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className={cn("font-bold", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground/30")}>
                                                {formatNumber(qty * price)}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {filteredIngredients.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground text-sm italic">
                            {onlySelected ? "선택된 재료가 없습니다." : "검색 결과가 없습니다."}
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="flex-none pt-4 border-t border-border bg-background z-20 mt-auto">
                <div className="flex items-center justify-between mb-4 px-1">
                    <div className="text-xs font-medium text-muted-foreground">
                        총 <span className="font-bold text-foreground">{totalItems}</span>개 품목 선택됨
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estimate Total</div>
                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                            {formatNumber(totalAmount)}<span className="text-sm text-foreground ml-1">원</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1">취소</Button>
                    <Button type="submit" className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold" disabled={loading || totalItems === 0}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {totalItems}개 품목 매입 확정
                    </Button>
                </div>
            </div>
        </form>
    )
}
