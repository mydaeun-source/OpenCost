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
                        <h1 className="text-3xl font-black tracking-tight text-white italic">MENU ENGINEERING MATRIX</h1>
                        <p className="text-slate-500 font-medium mt-1">최근 30일 데이터를 기준으로 메뉴의 수익성과 인기를 분석합니다.</p>
                    </div>
                    <Button onClick={loadData} variant="outline" size="sm" className="font-black text-[10px] uppercase tracking-widest px-6 h-10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
                        기반 데이터 새로고침
                    </Button>
                </div>

                {/* 2x2 Matrix Overview */}
                <CollapsibleCard
                    title="메뉴 공학 매트릭스 (Menu Engineering Matrix)"
                    description="수익성과 인기(판매량)를 기준으로 분류된 4사분면 요약입니다."
                    icon={<Target className="h-4 w-4" />}
                    storageKey="menu-matrix"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(Object.keys(quadrants) as Array<keyof typeof quadrants>).map((key) => {
                            const q = quadrants[key]
                            const count = performance.filter(p => p.quadrant === key).length
                            const profitShare = performance.filter(p => p.quadrant === key).reduce((sum, p) => sum + p.totalProfit, 0)

                            return (
                                <Card
                                    key={key}
                                    className={cn(
                                        "relative overflow-hidden cursor-pointer transition-all border-none bg-white/5",
                                        selectedQuadrant === key ? "ring-1 ring-white/20 bg-white/10" : "hover:bg-white/10"
                                    )}
                                    onClick={() => setSelectedQuadrant(selectedQuadrant === key ? 'all' : key)}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <div className={cn("flex items-center gap-2 font-black italic", q.color)}>
                                                {q.icon}
                                                {q.title}
                                            </div>
                                            <Badge className={cn("font-black", q.bg, q.color, "border-0")}>{count}개</Badge>
                                        </div>
                                        <CardDescription className="text-slate-500 font-medium">{q.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between items-end mt-2">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Expectation</p>
                                                <p className="text-lg font-black text-white italic">
                                                    +{Math.round(profitShare / 10000).toLocaleString()}만원 <span className="text-[10px] font-normal opacity-50">수익 기여</span>
                                                </p>
                                            </div>
                                            <ChevronRight className={cn("h-5 w-5 opacity-30", selectedQuadrant === key && "rotate-90 opacity-100")} />
                                        </div>
                                    </CardContent>
                                    {selectedQuadrant === key && (
                                        <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                                            <div className="p-4 bg-white/[0.03] rounded-xl border border-white/10">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase mb-2 flex items-center gap-2">
                                                    <Target className="h-3 w-3" /> STRATEGIC ACTION
                                                </p>
                                                <p className="text-xs font-bold text-slate-300 leading-relaxed italic">"{q.strategy}"</p>
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
                    <div className="bg-slate-950/20 rounded-xl overflow-hidden border border-white/5 relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                            <BarChart3 className="h-64 w-64 text-white" />
                        </div>
                        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                            <p className="text-slate-400 text-sm font-medium">
                                임계값: 평균 판매 {Math.round(metrics?.avgVolume || 0)}개, 평균 마진 {Math.round(metrics?.avgMargin || 0).toLocaleString()}원
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Menu Name</th>
                                        <th className="px-6 py-4 text-right">Selling Price</th>
                                        <th className="px-6 py-4 text-right">Unit Margin</th>
                                        <th className="px-6 py-4 text-right">Sales Qty</th>
                                        <th className="px-6 py-4 text-right">Total Profit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredData.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center text-slate-600 font-bold italic">데이터가 충분하지 않거나 해당 필터의 메뉴가 없습니다.</td>
                                        </tr>
                                    ) : (
                                        filteredData.map((item) => {
                                            const q = quadrants[item.quadrant as keyof typeof quadrants]
                                            return (
                                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className={cn("px-2 py-1 rounded text-[10px] font-black uppercase inline-flex items-center gap-1", q.bg, q.color)}>
                                                            {q.icon}
                                                            {item.quadrant}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-200">{item.name}</div>
                                                        <div className="text-[10px] text-slate-500 font-medium">{item.category}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">
                                                        {item.sellingPrice.toLocaleString()}원
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="font-bold text-slate-200">{item.margin.toLocaleString()}원</div>
                                                        <div className="text-[9px] text-indigo-400 font-black">{Math.round(item.marginRate)}% MARGIN</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-white italic">
                                                        {item.salesVolume}개
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="text-lg font-black text-white italic tracking-tighter">
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
                                현재 매장의 핵심 무기는 <span className="underline decoration-emerald-400 decoration-4 underline-offset-4">스타 메뉴</span>입니다.
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
