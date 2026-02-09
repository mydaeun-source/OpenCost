import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Sparkles, ArrowRight, DollarSign, Repeat } from "lucide-react"

interface SourcingOpportunity {
    ingredientId: string
    name: string
    bestSupplier: string
    bestPrice: number
    currentWorstSupplier: string
    potentialSavingPerUnit: number
    savingPercent: number
}

interface SourcingOptimizationCardProps {
    opportunities: SourcingOpportunity[]
}

export function SourcingOptimizationCard({ opportunities }: SourcingOptimizationCardProps) {
    const topOpportunities = opportunities.slice(0, 3)

    return (
        <Card className="border-2 border-indigo-500/20 bg-indigo-500/[0.02] mb-6">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-indigo-500 uppercase flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    지능형 소싱 제안 (Sourcing Insights)
                </CardTitle>
                <CardDescription className="text-xs font-bold">과거 매입 데이터를 분석하여 최적의 공급처를 추천합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {topOpportunities.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold italic">
                        비교 가능한 복수 공급처 데이터가 부족합니다.<br />다양한 곳에서 매입 데이터를 기록해 보세요!
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                        {topOpportunities.map(opp => (
                            <div key={opp.ingredientId} className="group relative p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 transition-all hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-black text-slate-800 dark:text-slate-100">{opp.name}</p>
                                        <div className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">
                                            {opp.savingPercent}% SAVING
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 opacity-40">
                                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                            <p className="text-[10px] font-bold text-slate-500 truncate">{opp.currentWorstSupplier}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ArrowRight className="h-3 w-3 text-indigo-500 animate-pulse" />
                                            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 truncate">{opp.bestSupplier}</p>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-end">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase">단위당 절감액</p>
                                            <p className="text-lg font-black text-slate-900 dark:text-slate-100 italic">
                                                {opp.potentialSavingPerUnit.toLocaleString()}<span className="text-[10px] whitespace-nowrap not-italic ml-0.5">원</span>
                                            </p>
                                        </div>
                                        <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                                            <DollarSign className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {topOpportunities.length > 0 && (
                    <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 leading-relaxed text-center">
                            💡 **{topOpportunities[0].bestSupplier}**에서 **{topOpportunities[0].name}**을(를) 구매하시면 평소보다 약 {topOpportunities[0].bestPrice.toLocaleString()}원에 매입이 가능합니다.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
