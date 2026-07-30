/**
 * import_customers.js
 *
 * Standalone Node.js script to bulk import customers from Excel into Supabase.
 *
 * Features:
 *  - Automatically fetches registered agents from Supabase `profiles` table
 *  - Smart Token Auto-Matcher to automatically link Excel Agent Names (e.g. "NIK MAZDI") to user emails (e.g. nmazdi@gmail.com)
 *  - Generates & loads `agent_map.json` so Admin can inspect/customize mappings
 *  - Auto-pads 11-digit ICs with leading zero (e.g. 78017... -> 078017...)
 *  - Parses Date of Birth from IC automatically
 *  - Assigns unassigned/unmapped agent rows to Admin email
 *  - Handles duplicate ICs by assigning duplicate records to Admin email
 *  - Preserves Excel 'Product Name' into customer_notes
 *  - Supports --dry-run and --limit N flags for testing
 *
 * Usage:
 *  1. Preview run: node scripts/import_customers.js --email admin@company.com --password 123456 --limit 10 --dry-run
 *  2. Live import: node scripts/import_customers.js --email admin@company.com --password 123456
 */

const fs = require('fs');
const path = require('path');

// Resolve packages from frontend/node_modules if run from root directory
const frontendNodeModules = path.join(__dirname, '..', 'frontend', 'node_modules');
if (fs.existsSync(frontendNodeModules) && !module.paths.includes(frontendNodeModules)) {
  module.paths.unshift(frontendNodeModules);
}

const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// 1. Supabase Config
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zzxlgfffbgiexecfxbmd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_kXDL8NWQDtgO3TxP2rySGw_Yp3zZiNK';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. CLI Arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Extract --limit N and --offset N if passed
let limitCount = null;
const limitIdx = args.findIndex(arg => arg.startsWith('--limit'));
if (limitIdx !== -1) {
  const argVal = args[limitIdx].includes('=') ? args[limitIdx].split('=')[1] : args[limitIdx + 1];
  if (argVal && !isNaN(parseInt(argVal, 10))) {
    limitCount = parseInt(argVal, 10);
  }
}

let offsetCount = 0;
const offsetIdx = args.findIndex(arg => arg.startsWith('--offset'));
if (offsetIdx !== -1) {
  const argVal = args[offsetIdx].includes('=') ? args[offsetIdx].split('=')[1] : args[offsetIdx + 1];
  if (argVal && !isNaN(parseInt(argVal, 10))) {
    offsetCount = parseInt(argVal, 10);
  }
}

// Extract --email and --password if passed for RLS authentication
const emailIdx = args.findIndex(arg => arg.startsWith('--email'));
const userAuthEmail = emailIdx !== -1 ? (args[emailIdx].includes('=') ? args[emailIdx].split('=')[1] : args[emailIdx + 1]) : null;

const passIdx = args.findIndex(arg => arg.startsWith('--password'));
const userAuthPass = passIdx !== -1 ? (args[passIdx].includes('=') ? args[passIdx].split('=')[1] : args[passIdx + 1]) : null;

const adminEmail = args.find(arg => !arg.startsWith('--') && (limitIdx === -1 || (arg !== args[limitIdx] && arg !== args[limitIdx + 1])) && (emailIdx === -1 || (arg !== args[emailIdx] && arg !== args[emailIdx + 1])) && (passIdx === -1 || (arg !== args[passIdx] && arg !== args[passIdx + 1]))) || userAuthEmail || 'admin@company.com';

// 3. Helper: Parse DOB from Malaysian IC number (handles 11 or 12 digits)
function parseDobFromIC(icDigits) {
  if (!icDigits || icDigits.length < 6) return null;

  let cleaned = icDigits;
  if (cleaned.length === 11) {
    cleaned = '0' + cleaned;
  }
  if (cleaned.length !== 12) return null;

  const yyStr = cleaned.slice(0, 2);
  const mmStr = cleaned.slice(2, 4);
  const ddStr = cleaned.slice(4, 6);

  const yy = parseInt(yyStr, 10);
  const mm = parseInt(mmStr, 10);
  const dd = parseInt(ddStr, 10);

  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;
  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;

  const currentTwoDigitYear = new Date().getFullYear() % 100;
  const fullYear = yy > currentTwoDigitYear ? 1900 + yy : 2000 + yy;

  const formattedMonth = String(mm).padStart(2, '0');
  const formattedDay = String(dd).padStart(2, '0');

  const dateObj = new Date(fullYear, mm - 1, dd);
  if (
    dateObj.getFullYear() !== fullYear ||
    dateObj.getMonth() !== mm - 1 ||
    dateObj.getDate() !== dd
  ) {
    return null;
  }

  return `${fullYear}-${formattedMonth}-${formattedDay}`;
}

