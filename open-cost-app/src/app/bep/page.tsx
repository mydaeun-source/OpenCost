"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { useDashboard } from "@/hooks/useDashboard"
import { supabase } from "@/lib/supabase"
import { Calculator, TrendingUp, Banknote, Users, Target, CalendarDays, Rocket } from "lucide-react"
import { cn } from "@/lib/utils"

export default function BEPPage() {
    const { summary, loading } = useDashboard()

    // Inputs
    const [fixedCost, setFixedCost] = useState<number>(0) // 월 고정비
    const [avgTicketPrice, setAvgTicketPrice] = useState<number>(10000) // 객단가
    const [marginRate, setMarginRate] = useState<number>(0) // 마진율 (%)
    const [targetMonthlyProfit, setTargetMonthlyProfit] = useState<number>(5000000) // 목표 순이익
    const [operatingDays, setOperatingDays] = useState<number>(25) // 영업일수

    // Load settings from Supabase (Single Source of Truth)
    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: settings } = await supabase
            .from("store_settings")
            .select("monthly_fixed_cost")
            .eq("user_id", user.id)
            .single()

        if (settings?.monthly_fixed_cost) {
            setFixedCost(Number(settings.monthly_fixed_cost))
        } else {
            // Fallback to local storage if no DB setting exists
            const savedFixed = localStorage.getItem("bep_fixed_cost")
            if (savedFixed) setFixedCost(Number(savedFixed))
        }

        const savedTicket = localStorage.getItem("bep_ticket_price")
        if (savedTicket) setAvgTicketPrice(Number(savedTicket))
    }

    // Save inputs to Supabase + Local Storage
    const handleSave = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Update Global Store Settings
                const { error } = await supabase
                    .from("store_settings")
                    .upsert({
                        user_id: user.id,
                        monthly_fixed_cost: fixedCost,
                        // Preserve existing target sales if possible, or just upsert partial? 
                        // Note: Upsert needs all non-nullable or PK. store_settings only has these columns.
                        // We should fetch first or use a better upsert strategy. 
                        // Actually, 'upsert' works fine if we don't want to lose 'monthly_target_sales_count'.
                        // However, we don't have target sales here. We should be careful not to overwrite it with NULL.
                        // Let's do an update if exists, or fetch-then-upsert.
                        // Simplest: just update modified_at and fixed_cost.
                    })
                // Better approach: Use .update() if it exists, or .upsert() merging.
                // Since we want to sync across pages, let's just do a specific update for fixed_cost.

                // Let's do a smart upsert:
                const { data: current } = await supabase.from("store_settings").select("*").eq("user_id", user.id).single()

                await supabase.from("store_settings").upsert({
                    user_id: user.id,
                    monthly_fixed_cost: fixedCost,
                    monthly_target_sales_count: current?.monthly_target_sales_count || 1000 // Keep or Default
                })
            }

            localStorage.setItem("bep_fixed_cost", fixedCost.toString())
            localStorage.setItem("bep_ticket_price", avgTicketPrice.toString())
            alert("저장되었습니다. (설정 페이지와 연동됨)")
        } catch (error) {
            console.error("Save failed", error)
            alert("저장 실패")
        }
    }

    // Calculations
    // BEP Sales = (FixedCost + TargetProfit) / (MarginRate / 100)
    const requiredSales = marginRate > 0 ? Math.round((fixedCost + targetMonthlyProfit) / (marginRate / 100)) : 0
    const salesPerDay = operatingDays > 0 ? Math.round(requiredSales / operatingDays) : 0
    const bepSalesOnly = marginRate > 0 ? Math.round(fixedCost / (marginRate / 100)) : 0

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
                <div className="glass-panel p-8 rounded-3xl border border-border">
                    <h1 className="text-3xl font-black italic tracking-tighter text-foreground flex items-center gap-2">
                        <Calculator className="h-8 w-8 text-indigo-500" />
                        손익분기점(BEP) 계산기
                    </h1>
                    <p className="text-sm font-black text-muted-foreground uppercase tracking-widest mt-2">
                        우리 매장은 얼마를 팔아야 본전일까요? 고정비를 입력하여 확인해보세요.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* 입력 섹션 */}
                    <Card className="glass-panel border border-border shadow-none overflow-hidden">
                        <CardHeader className="p-6 border-b border-border bg-muted/30">
                            <CardTitle className="flex items-center gap-2 text-foreground font-black italic">
                                <Calculator className="h-5 w-5 text-indigo-500" />
                                매장 비용 입력
                            </CardTitle>
                            <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">월 고정 지출과 마진율을 입력하세요.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">월 고정비 합계 (월세 + 인건비 + 관리비)</label>
                                <div className="relative">
                                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                                    <Input
                                        type="number"
                                        className="pl-12 h-12 bg-muted/50 border-border focus:ring-indigo-500/20 text-lg font-black italic"
                                        placeholder="예: 5000000"
                                        value={fixedCost || ""}
                                        onChange={(e) => setFixedCost(Number(e.target.value))}
                                    />
                                </div>
                                <p className="text-[10px] font-black text-muted-foreground/60 uppercase">숨만 쉬어도 나가는 돈의 총합입니다.</p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">평균 객단가 (1인당 결제금액)</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                                    <Input
                                        type="number"
                                        className="pl-12 h-12 bg-muted/50 border-border focus:ring-indigo-500/20 text-lg font-black italic"
                                        placeholder="예: 10000"
                                        value={avgTicketPrice || ""}
                                        onChange={(e) => setAvgTicketPrice(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">평균 마진율 (%)</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        className="h-12 bg-muted/50 border-border focus:ring-indigo-500/20 text-lg font-black italic"
                                        value={marginRate}
                                        onChange={(e) => setMarginRate(Number(e.target.value))}
                                    />
                                    <Button variant="outline" className="h-12 px-6 font-black uppercase tracking-widest text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10" onClick={() => setMarginRate(Math.round(summary.avgMarginRate || 30))}>
                                        자동 가져오기
                                    </Button>
                                </div>
                                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
                                    대시보드 기준 현재 마진율: {summary.avgMarginRate ? Math.round(summary.avgMarginRate) : 0}%
                                </p>
                            </div>

                            <Button className="w-full h-12 mt-4 font-black text-sm uppercase tracking-[0.2em] bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20" onClick={handleSave}>
                                매장 기본 고정비 저장
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Simulation Section */}
                    <Card className="glass-panel border border-indigo-500/20 bg-indigo-500/[0.02] shadow-none overflow-hidden">
                        <CardHeader className="p-6 border-b border-indigo-500/10 bg-indigo-500/5">
                            <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black italic">
                                <Target className="h-5 w-5" />
                                수익 시뮬레이션
                            </CardTitle>
                            <CardDescription className="text-xs font-bold text-indigo-600/60 dark:text-indigo-400/60 uppercase tracking-widest">목표 수익을 달성하기 위한 판매량을 계산합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">희망 월 순이익</label>
                                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 italic">{(targetMonthlyProfit / 10000).toLocaleString()}만원</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="50000000"
                                    step="1000000"
                                    value={targetMonthlyProfit}
                                    onChange={(e) => setTargetMonthlyProfit(Number(e.target.value))}
                                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-indigo-600"
                                />
                                <p className="text-[9px] text-muted-foreground/60 font-black uppercase tracking-widest">STEP: 100만원 단위</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">월 영업 일수</label>
                                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 italic">{operatingDays}일</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="31"
                                    step="1"
                                    value={operatingDays}
                                    onChange={(e) => setOperatingDays(Number(e.target.value))}
                                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-indigo-600"
                                />
                                <p className="text-[9px] text-muted-foreground/60 font-black uppercase tracking-widest text-right">정기 휴무를 제외한 영업일</p>
                            </div>

                            <div className="p-6 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 mt-8 relative overflow-hidden group">
                                <Rocket className="absolute -right-6 -top-6 h-32 w-32 text-indigo-500/10 -rotate-12 transition-transform duration-1000 group-hover:scale-110 group-hover:-rotate-45" />
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">PRO INSIGHT</p>
                                    <p className="text-base font-bold text-foreground leading-relaxed italic">
                                        현재 마진율(<span className="text-indigo-600 dark:text-indigo-400">{marginRate}%</span>)을 유지할 때, <br />
                                        매일 평균 <span className="text-indigo-600 dark:text-indigo-400 font-black underline underline-offset-4 decoration-indigo-500/30">{(salesPerDay / 10000).toFixed(1)}만원</span> 이상 매출 발생 시 목표 수익이 달성됩니다.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 결과 섹션 */}
                    <Card className="md:col-span-2 glass-panel border border-border shadow-2xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-1000">
                            <TrendingUp className="h-48 w-48 text-indigo-500" />
                        </div>
                        <CardHeader className="p-8 border-b border-border bg-muted/30">
                            <CardTitle className="text-2xl font-black italic text-foreground flex items-center gap-3">
                                <TrendingUp className="h-8 w-8 text-indigo-500" />
                                경영 지표 분석 리포트
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid md:grid-cols-2 divide-x divide-border">
                                <div className="p-10 space-y-10">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">본전(BEP) 매출액</p>
                                        <div className="text-4xl font-black text-foreground italic tracking-tighter">
                                            {bepSalesOnly.toLocaleString()}<span className="text-sm font-black ml-2 text-muted-foreground uppercase opacity-50">원 / 월</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4 pt-10 border-t border-border">
                                        <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                            <Target className="h-4 w-4" /> 목표 달성 매출액 (월 매출 목표)
                                        </p>
                                        <div className="text-6xl font-black text-indigo-600 dark:text-indigo-400 italic tracking-tighter">
                                            {requiredSales.toLocaleString()}<span className="text-xl font-black ml-3 text-indigo-500/50">원</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-10 bg-indigo-500/[0.03] space-y-10">
                                    <div className="flex justify-between items-center group/item transition-all">
                                        <div>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">일 평균 목표 매출</p>
                                            <p className="text-3xl font-black text-foreground italic">{salesPerDay.toLocaleString()}원</p>
                                        </div>
                                        <div className="h-14 w-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-indigo-500 group-hover/item:border-indigo-500/50 transition-all">
                                            <Banknote className="h-7 w-7" />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center group/item transition-all">
                                        <div>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">일 평균 목표 판매수량</p>
                                            <p className="text-3xl font-black text-foreground italic">
                                                {avgTicketPrice > 0 ? Math.ceil(salesPerDay / avgTicketPrice) : 0}<span className="text-sm font-black ml-2 text-muted-foreground uppercase opacity-50">그릇</span>
                                            </p>
                                        </div>
                                        <div className="h-14 w-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-indigo-500 group-hover/item:border-indigo-500/50 transition-all">
                                            <Users className="h-7 w-7" />
                                        </div>
                                    </div>

                                    <div className="bg-indigo-600/10 p-5 rounded-2xl border border-indigo-500/20 backdrop-blur-sm">
                                        <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase leading-relaxed tracking-wider">
                                            * 본 리포트는 입력된 고정비({fixedCost.toLocaleString()}원)와 <br />
                                            희망 수익({targetMonthlyProfit.toLocaleString()}원)을 기준으로 자동 계산되었습니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    )
}
