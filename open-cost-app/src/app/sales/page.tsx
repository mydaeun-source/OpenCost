"use client"

import { AppLayout } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/Button"
import { SalesCalendar } from "@/components/sales/SalesCalendar"
import { SalesEntryDialog } from "@/components/sales/SalesEntryDialog"
import { useState } from "react"
import { Plus, TrendingUp, DollarSign, BarChart3 } from "lucide-react"
import { useDashboard } from "@/hooks/useDashboard"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

export default function SalesPage() {
    const [isEntryOpen, setIsEntryOpen] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const { chartData, loading: dashLoading } = useDashboard()

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

    return (
        <AppLayout>
            <div className="space-y-6 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">매출 관리</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                            일별 매출을 기록하고, 실시간 재고 차감 및 수익을 분석합니다.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-12 shadow-lg shadow-indigo-100 dark:shadow-none font-bold"
                            onClick={() => setIsEntryOpen(true)}
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            매출 직접 등록
                        </Button>
                        <Button variant="outline" className="rounded-xl h-12 px-6 font-bold border-slate-200 dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => window.location.href = '/sales/orders'}>
                            상세 주문 내역
                        </Button>
                    </div>
                </div>

                {/* Monthly Quick Summary */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-indigo-500 overflow-hidden group hover:ring-2 hover:ring-indigo-100 dark:hover:ring-slate-800 transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">이번 달 총 매출</CardTitle>
                            <TrendingUp className="h-4 w-4 text-indigo-500 opacity-50" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-slate-900 dark:text-white italic">
                                {dashLoading ? "..." : monthlyRevenue.toLocaleString()}<span className="text-xs font-normal ml-0.5">원</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-emerald-500 overflow-hidden group hover:ring-2 hover:ring-emerald-50 dark:hover:ring-slate-800 transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">이번 달 예상 수익</CardTitle>
                            <DollarSign className="h-4 w-4 text-emerald-500 opacity-50" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 italic">
                                {dashLoading ? "..." : (currentMonthData?.profit || 0).toLocaleString()}<span className="text-xs font-normal ml-0.5">원</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-amber-500 overflow-hidden group hover:ring-2 hover:ring-amber-50 dark:hover:ring-slate-800 transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-amber-500 transition-colors">마진율 (Margin)</CardTitle>
                            <BarChart3 className="h-4 w-4 text-amber-500 opacity-50" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-slate-900 dark:text-white italic">
                                {dashLoading ? "..." : (monthlyRevenue > 0 ? Math.round(((monthlyRevenue - monthlyCogs) / monthlyRevenue) * 100) : 0)}%
                            </div>
                        </CardContent>
                    </Card>
                </div>

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