// 4. Helper: Map Excel Status to System Status
function mapStatus(excelStatus) {
  if (!excelStatus) return 'New';
  const s = String(excelStatus).trim();
  if (s === 'Disbursed') return 'Disbursed';
  if (s === 'Approved') return 'Approved';
  if (s === 'Rejected') return 'Rejected';
  if (s === 'Pending' || s === 'Pending@Agency') return 'Pending';
  if (s === 'Process') return 'Process';
  if (s === 'New') return 'New';
  return 'New';
}

// 5. Smart Token Matcher for Agent Names
function getTokens(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(t => t.length > 1 && t !== 'bin' && t !== 'binti' && t !== 'bt');
}

function findBestAgentMatch(excelAgentName, profiles) {
  if (!excelAgentName || excelAgentName === 'UNASSIGNED') return null;
  const excelTokens = getTokens(excelAgentName);

  let bestScore = 0;
  let bestEmail = null;

  for (const p of profiles) {
    const emailUser = p.email.split('@')[0].toLowerCase();
    const profileTokens = getTokens((p.full_name || '') + ' ' + emailUser);

    let matches = 0;
    for (const et of excelTokens) {
      for (const pt of profileTokens) {
        if (et === pt || (et.length >= 4 && pt.includes(et)) || (pt.length >= 4 && et.includes(pt))) {
          matches++;
          break;
        }
      }
    }

    if (matches > bestScore) {
      bestScore = matches;
      bestEmail = p.email;
    }
  }

  return bestScore > 0 ? bestEmail : null;
}

