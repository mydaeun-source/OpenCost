export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            categories: {
                Row: {
                    id: string
                    name: string
                    type: 'ingredient' | 'menu' | 'prep'
                    created_at: string
                    user_id: string | null
                    store_id: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    type: 'ingredient' | 'menu' | 'prep'
                    created_at?: string
                    user_id?: string | null
                    store_id?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    type?: 'ingredient' | 'menu' | 'prep'
                    created_at?: string
                    user_id?: string | null
                    store_id?: string | null
                }
            }
            ingredients: {
                Row: {
                    id: string
                    name: string
                    category_id: string | null
                    purchase_price: number
                    purchase_unit: string
                    usage_unit: string
                    conversion_factor: number
                    loss_rate: number
                    created_at: string
                    user_id: string | null
                    store_id: string | null
                    current_stock: number
                    safety_stock: number
                }
                Insert: {
                    id?: string
                    name: string
                    category_id?: string | null
                    purchase_price?: number
                    purchase_unit: string
                    usage_unit: string
                    conversion_factor?: number
                    loss_rate?: number
                    created_at?: string
                    user_id?: string | null
                    store_id?: string | null
                    current_stock?: number
                    safety_stock?: number
                }
                Update: {
                    id?: string
                    name?: string
                    category_id?: string | null
                    purchase_price?: number
                    purchase_unit?: string
                    usage_unit?: string
                    conversion_factor?: number
                    loss_rate?: number
                    created_at?: string
                    user_id?: string | null
                    store_id?: string | null
                    current_stock?: number
                    safety_stock?: number
                }
            }
            recipes: {
                Row: {
                    id: string
                    name: string
                    type: 'menu' | 'prep'
                    category_id: string | null
                    selling_price: number | null
                    target_cost_rate: number | null
                    description: string | null
                    batch_size: number
                    batch_unit: string
                    portion_size: number | null
                    portion_unit: string | null
                    created_at: string
                    user_id: string | null
                    store_id: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    type: 'menu' | 'prep'
                    category_id?: string | null
                    selling_price?: number | null
                    target_cost_rate?: number | null
                    description?: string | null
                    batch_size?: number
                    batch_unit?: string
                    portion_size?: number | null
                    portion_unit?: string | null
                    created_at?: string
                    user_id?: string | null
                    store_id?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    type?: 'menu' | 'prep'
                    category_id?: string | null
                    selling_price?: number | null
                    target_cost_rate?: number | null
                    description?: string | null
                    batch_size?: number
                    batch_unit?: string
                    portion_size?: number | null
                    portion_unit?: string | null
                    created_at?: string
                    user_id?: string | null
                    store_id?: string | null
                }
            }
            recipe_ingredients: {
                Row: {
                    id: string
                    recipe_id: string
                    item_id: string
                    item_type: 'ingredient' | 'menu' | 'prep'
                    quantity: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    recipe_id: string
                    item_id: string
                    item_type: 'ingredient' | 'menu' | 'prep'
                    quantity: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    recipe_id?: string
                    item_id?: string
                    item_type?: 'ingredient' | 'menu' | 'prep'
                    quantity?: number
                    created_at?: string
                }
            }
            store_settings: {
                Row: {
                    user_id: string
                    monthly_fixed_cost: number
                    monthly_target_sales_count: number
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    monthly_fixed_cost?: number
                    monthly_target_sales_count?: number
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    monthly_fixed_cost?: number
                    monthly_target_sales_count?: number
                    updated_at?: string
                }
            }
            stores: {
                Row: {
                    id: string
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
                Insert: {
                    id?: string
                    owner_id?: string
                    name: string
                    business_number?: string | null
                    address?: string | null
                    contact?: string | null
                    monthly_fixed_cost?: number
                    monthly_target_sales_count?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    owner_id?: string
                    name?: string
                    business_number?: string | null
                    address?: string | null
                    contact?: string | null
                    monthly_fixed_cost?: number
                    monthly_target_sales_count?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            store_staff: {
                Row: {
                    id: string
                    store_id: string
                    user_id: string
                    role: 'owner' | 'manager' | 'staff'
                    permissions: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    user_id: string
                    role: 'owner' | 'manager' | 'staff'
                    permissions?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    user_id?: string
                    role?: 'owner' | 'manager' | 'staff'
                    permissions?: Json
                    created_at?: string
                }
            }
            expense_categories: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    default_amount: number | null
                    is_fixed: boolean
                    created_at: string
                    store_id: string | null
                }
                Insert: {
                    id?: string
                    user_id?: string
                    name: string
                    default_amount?: number | null
                    is_fixed?: boolean
                    created_at?: string
                    store_id?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    default_amount?: number | null
                    is_fixed?: boolean
                    created_at?: string
                    store_id?: string | null
                }
            }
            expense_records: {
                Row: {
                    id: string
                    user_id: string
                    category_id: string | null
                    amount: number
                    expense_date: string
                    memo: string | null
                    created_at: string
                    store_id: string | null
                }
                Insert: {
                    id?: string
                    user_id?: string
                    category_id?: string | null
                    amount: number
                    expense_date?: string
                    memo?: string | null
                    created_at?: string
                    store_id?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    category_id?: string | null
                    amount?: number
                    expense_date?: string
                    memo?: string | null
                    created_at?: string
                    store_id?: string | null
                }
            }
            sales_records: {
                Row: {
                    id: string
                    user_id: string
                    sales_date: string
                    daily_revenue: number
                    daily_cogs: number
                    memo: string | null
                    created_at: string
                    updated_at: string
                    store_id: string | null
                }
                Insert: {
                    id?: string
                    user_id?: string
                    sales_date: string
                    daily_revenue?: number
                    daily_cogs?: number
                    memo?: string | null
                    created_at?: string
                    updated_at?: string
                    store_id?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    sales_date?: string
                    daily_revenue?: number
                    daily_cogs?: number
                    memo?: string | null
                    created_at?: string
                    updated_at?: string
                    store_id?: string | null
                }
            }
            orders: {
                Row: {
                    id: string
                    user_id: string
                    total_amount: number
                    total_cost: number
                    payment_method: 'card' | 'cash' | 'transfer'
                    status: 'completed' | 'cancelled'
                    created_at: string
                    store_id: string | null
                }
                Insert: {
                    id?: string
                    user_id?: string
                    total_amount: number
                    total_cost: number
                    payment_method: 'card' | 'cash' | 'transfer'
                    status?: 'completed' | 'cancelled'
                    created_at?: string
                    store_id?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    total_amount?: number
                    total_cost?: number
                    payment_method?: 'card' | 'cash' | 'transfer'
                    status?: 'completed' | 'cancelled'
                    created_at?: string
                    store_id?: string | null
                }
            }
            order_items: {
                Row: {
                    id: string
                    order_id: string
                    menu_id: string
                    quantity: number
                    price: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    order_id: string
                    menu_id: string
                    quantity: number
                    price: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    order_id?: string
                    menu_id?: string
                    quantity?: number
                    price?: number
                    created_at?: string
                }
            }
            stock_adjustment_logs: {
                Row: {
                    id: string
                    ingredient_id: string
                    adjustment_type: 'purchase' | 'spoilage' | 'order' | 'correction' | 'refund'
                    quantity: number
                    reason: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    ingredient_id: string
                    adjustment_type: 'purchase' | 'spoilage' | 'order' | 'correction' | 'refund'
                    quantity: number
                    reason?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    ingredient_id?: string
                    adjustment_type?: 'purchase' | 'spoilage' | 'order' | 'correction' | 'refund'
                    quantity?: number
                    reason?: string | null
                    created_at?: string
                }
            }
            purchases: {
                Row: {
                    id: string
                    user_id: string
                    supplier_name: string | null
                    purchase_date: string
                    total_amount: number
                    status: 'completed' | 'draft'
                    created_at: string
                    store_id: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    supplier_name?: string | null
                    purchase_date?: string
                    total_amount: number
                    status?: 'completed' | 'draft'
                    created_at?: string
                    store_id?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    supplier_name?: string | null
                    purchase_date?: string
                    total_amount?: number
                    status?: 'completed' | 'draft'
                    created_at?: string
                    store_id?: string | null
                }
            }
            purchase_items: {
                Row: {
                    id: string
                    purchase_id: string
                    ingredient_id: string
                    quantity: number
                    price: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    purchase_id: string
                    ingredient_id: string
                    quantity: number
                    price: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    purchase_id?: string
                    ingredient_id?: string
                    quantity?: number
                    price?: number
                    created_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    full_name: string | null
                    avatar_url: string | null
                    role: 'super_admin' | 'owner' | 'manager' | 'staff'
                    updated_at: string
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: 'super_admin' | 'owner' | 'manager' | 'staff'
                    updated_at?: string
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: 'super_admin' | 'owner' | 'manager' | 'staff'
                    updated_at?: string
                }
            }
        }
    }
}
