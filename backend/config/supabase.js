const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder-url')) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('Supabase credentials not configured. Running with in-memory fallback for local development.');
}

module.exports = supabase;
