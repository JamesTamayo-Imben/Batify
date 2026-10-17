import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Batify: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. See .env.local.example')
}

// The anon client is READ-ONLY (enforced by RLS). Every write goes through an edge function.
export const sb = createClient(url || 'http://localhost:54321', key || 'anon', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

// edit_token is deliberately not selectable by anon (column-level grants in schema.sql),
// so we must always list columns — never select('*') on pages.
export const PAGE_COLUMNS =
  'id,slug,owner_name,title,letter,birthday_date,theme,reveal_at,auto_approve_wishes,gcash_number,gcash_qr_url,is_published,created_at'
export const WISH_COLUMNS = 'id,page_id,sender_name,message,gift_type,media_url,media_type,is_approved,created_at'
