"use client"

import { useState, useEffect, useMemo } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { getMenuPerformance, MenuPerformance, MatrixMetrics } from "@/lib/api/menu-analytics"
import { useStore } from "@/contexts/StoreContext"
import { Star, Zap, Search, Trash2, TrendingUp, Info, ChevronRight, BarChart3, Target, Rocket } from "lucide-react"
import { cn } from "@/lib/utils"
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard"

export default function MenuEngineeringPage() {
    const { activeStore } = useStore()
    const [performance, setPerformance] = useState<MenuPerformance[]>([])
    const [metrics, setMetrics] = useState<MatrixMetrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedQuadrant, setSelectedQuadrant] = useState<'all' | 'star' | 'plowhorse' | 'puzzle' | 'dog'>('all')

    useEffect(() => {
        if (activeStore?.id) {
            loadData()
        }
    }, [activeStore?.id])

    const loadData = async () => {
        if (!activeStore?.id) return
        try {
            setLoading(true)
            const { data, metrics: m } = await getMenuPerformance(30, activeStore.id)
            setPerformance(data)
            setMetrics(m)
        } catch (e: any) {
            console.error("Menu Engineering load failed full object:", e)
            // Error objects often have non-enumerable properties like 'message'
            const errorMsg = e.message || e.code || (typeof e === 'object' ? JSON.stringify(e, Object.getOwnPropertyNames(e)) : String(e))
            alert(`분석 데이터를 불러오지 못했습니다:\n${errorMsg}\n\n${e.details || ""}`)
        } finally {
            setLoading(false)
        }
    }

    const filteredData = useMemo(() => {
        if (selectedQuadrant === 'all') return performance
        return performance.filter(p => p.quadrant === selectedQuadrant)
    }, [performance, selectedQuadrant])

    const quadrants = {
        star: {
            title: "STARS (스타)",
            description: "인기 폭발 & 수익성 최고! 매장의 주인공입니다.",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
            icon: <Star className="h-5 w-5" />,
            strategy: "홍보를 더욱 강화하고 SNS 노출을 늘리세요. 현재 품질을 유지하는 것이 가장 중요합니다."
        },
        plowhorse: {
            title: "PLOWHORSES (워크호스)",
            description: "인기는 많지만 남는 게 별로 없어요.",
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            icon: <Zap className="h-5 w-5" />,
            strategy: "레시피를 개선하여 원가를 낮추거나, 가격을 소폭 인상하여 수익성을 확보해야 합니다."
        },
        puzzle: {
            title: "PUZZLES (퍼즐)",
            description: "수익은 좋은데 왜 안 팔릴까요?",
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
            icon: <Search className="h-5 w-5" />,
            strategy: "메뉴 이름을 매력적으로 바꾸거나, 세트 메뉴로 묶어서 추천 메뉴로 밀어보세요."
        },
        dog: {
            title: "DOGS (독)",
            description: "고민이 필요한 메뉴입니다.",
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            border: "border-rose-500/20",
            icon: <Trash2 className="h-5 w-5" />,
            strategy: "메뉴판에서 제외하거나, 식재료를 다른 메뉴와 공유하여 재고 부담을 줄여야 합니다."
        }
    }

    if (loading) return (
        <AppLayout>
            <div className="flex h-[60vh] items-center justify-center">
                <p className="animate-pulse text-slate-500 font-black uppercase tracking-widest">분석 엔진 가동 중...</p>
            </div>
        </AppLayout>
    )

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-foreground italic uppercase">메뉴 공학 매트릭스 (MENU ENGINEERING)</h1>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1 ml-0.5">최근 30일 데이터를 기준으로 메뉴의 수익성과 인기를 분석합니다.</p>
                    </div>
                    <Button onClick={loadData} variant="ghost" size="sm" className="font-black text-[10px] uppercase tracking-widest px-8 h-12 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all rounded-xl">
                        분석 새로고침
                    </Button>
                </div>

                {/* 2x2 Matrix Overview */}
                <CollapsibleCard
                    title="메뉴 공학 매트릭스 (Menu Engineering Matrix)"
                    description="수익성과 인기(판매량)를 기준으로 분류된 4사분면 요약입니다."
                    icon={<Target className="h-4 w-4 text-primary" />}
                    storageKey="menu-matrix"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(Object.keys(quadrants) as Array<keyof typeof quadrants>).map((key) => {
                            const q = quadrants[key]
                            const count = performance.filter(p => p.quadrant === key).length
                            const profitShare = performance.filter(p => p.quadrant === key).reduce((sum, p) => sum + p.totalProfit, 0)

                            return (
                                <Card
                                    key={key}
                                    className={cn(
                                        "relative overflow-hidden cursor-pointer transition-all border border-border/50 rounded-3xl group glass-panel",
                                        selectedQuadrant === key ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/30"
                                    )}
                                    onClick={() => setSelectedQuadrant(selectedQuadrant === key ? 'all' : key)}
                                >
                                    <CardHeader className="p-6 pb-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className={cn("flex items-center gap-3 font-black italic text-lg uppercase tracking-tighter", q.color)}>
                                                {q.icon}
                                                {q.title}
                                            </div>
                                            <Badge className={cn("font-black px-4 py-1 rounded-full uppercase tracking-widest border-none", q.bg, q.color)}>{count}개 품목</Badge>
                                        </div>
                                        <CardDescription className="text-muted-foreground font-black text-[10px] uppercase tracking-widest opacity-70 italic">{q.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-2">
                                        <div className="flex justify-between items-end mt-4">
                                            <div>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50 mb-1">이익 기여도 (PROFIT CONTRIBUTION)</p>
                                                <p className="text-2xl font-black text-foreground italic tracking-tighter">
                                                    +{Math.round(profitShare / 10000).toLocaleString()}만원 <span className="text-[10px] font-black opacity-30 uppercase tracking-widest ml-1">추정</span>
                                                </p>
                                            </div>
                                            <ChevronRight className={cn("h-6 w-6 text-muted-foreground opacity-20 transition-transform group-hover:translate-x-1", selectedQuadrant === key && "rotate-90 opacity-100 text-primary")} />
                                        </div>
                                    </CardContent>
                                    {selectedQuadrant === key && (
                                        <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                                            <div className="p-4 bg-muted/50 rounded-2xl border border-border/50 shadow-inner">
                                                <p className="text-[10px] font-black text-primary uppercase mb-2 flex items-center gap-2 tracking-[0.2em]">
                                                    <Rocket className="h-3 w-3" /> 전략적 지침 (STRATEGIC DIRECTIVE)
                                                </p>
                                                <p className="text-xs font-black text-foreground leading-relaxed italic opacity-80">"{q.strategy}"</p>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            )
                        })}
                    </div>
                </CollapsibleCard>

                {/* Main Insight Section (Detailed Performance List) */}
                <CollapsibleCard
                    title="전체 메뉴 퍼포먼스 리스트"
                    description="각 메뉴별 가격, 마진, 판매량 및 기여 이익 상세 데이터입니다."
                    icon={<BarChart3 className="h-4 w-4" />}
                    storageKey="menu-details"
                >
                    <div className="glass-panel rounded-3xl overflow-hidden border-none bg-card shadow-none relative">
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                            <BarChart3 className="h-48 w-48 text-primary" />
                        </div>
                        <div className="p-8 border-b border-border bg-muted/20">
                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] italic">
                                분석 기준점 (Analysis Threshold): <span className="text-foreground border-b border-primary/30 pb-0.5">평균 판매량 {Math.round(metrics?.avgVolume || 0)}</span> | <span className="text-foreground border-b border-primary/30 pb-0.5">평균 마진 {Math.round(metrics?.avgMargin || 0).toLocaleString()}원</span>
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-muted/30 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                    <tr>
                                        <th className="px-8 py-4">구분</th>
                                        <th className="px-8 py-4">메뉴 정보</th>
                                        <th className="px-8 py-4 text-right">판매가</th>
                                        <th className="px-8 py-4 text-right">단위 마진</th>
                                        <th className="px-8 py-4 text-right">판매량</th>
                                        <th className="px-8 py-4 text-right">총 기여 이익</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {filteredData.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground font-black uppercase tracking-widest italic opacity-40">분석 데이터가 없거나 필터 조건에 맞는 메뉴가 없습니다.</td>
                                        </tr>
                                    ) : (
                                        filteredData.map((item) => {
                                            const q = quadrants[item.quadrant as keyof typeof quadrants]
                                            return (
                                                <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1.5 border border-current", q.bg, q.color)}>
                                                            {q.icon}
                                                            {item.quadrant}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="font-black text-foreground italic tracking-tight">{item.name}</div>
                                                        <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-50">{item.category}</div>
                                                    </td>
                                                    <td className="px-8 py-5 text-right font-mono text-xs text-muted-foreground">
                                                        {item.sellingPrice.toLocaleString()}원
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <div className="font-black text-foreground italic">{item.margin.toLocaleString()}원</div>
                                                        <div className="text-[9px] text-primary font-black uppercase italic">{Math.round(item.marginRate)}% 마진율</div>
                                                    </td>
                                                    <td className="px-8 py-5 text-right font-black text-foreground italic tracking-tighter text-lg">
                                                        {item.salesVolume}
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <div className="text-xl font-black text-foreground italic tracking-tighter">
                                                            {Math.round(item.totalProfit).toLocaleString()}원
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CollapsibleCard>

                {/* Summary Insight */}
                <div className="p-6 bg-indigo-600 rounded-2xl border-0 shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
                    <Rocket className="absolute -right-4 -bottom-4 h-24 w-24 text-white/10 -rotate-12 group-hover:scale-110 transition-transform" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Strategy Final Insight</p>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Info className="h-5 w-5" />
                                현재 매장의 핵심 전략 품목은 <span className="underline decoration-emerald-400 decoration-4 underline-offset-4">스타 메뉴</span>입니다.
                            </h3>
                            <p className="text-sm text-indigo-100">분석 결과, 상위 20%의 메뉴가 전체 수익의 {Math.round(performance.slice(0, Math.ceil(performance.length * 0.2)).reduce((sum, p) => sum + p.totalProfit, 0) / (performance.reduce((sum, p) => sum + p.totalProfit, 0) || 1) * 100)}%를 담당하고 있습니다.</p>
                        </div>
                        <Button className="bg-white text-indigo-600 hover:bg-slate-50 font-black text-xs uppercase tracking-widest px-8">
                            수익 개선 시뮬레이션 가기
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}
