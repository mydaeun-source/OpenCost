
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://goijnameodrrscrxunqz.supabase.co';
const supabaseKey = 'sb_publishable_ZFxhz2JZqTigRd-rctTgyQ_yonH5dNZ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking data...");

    // 1. Get the Set Menu
    const { data: recipes, error: rError } = await supabase
        .from('recipes')
        .select('*')
        .eq('name', '꽈배기 선물 세트 A (기본)');

    if (rError) { console.error("Recipe Error:", rError); return; }
    if (!recipes || recipes.length === 0) { console.log("Recipe not found!"); return; }

    const recipe = recipes[0];
    console.log(`Found Recipe: ${recipe.name} (${recipe.id})`);

    // 2. Get Ingredients
    const { data: items, error: iError } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipe.id);

    if (iError) { console.error("Items Error:", iError); return; }
    console.log(`Found ${items.length} items in this recipe.`);

    for (const item of items) {
        console.log(` - Item ID: ${item.item_id}, Type: ${item.item_type}, Qty: ${item.quantity}`);

        if (item.item_type === 'menu') {
            const { data: m } = await supabase.from('recipes').select('name').eq('id', item.item_id).single();
            console.log(`   -> Resolves to Menu: ${m ? m.name : 'NULL'}`);
        } else if (item.item_type === 'ingredient') {
            const { data: i } = await supabase.from('ingredients').select('name').eq('id', item.item_id).single();
            console.log(`   -> Resolves to Ingredient: ${i ? i.name : 'NULL'}`);
        }
    }
}

check();
