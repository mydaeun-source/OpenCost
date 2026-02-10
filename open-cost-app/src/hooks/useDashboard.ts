import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/types/database.types"
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns"
import { useStore } from "@/contexts/StoreContext"

type Ingredient = Database["public"]["Tables"]["ingredients"]["Row"]
type Recipe = Database["public"]["Tables"]["recipes"]["Row"]
type ExpenseRecord = Database["public"]["Tables"]["expense_records"]["Row"]

export interface ChartData {
    month: string
    revenue: number
    expenses: number
    profit: number
}

import { createPurchase, getPriceSpikes } from "@/lib/api/procurement"
import { getInventoryLossReport, getPredictiveDepletion, getSourcingOptimization, InventoryLossReport } from "@/lib/api/inventory-analytics"

export interface Insight {
    type: 'warning' | 'info' | 'success'
    title: string
    description: string
    value?: string
}

export interface DashboardSummary {
    ingredientCount: number
    recipeCount: number
    avgMarginRate: number
    totalExpenses: number
    targetRevenue: number
    estimatedProfit: number
    insights: Insight[]
    lossReport: InventoryLossReport[]
    depletionPredictions: any[]
    sourcingOpportunities: any[]
}

export function useDashboard() {
    const [summary, setSummary] = useState<DashboardSummary>({
        ingredientCount: 0,
        recipeCount: 0,
        avgMarginRate: 0,
        totalExpenses: 0,
        targetRevenue: 0,
        estimatedProfit: 0,
        insights: [],
        lossReport: [],
        depletionPredictions: [],
        sourcingOpportunities: []
    })
    const [recentIngredients, setRecentIngredients] = useState<Ingredient[]>([])
    const [topMenus, setTopMenus] = useState<Recipe[]>([])
    const [chartData, setChartData] = useState<ChartData[]>([])
    const [loading, setLoading] = useState(true)
    const { activeStore, isAggregatedView, stores: allUserStores } = useStore()
    const targetStoreIds = (function () {
        if (isAggregatedView) return allUserStores.map(s => s.id)
        if (activeStore) return [activeStore.id]
        return []
    })()

    // Using JSON.stringify(targetStoreIds) as a dependency to ensure stability
    const storeIdsKey = JSON.stringify(targetStoreIds)

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true)
            if (targetStoreIds.length === 0) return

            const now = new Date()
            const startStr = format(startOfMonth(now), "yyyy-MM-dd")
            const endStr = format(endOfMonth(now), "yyyy-MM-dd")

            // Parallel Fetching
            const [
                ingredientsResult,
                recipesResult,
                recentIngResult,
                expensesResult,
                storesResult,
                allRecipes // Need all to calc avg price
            ] = await Promise.all([
                supabase.from("ingredients").select("id", { count: "exact" }).in("store_id", targetStoreIds),
                supabase.from("recipes").select("id", { count: "exact" }).in("store_id", targetStoreIds),
                supabase.from("ingredients").select("*").in("store_id", targetStoreIds).order("created_at", { ascending: false }).limit(5),
                supabase.from("expense_records")
                    .select("amount")
                    .in("store_id", targetStoreIds)
                    .gte("expense_date", startStr)
                    .lte("expense_date", endStr),
                supabase.from("stores").select("*").in("id", targetStoreIds),
                supabase.from("recipes").select("selling_price").in("store_id", targetStoreIds)
            ])

            // 1. Counts
            const ingredientCount = ingredientsResult.count || 0
            const recipeCount = recipesResult.count || 0

            // 2. Recent Ingredients
            const recentIngs = recentIngResult.data || []

            // 3. Financials (Current Month)
            const expenses = expensesResult.data || []
            const totalExpenses = expenses.reduce((sum, record) => sum + Number(record.amount), 0)

            const targetSalesCount = storesResult.data?.reduce((sum, s) => sum + (s.monthly_target_sales_count || 0), 0) || 1000 // Default aggregation

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
                    .in("store_id", targetStoreIds)
                    .gte("expense_date", start6Months)
                    .lte("expense_date", endStr),
                supabase
                    .from("sales_records")
                    .select("daily_revenue, daily_cogs, sales_date")
                    .in("store_id", targetStoreIds)
                    .gte("sales_date", start6Months)
                    .lte("sales_date", endStr)
            ])

            const pastExpenses = pastExpensesResult.data || []
            const pastSales = salesResult.data || []

            const chartData = []
            let currentMonthRevenue = 0
            let currentMonthCogs = 0
            let previousMonthRevenue = 0
            let previousMonthProfit = 0

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

                // Profit = Revenue - COGS - Expenses
                const monthProfit = monthSales - monthCogs - monthExp

                if (i === 0) {
                    currentMonthRevenue = monthSales
                    currentMonthCogs = monthCogs
                } else if (i === 1) {
                    previousMonthRevenue = monthSales
                    previousMonthProfit = monthProfit
                }

                chartData.push({
                    month: monthLabel,
                    revenue: monthSales,
                    expenses: monthExp,
                    profit: monthProfit
                })
            }

            // 5. Top Menus (Fetch latest 5 from any store)
            const { data: latestRecipes } = await supabase
                .from("recipes")
                .select("*")
                .in("store_id", targetStoreIds)
                .order("created_at", { ascending: false })
                .limit(5)

            // 6. Insights & Analytics
            let insights: Insight[] = []
            if (!isAggregatedView && activeStore) {
                const priceSpikes = await getPriceSpikes(activeStore.id)
                if (priceSpikes.length > 0) {
                    const topSpike = priceSpikes[0]
                    insights.push({
                        type: 'warning',
                        title: '식자재 가격 가파른 상승',
                        description: `[${topSpike.name}]의 매입가가 이전 평균보다 ${topSpike.percentIncrease}% 상승했습니다.`,
                        value: `${topSpike.latestPrice.toLocaleString()}원`
                    })
                }
            } else {
                insights.push({
                    type: 'info',
                    title: '통합 지점 데이터 확인 중',
                    description: `${targetStoreIds.length}개 사업장의 실시간 통합 매출/지출 현황입니다.`,
                    value: 'Integrated'
                })
            }

            // Margin Trend Insight (Refined)
            if (chartData.length >= 2) {
                const currentProfit = chartData[chartData.length - 1].profit
                const prevProfit = chartData[chartData.length - 2].profit
                if (currentProfit > prevProfit && currentProfit > 0) {
                    insights.push({
                        type: 'success',
                        title: '수익성 개선 포착',
                        description: '지난달 대비 실질 마진율과 영업이익이 개선되었습니다.',
                        value: 'Good'
                    })
                }
            }

            // Summary Calculation
            const displayRevenue = currentMonthRevenue > 0 ? currentMonthRevenue : targetRevenue
            const displayCogs = currentMonthCogs > 0 ? currentMonthCogs : (displayRevenue * 0.35)
            const estimatedProfit = (displayRevenue - displayCogs) - totalExpenses
            const realMarginRate = displayRevenue > 0 ? ((displayRevenue - displayCogs) / displayRevenue) * 100 : 65

            // Period-over-Period Trends
            const profitTrend = previousMonthProfit !== 0 ? ((estimatedProfit - previousMonthProfit) / Math.abs(previousMonthProfit)) * 100 : 0
            const revenueTrend = previousMonthRevenue !== 0 ? ((displayRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0

            // 7. Inventory & Sourcing Analytics
            let lossReport: InventoryLossReport[] = []
            let depletionPredictions: any[] = []
            let sourcingOpportunities: any[] = []

            if (!isAggregatedView && activeStore) {
                const [l, d, s] = await Promise.all([
                    getInventoryLossReport(30, activeStore.id),
                    getPredictiveDepletion(activeStore.id),
                    getSourcingOptimization(activeStore.id)
                ])
                lossReport = l
                depletionPredictions = d
                sourcingOpportunities = s
            }

            setSummary({
                ingredientCount,
                recipeCount,
                avgMarginRate: Math.round(realMarginRate),
                totalExpenses,
                targetRevenue,
                estimatedProfit,
                insights,
                lossReport,
                depletionPredictions,
                sourcingOpportunities,
                trends: {
                    profit: Math.round(profitTrend),
                    revenue: Math.round(revenueTrend)
                }
            } as any)

            setRecentIngredients(recentIngs)
            setTopMenus(latestRecipes || [])
            setChartData(chartData)

        } catch (e) {
            console.error("Dashboard fetch error:", e)
        } finally {
            setLoading(false)
        }
    }, [isAggregatedView, activeStore, storeIdsKey])

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
