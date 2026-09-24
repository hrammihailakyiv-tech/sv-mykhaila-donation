import { createClient } from '@supabase/supabase-js'

// Лише публічні значення. service_role ключ у браузері не використовується ніколи.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = !!url && !!anonKey

export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key')
