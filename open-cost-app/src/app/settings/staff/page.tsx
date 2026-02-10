"use client"

import React, { useState, useEffect, useCallback } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard"
import { Button } from "@/components/ui/Button"
import { supabase } from "@/lib/supabase"
import { useStore } from "@/contexts/StoreContext"
import { toast } from "@/hooks/use-toast"
import { Users, Plus, UserPlus, Shield, User, Trash2, Mail } from "lucide-react"

type StaffMember = {
    id: string
    user_id: string
    role: 'owner' | 'manager' | 'staff'
    store_id: string
    created_at: string
    profiles?: {
        full_name: string
        email: string
        avatar_url: string
    }
}

export default function StaffManagementPage() {
    const { activeStore } = useStore()
    const [staff, setStaff] = useState<StaffMember[]>([])
    const [loading, setLoading] = useState(true)
    const [isInviting, setIsInviting] = useState(false)
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState<'manager' | 'staff'>('staff')

    const fetchStaff = useCallback(async () => {
        if (!activeStore?.id) return
        setLoading(true)
        try {
            // Join with profiles to get email and full_name
            const { data, error } = await supabase
                .from("store_staff")
                .select(`
                    id,
                    user_id,
                    role,
                    store_id,
                    created_at,
                    profiles:user_id (
                        full_name,
                        email,
                        avatar_url
                    )
                `)
                .eq("store_id", activeStore.id)

            if (error) {
                console.error("Staff fetch error details:", error)
                throw error
            }
            setStaff(data as any[] || [])
        } catch (error: any) {
            console.error("Staff fetch error stack:", error)
            toast({
                title: "정보 로드 실패",
                description: error.message || "직원 정보를 가져오지 못했습니다.",
                type: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }, [activeStore?.id])

    useEffect(() => {
        fetchStaff()
    }, [fetchStaff])

    const handleInvite = async () => {
        try {
            if (!activeStore) return
            if (!inviteEmail) {
                toast({ title: "입력 오류", description: "이메일을 입력해 주세요.", type: "destructive" })
                return
            }

            // Call the SQL RPC to add staff member
            const { data, error } = await supabase.rpc('add_staff_by_email', {
                t_store_id: activeStore.id,
                t_email: inviteEmail.trim().toLowerCase(),
                t_role: inviteRole
            })

            if (error) {
                throw error
            }

            toast({
                title: "직원 등록 완료",
                description: `${inviteEmail} 계정이 ${inviteRole === 'manager' ? '매니저' : '일반 직원'}으로 등록되었습니다.`,
                type: "default"
            })

            setIsInviting(false)
            setInviteEmail("")
            fetchStaff()
        } catch (error: any) {
            console.error(error)
            toast({
                title: "등록 실패",
                description: error.message || "직원을 등록하는 중 오류가 발생했습니다.",
                type: "destructive"
            })
        }
    }

    const handleRemove = async (staffId: string) => {
        if (!confirm("정말 이 직원을 제외하시겠습니까?")) return
        try {
            const { error } = await supabase.from("store_staff").delete().eq("id", staffId)
            if (error) throw error
            toast({ title: "제외 완료", description: "직원이 명단에서 삭제되었습니다." })
            fetchStaff()
        } catch (error) {
            console.error(error)
            toast({ title: "삭제 실패", description: "오류가 발생했습니다.", type: "destructive" })
        }
    }

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">직원 관리</h1>
                        <p className="text-slate-400 font-medium">{activeStore?.name || "사업장"}의 운영 팀을 관리합니다.</p>
                    </div>
                    <Button
                        onClick={() => setIsInviting(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl px-6 py-3 flex items-center gap-2"
                    >
                        <UserPlus className="h-5 w-5" />
                        직원 초대
                    </Button>
                </div>

                {isInviting && (
                    <CollapsibleCard
                        title="운영진 초대"
                        icon={<Mail className="h-6 w-6 text-primary" />}
                        storageKey="staff-invite-form"
                    >
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">계정 이메일</label>
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="invite@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">역할 설정</label>
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value as any)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    >
                                        <option value="manager" className="bg-slate-900">매니저 (수정 권한)</option>
                                        <option value="staff" className="bg-slate-900">일반 직원 (조회 권한)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                <Button onClick={() => setIsInviting(false)} className="bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl px-6">취소</Button>
                                <Button onClick={handleInvite} className="bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl px-8">초대장 발송</Button>
                            </div>
                        </div>
                    </CollapsibleCard>
                )}

                <div className="bg-black/20 border border-white/5 rounded-[2.5rem] overflow-hidden">
                    <div className="p-8">
                        {loading ? (
                            <div className="text-center py-20 text-slate-500 font-bold">로딩 중...</div>
                        ) : staff.length === 0 ? (
                            <div className="text-center py-20">
                                <Users className="h-16 w-16 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-500 font-bold">등록된 직원이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {staff.map(member => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-transparent transition-all hover:border-white/10 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-12 w-12 rounded-2xl flex items-center justify-center",
                                                member.role === 'owner' ? "bg-amber-500/20 text-amber-500" :
                                                    member.role === 'manager' ? "bg-blue-500/20 text-blue-500" :
                                                        "bg-slate-500/20 text-slate-400"
                                            )}>
                                                {member.role === 'owner' ? <Shield className="h-6 w-6" /> : <User className="h-6 w-6" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white uppercase tracking-tight">
                                                        {member.profiles?.full_name || "이름 미설정"}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                                                        member.role === 'owner' ? "bg-amber-500/20 text-amber-500" :
                                                            member.role === 'manager' ? "bg-blue-500/20 text-blue-500" :
                                                                "bg-white/10 text-slate-400"
                                                    )}>
                                                        {member.role}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 font-bold mb-0.5">{member.profiles?.email}</p>
                                                <p className="text-[10px] text-slate-500 font-medium tracking-tighter uppercase">Joined: {new Date(member.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        {member.role !== 'owner' && (
                                            <button
                                                onClick={() => handleRemove(member.id)}
                                                className="p-3 hover:bg-red-500/20 rounded-xl text-slate-500 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ")
}
