
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// Try to use Service Role Key primarily to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials")
    process.exit(1)
}

console.log(`Using Key: ${supabaseKey.substring(0, 5)}...`)

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function checkAnomalies() {
    console.log("Checking for anomalies...")

    // 3. Check ALL expense records sorted by amount descending
    const { data: expenses, error } = await supabase
        .from('expense_records')
        .select('*')
        .order('amount', { ascending: false })
        .limit(10)

    if (error) {
        console.error("Error fetching expenses:", error)
        return
    }

    console.log(`\nTop 10 high expense records:`)
    expenses?.forEach(e => {
        console.log(`- Date: ${e.expense_date}, Amount: ${e.amount.toLocaleString()} (Category: ${e.category_id}, ID: ${e.id})`)
    })

    // Also check total sum
    const total = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0
    console.log(`Sum of top 10: ${total.toLocaleString()}`)
}

checkAnomalies()
