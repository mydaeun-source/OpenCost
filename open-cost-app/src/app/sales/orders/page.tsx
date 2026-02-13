"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { getOrders, getOrderItems, cancelOrder, Order } from "@/lib/api/orders"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns"
import { ko } from "date-fns/locale"
import { ChevronRight, ChevronDown, Reply, Hash, Calendar, Banknote, AlertCircle, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useStore } from "@/contexts/StoreContext"

export default function OrderHistoryPage() {
    const { activeStore } = useStore()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
    const [orderItems, setOrderItems] = useState<Record<string, any[]>>({})
    const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month')
    const { toast } = useToast()

    const fetchOrders = async () => {
        try {
            setLoading(true)
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

            // Fixed: Pass storeId as 3rd argument
            const data = await getOrders(
                format(start, 'yyyy-MM-dd'),
                format(end, 'yyyy-MM-dd'),
                activeStore?.id,
                100,
                true
            )
            setOrders(data || [])
        } catch (err) {
            console.error("Fetch orders failed", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (activeStore) {
            fetchOrders()
        }
    }, [selectedPeriod, activeStore])

    // Summary Calculations
    const totalAmount = orders.reduce((sum, o) => o.status !== 'cancelled' ? sum + Number(o.total_amount) : sum, 0)
    const activeOrders = orders.filter(o => o.status !== 'cancelled')
    const avgOrderValue = activeOrders.length > 0 ? totalAmount / activeOrders.length : 0

    const handleCancel = async (order: Order) => {
        if (!confirm("정말 이 주문을 취소하시겠습니까? (재고가 복구되고 매출에서 제외됩니다)")) return

        try {
            await cancelOrder(order)
            toast({
                title: "주문 취소 완료",
                description: "재고가 복구되었으며 매출이 조정되었습니다.",
                type: "success"
            })
            fetchOrders() // Refresh
        } catch (err) {
            console.error("Cancel order failed", err)
            toast({
                title: "취소 실패",
                description: "주문 취소 중 오류가 발생했습니다.",
                type: "destructive"
            })
        }
    }

    // Group orders by date
    const groupedOrders = orders.reduce((groups: Record<string, any[]>, order) => {
        const date = format(new Date(order.created_at), "yyyy-MM-dd")
        if (!groups[date]) groups[date] = []
        groups[date].push(order)
        return groups
    }, {})

    return (
        <AppLayout>
            <div className="space-y-6 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-foreground italic uppercase">주문 내역 센터 (ORDER HISTORY)</h1>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1 ml-0.5">
                            판매 내역 분석 및 주문 데이터 분석
                        </p>
                    </div>
                </div>

                {/* Period Selector */}
                <div className="flex flex-wrap items-center gap-2 p-1 bg-muted/40 rounded-xl w-fit border border-border shadow-sm">
                    {(['day', 'week', 'month', 'quarter', 'year'] as const).map((p) => (
                        <Button
                            key={p}
                            variant={selectedPeriod === p ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setSelectedPeriod(p)}
                            className={cn(
                                "rounded-lg px-5 py-2 transition-all duration-200 text-[10px] font-black uppercase tracking-widest",
                                selectedPeriod === p
                                    ? "bg-foreground text-background shadow-md"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            {p === 'day' ? '오늘' : p === 'week' ? '이번 주' : p === 'month' ? '이번 달' : p === 'quarter' ? '분기' : '올해'}
                        </Button>
                    ))}
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="glass-panel border border-border shadow-none group transition-all">
                        <CardHeader className="flex flex-row items-center justify-between p-6 pb-2 space-y-0">
                            <CardTitle className="text-[10px] font-black text-primary uppercase tracking-widest">기간 매출 총액</CardTitle>
                            <Banknote className="h-4 w-4 text-primary opacity-50" />
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            <div className="text-2xl font-black text-foreground italic tracking-tighter">{totalAmount.toLocaleString()}<span className="text-[10px] font-black ml-1 opacity-50 uppercase tracking-widest">원 (Won)</span></div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border border-border shadow-none group transition-all">
                        <CardHeader className="flex flex-row items-center justify-between p-6 pb-2 space-y-0">
                            <CardTitle className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">평균 주문 단가</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 opacity-50" />
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 italic tracking-tighter">{Math.round(avgOrderValue).toLocaleString()}<span className="text-[10px] font-black ml-1 opacity-50 uppercase tracking-widest">원 (Won)</span></div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border border-border shadow-none group transition-all">
                        <CardHeader className="flex flex-row items-center justify-between p-6 pb-2 space-y-0">
                            <CardTitle className="text-[10px] font-black text-amber-500 uppercase tracking-widest">총 주문 건수</CardTitle>
                            <Hash className="h-4 w-4 text-amber-500 opacity-50" />
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            <div className="text-2xl font-black text-foreground italic tracking-tighter">{activeOrders.length}건</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    {loading && orders.length === 0 ? (
                        <div className="p-20 text-center flex flex-col items-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                            <p className="font-bold text-slate-400 italic">데이터를 불러오는 중입니다...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30 text-slate-300" />
                            <p className="font-black text-slate-300">조회된 주문 내역이 없습니다.</p>
                        </div>
                    ) : (
                        Object.entries(groupedOrders).map(([date, dailyOrders]) => (
                            <div key={date} className="space-y-3">
                                <div className="flex items-center gap-4 px-2">
                                    <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-tighter bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-400/20">
                                        {format(new Date(date), "yyyy년 MM월 dd일 (eeee)", { locale: ko })}
                                    </h3>
                                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest italic">
                                        {dailyOrders.filter(o => o.status !== 'cancelled').length}건의 주문
                                    </span>
                                </div>

                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-[80px_1fr_80px_100px] bg-slate-50 dark:bg-slate-800/80 p-4 border-b border-slate-100 dark:border-slate-800 text-xs font-black text-slate-300 uppercase tracking-widest">
                                        <span>시간</span>
                                        <span>메뉴명</span>
                                        <span className="text-center">수량</span>
                                        <span className="text-right">금액</span>
                                    </div>

                                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {dailyOrders.map((order: any) => (
                                            <div key={order.id} className={cn(
                                                "group transition-all duration-200",
                                                order.status === 'cancelled' ? "bg-slate-50/50 dark:bg-slate-900/30 opacity-60" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/20"
                                            )}>
                                                <div className="grid grid-cols-[80px_1fr_80px_100px] items-start p-4 hover:shadow-[0_0_20px_rgba(0,0,0,0.02)] transition-shadow">
                                                    {/* Time column */}
                                                    <div className="pt-1">
                                                        <span className="text-xs font-black text-slate-300 dark:text-slate-200 font-mono italic">
                                                            {format(new Date(order.created_at), "HH:mm")}
                                                        </span>
                                                        {order.status === 'cancelled' && (
                                                            <Badge variant="destructive" className="inline-flex scale-75 origin-left text-[8px] h-3.5 mt-1 font-black">취소됨 (CANCELLED)</Badge>
                                                        )}
                                                    </div>

                                                    {/* Items Column */}
                                                    <div className="col-span-3 space-y-3">
                                                        <div className="space-y-2.5">
                                                            {order.order_items?.map((item: any) => (
                                                                <div key={item.id} className="grid grid-cols-[1fr_80px_100px] items-center group/item">
                                                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate pr-4 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">
                                                                        {item.recipes?.name || "알 수 없는 메뉴"}
                                                                    </span>
                                                                    <span className="text-center">
                                                                        <Badge variant="secondary" className="text-xs font-black h-5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 min-w-[32px] justify-center">
                                                                            {item.quantity}
                                                                        </Badge>
                                                                    </span>
                                                                    <span className="text-right font-black text-slate-900 dark:text-slate-50 text-sm italic">
                                                                        {(item.price * item.quantity).toLocaleString()}<span className="text-[10px] ml-0.5 font-normal">원</span>
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Summary Row inside Order */}
                                                        <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-50 dark:border-slate-800/50">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-300 font-black uppercase tracking-widest scale-90 origin-left">주문 합계 (TOTAL)</span>
                                                                <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm ml-2">
                                                                    {Number(order.total_amount).toLocaleString()}원
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {order.status !== 'cancelled' ? (
                                                                    <button
                                                                        className="h-7 px-2 text-xs font-black text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all rounded-lg flex items-center gap-1.5 border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                                                                        onClick={() => handleCancel(order)}
                                                                    >
                                                                        <Reply className="h-3 w-3" />
                                                                        주문 취소
                                                                    </button>
                                                                ) : (
                                                                    <div className="h-7 px-2 flex items-center gap-1.5 text-slate-400 opacity-40 text-[9px] font-bold">
                                                                        <AlertCircle className="h-3 w-3" />
                                                                        취소된 주문
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    )
}
