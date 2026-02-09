"use client"

import { AppLayout } from "@/components/layout/AppLayout"
import { SummaryCards } from "@/components/dashboard/SummaryCards"
import { RecentIngredients } from "@/components/dashboard/RecentIngredients"
import { HighMarginMenus } from "@/components/dashboard/HighMarginMenus"
import { StockAlertCard } from "@/components/dashboard/StockAlertCard"
import { MonthlyProfitChart } from "@/components/dashboard/MonthlyProfitChart"
import { useDashboard } from "@/hooks/useDashboard"

export default function DashboardPage() {
  const { summary, recentIngredients, topMenus, chartData, loading, refresh } = useDashboard()

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              현재 매장의 원가 및 메뉴 현황입니다.
            </p>
          </div>
          {/* Refresh Button - Optional */}
          <button
            onClick={refresh}
            className="text-sm text-primary hover:underline disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "업데이트 중..." : "새로고침"}
          </button>
        </div>

        <SummaryCards
          ingredientCount={summary.ingredientCount}
          recipeCount={summary.recipeCount}
          avgMarginRate={summary.avgMarginRate}
          totalExpenses={summary.totalExpenses}
          targetRevenue={summary.targetRevenue}
          estimatedProfit={summary.estimatedProfit}
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            <MonthlyProfitChart data={chartData} />
          </div>
          <div className="col-span-3 space-y-4">
            <StockAlertCard />
            <HighMarginMenus menus={topMenus} />
            <RecentIngredients ingredients={recentIngredients} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
