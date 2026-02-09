import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Database } from "@/types/database.types"
import { ChefHat } from "lucide-react"

type Recipe = Database["public"]["Tables"]["recipes"]["Row"]

interface HighMarginMenusProps {
    menus: Recipe[]
}

export function HighMarginMenus({ menus }: HighMarginMenusProps) {
    return (
        <Card className="col-span-1 md:col-span-2">
            <CardHeader>
                <CardTitle>주요 메뉴 현황</CardTitle>
                <CardDescription>
                    최근 관리 중인 메뉴 리스트
                </CardDescription>
            </CardHeader>
            <CardContent>
                {menus.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        등록된 메뉴가 없습니다.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {menus.map((menu) => (
                            <div key={menu.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
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
                                    <div className="font-bold">{Number(menu.selling_price).toLocaleString()}원</div>
                                    {/* Mock Margin Rate for visual consistency (In real app, calculate this) */}
                                    <div className="text-xs text-green-600 font-medium">마진 분석중</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
