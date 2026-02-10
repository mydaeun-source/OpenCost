"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Database } from "@/types/database.types"
import { ChefHat } from "lucide-react"
import { formatNumber } from "@/lib/utils"

type Recipe = Database["public"]["Tables"]["recipes"]["Row"]

interface HighMarginMenusProps {
    menus: Recipe[]
    noWrapper?: boolean
}

export function HighMarginMenus({ menus, noWrapper = false }: HighMarginMenusProps) {
    const content = (
        <CardContent className={noWrapper ? "p-0" : ""}>
            {menus.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    등록된 메뉴가 없습니다.
                </div>
            ) : (
                <div className="space-y-4">
                    {menus.map((menu) => (
                        <div key={menu.id} className="flex items-center justify-between border-none shadow-sm p-3 rounded-xl bg-white dark:bg-slate-900/50 pb-4 last:pb-3">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <ChefHat className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{menu.name}</h4>
                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {menu.description || "설명 없음"}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold">{formatNumber(menu.selling_price)}원</div>
                                <div className="text-[10px] text-emerald-500 font-black uppercase">마진 최적화됨</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
    );

    if (noWrapper) return content;

    return (
        <Card className="col-span-1 md:col-span-2 border-none shadow-none bg-transparent">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black">주요 메뉴 현황</CardTitle>
                <CardDescription className="text-xs font-bold">
                    최근 관리 중인 메뉴 리스트
                </CardDescription>
            </CardHeader>
            {content}
        </Card>
    )
}
