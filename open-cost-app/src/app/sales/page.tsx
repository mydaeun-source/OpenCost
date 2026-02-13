"use client"

import { AppLayout } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/Button"
import { SalesCalendar } from "@/components/sales/SalesCalendar"
import { SalesEntryDialog } from "@/components/sales/SalesEntryDialog"
import { useState } from "react"
import { Plus, TrendingUp, Banknote, BarChart3, Target, RefreshCw, DollarSign, Activity, Package } from "lucide-react"
import { useDashboard } from "@/hooks/useDashboard"
import { useStore } from "@/contexts/StoreContext"
import { useToast } from "@/hooks/use-toast"
import { recalculateSalesAndInventory } from "@/lib/api/sales"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard"
import { cn, formatNumber } from "@/lib/utils"

export default function SalesPage() {
    const [isEntryOpen, setIsEntryOpen] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [isRecalculating, setIsRecalculating] = useState(false)
    const { chartData, loading: dashLoading, refresh } = useDashboard()
    const { activeStore } = useStore()
    const { toast } = useToast()

    const handleRecalculate = async () => {
        if (!activeStore) return
        if (!confirm("매출 데이터를 재계산하시겠습니까? 기존의 수동 입력 데이터가 초기화될 수 있습니다.")) return

        try {
            setIsRecalculating(true)
            await recalculateSalesAndInventory(activeStore.id)
            toast({ title: "재계산 완료", description: "매출 데이터가 주문 내역을 기반으로 복구되었습니다." })
            setRefreshTrigger(prev => prev + 1)
            refresh()
        } catch (error) {
            toast({ title: "오류", description: "재계산 중 문제가 발생했습니다.", type: "destructive" })
        } finally {
            setIsRecalculating(false)
        }
    }

    // Get current month data from chartData (last item is current month)
    const currentMonthData = chartData.length > 0 ? chartData[chartData.length - 1] : null
    const monthlyRevenue = currentMonthData?.revenue || 0
    const monthlyCogs = currentMonthData ? (monthlyRevenue - currentMonthData.profit - currentMonthData.expenses) : 0
    // Wait, useDashboard calculates profit = rev - cogs - exp. 
    // So cogs = rev - profit - exp. Correct.
    // Actually, I can just recalculate or expose them better.
    // In useDashboard: monthSales, monthCogs, monthExp.
    // I will simplify and just show Revenue and Estimate for now, or improve useDashboard if needed.
    // Let's use the actual values from chartData if possible.

    // Monthly Margin Calculation
    const monthlyProfit = currentMonthData?.profit || 0
    const monthlyMargin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-6 pb-20">
                {/* Header Section */}
                <div className="glass-panel p-8 rounded-3xl border border-border">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black tracking-tighter text-foreground italic flex items-center gap-3">
                                매출 데이터 센터 (SALES DATA HUB)
                            </h1>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-1">
                                실시간 매출 내역 및 수익 상관계수 분석
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 h-14 px-8 rounded-2xl font-black text-lg transition-all hover:scale-105"
                                onClick={() => setIsEntryOpen(true)}
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                매출 직접 등록
                            </Button>
                            <Button variant="outline" className="rounded-2xl h-14 px-8 font-black text-lg uppercase tracking-widest border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => window.location.href = '/sales/orders'}>
                                상세 주문 내역
                            </Button>
                            <Button
                                variant="ghost"
                                className="rounded-2xl h-14 px-4 font-black text-lg uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-accent"
                                onClick={handleRecalculate}
                                disabled={isRecalculating}
                            >
                                <RefreshCw className={`h-5 w-5 ${isRecalculating ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Monthly Quick Summary */}
                <CollapsibleCard
                    title="월간 매출 분석 요약"
                    description="이번 달 매출 추이와 수익성 지표를 한눈에 확인하세요."
                    icon={<Target className="h-4 w-4" />}
                    storageKey="sales-summary"
                >
                    <div className="grid gap-6 md:grid-cols-3">
                        <Card className="glass-panel border-none shadow-none group transition-all">
                            <CardHeader className="flex flex-row items-center justify-between p-6 pb-2 space-y-0">
                                <CardTitle className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">이번 달 누적 매출 (매출)</CardTitle>
                                <DollarSign className="h-4 w-4 text-indigo-500" />
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                                <div className="text-3xl font-black text-foreground italic tracking-tighter">
                                    {dashLoading ? "..." : formatNumber(monthlyRevenue)}원
                                </div>
                                <p className="text-[10px] text-muted-foreground font-black mt-2 bg-muted/50 w-fit px-2 py-0.5 rounded uppercase tracking-widest">누적 매출액 (AGGREGATE REVENUE)</p>
                            </CardContent>
                        </Card>

                        <Card className="glass-panel border-none shadow-none group transition-all">
                            <CardHeader className="flex flex-row items-center justify-between p-6 pb-2 space-y-0">
                                <CardTitle className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">예상 순수익 (순익)</CardTitle>
                                <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                                <div className="text-3xl font-black text-foreground italic tracking-tighter">
                                    {dashLoading ? "..." : formatNumber(monthlyProfit)}원
                                </div>
                                <p className="text-[10px] text-muted-foreground font-black mt-2 bg-muted/50 w-fit px-2 py-0.5 rounded uppercase tracking-widest">예상 수익 (ESTIMATED PROFIT)</p>
                            </CardContent>
                        </Card>

                        <Card className="glass-panel border-none shadow-none group transition-all">
                            <CardHeader className="flex flex-row items-center justify-between p-6 pb-2 space-y-0">
                                <CardTitle className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">실시간 마진율 (마진)</CardTitle>
                                <BarChart3 className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                                <div className="text-3xl font-black text-foreground italic tracking-tighter">
                                    {dashLoading ? "..." : Math.round(monthlyMargin)}%
                                </div>
                                <p className="text-[10px] text-muted-foreground font-black mt-2 bg-muted/50 w-fit px-2 py-0.5 rounded uppercase tracking-widest">마진율 분석 (MARGIN ANALYSIS)</p>
                            </CardContent>
                        </Card>
                    </div>
                </CollapsibleCard>

                <div className="grid gap-6">
                    <SalesCalendar key={refreshTrigger} />
                </div>

                <SalesEntryDialog
                    isOpen={isEntryOpen}
                    onClose={() => setIsEntryOpen(false)}
                    onSuccess={() => {
                        setRefreshTrigger(prev => prev + 1)
                        setIsEntryOpen(false)
                    }}
                />
            </div>
        </AppLayout>
    )
}
