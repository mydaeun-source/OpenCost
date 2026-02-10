"use client"

import { AppLayout } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/Button"
import { SalesCalendar } from "@/components/sales/SalesCalendar"
import { SalesEntryDialog } from "@/components/sales/SalesEntryDialog"
import { useState } from "react"
import { Plus, TrendingUp, Banknote, BarChart3, Target } from "lucide-react"
import { useDashboard } from "@/hooks/useDashboard"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard"

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
            <div className="max-w-6xl mx-auto space-y-6 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-8 rounded-3xl border border-white/5 transition-all hover:bg-white/10">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white italic">SALES MANAGEMENT</h1>
                        <p className="text-slate-500 mt-1 font-medium">
                            일별 매출을 기록하고, 실시간 재고 차감 및 수익을 분석합니다.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 h-12 shadow-lg shadow-indigo-500/20 font-black text-xs uppercase tracking-widest"
                            onClick={() => setIsEntryOpen(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            매출 직접 등록
                        </Button>
                        <Button variant="outline" className="rounded-xl h-12 px-8 font-black text-xs uppercase tracking-widest border-white/10 text-slate-300 hover:bg-white/5" onClick={() => window.location.href = '/sales/orders'}>
                            상세 주문 내역
                        </Button>
                    </div>
                </div>

                {/* Monthly Quick Summary */}
                <CollapsibleCard
                    title="월간 매출 분석 요약"
                    description="이번 달 매출 추이와 수익성 지표를 한눈에 확인하세요."
                    icon={<Target className="h-4 w-4" />}
                    storageKey="sales-summary"
                >
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="bg-white/5 border-none shadow-none overflow-hidden group hover:bg-white/10 transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-[10px] font-black text-indigo-400 uppercase tracking-widest group-hover:text-indigo-300">이번 달 총 매출</CardTitle>
                                <TrendingUp className="h-4 w-4 text-indigo-400 opacity-70" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-white tracking-tight italic">
                                    {dashLoading ? "..." : monthlyRevenue.toLocaleString()}<span className="text-sm font-bold ml-1 opacity-50">원</span>
                                </div>
                                <div className="mt-1 text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Current Month Revenue</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/5 border-none shadow-none overflow-hidden group hover:bg-white/10 transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-[10px] font-black text-emerald-400 uppercase tracking-widest group-hover:text-emerald-300">이번 달 예상 수익</CardTitle>
                                <Banknote className="h-4 w-4 text-emerald-400 opacity-70" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-white tracking-tight italic">
                                    {dashLoading ? "..." : (currentMonthData?.profit || 0).toLocaleString()}<span className="text-sm font-bold ml-1 opacity-50">원</span>
                                </div>
                                <div className="mt-1 text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Estimated Net Profit</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/5 border-none shadow-none overflow-hidden group hover:bg-white/10 transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-[10px] font-black text-amber-400 uppercase tracking-widest group-hover:text-amber-300">마진율 (Margin)</CardTitle>
                                <BarChart3 className="h-4 w-4 text-amber-400 opacity-70" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-white tracking-tight italic">
                                    {dashLoading ? "..." : (monthlyRevenue > 0 ? Math.round(((monthlyRevenue - monthlyCogs) / monthlyRevenue) * 100) : 0)}%
                                </div>
                                <div className="mt-1 text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Profit Margin Ratio</div>
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
