"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { NumericInput } from "@/components/ui/NumericInput"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card"
import { Plus, Trash2, Search, Save, X, ShoppingCart, ChevronRight, User, Calendar, PlusCircle, Camera, Loader2 } from "lucide-react"
import { useIngredients } from "@/hooks/useIngredients"
import { cn } from "@/lib/utils"

import { createPurchase, getSuppliers } from "@/lib/api/procurement"
import { useToast } from "@/hooks/use-toast"
import { processReceiptImage } from "@/lib/ocr-service"
import { formatNumber } from "@/lib/utils"

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

    const [suppliers, setSuppliers] = useState<string[]>([])
    const [supplierSearchQuery, setSupplierSearchQuery] = useState("")
    const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [activeIndex, setActiveIndex] = useState(-1)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [ocrLoading, setOcrLoading] = useState(false)

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const data = await getSuppliers()
                setSuppliers(data)
            } catch (err) {
                console.error("Failed to fetch suppliers:", err)
            }
        }
        fetchSuppliers()
    }, [])

    const filteredSuppliers = suppliers.filter(s =>
        s.toLowerCase().includes(supplierName.toLowerCase())
    ).slice(0, 5)

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
                const newItems: { ingredientId: string, quantity: number, price: number }[] = []

                result.potentialItems.forEach(pItem => {
                    const match = ingredients.find(ing =>
                        ing.name.toLowerCase().includes(pItem.name.toLowerCase()) ||
                        pItem.name.toLowerCase().includes(ing.name.toLowerCase())
                    )

                    if (match) {
                        // Check if already in selectedItems to avoid duplicates
                        const isDuplicate = selectedItems.some(i => i.ingredientId === match.id)
                        if (!isDuplicate) {
                            newItems.push({
                                ingredientId: match.id,
                                quantity: pItem.quantity,
                                price: pItem.price
                            })
                        }
                    }
                })

                if (newItems.length > 0) {
                    setSelectedItems(prev => [...prev, ...newItems])
                    toast({
                        title: "영수증 품목 인식 성공",
                        description: `${newItems.length}개의 재료가 자동으로 목록에 추가되었습니다.`,
                        type: "success"
                    })
                } else {
                    toast({
                        title: "영수증 정보 추출 완료",
                        description: "매입처와 일자가 입력되었습니다. 품목 매칭 결과는 없습니다.",
                    })
                }
            } else {
                toast({
                    title: "영수증 정보 추출 완료",
                    description: "매입처와 일자가 자동으로 입력되었습니다.",
                })
            }
        } catch (err) {
            console.error("OCR Error:", err)
            toast({
                title: "영수증 인식 실패",
                description: "이미지에서 텍스트를 추출하지 못했습니다.",
                type: "destructive"
            })
        } finally {
            setOcrLoading(false)
        }
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
        <form onSubmit={handleSubmit} className="space-y-6 pt-2 pb-4">
            {/* Receipt Scan Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                        <Camera className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">영수증 자동 등록</h2>
                        <p className="text-[10px] font-bold text-slate-400">OCR 기술로 빠르고 정확하게</p>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg border-2 border-amber-500/30 font-black text-[10px] text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/10 gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={ocrLoading}
                >
                    {ocrLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    {ocrLoading ? "분석 중..." : "영수증 사진 올리기"}
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleReceiptScan}
                />
            </div>

            {/* Header: Supplier & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                        <User className="h-3 w-3" /> 공급처 (Supplier)
                    </label>
                    <div className="relative">
                        <Input
                            placeholder="공급처 입력 또는 선택..."
                            value={supplierName}
                            onChange={e => {
                                setSupplierName(e.target.value)
                                setShowSupplierSuggestions(true)
                            }}
                            onFocus={() => setShowSupplierSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSupplierSuggestions(false), 200)}
                            required
                            className="border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl h-12 text-base font-bold transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                        {showSupplierSuggestions && filteredSuppliers.length > 0 && (
                            <div className="absolute left-0 right-0 top-14 z-[110] bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                                {filteredSuppliers.map((s, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 text-sm font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b last:border-0 border-slate-50 dark:border-slate-700 transition-colors"
                                        onClick={() => {
                                            setSupplierName(s)
                                            setShowSupplierSuggestions(false)
                                        }}
                                    >
                                        {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                        <Calendar className="h-3 w-3" /> 매입 일자
                    </label>
                    <Input
                        type="date"
                        value={purchaseDate}
                        onChange={e => setPurchaseDate(e.target.value)}
                        required
                        className="border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl h-12 text-base font-bold transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                </div>
            </div>

            {/* Main Item Selection Area */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                        <PlusCircle className="h-4 w-4 text-indigo-500" /> 매입 품목 추가
                    </h3>
                    <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-2.5 py-0.5 rounded-full text-[10px] font-black">{selectedItems.length} ITEMS</div>
                </div>

                <div className="border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    {/* Search Bar */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-2.5 h-5 w-5 text-slate-400" />
                            <Input
                                ref={searchInputRef}
                                placeholder="재료 이름을 검색하세요..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setActiveIndex(-1); }}
                                onKeyDown={handleKeyDown}
                                className="pl-11 h-10 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700/50 focus-visible:ring-indigo-500 rounded-lg text-sm font-bold"
                            />
                            {searchQuery && (
                                <div className="absolute left-0 right-0 top-11 z-[100] bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                    {filteredIngredients.length === 0 ? (
                                        <div className="p-8 text-sm font-bold text-slate-400 text-center italic">결과가 없습니다.</div>
                                    ) : (
                                        filteredIngredients.map((ing, idx) => (
                                            <div
                                                key={ing.id}
                                                className={cn(
                                                    "p-3 cursor-pointer flex justify-between items-center transition-all border-b border-slate-50 dark:border-slate-700 last:border-0",
                                                    activeIndex === idx ? "bg-indigo-50 dark:bg-indigo-900/50 pl-5" : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                                )}
                                                onClick={() => addItem(ing)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                                        <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-black block text-slate-900 dark:text-slate-100">{ing.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{ing.purchase_unit} 당 {formatNumber(ing.purchase_price)}원</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-300" />
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Selected List */}
                    <div className="divide-y dark:divide-slate-800 bg-white dark:bg-slate-900 overflow-y-auto max-h-[350px]">
                        {selectedItems.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                                <ShoppingCart className="h-10 w-10 mb-3 opacity-10" />
                                <p className="text-xs font-bold leading-relaxed opacity-60">추가된 품목이 없습니다.<br />위 검색창에서 재료를 찾아 추가하세요.</p>
                            </div>
                        ) : (
                            selectedItems.map(item => {
                                const ing = ingredients.find(i => i.id === item.ingredientId)
                                return (
                                    <div key={item.ingredientId} className="p-3 flex items-center gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black truncate text-slate-900 dark:text-slate-100">{ing?.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-tight">
                                                <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{ing?.purchase_unit}</span> 단위
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="w-20">
                                                <label className="text-[9px] font-black text-slate-400 mb-1 block uppercase text-center">수량</label>
                                                <NumericInput
                                                    className="h-9 px-2 text-center text-sm font-black border-2 border-slate-100 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500/10"
                                                    value={item.quantity}
                                                    onChange={(val: number) => updateItem(item.ingredientId, 'quantity', val)}
                                                />
                                            </div>
                                            <div className="w-32">
                                                <label className="text-[9px] font-black text-slate-400 mb-1 block uppercase text-center">단가 (원)</label>
                                                <NumericInput
                                                    className="h-9 px-2 text-center text-sm font-black border-2 border-slate-100 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500/10"
                                                    value={item.price}
                                                    onChange={(val: number) => updateItem(item.ingredientId, 'price', val)}
                                                />
                                            </div>
                                            <div className="w-24 text-right pr-1">
                                                <label className="text-[9px] font-black text-slate-400 mb-1 block uppercase">합계</label>
                                                <p className="text-sm font-black text-indigo-500">{formatNumber(item.quantity * item.price)}<span className="text-[10px] ml-0.5">원</span></p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={() => removeItem(item.ingredientId)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky-like Footer with Total and Submit */}
            <div className="pt-2 space-y-4">
                <div className="flex items-center justify-between p-4 bg-indigo-600 dark:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none border-b-4 border-indigo-800/30">
                    <span className="font-black text-indigo-100 uppercase tracking-widest text-[10px]">Total Purchase Value</span>
                    <span className="text-3xl font-black text-white italic tracking-tighter">
                        {formatNumber(totalAmount)}<span className="text-lg font-normal ml-1 border-l border-white/20 pl-2">원</span>
                    </span>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2.5 px-2">
                        <input
                            type="checkbox"
                            id="keepOpen"
                            checked={keepOpen}
                            onChange={e => setKeepOpen(e.target.checked)}
                            className="h-4 w-4 rounded border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="keepOpen" className="text-[11px] font-bold text-slate-400 cursor-pointer select-none">
                            저장 후 연속 입력 모드 유지
                        </label>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 h-11 rounded-xl font-black text-sm border-2 border-slate-200 hover:bg-slate-50 transition-all active:scale-95" onClick={onCancel} type="button">취소</Button>
                        <Button className="flex-[2.5] bg-slate-900 border-b-4 border-slate-950 hover:bg-black text-white h-11 rounded-xl text-sm font-black transition-all active:scale-95 flex items-center justify-center gap-2" disabled={loading} type="submit">
                            <Save className="h-4 w-4" />
                            {loading ? "데이터 기록 중..." : "매입 내역 저장 및 재고 반영"}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    )
}
