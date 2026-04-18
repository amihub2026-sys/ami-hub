import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jhojcdhnsfqmroyfotyp.supabase.co';
const supabaseKey = 'sb_publishable_Jo0fr6797JPX-nJj75-kZA_fzUj8sxw';
export const supabase = createClient(supabaseUrl, supabaseKey);