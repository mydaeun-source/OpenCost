import { LayoutDashboard, Scale, ChefHat, Settings, TrendingUp, DollarSign, ShoppingCart, ShoppingBag } from "lucide-react"

export const NAV_ITEMS = [
    {
        label: "대시보드",
        href: "/",
        icon: LayoutDashboard,
    },
    {
        label: "재료 관리",
        href: "/ingredients",
        icon: Scale,
    },
    {
        label: "메뉴 관리",
        href: "/recipes",
        icon: ChefHat,
    },
    {
        label: "판매 (POS)",
        href: "/pos",
        icon: ShoppingCart,
    },
    {
        label: "매입 관리",
        href: "/procurement",
        icon: ShoppingBag,
    },
    {
        label: "매출 관리",
        href: "/sales",
        icon: TrendingUp,
    },
    {
        label: "비용 관리",
        href: "/expenses",
        icon: DollarSign,
    },
    {
        label: "설정",
        href: "/settings",
        icon: Settings,
    },
]
