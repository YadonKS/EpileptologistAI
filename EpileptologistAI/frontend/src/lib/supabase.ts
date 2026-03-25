import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xaeibuotxbjpyeofcgqz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_WQU3eV_z5RYuRRLAWfHm4Q_I4FWPJMW'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
