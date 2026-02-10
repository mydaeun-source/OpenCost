const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://goijnameodrrscrxunqz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvaWpuYW1lb2RycnNjcnh1bnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTIwNzMsImV4cCI6MjA4NTg4ODA3M30.RHCdLpZiXxL-BO7SVpxaJQjEAvUAzNvMbSy_WGx-To4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProfiles() {
    console.log("Attempting login as super_admin (mydaeun@gmail.com)...");

    // Try password123! first (as per generateFullDemo)
    let { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'mydaeun@gmail.com',
        password: 'password123!'
    });

    if (loginError) {
        console.log("Login failed with password123!, trying 123456...");
        const { data: s2, error: l2 } = await supabase.auth.signInWithPassword({
            email: 'mydaeun@gmail.com',
            password: '123456'
        });
        session = s2 ? s2.session : null;
        if (l2) {
            console.error("ALL Logins failed:", l2.message);
            return;
        }
    }

    console.log("Logged in:", session?.user?.email);

    console.log("Running Frontend Query...");
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*, stores:stores(count)")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("QUERY ERROR:", error);
        return;
    }

    console.log(`Found ${profiles.length} profiles.`);
    profiles.forEach(p => {
        const storeCount = p.stores ? p.stores[0]?.count : 'N/A';
        console.log(`- [${p.role}] ${p.full_name} | Approved: ${p.is_approved} | Stores: ${storeCount} | Created: ${p.created_at}`);
    });
}

debugProfiles();
