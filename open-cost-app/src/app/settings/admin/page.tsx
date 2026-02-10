"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useStore } from "@/contexts/StoreContext"
import { AppLayout } from "@/components/layout/AppLayout"
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard"
import { Button } from "@/components/ui/Button"
import { Users, Building2, CheckCircle2, XCircle, ShieldAlert, Database as DbIcon, Loader2 } from "lucide-react"
import { format, subDays, subMonths, startOfMonth } from "date-fns"

interface OwnerProfile {
    id: string
    full_name: string | null
    email: string | null
    requested_business_name: string | null
    requested_registration_number: string | null
    requested_address: string | null
    requested_representative: string | null
    requested_category: string | null
    requested_type: string | null
    role: string
    is_approved: boolean
    stores_count: number
}

export default function SuperAdminPage() {
    const { role, refreshStores, setActiveStoreId } = useStore()
    const [owners, setOwners] = useState<OwnerProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [status, setStatus] = useState<string>("")

    useEffect(() => {
        if (role === 'super_admin') {
            fetchAllUsers()
        }
    }, [role])

    const fetchAllUsers = async () => {
        setLoading(true)
        try {
            // 1. Fetch available profiles
            const { data: profiles, error: pError } = await supabase
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: false })

            if (pError) throw pError

            // 2. Fetch all stores to count manually
            const { data: allStores, error: sError } = await supabase
                .from("stores")
                .select("owner_id")

            if (sError) throw sError

            // 3. Aggregate counts locally
            const storeCounts: Record<string, number> = {}
            allStores?.forEach((s: any) => {
                if (s.owner_id) {
                    storeCounts[s.owner_id] = (storeCounts[s.owner_id] || 0) + 1
                }
            })

            const formatted = profiles.map((p: any) => ({
                id: p.id,
                full_name: p.full_name,
                email: p.email,
                requested_business_name: p.requested_business_name,
                requested_registration_number: p.requested_registration_number,
                requested_address: p.requested_address,
                requested_representative: p.requested_representative,
                requested_category: p.requested_category,
                requested_type: p.requested_type,
                role: p.role,
                is_approved: p.is_approved,
                stores_count: storeCounts[p.id] || 0
            }))
            setOwners(formatted)
        } catch (e: any) {
            console.error("Failed to fetch owners:", e)
            alert("데이터 로딩 실패: " + (e.message || JSON.stringify(e)))
        } finally {
            setLoading(false)
        }
    }

    const generateSampleData = async () => {
        if (!confirm("모든 지점에 대해 최근 3개월간의 샘플 매출 및 지출 데이터를 생성하시겠습니까? (상당량의 데이터가 추가됩니다)")) return

        setGenerating(true)
        try {
            const { data: stores } = await supabase.from("stores").select("id")
            if (!stores || stores.length === 0) {
                alert("등록된 지점이 없습니다.")
                return
            }

            const today = new Date()
            const salesBatch: any[] = []
            const expensesBatch: any[] = []

            for (const store of stores) {
                // 90일 매출 데이터
                for (let i = 0; i < 90; i++) {
                    const date = subDays(today, i)
                    const rev = 400000 + Math.floor(Math.random() * 1500000)
                    salesBatch.push({
                        store_id: store.id,
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        sales_date: format(date, "yyyy-MM-dd"),
                        daily_revenue: rev,
                        daily_cogs: Math.floor(rev * 0.38),
                        memo: "샘플 매출"
                    })
                }

                // 3개월 지출 데이터
                for (let m = 0; m < 3; m++) {
                    const monthDate = subMonths(today, m)
                    expensesBatch.push({
                        store_id: store.id,
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        amount: 2500000 + Math.floor(Math.random() * 1000000),
                        expense_date: format(startOfMonth(monthDate), "yyyy-MM-dd"),
                        memo: "임대료/인건비 샘플"
                    })
                    expensesBatch.push({
                        store_id: store.id,
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        amount: 300000 + Math.floor(Math.random() * 700000),
                        expense_date: format(monthDate, "yyyy-MM-dd"),
                        memo: "기타 소모품 샘플"
                    })
                }
            }

            // Batch insert
            if (salesBatch.length > 0) {
                const { error: sErr } = await supabase.from("sales_records").insert(salesBatch)
                if (sErr) throw sErr
            }
            if (expensesBatch.length > 0) {
                const { error: eErr } = await supabase.from("expense_records").insert(expensesBatch)
                if (eErr) throw eErr
            }

            alert("3개월 분량의 통합 샘플 데이터 생성이 완료되었습니다.")
        } catch (e) {
            console.error(e)
            alert("데이터 생성 중 오류가 발생했습니다.")
        } finally {
            setGenerating(false)
        }
    }

    const generateFullDemo = async () => {
        if (!confirm("독립된 다수 사업자가 이용하는 SaaS용 '울트라 리치' 데모 환경을 구축하시겠습니까?\n\n(김철수 대표, 이영희 대표 등 무관한 독립 계정들이 자동 생성되어 완전 격리 테스트를 수행합니다)")) return

        setGenerating(true)
        setStatus("SaaS 독립 환경 초기화 중...")
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Authentication failed")

            // 1. Nuclear Cleanup: Complete wipe for current user and demo tenants
            setStatus("기존 테넌트 및 사업장 데이터 소거 중...")

            const demoEmails = [
                "owner_kim@example.com", "owner_lee@example.com",
                "manager_park@example.com", "staff_choi@example.com"
            ]
            const { data: demoProfiles } = await supabase
                .from("profiles")
                .select("id")
                .in("email", demoEmails)

            const ownerIds = [user.id]
            if (demoProfiles) ownerIds.push(...demoProfiles.map(p => p.id))

            // Delete Businesses (Cascades to stores and everything else)
            const { error: bizDelErr } = await supabase.from("businesses").delete().in("owner_id", ownerIds)
            if (bizDelErr) throw new Error(`Business cleanup failed: ${bizDelErr.message}`)

            // Just in case there are stores without businesses (orphan stores)
            await supabase.from("stores").delete().in("owner_id", ownerIds)

            // 2. Provision Independent Demo Owners & Staff
            setStatus("독립 테넌트(김철수, 이영희) 계정 프로비저닝 중...")
            const provision = async (email: string, name: string) => {
                const { data, error } = await supabase.rpc('provision_demo_user', {
                    demo_email: email,
                    demo_password: 'password123!',
                    demo_full_name: name
                })
                if (error) throw new Error(`Provisioning ${email} failed: ${error.message}`)
                return data
            }

            const ownerKimId = await provision('owner_kim@example.com', '김철수 대표')
            const ownerLeeId = await provision('owner_lee@example.com', '이영희 대표')
            // (Staff accounts are created but we will add them as staff to specific stores later)
            await provision('manager_park@example.com', '박만수 점장')
            await provision('staff_choi@example.com', '최미정 알바')

            // 3. Create Hierarchical Structure (Businesses & Stores)
            setStatus("SaaS 엔터프라이즈 계층 구조 구축 중...")

            // Scenario 1: Kim (Bakery Group)
            const { data: bizKim, error: bkErr } = await supabase.from("businesses").insert({
                name: "S-베이커리 그룹",
                owner_id: ownerKimId,
                registration_number: "110-12-34567"
            }).select().single()
            if (bkErr || !bizKim) throw bkErr

            // Scenario 2: Lee (Logistics & Cafe)
            const { data: bizLee, error: blErr } = await supabase.from("businesses").insert({
                name: "연남-수지 통합푸드",
                owner_id: ownerLeeId,
                registration_number: "220-34-56789"
            }).select().single()
            if (blErr || !bizLee) throw blErr

            const demoStores = [
                { name: "성수 메인점", business_id: bizKim.id, owner_id: ownerKimId },
                { name: "한남 가맹점", business_id: bizKim.id, owner_id: ownerKimId },
                { name: "연남동 하우스카페", business_id: bizLee.id, owner_id: ownerLeeId },
                { name: "수지 물류유통센터", business_id: bizLee.id, owner_id: ownerLeeId },
            ]
            const { data: createdStores, error: stErr } = await supabase.from("stores").insert(demoStores).select()
            if (stErr || !createdStores) throw stErr || new Error("Store creation failed")


            // Bind specific demo staff
            const storeSeongsu = createdStores.find(s => s.name === "성수 메인점")
            const storeYeonnam = createdStores.find(s => s.name === "연남동 하우스카페")

            if (storeSeongsu) {
                await supabase.rpc('add_staff_by_email', {
                    t_store_id: storeSeongsu.id,
                    t_email: 'manager_park@example.com',
                    t_role: 'manager'
                })
            }
            if (storeYeonnam) {
                await supabase.rpc('add_staff_by_email', {
                    t_store_id: storeYeonnam.id,
                    t_email: 'staff_choi@example.com',
                    t_role: 'staff'
                })
            }

            for (const store of createdStores) {
                const isBakery = store.name.includes("성수") || store.name.includes("한남")
                const isLogistics = store.name.includes("물류")
                const isCafe = store.name.includes("카페")

                console.log(`Populating ${isBakery ? 'Bakery' : isLogistics ? 'Logistics' : 'Cafe'} data for: ${store.name}`)

                // 5. Categories (Themed)
                setStatus(`[${store.name}] 카테고리 구성 중...`)
                const ingCatsData = isBakery
                    ? [{ name: "가루/원재료", type: 'ingredient' }, { name: "유지류", type: 'ingredient' }, { name: "냉동/가공", type: 'ingredient' }, { name: "포장재", type: 'ingredient' }]
                    : isCafe
                        ? [{ name: "원두/차", type: 'ingredient' }, { name: "유제품", type: 'ingredient' }, { name: "시럽/소스", type: 'ingredient' }, { name: "디저트 완제품", type: 'ingredient' }]
                        : [{ name: "벌크 식자재", type: 'ingredient' }, { name: "포장/유통 자재", type: 'ingredient' }]

                const { data: ingCats } = await supabase.from("categories").insert(ingCatsData.map(c => ({ ...c, store_id: store.id }))).select()
                const { data: menuCats } = await supabase.from("categories").insert([
                    { store_id: store.id, name: isLogistics ? "유통 품목" : "메인 메뉴", type: 'menu' },
                    { store_id: store.id, name: "세트/패키지", type: 'menu' },
                    { store_id: store.id, name: "중간 제조(Prep)", type: 'prep' },
                ]).select()
                const { data: expCats } = await supabase.from("expense_categories").insert([
                    { store_id: store.id, name: "임대료", is_fixed: true },
                    { store_id: store.id, name: "인건비", is_fixed: true },
                    { store_id: store.id, name: "식자재 매입" },
                    { store_id: store.id, name: "운송/물류비" },
                ]).select()

                if (!ingCats || !menuCats || !expCats) continue

                // 6. Ingredients (Themed)
                setStatus(`[${store.name}] 마스터 식자재 등록 중...`)
                let ingData: any[] = []
                if (isBakery) {
                    ingData = [
                        { name: "T55 프랑스 밀가루", usage_unit: "g", purchase_unit: "25kg", conversion_factor: 25000, purchase_price: 42000, category_id: ingCats[0].id },
                        { name: "강력분(국산)", usage_unit: "g", purchase_unit: "20kg", conversion_factor: 20000, purchase_price: 28000, category_id: ingCats[0].id },
                        { name: "엘앤비르 고메버터", usage_unit: "g", purchase_unit: "10kg", conversion_factor: 10000, purchase_price: 185000, category_id: ingCats[1].id },
                        { name: "천일염", usage_unit: "g", purchase_unit: "5kg", conversion_factor: 5000, purchase_price: 12000, category_id: ingCats[0].id },
                        { name: "생이스트", usage_unit: "g", purchase_unit: "500g", conversion_factor: 500, purchase_price: 4500, category_id: ingCats[0].id },
                        { name: "베이커리 박스", usage_unit: "ea", purchase_unit: "100ea", conversion_factor: 100, purchase_price: 45000, category_id: ingCats[3].id },
                    ]
                } else if (isCafe) {
                    ingData = [
                        { name: "에티오피아 예가체프", usage_unit: "g", purchase_unit: "kg", conversion_factor: 1000, purchase_price: 36000, category_id: ingCats[0].id },
                        { name: "하우스 블렌드 원두", usage_unit: "g", purchase_unit: "kg", conversion_factor: 1000, purchase_price: 24000, category_id: ingCats[0].id },
                        { name: "상하목장 우유", usage_unit: "ml", purchase_unit: "L", conversion_factor: 1000, purchase_price: 2900, category_id: ingCats[1].id },
                        { name: "바닐라 시럽", usage_unit: "ml", purchase_unit: "L", conversion_factor: 1000, purchase_price: 18000, category_id: ingCats[2].id },
                        { name: "조각 케이크(냉동)", usage_unit: "ea", purchase_unit: "10ea", conversion_factor: 10, purchase_price: 35000, category_id: ingCats[3].id },
                        { name: "테이크아웃 컵", usage_unit: "ea", purchase_unit: "1000ea", conversion_factor: 1000, purchase_price: 85000, category_id: ingCats[2].id },
                    ]
                } else { // Logistics
                    ingData = [
                        { name: "쌀(20kg 벌크)", usage_unit: "kg", purchase_unit: "톤", conversion_factor: 50, purchase_price: 2200000, category_id: ingCats[0].id },
                        { name: "식용유(18L 벌크)", usage_unit: "L", purchase_unit: "팔레트(40캔)", conversion_factor: 720, purchase_price: 1450000, category_id: ingCats[0].id },
                        { name: "운송용 파렛트", usage_unit: "ea", purchase_unit: "bundle(10ea)", conversion_factor: 10, purchase_price: 150000, category_id: ingCats[1].id },
                    ]
                }

                const { data: ingredients } = await supabase.from("ingredients").insert(ingData.map(i => ({ ...i, store_id: store.id, current_stock: 50 }))).select()
                if (!ingredients) continue

                // 7. Recipes (Hierarchical BOM)
                setStatus(`[${store.name}] 다계층 레시피(BOM) 구축 중...`)
                const getIng = (name: string) => ingredients.find(i => i.name === name)

                if (isBakery) {
                    const { data: preps } = await supabase.from("recipes").insert([
                        { name: "크로와상 생지(Prep)", type: 'prep', store_id: store.id, category_id: menuCats[2].id }
                    ]).select()

                    if (preps) {
                        await supabase.from("recipe_ingredients").insert([
                            { recipe_id: preps[0].id, item_id: getIng("T55 프랑스 밀가루")?.id, item_type: 'ingredient', quantity: 500 },
                            { recipe_id: preps[0].id, item_id: getIng("엘앤비르 고메버터")?.id, item_type: 'ingredient', quantity: 250 },
                        ])
                        const { data: menus } = await supabase.from("recipes").insert([
                            { name: "AOP 고메 크로와상", type: 'menu', store_id: store.id, category_id: menuCats[0].id, selling_price: 4800 },
                            { name: "베이커리 선물 세트", type: 'menu', store_id: store.id, category_id: menuCats[1].id, selling_price: 25000 },
                        ]).select()
                        if (menus) {
                            await supabase.from("recipe_ingredients").insert([
                                { recipe_id: menus[0].id, item_id: preps[0].id, item_type: 'prep', quantity: 150 },
                                { recipe_id: menus[1].id, item_id: menus[0].id, item_type: 'menu', quantity: 5 },
                                { recipe_id: menus[1].id, item_id: getIng("베이커리 박스")?.id, item_type: 'ingredient', quantity: 1 },
                            ])
                        }
                    }
                } else if (isCafe) {
                    const { data: menus } = await supabase.from("recipes").insert([
                        { name: "핸드드립 예가체프", type: 'menu', store_id: store.id, category_id: menuCats[0].id, selling_price: 7000 },
                        { name: "바닐라빈 라떼", type: 'menu', store_id: store.id, category_id: menuCats[0].id, selling_price: 6000 },
                    ]).select()
                    if (menus) {
                        await supabase.from("recipe_ingredients").insert([
                            { recipe_id: menus[0].id, item_id: getIng("에티오피아 예가체프")?.id, item_type: 'ingredient', quantity: 20 },
                            { recipe_id: menus[0].id, item_id: getIng("테이크아웃 컵")?.id, item_type: 'ingredient', quantity: 1 },
                            { recipe_id: menus[1].id, item_id: getIng("하우스 블렌드 원두")?.id, item_type: 'ingredient', quantity: 18 },
                            { recipe_id: menus[1].id, item_id: getIng("상하목장 우유")?.id, item_type: 'ingredient', quantity: 200 },
                            { recipe_id: menus[1].id, item_id: getIng("바닐라 시럽")?.id, item_type: 'ingredient', quantity: 30 },
                        ])
                    }
                }

                // 8. Financial History (Sales, Expenses, and Purchases)
                setStatus(`[${store.name}] 180일치 정밀 데이터 및 45일치 상세 주문 생성 중...`)
                const today = new Date()
                const sBatch = [], eBatch = []
                const vendors = isBakery
                    ? ["대한제분", "앤커버터베이커리", "패키지박스몰", "베이크플러스"]
                    : isCafe
                        ? ["블루바틀원두도매", "매일유업", "시럽시티", "흥국에프엔비"]
                        : ["벌크푸드홀세일", "로지스틱시스템", "종합식자재유통"]

                // Fetch menus for order simulation
                const { data: storeMenus } = await supabase.from("recipes").select("*").eq("store_id", store.id).eq("type", "menu")
                const orderItemsToInsert: any[] = []

                for (let i = 0; i < 180; i++) {
                    const date = subDays(today, i)
                    const dateStr = format(date, "yyyy-MM-dd")
                    const day = date.getDay()
                    const isWeekend = day === 0 || day === 6
                    const rev = isLogistics ? 5000000 + Math.random() * 10000000 : (isWeekend ? 1500000 : 800000) + Math.random() * 1000000

                    sBatch.push({
                        store_id: store.id, user_id: user.id, sales_date: dateStr,
                        daily_revenue: rev, daily_cogs: Math.floor(rev * 0.35), memo: "Themed Demo Sales"
                    })

                    // Granular Order Simulation (Only last 45 days for performance)
                    if (i < 45 && storeMenus && storeMenus.length > 0) {
                        const numOrders = isWeekend ? 12 : 6
                        const dayOrders = Array.from({ length: numOrders }).map(() => ({
                            store_id: store.id,
                            user_id: user.id,
                            total_amount: 0,
                            status: 'completed',
                            created_at: `${dateStr} ${11 + Math.floor(Math.random() * 10)}:${Math.floor(Math.random() * 60)}:00`
                        }))

                        const { data: createdOrders, error: oErr } = await supabase.from("orders").insert(dayOrders).select()
                        if (createdOrders && !oErr) {
                            for (const order of createdOrders) {
                                const numMenuItems = 1 + Math.floor(Math.random() * 2)
                                for (let oi = 0; oi < numMenuItems; oi++) {
                                    const menu = storeMenus[Math.floor(Math.random() * storeMenus.length)]
                                    orderItemsToInsert.push({
                                        order_id: order.id,
                                        menu_id: menu.id,
                                        quantity: 1 + Math.floor(Math.random() * 2),
                                        price: menu.selling_price || 0
                                    })
                                }
                            }
                        }
                    }

                    // Periodic purchases (every 4-7 days)
                    if (i % (4 + Math.floor(Math.random() * 3)) === 0) {
                        const numItems = 2 + Math.floor(Math.random() * 3)
                        const pItemsBatch = []
                        let totalAmount = 0

                        for (let j = 0; j < numItems; j++) {
                            const ing = ingredients[Math.floor(Math.random() * ingredients.length)]
                            const qty = 1 + Math.floor(Math.random() * 10)
                            const price = ing.purchase_price * qty
                            totalAmount += price
                            pItemsBatch.push({
                                ingredient_id: ing.id,
                                quantity: qty,
                                price: price
                            })
                        }

                        const { data: purchase, error: pErr } = await supabase.from("purchases").insert({
                            store_id: store.id,
                            user_id: user.id,
                            supplier_name: vendors[Math.floor(Math.random() * vendors.length)],
                            purchase_date: dateStr,
                            total_amount: totalAmount,
                            status: 'completed'
                        }).select().single()

                        if (purchase && !pErr) {
                            await supabase.from("purchase_items").insert(
                                pItemsBatch.map(item => ({ ...item, purchase_id: purchase.id }))
                            )
                        }
                    }
                }

                // Batch insert order items
                if (orderItemsToInsert.length > 0) {
                    await supabase.from("order_items").insert(orderItemsToInsert)
                }

                for (let m = 0; m < 6; m++) {
                    const mDate = startOfMonth(subMonths(today, m))
                    eBatch.push(
                        { store_id: store.id, user_id: user.id, category_id: expCats[0].id, amount: isLogistics ? 15000000 : 3500000, expense_date: format(mDate, "yyyy-MM-dd"), memo: "월 고정 비용" },
                        { store_id: store.id, user_id: user.id, category_id: expCats[1].id, amount: isLogistics ? 25000000 : 7000000, expense_date: format(mDate, "yyyy-MM-dd"), memo: "급여" }
                    )
                }
                await supabase.from("sales_records").insert(sBatch)
                await supabase.from("expense_records").insert(eBatch)
            }

            setStatus("데모 구축 완료! 화면을 전환합니다...")
            alert("울트라 리치 데모 환경 구축이 완료되었습니다!\n\n'김철수 대표'의 '성수 메인점'으로 즉시 이동합니다.")
            await refreshStores()
            if (createdStores && createdStores.length > 0) {
                // Find '성수 메인점' or use the first one
                const mainStore = createdStores.find(s => s.name === "성수 메인점") || createdStores[0]
                setActiveStoreId(mainStore.id)
            }
            fetchAllUsers()
            setStatus("")
        } catch (e: any) {
            console.error("Ultra Demo Error:", e)
            alert(`구축 실패: ${e.message || JSON.stringify(e)}`)
            setStatus(`오류 발생: ${e.message}`)
        } finally {
            setGenerating(false)
        }
    }

    if (role !== 'super_admin') {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                    <ShieldAlert className="w-16 h-16 text-rose-500 animate-pulse" />
                    <h1 className="text-2xl font-black italic text-white">접근 권한 없음</h1>
                    <p className="text-slate-400">시스템 관리자만 접근할 수 있는 페이지입니다.</p>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black italic text-white tracking-tighter uppercase">
                            Developer Console
                        </h1>
                        <p className="text-slate-400 mt-2">시스템 전체 사업주 및 매장 관리</p>
                    </div>
                    <Button
                        onClick={generateSampleData}
                        disabled={generating}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black"
                    >
                        {generating ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 생성 중...</>
                        ) : (
                            <><DbIcon className="w-4 h-4 mr-2" /> 기존 지점 데이터 생성</>
                        )}
                    </Button>
                    <Button
                        onClick={generateFullDemo}
                        disabled={generating}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black"
                    >
                        {generating ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 구축 중...</>
                        ) : (
                            <><Building2 className="w-4 h-4 mr-2" /> 풀 샘플 환경 구축 (지점/직원/데이터)</>
                        )}
                    </Button>
                </div>

                {generating && (
                    <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl p-6 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
                        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                        <div className="text-center">
                            <h3 className="text-lg font-black text-white italic uppercase tracking-wider mb-1">
                                Ultra-Rich Eco-System Generating...
                            </h3>
                            <p className="text-indigo-300 font-bold animate-pulse">
                                {status || "Starting database architecture..."}
                            </p>
                        </div>
                        <div className="w-full max-w-md bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full animate-progress-indeterminate" />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <CollapsibleCard
                        title="전체 사업주 현황"
                        storageKey="admin-owners-summary"
                        icon={<Users className="w-5 h-5 text-indigo-400" />}
                    >
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">등록된 사업주</span>
                                <span className="text-2xl font-black text-white">{owners.length}명</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">활성 지점 수</span>
                                <span className="text-2xl font-black text-indigo-400">
                                    {owners.reduce((sum, o) => sum + o.stores_count, 0)}개
                                </span>
                            </div>
                        </div>
                    </CollapsibleCard>

                    <CollapsibleCard
                        title="시스템 상태"
                        storageKey="admin-system-status"
                        icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    >
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                <span className="text-slate-200 font-bold">인증 서버 운영 중</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-slate-200 font-bold">데이터베이스 격리 정상</span>
                            </div>
                        </div>
                    </CollapsibleCard>
                </div>

                <CollapsibleCard
                    title="사업주 관리 리스트"
                    storageKey="admin-owners-list"
                    icon={<Building2 className="w-5 h-5 text-amber-400" />}
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                                    <th className="px-4 py-3 font-black">사업주 성함</th>
                                    <th className="px-4 py-3 font-black">신청 사업장</th>
                                    <th className="px-4 py-3 font-black text-center">운영 지점 수</th>
                                    <th className="px-4 py-3 font-black">권한 (Role)</th>
                                    <th className="px-4 py-3 font-black">상태 (Status)</th>
                                    <th className="px-4 py-3 font-black text-right">관리 (Manage)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {owners.map(owner => (
                                    <tr key={owner.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="font-bold text-white">{owner.full_name || "미설정"}</div>
                                            <div className="text-xs text-indigo-300 font-medium">{owner.email || "이메일 없음"}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="text-[10px] text-slate-500 font-mono">{owner.id}</div>
                                                {owner.is_approved ? (
                                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">Approved</span>
                                                ) : (
                                                    <span className="text-[10px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20 font-bold uppercase">Pending</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm font-bold text-white">
                                                {owner.requested_business_name || "-"}
                                            </div>
                                            {!owner.is_approved && (
                                                <div className="mt-1 space-y-0.5 border-t border-white/5 pt-1">
                                                    <div className="text-[10px] text-slate-400"><span className="text-indigo-400">대표:</span> {owner.requested_representative || "-"}</div>
                                                    <div className="text-[10px] text-slate-400"><span className="text-indigo-400">번호:</span> {owner.requested_registration_number || "-"}</div>
                                                    <div className="text-[10px] text-slate-400"><span className="text-indigo-400">주소:</span> {owner.requested_address || "-"}</div>
                                                    <div className="text-[10px] text-slate-400"><span className="text-indigo-400">업종/태:</span> {owner.requested_category}/{owner.requested_type}</div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-black">
                                                {owner.stores_count}개 지점
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-center">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${owner.role === 'super_admin' ? 'bg-purple-500/20 text-purple-400' :
                                                    owner.role === 'owner' ? 'bg-indigo-500/20 text-indigo-400' :
                                                        'bg-slate-700 text-slate-300'
                                                    }`}>
                                                    {owner.role || 'User'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                인증됨
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right flex items-center justify-end gap-2">
                                            <select
                                                value={owner.role}
                                                onChange={async (e) => {
                                                    const newRole = e.target.value
                                                    if (!confirm(`${owner.full_name}님의 역할을 ${newRole}(으)로 변경하시겠습니까?`)) return
                                                    const { error } = await supabase
                                                        .from('profiles')
                                                        .update({ role: newRole })
                                                        .eq('id', owner.id)
                                                    if (error) {
                                                        alert("변경 실패: " + error.message)
                                                    } else {
                                                        fetchAllUsers()
                                                    }
                                                }}
                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                                            >
                                                <option value="owner" className="bg-slate-900">Owner</option>
                                                <option value="super_admin" className="bg-slate-900">Super Admin</option>
                                                <option value="manager" className="bg-slate-900">Manager</option>
                                                <option value="staff" className="bg-slate-900">Staff</option>
                                            </select>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={owner.is_approved ? "text-rose-400 hover:text-rose-300" : "text-emerald-400 hover:text-emerald-300"}
                                                onClick={async () => {
                                                    const newStatus = !owner.is_approved
                                                    const action = newStatus ? "승인" : "승인 취소"
                                                    if (!confirm(`${owner.full_name || owner.email}님의 가입을 ${action}하시겠습니까?\n${newStatus ? '(승인 시 사업장 및 지점 데이터가 자동 생성됩니다)' : ''}`)) return

                                                    let error;
                                                    if (newStatus) {
                                                        // Use Auto-Provisioning RPC for approving new users
                                                        const { error: rpcError } = await supabase.rpc('approve_owner_and_create_store', { t_owner_id: owner.id })
                                                        error = rpcError
                                                    } else {
                                                        const { error: updateError } = await supabase
                                                            .from('profiles')
                                                            .update({ is_approved: newStatus })
                                                            .eq('id', owner.id)
                                                        error = updateError
                                                    }

                                                    if (error) {
                                                        alert("작업 실패: " + error.message)
                                                    } else {
                                                        fetchAllUsers()
                                                    }
                                                }}
                                            >
                                                {owner.is_approved ? (
                                                    <><XCircle className="w-4 h-4 mr-1" /> 승인 취소</>
                                                ) : (
                                                    <><CheckCircle2 className="w-4 h-4 mr-1" /> 승인하기</>
                                                )}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {owners.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                            등록된 사업주가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CollapsibleCard>
            </div>
        </AppLayout>
    )
}
