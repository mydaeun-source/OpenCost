
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugStockDeduction() {
    console.log("--- DEBUGGING STOCK DEDUCTION ---")

    // 1. Pick an ingredient with a conversion factor > 1
    const { data: ingredients } = await supabase
        .from('ingredients')
        .select('*')
        .gt('conversion_factor', 1)
        .limit(1)

    if (!ingredients || ingredients.length === 0) {
        console.log("No ingredients with conversion_factor > 1 found.")
        return
    }

    const ing = ingredients[0]
    console.log(`Ingredient: ${ing.name} (ID: ${ing.id})`)
    console.log(`Current Stock: ${ing.current_stock} ${ing.purchase_unit}`)
    console.log(`Conversion Factor: ${ing.conversion_factor} (${ing.purchase_unit} -> ${ing.usage_unit})`)

    // 2. Find a recipe that uses this ingredient
    const { data: recipeIngs } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id, quantity')
        .eq('item_id', ing.id)
        .limit(1)

    if (!recipeIngs || recipeIngs.length === 0) {
        console.log("No recipe uses this ingredient.")
        return
    }

    const ri = recipeIngs[0]
    console.log(`Recipe uses ${ri.quantity} ${ing.usage_unit} per portion.`)

    // 3. Simulate what createOrder does: newStock = (ing.current_stock || 0) - qty (where qty is usage unit)
    const qtyDeducted = ri.quantity // for 1 portion
    const expectedNewStockIfBug = (ing.current_stock || 0) - qtyDeducted
    const correctNewStock = (ing.current_stock || 0) - (qtyDeducted / ing.conversion_factor)

    console.log(`\nIf bug exists: New Stock would be ${expectedNewStockIfBug} ${ing.purchase_unit}`)
    console.log(`If bug fixed: New Stock would be ${correctNewStock} ${ing.purchase_unit}`)

    if (expectedNewStockIfBug < 0 && ing.current_stock > 0) {
        console.log(`\nCRITICAL: Bug confirmed. Deducting usage unit from purchase unit results in negative stock.`)
    }
}

debugStockDeduction()
