const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://goijnameodrrscrxunqz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvaWpuYW1lb2RycnNjcnh1bnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTIwNzMsImV4cCI6MjA4NTg4ODA3M30.RHCdLpZiXxL-BO7SVpxaJQjEAvUAzNvMbSy_WGx-To4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUser() {
    const email = 'xmydaeun@gmail.com';
    const password = 'password123'; // Using a placeholder since I can't know the new user's password easily without asking.
    // Actually, I can't sign in as a random new user.

    // Pivot: I will just trust the user's report and look at the code.
    // The user said "New signup business info not reflecting".

    // Let's re-verify the trigger code logic in `20260211_immediate_provisioning.sql`.
    // It inserts into `businesses`. Use `v_business_name`.
    // `v_business_name` comes from `new.raw_user_meta_data->>'requested_business_name'`.
    // I updated `LoginPage` to send `requested_business_name`.

    // If `businesses` insert fails, does it throw? Yes.
    // If `stores` insert fails? Yes.

    // Maybe the `StoreContext` query is filtering it out?
    // `userBusinesses` in `StoreContext` queries `businesses`.
    // If RLS is enabled on `businesses`, can the owner see it?
    // Let's check `policies` on `businesses`.
}
console.log("Fetching latest profile...");

// 1. Get the most recently updated profile
const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1);

if (profileError) {
    console.error("Error fetching profiles:", profileError);
    return;
}

if (!profiles || profiles.length === 0) {
    console.log("No profiles found.");
    return;
}

const user = profiles[0];
console.log("Latest User Profile:", JSON.stringify(user, null, 2));

// 2. Check Business
const { data: businesses, error: busError } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id);

if (busError) console.error("Error fetching businesses:", busError);
console.log(`Businesses for ${user.email}:`, businesses);

// 3. Check Store
const { data: stores, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', user.id);

if (storeError) console.error("Error fetching stores:", storeError);
console.log(`Stores for ${user.email}:`, stores);

// 4. Check Store Staff (Permissions)
const { data: staff, error: staffError } = await supabase
    .from('store_staff')
    .select('*')
    .eq('user_id', user.id);

if (staffError) console.error("Error fetching staff:", staffError);
console.log(`Staff entries for ${user.email}:`, staff);

}

checkLatestUser();
