"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Database } from "@/types/database.types"

interface Business {
    id: string
    name: string
    registration_number: string | null
    owner_id: string
}

interface Store {
    id: string
    business_id: string | null
    owner_id: string
    name: string
    business_number: string | null
    address: string | null
    contact: string | null
    monthly_fixed_cost: number
    monthly_target_sales_count: number
    created_at: string
    updated_at: string
}

interface StoreContextType {
    activeStore: Store | null
    stores: Store[]
    businesses: Business[]
    role: 'super_admin' | 'owner' | 'manager' | 'staff' | null
    isApproved: boolean
    isAggregatedView: boolean
    loading: boolean
    setActiveStoreId: (id: string) => void
    refreshStores: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: React.ReactNode }) {
    const [activeStore, setActiveStore] = useState<Store | null>(null)
    const [stores, setStores] = useState<Store[]>([])
    const [businesses, setBusinesses] = useState<Business[]>([])
    const [role, setRole] = useState<'super_admin' | 'owner' | 'manager' | 'staff' | null>(null)
    const [isApproved, setIsApproved] = useState(true) // Default to true to prevent flickering for approved users
    const [isAggregatedView, setIsAggregatedView] = useState(false)
    const [loading, setLoading] = useState(true)

    const fetchStores = useCallback(async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setBusinesses([])
                setActiveStore(null)
                setRole(null)
                setIsApproved(false)
                setIsAggregatedView(false)

                // Redirect to login if not already there
                if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                    window.location.href = '/login'
                }
                return
            }

            // 1. Fetch Global Profile (for super_admin/owner permissions)
            const { data: profile, error: profileErr } = await supabase
                .from("profiles")
                .select("role, is_approved")
                .eq("id", user.id)
                .single()

            if (profileErr && profileErr.code !== 'PGRST116') {
                console.warn("Profile fetch error (non-fatal):", profileErr.message || profileErr)
            }

            const isDeveloper = user.email === 'mydaeun@gmail.com'
            const userRole = profile?.role || (isDeveloper ? 'super_admin' : (profileErr?.code === 'PGRST116' ? 'owner' : null))
            const approvedStatus = profile?.is_approved !== undefined ? profile.is_approved : isDeveloper
            setIsApproved(approvedStatus)

            // 2. Fetch Businesses & Stores based on role
            let userStores: Store[] = []
            let userBusinesses: Business[] = []

            if (userRole === 'super_admin') {
                // Developers see EVERYTHING
                const { data: bData, error: bError } = await supabase.from("businesses").select("*")
                if (bError) throw bError
                const { data: sData, error: sError } = await supabase.from("stores").select("*")
                if (sError) throw sError
                userBusinesses = bData || []
                userStores = sData || []
            } else if (userRole === 'owner') {
                // Owners see all stores they own + where they are staff
                // (RLS handles the filtering, we just query all we have access to)
                const { data: bData, error: bError } = await supabase.from("businesses").select("*")
                if (bError) throw bError
                const { data: sData, error: sError } = await supabase.from("stores").select("*")
                if (sError) throw sError
                userBusinesses = bData || []
                userStores = sData || []

                // Fallback: If owner has no businesses (of their own), try to restore from profile
                const myBusinesses = userBusinesses.filter(b => b.owner_id === user.id)
                if (myBusinesses.length === 0) {
                    try {
                        console.log("No business found. Attempting auto-provisioning...")
                        const { error: syncError } = await supabase.rpc('ensure_business_from_profile', { p_user_id: user.id })

                        if (!syncError) {
                            // Re-fetch after sync
                            const { data: bDataRetry } = await supabase.from("businesses").select("*")
                            const { data: sDataRetry } = await supabase.from("stores").select("*")
                            // Only update if we actually got something back
                            if (bDataRetry && bDataRetry.length > 0) {
                                userBusinesses = bDataRetry
                                userStores = sDataRetry || []
                                toast({
                                    title: "사업장 정보 복구 완료",
                                    description: "프로필 정보를 바탕으로 사업장이 자동 생성되었습니다.",
                                })
                            }
                        } else {
                            console.warn("Auto-provisioning logic skipped (RPC might be missing):", syncError.message)
                        }
                    } catch (rpcError) {
                        // Swallow network errors during fallback to prevent app crash
                        console.warn("Auto-provisioning network error (harmless):", rpcError)
                    }
                }
            } else {
                // Staff only see where they are registered
                const { data: staff, error } = await supabase
                    .from("store_staff")
                    .select("role, store:stores(*)")
                    .eq("user_id", user.id)

                if (error) throw error
                userStores = staff?.map(r => r.store as unknown as Store).filter(Boolean) || []
                // For staff, we might want to fetch businesses related to their stores
                const bizIds = [...new Set(userStores.map(s => s.business_id).filter(Boolean))]
                const { data: bData, error: bError } = await supabase.from("businesses").select("*").in("id", bizIds as string[])
                if (bError) throw bError
                userBusinesses = bData || []
            }

            setBusinesses(userBusinesses)
            setStores(userStores)
            setRole(userRole as any)

            // Refetch staff records for the active store to get the local role if needed
            // But for owner/super_admin, we already have the global role.

            // 3. Determine Active Store / Aggregation Mode
            const savedStoreId = localStorage.getItem("ACTIVE_STORE_ID")

            if (savedStoreId === "all" && (userRole === 'owner' || userRole === 'super_admin')) {
                setIsAggregatedView(true)
                setActiveStore(null)
            } else {
                let currentStore = userStores.find(s => s.id === savedStoreId) || userStores[0] || null
                if (currentStore) {
                    setActiveStore(currentStore)
                    setIsAggregatedView(false)
                    localStorage.setItem("ACTIVE_STORE_ID", currentStore.id)
                } else {
                    setActiveStore(null)
                    setIsAggregatedView(false)
                }
            }
        } catch (error: any) {
            console.error("Error fetching context data:", error)
            const errorInfo = {
                message: error?.message,
                details: error?.details,
                hint: error?.hint,
                code: error?.code,
            }
            console.error("Error Detail Info:", errorInfo)

            // Critical error alert to ensure user sees the detail
            if (errorInfo.message) {
                alert(`지점 정보를 불러오는 중 오류 발생:\n${errorInfo.message}\n\n${errorInfo.details || ""}`)
            }
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStores()

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchStores()
        })

        return () => subscription.unsubscribe()
    }, [fetchStores])

    const setActiveStoreId = (id: string) => {
        if (id === "all") {
            // Only allowed for owner/super_admin if they have multiple stores
            if (role === 'owner' || role === 'super_admin') {
                setIsAggregatedView(true)
                setActiveStore(null)
                localStorage.setItem("ACTIVE_STORE_ID", "all")
                fetchStores()
            }
            return
        }

        const store = stores.find(s => s.id === id)
        if (store) {
            localStorage.setItem("ACTIVE_STORE_ID", id)
            setActiveStore(store)
            setIsAggregatedView(false)
            fetchStores() // Re-fetch to update roles and context-specific data
        } else {
            console.warn("Unauthorized store selection attempt:", id)
            // Revert to first available store if selection is unauthorized
            if (stores.length > 0) {
                const defaultStore = stores[0]
                localStorage.setItem("ACTIVE_STORE_ID", defaultStore.id)
                setActiveStore(defaultStore)
                setIsAggregatedView(false)
                fetchStores()
            }
        }
    }

    return (
        <StoreContext.Provider value={{
            activeStore,
            stores,
            businesses,
            role,
            isApproved,
            isAggregatedView,
            loading,
            setActiveStoreId,
            refreshStores: fetchStores
        }}>
            {children}
        </StoreContext.Provider>
    )
}

export function useStore() {
    const context = useContext(StoreContext)
    if (context === undefined) {
        throw new Error("useStore must be used within a StoreProvider")
    }
    return context
}
