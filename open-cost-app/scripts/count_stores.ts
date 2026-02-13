
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

async function countStores() {
    // We can't see other's data, but if we are the user running the app, we see OURS.
    // In many dev environments, RLS might be off or we are using the only user.
    const { data: stores, count } = await supabase.from('stores').select('*', { count: 'exact' })
    console.log(`\n--- STORE COUNT ---`)
    console.log(`Total Stores found: ${count}`)
    stores?.forEach((s, i) => console.log(`${i + 1}. ${s.name} (ID: ${s.id})`))

    if (count && count > 1) {
        console.log(`\nWARNING: Multiple stores detected. This explains the aggregation!`)
    }
}

countStores()
