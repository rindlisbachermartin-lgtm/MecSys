import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lwdeftpkuruygiuzhdsq.supabase.co'
const supabaseKey = 'sb_publishable_0gWfbDqndQFDZHg-sNPubw_OFbzuqtH'

export const supabase = createClient(supabaseUrl, supabaseKey)
