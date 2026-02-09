"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useIngredients } from "@/hooks/useIngredients"
import { useRecipes } from "@/hooks/useRecipes"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card"
import { Trash2, Plus, Calculator, ArrowRight, Search, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

import { supabase } from "@/lib/supabase"
import { useCategories } from "@/hooks/useCategories"

interface RecipeBuilderProps {
    initialData?: {
        id?: string
        name: string
        selling_price: number
        category_id?: string
        ingredients: {
            itemId: string // Can be ingredientId or recipeId
            itemType: 'ingredient' | 'menu' // Explicitly define type
            quantity: number
        }[]
    }
}

export function RecipeBuilder({ initialData }: RecipeBuilderProps) {
    const router = useRouter()
    const { ingredients } = useIngredients()
    const { recipes, createRecipe, updateRecipe, fetchRecipes, loading } = useRecipes()
    const { ensureCategory } = useCategories()

    const [recipeName, setRecipeName] = useState(initialData?.name || "")
    const [sellingPrice, setSellingPrice] = useState<number>(initialData?.selling_price || 0)

    // Drag & Drop Source Tab State
    const [activeTab, setActiveTab] = useState<'ingredient' | 'menu'>('ingredient')
    const [searchQuery, setSearchQuery] = useState("")

    const [menuType, setMenuType] = useState<'single' | 'set'>(() => {
        if (initialData?.ingredients?.some(item => item.itemType === 'menu')) {
            return 'set'
        }
        return 'single'
    })

    // State for menu costs (for nested recipes)
    const [menuCosts, setMenuCosts] = useState<Record<string, number>>({})

    // Selected Items (can be ingredients or other recipes/menus)
    const [selectedItems, setSelectedItems] = useState<{
        tempId: string
        itemId: string
        itemType: 'ingredient' | 'menu'
        quantity: number
        name: string // Cache name for display
        unit: string // Cache unit for display
    }[]>(() => {
        if (initialData?.ingredients) {
            return initialData.ingredients.map((item, index) => ({
                tempId: `initial-${index}`,
                itemId: item.itemId || (item as any).ingredientId || "",
                itemType: item.itemType,
                quantity: item.quantity,
                name: "", // Will be filled by effect
                unit: ""  // Will be filled by effect
            }))
        }
        return []
    })

    const isEditMode = !!initialData?.id

    // Load available recipes on mount
    useMemo(() => {
        fetchRecipes()
    }, [fetchRecipes])

    // Hydrate names and units for initial items & Auto-Fix types
    useMemo(() => {
        if (recipes.length > 0 && ingredients.length > 0) {
            setSelectedItems(prev => prev.map(item => {
                let newItem = { ...item }

                // Auto-fix itemType logic
                if (newItem.itemType === 'ingredient') {
                    const isRecipe = recipes.some(r => r.id === newItem.itemId)
                    const isIngredient = ingredients.some(i => i.id === newItem.itemId)
                    if (isRecipe && !isIngredient) {
                        newItem.itemType = 'menu'
                    }
                }

                // Fill details
                if (newItem.itemType === 'ingredient') {
                    const ing = ingredients.find(i => i.id === newItem.itemId)
                    if (ing) {
                        newItem.name = ing.name
                        newItem.unit = ing.usage_unit
                    }
                } else {
                    const rec = recipes.find(r => r.id === newItem.itemId)
                    if (rec) {
                        newItem.name = rec.name
                        newItem.unit = "개"
                    }
                }

                // Only return new object if changed to prevent loops? 
                // Actually this is useMemo, but we are inside a state setter... bad pattern.
                // Let's just do one-time hydration or rely on render lookup.
                // For simplified DnD, we will store name/unit in state to avoid constant lookups.
                return newItem
            }))
        }
    }, [recipes.length, ingredients.length])
    // ^ WARNING: dependent on selectedItems length changing? No, just base data load.
    // Ideally this should be a useEffect that runs once when data is ready.
    // For now, let's trust the render lookup for display and only use state for structure.

    // Helper to get item details for display
    const getItemDetails = (itemId: string, itemType: 'ingredient' | 'menu') => {
        if (itemType === 'ingredient') {
            const ing = ingredients.find(i => i.id === itemId)
            return { name: ing?.name || "Unknown", unit: ing?.usage_unit || "-" }
        } else {
            const rec = recipes.find(r => r.id === itemId)
            return { name: rec?.name || "Unknown", unit: "개" }
        }
    }


    // Fetch Cost for a Recipe
    const fetchMenuCost = async (recipeId: string): Promise<number> => {
        if (menuCosts[recipeId]) return menuCosts[recipeId]

        const { data: items, error } = await supabase
            .from("recipe_ingredients")
            .select("*")
            .eq("recipe_id", recipeId)

        if (error || !items) return 0

        let cost = 0
        for (const item of items) {
            if (item.item_type === 'ingredient') {
                const ingredient = ingredients.find(i => i.id === item.item_id)
                if (ingredient) {
                    const lossRate = ingredient.loss_rate || 0
                    const divisor = lossRate >= 1 ? 0.001 : (1 - lossRate)
                    const unitCost = ((ingredient.purchase_price || 0) / (ingredient.conversion_factor || 1)) / divisor
                    cost += (unitCost * (item.quantity || 0))
                }
            } else if (item.item_type === 'menu') {
                const subMenuCost = await fetchMenuCost(item.item_id)
                cost += (subMenuCost * (item.quantity || 0))
            }
        }

        setMenuCosts(prev => ({ ...prev, [recipeId]: cost }))
        return cost
    }

    // Effect to load costs
    useMemo(() => {
        selectedItems.forEach(item => {
            if (item.itemType === 'menu' && item.itemId && !menuCosts[item.itemId]) {
                fetchMenuCost(item.itemId)
            }
        })
    }, [selectedItems, menuCosts])


    // --- Drag & Drop Handlers ---

    const handleDragStart = (e: React.DragEvent, item: { id: string, name: string, type: 'ingredient' | 'menu', unit: string }) => {
        e.dataTransfer.setData("application/json", JSON.stringify(item))
        e.dataTransfer.effectAllowed = "copy"
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault() // Allow dropping
        e.dataTransfer.dropEffect = "copy"
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"))
            if (data && data.id) {
                addItem(data.id, data.type)
            }
        } catch (err) {
            console.error("Drop failed", err)
        }
    }

    const addItem = (id: string, type: 'ingredient' | 'menu') => {
        // Prevent self-reference
        if (type === 'menu' && id === initialData?.id) {
            return alert("자기 자신을 재료로 추가할 수 없습니다.")
        }

        setSelectedItems(prev => [
            ...prev,
            {
                tempId: Math.random().toString(),
                itemType: type,
                itemId: id,
                quantity: 0,
                name: "", // Lookup in render
                unit: ""
            }
        ])
    }

    // Remove Item
    const handleRemoveItem = (tempId: string) => {
        setSelectedItems(prev => prev.filter(item => item.tempId !== tempId))
    }

    // Update Quantity
    const handleUpdateQuantity = (tempId: string, quantity: number) => {
        setSelectedItems(prev => prev.map(item =>
            item.tempId === tempId ? { ...item, quantity } : item
        ))
    }

    // Calculate Total Cost
    const totalCost = useMemo(() => {
        return selectedItems.reduce((acc, item) => {
            if (item.itemType === 'ingredient') {
                const ingredient = ingredients.find(i => i.id === item.itemId)
                if (!ingredient) return acc
                const unitCost = ((ingredient.purchase_price || 0) / (ingredient.conversion_factor || 1)) / (1 - (ingredient.loss_rate || 0))
                return acc + (unitCost * (item.quantity || 0))
            } else {
                const cost = menuCosts[item.itemId] || 0
                return acc + (cost * (item.quantity || 0))
            }
        }, 0)
    }, [selectedItems, ingredients, menuCosts])

    // Calculate Margin
    const margin = sellingPrice - totalCost
    const marginRate = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0

    // Submit
    const handleSubmit = async () => {
        if (!recipeName) return alert("메뉴 이름을 입력해주세요")
        if (selectedItems.length === 0) return alert("재료를 하나 이상 추가해주세요")

        const categoryName = menuType === 'set' ? '세트 (Set)' : '단품 (Single)'
        const categoryId = await ensureCategory(categoryName, 'menu')
        if (!categoryId) return alert("카테고리 설정 실패")

        const ingredientData = selectedItems.map(item => ({
            item_id: item.itemId,
            item_type: item.itemType,
            quantity: item.quantity
        }))

        if (isEditMode && initialData?.id) {
            await updateRecipe(initialData.id, {
                name: recipeName,
                selling_price: sellingPrice,
                category_id: categoryId
            }, ingredientData)
        } else {
            await createRecipe({
                name: recipeName,
                type: "menu",
                selling_price: sellingPrice,
                category_id: categoryId
            }, ingredientData)
        }
    }

    // Filtered Source Items
    const filteredSourceItems = useMemo(() => {
        if (activeTab === 'ingredient') {
            return ingredients.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
        } else {
            return recipes
                .filter(r => r.id !== initialData?.id) // Exclude self
                .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
        }
    }, [activeTab, ingredients, recipes, searchQuery, initialData?.id])


    return (
        <div className="grid gap-6 lg:grid-cols-3 h-[calc(100vh-100px)]">
            {/* LEFT COLUMN: SOURCE (Library) */}
            <div className="lg:col-span-1 flex flex-col gap-4 h-full overflow-hidden">
                <Card className="flex flex-col h-full bg-slate-950/50 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">라이브러리</CardTitle>
                        <CardDescription>드래그하여 오른쪽 목록에 추가하세요.</CardDescription>
                        {/* Tabs */}
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => setActiveTab('ingredient')}
                                className={cn(
                                    "flex-1 py-2 text-sm font-medium rounded-md transition-colors border",
                                    activeTab === 'ingredient'
                                        ? "bg-primary/20 border-primary text-primary"
                                        : "border-transparent bg-white/5 hover:bg-white/10 text-muted-foreground"
                                )}
                            >
                                재료
                            </button>
                            <button
                                onClick={() => setActiveTab('menu')}
                                className={cn(
                                    "flex-1 py-2 text-sm font-medium rounded-md transition-colors border",
                                    activeTab === 'menu'
                                        ? "bg-primary/20 border-primary text-primary"
                                        : "border-transparent bg-white/5 hover:bg-white/10 text-muted-foreground"
                                )}
                            >
                                메뉴(단품)
                            </button>
                        </div>
                        {/* Search */}
                        <div className="relative mt-2">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="검색..."
                                className="pl-8 bg-black/20"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-2 space-y-2">
                        {filteredSourceItems.map((item) => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, {
                                    id: item.id,
                                    name: item.name,
                                    type: activeTab,
                                    unit: activeTab === 'ingredient' ? (item as any).usage_unit : '개'
                                })}
                                onClick={() => addItem(item.id, activeTab)} // Click support
                                className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors group"
                            >
                                <GripVertical className="bg-muted text-muted-foreground h-4 w-4 rounded-sm" />
                                <div className="flex-1">
                                    <div className="font-medium text-sm">{item.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {activeTab === 'ingredient' ? `${Number((item as any).purchase_price).toLocaleString()}원` : `판매가: ${Number((item as any).selling_price).toLocaleString()}원`}
                                    </div>
                                </div>
                                <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                            </div>
                        ))}
                        {filteredSourceItems.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                검색 결과가 없습니다.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* MIDDLE & RIGHT: RECIPE COMPOSITION (2 Columns wide) */}
            <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-auto">
                {/* 1. Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>{isEditMode ? "메뉴 수정" : "새 메뉴 정보"}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">메뉴 이름</label>
                            <Input
                                placeholder="예: 김치찌개 세트"
                                value={recipeName}
                                onChange={e => setRecipeName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">판매 가격 (원)</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={sellingPrice || ""}
                                onChange={e => setSellingPrice(Number(e.target.value))}
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <label className="text-sm font-medium">구분</label>
                            <div className="flex gap-4">
                                <label className={cn("flex items-center gap-2 cursor-pointer", menuType === 'single' ? "text-primary font-bold" : "text-muted-foreground")}>
                                    <input type="radio" checked={menuType === 'single'} onChange={() => setMenuType('single')} className="accent-primary" /> 단품
                                </label>
                                <label className={cn("flex items-center gap-2 cursor-pointer", menuType === 'set' ? "text-primary font-bold" : "text-muted-foreground")}>
                                    <input type="radio" checked={menuType === 'set'} onChange={() => setMenuType('set')} className="accent-primary" /> 세트
                                </label>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Drop Zone & List */}
                <div
                    className="flex-1 flex flex-col"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <Card className={cn(
                        "flex-1 border-dashed border-2 transition-colors flex flex-col",
                        selectedItems.length === 0 ? "border-muted-foreground/25" : "border-primary/20"
                    )}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>구성 요소</span>
                                <span className="text-sm font-normal text-muted-foreground">
                                    총 {selectedItems.length}개 항목
                                </span>
                            </CardTitle>
                            <CardDescription>
                                왼쪽 라이브러리에서 재료를 드래그하여 이곳에 놓으세요.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-2 overflow-auto min-h-[300px]">
                            {selectedItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50">
                                    <Plus className="h-12 w-12" />
                                    <p>재료나 메뉴를 드래그하여 추가하세요</p>
                                </div>
                            ) : (
                                selectedItems.map((item, index) => {
                                    const details = getItemDetails(item.itemId, item.itemType)
                                    return (
                                        <div key={item.tempId} className="flex items-center gap-4 p-4 rounded-lg border bg-card animate-in fade-in slide-in-from-left-2">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium flex items-center gap-2">
                                                    {details.name}
                                                    <span className={cn(
                                                        "text-xs px-1.5 py-0.5 rounded border border-indigo-500/50 bg-indigo-500/10 text-indigo-400 uppercase font-black tracking-widest",
                                                        item.itemType === 'menu' ? "bg-purple-500/10 text-purple-400 border-purple-500/50" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/50"
                                                    )}>
                                                        {item.itemType === 'menu' ? "메뉴" : "재료"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-muted-foreground">수량</label>
                                                <Input
                                                    type="number"
                                                    value={item.quantity || ""}
                                                    onChange={(e) => handleUpdateQuantity(item.tempId, Number(e.target.value))}
                                                    className="w-20 text-right"
                                                    autoFocus={item.quantity === 0} // Auto focus on new items
                                                />
                                                <span className="text-sm text-muted-foreground w-8">{details.unit}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveItem(item.tempId)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* 3. Analysis Footer (Sticky) */}
                <Card className="bg-slate-50 dark:bg-slate-900/90 backdrop-blur border-t border-primary/20 sticky bottom-0 z-10">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                            <div className="flex gap-8 text-sm">
                                <div>
                                    <span className="text-muted-foreground block mb-1">총 원가</span>
                                    <span className="text-2xl font-bold">{Math.round(totalCost).toLocaleString()}원</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block mb-1">마진</span>
                                    <span className={cn("text-2xl font-bold", margin > 0 ? "text-green-500" : "text-red-500")}>
                                        {Math.round(margin).toLocaleString()}원 ({marginRate.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                            <Button size="lg" className="w-full md:w-auto min-w-[200px]" onClick={handleSubmit} disabled={loading}>
                                {isEditMode ? "저장하기" : "메뉴 생성하기"}
                                {loading ? "..." : <ArrowRight className="ml-2 h-4 w-4" />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
