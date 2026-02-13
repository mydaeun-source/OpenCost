import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Sparkles, ArrowRight, DollarSign, Repeat } from "lucide-react"
import { cn, formatNumber } from "@/lib/utils"

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
    noWrapper?: boolean
}

export function SourcingOptimizationCard({ opportunities, noWrapper = false }: SourcingOptimizationCardProps) {
    const topOpportunities = opportunities.slice(0, 3)

    const content = (
        <CardContent className={cn("space-y-4", noWrapper ? "p-0" : "")}>
            {topOpportunities.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs font-bold italic">
                    비교 가능한 복수 공급처 데이터가 부족합니다.<br />다양한 곳에서 매입 데이터를 기록해 보세요!
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-3">
                    {topOpportunities.map(opp => (
                        <div key={opp.ingredientId} className="group relative p-4 bg-muted/20 dark:bg-slate-900 rounded-2xl border border-border shadow-sm transition-all hover:bg-primary/5">
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <p className="text-sm font-black text-foreground">{opp.name}</p>
                                    <div className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase">
                                        {formatNumber(opp.savingPercent)}% 절감
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 opacity-50">
                                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                                        <p className="text-[10px] font-bold text-muted-foreground truncate">{opp.currentWorstSupplier}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ArrowRight className="h-3 w-3 text-primary animate-pulse" />
                                        <p className="text-xs font-black text-primary truncate">{opp.bestSupplier}</p>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-border flex justify-between items-end">
                                    <div>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase">단위당 절감액</p>
                                        <p className="text-lg font-black text-foreground italic">
                                            {formatNumber(opp.potentialSavingPerUnit)}<span className="text-[10px] whitespace-nowrap not-italic ml-0.5">원</span>
                                        </p>
                                    </div>
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <DollarSign className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {topOpportunities.length > 0 && (
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                    <p className="text-[10px] font-bold text-primary leading-relaxed text-center">
                        💡 **{topOpportunities[0].bestSupplier}**에서 **{topOpportunities[0].name}**을(를) 구매하시면 평소보다 약 {formatNumber(topOpportunities[0].bestPrice)}원에 매입이 가능합니다.
                    </p>
                </div>
            )}
        </CardContent>
    );

    if (noWrapper) return content;

    return (
        <Card className="border-none shadow-none bg-primary/[0.03] mb-6">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-primary uppercase flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    지능형 소싱 제안 (구매 분석)
                </CardTitle>
                <CardDescription className="text-xs font-bold">과거 매입 데이터를 분석하여 최적의 공급처를 추천합니다.</CardDescription>
            </CardHeader>
            {content}
        </Card>
    )
}
