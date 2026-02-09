import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/types/database.types"
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns"

type Ingredient = Database["public"]["Tables"]["ingredients"]["Row"]
type Recipe = Database["public"]["Tables"]["recipes"]["Row"]
type ExpenseRecord = Database["public"]["Tables"]["expense_records"]["Row"]

export interface ChartData {
    month: string
    revenue: number
    expenses: number
    profit: number
}

export interface DashboardSummary {
    ingredientCount: number
    recipeCount: number
    avgMarginRate: number
    totalExpenses: number // New
    targetRevenue: number // New
    estimatedProfit: number // New
}

export function useDashboard() {
    const [summary, setSummary] = useState<DashboardSummary>({
        ingredientCount: 0,
        recipeCount: 0,
        avgMarginRate: 0,
        totalExpenses: 0,
        targetRevenue: 0,
        estimatedProfit: 0,
    })
    const [recentIngredients, setRecentIngredients] = useState<Ingredient[]>([])
    const [topMenus, setTopMenus] = useState<Recipe[]>([])
    const [chartData, setChartData] = useState<ChartData[]>([])
    const [loading, setLoading] = useState(true)

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const now = new Date()
            const startStr = format(startOfMonth(now), "yyyy-MM-dd")
            const endStr = format(endOfMonth(now), "yyyy-MM-dd")

            // Parallel Fetching
            const [
                ingredientsResult,
                recipesResult,
                recentIngResult,
                expensesResult,
                settingsResult,
                allRecipes // Need all to calc avg price
            ] = await Promise.all([
                supabase.from("ingredients").select("id", { count: "exact" }).eq("user_id", user.id),
                supabase.from("recipes").select("id", { count: "exact" }).eq("user_id", user.id),
                supabase.from("ingredients").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
                supabase.from("expense_records")
                    .select("amount")
                    .eq("user_id", user.id)
                    .gte("expense_date", startStr)
                    .lte("expense_date", endStr),
                supabase.from("store_settings").select("*").eq("user_id", user.id).single(),
                supabase.from("recipes").select("selling_price").eq("user_id", user.id) // Lightweight fetch
            ])

            // 1. Counts
            const ingredientCount = ingredientsResult.count || 0
            const recipeCount = recipesResult.count || 0

            // 2. Recent Ingredients
            const recentIngs = recentIngResult.data || []

            // 3. Financials (Current Month)
            const expenses = expensesResult.data || []
            const totalExpenses = expenses.reduce((sum, record) => sum + Number(record.amount), 0)

            const settings = settingsResult.data
            const targetSalesCount = settings?.monthly_target_sales_count || 1000 // Default 1000

            // Calc Avg Selling Price
            const recipes = allRecipes.data || []
            const totalSellingPrice = recipes.reduce((sum, r) => sum + (r.selling_price || 0), 0)
            const avgSellingPrice = recipes.length > 0 ? totalSellingPrice / recipes.length : 0

            // Target Revenue (Benchmark)
            const targetRevenue = targetSalesCount * avgSellingPrice

            // 4. Chart Data (Last 6 Months) with Real Sales
            const start6Months = format(startOfMonth(subMonths(now, 5)), "yyyy-MM-dd")

            // Parallel fetch for chart
            const [pastExpensesResult, salesResult] = await Promise.all([
                supabase
                    .from("expense_records")
                    .select("amount, expense_date")
                    .eq("user_id", user.id)
                    .gte("expense_date", start6Months)
                    .lte("expense_date", endStr),
                supabase
                    .from("sales_records")
                    .select("daily_revenue, sales_date")
                    .select("daily_revenue, daily_cogs, sales_date")
                    .eq("user_id", user.id)
                    .gte("sales_date", start6Months)
                    .lte("sales_date", endStr)
            ])

            const pastExpenses = pastExpensesResult.data || []
            const pastSales = salesResult.data || []

            const chartData = []
            let currentMonthRevenue = 0 // Track for summary
            let currentMonthCogs = 0 // Track for summary

            for (let i = 5; i >= 0; i--) {
                const date = subMonths(now, i)
                const monthKey = format(date, "yyyy-MM")
                const monthLabel = format(date, "M월")

                // Agg Expenses
                const monthExp = pastExpenses
                    .filter(r => r.expense_date.startsWith(monthKey))
                    .reduce((sum, r) => sum + Number(r.amount), 0)

                // Agg Sales
                const monthSalesData = pastSales.filter(r => r.sales_date.startsWith(monthKey))
                const monthSales = monthSalesData.reduce((sum, r) => sum + Number(r.daily_revenue), 0)
                const monthCogs = monthSalesData.reduce((sum, r) => sum + Number(r.daily_cogs || 0), 0)

                // If it's current month, store it
                if (i === 0) {
                    currentMonthRevenue = monthSales
                    currentMonthCogs = monthCogs
                }

                // Profit = Revenue - COGS - Expenses
                const monthProfit = monthSales - monthCogs - monthExp

                chartData.push({
                    month: monthLabel,
                    revenue: monthSales,
                    expenses: monthExp,
                    profit: monthProfit
                })
            }

            // 5. Top Menus (Fetch latest 5)
            const { data: latestRecipes } = await supabase
                .from("recipes")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(5)

            // Summary Calculation
            // If current month revenue > 0, use it. Else use Target.
            const displayRevenue = currentMonthRevenue > 0 ? currentMonthRevenue : targetRevenue
            const displayCogs = currentMonthCogs > 0 ? currentMonthCogs : (displayRevenue * 0.35) // Fallback to 35% COGS if no data
            const estimatedProfit = (displayRevenue - displayCogs) - totalExpenses

            const realMarginRate = displayRevenue > 0 ? ((displayRevenue - displayCogs) / displayRevenue) * 100 : 65

            console.log("[useDashboard] Loaded chartData (Real Sales & COGS):", chartData)

            setSummary({
                ingredientCount,
                recipeCount,
                avgMarginRate: Math.round(realMarginRate),
                totalExpenses,
                targetRevenue, // Still needed for benchmark
                estimatedProfit // Based on actual if available, else target
            })
            setRecentIngredients(recentIngs)
            setTopMenus(latestRecipes || [])
            setChartData(chartData)

        } catch (e) {
            console.error("Dashboard fetch error:", e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchDashboardData()
    }, [fetchDashboardData])

    return {
        summary,
        recentIngredients,
        topMenus,
        chartData,
        loading,
        refresh: fetchDashboardData
    }
}
