/* global process */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load .env from frontend root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase credentials in .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// ── SHARED HELPERS (Copied from AdminDashboard.jsx) ──────────────────────
const classifyNumber = (rawPart) => {
  const clean = String(rawPart).replace(/\D/g, '')
  if (!clean) return null
  let p = clean
  if (p.startsWith('0060')) p = p.substring(2)
  if (p.startsWith('1') && (p.length === 9 || p.length === 10)) p = '60' + p
  else if (p.startsWith('0') && (p.length === 10 || p.length === 11)) p = '6' + p
  const phoneValid = p.startsWith('601') && (p.length === 11 || p.length === 12)
  const mm = parseInt(clean.slice(2, 4))
  const dd = parseInt(clean.slice(4, 6))
  const icValid = clean.length === 12 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31

  if (icValid && phoneValid) return { type: 'ambiguous', icValue: clean, phoneValue: p }
  if (icValid)               return { type: 'ic',        value: clean }
  if (phoneValid)            return { type: 'phone',     value: p }
  return null
}

const extractAge = (icStr) => {
  const yy = parseInt(icStr.slice(0, 2))
  const currentYear = new Date().getFullYear()
  const cutoff = currentYear % 100
  const fullYear = yy <= cutoff ? 2000 + yy : 1900 + yy
  return currentYear - fullYear
}

const runAllNumbersExtraction = (rawData) => {
  const extracted = []
  rawData.forEach(row => {
    row.forEach(cell => {
      if (!cell) return
      const cellStr = String(cell)
      const normalized = cellStr.replace(/and|or|&|;|\n|\/|\|/gi, ',')
      const parts = normalized.split(',')
      parts.forEach(part => {
        let clean = part.replace(/\D/g, '')
        if (!clean) return
        if (clean.startsWith('0060')) clean = clean.substring(2)
        if (clean.startsWith('1') && (clean.length === 9 || clean.length === 10)) clean = '60' + clean
        else if (clean.startsWith('0') && (clean.length === 10 || clean.length === 11)) clean = '6' + clean
        if (clean.startsWith('601') && (clean.length === 11 || clean.length === 12)) extracted.push(clean)
      })
    })
  })
  return extracted
}

