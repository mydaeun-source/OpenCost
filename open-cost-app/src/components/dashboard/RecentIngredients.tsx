import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Database } from "@/types/database.types"
import { Package } from "lucide-react"
import { formatNumber } from "@/lib/utils"

type Ingredient = Database["public"]["Tables"]["ingredients"]["Row"]

interface RecentIngredientsProps {
    ingredients: Ingredient[]
}

export function RecentIngredients({ ingredients }: RecentIngredientsProps) {
    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>최근 입고 재료</CardTitle>
                <CardDescription>
                    가장 최근에 등록된 재료 {ingredients.length}건
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {ingredients.length === 0 ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                            등록된 재료가 없습니다.
                        </div>
                    ) : (
                        ingredients.map((ing) => (
                            <div key={ing.id} className="flex items-center">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                    <Package className="h-4 w-4 text-slate-500" />
                                </div>
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">{ing.name}</p>
                                    <div className="flex items-baseline gap-1">
                                        <div className="text-sm font-black text-slate-200">{formatNumber(ing.purchase_price)}원</div>
                                        <div className="text-xs font-black text-slate-300 italic">/{ing.purchase_unit}</div>
                                    </div>
                                </div>
                                <div className="ml-auto font-medium text-sm">
                                    +{formatNumber(ing.conversion_factor)} {ing.usage_unit}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
