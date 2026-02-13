"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Database } from "@/types/database.types"
import { Package } from "lucide-react"
import { formatNumber } from "@/lib/utils"

type Ingredient = Database["public"]["Tables"]["ingredients"]["Row"]

interface RecentIngredientsProps {
    ingredients: Ingredient[]
    noWrapper?: boolean
}

export function RecentIngredients({ ingredients, noWrapper = false }: RecentIngredientsProps) {
    const content = (
        <CardContent className={noWrapper ? "p-0" : ""}>
            <div className="space-y-4">
                {ingredients.length === 0 ? (
                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                        등록된 재료가 없습니다.
                    </div>
                ) : (
                    ingredients.map((ing) => (
                        <div key={ing.id} className="flex items-center">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none text-foreground">{ing.name}</p>
                                <div className="flex items-baseline gap-1">
                                    <div className="text-sm font-black text-foreground">{formatNumber(ing.purchase_price)}원</div>
                                    <div className="text-xs font-black text-muted-foreground/60 italic">/{ing.purchase_unit}</div>
                                </div>
                            </div>
                            <div className="ml-auto font-black text-sm text-primary">
                                {formatNumber(ing.conversion_factor)}<span className="text-[10px] ml-0.5 text-muted-foreground">{ing.usage_unit}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </CardContent>
    );

    if (noWrapper) return content;

    return (
        <Card className="col-span-1 border-none shadow-none bg-transparent">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black">최근 입고 재료</CardTitle>
                <CardDescription className="text-xs font-bold">
                    가장 최근에 등록된 재료 {ingredients.length}건
                </CardDescription>
            </CardHeader>
            {content}
        </Card>
    )
}
