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

type Period = 'day' | 'week' | 'month' | 'quarter' | 'year'

export default function ProcurementPage() {
    const [purchases, setPurchases] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('month')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [details, setDetails] = useState<Record<string, any>>({})
    const { toast } = useToast()

    const fetchPurchases = async () => {
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

            const data = await getPurchases(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
            setPurchases(data || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPurchases()
    }, [selectedPeriod])

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
            <div className="space-y-6 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">매입 관리</h1>
                        <p className="text-muted-foreground mt-1 italic">상세 기간별 매입 분석 및 재고 입고를 관리합니다.</p>
                    </div>
                    <Button onClick={() => setIsAddOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">
                        <Plus className="mr-2 h-4 w-4" />
                        새 매입 등록
                    </Button>
                </div>

                {/* Period Selector */}
                <div className="flex flex-wrap items-center gap-2 p-1 bg-muted/30 rounded-xl w-fit border border-muted">
                    {(['day', 'week', 'month', 'quarter', 'year'] as Period[]).map((p) => (
                        <Button
                            key={p}
                            variant={selectedPeriod === p ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setSelectedPeriod(p)}
                            className={cn(
                                "rounded-lg px-4 py-2 transition-all duration-200 text-xs font-semibold",
                                selectedPeriod === p
                                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {p === 'day' ? '오늘' : p === 'week' ? '이번주' : p === 'month' ? '이번달' : p === 'quarter' ? '이번 분기' : '올해'}
                        </Button>
                    ))}
                </div>

                {/* Analytics Summary */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all border-l-4 border-l-indigo-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-black text-white hover:text-indigo-300 uppercase tracking-widest transition-colors">총 매입액</CardTitle>
                            <ShoppingBag className="h-4 w-4 text-indigo-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-white">{formatNumber(totalAmount)}원</div>
                            <p className="text-xs font-black text-slate-100 mt-1 flex items-center">
                                <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
                                {purchases.length}건의 매입 기록
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all border-l-4 border-l-emerald-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-black text-white hover:text-emerald-300 uppercase tracking-widest transition-colors">최다 공급처</CardTitle>
                            <Store className="h-4 w-4 text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-white truncate">{topSupplier}</div>
                            <p className="text-xs font-black text-slate-100 mt-1">거래 비중이 가장 높은 업체</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all border-l-4 border-l-amber-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-black text-white hover:text-amber-300 uppercase tracking-widest transition-colors">매입 건수</CardTitle>
                            <Calendar className="h-4 w-4 text-amber-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-white">{purchases.length}건</div>
                            <p className="text-xs font-black text-slate-100 mt-1">선택 기간 데이터</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Purchases List */}
                <div className="grid gap-4">
                    {loading && purchases.length === 0 ? (
                        <div className="text-center py-20 opacity-50 flex flex-col items-center">
                            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                            <p>데이터를 불러오고 있습니다...</p>
                        </div>
                    ) : purchases.length === 0 ? (
                        <Card className="text-center py-20 border-dashed border-2 bg-muted/10">
                            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-10" />
                            <p className="text-muted-foreground font-medium">선택된 기간에 매입 내역이 없습니다.</p>
                            <p className="text-xs text-muted-foreground mt-1">필터를 조정하거나 새로운 매입 내역을 등록해 보세요.</p>
                        </Card>
                    ) : (
                        purchases.map(purchase => (
                            <Card key={purchase.id} className="overflow-hidden border-none shadow-sm hover:ring-2 hover:ring-indigo-100 dark:hover:ring-indigo-900 transition-all">
                                <div
                                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/10"
                                    onClick={() => toggleExpand(purchase.id)}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
                                            expandedId === purchase.id ? "bg-indigo-600 text-white" : "bg-indigo-50 dark:bg-slate-800 text-indigo-600"
                                        )}>
                                            {expandedId === purchase.id ? <ChevronDown className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-bold text-lg">{purchase.supplier_name || "미지정 공급처"}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted/40 rounded-full">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(purchase.purchase_date), "yyyy년 MM월 dd일", { locale: ko })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                                            {formatNumber(purchase.total_amount)}<span className="text-xs font-normal ml-0.5">원</span>
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] font-bold text-emerald-600">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            입고 완료
                                        </div>
                                    </div>
                                </div>

                                {expandedId === purchase.id && (
                                    <CardContent className="border-t bg-slate-50/50 dark:bg-slate-900/50 p-6 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-bold flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                                                <Package className="h-4 w-4" />
                                                매입 상세 명세
                                            </h4>
                                        </div>

                                        {!details[purchase.id] ? (
                                            <div className="py-4 text-center">
                                                <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="grid gap-3">
                                                    {details[purchase.id].items.map((item: any) => (
                                                        <div key={item.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center group transition-all hover:translate-x-1">
                                                            <div className="flex items-center gap-4">
                                                                <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                                                    <Package className="h-4 w-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-800 dark:text-slate-100">{item.ingredients?.name}</p>
                                                                    <p className="text-[11px] text-muted-foreground">
                                                                        {formatNumber(item.price)}원 / {item.ingredients?.purchase_unit}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg font-bold">
                                                                    {formatNumber(item.quantity)} {item.ingredients?.purchase_unit}
                                                                </span>
                                                                <p className="font-black text-lg mt-1 tracking-tight text-slate-900 dark:text-slate-50">{formatNumber(item.price * item.quantity)}원</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex justify-between items-center p-5 bg-indigo-600 text-white rounded-2xl shadow-lg border-indigo-500">
                                                    <div>
                                                        <p className="text-xs uppercase font-black text-slate-200 tracking-widest bg-slate-800 px-2 py-0.5 rounded">Total Invoice Amount</p>
                                                        <p className="text-xs opacity-70">결제 및 입고가 완료된 총액입니다.</p>
                                                    </div>
                                                    <div className="text-3xl font-black italic">
                                                        {formatNumber(purchase.total_amount)}원
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
