"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { ForecastItem, getProcurementForecast } from "@/lib/api/procurement-predictor"
import { supabase } from "@/lib/supabase"
import { AlertTriangle, Calendar, ShoppingCart, TrendingDown, Package, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export function ProcurementForecast() {
    const [forecast, setForecast] = useState<ForecastItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchForecast = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const data = await getProcurementForecast(user.id)
                setForecast(data)
            }
            setLoading(false)
        }
        fetchForecast()
    }, [])

    const criticalItems = forecast.filter(item => item.daysRemaining !== null && item.daysRemaining < 7)

    if (loading) return (
        <div className="h-48 flex items-center justify-center bg-slate-900/40 rounded-3xl border border-white/5 animate-pulse">
            <p className="text-muted-foreground">소모 패턴 분석 중...</p>
        </div>
    )

    if (criticalItems.length === 0) return null

    return (
        <Card className="bg-slate-900/60 border-slate-700 shadow-2xl overflow-hidden border-t-4 border-t-amber-500">
            <CardHeader className="bg-amber-500/10 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-black text-amber-500 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            스마트 구매 권장 리스트
                        </CardTitle>
                        <p className="text-xs text-slate-400 mt-1">지난 30일간의 소모 패턴을 분석한 7일 내 구매 필요 품목입니다.</p>
                    </div>
                    <div className="px-3 py-1 bg-amber-500/20 rounded-full text-[10px] font-black text-amber-500 uppercase tracking-widest border border-amber-500/30">
                        Smart AI
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                    {criticalItems.map((item) => (
                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                                    item.daysRemaining! < 3 ? "bg-rose-500/20 text-rose-500" : "bg-amber-500/20 text-amber-500"
                                )}>
                                    <Package className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-black text-slate-100">{item.name}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            <Clock className="h-3 w-3" />
                                            {item.daysRemaining! < 1 ? "오늘 소진 예상" : `${Math.floor(item.daysRemaining!)}일 후 소진 예상`}
                                        </span>
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">
                                            <TrendingDown className="h-3 w-3" />
                                            일평균 {item.avgDailyUsage.toFixed(2)}{item.unit} 소모
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">권장 구매량</p>
                                <div className="flex items-center gap-2 justify-end">
                                    <span className="text-lg font-black text-white italic">
                                        {item.suggestedPurchaseQty.toLocaleString()}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">{item.unit}</span>
                                    <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-lg shadow-indigo-500/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ml-2">
                                        <ShoppingCart className="h-3 w-3" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 bg-slate-950/50 text-center">
                    <button className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
                        <Calendar className="h-3 w-3" />
                        전체 구매 스케줄 보기
                    </button>
                </div>
            </CardContent>
        </Card>
    )
}
