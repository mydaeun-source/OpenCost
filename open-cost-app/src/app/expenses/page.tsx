"use client"

import { useState, useEffect, useMemo } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { NumericInput } from "@/components/ui/NumericInput"
import { Dialog } from "@/components/ui/Dialog"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Plus, Trash2, Calendar as CalendarIcon, Receipt, TrendingUp, Filter, ArrowRight, Wallet, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns"
import { useDashboard } from "@/hooks/useDashboard"
import Link from "next/link"

// Types
interface ExpenseCategory {
    id: string
    name: string
    default_amount: number | null
    is_fixed: boolean
}

interface ExpenseRecord {
    id: string
    expense_date: string
    amount: number
    category_id: string
    category_name?: string // Joined
    memo: string | null
}

export default function ExpensesPage() {
    const [activeTab, setActiveTab] = useState<'history' | 'items' | 'report'>('history')
    const [loading, setLoading] = useState(false)
    const { summary, loading: dashboardLoading } = useDashboard()

    // Data State
    const [categories, setCategories] = useState<ExpenseCategory[]>([])
    const [records, setRecords] = useState<ExpenseRecord[]>([])

    // UI State
    const [isAddRecordOpen, setIsAddRecordOpen] = useState(false)
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)

    // Filters (Records)
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM

    // ============================================================================================
    // 1. Data Fetching
    // ============================================================================================
    useEffect(() => {
        fetchCategories()
    }, [])

    useEffect(() => {
        if (activeTab === 'history' || activeTab === 'report') {
            fetchRecords(selectedMonth)
        }
    }, [activeTab, selectedMonth])

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from("expense_categories")
            .select("*")
            .order("created_at", { ascending: true })
        if (data) setCategories(data)
    }

    const fetchRecords = async (month: string) => {
        setLoading(true)
        try {
            // month is YYYY-MM
            const baseDate = parseISO(`${month}-01`)
            const startDate = format(startOfMonth(baseDate), "yyyy-MM-dd")
            const endDate = format(endOfMonth(baseDate), "yyyy-MM-dd")

            const { data, error } = await supabase
                .from("expense_records")
                .select(`
                    *,
                    expense_categories (name)
                `)
                .gte("expense_date", startDate)
                .lte("expense_date", endDate)
                .order("expense_date", { ascending: false })

            if (error) throw error

            if (data) {
                setRecords(data.map(r => ({
                    ...r,
                    category_name: (r.expense_categories as any)?.name || "미분류"
                })))
            }
        } catch (e: any) {
            console.error("Fetch records error:", e)
            toast({ title: "데이터 조회 실패", description: e.message, type: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    // ============================================================================================
    // 2. Actions (Category)
    // ============================================================================================
    const handleAddCategory = async (name: string, defaultAmount: number, isFixed: boolean) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from("expense_categories").insert({
            user_id: user.id,
            name,
            default_amount: defaultAmount || null,
            is_fixed: isFixed
        })

        if (!error) {
            toast({ title: "저장 완료", description: "비용 항목이 추가되었습니다." })
            fetchCategories()
            setIsAddCategoryOpen(false)
        } else {
            toast({ title: "저장 실패", description: error.message, type: "destructive" })
        }
    }

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("정말 이 항목을 삭제하시겠습니까?")) return
        const { error } = await supabase.from("expense_categories").delete().eq("id", id)
        if (!error) fetchCategories()
    }

    // ============================================================================================
    // 3. Actions (Record)
    // ============================================================================================
    const handleAddRecord = async (date: string, categoryId: string, amount: number, memo: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from("expense_records").insert({
            user_id: user.id,
            expense_date: date,
            category_id: categoryId,
            amount,
            memo
        })

        if (!error) {
            toast({ title: "등록 완료", description: "지출 내역이 저장되었습니다." })

            // If the added record is in the current viewing month, refresh
            if (date.startsWith(selectedMonth)) {
                fetchRecords(selectedMonth)
            } else {
                toast({ title: "참고", description: "등록된 날짜가 현재 보고 있는 달과 달라 리스트에 표시되지 않을 수 있습니다." })
                // Optional: switch month to date's month
                setSelectedMonth(date.slice(0, 7))
            }

            setIsAddRecordOpen(false)
        } else {
            toast({ title: "등록 실패", description: error.message, type: "destructive" })
        }
    }

    const handleDeleteRecord = async (id: string) => {
        if (!confirm("정말 이 내역을 삭제하시겠습니까?")) return
        const { error } = await supabase.from("expense_records").delete().eq("id", id)
        if (!error) fetchRecords(selectedMonth)
    }


    // ============================================================================================
    // 4. Report Calculations
    // ============================================================================================
    const reportData = useMemo(() => {
        const totalExpense = records.reduce((sum, r) => sum + Number(r.amount), 0)
        // Group by category
        const byCategory = records.reduce((acc, r) => {
            const name = r.category_name || "Unknown"
            acc[name] = (acc[name] || 0) + Number(r.amount)
            return acc
        }, {} as Record<string, number>)

        return { totalExpense, byCategory }
    }, [records])


    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white italic">비용 관리</h1>
                        <p className="text-slate-200 mt-1 font-black">매장 지출과 고정비를 체계적으로 관리합니다.</p>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex gap-2 border-b border-white/10 pb-1">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'history' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white")}
                    >
                        지출 내역 (History)
                    </button>
                    <button
                        onClick={() => setActiveTab('items')}
                        className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'items' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white")}
                    >
                        비용 항목 설정 (Items)
                    </button>
                    <button
                        onClick={() => setActiveTab('report')}
                        className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'report' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white")}
                    >
                        손익 리포트 (Report)
                    </button>
                </div>

                {/* ======================= TAB: HISTORY ======================= */}
                {activeTab === 'history' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-muted/20 p-4 rounded-lg">
                            <div className="flex items-center gap-4">
                                <Input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-40 bg-slate-800 border-slate-600 text-white font-black"
                                />
                                <div className="text-sm">
                                    <span className="text-muted-foreground">총 지출:</span>
                                    <span className="ml-2 text-xl font-bold text-white">{reportData.totalExpense.toLocaleString()}원</span>
                                </div>
                            </div>
                            <Button onClick={() => setIsAddRecordOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> 지출 등록
                            </Button>
                        </div>

                        <div className="rounded-xl border border-white/10 overflow-hidden bg-card">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-800 text-slate-100 font-black border-b border-slate-700">
                                    <tr>
                                        <th className="p-4 w-[120px] uppercase tracking-widest text-xs">날짜</th>
                                        <th className="p-4 w-[150px] uppercase tracking-widest text-xs">항목</th>
                                        <th className="p-4 uppercase tracking-widest text-xs">내용 (메모)</th>
                                        <th className="p-4 text-right w-[150px] uppercase tracking-widest text-xs font-black">금액</th>
                                        <th className="p-4 text-center w-[80px] uppercase tracking-widest text-xs">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {records.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                지출 내역이 없습니다.
                                            </td>
                                        </tr>
                                    ) : (
                                        records.map((record) => (
                                            <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="p-4 font-mono font-black text-indigo-300 tracking-tighter">{record.expense_date}</td>
                                                <td className="p-4">
                                                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">
                                                        {record.category_name}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-200 font-black">{record.memo}</td>
                                                <td className="p-4 text-right font-medium">{Number(record.amount).toLocaleString()}원</td>
                                                <td className="p-4 text-center">
                                                    <button onClick={() => handleDeleteRecord(record.id)} className="text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ======================= TAB: ITEMS ======================= */}
                {activeTab === 'items' && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button onClick={() => setIsAddCategoryOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> 항목 추가
                            </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            {categories.map((cat) => (
                                <Card key={cat.id} className="relative group">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex justify-between items-center">
                                            {cat.name}
                                            {cat.is_fixed && <span className="text-xs font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/40 uppercase tracking-widest">고정비</span>}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            기본 금액: {cat.default_amount ? `${cat.default_amount.toLocaleString()}원` : "미설정"}
                                        </p>
                                        <button
                                            onClick={() => handleDeleteCategory(cat.id)}
                                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* ======================= TAB: REPORT ======================= */}
                {activeTab === 'report' && (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>이번 달 지출 분석 ({selectedMonth})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold text-white mb-4">
                                        {reportData.totalExpense.toLocaleString()}원
                                    </div>
                                    <div className="space-y-3 pt-2">
                                        {Object.entries(reportData.byCategory)
                                            .sort((a, b) => Number(b[1]) - Number(a[1])) // Robust Sort
                                            .map(([name, amount]) => (
                                                <div key={name} className="flex items-center gap-4 text-xs">
                                                    {/* Category Name (Fixed Width) */}
                                                    <span className="w-24 shrink-0 text-slate-400 font-black truncate uppercase tracking-tighter">
                                                        {name}
                                                    </span>

                                                    {/* Bar (Flexible) */}
                                                    <div className="flex-1 h-1.5 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                                                        <div
                                                            className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)] transition-all duration-700 ease-out"
                                                            style={{ width: `${(amount / (reportData.totalExpense || 1)) * 100}%` }}
                                                        />
                                                    </div>

                                                    {/* Amount (Fixed Width) */}
                                                    <span className="w-24 shrink-0 text-right font-black text-white italic tracking-tight">
                                                        {amount.toLocaleString()}원
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-indigo-600 border-0 shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Wallet className="h-4 w-4 text-white/70" />
                                        <CardTitle className="text-white">순이익 분석 요약</CardTitle>
                                    </div>
                                    <CardDescription className="text-white/60">현재 설정 및 매출 기준 예상 데이터입니다.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 relative z-10">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">이번 달 예상 순이익</p>
                                        <div className="text-3xl font-black text-white italic tracking-tighter">
                                            {dashboardLoading ? "불러오는 중..." : `${Math.round(summary.estimatedProfit).toLocaleString()}원`}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-xs text-white/80 font-bold border-t border-white/10 pt-4">
                                        <span>평균 예상 마진율</span>
                                        <span className="text-emerald-300">{summary.avgMarginRate}%</span>
                                    </div>

                                    <Link href="/analysis/profit" className="block">
                                        <Button className="w-full bg-white text-indigo-600 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest">
                                            상세 분석 및 시뮬레이션 <ChevronRight className="ml-2 h-3 w-3" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* MODALS */}
                <AddCategoryDialog
                    isOpen={isAddCategoryOpen}
                    onClose={() => setIsAddCategoryOpen(false)}
                    onSubmit={handleAddCategory}
                />

                <AddRecordDialog
                    isOpen={isAddRecordOpen}
                    onClose={() => setIsAddRecordOpen(false)}
                    categories={categories}
                    onSubmit={handleAddRecord}
                />
            </div>
        </AppLayout>
    )
}

function AddCategoryDialog({ isOpen, onClose, onSubmit }: any) {
    const [name, setName] = useState("")
    const [amount, setAmount] = useState("")
    const [isFixed, setIsFixed] = useState(false)

    const handleSubmit = () => {
        if (!name) return alert("항목명을 입력하세요")
        onSubmit(name, Number(amount), isFixed)
        setName(""); setAmount(""); setIsFixed(false);
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="비용 항목 추가" description="자주 사용하는 비용 항목을 등록하세요.">
            <div className="space-y-4 mt-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">항목 이름 (예: 임대료)</label>
                    <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">기본 금액 (선택)</label>
                    <NumericInput
                        value={Number(amount) || 0}
                        onChange={(val: number) => setAmount(val.toString())}
                        placeholder="0"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <input type="checkbox" checked={isFixed} onChange={e => setIsFixed(e.target.checked)} id="fixed" className="h-4 w-4" />
                    <label htmlFor="fixed" className="text-sm">매달 고정적으로 나가는 비용 (고정비)</label>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={onClose}>취소</Button>
                    <Button onClick={handleSubmit}>등록</Button>
                </div>
            </div>
        </Dialog>
    )
}

function AddRecordDialog({ isOpen, onClose, categories, onSubmit }: any) {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [catId, setCatId] = useState("")
    const [amount, setAmount] = useState("")
    const [memo, setMemo] = useState("")

    const handleSubmit = () => {
        if (!catId) return alert("항목을 선택하세요")
        if (!amount) return alert("금액을 입력하세요")
        onSubmit(date, catId, Number(amount), memo)
        setAmount(""); setMemo(""); // Keep date/catId for convenience?
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="지출 내역 등록" description="사용 내역을 기록하세요.">
            <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">날짜</label>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">항목</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={catId}
                            onChange={e => {
                                setCatId(e.target.value)
                                const cat = categories.find((c: any) => c.id === e.target.value)
                                if (cat?.default_amount) setAmount(cat.default_amount.toString())
                            }}
                        >
                            <option value="">선택하세요</option>
                            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">금액</label>
                    <NumericInput
                        value={Number(amount) || 0}
                        onChange={(val: number) => setAmount(val.toString())}
                        placeholder="0"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">메모</label>
                    <Input value={memo} onChange={e => setMemo(e.target.value)} placeholder="내용 입력..." />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={onClose}>취소</Button>
                    <Button onClick={handleSubmit}>저장</Button>
                </div>
            </div>
        </Dialog>
    )
}
