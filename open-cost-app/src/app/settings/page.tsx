"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { AppLayout } from "@/components/layout/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { NumericInput } from "@/components/ui/NumericInput"
import { Settings, User, LogOut, Banknote, TrendingUp, Loader2, Trash2, Database, Coins, Key } from "lucide-react"

export default function SettingsPage() {
    const [fixedCost, setFixedCost] = useState("")
    const [targetSales, setTargetSales] = useState("")
    const [actualFixedTotal, setActualFixedTotal] = useState<number>(0)
    const [settingsLoading, setSettingsLoading] = useState(false)
    const [seedLoading, setSeedLoading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [kamisKey, setKamisKey] = useState("")
    const [kamisId, setKamisId] = useState("")

    useEffect(() => {
        loadSettings()
        // Load KAMIS from local storage
        setKamisKey(localStorage.getItem("KAMIS_API_KEY") || "")
        setKamisId(localStorage.getItem("KAMIS_USER_ID") || "")
    }, [])

    const loadSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Load Saved Settings
            const { data, error } = await supabase
                .from("store_settings")
                .select("*")
                .eq("user_id", user.id)
                .single()

            if (data) {
                setFixedCost(data.monthly_fixed_cost?.toString() || "")
                setTargetSales(data.monthly_target_sales_count?.toString() || "")
            }

            // 2. Calculate Actual Fixed Expenses Sum
            const { data: categories } = await supabase
                .from("expense_categories")
                .select("default_amount")
                .eq("user_id", user.id)
                .eq("is_fixed", true)

            const total = categories?.reduce((sum, cat) => sum + (cat.default_amount || 0), 0) || 0
            setActualFixedTotal(total)

        } catch (error) {
            console.error("Settings load error:", error)
        }
    }

    const saveKamisSettings = () => {
        localStorage.setItem("KAMIS_API_KEY", kamisKey)
        localStorage.setItem("KAMIS_USER_ID", kamisId)
        alert("KAMIS API 설정이 저장되었습니다. 이제 식재료 매핑 시 시세를 확인할 수 있습니다.")
    }

    const handleSyncWithExpenses = () => {
        setIsSyncing(true)
        setFixedCost(actualFixedTotal.toString())
        setTimeout(() => {
            setIsSyncing(false)
            alert("비용 관리의 고정비 항목을 기반으로 설정되었습니다.")
        }, 500)
    }

    const saveSettings = async () => {
        try {
            setSettingsLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("No user")

            const { error } = await supabase
                .from("store_settings")
                .upsert({
                    user_id: user.id,
                    monthly_fixed_cost: Number(fixedCost) || 0,
                    monthly_target_sales_count: Number(targetSales) || 0,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error
            alert("저장되었습니다.")
        } catch (error) {
            console.error("Error saving settings:", error)
            alert("설정 저장 실패")
        } finally {
            setSettingsLoading(false)
        }
    }

    // Unified Seeding Handler
    const handleGenerateAllData = async () => {
        if (!confirm("🚨 경고: 모든 기존 데이터(재료, 레시피, 매출, 매입, 지출)가 삭제됩니다!\n\n정말 초기화하고 6개월치 전체 샘플 데이터를 생성하시겠습니까?")) return

        setSeedLoading(true)
        try {
            const { runUnifiedSeed } = await import("@/lib/seed-manager")
            await runUnifiedSeed()

            alert("✅ 모든 샘플 데이터 생성이 완료되었습니다!\n\n지난 6개월간의 매입, 매출, 지출 내역이 시뮬레이션되었습니다.")
            window.location.href = "/"
        } catch (e: any) {
            console.error(e)
            alert("데이터 생성 실패: " + e.message)
        } finally {
            setSeedLoading(false)
        }
    }

    // Calculate overhead per unit
    const overheadPerUnit = (Number(fixedCost) > 0 && Number(targetSales) > 0)
        ? Math.round(Number(fixedCost) / Number(targetSales))
        : 0

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">설정</h1>
                    <p className="text-muted-foreground mt-1">계정 및 애플리케이션 설정을 관리합니다.</p>
                </div>

                <div className="grid gap-6">
                    {/* 1. Store Cost Settings */}
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Banknote className="h-5 w-5 text-primary" />
                                <CardTitle>매장 비용 설정 (자동 배분)</CardTitle>
                            </div>
                            <CardDescription>
                                월 고정비용을 목표 판매량으로 나누어, 모든 메뉴에 <b>기본 비용(Overhead)</b>으로 자동 배분합니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">월 고정비 총액 (임대료, 인건비 등)</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Banknote className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <NumericInput
                                                placeholder="예: 3000000"
                                                className="pl-9"
                                                value={Number(fixedCost) || 0}
                                                onChange={(val: number) => setFixedCost(val.toString())}
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSyncWithExpenses}
                                            disabled={isSyncing || actualFixedTotal === 0}
                                            className="h-10 text-[10px] font-black uppercase tracking-widest border-indigo-500/30 text-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10"
                                        >
                                            {isSyncing ? "SYNC..." : "실제 비용 연동"}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        현재 등록된 실제 고정비: <b className="text-indigo-500">{actualFixedTotal.toLocaleString()}원</b> (항목 설정 기준)
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">월 목표 판매수량 (메뉴 개수)</label>
                                    <div className="relative">
                                        <TrendingUp className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <NumericInput
                                            placeholder="예: 1000"
                                            className="pl-9"
                                            value={Number(targetSales) || 0}
                                            onChange={(val: number) => setTargetSales(val.toString())}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white/5 border border-white/10 p-4 items-center flex justify-between shadow-sm">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">메뉴 1개당 배분될 비용</p>
                                    <p className="text-xs text-muted-foreground">모든 메뉴의 원가에 이 금액이 자동으로 추가됩니다.</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-primary">+{overheadPerUnit.toLocaleString()}원</p>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={saveSettings} disabled={settingsLoading}>
                                    {settingsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    설정 저장
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* KAMIS API Settings */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Key className="h-5 w-5 text-indigo-500" />
                                <CardTitle>KAMIS 시장 시세 설정</CardTitle>
                            </div>
                            <CardDescription>
                                농수산물 유통정보(KAMIS) 오픈 API를 연동하여 전국 평균 시세를 실시간으로 비교합니다.
                                <a href="https://www.kamis.or.kr/service/price/xml.do?action=interfaceGuide" target="_blank" className="text-indigo-500 hover:underline ml-1">발급 안내</a>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">KAMIS API Key (인증키)</label>
                                    <Input
                                        placeholder="인증키를 입력하세요"
                                        value={kamisKey}
                                        onChange={(e) => setKamisKey(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">KAMIS User ID (요청자 ID)</label>
                                    <Input
                                        placeholder="사용자 ID를 입력하세요"
                                        value={kamisId}
                                        onChange={(e) => setKamisId(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={saveKamisSettings} variant="outline" className="border-indigo-500 text-indigo-500 hover:bg-indigo-500/10">
                                    API 설정 저장
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. System Management (Data Seeding) */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Database className="h-5 w-5 text-primary" />
                                <CardTitle>데이터 관리</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">6개월 샘플 데이터 시뮬레이션 (추천)</p>
                                    <p className="text-sm text-muted-foreground">
                                        기본 자료(재료+메뉴)와 함께 <b>지난 6개월간의 매입, 매출, 지출, 재고 로그</b>를 실감나게 생성합니다.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleGenerateAllData}
                                    disabled={seedLoading}
                                    className="border-primary/50 text-primary hover:bg-primary/10 font-bold"
                                >
                                    {seedLoading ? "시뮬레이션 중..." : "6개월 샘플 생성"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. User Account */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                <CardTitle>내 계정</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-4">
                                <div>
                                    <p className="font-medium">로그인 정보</p>
                                    <p className="text-sm text-muted-foreground">
                                        안전한 데이터 관리를 위해 로그아웃할 수 있습니다.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        await import("@/lib/supabase").then(m => m.supabase.auth.signOut())
                                        window.location.href = "/login"
                                    }}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    로그아웃
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. Danger Zone */}
                    <Card className="border-red-500/30 bg-red-500/5">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Trash2 className="h-5 w-5 text-red-500" />
                                <CardTitle className="text-red-500">위험 구역</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">회원 탈퇴 (계정 삭제)</p>
                                    <p className="text-sm text-muted-foreground">
                                        모든 데이터(설정, 레시피, 재료 등)를 영구적으로 삭제하고 로그아웃합니다.
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    onClick={async () => {
                                        if (!confirm("🚨 정말로 탈퇴하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 작성하신 모든 레시피와 원가 데이터가 즉시 삭제됩니다.")) return

                                        try {
                                            setSettingsLoading(true)
                                            const { data: { user } } = await supabase.auth.getUser()
                                            if (!user) throw new Error("No user found")

                                            await supabase.from("store_settings").delete().eq("user_id", user.id)
                                            await supabase.from("recipe_ingredients").delete().in("recipe_id", (
                                                await supabase.from("recipes").select("id").eq("user_id", user.id)
                                            ).data?.map(r => r.id) || [])
                                            await supabase.from("recipes").delete().eq("user_id", user.id)
                                            await supabase.from("ingredients").delete().eq("user_id", user.id)
                                            await supabase.from("categories").delete().eq("user_id", user.id)
                                            await supabase.from("expense_records").delete().eq("user_id", user.id)
                                            await supabase.from("expense_categories").delete().eq("user_id", user.id)

                                            await supabase.auth.signOut()
                                            alert("모든 데이터가 삭제되었습니다. 이용해 주셔서 감사합니다.")
                                            window.location.href = "/login"
                                        } catch (e: any) {
                                            console.error(e)
                                            alert("탈퇴 처리 중 오류가 발생했습니다: " + e.message)
                                        } finally {
                                            setSettingsLoading(false)
                                        }
                                    }}
                                >
                                    회원 탈퇴
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    )
}
