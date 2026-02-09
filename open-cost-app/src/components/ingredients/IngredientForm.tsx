import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { NumericInput } from "@/components/ui/NumericInput"
import { Select } from "@/components/ui/Select"
import { Database } from "@/types/database.types"
import { Info, TrendingUp } from "lucide-react"
import { KAMIS_ITEMS } from "@/lib/api/kamis"
import { formatNumber } from "@/lib/utils"

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
    const [kamisMapping, setKamisMapping] = useState<{ code: string, category: string } | null>(() => {
        if (typeof window === "undefined") return null
        const saved = initialData ? localStorage.getItem(`kamis_mapping_${initialData.id}`) : null
        return saved ? JSON.parse(saved) : null
    })
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
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-black text-white uppercase tracking-widest">구매 가격 (원)</label>
                    <NumericInput
                        required
                        placeholder="0"
                        value={formData.purchase_price || 0}
                        onChange={(val) => setFormData({ ...formData, purchase_price: val })}
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
                        value={formData.purchase_unit || "kg"}
                        onChange={(e) => setFormData({ ...formData, purchase_unit: e.target.value })}
                    >
                        {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">사용 단위 (레시피용)</label>
                    <Select
                        value={formData.usage_unit || "g"}
                        onChange={(e) => setFormData({ ...formData, usage_unit: e.target.value })}
                    >
                        {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </Select>
                </div>
            </div>

            <div className="space-y-2 rounded-md bg-indigo-500/5 border border-indigo-500/20 p-3">
                <label className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> KAMIS 시장 시세 매핑
                </label>
                <div className="flex gap-2">
                    <Select
                        className="flex-1"
                        value={kamisMapping?.code || ""}
                        onChange={(e) => {
                            const item = KAMIS_ITEMS.find(it => it.code === e.target.value)
                            setKamisMapping(item ? { code: item.code, category: item.category } : null)
                        }}
                    >
                        <option value="">품목 선택 안 함</option>
                        {KAMIS_ITEMS.map(it => (
                            <option key={it.code} value={it.code}>{it.name} (코드: {it.code})</option>
                        ))}
                    </Select>
                </div>
                <p className="text-[10px] text-slate-500 italic mt-1 font-medium">
                    매핑이 완료되면 재고 관리 및 상세 페이지에서 전국 평균 시세와 비교할 수 있습니다.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                <div className="space-y-2">
                    <label className="text-sm font-black text-white uppercase tracking-widest">현재 재고 ({formData.purchase_unit})</label>
                    <NumericInput
                        placeholder="0"
                        value={formData.current_stock || 0}
                        onChange={(val) => setFormData({ ...formData, current_stock: val })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-black text-white uppercase tracking-widest">안전 재고 ({formData.purchase_unit})</label>
                    <NumericInput
                        placeholder="알림 기준"
                        value={formData.safety_stock || 0}
                        onChange={(val) => setFormData({ ...formData, safety_stock: val })}
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
                    <NumericInput
                        className="w-24 h-8"
                        value={formData.conversion_factor || 1}
                        onChange={(val) => setFormData({ ...formData, conversion_factor: val })}
                    />
                    <span className="text-sm text-muted-foreground">{formData.usage_unit}</span>
                </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3 bg-secondary/20">
                <span className="text-sm font-medium">예상 실질 단가 (1 {formData.usage_unit})</span>
                <span className="text-lg font-bold text-primary">
                    {formatNumber(estimatedCost)} 원
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
