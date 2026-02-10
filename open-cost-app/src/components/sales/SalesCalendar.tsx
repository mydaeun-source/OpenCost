"use client"

import { useState, useEffect } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"
import { ko } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { fetchSalesRecords, SalesRecord, upsertSalesRecord } from "@/lib/api/sales"
import { SalesDialog } from "./SalesDialog" // Make sure to import this correctly
import { supabase } from "@/lib/supabase"
import { useStore } from "@/contexts/StoreContext"

export function SalesCalendar() {
    const { activeStore } = useStore()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [salesData, setSalesData] = useState<SalesRecord[]>([])
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedRecord, setSelectedRecord] = useState<SalesRecord | undefined>(undefined)

    // Load Data
    const loadSalesData = async () => {
        setLoading(true)
        try {
            if (!activeStore) return

            const year = currentDate.getFullYear()
            const month = currentDate.getMonth() + 1 // 1-based index
            const startStr = format(startOfMonth(currentDate), "yyyy-MM-dd")
            const endStr = format(endOfMonth(currentDate), "yyyy-MM-dd")

            const data = await fetchSalesRecords(activeStore.id, startStr, endStr)
            setSalesData(data || [])
        } catch (e) {
            console.error("Failed to load sales:", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadSalesData()
    }, [currentDate])

    // Calendar Grid Logic
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    // Handlers
    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const handleDayClick = (day: Date) => {
        const record = salesData.find(r => r.sales_date === format(day, "yyyy-MM-dd"))
        setSelectedDate(day)
        setSelectedRecord(record)
        setDialogOpen(true)
    }

    const totalRevenue = salesData.reduce((sum, r) => sum + Number(r.daily_revenue), 0)

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle className="text-xl font-bold">
                        {format(currentDate, "yyyy년 M월")}
                    </CardTitle>
                    <Button variant="outline" size="icon" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="text-right mb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">월 매출 합계</p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 italic tracking-tighter">
                        {totalRevenue.toLocaleString()}<span className="text-xs font-normal ml-0.5 opacity-50">원</span>
                    </p>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-sm font-medium p-2">
                    {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                        <div key={day} className={i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7 auto-rows-fr h-[500px]">
                    {calendarDays.map((day, i) => {
                        const isCurrentMonth = isSameMonth(day, monthStart)
                        const dateKey = format(day, "yyyy-MM-dd")
                        const record = salesData.find(r => r.sales_date === dateKey)
                        const isToday = isSameDay(day, new Date())

                        return (
                            <div
                                key={day.toString()}
                                className={`
                                    border-r border-b p-2 flex flex-col justify-between cursor-pointer hover:bg-muted/50 transition-colors
                                    ${!isCurrentMonth ? "bg-muted/20 text-muted-foreground" : ""}
                                    ${isToday ? "bg-primary/5 font-semibold text-primary" : ""}
                                `}
                                onClick={() => handleDayClick(day)}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-sm ${day.getDay() === 0 ? "text-red-500" : day.getDay() === 6 ? "text-blue-500" : ""
                                        }`}>
                                        {format(day, "d")}
                                    </span>
                                    {isToday && <span className="text-xs font-black bg-primary text-primary-foreground px-1.5 py-0.5 rounded shadow-sm">오늘</span>}
                                </div>

                                <div className="mt-1 text-right">
                                    {record ? (
                                        <>
                                            <p className="font-bold text-sm md:text-base">
                                                {Number(record.daily_revenue).toLocaleString()}
                                            </p>
                                            {record.memo && (
                                                <p className="text-xs font-black text-slate-200 truncate max-w-full">
                                                    {record.memo}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <div className="group flex justify-end opacity-0 hover:opacity-100 transition-opacity">
                                            <Plus className="h-4 w-4 text-muted-foreground/50" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>

            {/* Dialog */}
            <SalesDialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                date={selectedDate}
                initialAmount={selectedRecord?.daily_revenue}
                initialMemo={selectedRecord?.memo || ""}
                recordId={selectedRecord?.id}
                onSaved={loadSalesData}
            />
        </Card>
    )
}