// 6. Main Execution
async function runImport() {
  const excelPath = path.join(__dirname, '..', 'customers_customers_export_20260729_072615.xlsx');
  const mapPath   = path.join(__dirname, 'agent_map.json');

  if (!fs.existsSync(excelPath)) {
    console.error('❌ Excel file not found at:', excelPath);
    return;
  }

  // Authenticate if credentials provided to satisfy RLS policy
  if (userAuthEmail && userAuthPass) {
    console.log(`🔑 Authenticating with Supabase as ${userAuthEmail}...`);
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: userAuthEmail,
      password: userAuthPass,
    });
    if (authErr) {
      console.error(`❌ Authentication failed: ${authErr.message}`);
      console.error(`👉 Please check that --email and --password match your actual TeleManager login credentials.`);
      return;
    }
    console.log(`✅ Authenticated successfully as ${userAuthEmail}!`);
  }

  // Fetch profiles from Supabase for smart agent matching
  console.log(`👥 Fetching registered agent profiles from Supabase...`);
  const { data: profiles = [], error: profilesError } = await supabase
    .from('profiles')
    .select('email, full_name');

  if (profilesError) {
    console.warn(`⚠️ Could not fetch profiles: ${profilesError.message}. Using default fallback email.`);
  } else {
    console.log(`✅ Loaded ${profiles.length} registered profiles from Supabase.`);
  }

  // Fetch existing customers in DB to prevent duplicate insertions
  console.log(`🔍 Fetching existing customer names & ICs from Supabase...`);
  const { data: existingCustomers = [], error: existingError } = await supabase
    .from('customers')
    .select('full_name, ic_number');

  const existingDBNames = new Set((existingCustomers || []).map(c => (c.full_name || '').trim().toLowerCase()));
  const existingDBICs   = new Set((existingCustomers || []).map(c => (c.ic_number || '').replace(/\D/g, '').trim()));
  console.log(`✅ Loaded ${existingDBNames.size} existing customer names/ICs from database.`);

  // Load custom agent map if available
  let agentMap = {};
  if (fs.existsSync(mapPath)) {
    try {
      agentMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      console.log(`📋 Loaded agent_map.json (${Object.keys(agentMap).length} custom mappings)`);
    } catch (e) {
      console.warn('⚠️ Could not parse agent_map.json, using auto-matcher.');
    }
  }

  console.log(`📖 Reading Excel file...`);
  const wb = xlsx.readFile(excelPath);
  let rawRows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(`📊 Found ${rawRows.length} total rows in Excel.`);

  if (offsetCount > 0 || (limitCount && limitCount > 0)) {
    const start = offsetCount;
    const end = limitCount ? start + limitCount : rawRows.length;
    rawRows = rawRows.slice(start, end);
    console.log(`⚠️ [--offset ${offsetCount} --limit ${limitCount || 'all'}] Processing rows ${start + 1} to ${start + rawRows.length} (${rawRows.length} rows) for testing.\n`);
  } else {
    console.log('');
  }

  const seenICs = new Set();
  let duplicateICCount = 0;
  let skippedExistingDBCount = 0;
  let autoMatchedAgentCount = 0;
  let unassignedAgentCount = 0;
  let paddedICCount = 0;
  let missingDobCount = 0;

  const customersToInsert = [];
  const updatedAgentMap = { ...agentMap };

  rawRows.forEach((row, index) => {
    const rawName = String(row['Name'] || '').trim();
    let rawICDigits = String(row['IC Number'] || '').replace(/\D/g, '').trim();
    const rawPhone = String(row['Phone Number'] || '').replace(/\D/g, '').trim();
    const excelAgent = String(row['Agent Name'] || 'UNASSIGNED').trim();
    const excelStatus = String(row['Status'] || '').trim();
    const productName = String(row['Product Name'] || '').trim();

    // Check if customer ALREADY exists in Supabase DB by Name or IC
    const cleanNameLower = rawName.toLowerCase();
    if ((cleanNameLower && existingDBNames.has(cleanNameLower)) || (rawICDigits && existingDBICs.has(rawICDigits))) {
      skippedExistingDBCount++;
      return; // SKIP inserting this customer!
    }

    // 1. Pad 11-digit ICs if missing leading 0
    if (rawICDigits.length === 11) {
      rawICDigits = '0' + rawICDigits;
      paddedICCount++;
    }

    // 2. Format IC display string (YYMMDD-PB-###G) if 12 digits
    let icDisplay = rawICDigits;
    if (rawICDigits.length === 12) {
      icDisplay = `${rawICDigits.slice(0, 6)}-${rawICDigits.slice(6, 8)}-${rawICDigits.slice(8)}`;
    }

    // 3. Determine Agent Assignment
    let targetAgent = updatedAgentMap[excelAgent] || null;

    if (!targetAgent && excelAgent !== 'UNASSIGNED') {
      const matchedEmail = findBestAgentMatch(excelAgent, profiles);
      if (matchedEmail) {
        targetAgent = matchedEmail;
        updatedAgentMap[excelAgent] = matchedEmail;
        autoMatchedAgentCount++;
      }
    }

    let isDuplicate = false;

    if (rawICDigits && seenICs.has(rawICDigits)) {
      isDuplicate = true;
      duplicateICCount++;
      targetAgent = adminEmail; // Duplicates assigned to Admin for review
    } else if (rawICDigits) {
      seenICs.add(rawICDigits);
    }

    if (!targetAgent || excelAgent === 'UNASSIGNED') {
      targetAgent = adminEmail; // Unassigned customers default to Admin
      unassignedAgentCount++;
      updatedAgentMap[excelAgent] = adminEmail;
    }

    // 4. Derive DOB
    const dob = parseDobFromIC(rawICDigits);
    if (!dob) missingDobCount++;

    // 5. System Status
    const systemStatus = mapStatus(excelStatus);

    const customerRecord = {
      full_name: rawName || `Customer ${index + 1}`,
      ic_number: icDisplay || '000000-00-0000',
      phone_number: rawPhone || null,
      date_of_birth: dob,
      status: systemStatus,
      agent_email: targetAgent,
      created_by: userAuthEmail || adminEmail,
      created_at: new Date().toISOString(),
    };

    customersToInsert.push({ customerRecord, productName, isDuplicate, excelAgent });
  });

  // Save generated/updated agent_map.json file
  fs.writeFileSync(mapPath, JSON.stringify(updatedAgentMap, null, 2), 'utf8');
  console.log(`📝 Updated agent_map.json with ${Object.keys(updatedAgentMap).length} agent name mappings.`);

  // Print Summary Analysis
  console.log(`========================================`);
  console.log(`📊 PRE-IMPORT DATA SUMMARY`);
  console.log(`========================================`);
  console.log(`Total New Customers      : ${customersToInsert.length}`);
  console.log(`Skipped (Already in DB)  : ${skippedExistingDBCount} customers skipped`);
  console.log(`Admin Target Email       : ${adminEmail}`);
  console.log(`Smart Auto-Matched       : ${autoMatchedAgentCount} agent names linked to DB emails`);
  console.log(`Unassigned / Admin       : ${unassignedAgentCount} rows assigned to Admin`);
  console.log(`Duplicate ICs in Batch   : ${duplicateICCount} rows assigned to Admin`);
  console.log(`Padded 11-digit ICs      : ${paddedICCount} rows auto-corrected`);
  console.log(`Valid DOBs Calculated    : ${customersToInsert.length - missingDobCount}`);
  console.log(`========================================\n`);

  if (isDryRun) {
    console.log(`🔍 [DRY-RUN MODE] No data was inserted into Supabase.`);
    console.log(`💡 To execute the actual import, run:`);
    console.log(`   node scripts/import_customers.js --email ${adminEmail} --password YOUR_PASSWORD\n`);
    return;
  }

  console.log(`🚀 Executing live database import...`);

  // Insert customers in batches of 200 (ultra-safe network payload)
  const CHUNK_SIZE = 200;
  let insertedCount = 0;
  const notesToInsert = [];

  for (let i = 0; i < customersToInsert.length; i += CHUNK_SIZE) {
    const chunk = customersToInsert.slice(i, i + CHUNK_SIZE);
    const chunkRecords = chunk.map(c => c.customerRecord);

    const { data: insertedData, error } = await supabase
      .from('customers')
      .insert(chunkRecords)
      .select('id, full_name');

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / CHUNK_SIZE) + 1} failed:`, error.message);
    } else {
      insertedCount += (insertedData ? insertedData.length : chunk.length);

      // Prepare product notes for inserted chunk
      if (insertedData && insertedData.length === chunk.length) {
        chunk.forEach((item, idx) => {
          const custId = insertedData[idx].id;
          const notes = [];
          if (item.productName && item.productName !== '....') {
            notes.push(`Imported Product: ${item.productName}`);
          }
          if (item.isDuplicate) {
            notes.push(`Duplicate IC detected during import (Excel Agent: ${item.excelAgent}). Assigned to Admin for review.`);
          }
          if (notes.length > 0) {
            notesToInsert.push({
              customer_id: custId,
              note_text: notes.join(' | '),
              author_email: userAuthEmail || adminEmail,
            });
          }
        });
      }

      const pct = Math.round((insertedCount / customersToInsert.length) * 100);
      console.log(`✅ Batch ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(customersToInsert.length / CHUNK_SIZE)} inserted [${insertedCount}/${customersToInsert.length} rows (${pct}%)]`);
    }
  }

  // Insert product notes in batch if any
  if (notesToInsert.length > 0) {
    console.log(`\n📝 Inserting ${notesToInsert.length} customer product & audit notes...`);
    for (let i = 0; i < notesToInsert.length; i += CHUNK_SIZE) {
      const chunkNotes = notesToInsert.slice(i, i + CHUNK_SIZE);
      await supabase.from('customer_notes').insert(chunkNotes);
    }
  }

  console.log(`\n🎉 IMPORT COMPLETE! Successfully imported ${insertedCount} customers into Supabase!`);
}

runImport().catch(err => {
  console.error('Fatal import error:', err);
});
