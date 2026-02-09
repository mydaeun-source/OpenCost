import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Component, Utensils, TrendingUp, DollarSign, Wallet } from "lucide-react"

interface SummaryCardsProps {
    ingredientCount: number
    recipeCount: number
    avgMarginRate: number
    totalExpenses: number
    targetRevenue: number
    estimatedProfit: number
}

export function SummaryCards({
    ingredientCount,
    recipeCount,
    avgMarginRate,
    totalExpenses,
    targetRevenue,
    estimatedProfit
}: SummaryCardsProps) {
    // Format currency helper
    const fmt = (n: number) => n.toLocaleString()

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 1. Estimated Profit (Highlight) */}
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">이번 달 순이익 (예상)</CardTitle>
                    <Wallet className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black text-indigo-500 dark:text-indigo-400 italic">₩{fmt(Math.round(estimatedProfit))}</div>
                    <p className="text-xs font-bold text-slate-200 mt-1">
                        목표 매출({fmt(Math.round(targetRevenue / 10000))}만) 기준
                    </p>
                </CardContent>
            </Card>

            {/* 2. Total Expenses */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-black tracking-widest text-slate-300 uppercase">이번 달 총 지출</CardTitle>
                    <DollarSign className="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black text-white italic tracking-tight">₩{fmt(totalExpenses)}</div>
                    <p className="text-xs font-bold text-slate-300 mt-1">
                        고정비 + 변동비 합계
                    </p>
                </CardContent>
            </Card>

            {/* 3. Margin Rate */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-black tracking-widest text-slate-300 uppercase">평균 원가율/마진</CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black text-white italic tracking-tight">{avgMarginRate}%</div>
                    <p className="text-xs font-bold text-slate-300 mt-1">
                        예상 마진율 (목표 70%)
                    </p>
                </CardContent>
            </Card>

            {/* 4. Active Menus */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-black tracking-widest text-slate-300 uppercase">활성 메뉴</CardTitle>
                    <Utensils className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black text-white italic tracking-tight">{recipeCount}개</div>
                    <p className="text-xs font-bold text-slate-300 mt-1">
                        재료({ingredientCount}) 관리 중
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
