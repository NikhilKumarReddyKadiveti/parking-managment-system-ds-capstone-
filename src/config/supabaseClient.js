import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bahxnzoproqiuxtymdvo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhaHhuem9wcm9xaXV4dHltZHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDM0OTksImV4cCI6MjA5NzAxOTQ5OX0.6bEnNb163eJ2VPPfy2m0dSAEFBtHo5CAN-g5gPkkVH0';

console.log("Initializing Supabase with URL:", supabaseUrl);
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
