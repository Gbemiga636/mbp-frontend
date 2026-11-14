// Prefer MBP_* so Netlify can keep the original SUPABASE_* keys unchanged.
function supabaseUrl() {
  return String(process.env.MBP_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
}

function supabaseServiceKey() {
  return process.env.MBP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function supabaseAnonKey() {
  return process.env.MBP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
}

module.exports = { supabaseUrl, supabaseServiceKey, supabaseAnonKey };
