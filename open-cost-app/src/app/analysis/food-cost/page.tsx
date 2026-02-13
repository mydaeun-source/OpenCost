"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useIngredients, Ingredient } from "@/hooks/useIngredients"
import { TrendingUp, Calendar, ChevronRight, Info, Plus, Search, Filter } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { cn, formatNumber } from "@/lib/utils"

// Sample data for price trend if real data is missing
const TREND_DATA = [
    { date: "2025.05.01", price: 980 },
    { date: "2025.05.02", price: 1000 },
    { date: "2025.05.03", price: 950 },
    { date: "2025.05.04", price: 1020 },
    { date: "2025.05.05", price: 1080 },
    { date: "2025.05.06", price: 1030 },
    { date: "2025.05.07", price: 1100 },
    { date: "2025.05.08", price: 1050 },
]

export default function FoodCostDashboard() {
    const { ingredients, loading } = useIngredients()
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const selectedIng = ingredients.find(i => i.id === selectedId) || ingredients[0]

    return (
        <AppLayout>
            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-theme(spacing.32))] gap-6 animate-in fade-in duration-500">
                {/* 1. Sidebar/List: Ingredients */}
                <aside className="w-full lg:w-80 flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="분석할 재료명을 입력하세요"
                            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-black"
                        />
                    </div>

                    <Card className="flex-1 overflow-hidden flex flex-col border border-border shadow-none rounded-2xl bg-card glass-panel min-h-[400px]">
                        <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">식자재 마스터 리스트</span>
                            <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {ingredients.map((ing) => (
                                <button
                                    key={ing.id}
                                    onClick={() => setSelectedId(ing.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group text-left border",
                                        selectedIng?.id === ing.id
                                            ? "bg-primary/10 border-primary/30 shadow-sm"
                                            : "hover:bg-muted/50 border-transparent hover:border-border/50"
                                    )}
                                >
                                    <div className="h-10 w-10 rounded-lg bg-muted border border-border flex-shrink-0 flex items-center justify-center overflow-hidden font-black text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                        {ing.name[0]}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className={cn(
                                            "font-black text-sm truncate tracking-tight transition-colors",
                                            selectedIng?.id === ing.id ? "text-primary italic" : "text-foreground"
                                        )}>{ing.name}</p>
                                        <p className="text-[9px] text-muted-foreground font-black mt-0.5 opacity-60">
                                            {(ing as any).origin || "원산지"} • {(ing as any).storage_method || "보관방법"}
                                        </p>
                                    </div>
                                    <ChevronRight className={cn(
                                        "h-4 w-4 transition-all",
                                        selectedIng?.id === ing.id ? "text-primary translate-x-1" : "text-border opacity-0 group-hover:opacity-100"
                                    )} />
                                </button>
                            ))}
                        </div>
                    </Card>
                </aside>

                {/* 2. Main Content */}
                <main className="flex-1 flex flex-col gap-6 overflow-y-visible pr-2 custom-scrollbar">
                    {selectedIng ? (
                        <>
                            {/* Main Header: Spec Card */}
                            <Card className="glass-panel border-none shadow-none rounded-3xl bg-card">
                                <div className="p-8 flex flex-col md:flex-row gap-8 relative items-center md:items-start text-center md:text-left">
                                    <div className="h-28 w-28 rounded-2xl bg-muted border border-border flex-shrink-0 flex items-center justify-center text-4xl shadow-inner font-black text-muted-foreground italic tracking-tighter">
                                        {selectedIng.name[0]}
                                    </div>

                                    <div className="flex-1 space-y-8 w-full">
                                        <div>
                                            <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                                                <h2 className="text-4xl font-black italic tracking-tighter text-foreground">{selectedIng.name}</h2>
                                                {(selectedIng as any).category?.name && (
                                                    <Badge className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full border border-primary/20">
                                                        {(selectedIng as any).category.name}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-muted-foreground text-[11px] font-black opacity-70">
                                                <span className="bg-muted px-2 py-0.5 rounded">구매 단위: {selectedIng.purchase_unit}</span>
                                                <span className="bg-muted px-2 py-0.5 rounded">조리 규격: {selectedIng.usage_unit}</span>
                                                <span className="bg-muted px-2 py-0.5 rounded">고유 코드: {selectedIng.id.substring(0, 8)}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                                            <div className="p-6 rounded-3xl bg-muted/40 border-2 border-border/10 group hover:border-primary/50 transition-all flex flex-col gap-3 min-h-[140px]" style={{ minHeight: '140px' }}>
                                                <p className="text-xs font-black text-muted-foreground opacity-90">구매 단가</p>
                                                <p className="text-3xl font-black text-foreground tracking-tight">{formatNumber(selectedIng.purchase_price)}원</p>
                                                <p className="text-[11px] text-muted-foreground font-bold mt-auto leading-tight">{selectedIng.purchase_unit} 당 기준 가격</p>
                                            </div>
                                            <div className="p-6 rounded-3xl bg-primary/10 border-2 border-primary/20 group hover:border-primary transition-all flex flex-col gap-3 min-h-[140px]" style={{ minHeight: '140px' }}>
                                                <p className="text-xs font-black text-primary opacity-90">실질 계산 단가</p>
                                                <p className="text-3xl font-black text-primary tracking-tight">
                                                    {formatNumber(((selectedIng.purchase_price || 0) / (selectedIng.conversion_factor || 1)) / (1 - (selectedIng.loss_rate || 0)))}원
                                                </p>
                                                <p className="text-[11px] text-primary/70 font-bold mt-auto leading-tight">{selectedIng.usage_unit} 당 실물 단가</p>
                                            </div>
                                            <div className="p-6 rounded-3xl bg-muted/40 border-2 border-border/10 group hover:border-rose-500/50 transition-all flex flex-col gap-3 min-h-[140px]" style={{ minHeight: '140px' }}>
                                                <p className="text-xs font-black text-rose-500 opacity-90">재료 로스율</p>
                                                <p className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{((selectedIng.loss_rate || 0) * 100).toFixed(1)}%</p>
                                                <p className="text-[11px] text-muted-foreground font-bold mt-auto leading-tight">예상 수율: {(100 - (selectedIng.loss_rate || 0) * 100).toFixed(1)}%</p>
                                            </div>
                                            <div className="p-6 rounded-3xl bg-muted/40 border-2 border-border/10 group hover:border-indigo-500/50 transition-all flex flex-col gap-3 min-h-[140px]" style={{ minHeight: '140px' }}>
                                                <p className="text-xs font-black text-indigo-500 opacity-90">단위 환산 비율</p>
                                                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">1:{formatNumber(selectedIng.conversion_factor)} {selectedIng.usage_unit}</p>
                                                <p className="text-[11px] text-muted-foreground font-bold mt-auto leading-tight">구매 대비 조리 비율</p>
                                            </div>
                                            <div className="p-6 rounded-3xl bg-muted/40 border-2 border-border/10 group hover:border-amber-500/50 transition-all flex flex-col gap-3 min-h-[140px] sm:col-span-full lg:col-auto" style={{ minHeight: '140px' }}>
                                                <p className="text-xs font-black text-amber-500 opacity-90">현재 재고 현황</p>
                                                <p className={cn(
                                                    "text-3xl font-black tracking-tight",
                                                    (selectedIng.current_stock || 0) <= (selectedIng.safety_stock || 0) ? "text-rose-500" : "text-emerald-500"
                                                )}>
                                                    {formatNumber(selectedIng.current_stock)}
                                                    <span className="text-base font-bold ml-1 opacity-60">/{formatNumber(selectedIng.safety_stock)}</span>
                                                </p>
                                                <p className="text-[11px] text-muted-foreground font-bold mt-auto leading-tight">안전 재고 기준 분석</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* 3. Chart Section: Price Trend */}
                            <Card className="glass-panel border-none shadow-none rounded-3xl bg-card">
                                <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-border/10 bg-muted/10">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xl font-black text-foreground">시장 시세 변동 분석</CardTitle>
                                        <p className="text-xs text-muted-foreground font-bold opacity-80">최근 매입가 추이 및 시장 가격 변동 매트릭스</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" className="h-10 px-5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted">1개월</Button>
                                        <Button variant="ghost" size="sm" className="h-10 px-5 rounded-xl text-xs font-bold bg-primary/20 text-primary border border-primary/30">3개월</Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <div className="h-[350px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={TREND_DATA}>
                                                <defs>
                                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.3} />
                                                <XAxis
                                                    dataKey="date"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontWeight: 800 }}
                                                    dy={10}
                                                />
                                                <YAxis hide />
                                                <Tooltip
                                                    content={({ active, payload }: any) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="bg-background/95 p-4 rounded-2xl shadow-2xl border border-primary/30">
                                                                    <p className="text-xs font-bold text-muted-foreground mb-1">{payload[0].payload.date}</p>
                                                                    <p className="text-2xl font-black text-primary">{formatNumber(payload[0].value as number)}원</p>
                                                                </div>
                                                            )
                                                        }
                                                        return null
                                                    }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="price"
                                                    stroke="var(--primary)"
                                                    strokeWidth={6}
                                                    fillOpacity={1}
                                                    fill="url(#colorPrice)"
                                                    activeDot={{ r: 8, strokeWidth: 4, stroke: 'var(--background)', fill: 'var(--primary)' }}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 4. Data Table: Purchase History */}
                            <Card className="glass-panel border-none shadow-none rounded-3xl bg-card">
                                <div className="px-8 py-6 border-b border-border/10 bg-muted/20 flex items-center justify-between">
                                    <CardTitle className="text-xl font-black text-foreground">최근 매입 이력 장부</CardTitle>
                                    <Button variant="ghost" size="sm" className="text-xs font-black text-primary group underline-offset-4 hover:underline">
                                        전체 매입 내역 확인하기 <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/30 border-b border-border/10">
                                            <tr>
                                                <th className="px-8 py-5 text-left text-xs font-black text-muted-foreground">매입 일자</th>
                                                <th className="px-8 py-5 text-left text-xs font-black text-muted-foreground">공급업체</th>
                                                <th className="px-8 py-5 text-left text-xs font-black text-muted-foreground">매입 가격</th>
                                                <th className="px-8 py-5 text-left text-xs font-black text-muted-foreground">상태</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/10">
                                            {[1, 2, 3].map((_, i) => (
                                                <tr key={i} className="hover:bg-muted/30 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <Calendar className="h-4 w-4 text-primary opacity-50" />
                                                            <span className="text-sm font-bold text-foreground font-mono">2025.05.0{8 - i}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-sm font-bold text-muted-foreground">글로벌 식자재 유통 센터</td>
                                                    <td className="px-8 py-6 font-black text-lg text-foreground tracking-tight">{formatNumber(1050 - (i * 20))}원</td>
                                                    <td className="px-8 py-6">
                                                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-black border border-emerald-500/20">정상 입고 완료</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl bg-muted/10 p-20 text-center">
                            <Info className="h-16 w-16 text-slate-200 mb-6" />
                            <h3 className="text-2xl font-black text-slate-400">재료를 선택해주세요</h3>
                            <p className="text-slate-400 mt-2 max-w-sm">왼쪽 목록에서 분석을 원하는 재료를 선택하면 가격 추이와 상세 정보를 확인할 수 있습니다.</p>
                        </div>
                    )}
                </main>
            </div>
        </AppLayout>
    )
}
