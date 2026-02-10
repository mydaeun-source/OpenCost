"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { SummaryCards } from "@/components/dashboard/SummaryCards"
import { RecentIngredients } from "@/components/dashboard/RecentIngredients"
import { HighMarginMenus } from "@/components/dashboard/HighMarginMenus"
import { StockAlertCard } from "@/components/dashboard/StockAlertCard"
import { MonthlyProfitChart } from "@/components/dashboard/MonthlyProfitChart"
import { FinancialInsights } from "@/components/dashboard/FinancialInsights"
import { InventoryAnalyticsCards } from "@/components/dashboard/InventoryAnalyticsCards"
import { SourcingOptimizationCard } from "@/components/dashboard/SourcingOptimizationCard"
import { useDashboard } from "@/hooks/useDashboard"
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard"
import {
  Lightbulb,
  BarChart3 as ChartIcon,
  Package,
  Zap,
  LayoutDashboard,
  AlertTriangle,
  Flame,
  Clock,
  RotateCcw
} from "lucide-react"

const DEFAULT_WIDGET_ORDER = [
  "dash-insights",
  "dash-inventory",
  "dash-sourcing",
  "dash-summary",
  "dash-trends",
  "dash-alerts",
  "dash-topmenus",
  "dash-recent"
]

export default function DashboardPage() {
  const { summary, recentIngredients, topMenus, chartData, loading, refresh } = useDashboard()
  const [widgetOrder, setWidgetOrder] = useState<string[]>([])
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null)

  // Load order from localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem("dash_widget_order")
    if (savedOrder) {
      try {
        setWidgetOrder(JSON.parse(savedOrder))
      } catch (e) {
        setWidgetOrder(DEFAULT_WIDGET_ORDER)
      }
    } else {
      setWidgetOrder(DEFAULT_WIDGET_ORDER)
    }
  }, [])

  // Save order to localStorage
  const saveOrder = (newOrder: string[]) => {
    setWidgetOrder(newOrder)
    localStorage.setItem("dash_widget_order", JSON.stringify(newOrder))
  }

  const resetOrder = () => {
    if (window.confirm("대시보드 레이아웃을 초기 상태로 되돌리시겠습니까?")) {
      saveOrder(DEFAULT_WIDGET_ORDER)
    }
  }

  // Drag handlers
  const handleDragStart = (id: string) => {
    setDraggedWidgetId(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetId: string) => {
    if (!draggedWidgetId || draggedWidgetId === targetId) return

    const newOrder = [...widgetOrder]
    const draggedIndex = newOrder.indexOf(draggedWidgetId)
    const targetIndex = newOrder.indexOf(targetId)

    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedWidgetId)

    saveOrder(newOrder)
    setDraggedWidgetId(null)
  }

  // Widget Registry
  const renderWidget = (id: string) => {
    switch (id) {
      case "dash-insights":
        return (
          <CollapsibleCard
            key={id}
            title="경영 인사이트 (AI Insights)"
            description="AI가 분석한 현재 매장의 핵심 전략 리포트입니다."
            icon={<Lightbulb className="h-4 w-4" />}
            storageKey="dash-insights"
            draggable={true}
            onDragStart={() => handleDragStart(id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(id)}
            className="col-span-full"
          >
            <FinancialInsights insights={summary.insights} />
          </CollapsibleCard>
        )
      case "dash-inventory":
        return (
          <CollapsibleCard
            key={id}
            title="재고 분석 (Inventory Analytics)"
            description="로스율 및 소진 예측을 통한 정밀 재료 관리입니다."
            icon={<Package className="h-4 w-4" />}
            storageKey="dash-inventory"
            draggable={true}
            onDragStart={() => handleDragStart(id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(id)}
            className="col-span-full"
          >
            <InventoryAnalyticsCards
              lossReport={summary.lossReport}
              depletionPredictions={summary.depletionPredictions}
              noWrapper={true}
            />
          </CollapsibleCard>
        )
      case "dash-sourcing":
        return (
          <CollapsibleCard
            key={id}
            title="구매 최적화 (Sourcing Optimization)"
            description="시장 시세 기반 구매 전략 제안입니다."
            icon={<Zap className="h-4 w-4" />}
            storageKey="dash-sourcing"
            draggable={true}
            onDragStart={() => handleDragStart(id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(id)}
            className="col-span-full"
          >
            <SourcingOptimizationCard
              opportunities={summary.sourcingOpportunities}
              noWrapper={true}
            />
          </CollapsibleCard>
        )
      case "dash-summary":
        return (
          <CollapsibleCard
            key={id}
            title="핵심 요약 지표 (Key Metrics)"
            description="주요 원가 및 수익 지표 현황입니다."
            icon={<LayoutDashboard className="h-4 w-4" />}
            storageKey="dash-summary"
            draggable={true}
            onDragStart={() => handleDragStart(id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(id)}
            className="col-span-full"
          >
            <SummaryCards
              ingredientCount={summary.ingredientCount}
              recipeCount={summary.recipeCount}
              avgMarginRate={summary.avgMarginRate}
              totalExpenses={summary.totalExpenses}
              targetRevenue={summary.targetRevenue}
              estimatedProfit={summary.estimatedProfit}
              trends={(summary as any).trends}
            />
          </CollapsibleCard>
        )
      case "dash-trends":
        return (
          <CollapsibleCard
            key={id}
            title="데이터 추이 분석"
            description="최근 6개월간의 매출 및 지출 변화입니다."
            icon={<ChartIcon className="h-4 w-4" />}
            storageKey="dash-trends"
            draggable={true}
            onDragStart={() => handleDragStart(id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(id)}
            className="col-span-12 xl:col-span-8 h-full"
          >
            <MonthlyProfitChart data={chartData} noWrapper={true} />
          </CollapsibleCard>
        )
      case "dash-alerts":
        return (
          <CollapsibleCard
            key={id}
            title="재고 경고"
            icon={<AlertTriangle className="h-4 w-4" />}
            storageKey="dash-alerts"
            draggable={true}
            onDragStart={() => handleDragStart(id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(id)}
            className="col-span-12 xl:col-span-4"
          >
            <StockAlertCard noWrapper={true} />
          </CollapsibleCard>
        )
      case "dash-topmenus":
        return (
          <CollapsibleCard
            key={id}
            title="최고 효율 메뉴"
            icon={<Flame className="h-4 w-4" />}
            storageKey="dash-topmenus"
            draggable={true}
            onDragStart={() => handleDragStart(id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(id)}
            className="col-span-12 xl:col-span-4"
          >
            <HighMarginMenus menus={topMenus} noWrapper={true} />
          </CollapsibleCard>
        )
      case "dash-recent":
        return (
          <CollapsibleCard
            key={id}
            title="최신 등록 식자재"
            icon={<Clock className="h-4 w-4" />}
            storageKey="dash-recent"
            draggable={true}
            onDragStart={() => handleDragStart(id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(id)}
            className="col-span-12 xl:col-span-4"
          >
            <RecentIngredients ingredients={recentIngredients} noWrapper={true} />
          </CollapsibleCard>
        )
      default:
        return null
    }
  }

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
          <div className="flex items-center gap-4">
            <button
              onClick={resetOrder}
              className="flex items-center gap-1 text-xs font-black text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-widest"
              title="순서 초기화"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 배치 초기화
            </button>
            <button
              onClick={refresh}
              className="text-sm font-black text-primary hover:underline disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "업데이트 중..." : "새로고침"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {widgetOrder.map((id) => renderWidget(id))}
        </div>
      </div>
    </AppLayout>
  )
}
