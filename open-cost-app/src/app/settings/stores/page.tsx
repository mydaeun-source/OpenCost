"use client"

import React, { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard"
import { Button } from "@/components/ui/Button"
import { NumericInput } from "@/components/ui/NumericInput"
import { supabase } from "@/lib/supabase"
import { useStore } from "@/contexts/StoreContext"
import { toast } from "@/hooks/use-toast"
import { Building2, Plus, Edit2, Save, Trash2 } from "lucide-react"

export default function StoreManagementPage() {
    const { stores, businesses, refreshStores, activeStore, setActiveStoreId, loading, role } = useStore()
    const [isAddingBiz, setIsAddingBiz] = useState(false)
    const [isAddingBranch, setIsAddingBranch] = useState<string | null>(null) // businessId
    const [editingBizId, setEditingBizId] = useState<string | null>(null)
    const [editingStoreId, setEditingStoreId] = useState<string | null>(null)

    const [bizFormData, setBizFormData] = useState({ name: "", registration_number: "" })
    const [storeFormData, setStoreFormData] = useState({
        name: "",
        business_number: "",
        address: "",
        contact: "",
        monthly_fixed_cost: 0,
        monthly_target_sales_count: 1000
    })

    const handleSaveBiz = async () => {
        try {
            if (!bizFormData.name) {
                toast({ title: "입력 오류", description: "사업장 이름은 필수입니다.", type: "destructive" })
                return
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            if (editingBizId) {
                const { error } = await supabase.from("businesses").update(bizFormData).eq("id", editingBizId)
                if (error) throw error
                toast({ title: "사업장 수정 완료" })
            } else {
                const { error } = await supabase.from("businesses").insert([{ ...bizFormData, owner_id: user.id }])
                if (error) throw error
                toast({ title: "사업장 등록 완료" })
            }
            setIsAddingBiz(false)
            setEditingBizId(null)
            refreshStores()
        } catch (error) {
            console.error(error)
            toast({ title: "오류 발생", description: "저장 중 문제가 발생했습니다.", type: "destructive" })
        }
    }

    const handleSaveBranch = async (businessId: string) => {
        try {
            if (!storeFormData.name) {
                toast({ title: "입력 오류", description: "지점 이름은 필수입니다.", type: "destructive" })
                return
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            if (editingStoreId) {
                const { error } = await supabase.from("stores").update(storeFormData).eq("id", editingStoreId)
                if (error) throw error
                toast({ title: "지점 수정 완료" })
            } else {
                const { data: newStore, error } = await supabase
                    .from("stores")
                    .insert([{ ...storeFormData, business_id: businessId, owner_id: user.id }])
                    .select().single()
                if (error) throw error

                await supabase.from("store_staff").insert({ store_id: newStore.id, user_id: user.id, role: 'owner' })
                toast({ title: "지점 등록 완료" })
            }

            setIsAddingBranch(null)
            setEditingStoreId(null)
            refreshStores()
        } catch (error) {
            console.error(error)
            toast({ title: "오류 발생", description: "지점 저장 중 문제가 발생했습니다.", type: "destructive" })
        }
    }

    return (
        <AppLayout>
            <div className="space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-foreground tracking-tighter italic uppercase">사업 구조 관리 (BUSINESS ARCHITECTURE)</h1>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1 ml-0.5">법인/사업장 하위의 지점들을 계층적으로 관리합니다.</p>
                    </div>
                    {role === 'super_admin' && (
                        <Button
                            onClick={() => { setIsAddingBiz(true); setEditingBizId(null); setBizFormData({ name: "", registration_number: "" }) }}
                            className="bg-primary hover:bg-primary/90 text-white font-black rounded-xl px-8 h-12 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all uppercase text-[10px] tracking-widest"
                        >
                            <Building2 className="h-4 w-4" />
                            새 사업장 등록 (PROVISION)
                        </Button>
                    )}
                </div>

                {/* Business Creation Form (Restricted to Super Admin) */}
                {isAddingBiz && role === 'super_admin' && (
                    <CollapsibleCard
                        title="사업장(법인) 정보 입력"
                        icon={<Building2 className="text-primary h-4 w-4" />}
                        storageKey="biz-form"
                    >
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Entity Name</label>
                                    <input
                                        type="text"
                                        value={bizFormData.name}
                                        onChange={(e) => setBizFormData({ ...bizFormData, name: e.target.value })}
                                        className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 text-foreground font-black tracking-tight focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="사업장(법인) 명칭"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Registration #</label>
                                    <input
                                        type="text"
                                        value={bizFormData.registration_number}
                                        onChange={(e) => setBizFormData({ ...bizFormData, registration_number: e.target.value })}
                                        className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 text-foreground font-black tracking-tight focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="법인/사업자 등록번호"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-border/10">
                                <Button onClick={() => setIsAddingBiz(false)} variant="ghost" className="text-muted-foreground font-black text-[10px] uppercase tracking-widest rounded-xl px-6 h-12">취소 (Cancel)</Button>
                                <Button onClick={handleSaveBiz} className="bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl px-10 h-12 shadow-lg shadow-primary/20">사업장 등록 (COMMIT)</Button>
                            </div>
                        </div>
                    </CollapsibleCard>
                )}

                {/* Business & Branch List */}
                <div className="space-y-8">
                    {!loading && businesses.length === 0 && (
                        <div className="text-center py-32 bg-muted/20 rounded-[3rem] border border-border/50 border-dashed">
                            <Building2 className="h-20 w-20 text-muted-foreground mx-auto mb-6 opacity-20" />
                            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs opacity-50 italic">No registered entities found in system core.</p>
                        </div>
                    )}

                    {businesses.map(biz => (
                        <div key={biz.id} className="space-y-4">
                            <div className="flex justify-between items-end px-6 border-l-4 border-primary/30">
                                <div>
                                    <h2 className="text-2xl font-black text-foreground flex items-center gap-3 italic uppercase tracking-tighter">
                                        <Building2 className="h-7 w-7 text-primary" />
                                        {biz.name}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditingBizId(biz.id)
                                                setIsAddingBiz(true)
                                                setBizFormData({ name: biz.name, registration_number: biz.registration_number || "" })
                                            }}
                                            className="text-muted-foreground hover:text-primary p-0 h-auto transition-colors"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    </h2>
                                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">REGISTRY: {biz.registration_number || "NOT SPECIFIED"}</p>
                                </div>
                                <Button
                                    onClick={() => {
                                        setIsAddingBranch(biz.id);
                                        setEditingStoreId(null);
                                        setStoreFormData({ name: "", business_number: "", address: "", contact: "", monthly_fixed_cost: 0, monthly_target_sales_count: 1000 })
                                    }}
                                    className="bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary text-[9px] font-black uppercase tracking-widest px-6 h-10 rounded-xl border border-border/50 transition-all flex items-center gap-2"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    새 지점 추가 (DEPLOY BRANCH)
                                </Button>
                            </div>

                            {/* Branch Creation Form (Inline for the business) */}
                            {isAddingBranch === biz.id && (
                                <div className="mx-6 p-10 bg-primary/5 border border-primary/20 rounded-[2.5rem] animate-in fade-in slide-in-from-top-4 glass-panel">
                                    <h3 className="text-xl font-black text-foreground mb-8 italic uppercase tracking-tighter">[{biz.name}] 하위에 새로운 지점 등록</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-60">Branch Detail: Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="지점 명칭 (예: 연남점)"
                                                    value={storeFormData.name}
                                                    onChange={(e) => setStoreFormData({ ...storeFormData, name: e.target.value })}
                                                    className="w-full bg-card border border-border rounded-2xl px-5 py-4 text-foreground font-black tracking-tight focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-60">Branch Detail: Address</label>
                                                <input
                                                    type="text"
                                                    placeholder="지점 주소"
                                                    value={storeFormData.address}
                                                    onChange={(e) => setStoreFormData({ ...storeFormData, address: e.target.value })}
                                                    className="w-full bg-card border border-border rounded-2xl px-5 py-4 text-foreground font-black tracking-tight focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-60">Fixed Operating Cost (Monthly)</label>
                                                <NumericInput
                                                    value={storeFormData.monthly_fixed_cost}
                                                    onChange={(v) => setStoreFormData({ ...storeFormData, monthly_fixed_cost: v })}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-60">Target Transaction Volume</label>
                                                <NumericInput
                                                    value={storeFormData.monthly_target_sales_count}
                                                    onChange={(v) => setStoreFormData({ ...storeFormData, monthly_target_sales_count: v })}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-10 pt-8 border-t border-border/10">
                                        <Button onClick={() => setIsAddingBranch(null)} variant="ghost" className="text-muted-foreground font-black text-[10px] uppercase tracking-widest h-12 px-6">취소 (Abort)</Button>
                                        <Button onClick={() => handleSaveBranch(biz.id)} className="bg-primary text-white font-black text-[10px] uppercase tracking-widest h-12 px-10 shadow-lg shadow-primary/20">지점 등록 (COMMIT)</Button>
                                    </div>
                                </div>
                            )}

                            {/* Branches Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 pb-12">
                                {stores.filter(s => s.business_id === biz.id).map(store => (
                                    <div
                                        key={store.id}
                                        className={cn(
                                            "relative group p-8 rounded-[3rem] border transition-all duration-500 glass-panel",
                                            activeStore?.id === store.id ? "bg-primary/10 border-primary/50 shadow-2xl scale-[1.02]" : "bg-card border-border/50 hover:border-primary/30 hover:shadow-xl"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-2xl font-black text-foreground italic tracking-tighter uppercase">{store.name}</h3>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingStoreId(store.id)
                                                    setIsAddingBranch(biz.id)
                                                    setStoreFormData({
                                                        name: store.name,
                                                        business_number: store.business_number || "",
                                                        address: store.address || "",
                                                        contact: store.contact || "",
                                                        monthly_fixed_cost: store.monthly_fixed_cost || 0,
                                                        monthly_target_sales_count: store.monthly_target_sales_count || 1000
                                                    })
                                                }}
                                                className="text-muted-foreground hover:text-primary p-0 h-auto transition-colors"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-6 opacity-60 truncate">{store.address || "LOCATION NOT SPECIFIED"}</p>

                                        <div className="grid grid-cols-2 gap-px bg-border/20 rounded-2xl overflow-hidden border border-border/50 mb-8 backdrop-blur-sm">
                                            <div className="bg-muted/30 p-4 text-center">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-50">Fixed Cost</p>
                                                <p className="text-sm font-black text-foreground italic tracking-tight">₩{store.monthly_fixed_cost?.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-muted/30 p-4 text-center">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-50">Target Vol</p>
                                                <p className="text-sm font-black text-foreground italic tracking-tight">{store.monthly_target_sales_count?.toLocaleString()} UNIT</p>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => setActiveStoreId(store.id)}
                                            disabled={activeStore?.id === store.id}
                                            className={cn(
                                                "w-full font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl h-14 transition-all",
                                                activeStore?.id === store.id ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/50"
                                            )}
                                        >
                                            {activeStore?.id === store.id ? "현재 선택됨" : "이 지점으로 접속 (AUTHENTICATE)"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ")
}
