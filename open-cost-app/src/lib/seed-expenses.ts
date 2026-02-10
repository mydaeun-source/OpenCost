
import { SupabaseClient } from "@supabase/supabase-js"
import { subMonths, format } from "date-fns"

export const seedExpenses = async (supabase: SupabaseClient, userId: string, storeId: string) => {
    // 1. Clean existing data for this store
    await supabase.from("expense_records").delete().eq("store_id", storeId)
    // Note: Categories are usually shared or we can check if they exist before creating
    // For simplicity, we'll ensure categories exist for this store/user if not present

    // 2. Insert Categories (Idempotent check)
    const categoriesData = [
        { name: '월세 (임대료)', default_amount: 1500000, is_fixed: true },
        { name: '인건비 (알바)', default_amount: null, is_fixed: false },
        { name: '수도광열비', default_amount: 250000, is_fixed: true },
        { name: '관리비', default_amount: 100000, is_fixed: true },
        { name: '배달앱 광고비', default_amount: 330000, is_fixed: true },
        { name: '세금/공과금', default_amount: null, is_fixed: false },
        { name: '소모품/잡비', default_amount: null, is_fixed: false },
        { name: '매입 (식자재)', default_amount: null, is_fixed: false },
    ]

    // Fetch existing categories to map IDs
    let { data: existingCats } = await supabase.from("expense_categories").select("*").eq("store_id", storeId)
    if (!existingCats) existingCats = []

    // Insert missing categories
    const catsToInsert = categoriesData.filter(c => !existingCats.some((ec: any) => ec.name === c.name))
    if (catsToInsert.length > 0) {
        const { data: newCats, error } = await supabase
            .from("expense_categories")
            .insert(catsToInsert.map(c => ({ ...c, user_id: userId, store_id: storeId })))
            .select()

        if (error) throw new Error("카테고리 생성 실패: " + error.message)
        if (newCats) existingCats = [...existingCats, ...newCats]
    }

    // Map names to IDs for easy access
    const catMap = existingCats.reduce((acc: any, c: any) => ({ ...acc, [c.name]: c.id }), {} as Record<string, string>)

    // 3. Generate 6 Months of Records
    const records = []
    const today = new Date()

    // Loop for current month (0) + previous 5 months
    for (let i = 0; i < 6; i++) {
        const targetDate = subMonths(today, i)
        const yearMonth = format(targetDate, "yyyy-MM")

        // === Fixed Costs ===
        // Rent (1st of month)
        if (catMap['월세 (임대료)']) {
            records.push({
                user_id: userId,
                store_id: storeId,
                category_id: catMap['월세 (임대료)'],
                amount: 1500000,
                expense_date: `${yearMonth}-01`,
                memo: `${parseInt(format(targetDate, "M"))}월 월세`
            })
        }

        // Ads (5th)
        if (catMap['배달앱 광고비']) {
            records.push({
                user_id: userId,
                store_id: storeId,
                category_id: catMap['배달앱 광고비'],
                amount: 330000,
                expense_date: `${yearMonth}-05`,
                memo: '배달의민족 울트라콜 광고비'
            })
        }

        // Management (25th)
        if (catMap['관리비']) {
            records.push({
                user_id: userId,
                store_id: storeId,
                category_id: catMap['관리비'],
                amount: 100000,
                expense_date: `${yearMonth}-25`,
                memo: '상가 관리비'
            })
        }

        // Utilities (~28th, slightly variable)
        if (catMap['수도광열비']) {
            records.push({
                user_id: userId,
                store_id: storeId,
                category_id: catMap['수도광열비'],
                amount: 230000 + Math.floor(Math.random() * 40000), // 23~27man
                expense_date: `${yearMonth}-28`,
                memo: '전기/수도 요금 납부'
            })
        }

        // === Variable Costs ===

        // Labor (Weekly - 4 times)
        if (catMap['인건비 (알바)']) {
            for (let w = 1; w <= 4; w++) {
                // Avoid invalid dates (simple approach: 7, 14, 21, 28)
                const day = w * 7
                records.push({
                    user_id: userId,
                    store_id: storeId,
                    category_id: catMap['인건비 (알바)'],
                    amount: 350000 + Math.floor(Math.random() * 50000), // 35~40man per week
                    expense_date: `${yearMonth}-${String(day).padStart(2, '0')}`,
                    memo: `${w}주차 주말 알바비`
                })
            }
        }

        // Supplies (Random 3-5 times)
        if (catMap['소모품/잡비']) {
            const supplyCount = 3 + Math.floor(Math.random() * 3)
            for (let k = 0; k < supplyCount; k++) {
                const day = 1 + Math.floor(Math.random() * 27) // 1~28
                records.push({
                    user_id: userId,
                    store_id: storeId,
                    category_id: catMap['소모품/잡비'],
                    amount: 15000 + Math.floor(Math.random() * 35000), // 1.5~5man
                    expense_date: `${yearMonth}-${String(day).padStart(2, '0')}`,
                    memo: '주방 소모품/비품 구매'
                })
            }
        }
    }

    const { error: recError } = await supabase.from("expense_records").insert(records)
    if (recError) throw new Error("지출 내역 생성 실패: " + recError.message)

    return true
}
