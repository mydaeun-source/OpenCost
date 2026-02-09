"use client"

import { AppLayout } from "@/components/layout/AppLayout"
import { RecipeBuilder } from "@/components/recipes/RecipeBuilder"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default function NewRecipePage() {
    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/recipes">
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">새 메뉴 만들기</h1>
                        <p className="text-muted-foreground">재료를 선택하여 원가를 계산하고 메뉴를 등록합니다.</p>
                    </div>
                </div>

                <RecipeBuilder />
            </div>
        </AppLayout>
    )
}
