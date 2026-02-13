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
                    {/* Store & Staff Management Shortcuts */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="glass-panel border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer transition-all group" onClick={() => window.location.href = '/settings/stores'}>
                            <CardHeader className="p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Database className="h-6 w-6 text-indigo-500" />
                                    <CardTitle className="text-foreground font-black italic">사업장(매장) 관리</CardTitle>
                                </div>
                                <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">여러 개의 사업장을 등록하고 각 매장별 목표 및 고정비를 설정합니다.</CardDescription>
                            </CardHeader>
                        </Card>
                        <Card className="glass-panel border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 cursor-pointer transition-all group" onClick={() => window.location.href = '/settings/staff'}>
                            <CardHeader className="p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="h-6 w-6 text-blue-500" />
                                    <CardTitle className="text-foreground font-black italic">직원 및 권한 관리</CardTitle>
                                </div>
                                <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">함께 운영할 관리자와 직원을 초대하고 접근 권한을 관리합니다.</CardDescription>
                            </CardHeader>
                        </Card>
                        {role === 'super_admin' && (
                            <Card className="glass-panel border-red-500/20 bg-red-500/5 hover:bg-red-500/10 cursor-pointer transition-all group" onClick={() => window.location.href = '/settings/admin'}>
                                <CardHeader className="p-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldAlert className="h-6 w-6 text-red-500" />
                                        <CardTitle className="text-foreground font-black italic">개발자 관리 콘솔 (ADMIN)</CardTitle>
                                    </div>
                                    <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">시스템 관리자 전용 메뉴입니다. 전체 데이터 및 데모 관리가 가능합니다.</CardDescription>
                                </CardHeader>
                            </Card>
                        )}
                    </div>

                    {/* KAMIS API Settings */}
                    <Card className="glass-panel border border-border shadow-none overflow-hidden">
                        <CardHeader className="p-6 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-2">
                                <Key className="h-6 w-6 text-indigo-500" />
                                <CardTitle className="text-foreground font-black italic">KAMIS 시장 시세 설정</CardTitle>
                            </div>
                            <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-relaxed mt-2">
                                농수산물 유통정보(KAMIS) 오픈 API를 연동하여 전국 평균 시세를 실시간으로 비교합니다.
                                <a href="https://www.kamis.or.kr/service/price/xml.do?action=interfaceGuide" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline ml-2">발급 안내</a>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">KAMIS API Key (인증키)</label>
                                    <Input
                                        placeholder="인증키를 입력하세요"
                                        className="h-12 bg-muted/50 border-border focus:ring-indigo-500/20 text-foreground font-bold"
                                        value={kamisKey}
                                        onChange={(e) => setKamisKey(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">KAMIS User ID (요청자 ID)</label>
                                    <Input
                                        placeholder="사용자 ID를 입력하세요"
                                        className="h-12 bg-muted/50 border-border focus:ring-indigo-500/20 text-foreground font-bold"
                                        value={kamisId}
                                        onChange={(e) => setKamisId(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button onClick={saveKamisSettings} variant="outline" className="h-12 px-8 font-black uppercase tracking-widest text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                                    API 설정 저장
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. System Management (Data Seeding) - Restricted to Super Admin Only */}
                    {role === 'super_admin' && (
                        <Card className="glass-panel border border-border shadow-none overflow-hidden">
                            <CardHeader className="p-6 border-b border-border bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <Database className="h-6 w-6 text-foreground" />
                                    <CardTitle className="text-foreground font-black italic">데이터 관리</CardTitle>
                                </div>
                                <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">시스템 데이터 초기화 및 샘플 생성을 관리합니다.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-8">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                    <div className="flex-1 space-y-2">
                                        <p className="font-black text-foreground italic">6개월 샘플 데이터 시뮬레이션 (추천)</p>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight leading-relaxed">
                                            기본 자료(재료+메뉴)와 함께 <b className="text-indigo-600 dark:text-indigo-400">지난 6개월간의 매입, 매출, 지출, 재고 로그</b>를 실감나게 생성합니다.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                        <Button
                                            variant="outline"
                                            onClick={async () => {
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
                                            className="h-12 px-6 border-indigo-500/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 font-black text-xs uppercase tracking-widest flex-1 transition-all"
                                        >
                                            {seedLoading ? "생성 중..." : "① 현재 지점 6개월 샘플 생성"}
                                        </Button>

                                        <Button
                                            variant="outline"
                                            onClick={handleGenerateAllData}
                                            disabled={seedLoading}
                                            className="h-12 px-6 border-rose-500/50 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-black text-xs uppercase tracking-widest flex-1 transition-all"
                                        >
                                            {seedLoading ? "초기화 중..." : "② 전체 초기화 (ALL DATA)"}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 3. User Account */}
                    <Card className="glass-panel border border-border shadow-none overflow-hidden">
                        <CardHeader className="p-6 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-2">
                                <User className="h-6 w-6 text-foreground" />
                                <CardTitle className="text-foreground font-black italic">내 계정 정보</CardTitle>
                            </div>
                            <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">프로필 및 보안 설정을 관리합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-10">
                            {/* Profile Info */}
                            <div className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">이름 (실명)</label>
                                        <Input
                                            placeholder="이름을 입력하세요"
                                            className="h-12 bg-muted/50 border-border focus:ring-indigo-500/20 font-bold text-foreground"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">이메일 계정</label>
                                        <Input
                                            placeholder="이메일을 입력하세요"
                                            className="h-12 bg-muted/50 border-border focus:ring-indigo-500/20 font-bold text-foreground"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button onClick={handleUpdateProfile} disabled={profileLoading} className="h-12 px-8 font-black uppercase tracking-widest text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 transition-all">
                                        {profileLoading ? "업데이트 중..." : "프로필 정보 저장"}
                                    </Button>
                                </div>
                            </div>

                            <hr className="border-border opacity-50" />

                            {/* Password Change */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2">
                                    <Key className="h-4 w-4 text-indigo-500" />
                                    <p className="text-sm font-black text-foreground uppercase tracking-widest italic">비밀번호 보안 설정</p>
                                </div>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="relative">
                                        <Input
                                            type={showPasswords ? "text" : "password"}
                                            placeholder="새 비밀번호 입력"
                                            className="h-12 bg-muted/50 border-border focus:ring-indigo-500/20 font-bold text-foreground pr-12"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(!showPasswords)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type={showPasswords ? "text" : "password"}
                                            placeholder="비밀번호 재확인"
                                            className="h-12 bg-muted/50 border-border focus:ring-indigo-500/20 font-bold text-foreground pr-12"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(!showPasswords)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button onClick={handleUpdatePassword} disabled={passwordLoading} variant="outline" className="h-12 px-8 font-black uppercase tracking-widest text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all">
                                        {passwordLoading ? "변경 중..." : "비밀번호 즉시 변경"}
                                    </Button>
                                </div>
                            </div>

                            <hr className="border-border opacity-50" />

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-muted/30 rounded-2xl border border-border/50">
                                <div>
                                    <p className="font-black text-foreground italic">계정 보안 가이드라인</p>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1 leading-relaxed">
                                        타인에게 비밀번호를 노출하지 마십시오. 작업 완료 후에는 반드시 로그아웃하세요.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="h-12 px-8 font-black uppercase tracking-widest text-xs border-border hover:bg-muted text-foreground transition-all w-full sm:w-auto"
                                    onClick={async () => {
                                        await import("@/lib/supabase").then(m => m.supabase.auth.signOut())
                                        window.location.href = "/login"
                                    }}
                                >
                                    <LogOut className="mr-3 h-5 w-5" />
                                    로그아웃 (EXIT)
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. Danger Zone - Restricted to Owner/Admin */}
                    {(role === 'owner' || role === 'super_admin') && (
                        <Card className="glass-panel border border-rose-500/30 bg-rose-500/5 shadow-none overflow-hidden">
                            <CardHeader className="p-8 border-b border-rose-500/10 bg-rose-500/5">
                                <div className="flex items-center gap-3">
                                    <Trash2 className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                                    <CardTitle className="text-rose-600 dark:text-rose-400 font-black italic tracking-tighter">DANGER ZONE (CRITICAL)</CardTitle>
                                </div>
                                <CardDescription className="text-xs font-bold text-rose-600/60 dark:text-rose-400/60 uppercase tracking-widest leading-relaxed mt-2">주의: 아래 작업은 되돌릴 수 없습니다.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-4">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                                    <div className="flex-1">
                                        <p className="font-black text-foreground italic">회원 탈퇴 (DELETE ACCOUNT)</p>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2 leading-relaxed">
                                            모든 데이터(설정, 레시피, 재료 등)를 영구적으로 삭제하고 로그아웃합니다. 매장 관련 모든 정보가 소멸됩니다.
                                        </p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        className="h-12 px-10 font-black uppercase tracking-[0.2em] text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 w-full sm:w-auto transition-all"
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
                                        회원 탈퇴 (EXECUTE)
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
