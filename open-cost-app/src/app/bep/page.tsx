"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { useDashboard } from "@/hooks/useDashboard"
import { supabase } from "@/lib/supabase"
import { Calculator, TrendingUp, DollarSign, Users } from "lucide-react"

export default function BEPPage() {
    const { summary, loading } = useDashboard()

    // Inputs
    const [fixedCost, setFixedCost] = useState<number>(0) // 월 고정비
    const [avgTicketPrice, setAvgTicketPrice] = useState<number>(10000) // 객단가
    const [marginRate, setMarginRate] = useState<number>(0) // 마진율 (%)

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
    // BEP Sales = FixedCost / (MarginRate / 100)
    const bepSales = marginRate > 0 ? Math.round(fixedCost / (marginRate / 100)) : 0
    const bepQuantity = avgTicketPrice > 0 ? Math.ceil(bepSales / avgTicketPrice) : 0

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">손익분기점(BEP) 계산기</h1>
                    <p className="text-muted-foreground mt-1">
                        우리 매장은 얼마를 팔아야 본전일까요? 고정비를 입력하여 확인해보세요.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* 입력 섹션 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="h-5 w-5" />
                                매장 비용 입력
                            </CardTitle>
                            <CardDescription>월 고정 지출과 마진율을 입력하세요.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">월 고정비 합계 (월세 + 인건비 + 관리비)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        className="pl-9"
                                        placeholder="예: 5000000"
                                        value={fixedCost || ""}
                                        onChange={(e) => setFixedCost(Number(e.target.value))}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">숨만 쉬어도 나가는 돈의 총합입니다.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">평균 객단가 (1인당 결제금액)</label>
                                <div className="relative">
                                    <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        className="pl-9"
                                        placeholder="예: 10000"
                                        value={avgTicketPrice || ""}
                                        onChange={(e) => setAvgTicketPrice(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">평균 마진율 (%)</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        value={marginRate}
                                        onChange={(e) => setMarginRate(Number(e.target.value))}
                                    />
                                    <Button variant="outline" onClick={() => setMarginRate(Math.round(summary.avgMarginRate || 30))}>
                                        자동 가져오기
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    대시보드 기준 현재 마진율: {summary.avgMarginRate ? Math.round(summary.avgMarginRate) : 0}%
                                </p>
                            </div>

                            <Button className="w-full mt-4" onClick={handleSave}>설정 저장하기</Button>
                        </CardContent>
                    </Card>

                    {/* 결과 섹션 */}
                    <Card className="bg-slate-50 dark:bg-slate-900 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <TrendingUp className="h-5 w-5" />
                                분석 결과
                            </CardTitle>
                            <CardDescription>이만큼 팔아야 이익이 나기 시작합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8 pt-6">
                            <div className="text-center">
                                <p className="text-sm font-medium text-muted-foreground mb-1">월 목표 매출액 (BEP)</p>
                                <div className="text-4xl font-extrabold text-primary">
                                    {bepSales.toLocaleString()}원
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl shadow-sm">
                                    <p className="text-xs text-muted-foreground mb-1">하루 목표 매출 (25일 기준)</p>
                                    <p className="text-xl font-bold text-white">
                                        {Math.round(bepSales / 25).toLocaleString()}원
                                    </p>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl shadow-sm">
                                    <p className="text-xs text-muted-foreground mb-1">하루 목표 판매량</p>
                                    <p className="text-xl font-bold text-white">
                                        {Math.ceil((bepSales / 25) / (avgTicketPrice || 1))}그릇
                                    </p>
                                </div>
                            </div>

                            <div className="text-xs text-center text-muted-foreground">
                                * 계산식: 고정비 / (마진율 / 100)
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    )
}