const runAgeFilteredExtraction = (rawData, minA, maxA) => {
  const extracted = []
  rawData.forEach(row => {
    if (!row || row.length === 0) return
    const ics = [], phones = [], ambiguous = []
    row.forEach(cell => {
      if (!cell) return
      const cellStr = String(cell)
      const normalized = cellStr.replace(/and|or|&|;|\n|\/|\|/gi, ',')
      normalized.split(',').forEach(part => {
        const result = classifyNumber(part.trim())
        if (!result) return
        if (result.type === 'ic')        ics.push(result.value)
        else if (result.type === 'phone')     phones.push(result.value)
        else if (result.type === 'ambiguous') ambiguous.push(result)
      })
    })

    let icStr = null, phoneStr = null
    if (ics.length > 0 && phones.length > 0) {
      icStr = ics[0]; phoneStr = phones[0]
    } else if (ics.length > 0 && phones.length === 0 && ambiguous.length > 0) {
      icStr = ics[0]; phoneStr = ambiguous[0].phoneValue
    } else if (phones.length > 0 && ics.length === 0 && ambiguous.length > 0) {
      icStr = ambiguous[0].icValue; phoneStr = phones[0]
    } else if (ics.length === 0 && phones.length === 0 && ambiguous.length >= 2) {
      icStr = ambiguous[0].icValue; phoneStr = ambiguous[1].phoneValue
    }

    if (!icStr || !phoneStr) return
    const age = extractAge(icStr)
    if (age < minA || age > maxA) return
    extracted.push(phoneStr)
  })
  return extracted
}
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Welcome to TeleManager Bulk Backlog Uploader\n");

  const adminEmail = await question("Admin email: ");
  const adminPassword = await question("Admin password (characters will be visible): ");
  
  if (!adminEmail || !adminPassword) { console.log("Aborted."); process.exit(0); }

  console.log("\nLogging into Supabase...");
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (authError) {
    console.log(`❌ Login failed: ${authError.message}`);
    process.exit(1);
  }
  console.log(`✅ Logged in successfully as Admin!`);

  console.log("\nWhich pool are you uploading to?");
  console.log("1. Set A");
  console.log("2. Set B");
  console.log("3. Set C");
  const setChoice = await question("Enter 1, 2, or 3: ");
  let uploadSet = "Set A";
  if (setChoice === "2") uploadSet = "Set B";
  if (setChoice === "3") uploadSet = "Set C";

  console.log("\nWhich mode?");
  console.log("1. All valid mobile numbers");
  console.log("2. Age Filter (must have valid IC in the same row)");
  const modeChoice = await question("Enter 1 or 2: ");
  let extractMode = modeChoice === "2" ? "age" : "all";
  let minAge = 25, maxAge = 55;

  if (extractMode === "age") {
    const minInput = await question(`Enter Minimum Age (default ${minAge}): `);
    if (minInput && !isNaN(minInput)) minAge = parseInt(minInput);
    const maxInput = await question(`Enter Maximum Age (default ${maxAge}): `);
    if (maxInput && !isNaN(maxInput)) maxAge = parseInt(maxInput);
  }

  const backlogDir = path.join(__dirname, '..', 'backlog');
  if (!fs.existsSync(backlogDir)) {
    fs.mkdirSync(backlogDir);
    console.log(`\n📂 Created 'backlog' folder at: ${backlogDir}`);
    console.log(`Please copy all your .xlsx or .csv files into this folder and run the script again.`);
    process.exit(0);
  }

  const files = fs.readdirSync(backlogDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.csv') || f.endsWith('.xls'));
  
  if (files.length === 0) {
    console.log(`\n⚠️ No Excel files found in ${backlogDir}`);
    console.log("Please copy your files there and try again.");
    process.exit(0);
  }

  console.log(`\nFound ${files.length} files. Commencing upload...\n`);

  let totalUploaded = 0;
  let totalDuplicatesSkipped = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(backlogDir, file);
    
    process.stdout.write(`[${i+1}/${files.length}] Processing ${file}... `);
    
    let rawData = [];
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    } catch (e) {
      console.log(`❌ Error reading file: ${e.message}`);
      continue;
    }

    let extracted = [];
    if (extractMode === 'all') {
      extracted = runAllNumbersExtraction(rawData);
    } else {
      extracted = runAgeFilteredExtraction(rawData, minAge, maxAge);
    }

    const uniqueNumbers = [...new Set(extracted)];
    if (uniqueNumbers.length === 0) {
      console.log(`0 valid numbers found.`);
      continue;
    }

    process.stdout.write(`${uniqueNumbers.length} numbers found... `);

    // Check duplicates in chunks of 1000
    const chunkSize = 1000;
    const chunks = [];
    for (let j = 0; j < uniqueNumbers.length; j += chunkSize) {
      chunks.push(uniqueNumbers.slice(j, j + chunkSize));
    }

    const drawProgressBar = (current, total, text) => {
      const width = 30;
      const percent = Math.floor((current / total) * 100);
      const filled = Math.min(width, Math.floor((width * current) / total));
      const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
      process.stdout.write(`\r${text} [${bar}] ${percent}% (${current}/${total})   `);
    };

    console.log(); // Newline from previous print

    let existingSet = new Set();
    try {
      for (let j = 0; j < chunks.length; j++) {
        drawProgressBar(j + 1, chunks.length, "Checking duplicates");
        const { data, error } = await supabase.rpc('check_duplicate_phones', { phone_numbers: chunks[j] });
        if (error) throw error;
        if (data) data.forEach(l => existingSet.add(l.phone_number));
        // Add a small delay between duplicate checking chunks
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      console.log(); // Move to next line after progress bar finishes
    } catch (e) {
      console.log(`\n❌ Error checking DB duplicates: ${e.message}`);
      continue;
    }

    const trulyFreshNumbers = uniqueNumbers.filter(phone => !existingSet.has(phone));
    const duplicates = uniqueNumbers.length - trulyFreshNumbers.length;
    totalDuplicatesSkipped += duplicates;

    if (trulyFreshNumbers.length === 0) {
      console.log(`0 inserted (${duplicates} skipped duplicates).`);
      continue;
    }

    const leadsToInsert = trulyFreshNumbers.map(phone => ({ 
      phone_number: phone, 
      assigned_to: 'unassigned', 
      status: 'Pending', 
      agent_notes: '', 
      document_url: null, 
      admin_reviewed: true, 
      manager_reviewed: true, 
      lead_set: uploadSet, 
      pool_owner: adminEmail 
    }));

    let insertError = null;
    const insertChunkSize = 500;
    const totalBatches = Math.ceil(leadsToInsert.length / insertChunkSize);
    let batchCount = 0;
    
    for (let k = 0; k < leadsToInsert.length; k += insertChunkSize) {
      batchCount++;
      drawProgressBar(batchCount, totalBatches, "Pushing to database");
      
      const batch = leadsToInsert.slice(k, k + insertChunkSize);
      const { error } = await supabase.from('leads').insert(batch, { ignoreDuplicates: true });
      if (error) { insertError = error; break; }
      
      // Add a small pause to prevent overloading DB connections
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log(); // Move to next line after progress bar finishes

    if (insertError) {
      console.log(`❌ Error inserting to DB: ${insertError.message}`);
    } else {
      console.log(`✅ ${trulyFreshNumbers.length} inserted! (${duplicates} duplicates skipped)`);
      totalUploaded += trulyFreshNumbers.length;
    }
  }

  console.log(`\n🎉 All done!`);
  console.log(`Total Leads Successfully Pushed: ${totalUploaded}`);
  console.log(`Total Duplicates Skipped: ${totalDuplicatesSkipped}`);
  process.exit(0);
}

main();
