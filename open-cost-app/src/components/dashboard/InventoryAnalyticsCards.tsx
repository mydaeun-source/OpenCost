import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { TrendingDown, Hourglass } from "lucide-react"
import { cn } from "@/lib/utils"
import { InventoryLossReport } from "@/lib/api/inventory-analytics"

interface InventoryAnalyticsCardsProps {
    lossReport: InventoryLossReport[]
    depletionPredictions: {
        id: string
        name: string
        currentStock: number
        usagePerDay: number
        daysLeft: number
        unit: string
    }[]
}

export function InventoryAnalyticsCards({ lossReport, depletionPredictions }: InventoryAnalyticsCardsProps) {
    const topLossItems = lossReport.filter((r) => r.lossQuantity > 0).slice(0, 3)
    const criticalStock = depletionPredictions.filter((p) => p.daysLeft <= 3).slice(0, 3)

    return (
        <div className="grid gap-6 md:grid-cols-2 mb-6">
            {/* 1. Shadow Loss / Waste Analysis */}
            <Card className="border-2 border-rose-500/20 bg-rose-500/[0.02]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-black text-rose-500 uppercase flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        그림자 로스 (Hidden Waste)
                    </CardTitle>
                    <CardDescription className="text-xs font-bold">판매량 대비 재고 소진이 더 많은 품목입니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {topLossItems.length === 0 ? (
                        <div className="py-4 text-center text-slate-400 text-xs font-bold italic">
                            감지된 특이 로스가 없습니다. 우수한 재고 관리!
                        </div>
                    ) : (
                        topLossItems.map((item) => (
                            <div
                                key={item.ingredientId}
                                className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-100 dark:border-slate-800 transition-all hover:border-rose-200"
                            >
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">{item.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                        이론 대비 <span className="text-rose-500">+{item.lossRate}%</span> 더 소진됨
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-rose-500 italic">-{item.lossValue.toLocaleString()}원</p>
                                    <p className="text-[10px] font-bold text-slate-400">
                                        {item.lossQuantity}
                                        {"단위"}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* 2. Predictive Stock Alerts */}
            <Card className="border-2 border-amber-500/20 bg-amber-500/[0.02]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-black text-amber-500 uppercase flex items-center gap-2">
                        <Hourglass className="h-4 w-4" />
                        재고 소진 임박 예측
                    </CardTitle>
                    <CardDescription className="text-xs font-bold">최근 판매 속도 기준, 곧 품절될 품목입니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {criticalStock.length === 0 ? (
                        <div className="py-4 text-center text-slate-400 text-xs font-bold italic">
                            7일 내 소진 예상 품목이 없습니다.
                        </div>
                    ) : (
                        criticalStock.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-100 dark:border-slate-800 transition-all hover:border-amber-200"
                            >
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">{item.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                        하루 평균 {item.usagePerDay}
                                        {item.unit} 소진 중
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div
                                        className={cn(
                                            "px-2 py-1 rounded-lg text-xs font-black italic",
                                            item.daysLeft <= 1 ? "bg-rose-500 text-white" : "bg-amber-500 text-white",
                                        )}
                                    >
                                        D-{item.daysLeft}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
