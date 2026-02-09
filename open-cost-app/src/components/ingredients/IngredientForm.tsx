import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Database } from "@/types/database.types"
import { Info } from "lucide-react"

type IngredientInsert = Database["public"]["Tables"]["ingredients"]["Insert"]
type IngredientRow = Database["public"]["Tables"]["ingredients"]["Row"]

interface IngredientFormProps {
    initialData?: IngredientRow
    onSubmit: (data: IngredientInsert) => Promise<void>
    onCancel: () => void
}

const UNITS = [
    { value: "g", label: "g (그램)" },
    { value: "kg", label: "kg (킬로그램)" },
    { value: "ml", label: "ml (밀리리터)" },
    { value: "l", label: "L (리터)" },
    { value: "ea", label: "ea (개)" },
    { value: "box", label: "box (박스 - 환산 필요)" },
    { value: "can", label: "can (캔 - 환산 필요)" },
]

export function IngredientForm({ initialData, onSubmit, onCancel }: IngredientFormProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<IngredientInsert>>(initialData ? {
        name: initialData.name,
        purchase_price: initialData.purchase_price,
        purchase_unit: initialData.purchase_unit,
        usage_unit: initialData.usage_unit,
        conversion_factor: initialData.conversion_factor,
        loss_rate: initialData.loss_rate,
        category_id: initialData.category_id,
        current_stock: initialData.current_stock || 0,
        safety_stock: initialData.safety_stock || 0,
    } : {
        name: "",
        purchase_price: 0,
        purchase_unit: "kg",
        usage_unit: "g",
        conversion_factor: 1000,
        loss_rate: 0,
        category_id: null,
        current_stock: 0,
        safety_stock: 0,
    })

    // Helper: Format number with commas
    const formatNumber = (val: number | string | undefined | null) => {
        if (val === undefined || val === null || val === "") return ""
        const num = Number(val)
        if (isNaN(num)) return ""
        return num.toLocaleString()
    }

    // Helper: Parse string with commas to number
    const parseNumber = (val: string) => {
        return Number(val.replace(/,/g, "")) || 0
    }

    // Helper: Format loss rate as percentage
    const formatLossRateAsPercent = (val: number | undefined | null) => {
        if (val === undefined || val === null) return ""
        return (val * 100).toString()
    }

    // 자동 환산 로직 (Auto-Calcultor)
    // 구매 단위와 사용 단위가 변경될 때마다 적절한 환산 비율을 제안
    useEffect(() => {
        const { purchase_unit, usage_unit } = formData

        // 단순 무게 변환
        if (purchase_unit === "kg" && usage_unit === "g") {
            setFormData(prev => ({ ...prev, conversion_factor: 1000 }))
        } else if (purchase_unit === "g" && usage_unit === "kg") {
            setFormData(prev => ({ ...prev, conversion_factor: 0.001 }))
        }
        // 단순 부피 변환
        else if (purchase_unit === "l" && usage_unit === "ml") {
            setFormData(prev => ({ ...prev, conversion_factor: 1000 }))
        }
        // 동일 단위
        else if (purchase_unit === usage_unit) {
            setFormData(prev => ({ ...prev, conversion_factor: 1 }))
        }
    }, [formData.purchase_unit, formData.usage_unit])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name || !formData.purchase_price) return

        setLoading(true)
        try {
            await onSubmit(formData as IngredientInsert)
        } finally {
            setLoading(false)
        }
    }

    // 예측 실질 단가 (1 사용단위 당 가격)
    // (구매가 / 변환비율) / (1 - 로스율)
    const estimatedCost = useMemo(() => {
        const price = Number(formData.purchase_price) || 0
        const factor = Number(formData.conversion_factor) || 1
        const loss = Number(formData.loss_rate) || 0

        // 유효성 검사 (0으로 나누기 방지)
        if (factor === 0) return 0
        if (loss >= 1) return 999999999 // 로스율 100% 이상은 불가능

        return (price / factor) / (1 - loss)
    }, [formData.purchase_price, formData.conversion_factor, formData.loss_rate])

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">재료명</label>
                <Input
                    required
                    placeholder="예: 양파, 밀가루"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-black text-white uppercase tracking-widest">구매 가격 (원)</label>
                    <Input
                        required
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatNumber(formData.purchase_price)}
                        onChange={(e) => setFormData({ ...formData, purchase_price: parseNumber(e.target.value) })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-black text-white uppercase tracking-widest">로스율 (%)</label>
                    <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={formatLossRateAsPercent(formData.loss_rate)}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "")
                            setFormData({ ...formData, loss_rate: (Number(val) || 0) / 100 })
                        }}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 px-1 italic">
                        입력값이 1일 경우 1%로 자동 등록됩니다. (0.01로 저장됨)
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">구매 단위</label>
                    <Select
                        value={formData.purchase_unit}
                        onChange={(e) => setFormData({ ...formData, purchase_unit: e.target.value })}
                    >
                        {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">사용 단위 (레시피용)</label>
                    <Select
                        value={formData.usage_unit}
                        onChange={(e) => setFormData({ ...formData, usage_unit: e.target.value })}
                    >
                        {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                <div className="space-y-2">
                    <label className="text-sm font-black text-white uppercase tracking-widest">현재 재고 ({formData.purchase_unit})</label>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatNumber(formData.current_stock)}
                        onChange={(e) => setFormData({ ...formData, current_stock: parseNumber(e.target.value) })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-black text-white uppercase tracking-widest">안전 재고 ({formData.purchase_unit})</label>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="알림 기준"
                        value={formatNumber(formData.safety_stock)}
                        onChange={(e) => setFormData({ ...formData, safety_stock: parseNumber(e.target.value) })}
                    />
                </div>
            </div>

            <div className="space-y-2 rounded-md bg-muted p-3">
                <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium">단위 환산 비율</label>
                    <div className="group relative">
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        <div className="absolute hidden group-hover:block w-48 p-2 bg-black text-white text-xs rounded z-50 -top-8 left-6">
                            1 {formData.purchase_unit} = {formData.conversion_factor} {formData.usage_unit}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">1 {formData.purchase_unit} = </span>
                    <Input
                        type="text"
                        inputMode="decimal"
                        className="w-24 h-8"
                        value={formatNumber(formData.conversion_factor)}
                        onChange={(e) => setFormData({ ...formData, conversion_factor: parseNumber(e.target.value) })}
                    />
                    <span className="text-sm text-muted-foreground">{formData.usage_unit}</span>
                </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3 bg-secondary/20">
                <span className="text-sm font-medium">예상 실질 단가 (1 {formData.usage_unit})</span>
                <span className="text-lg font-bold text-primary">
                    {estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} 원
                </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
                    취소
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? "저장 중..." : "저장하기"}
                </Button>
            </div>
        </form>
    )
}
