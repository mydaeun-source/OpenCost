
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyFinancials() {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    console.log(`Checking data for period: ${startOfMonth} to ${endOfMonth}`)

    // 1. Check Sales
    const { data: sales, error: salesError } = await supabase
        .from('sales_records')
        .select('*')
        .gte('sales_date', startOfMonth)
        .lte('sales_date', endOfMonth)

    if (salesError) console.error("Sales Error:", salesError)

    const totalRevenue = sales?.reduce((sum, r) => sum + Number(r.daily_revenue), 0) || 0
    const totalCogs = sales?.reduce((sum, r) => sum + Number(r.daily_cogs), 0) || 0

    // 2. Check Expenses
    const { data: expenses, error: expError } = await supabase
        .from('expense_records')
        .select('*')
        .gte('expense_date', startOfMonth)
        .lte('expense_date', endOfMonth)

    if (expError) console.error("Expense Error:", expError)

    const totalExpenses = expenses?.reduce((sum, r) => sum + Number(r.amount), 0) || 0

    // 3. Logic Simulation
    const estimatedProfit = totalRevenue - totalCogs - totalExpenses

    const result = {
        period: { start: startOfMonth, end: endOfMonth },
        sales: {
            count: sales?.length || 0,
            totalRevenue,
            totalCogs
        },
        expenses: {
            count: expenses?.length || 0,
            totalExpenses
        },
        simulation: {
            estimatedProfit,
            isUsingFallback: totalRevenue === 0
        }
    }

    const fs = require('fs')
    fs.writeFileSync('scripts/verify_financials_output.json', JSON.stringify(result, null, 2))
    console.log("Written to scripts/verify_financials_output.json")
}

verifyFinancials()
