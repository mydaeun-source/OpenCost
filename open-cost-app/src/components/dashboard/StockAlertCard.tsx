"use client"

import { useIngredients } from "@/hooks/useIngredients"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { AlertTriangle, ArrowRight, Package } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function StockAlertCard() {
    const { ingredients, loading } = useIngredients()

    // Filter low stock items
    const lowStockItems = ingredients.filter(item =>
        (item.current_stock || 0) <= (item.safety_stock || 0)
    )

    if (loading) return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 border-dashed">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    재고 현황 확인 중...
                </CardTitle>
            </CardHeader>
        </Card>
    )

    if (lowStockItems.length === 0) return null // No alerts

    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 border-orange-500/50 bg-orange-500/5">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-orange-500">
                        <AlertTriangle className="h-5 w-5" />
                        재고 부족 알림 ({lowStockItems.length})
                    </CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/ingredients" className="text-orange-500 hover:text-orange-400">
                            관리하기 <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
                <CardDescription className="text-orange-500/80">
                    아래 재료들의 재고가 안전 재고 수준 미만입니다. 발주가 필요합니다.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {lowStockItems.slice(0, 6).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded bg-background/50 border border-orange-500/20">
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-200">{item.name}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-black">
                                    <span className="text-rose-500">{item.current_stock.toLocaleString()}</span>
                                    <span className="text-slate-500 mx-1">/</span>
                                    <span className="text-slate-300">{item.safety_stock.toLocaleString()}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-black uppercase">
                                    {item.purchase_unit || '개'}
                                </div>
                            </div>
                        </div>
                    ))}
                    {lowStockItems.length > 6 && (
                        <div className="flex items-center justify-center p-2 text-xs text-muted-foreground">
                            외 {lowStockItems.length - 6}개 더보기...
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
