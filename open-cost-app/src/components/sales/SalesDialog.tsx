"use client"

import { useState, useEffect } from "react"
import { Dialog } from "@/components/ui/Dialog" // Single export
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { SalesInsert, upsertSalesRecord, deleteSalesRecord } from "@/lib/api/sales"
import { Loader2, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useStore } from "@/contexts/StoreContext"

interface SalesDialogProps {
    isOpen: boolean
    onClose: () => void
    date: Date | null
    initialAmount?: number
    initialMemo?: string
    recordId?: string
    onSaved: () => void
}

export function SalesDialog({ isOpen, onClose, date, initialAmount = 0, initialMemo = "", recordId, onSaved }: SalesDialogProps) {
    const { activeStore } = useStore()
    const [amount, setAmount] = useState("")
    const [memo, setMemo] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setAmount(initialAmount ? initialAmount.toString() : "")
            setMemo(initialMemo || "")
        }
    }, [isOpen, initialAmount, initialMemo])

    if (!date) return null

    const handleSave = async () => {
        if (!amount && !recordId) return
        if (!activeStore) {
            alert("선택된 매장이 없습니다.")
            return
        }

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                alert("로그인이 필요합니다.")
                return
            }

            const payload: SalesInsert = {
                user_id: user.id,
                store_id: activeStore.id, // Added store_id
                sales_date: format(date, "yyyy-MM-dd"),
                daily_revenue: Number(amount) || 0,
                memo: memo,
                updated_at: new Date().toISOString()
            }
            if (recordId) payload.id = recordId

            // Cast payload to satisfy the intersection type requirement in upsertSalesRecord
            await upsertSalesRecord(payload as SalesInsert & { store_id: string })
            onSaved()
            onClose()
        } catch (e) {
            console.error(e)
            alert("저장 실패")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!recordId) return
        if (!confirm("정말 삭제하시겠습니까?")) return

        setLoading(true)
        try {
            await deleteSalesRecord(recordId)
            onSaved()
            onClose()
        } catch (e) {
            console.error(e)
            alert("삭제 실패")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={`${format(date, "yyyy년 M월 d일 (E)", { locale: ko })} 매출 입력`}
            description="해당 일자의 매출액과 메모를 입력해주세요."
        >
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">일 매출액 (원)</label>
                    <Input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">메모</label>
                    <Input
                        placeholder="예: 비 옴, 단체 예약 등"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                    />
                </div>

                <div className="flex justify-between mt-4">
                    {recordId ? (
                        <Button variant="destructive" size="icon" onClick={handleDelete} disabled={loading}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    ) : (
                        <div></div>
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={loading}>취소</Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            저장
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    )
}
