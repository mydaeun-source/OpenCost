"use client"

import { useState, useEffect } from "react"
import { fetchMarketPrice, MarketPrice } from "@/lib/api/kamis"
import { TrendingUp, TrendingDown, Minus, Loader2, AlertCircle } from "lucide-react"
import { cn, formatNumber } from "@/lib/utils"

interface MarketPriceCardProps {
    itemCode: string
    categoryCode: string
    myPrice: number // Price per 1kg or 1 unit (matching KAMIS)
    unit: string
    className?: string
}

export function MarketPriceCard({ itemCode, categoryCode, myPrice, unit, className }: MarketPriceCardProps) {
    const [marketData, setMarketData] = useState<MarketPrice | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)
                setError(false)
                const data = await fetchMarketPrice(itemCode, categoryCode)
                if (data) setMarketData(data)
                else setError(true)
            } catch (e) {
                setError(true)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [itemCode, categoryCode])

    if (loading) return (
        <div className={cn("flex items-center gap-2 text-[10px] text-slate-500 font-bold italic animate-pulse", className)}>
            <Loader2 className="h-3 w-3 animate-spin" />
            KAMIS 실시간 시세 조회 중...
        </div>
    )

    if (error || !marketData) return (
        <div className={cn("flex items-center gap-2 text-[10px] text-slate-600 font-bold italic", className)}>
            <AlertCircle className="h-3 w-3" />
            시세 정보 없음 (인증키 확인 필요)
        </div>
    )

    const isCompetitive = myPrice <= marketData.price
    const priceDiff = Math.abs(myPrice - marketData.price)
    const diffPercent = Math.round((priceDiff / (marketData.price || 1)) * 100)

    return (
        <div className={cn("rounded-lg bg-slate-900/50 border border-white/5 p-3 space-y-2 shadow-inner", className)}>
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> KAMIS 시장 평균
                </span>
                <span className="text-[10px] font-medium text-slate-400">{marketData.date} 기준</span>
            </div>

            <div className="flex items-end justify-between">
                <div>
                    <p className="text-lg font-black text-white italic tracking-tighter">
                        {formatNumber(marketData.price)}원 <span className="text-[10px] font-normal opacity-50">/ {marketData.unit}</span>
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                        {marketData.direction === 'up' && <TrendingUp className="h-3 w-3 text-rose-500" />}
                        {marketData.direction === 'down' && <TrendingDown className="h-3 w-3 text-emerald-500" />}
                        {marketData.direction === 'same' && <Minus className="h-3 w-3 text-slate-500" />}
                        <span className={cn(
                            "text-[10px] font-black italic",
                            marketData.direction === 'up' ? "text-rose-500" :
                                marketData.direction === 'down' ? "text-emerald-500" : "text-slate-500"
                        )}>
                            어제보다 {formatNumber(marketData.changePercent)}% {marketData.direction === 'up' ? '상승' : marketData.direction === 'down' ? '하락' : '변동없음'}
                        </span>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">내 매입가 비교</p>
                    {isCompetitive ? (
                        <div className="text-emerald-400 font-black italic text-sm">
                            평균보다 {formatNumber(diffPercent)}% 저렴 <span className="text-[10px]">👍</span>
                        </div>
                    ) : (
                        <div className="text-rose-400 font-black italic text-sm">
                            평균보다 {formatNumber(diffPercent)}% 비쌈 <span className="text-[10px]">⚠️</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
