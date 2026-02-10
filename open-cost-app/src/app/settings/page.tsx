"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { AppLayout } from "@/components/layout/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { NumericInput } from "@/components/ui/NumericInput"
import { Settings, User, LogOut, Banknote, TrendingUp, Loader2, Trash2, Database, Coins, Key, ShieldAlert, Eye, EyeOff } from "lucide-react"
import { useStore } from "@/contexts/StoreContext"

export default function SettingsPage() {
    const { role, activeStore } = useStore()
    const [fixedCost, setFixedCost] = useState("")
    const [targetSales, setTargetSales] = useState("")
    const [actualFixedTotal, setActualFixedTotal] = useState<number>(0)
    const [settingsLoading, setSettingsLoading] = useState(false)
    const [profileLoading, setProfileLoading] = useState(false)
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [seedLoading, setSeedLoading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [kamisKey, setKamisKey] = useState("")
    const [kamisId, setKamisId] = useState("")

    // Account States
    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPasswords, setShowPasswords] = useState(false)

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

            setEmail(user.email || "")

            // Load Profile Name
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", user.id)
                .single()

            if (profile) {
                setFullName(profile.full_name || "")
            }

            // Load KAMIS from local storage
            setKamisKey(localStorage.getItem("KAMIS_API_KEY") || "")
            setKamisId(localStorage.getItem("KAMIS_USER_ID") || "")
        } catch (error) {
            console.error("Settings load error:", error)
        }
    }

    const handleUpdateProfile = async () => {
        try {
            setProfileLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("로그인이 필요합니다.")

            // 1. Update Profile (Name)
            const { error: profileError } = await supabase
                .from("profiles")
                .update({ full_name: fullName, updated_at: new Date().toISOString() })
                .eq("id", user.id)

            if (profileError) throw profileError

            // 2. Update Email if changed
            if (email !== user.email) {
                const { error: authError } = await supabase.auth.updateUser({ email })
                if (authError) throw authError
                alert("프로필 정보가 업데이트되었습니다.\n이메일 변경 시 확인 메일이 발송될 수 있습니다.")
            } else {
                alert("프로필 정보가 저장되었습니다.")
            }
        } catch (error: any) {
            console.error("Profile update error:", error)
            alert("프로필 수정 실패: " + error.message)
        } finally {
            setProfileLoading(true) // Actually loadSettings will be called or just set false
            setProfileLoading(false)
        }
    }

    const handleUpdatePassword = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            alert("비밀번호가 일치하지 않거나 입력되지 않았습니다.")
            return
        }

        try {
            setPasswordLoading(true)
            const { error } = await supabase.auth.updateUser({ password: newPassword })
            if (error) throw error
            alert("비밀번호가 성공적으로 변경되었습니다.")
            setNewPassword("")
            setConfirmPassword("")
        } catch (error: any) {
            console.error("Password update error:", error)
            alert("비밀번호 변경 실패: " + error.message)
        } finally {
            setPasswordLoading(false)
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
                    {/* Store & Staff Management Shortcuts */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer transition-all" onClick={() => window.location.href = '/settings/stores'}>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Database className="h-5 w-5 text-indigo-500" />
                                    <CardTitle>사업장(매장) 관리</CardTitle>
                                </div>
                                <CardDescription>여러 개의 사업장을 등록하고 각 매장별 목표 및 고정비를 설정합니다.</CardDescription>
                            </CardHeader>
                        </Card>
                        <Card className="border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 cursor-pointer transition-all" onClick={() => window.location.href = '/settings/staff'}>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-blue-500" />
                                    <CardTitle>직원 및 권한 관리</CardTitle>
                                </div>
                                <CardDescription>함께 운영할 관리자와 직원을 초대하고 접근 권한을 관리합니다.</CardDescription>
                            </CardHeader>
                        </Card>
                        {role === 'super_admin' && (
                            <Card className="border-red-500/30 bg-red-500/5 hover:bg-red-500/10 cursor-pointer transition-all" onClick={() => window.location.href = '/settings/admin'}>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="h-5 w-5 text-red-500" />
                                        <CardTitle>Admin Console</CardTitle>
                                    </div>
                                    <CardDescription>시스템 관리자 전용 메뉴입니다. 전체 데이터 및 데모 관리가 가능합니다.</CardDescription>
                                </CardHeader>
                            </Card>
                        )}
                    </div>

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

                    {/* 2. System Management (Data Seeding) - Restricted to Super Admin Only */}
                    {role === 'super_admin' && (
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
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={async () => {
                                                // activeStore is captured from component scope
                                                if (!activeStore) {
                                                    alert("선택된 지점이 없습니다.")
                                                    return
                                                }
                                                if (!confirm(`🚨 '${activeStore.name}' 지점의 데이터를 초기화하고 6개월 샘플을 생성하시겠습니까?\n(매출, 매입, 지출 데이터만 재설정됩니다)`)) return

                                                setSeedLoading(true)
                                                try {
                                                    const { regenerateStoreData } = await import("@/lib/seed-manager")
                                                    await regenerateStoreData(activeStore.id)
                                                    alert("✅ 해당 지점의 데이터가 생성되었습니다!")
                                                    window.location.reload()
                                                } catch (e: any) {
                                                    console.error(e)
                                                    alert("오류: " + e.message)
                                                } finally {
                                                    setSeedLoading(false)
                                                }
                                            }}
                                            disabled={seedLoading}
                                            className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 font-bold"
                                        >
                                            {seedLoading ? "생성 중..." : "① 현재 지점 6개월 샘플 생성"}
                                        </Button>

                                        <Button
                                            variant="outline"
                                            onClick={handleGenerateAllData}
                                            disabled={seedLoading}
                                            className="border-rose-500/50 text-rose-500 hover:bg-rose-500/10 font-bold"
                                        >
                                            {seedLoading ? "초기화 중..." : "② 전체 초기화 (모든 데이터 삭제)"}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 3. User Account */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                <CardTitle>내 계정</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Profile Info */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">이름 (실명)</label>
                                    <Input
                                        placeholder="이름을 입력하세요"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">이메일 계정</label>
                                    <Input
                                        placeholder="이메일을 입력하세요"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleUpdateProfile} disabled={profileLoading} className="bg-primary text-white">
                                    {profileLoading ? "업데이트 중..." : "프로필 정보 저장"}
                                </Button>
                            </div>

                            <hr className="border-white/5" />

                            {/* Password Change */}
                            <div className="space-y-4">
                                <p className="font-medium">비밀번호 변경</p>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="relative">
                                        <Input
                                            type={showPasswords ? "text" : "password"}
                                            placeholder="새 비밀번호"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(!showPasswords)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                        >
                                            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type={showPasswords ? "text" : "password"}
                                            placeholder="새 비밀번호 확인"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(!showPasswords)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                        >
                                            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleUpdatePassword} disabled={passwordLoading} variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10">
                                        {passwordLoading ? "변경 중..." : "비밀번호 변경"}
                                    </Button>
                                </div>
                            </div>

                            <hr className="border-white/5" />

                            <div className="flex items-center justify-between">
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

                    {/* 4. Danger Zone - Restricted to Owner/Admin */}
                    {(role === 'owner' || role === 'super_admin') && (
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

                                                await supabase.from("store_staff").delete().eq("user_id", user.id)
                                                await supabase.from("stores").delete().eq("owner_id", user.id)
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
                    )}
                </div>
            </div>
        </AppLayout>
    )
}
