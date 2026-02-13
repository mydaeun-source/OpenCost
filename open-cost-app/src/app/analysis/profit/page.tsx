"use client"

import { useState, useMemo, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { useDashboard } from "@/hooks/useDashboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import {
    Calculator,
    TrendingUp,
    Banknote,
    Wallet,
    ArrowRight,
    BarChart3,
    Target,
    Settings2,
    X,
    ChevronDown,
    ChevronUp
} from "lucide-react"
import { cn, formatNumber } from "@/lib/utils"
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard"

export default function ProfitAnalysisPage() {
    const { summary, loading } = useDashboard()

    // --- State ---
    const [showSimulator, setShowSimulator] = useState(false)
    const [simRevenue, setSimRevenue] = useState<number>(0)
    const [simCogsRate, setSimCogsRate] = useState<number>(35)
    const [simFixedCost, setSimFixedCost] = useState<number>(0)
    const [simVariableExpRate, setSimVariableExpRate] = useState<number>(5)

    // Sliders for "What-if"
    const [volAdj, setVolAdj] = useState<number>(0)
    const [priceAdj, setPriceAdj] = useState<number>(0)
    const [costAdj, setCostAdj] = useState<number>(0)

    // Initialize simulation from real data
    useEffect(() => {
        if (!loading && summary) {
            setSimRevenue(summary.targetRevenue || 0)
            setSimCogsRate(summary.avgMarginRate ? (100 - summary.avgMarginRate) : 35)
            setSimFixedCost(summary.totalExpenses || 0)
        }
    }, [loading, summary])

    // --- Derived Calculations ---
    const analysis = useMemo(() => {
        const baseRevenue = simRevenue * (1 + priceAdj / 100) * (1 + volAdj / 100)
        const baseCogs = baseRevenue * (simCogsRate / 100) * (1 + costAdj / 100)
        const grossProfit = baseRevenue - baseCogs
        const variableExpenses = baseRevenue * (simVariableExpRate / 100)
        const operatingProfit = grossProfit - simFixedCost - variableExpenses
        const operatingMarginRate = baseRevenue > 0 ? (operatingProfit / baseRevenue) * 100 : 0

        return {
            revenue: baseRevenue,
            cogs: baseCogs,
            grossProfit,
            fixedCost: simFixedCost,
            variableExpenses,
            operatingProfit,
            operatingMarginRate,
            isSimulating: volAdj !== 0 || priceAdj !== 0 || costAdj !== 0
        }
    }, [simRevenue, simCogsRate, simFixedCost, simVariableExpRate, volAdj, priceAdj, costAdj])

    if (loading) return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <BarChart3 className="h-10 w-10 text-indigo-500 animate-pulse mb-4" />
                <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Generating Report...</p>
            </div>
        </AppLayout>
    )


    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto space-y-6 pb-20">

                {/* 1. Header & Quick Status */}
                <div className="glass-panel p-8 rounded-3xl border border-border">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-black italic tracking-tighter text-foreground flex items-center gap-2">
                                <Wallet className="h-8 w-8 text-indigo-500" />
                                순이익 상세 분석 리포트 (NET PROFIT REPORT)
                            </h1>
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mt-2">
                                {analysis.isSimulating ? (
                                    <span className="text-indigo-600 dark:text-indigo-400 animate-pulse">● 시뮬레이션 모드 활성화됨</span>
                                ) : (
                                    "실시간 경영 분석 데이터"
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Top Level KPI Row */}
                <CollapsibleCard
                    title="핵심 수익 지표 (Key Financials)"
                    description="매출, 지출 및 최종 순이익 요약입니다."
                    icon={<BarChart3 className="h-4 w-4" />}
                    storageKey="profit-kpis"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="glass-panel border-none shadow-none relative overflow-hidden group transition-all">
                            <CardHeader className="p-6 pb-0">
                                <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">01. 매출액 (REVENUE)</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-2">
                                <div className="text-3xl font-black italic tracking-tighter text-foreground">
                                    {formatNumber(analysis.revenue)}원
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-panel border-none shadow-none relative overflow-hidden group transition-all">
                            <CardHeader className="p-6 pb-0">
                                <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">02. 총 비용 (TOTAL COSTS)</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-2">
                                <div className="text-3xl font-black italic tracking-tighter text-rose-600 dark:text-rose-400">
                                    {formatNumber(analysis.cogs + analysis.fixedCost + analysis.variableExpenses)}원
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-indigo-500/10 border border-indigo-500/20 shadow-none relative overflow-hidden group transition-all">
                            <CardHeader className="p-6 pb-0">
                                <CardTitle className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">03. 경영 순이익 (NET PROFIT)</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-2 relative z-10">
                                <div className="text-3xl font-black italic tracking-tighter text-indigo-600 dark:text-indigo-400">
                                    {formatNumber(analysis.operatingProfit)}원
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </CollapsibleCard>

                {/* 3. SIMULATOR PANEL */}
                <CollapsibleCard
                    title="수익 전략 시뮬레이션"
                    description="판매량, 가격, 원가 변동에 따른 기대 수익 변화를 계산합니다."
                    icon={<Calculator className="h-4 w-4" />}
                    storageKey="profit-sim"
                    defaultCollapsed={true}
                >
                    <div className="p-4 grid md:grid-cols-3 gap-10">
                        {/* Volume */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">판매량 (VOLUME)</label>
                                <span className={cn("text-sm font-black italic border-b-2 transition-colors", volAdj >= 0 ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "text-rose-600 dark:text-rose-400 border-rose-500/30")}>
                                    {volAdj > 0 ? '+' : ''}{volAdj}%
                                </span>
                            </div>
                            <input type="range" min="-30" max="100" step="5" value={volAdj} onChange={(e) => setVolAdj(Number(e.target.value))} className="w-full accent-indigo-600" />
                        </div>

                        {/* Price */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">판매가격 (PRICE)</label>
                                <span className={cn("text-sm font-black italic border-b-2 transition-colors", priceAdj >= 0 ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "text-rose-600 dark:text-rose-400 border-rose-500/30")}>
                                    {priceAdj > 0 ? '+' : ''}{priceAdj}%
                                </span>
                            </div>
                            <input type="range" min="-20" max="30" step="1" value={priceAdj} onChange={(e) => setPriceAdj(Number(e.target.value))} className="w-full accent-indigo-600" />
                        </div>

                        {/* Cost */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">원재료비 변동 (MATERIAL)</label>
                                <span className={cn("text-sm font-black italic border-b-2 transition-colors", costAdj <= 0 ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "text-rose-600 dark:text-rose-400 border-rose-500/30")}>
                                    {costAdj > 0 ? '+' : ''}{costAdj}%
                                </span>
                            </div>
                            <input type="range" min="-20" max="50" step="1" value={costAdj} onChange={(e) => setCostAdj(Number(e.target.value))} className="w-full accent-indigo-600" />
                        </div>
                    </div>
                </CollapsibleCard>

                {/* 4. MAIN WATERFALL BREAKDOWN */}
                <CollapsibleCard
                    title="수익 구조 상세 분석 (Waterfall)"
                    description="매출액 대비 주요 비용 항목의 비중입니다."
                    icon={<TrendingUp className="h-4 w-4" />}
                    storageKey="profit-waterfall"
                >
                    <div className="space-y-2 p-2">
                        {/* THE BAR CONTAINER */}
                        <div className="relative h-16 w-full bg-muted rounded-2xl overflow-hidden flex shadow-inner border border-border">
                            {/* COGS Segment */}
                            <div
                                className="h-full bg-rose-500/70 border-r border-white/10 relative group transition-all"
                                style={{ width: `${(analysis.cogs / analysis.revenue) * 100}%` }}
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center justify-center h-full">
                                    {(analysis.cogs / analysis.revenue) > 0.15 && <span className="text-[10px] font-black text-white/70 uppercase tracking-tighter">원가 (COGS)</span>}
                                </div>
                            </div>

                            {/* Fixed + Var Segment */}
                            <div
                                className="h-full bg-amber-500/70 border-r border-white/10 relative group transition-all"
                                style={{ width: `${((analysis.fixedCost + analysis.variableExpenses) / analysis.revenue) * 100}%` }}
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center justify-center h-full">
                                    {((analysis.fixedCost + analysis.variableExpenses) / analysis.revenue) > 0.15 && <span className="text-[10px] font-black text-white/70 uppercase tracking-tighter">판관비 (OPEX)</span>}
                                </div>
                            </div>

                            {/* Net Profit Segment */}
                            <div
                                className="h-full bg-indigo-600/80 relative group transition-all"
                                style={{ width: `${Math.max(0, (analysis.operatingProfit / analysis.revenue) * 100)}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center justify-center h-full">
                                    {(analysis.operatingProfit / analysis.revenue) > 0.1 && <span className="text-[10px] font-black text-white uppercase tracking-tighter italic">순익 (PROFIT)</span>}
                                </div>
                            </div>
                        </div>

                        {/* Legends & Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                            <div className="p-5 rounded-2xl bg-muted/30 border border-border group hover:border-rose-500/30 transition-all">
                                <div className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase mb-2 tracking-widest">식자재비 (COGS)</div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-lg font-black italic text-foreground">{formatNumber(analysis.cogs)}원</span>
                                    <span className="text-xs font-black text-muted-foreground bg-muted px-2 py-0.5 rounded">{formatNumber(analysis.cogs / analysis.revenue * 100)}%</span>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-muted/30 border border-border group hover:border-amber-500/30 transition-all">
                                <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase mb-2 tracking-widest">운영비 (OPEX)</div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-lg font-black italic text-foreground">{formatNumber(analysis.fixedCost + analysis.variableExpenses)}원</span>
                                    <span className="text-xs font-black text-muted-foreground bg-muted px-2 py-0.5 rounded">{formatNumber((analysis.fixedCost + analysis.variableExpenses) / analysis.revenue * 100)}%</span>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 group hover:border-indigo-500/40 transition-all">
                                <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase mb-2 tracking-widest">영업이익률 (MARGIN)</div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-lg font-black italic text-indigo-600 dark:text-indigo-400">{formatNumber(analysis.operatingProfit)}원</span>
                                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded">{formatNumber(analysis.operatingMarginRate)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CollapsibleCard>

                {/* 5. Strategy Insight (Simplified) */}
                <div className="p-8 bg-muted rounded-3xl border border-border shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                        <Target className="h-32 w-32 text-foreground" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">
                            <Target className="h-4 w-4" /> BUSINESS INSIGHT
                        </div>
                        <p className="text-base font-bold text-foreground leading-relaxed max-w-2xl italic">
                            {analysis.operatingMarginRate > 30
                                ? "현재 매우 건강한 수익 구조를 유지하고 있습니다. 인건비나 기타 고정비의 효율적인 관리가 우수합니다."
                                : analysis.operatingMarginRate > 15
                                    ? "안정적인 마진을 확보 중입니다. 식자재 구매 가격 협상이나 메뉴 가격 소폭 인상 시 영업이익이 비약적으로 성장할 수 있습니다."
                                    : "수익성이 개선이 필요합니다. 원가 비중이 높은 메뉴의 레시피를 점검하거나, 비효율적인 운영 지출이 없는지 확인해보세요."
                            }
                        </p>
                    </div>
                </div>

                <div className="text-center pt-12">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40 select-none">
                        PROFIT ARCHITECTURE v2.0 • BUILT BY ANTIGRAVITY ENGINE
                    </p>
                </div>
            </div>
        </AppLayout>
    )
}
