
import { supabase } from "./supabase"

export async function debugRecipeData() {
    console.log("Debugging Recipe Data...")

    // 1. Find the Set Menu
    const { data: recipe } = await supabase.from("recipes").select("*").eq("name", "꽈배기 선물 세트 A (기본)").single()

    if (!recipe) {
        console.log("Recipe not found")
        return
    }

    console.log("Found Recipe:", recipe.id, recipe.name)

    // 2. Fetch Ingredients
    const { data: items } = await supabase.from("recipe_ingredients").select("*").eq("recipe_id", recipe.id)

    console.log("Recipe Ingredients:", items)

    if (items && items.length > 0) {
        // Check IDs
        for (const item of items) {
            if (item.item_type === 'menu') {
                const { data: menu } = await supabase.from("recipes").select("id, name").eq("id", item.item_id).single()
                console.log(`Item (Menu) ${item.item_id}:`, menu)
            } else {
                const { data: ing } = await supabase.from("ingredients").select("id, name").eq("id", item.item_id).single()
                console.log(`Item (Ingredient) ${item.item_id}:`, ing)
            }
        }
    }
}

// Call it if running directly (need a way to run this)
// We will export it and call it from a temporary page or just run it via node if we utilize env vars.
// Since environment variables are in .env.local, running with ts-node might be tricky without setup.
// Easier to just add a temporary button in Settings page or similar, OR just make a temporary API route.
