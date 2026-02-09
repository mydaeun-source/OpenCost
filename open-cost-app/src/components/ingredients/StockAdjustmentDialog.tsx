"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Dialog } from "@/components/ui/Dialog"
import { ShoppingCart, Trash2, Edit3, Save, X, History } from "lucide-react"
import { cn } from "@/lib/utils"

interface StockAdjustmentDialogProps {
    isOpen: boolean
    onClose: () => void
    ingredient: {
        id: string
        name: string
        current_stock: number
        purchase_unit: string
    }
    onAdjust: (id: string, currentStock: number, adjustment: number, type: 'purchase' | 'spoilage' | 'correction', reason?: string) => Promise<any>
}

export function StockAdjustmentDialog({ isOpen, onClose, ingredient, onAdjust }: StockAdjustmentDialogProps) {
    const [amount, setAmount] = useState<number>(0)
    const [type, setType] = useState<'purchase' | 'spoilage' | 'correction'>('purchase')
    const [reason, setReason] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        if (amount === 0) return alert("변동 수량을 입력해주세요.")

        try {
            setLoading(true)
            // Purchase/Correction can be positive, Spoilage usually negative (but we can normalize based on type)
            let adjustment = amount
            if (type === 'spoilage' && adjustment > 0) {
                adjustment = -adjustment
            }

            await onAdjust(ingredient.id, ingredient.current_stock, adjustment, type, reason)
            setAmount(0)
            setReason("")
            onClose()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={`${ingredient.name} 재고 조정`}
            description="재료의 구매(입고), 폐기 또는 재고 조사를 통한 수량 보정 내역을 기록합니다."
        >
            <div className="space-y-6 pt-4">
                {/* Type Selection */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => { setType('purchase'); if (amount < 0) setAmount(Math.abs(amount)); }}
                        className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                            type === 'purchase' ? "bg-primary/10 border-primary text-primary" : "border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10"
                        )}
                    >
                        <ShoppingCart className="h-5 w-5" />
                        <span className="text-xs font-medium">구매 (입고)</span>
                    </button>
                    <button
                        onClick={() => { setType('spoilage'); if (amount > 0) setAmount(-amount); }}
                        className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                            type === 'spoilage' ? "bg-red-500/10 border-red-500 text-red-500" : "border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10"
                        )}
                    >
                        <Trash2 className="h-5 w-5" />
                        <span className="text-xs font-medium">폐기 (손실)</span>
                    </button>
                    <button
                        onClick={() => setType('correction')}
                        className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                            type === 'correction' ? "bg-amber-500/10 border-amber-500 text-amber-500" : "border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10"
                        )}
                    >
                        <Edit3 className="h-5 w-5" />
                        <span className="text-xs font-medium">재고 보정</span>
                    </button>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">변동 수량 ({ingredient.purchase_unit})</label>
                        <span className="text-xs text-muted-foreground">현재고: {ingredient.current_stock.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="0"
                            value={amount || ""}
                            onChange={e => setAmount(Number(e.target.value))}
                            className="text-lg font-bold"
                            autoFocus
                        />
                        <div className="flex flex-col gap-1">
                            <Button variant="outline" size="sm" className="h-7 px-3 text-xs font-black border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700" onClick={() => setAmount(prev => prev + 1)}>+1</Button>
                            <Button variant="outline" size="sm" className="h-7 px-3 text-xs font-black border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700" onClick={() => setAmount(prev => prev - 1)}>-1</Button>
                        </div>
                    </div>
                </div>

                {/* Reason Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">조정 사유 (선택 사항)</label>
                    <Input
                        placeholder="예: 식자재 배송 완료, 유통기한 경과 등"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                    />
                </div>

                <div className="pt-4 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
                    <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                        {loading ? "기록 중..." : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                기록 및 업데이트
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}
