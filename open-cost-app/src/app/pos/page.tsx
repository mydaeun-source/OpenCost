"use client"

import { useState, useMemo } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { useRecipes } from "@/hooks/useRecipes"
import { useCategories } from "@/hooks/useCategories"
import { useIngredients } from "@/hooks/useIngredients"
import { createOrder } from "@/lib/api/orders"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Upload, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { haptic } from "@/lib/haptics"
import { useStore } from "@/contexts/StoreContext"

interface CartItem {
    tempId: string
    menuId: string
    name: string
    price: number
    quantity: number
}

export default function POSPage() {
    const { activeStore } = useStore()
    const { recipes, loading: recipesLoading } = useRecipes()
    const { categories } = useCategories()
    const { toast } = useToast()

    // Filter only 'menu' type recipes
    const menuItems = useMemo(() => recipes.filter(r => r.type === 'menu'), [recipes])

    const menuCategories = useMemo(() => {
        // Get categories that have at least one menu item
        const activeCatIds = new Set(menuItems.map(m => m.category_id))
        return categories.filter(c => activeCatIds.has(c.id))
    }, [categories, menuItems])

    const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all')
    const [cart, setCart] = useState<CartItem[]>([])
    const [isCheckingOut, setIsCheckingOut] = useState(false)

    // Filter Displayed Items
    const displayedItems = useMemo(() => {
        if (selectedCategory === 'all') return menuItems
        return menuItems.filter(m => m.category_id === selectedCategory)
    }, [menuItems, selectedCategory])

    // Cart Actions
    const addToCart = (menu: any) => {
        setCart(prev => {
            const existing = prev.find(item => item.menuId === menu.id)
            if (existing) {
                return prev.map(item =>
                    item.menuId === menu.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            haptic.light()
            return [...prev, {
                tempId: Math.random().toString(),
                menuId: menu.id,
                name: menu.name,
                price: menu.selling_price || 0,
                quantity: 1
            }]
        })
    }

    const updateQuantity = (tempId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.tempId === tempId) {
                const newQty = Math.max(1, item.quantity + delta)
                return { ...item, quantity: newQty }
            }
            return item
        }))
    }

    const removeFromCart = (tempId: string) => {
        setCart(prev => prev.filter(item => item.tempId !== tempId))
    }

    const clearCart = () => setCart([])

    // Checkout
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    const handleCheckout = async (method: 'card' | 'cash' | 'transfer') => {
        if (cart.length === 0) return

        if (!activeStore) {
            toast({
                title: "오류",
                description: "선택된 매장이 없어 주문을 처리할 수 없습니다.",
                type: "destructive"
            })
            return
        }

        setIsCheckingOut(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                alert("로그인이 필요합니다.")
                return
            }

            await createOrder({
                user_id: user.id,
                total_amount: cartTotal,
                payment_method: method,
                status: 'completed'
            }, cart.map(item => ({
                menuId: item.menuId,
                quantity: item.quantity,
                price: item.price
            })), activeStore.id)

            haptic.success()
            toast({
                title: "결제 완료",
                description: `${cartTotal.toLocaleString()}원 결제가 완료되었습니다.`,
                type: 'success'
            })
            clearCart()

        } catch (error) {
            console.error("Checkout Failed:", error)
            toast({
                title: "결제 실패",
                description: "주문 처리 중 오류가 발생했습니다.",
                type: "destructive"
            })
        } finally {
            setIsCheckingOut(false)
        }
    }

    return (
        <AppLayout>
            <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] gap-4">
                {/* LEFT: Menu Grid */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">주문 (POS)</h1>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <Button
                            variant={selectedCategory === 'all' ? "default" : "outline"}
                            onClick={() => setSelectedCategory('all')}
                            className="whitespace-nowrap rounded-full"
                        >
                            전체
                        </Button>
                        {menuCategories.map(cat => (
                            <Button
                                key={cat.id}
                                variant={selectedCategory === cat.id ? "default" : "outline"}
                                onClick={() => setSelectedCategory(cat.id)}
                                className="whitespace-nowrap rounded-full"
                            >
                                {cat.name}
                            </Button>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto p-1">
                        {displayedItems.map(menu => (
                            <Card
                                key={menu.id}
                                className="cursor-pointer hover:bg-accent transition-colors active:scale-95"
                                onClick={() => addToCart(menu)}
                            >
                                <CardContent className="p-4 flex flex-col justify-between h-full aspect-square">
                                    <div className="font-bold text-lg leading-tight line-clamp-2">
                                        {menu.name}
                                    </div>
                                    <div className="mt-auto pt-4">
                                        <div className="text-primary font-bold text-xl">
                                            {Number(menu.selling_price).toLocaleString()}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Cart (Sticky Sidebar) */}
                <Card className="w-full md:w-[350px] lg:w-[400px] flex flex-col h-full border-l shadow-xl">
                    <div className="p-4 border-b bg-muted/50">
                        <div className="flex items-center gap-2 font-bold text-lg">
                            <ShoppingCart className="h-5 w-5" />
                            장바구니
                            <Badge variant="secondary" className="ml-auto">
                                {cart.reduce((s, i) => s + i.quantity, 0)}개
                            </Badge>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50">
                                <ShoppingCart className="h-12 w-12" />
                                <p>메뉴를 선택해주세요</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.tempId} className="flex flex-col gap-2 p-3 rounded-lg border bg-card">
                                    <div className="flex justify-between font-medium">
                                        <span>{item.name}</span>
                                        <span>{(item.price * item.quantity).toLocaleString()}원</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex items-center gap-2">
                                            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.tempId, -1)}>
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                                            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.tempId, 1)}>
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.tempId)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t bg-card space-y-4">
                        <div className="flex justify-between items-center text-lg">
                            <span className="text-muted-foreground">총 결제금액</span>
                            <span className="font-bold text-2xl text-primary">{cartTotal.toLocaleString()}원</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                variant="outline"
                                className="flex flex-col h-20 gap-1 bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                                onClick={() => handleCheckout('card')}
                                disabled={isCheckingOut || cartTotal === 0}
                            >
                                <CreditCard className="h-5 w-5" />
                                <span className="text-xs">카드</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="flex flex-col h-20 gap-1 bg-green-500/5 hover:bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                                onClick={() => handleCheckout('cash')}
                                disabled={isCheckingOut || cartTotal === 0}
                            >
                                <Banknote className="h-5 w-5" />
                                <span className="text-xs">현금</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="flex flex-col h-20 gap-1 bg-orange-500/5 hover:bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
                                onClick={() => handleCheckout('transfer')}
                                disabled={isCheckingOut || cartTotal === 0}
                            >
                                <Upload className="h-5 w-5" />
                                <span className="text-xs">이체</span>
                            </Button>
                        </div>
                        {isCheckingOut && (
                            <div className="text-center text-sm text-muted-foreground animate-pulse">
                                결제 처리 중...
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </AppLayout>
    )
}
