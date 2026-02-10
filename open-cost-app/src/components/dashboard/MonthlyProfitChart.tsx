import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { BarChart3 } from "lucide-react"

interface ChartData {
    month: string
    revenue: number
    expenses: number
    profit: number
}

interface MonthlyProfitChartProps {
    data: ChartData[]
    noWrapper?: boolean
}

export function MonthlyProfitChart({ data, noWrapper = false }: MonthlyProfitChartProps) {
    // Determine max value for scaling
    // Use 1000 as minimum scale to avoid division by zero or weird scaling on empty data
    const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses))) || 1000

    const content = (
        <CardContent className={noWrapper ? "p-0" : ""}>
            {data.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    데이터가 없습니다. (설정 → 초기 데이터 생성 필요)
                </div>
            ) : (
                // Use items-stretch (default) so columns take full height
                <div className="h-[250px] w-full flex justify-between gap-2 md:gap-4 pt-6">
                    {data.map((item, i) => {
                        const revHeight = Math.min((item.revenue / maxVal) * 100, 100)
                        const expHeight = Math.min((item.expenses / maxVal) * 100, 100)

                        return (
                            <div key={i} className="flex flex-col items-center justify-end h-full gap-2 flex-1 group relative">
                                {/* Bars Container (flex-1 to take available height above label) */}
                                <div className="w-full flex-1 flex items-end justify-center gap-1">
                                    {/* Revenue Bar */}
                                    <div
                                        className="w-3 md:w-6 bg-blue-500 rounded-t-sm transition-all relative group-hover:bg-blue-600"
                                        style={{ height: `${revHeight}%` }}
                                        title={`매출: ${item.revenue.toLocaleString()}`}
                                    >
                                        {/* Tooltip */}
                                        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg whitespace-nowrap z-10 border border-white/10 pointer-events-none">
                                            <p>매출: {item.revenue.toLocaleString()}</p>
                                            <p>지출: {item.expenses.toLocaleString()}</p>
                                            <p className={item.profit >= 0 ? "text-green-500" : "text-red-500"}>
                                                이익: {item.profit > 0 ? "+" : ""}{item.profit.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Expense Bar */}
                                    <div
                                        className="w-3 md:w-6 bg-red-500 rounded-t-sm transition-all group-hover:bg-red-600"
                                        style={{ height: `${expHeight}%` }}
                                        title={`지출: ${item.expenses.toLocaleString()}`}
                                    />
                                </div>
                                <span className="text-xs text-muted-foreground font-medium">{item.month}</span>
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="flex justify-center gap-4 mt-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                    <span>예상 매출 (목표 기준)</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                    <span>실제 지출</span>
                </div>
            </div>
        </CardContent>
    );

    if (noWrapper) return content;

    return (
        <Card className="col-span-full">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <CardTitle>월별 수익/지출 추이 (최근 6개월)</CardTitle>
                </div>
            </CardHeader>
            {content}
        </Card>
    )
}
