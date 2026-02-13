"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { useRecipes } from "@/hooks/useRecipes"
import { Plus, ChefHat, TrendingUp, LayoutGrid, List, ArrowRight, Trash2 } from "lucide-react"
import { cn, formatNumber } from "@/lib/utils"

import { useViewMode } from "@/hooks/useViewMode"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

export default function RecipesPage() {
    const { recipes, loading, fetchRecipes, deleteRecipe } = useRecipes()
    const { viewMode, setViewMode, mounted } = useViewMode('recipes-view-mode', 'grid')
    const router = useRouter()

    // Deletion State
    const [deleteItem, setDeleteItem] = useState<{ id: string, name: string } | null>(null)

    const confirmDelete = async () => {
        if (deleteItem) {
            await deleteRecipe(deleteItem.id)
            setDeleteItem(null)
        }
    }

    useEffect(() => {
        fetchRecipes()
    }, [fetchRecipes])

    // Prevent hydration mismatch
    if (!mounted) return null

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">메뉴 관리</h1>
                        <p className="text-muted-foreground mt-1">등록된 메뉴의 원가와 마진을 관리합니다.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-muted/20 p-1 rounded-lg border border-border mx-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-2 rounded-md transition-all",
                                    viewMode === 'grid' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                                title="카드 보기"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-2 rounded-md transition-all",
                                    viewMode === 'list' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                                title="리스트 보기"
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                        <Link href="/recipes/new">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                새 메뉴 만들기
                            </Button>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-muted-foreground animate-pulse">데이터를 불러오는 중...</p>
                    </div>
                ) : (
                    <>
                        {recipes.length === 0 ? (
                            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-muted/10">
                                <ChefHat className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                                <h3 className="text-lg font-medium">등록된 메뉴가 없습니다</h3>
                                <p className="text-muted-foreground mb-4">재료들을 조합하여 첫 번째 메뉴를 만들어보세요.</p>
                                <Link href="/recipes/new">
                                    <Button variant="outline">메뉴 만들기 시작</Button>
                                </Link>
                            </div>
                        ) : (
                            viewMode === 'grid' ? (
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {recipes.map((recipe) => (
                                        <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                                            <Card className="glass-panel overflow-hidden transition-all hover:border-primary border border-border/50 cursor-pointer h-full group">
                                                <CardHeader className="p-6 pb-2 border-b border-border/10">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <CardTitle className="text-xl font-black truncate italic text-foreground tracking-tighter">{recipe.name}</CardTitle>
                                                        <div className="flex gap-2 shrink-0">
                                                            {(recipe as any).categories?.name && (
                                                                <span className={cn(
                                                                    "text-[10px] font-black px-2 py-1 rounded border whitespace-nowrap uppercase tracking-widest",
                                                                    ((recipe as any).categories?.name === "세트 (Set)" || (recipe as any).categories?.name?.includes("Set"))
                                                                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                                                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                                )}>
                                                                    {(recipe as any).categories?.name?.replace(" (Set)", "").replace(" (Single)", "")}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <CardDescription className="line-clamp-2 min-h-[2.5em] text-xs font-bold text-muted-foreground uppercase tracking-tight mt-1 leading-relaxed">{recipe.description || "설명 없음"}</CardDescription>
                                                </CardHeader>
                                                <CardContent className="p-6">
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center bg-muted/30 p-3 rounded-xl border border-border/50">
                                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{recipe.type === 'prep' ? '생산량 (BATCH)' : '판매가 (PRICE)'}</span>
                                                            <span className="text-lg font-black text-foreground italic tracking-tighter">
                                                                {recipe.type === 'prep'
                                                                    ? `${recipe.batch_size} ${recipe.batch_unit}`
                                                                    : `${formatNumber(recipe.selling_price)}원`
                                                                }
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic group-hover:text-primary transition-colors">
                                                            <span>상세 레시피 분석</span>
                                                            <ArrowRight className="h-3 w-3" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-border overflow-hidden bg-card text-card-foreground shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted text-foreground font-black border-b border-border">
                                            <tr>
                                                <th className="p-4 pl-6 uppercase tracking-widest text-xs font-black">메뉴 이름</th>
                                                <th className="p-4 w-[150px] uppercase tracking-widest text-xs font-black">구분</th>
                                                <th className="p-4 w-[150px] text-right uppercase tracking-widest text-xs font-black">가격/생산량</th>
                                                <th className="p-4 w-[100px] text-right pr-6 uppercase tracking-widest text-xs font-black">관리</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {recipes.map((recipe) => (
                                                <tr
                                                    key={recipe.id}
                                                    onClick={() => router.push(`/recipes/${recipe.id}`)}
                                                    className="hover:bg-muted/50 cursor-pointer transition-colors group"
                                                >
                                                    <td className="p-4 pl-6 font-medium">
                                                        <div className="flex flex-col">
                                                            <span className="text-base">{recipe.name}</span>
                                                            {recipe.description && (
                                                                <span className="text-xs text-muted-foreground font-black italic line-clamp-1">{recipe.description}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        {(recipe as any).categories?.name && (
                                                            <span className={cn(
                                                                "text-xs font-bold px-2 py-1 rounded border inline-block text-center min-w-[60px]",
                                                                ((recipe as any).categories?.name === "세트 (Set)" || (recipe as any).categories?.name?.includes("Set"))
                                                                    ? "bg-purple-500/10 text-purple-400 border-purple-500/50"
                                                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/50"
                                                            )}>
                                                                {(recipe as any).categories?.name?.replace(" (Set)", "").replace(" (Single)", "")}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right font-medium">
                                                        {recipe.type === 'prep'
                                                            ? <span className="text-indigo-400">{recipe.batch_size} {recipe.batch_unit}</span>
                                                            : `${formatNumber(recipe.selling_price)} 원`
                                                        }
                                                    </td>
                                                    <td className="p-4 text-right pr-6">
                                                        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center justify-end gap-2">
                                                            <div
                                                                role="button"
                                                                className="p-1 hover:text-destructive transition-colors"
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    e.stopPropagation()
                                                                    setDeleteItem({ id: recipe.id, name: recipe.name })
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </div>
                                                            <span className="flex items-center">
                                                                상세 <ArrowRight className="h-3 w-3 ml-1" />
                                                            </span>
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}
                    </>
                )}

                <ConfirmDialog
                    isOpen={!!deleteItem}
                    onClose={() => setDeleteItem(null)}
                    onConfirm={confirmDelete}
                    title="메뉴 삭제"
                    description={`정말 "${deleteItem?.name}" 메뉴를 삭제하시겠습니까? 삭제된 메뉴는 복구할 수 없습니다.`}
                    confirmText="삭제"
                />
            </div>
        </AppLayout>
    )
}
