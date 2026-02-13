"use client"

import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { ShoppingCart, Trash2, Edit3, ArrowUpRight, ArrowDownRight, RefreshCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface StockHistoryProps {
    logs: any[]
}

export function StockHistory({ logs }: StockHistoryProps) {
    const getIcon = (type: string) => {
        switch (type) {
            case 'purchase': return <ShoppingCart className="h-4 w-4 text-indigo-500" />
            case 'spoilage': return <Trash2 className="h-4 w-4 text-rose-500" />
            case 'order': return <ArrowDownRight className="h-4 w-4 text-amber-500" />
            case 'refund': return <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            case 'correction': return <Edit3 className="h-4 w-4 text-blue-500" />
            default: return <RefreshCcw className="h-4 w-4 text-slate-400" />
        }
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'purchase': return "구매/입고"
            case 'spoilage': return "폐기/손실"
            case 'order': return "판매 소진"
            case 'refund': return "반품/취소"
            case 'correction': return "재고 보정"
            default: return type
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'purchase': return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            case 'spoilage': return "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            case 'order': return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            case 'refund': return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            case 'correction': return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            default: return "bg-slate-500/10 text-slate-600 dark:text-slate-400"
        }
    }

    if (logs.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                    <History className="h-10 w-10 mb-4 opacity-20" />
                    <p>최근 재고 변동 내역이 없습니다.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-card border-none shadow-none overflow-hidden">
            <CardHeader className="bg-muted/50 border-b border-border">
                <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                    <RefreshCcw className="h-4 w-4 text-primary" />
                    수불 내역 상세
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border">
                    {logs.map((log) => (
                        <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-lg", getTypeColor(log.adjustment_type))}>
                                        {getIcon(log.adjustment_type)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-foreground">
                                                {log.ingredient?.name || "알 수 없는 재료"}
                                            </span>
                                            <Badge variant="outline" className={cn("text-[10px] h-4 font-black", getTypeColor(log.adjustment_type))}>
                                                {getTypeLabel(log.adjustment_type)}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 font-black flex items-center gap-2">
                                            <span className="opacity-70">{format(new Date(log.created_at), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}</span>
                                            {log.reason && !log.reason.startsWith('Seed Purchase') && (
                                                <>
                                                    <span className="opacity-20">|</span>
                                                    <span className="text-foreground bg-muted px-1.5 py-0.5 rounded italic text-[10px]">{log.reason}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={cn(
                                        "text-sm font-black italic",
                                        log.quantity > 0 ? "text-primary dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
                                    )}>
                                        {log.quantity > 0 ? "+" : ""}{log.quantity.toLocaleString()}<span className="text-[10px] font-black ml-1 text-muted-foreground italic">/{log.ingredient?.purchase_unit}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

import { History } from "lucide-react"
