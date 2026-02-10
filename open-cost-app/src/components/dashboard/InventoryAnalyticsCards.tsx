import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { TrendingDown, Hourglass } from "lucide-react"
import { cn, formatNumber } from "@/lib/utils"
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
    noWrapper?: boolean
}

export function InventoryAnalyticsCards({ lossReport, depletionPredictions, noWrapper = false }: InventoryAnalyticsCardsProps) {
    const topLossItems = lossReport.filter((r) => r.lossQuantity > 0).slice(0, 3)
    const criticalStock = depletionPredictions.filter((p) => p.daysLeft <= 3).slice(0, 3)

    return (
        <div className={cn("grid gap-6 md:grid-cols-2", !noWrapper && "mb-6")}>
            {/* 1. Shadow Loss / Waste Analysis */}
            <Card className="border-none shadow-none bg-rose-500/[0.03]">
                {!noWrapper && (
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black text-rose-500 uppercase flex items-center gap-2">
                            <TrendingDown className="h-4 w-4" />
                            그림자 로스 (Hidden Waste)
                        </CardTitle>
                        <CardDescription className="text-xs font-bold">판매량 대비 재고 소진이 더 많은 품목입니다.</CardDescription>
                    </CardHeader>
                )}
                <CardContent className={cn("space-y-4", noWrapper && "p-0")}>
                    {noWrapper && (
                        <div className="mb-2">
                            <p className="text-xs font-black text-rose-500 uppercase flex items-center gap-2">
                                <TrendingDown className="h-3 w-3" /> 그림자 로스
                            </p>
                        </div>
                    )}
                    {topLossItems.length === 0 ? (
                        <div className="py-4 text-center text-slate-400 text-xs font-bold italic">
                            감지된 특이 로스가 없습니다.
                        </div>
                    ) : (
                        topLossItems.map((item) => (
                            <div
                                key={item.ingredientId}
                                className="flex items-center justify-between p-3 bg-transparent rounded-xl border-none transition-all hover:bg-rose-500/10"
                            >
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-rose-600 dark:text-rose-300">{item.name}</p>
                                    <p className="text-[10px] font-black text-rose-500 uppercase italic">
                                        이론 대비 +{formatNumber(item.lossRate)}%
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-rose-500 italic">-{formatNumber(item.lossValue)}원</p>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* 2. Predictive Stock Alerts */}
            <Card className="border-none shadow-none bg-amber-500/[0.03]">
                {!noWrapper && (
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black text-amber-500 uppercase flex items-center gap-2">
                            <Hourglass className="h-4 w-4" />
                            재고 소진 임박 예측
                        </CardTitle>
                        <CardDescription className="text-xs font-bold">곧 품절될 품목입니다.</CardDescription>
                    </CardHeader>
                )}
                <CardContent className={cn("space-y-4", noWrapper && "p-0")}>
                    {noWrapper && (
                        <div className="mb-2">
                            <p className="text-xs font-black text-amber-500 uppercase flex items-center gap-2">
                                <Hourglass className="h-3 w-3" /> 소진 임박 예측
                            </p>
                        </div>
                    )}
                    {criticalStock.length === 0 ? (
                        <div className="py-4 text-center text-slate-400 text-xs font-bold italic">
                            소진 예정 품목 없음
                        </div>
                    ) : (
                        criticalStock.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-3 bg-transparent rounded-xl border-none transition-all hover:bg-amber-500/10"
                            >
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-amber-600 dark:text-amber-300">{item.name}</p>
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter italic">
                                        D-{item.daysLeft} 남음
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500 text-white italic shadow-lg shadow-amber-500/30">
                                        임박
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
