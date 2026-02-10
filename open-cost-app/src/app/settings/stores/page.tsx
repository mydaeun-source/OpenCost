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
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">사업장 및 지점 관리</h1>
                        <p className="text-slate-400 font-medium whitespace-nowrap">법인/사업장(Headquarters) 하위의 지점(Branch)들을 계층적으로 관리합니다.</p>
                    </div>
                    {role === 'super_admin' && (
                        <Button
                            onClick={() => { setIsAddingBiz(true); setEditingBizId(null); setBizFormData({ name: "", registration_number: "" }) }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl px-6 py-3 flex items-center gap-2"
                        >
                            <Building2 className="h-5 w-5" />
                            신규 사업장 등록
                        </Button>
                    )}
                </div>

                {/* Business Creation Form (Restricted to Super Admin) */}
                {isAddingBiz && role === 'super_admin' && (
                    <CollapsibleCard
                        title="사업장(법인) 정보 입력"
                        icon={<Building2 className="text-primary" />}
                        storageKey="biz-form"
                    >
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    value={bizFormData.name}
                                    onChange={(e) => setBizFormData({ ...bizFormData, name: e.target.value })}
                                    className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white"
                                    placeholder="사업장(법인) 명칭"
                                />
                                <input
                                    type="text"
                                    value={bizFormData.registration_number}
                                    onChange={(e) => setBizFormData({ ...bizFormData, registration_number: e.target.value })}
                                    className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white"
                                    placeholder="법인/사업자 등록번호"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button onClick={() => setIsAddingBiz(false)} className="bg-white/5 text-slate-400">취소</Button>
                                <Button onClick={handleSaveBiz} className="bg-primary text-white px-8">저장</Button>
                            </div>
                        </div>
                    </CollapsibleCard>
                )}

                {/* Business & Branch List */}
                <div className="space-y-8">
                    {!loading && businesses.length === 0 && (
                        <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-white/5">
                            <Building2 className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">등록된 사업장이 없습니다.</p>
                        </div>
                    )}

                    {businesses.map(biz => (
                        <div key={biz.id} className="space-y-4">
                            <div className="flex justify-between items-end px-4">
                                <div>
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                        <Building2 className="h-6 w-6 text-indigo-400" />
                                        {biz.name}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditingBizId(biz.id)
                                                setIsAddingBiz(true)
                                                setBizFormData({ name: biz.name, registration_number: biz.registration_number || "" })
                                            }}
                                            className="text-slate-500 hover:text-indigo-400 p-0 h-auto"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    </h2>
                                    <p className="text-slate-500 text-sm font-bold">등록번호: {biz.registration_number || "미입력"}</p>
                                </div>
                                <Button
                                    onClick={() => {
                                        setIsAddingBranch(biz.id);
                                        setEditingStoreId(null);
                                        setStoreFormData({ name: "", business_number: "", address: "", contact: "", monthly_fixed_cost: 0, monthly_target_sales_count: 1000 })
                                    }}
                                    className="bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold px-4 rounded-xl flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    이 사업장에 지점 추가
                                </Button>
                            </div>

                            {/* Branch Creation Form (Inline for the business) */}
                            {isAddingBranch === biz.id && (
                                <div className="mx-4 p-8 bg-indigo-600/5 border border-indigo-500/20 rounded-[2.5rem] animate-in fade-in slide-in-from-top-4">
                                    <h3 className="text-lg font-black text-white mb-6">[{biz.name}] 하위에 새로운 지점 등록</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <input
                                                type="text"
                                                placeholder="지점 명칭 (예: 연남점)"
                                                value={storeFormData.name}
                                                onChange={(e) => setStoreFormData({ ...storeFormData, name: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none"
                                            />
                                            <input
                                                type="text"
                                                placeholder="지점 주소"
                                                value={storeFormData.address}
                                                onChange={(e) => setStoreFormData({ ...storeFormData, address: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <NumericInput
                                                value={storeFormData.monthly_fixed_cost}
                                                onChange={(v) => setStoreFormData({ ...storeFormData, monthly_fixed_cost: v })}
                                                className="w-full"
                                            />
                                            <NumericInput
                                                value={storeFormData.monthly_target_sales_count}
                                                onChange={(v) => setStoreFormData({ ...storeFormData, monthly_target_sales_count: v })}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/5">
                                        <Button onClick={() => setIsAddingBranch(null)} className="bg-transparent text-slate-400">취소</Button>
                                        <Button onClick={() => handleSaveBranch(biz.id)} className="bg-primary text-white px-8">지점 저장</Button>
                                    </div>
                                </div>
                            )}

                            {/* Branches Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {stores.filter(s => s.business_id === biz.id).map(store => (
                                    <div
                                        key={store.id}
                                        className={cn(
                                            "relative group p-6 rounded-[2.5rem] border transition-all duration-300",
                                            activeStore?.id === store.id ? "bg-indigo-600/10 border-primary shadow-lg" : "bg-black/20 border-white/5 hover:border-white/20"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-xl font-black text-white">{store.name}</h3>
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
                                                className="text-slate-500 hover:text-indigo-400 p-0 h-auto"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-4">{store.address || "주소 정보 없음"}</p>

                                        <div className="flex justify-between items-center bg-white/5 rounded-2xl p-4 mb-6">
                                            <div className="text-center flex-1 border-r border-white/5">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">고정비</p>
                                                <p className="text-sm font-black text-white">₩{store.monthly_fixed_cost?.toLocaleString()}</p>
                                            </div>
                                            <div className="text-center flex-1">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">목표판매</p>
                                                <p className="text-sm font-black text-white">{store.monthly_target_sales_count?.toLocaleString()}개</p>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => setActiveStoreId(store.id)}
                                            disabled={activeStore?.id === store.id}
                                            className={cn(
                                                "w-full font-bold rounded-2xl h-12",
                                                activeStore?.id === store.id ? "bg-primary text-white" : "bg-white/5 text-slate-400"
                                            )}
                                        >
                                            {activeStore?.id === store.id ? "선택됨" : "지점 선택"}
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
