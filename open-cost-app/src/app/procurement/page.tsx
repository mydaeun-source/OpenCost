"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { getPurchases, getPurchaseDetails, Purchase } from "@/lib/api/procurement"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Badge } from "@/components/ui/Badge"
import { PurchaseForm } from "@/components/procurement/PurchaseForm"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns"
import { ko } from "date-fns/locale"
import { Plus, ShoppingBag, Calendar, ChevronRight, ChevronDown, Package, TrendingUp, Store } from "lucide-react"
import { cn, formatNumber } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard"
import { useStore } from "@/contexts/StoreContext"

type Period = 'day' | 'week' | 'month' | 'quarter' | 'year'

export default function ProcurementPage() {
    const { activeStore } = useStore()
    const [purchases, setPurchases] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('month')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [details, setDetails] = useState<Record<string, any>>({})
    const { toast } = useToast()

    const fetchPurchases = async () => {
        if (!activeStore?.id) return

        setLoading(true)
        try {
            let start: Date, end: Date
            const now = new Date()

            switch (selectedPeriod) {
                case 'day': start = startOfDay(now); end = endOfDay(now); break
                case 'week': start = startOfWeek(now, { weekStartsOn: 1 }); end = endOfWeek(now, { weekStartsOn: 1 }); break
                case 'month': start = startOfMonth(now); end = endOfMonth(now); break
                case 'quarter': start = startOfQuarter(now); end = endOfQuarter(now); break
                case 'year': start = startOfYear(now); end = endOfYear(now); break
                default: start = startOfMonth(now); end = endOfMonth(now)
            }

            // Pass activeStore.id as 3rd argument
            const data = await getPurchases(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'), activeStore.id)
            setPurchases(data || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (activeStore?.id) {
            fetchPurchases()
        }
    }, [selectedPeriod, activeStore?.id]) // Depend on store ID

    const totalAmount = purchases.reduce((sum, p) => sum + Number(p.total_amount), 0)
    const topSupplier = purchases.length > 0
        ? Object.entries(purchases.reduce((acc, p) => ({ ...acc, [p.supplier_name || '미지정']: (acc[p.supplier_name || '미지정'] || 0) + Number(p.total_amount) }), {} as any))
            .sort((a, b) => (b[1] as number) - (a[1] as number))[0][0]
        : '-'

    const toggleExpand = async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null)
            return
        }
        setExpandedId(id)
        if (!details[id]) {
            try {
                const data = await getPurchaseDetails(id)
                setDetails(prev => ({ ...prev, [id]: data }))
            } catch (err) {
                console.error(err)
            }
        }
    }

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-6 pb-20">
                <div className="glass-panel p-8 rounded-3xl border border-border">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-foreground italic flex items-center gap-3">
                                <ShoppingBag className="h-8 w-8 text-indigo-500" />
                                매입 관리 (PROCUREMENT)
                            </h1>
                            <p className="text-muted-foreground mt-1 font-medium">상세 기간별 매입 분석 및 재고 입고를 관리합니다.</p>
                        </div>
                        <Button onClick={() => setIsAddOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 h-14 px-8 rounded-2xl font-black text-lg transition-all hover:scale-105">
                            <Plus className="mr-2 h-5 w-5" />
                            새 매입 등록
                        </Button>
                    </div>
                </div>

                {/* Period Selector */}
                <div className="flex flex-wrap items-center gap-2 p-1 bg-muted/30 rounded-2xl w-fit border border-border">
                    {(['day', 'week', 'month', 'quarter', 'year'] as Period[]).map((p) => (
                        <Button
                            key={p}
                            variant={selectedPeriod === p ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setSelectedPeriod(p)}
                            className={cn(
                                "rounded-xl px-6 py-2 transition-all duration-200 text-xs font-black uppercase tracking-widest",
                                selectedPeriod === p
                                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xl border border-border"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {p === 'day' ? '오늘' : p === 'week' ? '이번주' : p === 'month' ? '이번달' : p === 'quarter' ? '이번 분기' : '올해'}
                        </Button>
                    ))}
                </div>

                {/* Analytics Summary */}
                <CollapsibleCard
                    title="매입 분석 요약"
                    description="선택한 기간의 매입 총액 및 주요 지표입니다."
                    icon={<TrendingUp className="h-4 w-4" />}
                    storageKey="proc-summary"
                    className="w-full"
                >
                    <div className="grid gap-6 md:grid-cols-3">
                        <Card className="glass-panel border-none shadow-none group transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-xs font-black text-indigo-500 uppercase tracking-widest">총 매입액</CardTitle>
                                <ShoppingBag className="h-4 w-4 text-indigo-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-foreground italic tracking-tighter">{formatNumber(totalAmount)}원</div>
                                <p className="text-[10px] font-black text-muted-foreground mt-2 bg-muted/50 w-fit px-2 py-0.5 rounded uppercase flex items-center">
                                    <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
                                    {purchases.length}건의 매입 기록
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="glass-panel border-none shadow-none group transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-xs font-black text-emerald-500 uppercase tracking-widest">최다 공급처</CardTitle>
                                <Store className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-foreground italic tracking-tighter truncate">{topSupplier}</div>
                                <p className="text-[10px] font-black text-muted-foreground mt-2 bg-muted/50 w-fit px-2 py-0.5 rounded uppercase">거래 비중이 가장 높은 업체</p>
                            </CardContent>
                        </Card>

                        <Card className="glass-panel border-none shadow-none group transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-xs font-black text-amber-500 uppercase tracking-widest">매입 건수</CardTitle>
                                <Calendar className="h-4 w-4 text-amber-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-foreground italic tracking-tighter">{purchases.length}건</div>
                                <p className="text-[10px] font-black text-muted-foreground mt-2 bg-muted/50 w-fit px-2 py-0.5 rounded uppercase">선택 기간 데이터</p>
                            </CardContent>
                        </Card>
                    </div>
                </CollapsibleCard>

                {/* Purchases List */}
                <div className="grid gap-4">
                    {loading && purchases.length === 0 ? (
                        <div className="text-center py-20 opacity-50 flex flex-col items-center">
                            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                            <p className="font-black text-muted-foreground italic uppercase tracking-widest text-sm">데이터를 불러오고 있습니다...</p>
                        </div>
                    ) : purchases.length === 0 ? (
                        <Card className="text-center py-20 border-dashed border-2 border-border bg-muted/10 rounded-3xl">
                            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-10" />
                            <p className="text-muted-foreground font-black text-lg">선택된 기간에 매입 내역이 없습니다.</p>
                            <p className="text-xs text-muted-foreground mt-1 font-bold">필터를 조정하거나 새로운 매입 내역을 등록해 보세요.</p>
                        </Card>
                    ) : (
                        purchases.map(purchase => (
                            <Card key={purchase.id} className="overflow-hidden glass-panel border border-border shadow-sm hover:border-indigo-500 transition-all rounded-3xl">
                                <div
                                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                                    onClick={() => toggleExpand(purchase.id)}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "h-14 w-14 rounded-2xl flex items-center justify-center transition-all shadow-xl",
                                            expandedId === purchase.id ? "bg-indigo-600 text-white shadow-indigo-600/30" : "bg-muted text-indigo-600"
                                        )}>
                                            {expandedId === purchase.id ? <ChevronDown className="h-7 w-7" /> : <ChevronRight className="h-7 w-7" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-black text-xl text-foreground italic">{purchase.supplier_name || "미지정 공급처"}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(purchase.purchase_date), "yyyy년 MM월 dd일", { locale: ko })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 italic">
                                            {formatNumber(purchase.total_amount)}<span className="text-xs font-bold ml-1 opacity-50">원</span>
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                            입고 완료
                                        </div>
                                    </div>
                                </div>

                                {expandedId === purchase.id && (
                                    <CardContent className="border-t border-border bg-muted/20 p-8 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="text-sm font-black flex items-center gap-2 text-foreground uppercase tracking-widest">
                                                <Package className="h-4 w-4 text-indigo-500" />
                                                매입 상세 명세 (INVOICE)
                                            </h4>
                                        </div>

                                        {!details[purchase.id] ? (
                                            <div className="py-8 text-center">
                                                <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="grid gap-4">
                                                    {details[purchase.id].items.map((item: any) => (
                                                        <div key={item.id} className="p-5 glass-panel bg-card rounded-2xl border border-border flex justify-between items-center group transition-all hover:translate-x-2">
                                                            <div className="flex items-center gap-5">
                                                                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-500 transition-all shadow-sm">
                                                                    <Package className="h-5 w-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-foreground text-lg italic">{item.ingredients?.name}</p>
                                                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                                                        {formatNumber(item.price)}원 / {item.ingredients?.purchase_unit}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                                                                    {formatNumber(item.quantity)} {item.ingredients?.purchase_unit}
                                                                </span>
                                                                <p className="font-black text-xl mt-1 tracking-tighter text-foreground italic">{formatNumber(item.price * item.quantity)}원</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex justify-between items-center p-8 bg-indigo-600 dark:bg-indigo-700 text-white rounded-3xl shadow-2xl shadow-indigo-600/30 border-none relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-12 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-white/20 transition-all duration-500" />
                                                    <div className="relative z-10">
                                                        <p className="text-[10px] uppercase font-black text-white/50 tracking-widest bg-white/10 px-3 py-1 rounded-full w-fit mb-2">총 매입 합계 (TOTAL AMOUNT)</p>
                                                        <p className="text-xs font-medium text-white/70">결제 및 입고가 완료된 합산 금액입니다.</p>
                                                    </div>
                                                    <div className="text-4xl font-black italic tracking-tighter relative z-10">
                                                        {formatNumber(purchase.total_amount)}<span className="text-lg font-bold ml-1 opacity-50 text-white">원</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        ))
                    )}
                </div>

                <Dialog
                    isOpen={isAddOpen}
                    onClose={() => setIsAddOpen(false)}
                    maxWidth="max-w-2xl"
                    title="새 매입서 등록"
                    description="공급처 및 상세 구매 품목을 기록하세요. 단가는 가장 최근 매입가를 기준으로 자동 제안됩니다."
                >
                    <PurchaseForm
                        onSuccess={() => {
                            setIsAddOpen(false)
                            fetchPurchases()
                        }}
                        onCancel={() => setIsAddOpen(false)}
                    />
                </Dialog>
            </div>
        </AppLayout>
    )
}
