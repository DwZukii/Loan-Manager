import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'
import { runAllNumbersExtraction, runAgeFilteredExtraction } from '../admin/extractionUtils'

export default function ManagerCleanAdd({ userEmail }) {
  const queryClient = useQueryClient()

  const [validNumbers, setValidNumbers] = useState([])
  const [previewItems, setPreviewItems] = useState([])
  const [previewPage, setPreviewPage] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadSet, setUploadSet] = useState('Set A')
  const [uploadStatus, setUploadStatus] = useState('')
  const [isUploadingToDB, setIsUploadingToDB] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const [filesNeedAnalysis, setFilesNeedAnalysis] = useState(false)
  const [extractMode, setExtractMode] = useState('all')
  const [minAge, setMinAge] = useState(25)
  const [maxAge, setMaxAge] = useState(55)

  // ── FILE SCAN ENGINE ─────────────────────────────────────────────────────
  const scanFiles = async (filesToScan) => {
    if (filesToScan.length === 0) { setValidNumbers([]); setUploadStatus(''); setFilesNeedAnalysis(false); return; }

    setIsAnalyzing(true);
    setAnalyzeProgress(0);
    setValidNumbers([]);
    setUploadStatus(`Starting scan of ${filesToScan.length} file${filesToScan.length > 1 ? 's' : ''}...`);

    try {
      const XLSX = await import('xlsx');

      const readFileData = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const workbook = XLSX.read(evt.target.result, { type: 'binary' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            resolve(XLSX.utils.sheet_to_json(worksheet, { header: 1 }));
          } catch { resolve([]); }
        };
        reader.onerror = () => resolve([]);
        reader.readAsBinaryString(file);
      });

      let allExtracted = [];
      let totalRowsScanned = 0, totalRowsWithIC = 0, totalRowsMatched = 0;

      for (let i = 0; i < filesToScan.length; i++) {
        setUploadStatus(`Scanning file ${i + 1} of ${filesToScan.length}: "${filesToScan[i].name}"...`);
        const fileBase = i / filesToScan.length;
        const fileSlice = 1 / filesToScan.length;
        setAnalyzeProgress(Math.round(fileBase * 100));
        await new Promise(resolve => setTimeout(resolve, 50));

        const rawData = await readFileData(filesToScan[i]);

        const onRowProgress = (rowsDone, totalRows) => {
          const intraFile = totalRows > 0 ? rowsDone / totalRows : 1;
          setAnalyzeProgress(Math.round((fileBase + intraFile * fileSlice) * 100));
        };

        if (extractMode === 'all') {
          allExtracted = allExtracted.concat(await runAllNumbersExtraction(rawData, onRowProgress));
        } else {
          const { numbers, rowsScanned, rowsWithIC, rowsMatched } = await runAgeFilteredExtraction(rawData, minAge, maxAge, onRowProgress);
          allExtracted = allExtracted.concat(numbers);
          totalRowsScanned += rowsScanned;
          totalRowsWithIC  += rowsWithIC;
          totalRowsMatched += rowsMatched;
        }
        setAnalyzeProgress(Math.round(((i + 1) / filesToScan.length) * 100));
      }

      setFilesNeedAnalysis(false);

      const isAgeMode = extractMode !== 'all';
      let uniqueItems;
      if (isAgeMode) {
        const seen = new Set();
        uniqueItems = allExtracted.filter(item => {
          if (seen.has(item.phone)) return false;
          seen.add(item.phone);
          return true;
        });
      } else {
        uniqueItems = [...new Set(allExtracted)];
      }

      const uniqueCount = uniqueItems.length;
      const fileLabel = filesToScan.length > 1 ? ` across ${filesToScan.length} files` : '';

      if (uniqueCount > 10000) {
        setValidNumbers([]);
        setPreviewItems([]);
        setUploadStatus(`🛑 Limit Exceeded: Found ${uniqueCount} numbers${fileLabel}. Maximum allowed is 10,000 per upload to ensure stability.`);
      } else if (!isAgeMode) {
        setValidNumbers(uniqueItems);
        setPreviewItems(uniqueItems.map(phone => ({ phone })));
        if (uniqueCount > 0) { setUploadStatus(`✅ Found ${uniqueCount} valid numbers${fileLabel}.`); setTimeout(() => setUploadStatus(''), 3000); }
        else setUploadStatus(`No valid mobile numbers found${fileLabel}.`);
      } else {
        setValidNumbers(uniqueItems.map(item => item.phone));
        setPreviewItems(uniqueItems);
        if (uniqueCount > 0) {
          setUploadStatus(`✅ ${totalRowsScanned} rows scanned${fileLabel} → ${totalRowsWithIC} had a valid IC → ${totalRowsMatched} matched age ${minAge}–${maxAge} → ${uniqueCount} unique numbers ready.`); setTimeout(() => setUploadStatus(''), 4000);
        } else {
          setUploadStatus(`No numbers found. Scanned ${totalRowsScanned} rows${fileLabel}, ${totalRowsWithIC} had ICs, but none matched age ${minAge}–${maxAge}.`);
        }
      }
    } catch { setUploadStatus('Error reading file(s).'); }
    setIsAnalyzing(false);
  }

  // ── FILE UPLOAD HANDLER ─────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;
    e.target.value = '';

    const merged = [...selectedFiles, ...newFiles];
    if (merged.length > 10) {
      setUploadStatus(`🛑 Too Many Files: You already have ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} selected. Maximum is 10 total.`);
      return;
    }
    setSelectedFiles(merged);
    setFilesNeedAnalysis(true);
    setValidNumbers([]);
    setPreviewItems([]);
    setUploadStatus(`Ready to analyze ${merged.length} file(s).`);
  }

  // ── REMOVE SINGLE FILE ───────────────────────────────────────────────────
  const removeFile = (indexToRemove) => {
    const updated = selectedFiles.filter((_, i) => i !== indexToRemove);
    setSelectedFiles(updated);
    setFilesNeedAnalysis(updated.length > 0);
    setValidNumbers([]);
    setPreviewItems([]);
    if (updated.length === 0) setUploadStatus('');
    else setUploadStatus(`Ready to analyze ${updated.length} file(s).`);
  }

  const handleUploadToDatabase = async () => {
    if (validNumbers.length === 0) return;
    setIsUploadingToDB(true);
    setUploadStatus(`Scanning ${validNumbers.length} numbers against the global database...`);

    const chunkSize = 1000;
    const chunks = [];
    for (let i = 0; i < validNumbers.length; i += chunkSize) {
      chunks.push(validNumbers.slice(i, i + chunkSize));
    }

    const results = await Promise.all(
      chunks.map(chunk =>
        supabase.rpc('check_duplicate_phones', { phone_numbers: chunk })
      )
    );

    const existingSet = new Set(
      results.flatMap(({ data }) => data ? data.map(l => l.phone_number) : [])
    );
    const trulyFreshNumbers = validNumbers.filter(phone => !existingSet.has(phone));

    const rejectedCount = validNumbers.length - trulyFreshNumbers.length;

    if (trulyFreshNumbers.length === 0) {
      setUploadStatus(`Upload cancelled: All ${validNumbers.length} leads are already in the database!`);
      setValidNumbers([]);
      setPreviewItems([]);
      setSelectedFiles([]);
      const el = document.getElementById('file-upload-input');
      if (el) el.value = '';
      setIsUploadingToDB(false);
      return;
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
      pool_owner: userEmail
    }));

    const insertChunkSize = 500;
    let insertError = null;
    for (let i = 0; i < leadsToInsert.length; i += insertChunkSize) {
      const batch = leadsToInsert.slice(i, i + insertChunkSize);
      const inserted = Math.min(i + insertChunkSize, leadsToInsert.length);
      setUploadStatus(`Pushing... ${inserted} / ${leadsToInsert.length} (Skipped ${rejectedCount} duplicates)`);
      const { error } = await supabase.from('leads').insert(batch, { ignoreDuplicates: true });
      if (error) { insertError = error; break; }
    }

    if (!insertError) {
      setUploadStatus(`✅ Done! Added ${trulyFreshNumbers.length} numbers to ${uploadSet} 🛡️ (Intercepted ${rejectedCount} duplicates)`);
      setTimeout(() => setUploadStatus(''), 3000);
      setValidNumbers([]);
      setPreviewItems([]);
      setSelectedFiles([]);
      const el = document.getElementById('file-upload-input');
      if (el) el.value = '';
      queryClient.invalidateQueries({ queryKey: ['managerData', userEmail] });
    } else {
      setUploadStatus(`Error: ${insertError.message}`)
    }
    setIsUploadingToDB(false);
  }

  return (
    <div className="bg-white p-4 sm:p-8 rounded shadow-md border border-gray-100 relative overflow-hidden flex flex-col h-full">
      <h2 className="text-xl sm:text-2xl font-bold text-indigo-900 mb-6 flex items-center gap-3 relative z-10">
        <span className="bg-indigo-100 text-indigo-700 rounded-sm w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shadow-sm flex-shrink-0"><Sparkles className="w-5 h-5" /></span>
        Clean & Add
      </h2>
      <div className="space-y-6 flex-1 flex flex-col relative z-10">
        <div>
          <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Target Database Set</label>
          <select value={uploadSet} onChange={(e) => setUploadSet(e.target.value)} className="w-full p-3.5 border border-indigo-200 rounded bg-white font-black text-indigo-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow">
            <option value="Set A">Database: Set A</option>
            <option value="Set B">Database: Set B</option>
            <option value="Set C">Database: Set C</option>
          </select>
        </div>
        {/* ── Extract Mode Picker ── */}
        <div>
          <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Extract Mode</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

            {/* Mode A — default */}
            <button
              onClick={() => { setExtractMode('all'); setValidNumbers([]); setUploadStatus(''); setSelectedFiles([]); setFilesNeedAnalysis(false); const el = document.getElementById('file-upload-input'); if (el) el.value = ''; }}
              className={`p-3.5 rounded border-2 text-left transition-all duration-200 ${
                extractMode === 'all' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'
              }`}
            >
              <p className={`font-black text-sm mb-1 ${extractMode === 'all' ? 'text-indigo-900' : 'text-gray-700'}`}>All Numbers</p>
              <p className={`text-[11px] leading-snug ${extractMode === 'all' ? 'text-indigo-600' : 'text-gray-400'}`}>
                Grabs every valid phone number in the file. Age is not considered. Fastest and most inclusive.
              </p>
            </button>

            {/* Mode B — optional, age-filtered */}
            <button
              onClick={() => { setExtractMode('age'); setValidNumbers([]); setUploadStatus(''); setSelectedFiles([]); setFilesNeedAnalysis(false); const el = document.getElementById('file-upload-input'); if (el) el.value = ''; }}
              className={`p-3.5 rounded border-2 text-left transition-all duration-200 ${
                extractMode === 'age' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'
              }`}
            >
              <p className={`font-black text-sm mb-1 flex items-center gap-1.5 ${extractMode === 'age' ? 'text-indigo-900' : 'text-gray-700'}`}>
                By Age Range
                <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wide">New</span>
              </p>
              <p className={`text-[11px] leading-snug ${extractMode === 'age' ? 'text-indigo-600' : 'text-gray-400'}`}>
                Reads the IC on each row to filter by age. Both IC and phone number must exist on the same row.
              </p>
            </button>

          </div>

          {/* Age range inputs — only visible in Mode B */}
          {extractMode === 'age' && (
            <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded">
              <p className="text-xs text-amber-800 font-bold mb-3">⚠️ Rows without a recognisable Malaysian IC will be skipped entirely.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1.5 uppercase tracking-wider">Min Age</label>
                  <input
                    type="number" value={minAge} min="1" max="100"
                    onChange={e => setMinAge(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 border border-amber-200 rounded text-sm font-bold text-indigo-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1.5 uppercase tracking-wider">Max Age</label>
                  <input
                    type="number" value={maxAge} min="1" max="100"
                    onChange={e => setMaxAge(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 border border-amber-200 rounded text-sm font-bold text-indigo-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── File Upload ── */}
        <div>
          <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider flex items-center justify-between">
            <span>Upload Spreadsheets</span>
            <span className="text-indigo-400 font-medium normal-case tracking-normal">({selectedFiles.length}/10 files)</span>
          </label>
          <input id="file-upload-input" type="file" multiple accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="w-full p-3 border border-indigo-200 rounded bg-white text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
          {/* ── Selected file chips ── */}
          {selectedFiles.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold px-2.5 py-1 rounded-full max-w-full">
                  <span className="truncate max-w-[160px]" title={file.name}>{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-indigo-200 hover:bg-red-400 hover:text-white text-indigo-500 flex items-center justify-center transition-colors leading-none text-[10px] font-black"
                    title={`Remove ${file.name}`}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-auto pt-4">
          {filesNeedAnalysis ? (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded shadow-sm">
              <p className="text-sm font-bold text-indigo-800 mb-3 text-center">{uploadStatus}</p>
              {isAnalyzing && (
                <div className="w-full bg-indigo-200 rounded-full h-2 mb-3 overflow-hidden">
                  <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${analyzeProgress}%` }}></div>
                </div>
              )}
              <button onClick={() => scanFiles(selectedFiles)} disabled={isAnalyzing} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded hover:bg-indigo-700 shadow-sm shadow-indigo-400/30 transition-all disabled:opacity-50">
                {isAnalyzing ? `Analyzing... ${analyzeProgress}%` : 'Confirm & Analyze Files'}
              </button>
            </div>
          ) : validNumbers.length > 0 ? (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded shadow-sm space-y-3">
              <p className="text-sm font-bold text-indigo-800 text-center">{uploadStatus}</p>
              {/* ── NUMBER PREVIEW ── */}
              {(() => {
                const PAGE_SIZE = 18;
                const totalPages = Math.ceil(previewItems.length / PAGE_SIZE);
                const pageItems = previewItems.slice(previewPage * PAGE_SIZE, (previewPage + 1) * PAGE_SIZE);
                return (
                  <div className="bg-white border border-indigo-200 rounded overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-indigo-100/60 border-b border-indigo-200">
                      <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">Preview — {validNumbers.length} numbers ready</span>
                      {previewItems.some(i => i.age != null) && <span className="text-xs font-bold text-indigo-500">age shown</span>}
                    </div>
                    <div className="p-2">
                      <div className="flex flex-wrap gap-1.5 min-h-[60px]">
                        {pageItems.map((item, idx) => {
                          const realIdx = previewPage * PAGE_SIZE + idx;
                          return (
                            <span key={realIdx} className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-sm pl-2 pr-1 py-0.5 text-xs font-mono text-indigo-900">
                              {item.phone}
                              {item.age != null && <span className="bg-indigo-200 text-indigo-800 font-black rounded px-1">{item.age}y</span>}
                              <button
                                onClick={() => {
                                  const newItems = previewItems.filter((_, i) => i !== realIdx);
                                  setPreviewItems(newItems);
                                  setValidNumbers(newItems.map(i => i.phone));
                                  const newTotalPages = Math.ceil(newItems.length / PAGE_SIZE);
                                  if (previewPage >= newTotalPages) setPreviewPage(Math.max(0, newTotalPages - 1));
                                }}
                                className="ml-0.5 w-3.5 h-3.5 rounded-full bg-indigo-200 hover:bg-red-400 hover:text-white text-indigo-500 flex items-center justify-center transition-colors text-[10px] font-black flex-shrink-0"
                                title="Remove this number"
                              >×</button>
                            </span>
                          );
                        })}
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-indigo-100">
                          <button onClick={() => setPreviewPage(p => Math.max(0, p - 1))} disabled={previewPage === 0} className="px-3 py-1 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-sm hover:bg-indigo-200 disabled:opacity-30 transition-colors">← Prev</button>
                          <span className="text-xs font-bold text-indigo-500">Page {previewPage + 1} of {totalPages}</span>
                          <button onClick={() => setPreviewPage(p => Math.min(totalPages - 1, p + 1))} disabled={previewPage === totalPages - 1} className="px-3 py-1 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-sm hover:bg-indigo-200 disabled:opacity-30 transition-colors">Next →</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              <button onClick={handleUploadToDatabase} disabled={isUploadingToDB} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded hover:bg-indigo-700 shadow-sm shadow-indigo-400/30 transition-all disabled:opacity-50">{isUploadingToDB ? 'Pushing...' : `Push to Personal ${uploadSet}`}</button>
              <button
                onClick={() => { setValidNumbers([]); setPreviewItems([]); setPreviewPage(0); setSelectedFiles([]); setUploadStatus(''); const el = document.getElementById('file-upload-input'); if (el) el.value = ''; }}
                disabled={isUploadingToDB}
                className="w-full bg-red-50 text-red-600 border border-red-200 font-bold py-3 rounded hover:bg-red-100 transition-all disabled:opacity-50"
              >Discard All</button>
            </div>
          ) : (
            uploadStatus && <p className="text-sm font-bold text-indigo-600 bg-indigo-50 p-3 rounded-sm border border-indigo-100 text-center">{uploadStatus}</p>
          )}
        </div>
      </div>
    </div>
  )
}
