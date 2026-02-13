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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-foreground tracking-tighter italic uppercase">운영진 관리 (STAFF PROTOCOL)</h1>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1 ml-0.5">{activeStore?.name || "ENTITY"} 운영 팀을 관리합니다.</p>
                    </div>
                    <Button
                        onClick={() => setIsInviting(true)}
                        className="bg-primary hover:bg-primary/90 text-white font-black rounded-xl px-8 h-12 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all uppercase text-[10px] tracking-widest"
                    >
                        <UserPlus className="h-4 w-4" />
                        새 운영진 등록 (PROVISION)
                    </Button>
                </div>

                {isInviting && (
                    <CollapsibleCard
                        title="운영진 초대"
                        icon={<Mail className="h-4 w-4 text-primary" />}
                        storageKey="staff-invite-form"
                    >
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-60">Authentication: Email</label>
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 text-foreground font-black tracking-tight focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:opacity-30"
                                        placeholder="invite@open-cost.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-60">Security Level: Role</label>
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value as any)}
                                        className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 text-foreground font-black tracking-tight focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="manager" className="bg-card text-foreground">MANAGER (Full R/W Access)</option>
                                        <option value="staff" className="bg-card text-foreground">STAFF (Read-Only Access)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-8 border-t border-border/10">
                                <Button onClick={() => setIsInviting(false)} variant="ghost" className="text-muted-foreground font-black text-[10px] uppercase tracking-widest h-12 px-6">취소 (Abort)</Button>
                                <Button onClick={handleInvite} className="bg-primary text-white font-black text-[10px] uppercase tracking-widest h-12 px-10 shadow-lg shadow-primary/20">초대 발송 (DISPATCH)</Button>
                            </div>
                        </div>
                    </CollapsibleCard>
                )}

                <div className="glass-panel border-none rounded-[3rem] bg-card overflow-hidden">
                    <div className="p-10">
                        {loading ? (
                            <div className="text-center py-24 text-muted-foreground font-black uppercase tracking-[0.2em] italic opacity-40 animate-pulse">Initializing Staff Records...</div>
                        ) : staff.length === 0 ? (
                            <div className="text-center py-24">
                                <Users className="h-20 w-20 text-muted-foreground mx-auto mb-6 opacity-20" />
                                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs opacity-50 italic">No staff members identified for this entity.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {staff.map(member => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-7 bg-muted/20 hover:bg-muted/40 rounded-[2rem] border border-border/50 transition-all group"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={cn(
                                                "h-14 w-14 rounded-2xl flex items-center justify-center border shadow-inner transition-all",
                                                member.role === 'owner' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                                    member.role === 'manager' ? "bg-indigo-500/10 border-indigo-500/20 text-primary" :
                                                        "bg-muted border-border/50 text-muted-foreground"
                                            )}>
                                                {member.role === 'owner' ? <Shield className="h-7 w-7" /> : <User className="h-7 w-7" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-foreground italic uppercase tracking-tighter text-lg">
                                                        {member.profiles?.full_name || "NOT SPECIFIED"}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border",
                                                        member.role === 'owner' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                                            member.role === 'manager' ? "bg-indigo-500/10 border-indigo-500/20 text-primary" :
                                                                "bg-muted border-border/50 text-muted-foreground"
                                                    )}>
                                                        {member.role}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground font-black tracking-tight mt-0.5 opacity-60 italic">{member.profiles?.email}</p>
                                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1.5 opacity-40">COMMENCED: {new Date(member.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        {member.role !== 'owner' && (
                                            <button
                                                onClick={() => handleRemove(member.id)}
                                                className="p-4 hover:bg-rose-500/10 rounded-2xl text-muted-foreground hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
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
