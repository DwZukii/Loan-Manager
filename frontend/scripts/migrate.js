/* global process */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log("Migrating database status 'Called (No Answer)' to 'Called'...");
  const { error } = await supabase
    .from('leads')
    .update({ status: 'Called' })
    .eq('status', 'Called (No Answer)');
  
  if (error) {
    console.error("Migration failed:", error);
  } else {
    console.log("Migration successful!");
  }
}

run();
