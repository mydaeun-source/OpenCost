
import { supabase } from "@/lib/supabase"

export const generateTestData = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("로그인이 필요합니다.")

        console.log("Starting Data Generation...")

        // 1. Clear Existing Data (Order matters for FK constraints)
        await supabase.from("recipe_ingredients").delete().neq("id", "00000000-0000-0000-0000-000000000000") // Delete all
        await supabase.from("recipes").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("ingredients").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000")

        console.log("Cleared existing data.")

        // 2. Create Categories
        const categories = [
            { name: "기본 재료 (Base)", type: "ingredient" },
            { name: "육류/가공 (Meat)", type: "ingredient" },
            { name: "채소 (Veg)", type: "ingredient" },
            { name: "소스/양념 (Sauce)", type: "ingredient" },
            { name: "음료 (Beverage)", type: "ingredient" }, // New Category
            { name: "포장재 (Package)", type: "ingredient" },
            { name: "단품 (Single)", type: "menu" },
            { name: "세트 (Set)", type: "menu" },
        ]

        const catMap = new Map<string, string>() // Name -> ID

        for (const cat of categories) {
            const { data } = await supabase.from("categories").insert({
                ...cat,
                user_id: user.id
            } as any).select().single()
            if (data) catMap.set(cat.name, data.id)
        }

        // 3. Create Ingredients (Kkwabaegi Shop Theme - Enhanced)
        const ingredients = [
            { name: "밀가루 (강력분)", category: "기본 재료 (Base)", purchase_price: 25000, purchase_unit: "20kg", usage_unit: "g", conversion_factor: 20000, loss_rate: 0.02, current_stock: 3, safety_stock: 5 }, // Low Stock
            { name: "백설탕", category: "기본 재료 (Base)", purchase_price: 18000, purchase_unit: "15kg", usage_unit: "g", conversion_factor: 15000, loss_rate: 0.01, current_stock: 10, safety_stock: 2 },
            { name: "찹쌀가루", category: "기본 재료 (Base)", purchase_price: 45000, purchase_unit: "10kg", usage_unit: "g", conversion_factor: 10000, loss_rate: 0.0, current_stock: 8, safety_stock: 3 },
            { name: "이스트 (생)", category: "기본 재료 (Base)", purchase_price: 3500, purchase_unit: "500g", usage_unit: "g", conversion_factor: 500, loss_rate: 0.0, current_stock: 20, safety_stock: 5 },
            { name: "식용유 (대두유)", category: "기본 재료 (Base)", purchase_price: 38000, purchase_unit: "18L", usage_unit: "ml", conversion_factor: 18000, loss_rate: 0.05, current_stock: 2, safety_stock: 4 }, // Low Stock
            { name: "국산 팥앙금", category: "기본 재료 (Base)", purchase_price: 32000, purchase_unit: "5kg", usage_unit: "g", conversion_factor: 5000, loss_rate: 0.03, current_stock: 15, safety_stock: 5 },
            { name: "슈크림 (커스터드)", category: "기본 재료 (Base)", purchase_price: 12000, purchase_unit: "2kg", usage_unit: "g", conversion_factor: 2000, loss_rate: 0.05, current_stock: 4, safety_stock: 5 }, // Low Stock
            { name: "소시지 (점보)", category: "육류/가공 (Meat)", purchase_price: 15000, purchase_unit: "1kg", usage_unit: "g", conversion_factor: 1000, loss_rate: 0.0, current_stock: 30, safety_stock: 10 },
            { name: "모짜렐라 치즈", category: "육류/가공 (Meat)", purchase_price: 28000, purchase_unit: "2.5kg", usage_unit: "g", conversion_factor: 2500, loss_rate: 0.02, current_stock: 12, safety_stock: 5 },
            { name: "체다 치즈", category: "육류/가공 (Meat)", purchase_price: 24000, purchase_unit: "100매", usage_unit: "매", conversion_factor: 100, loss_rate: 0.0, current_stock: 5, safety_stock: 2 },
            { name: "케첩 (업소용)", category: "소스/양념 (Sauce)", purchase_price: 3500, purchase_unit: "3kg", usage_unit: "g", conversion_factor: 3000, loss_rate: 0.05, current_stock: 50, safety_stock: 10 },
            { name: "머스타드", category: "소스/양념 (Sauce)", purchase_price: 4500, purchase_unit: "2kg", usage_unit: "g", conversion_factor: 2000, loss_rate: 0.05, current_stock: 20, safety_stock: 5 },
            { name: "우유 (1000ml)", category: "음료 (Beverage)", purchase_price: 2800, purchase_unit: "1개", usage_unit: "개", conversion_factor: 1, loss_rate: 0.0, current_stock: 2, safety_stock: 5 }, // Low Stock
            { name: "오렌지 주스 (1.5L)", category: "음료 (Beverage)", purchase_price: 3500, purchase_unit: "1개", usage_unit: "개", conversion_factor: 1, loss_rate: 0.0, current_stock: 10, safety_stock: 3 },
            { name: "종이 봉투 (소)", category: "포장재 (Package)", purchase_price: 2500, purchase_unit: "100매", usage_unit: "매", conversion_factor: 100, loss_rate: 0.0, current_stock: 50, safety_stock: 20 },
            { name: "박스 (대)", category: "포장재 (Package)", purchase_price: 15000, purchase_unit: "50개", usage_unit: "개", conversion_factor: 50, loss_rate: 0.0, current_stock: 100, safety_stock: 20 },
            { name: "세트용 선물 박스", category: "포장재 (Package)", purchase_price: 35000, purchase_unit: "50개", usage_unit: "개", conversion_factor: 50, loss_rate: 0.0, current_stock: 15, safety_stock: 10 },
        ]

        const ingMap = new Map<string, string>() // Name -> ID

        for (const ing of ingredients) {
            const { category, ...rest } = ing
            const catId = catMap.get(category)
            if (!catId) console.warn(`Category not found: ${category}`)

            let { data, error } = await supabase.from("ingredients").insert({
                ...rest,
                category_id: catId,
                user_id: user.id
            } as any).select().single()

            if (error) {
                // Check if error is related to missing column (optional: check error message text)
                // If failed, try without stock columns
                console.warn(`Initial insert failed for ${ing.name}, retrying without stock info...`, error.message)
                const { current_stock, safety_stock, ...baseIng } = rest as any

                const retry = await supabase.from("ingredients").insert({
                    ...baseIng,
                    category_id: catId,
                    user_id: user.id
                } as any).select().single()

                data = retry.data
                error = retry.error
            }

            if (data) ingMap.set(ing.name, data.id)
        }

        // 4. Create Recipes (Single)
        const singles = [
            {
                name: "경성 찹쌀 꽈배기",
                selling_price: 1000,
                description: "쫄깃하고 담백한 경성 대표 꽈배기",
                items: [
                    { name: "밀가루 (강력분)", quantity: 45 },
                    { name: "찹쌀가루", quantity: 15 },
                    { name: "백설탕", quantity: 5 },
                    { name: "식용유 (대두유)", quantity: 10 },
                    { name: "종이 봉투 (소)", quantity: 1 }
                ]
            },
            {
                name: "팥 씨앗 도너츠",
                selling_price: 1500,
                description: "달콤한 팥앙금이 가득 들어있는 도너츠",
                items: [
                    { name: "밀가루 (강력분)", quantity: 40 },
                    { name: "국산 팥앙금", quantity: 30 },
                    { name: "백설탕", quantity: 3 },
                    { name: "식용유 (대두유)", quantity: 10 },
                    { name: "종이 봉투 (소)", quantity: 1 }
                ]
            },
            {
                name: "점보 핫도그",
                selling_price: 2500,
                description: "큼직한 소시지가 들어간 옛날 핫도그",
                items: [
                    { name: "밀가루 (강력분)", quantity: 50 },
                    { name: "소시지 (점보)", quantity: 60 },
                    { name: "식용유 (대두유)", quantity: 12 },
                    { name: "케첩 (업소용)", quantity: 10 },
                    { name: "종이 봉투 (소)", quantity: 1 }
                ]
            },
            {
                name: "치즈 볼 (3개입)",
                selling_price: 3000,
                description: "쭉 늘어나는 모짜렐라 치즈볼",
                items: [
                    { name: "찹쌀가루", quantity: 30 },
                    { name: "모짜렐라 치즈", quantity: 45 },
                    { name: "식용유 (대두유)", quantity: 8 },
                    { name: "박스 (대)", quantity: 1 }
                ]
            },
            {
                name: "슈크림 도너츠",
                selling_price: 1800,
                description: "부드러운 커스터드 크림이 듬뿍",
                items: [
                    { name: "밀가루 (강력분)", quantity: 40 },
                    { name: "슈크림 (커스터드)", quantity: 35 },
                    { name: "백설탕", quantity: 3 },
                    { name: "식용유 (대두유)", quantity: 10 },
                    { name: "종이 봉투 (소)", quantity: 1 }
                ]
            }
        ]

        const recipeMap = new Map<string, string>() // Name -> ID
        const singleCatId = catMap.get("단품 (Single)")

        for (const single of singles) {
            // Insert Recipe
            const { data: recipe } = await supabase.from("recipes").insert({
                name: single.name,
                selling_price: single.selling_price,
                description: single.description,
                type: 'menu',
                category_id: singleCatId,
                user_id: user.id
            }).select().single()

            if (recipe) {
                recipeMap.set(single.name, recipe.id)

                // Insert Ingredients
                const itemsToInsert = single.items.map(item => {
                    const itemId = ingMap.get(item.name)
                    if (!itemId) throw new Error(`Ingredient not found: ${item.name}`)
                    return {
                        recipe_id: recipe.id,
                        item_id: itemId,
                        item_type: 'ingredient',
                        quantity: item.quantity
                    }
                })

                await supabase.from("recipe_ingredients").insert(itemsToInsert as any)
            }
        }

        // 5. Create Recipes (Sets) - Recursive
        const sets = [
            {
                name: "꽈배기 선물 세트 A (기본)",
                selling_price: 10000,
                description: "가장 인기있는 꽈배기와 도너츠 실속 세트",
                items: [
                    { name: "경성 찹쌀 꽈배기", quantity: 5, type: 'menu' },
                    { name: "팥 씨앗 도너츠", quantity: 2, type: 'menu' },
                    { name: "세트용 선물 박스", quantity: 1, type: 'ingredient' }
                ]
            },
            {
                name: "꽈배기 선물 세트 B (프리미엄)",
                selling_price: 15000,
                description: "핫도그와 치즈볼이 포함된 푸짐한 세트",
                items: [
                    { name: "경성 찹쌀 꽈배기", quantity: 5, type: 'menu' },
                    { name: "점보 핫도그", quantity: 2, type: 'menu' },
                    { name: "치즈 볼 (3개입)", quantity: 1, type: 'menu' },
                    { name: "세트용 선물 박스", quantity: 1, type: 'ingredient' }
                ]
            },
            {
                name: "간식 세트 (커플)",
                selling_price: 6000,
                description: "둘이서 먹기 딱 좋은 구성",
                items: [
                    { name: "경성 찹쌀 꽈배기", quantity: 2, type: 'menu' },
                    { name: "슈크림 도너츠", quantity: 1, type: 'menu' },
                    { name: "점보 핫도그", quantity: 1, type: 'menu' },
                    { name: "박스 (대)", quantity: 1, type: 'ingredient' }
                ]
            },
            {
                name: "키즈 간식 세트 (우유포함)", // New Set
                selling_price: 4000,
                description: "아이들이 좋아하는 꽈배기와 우유",
                items: [
                    { name: "경성 찹쌀 꽈배기", quantity: 2, type: 'menu' },
                    { name: "우유 (1000ml)", quantity: 1, type: 'ingredient' },
                    { name: "종이 봉투 (소)", quantity: 1, type: 'ingredient' }
                ]
            },
            {
                name: "패밀리 파티 팩 (Family)", // New Set
                selling_price: 25000,
                description: "가족 모두가 즐기는 초대형 구성",
                items: [
                    { name: "경성 찹쌀 꽈배기", quantity: 10, type: 'menu' },
                    { name: "팥 씨앗 도너츠", quantity: 5, type: 'menu' },
                    { name: "점보 핫도그", quantity: 4, type: 'menu' },
                    { name: "오렌지 주스 (1.5L)", quantity: 1, type: 'ingredient' },
                    { name: "세트용 선물 박스", quantity: 2, type: 'ingredient' }
                ]
            }
        ]

        const setCatId = catMap.get("세트 (Set)")

        for (const setMenu of sets) {
            const { data: recipe } = await supabase.from("recipes").insert({
                name: setMenu.name,
                selling_price: setMenu.selling_price,
                description: setMenu.description,
                type: 'menu',
                category_id: setCatId,
                user_id: user.id
            }).select().single()

            if (recipe) {
                const itemsToInsert = setMenu.items.map(item => {
                    let itemId: string | undefined
                    if (item.type === 'menu') {
                        itemId = recipeMap.get(item.name)
                        if (!itemId) throw new Error(`Menu not found for Set: ${item.name}`)
                    } else {
                        itemId = ingMap.get(item.name)
                        if (!itemId) throw new Error(`Ingredient not found for Set: ${item.name}`)
                    }

                    return {
                        recipe_id: recipe.id,
                        item_id: itemId!,
                        item_type: item.type,
                        quantity: item.quantity
                    }
                })

                await supabase.from("recipe_ingredients").insert(itemsToInsert as any)
            }
        }

        // 6. Store Settings (Monthly Simulation)
        await supabase.from("store_settings").upsert({
            user_id: user.id,
            monthly_fixed_cost: 2800000, // Rent(150) + Labor(Part-time, 100) + Util(30)
            monthly_target_sales_count: 5000 // Realistic monthly sales count for a busy shop
        })

        console.log("Data Generation Complete!")
        return true

    } catch (error) {
        console.error("Data Gen Error:", error)
        throw error // Propagate to UI for alert
    }
}
