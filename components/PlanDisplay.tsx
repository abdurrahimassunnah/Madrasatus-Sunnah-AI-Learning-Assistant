import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { 
  Copy, Check, Printer, BookCheck, RefreshCw, RotateCcw, Loader2, 
  BookOpen, Calendar, Map, CheckCircle2, Circle, PlayCircle, 
  ChevronLeft, ChevronRight, Edit2, Palette, Save, HelpCircle, FileText, PenTool
} from 'lucide-react';

interface PlanDisplayProps {
  content: string;
  onReset: () => void;
  onRegenerateDay?: (date: string, previousContent: string) => Promise<{ cw: string, hw: string }>;
}

interface RoutineDay {
  date: string;
  cw: string;
  hw: string;
  index: number;
}

interface DayCustomization {
  status: 'planned' | 'current' | 'completed';
  color: 'emerald' | 'blue' | 'amber' | 'rose';
  teacherNotes: string;
  cwChecked: boolean;
  hwChecked: boolean;
}

const PlanDisplay: React.FC<PlanDisplayProps> = ({ content, onReset, onRegenerateDay }) => {
  const [copied, setCopied] = useState(false);
  const [editableContent, setEditableContent] = useState(content);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  
  // Tabs: 'table' (রুটিন টেবিল), 'diary' (শ্রেণি ডায়েরি), 'map' (ইন্টারেক্টিভ রোডম্যাপ)
  const [activeTab, setActiveTab] = useState<'table' | 'diary' | 'map'>('table');
  
  // Diary current page selection
  const [currentDiaryPage, setCurrentDiaryPage] = useState(0);
  
  // Customizations for each date
  const [customizations, setCustomizations] = useState<Record<string, DayCustomization>>({});
  
  // Editing state for day content (C.W and H.W)
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editCw, setEditCw] = useState('');
  const [editHw, setEditHw] = useState('');

  // Load customizations on mount
  useEffect(() => {
    const saved = localStorage.getItem('madrasah_map_customizations');
    if (saved) {
      try {
        setCustomizations(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load map customizations", e);
      }
    }
  }, []);

  const cleanMarkdown = (text: string): string => {
    if (!text) return '';
    
    let cleaned = text.trim();
    
    // Remove triple backticks wrapping markdown table if any (e.g. ```markdown ... ``` or ``` ... ```)
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/gm, '');
    cleaned = cleaned.replace(/```$/gm, '');
    cleaned = cleaned.trim();
    
    // Ensure there is a newline before any table start to help GFM parse it correctly
    if (cleaned.startsWith('|')) {
      cleaned = '\n' + cleaned;
    } else {
      // If there is preamble text before the table, ensure we have double newlines before the table starts
      cleaned = cleaned.replace(/([^\n])(\n*)\|/g, '$1\n\n|');
    }
    
    return cleaned;
  };

  // Update local content when prop content changes
  useEffect(() => {
    setEditableContent(cleanMarkdown(content));
  }, [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editableContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (printWindow) {
        const contentDiv = document.getElementById('printable-content');
        if (contentDiv) {
             printWindow.document.write('<html><head><title>মাদরাসাতুস সুন্নাহ - পাঠ পরিকল্পনা</title>');
             printWindow.document.write('<link href="https://fonts.maateen.me/solaiman-lipi/font.css" rel="stylesheet">');
             printWindow.document.write('<style>');
             printWindow.document.write(`
               body { font-family: "SolaimanLipi", sans-serif; padding: 20px; background: #fff; color: #1e293b; }
               .header { text-align: center; margin-bottom: 20px; }
               .header h1 { color: #047857; margin: 0; font-size: 26px; font-weight: 800; }
               .header p { color: #64748b; font-size: 14px; margin-top: 5px; }
               table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
               th, td { border: 1.5px solid #cbd5e1; padding: 14px; text-align: center; font-size: 15px; }
               th { background-color: #10b981; color: white; font-weight: 800; }
               td { font-weight: bold; }
               .red-text { color: #dc2626; font-weight: 800; }
               th:last-child, td:last-child { display: none; } /* Hide action column */
               @media print { .no-print { display: none !important; } }
             `);
             printWindow.document.write('</style>');
             printWindow.document.write('</head><body>');
             printWindow.document.write('<div class="header"><h1>মাদরাসাতুস সুন্নাহ - পাঠ পরিকল্পনা ও রুটিন</h1><p>এআই দ্বারা জেনারেটকৃত পাঠ বিবরণী</p></div>');
             printWindow.document.write(contentDiv.innerHTML);
             printWindow.document.write('</body></html>');
             printWindow.document.close();
             printWindow.focus();
             setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
        }
    }
  };

  const isSpecialText = (text: string) => {
    const specials = ['ক্লাস নেই', 'ছুটি', 'শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'];
    return specials.some(s => text.includes(s));
  };

  // Parsing the Markdown Table into structured objects
  const parseTableToDays = (markdown: string): RoutineDay[] => {
    const lines = markdown.split('\n');
    const days: RoutineDay[] = [];
    let idx = 0;
    
    for (const line of lines) {
      if (!line.includes('|')) continue;
      
      const upperLine = line.toUpperCase();
      // Skip separator lines or lines containing header keywords
      if (line.includes('---') || 
          upperLine.includes('DATE') || 
          upperLine.includes('তারিখ') || 
          upperLine.includes('C.W') || 
          upperLine.includes('H.W') ||
          upperLine.includes('শ্রেণির কাজ') ||
          upperLine.includes('বাড়ির কাজ')) {
        continue;
      }
      
      // Split by pipe and filter out empty cells at the start/end if they are just because of leading/trailing pipes
      let parts = line.split('|').map(p => p.trim());
      
      // If there are leading/trailing pipes, the split will have empty strings at index 0 and/or last index
      if (parts[0] === '') {
        parts.shift();
      }
      if (parts[parts.length - 1] === '') {
        parts.pop();
      }
      
      if (parts.length >= 3) {
        const date = parts[0];
        const cw = parts[1];
        const hw = parts[2];
        
        if (date && cw && hw) {
          days.push({ date, cw, hw, index: idx++ });
        }
      }
    }
    return days;
  };

  const parsedDays = parseTableToDays(editableContent);

  // Sync state back to local storage
  const updateCustomization = (date: string, field: keyof DayCustomization, value: any) => {
    const current = customizations[date] || {
      status: 'planned',
      color: 'emerald',
      teacherNotes: '',
      cwChecked: false,
      hwChecked: false
    };
    
    const updated = { ...current, [field]: value };
    const newCustomizations = { ...customizations, [date]: updated };
    setCustomizations(newCustomizations);
    localStorage.setItem('madrasah_map_customizations', JSON.stringify(newCustomizations));
  };

  const handleRegenRow = async (date: string, currentCw: string, currentHw: string) => {
    if (!onRegenerateDay || isRegenerating) return;
    
    setIsRegenerating(date);
    try {
      const { cw, hw } = await onRegenerateDay(date, `CW: ${currentCw}, HW: ${currentHw}`);
      
      const rows = editableContent.split('\n');
      const updatedRows = rows.map(row => {
        if (row.includes(date)) {
          const parts = row.split('|');
          if (parts.length >= 4) {
              parts[2] = ` ${cw} `;
              parts[3] = ` ${hw} `;
              return parts.join('|');
          }
        }
        return row;
      });
      
      setEditableContent(updatedRows.join('\n'));
    } catch (error) {
      console.error("Regeneration failed", error);
    } finally {
      setIsRegenerating(null);
    }
  };

  // Editing logic for C.W / H.W directly in Diary/Map views
  const startEditing = (day: RoutineDay) => {
    setEditingDate(day.date);
    setEditCw(day.cw);
    setEditHw(day.hw);
  };

  const saveEditing = () => {
    if (!editingDate) return;
    
    const rows = editableContent.split('\n');
    const updatedRows = rows.map(row => {
      if (row.includes(editingDate)) {
        const parts = row.split('|');
        if (parts.length >= 4) {
            parts[2] = ` ${editCw} `;
            parts[3] = ` ${editHw} `;
            return parts.join('|');
        }
      }
      return row;
    });
    
    setEditableContent(updatedRows.join('\n'));
    setEditingDate(null);
  };

  // Helper colors for Roadmap Map
  const colorSchemes = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      badge: 'bg-emerald-600',
      glow: 'shadow-emerald-200',
      darkText: 'text-emerald-900',
      line: 'bg-emerald-300'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      badge: 'bg-blue-600',
      glow: 'shadow-blue-200',
      darkText: 'text-blue-900',
      line: 'bg-blue-300'
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      badge: 'bg-amber-600',
      glow: 'shadow-amber-200',
      darkText: 'text-amber-900',
      line: 'bg-amber-300'
    },
    rose: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      badge: 'bg-rose-600',
      glow: 'shadow-rose-200',
      darkText: 'text-rose-900',
      line: 'bg-rose-300'
    }
  };

  // Render content based on active tab
  return (
    <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-700">
      
      {/* Dynamic Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0 border-b border-emerald-900/10 gap-4">
        <div className="flex items-center text-white">
          <div className="p-2.5 bg-white/10 rounded-xl mr-3">
            <BookCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-lg tracking-tight">পাঠ পরিকল্পনা ও রুটিন হাব</h3>
            <p className="text-emerald-100 text-xs font-semibold">আপনার পরিকল্পনা কাস্টমাইজ ও ব্যবস্থাপনা করুন</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button 
            onClick={handlePrint} 
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all duration-300" 
            title="প্রিন্ট করুন"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button 
            onClick={handleCopy} 
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all duration-300"
            title="কপি করুন"
          >
            {copied ? <Check className="w-5 h-5 text-emerald-300" /> : <Copy className="w-5 h-5" />}
          </button>
          <button 
            onClick={onReset} 
            className="bg-white text-emerald-900 px-5 py-2.5 rounded-xl text-xs font-black hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" /> নতুন তৈরি করুন
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-100 bg-slate-50/50 p-2 flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('table')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-sm font-black transition-all ${
            activeTab === 'table' 
              ? 'bg-white text-emerald-700 shadow-sm border border-slate-100' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>রুটিন টেবিল</span>
        </button>

        <button
          onClick={() => setActiveTab('diary')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-sm font-black transition-all ${
            activeTab === 'diary' 
              ? 'bg-white text-emerald-700 shadow-sm border border-slate-100' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>দৈনিক ডায়েরি</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-sm font-black transition-all ${
            activeTab === 'map' 
              ? 'bg-white text-emerald-700 shadow-sm border border-slate-100' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Map className="w-4 h-4 text-emerald-600" />
          <span>ইন্টারেক্টিভ রোডম্যাপ (Map)</span>
        </button>
      </div>
      
      {/* Main Content Pane */}
      <div className="p-4 md:p-8 bg-slate-50/30 flex-1 min-h-[500px]">
        
        {/* VIEW 1: ACADEMIC TABLE */}
        {activeTab === 'table' && (
          <div className="animate-in fade-in duration-300">
            <div className="mb-4 flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span>একাডেমিক রুটিন টেবিল</span>
              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">স্বয়ংক্রিয় লেআউট</span>
            </div>
            
            <div id="printable-content" className="lesson-table-container overflow-x-auto rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-100 bg-white">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw]}
                components={{
                  table: ({node, ...props}) => <table className="w-full border-collapse text-left" {...props} />,
                  thead: ({node, ...props}) => <thead className="bg-emerald-50/50 border-b-2 border-emerald-600/20" {...props} />,
                  th: ({node, ...props}) => {
                    const text = String(props.children);
                    const isAction = text.toLowerCase().includes('action') || text.includes('অ্যাকশন') || text.toLowerCase().includes('regenerate');
                    return <th className={`text-slate-700 border-b border-slate-200 px-6 py-4 text-xs font-black text-center uppercase tracking-wider ${isAction ? 'no-print w-20' : ''}`} {...props} />;
                  },
                  tr: ({node, ...props}) => <tr className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0" {...props} />,
                  td: ({node, ...props}) => {
                    const text = String(props.children);
                    const isSpecial = isSpecialText(text);
                    const isDayOnly = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'].includes(text.trim());
                    const isRegenMarker = text.includes('[REGENERATE]');
                    
                    if (isRegenMarker) {
                      const rowElement = (node as any)?.position?.start?.line;
                      let rowDate = '';
                      let currentCwVal = '';
                      let currentHwVal = '';

                      if (rowElement) {
                        const rows = editableContent.split('\n');
                        const lineText = rows[rowElement - 1];
                        if (lineText) {
                          const dateMatch = lineText.match(/(\d{2}-\d{2}-\d{2})/) || lineText.match(/(\d{4}-\d{2}-\d{2})/);
                          rowDate = dateMatch ? dateMatch[0] : '';
                          const parts = lineText.split('|');
                          if (parts.length >= 4) {
                            currentCwVal = parts[2].trim();
                            currentHwVal = parts[3].trim();
                          }
                        }
                      }

                      const isThisRowRegenerating = !!isRegenerating && !!rowDate && isRegenerating === rowDate;

                      return (
                        <td className="px-6 py-4 text-center align-middle no-print">
                          <button 
                            type="button"
                            onClick={() => {
                              if (rowDate && currentCwVal && currentHwVal) {
                                handleRegenRow(rowDate, currentCwVal, currentHwVal);
                              }
                            }}
                            disabled={!!isRegenerating}
                            className={`p-2 rounded-xl transition-all ${
                              isThisRowRegenerating 
                                ? 'text-emerald-600 bg-emerald-50 border border-emerald-100 scale-105' 
                                : isRegenerating 
                                  ? 'text-gray-300 border border-slate-100 bg-slate-50 cursor-not-allowed opacity-50' 
                                  : 'text-emerald-600 hover:bg-emerald-50 hover:scale-105 active:scale-95 border border-emerald-100 shadow-sm bg-white'
                            }`}
                            title="এই দিনের কাজ পরিবর্তন করুন"
                          >
                            {isThisRowRegenerating ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <RotateCcw className="w-4.5 h-4.5" />}
                          </button>
                        </td>
                      );
                    }

                    return (
                      <td 
                        className={`px-6 py-5 text-[15px] font-bold text-center align-middle border-r border-slate-100 last:border-0 ${isSpecial ? 'text-rose-600 font-black bg-rose-50/20' : 'text-slate-700'} ${isDayOnly ? 'bg-emerald-500/10 text-emerald-800' : ''}`} 
                        {...props} 
                      />
                    );
                  },
                }}
              >
                {editableContent}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* VIEW 2: DAILY DIARY */}
        {activeTab === 'diary' && (
          <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
            {parsedDays.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-bold">কোনো রুটিন ডেটা খুঁজে পাওয়া যায়নি।</p>
              </div>
            ) : (
              <div>
                {/* Diary book mockup wrapper */}
                <div className="bg-[#fdfbf7] rounded-3xl shadow-xl border border-amber-900/10 p-6 md:p-10 relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
                  {/* Spiral binding mockup */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-full flex flex-col justify-around py-4 pointer-events-none opacity-20">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="w-5 h-2 bg-slate-800 rounded-full shadow-inner" />
                    ))}
                  </div>

                  {/* Ribbon header */}
                  <div className="border-b-2 border-emerald-800/20 pb-4 mb-6 flex justify-between items-center">
                    <span className="text-xs font-black text-emerald-800 tracking-widest uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50">
                      মাদরাসাতুস সুন্নাহ • দৈনিক পাঠ ডায়েরি
                    </span>
                    <span className="text-xs text-slate-400 font-bold">পৃষ্ঠা: {currentDiaryPage + 1}/{parsedDays.length}</span>
                  </div>

                  {/* Active Diary Page Content */}
                  {(() => {
                    const activeDay = parsedDays[currentDiaryPage];
                    const activeCust = customizations[activeDay.date] || {
                      status: 'planned',
                      color: 'emerald',
                      teacherNotes: '',
                      cwChecked: false,
                      hwChecked: false
                    };

                    const isEditing = editingDate === activeDay.date;

                    return (
                      <div className="space-y-6">
                        {/* Stamp Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f8f5ed] p-4 rounded-2xl border border-amber-900/5">
                          <div className="flex items-center space-x-3">
                            <div className="w-11 h-11 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md">
                              {currentDiaryPage + 1}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-800">তারিখ ও বার</h4>
                              <p className="text-xs font-bold text-slate-500">{activeDay.date}</p>
                            </div>
                          </div>
                          
                          {/* Quick edit button */}
                          <div className="flex gap-2">
                            {isEditing ? (
                              <button
                                onClick={saveEditing}
                                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>সংরক্ষণ করুন</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => startEditing(activeDay)}
                                className="flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>সম্পাদনা</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Page Lines (C.W) */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-dashed border-amber-900/15 pb-1">
                            <label className="text-xs font-black text-emerald-800 tracking-wider flex items-center">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
                              শ্রেণির কাজ (Class Work)
                            </label>
                            <input
                              type="checkbox"
                              checked={activeCust.cwChecked}
                              onChange={(e) => updateCustomization(activeDay.date, 'cwChecked', e.target.checked)}
                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                            />
                          </div>
                          
                          {isEditing ? (
                            <textarea
                              value={editCw}
                              onChange={(e) => setEditCw(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[15px] font-medium leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none"
                              rows={3}
                            />
                          ) : (
                            <p className="text-[16px] font-bold text-slate-700 bg-white/40 p-3 rounded-xl min-h-[60px] leading-relaxed relative pl-4 border-l-4 border-emerald-400">
                              {activeDay.cw}
                            </p>
                          )}
                        </div>

                        {/* Page Lines (H.W) */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-dashed border-amber-900/15 pb-1">
                            <label className="text-xs font-black text-emerald-800 tracking-wider flex items-center">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
                              বাড়ির কাজ (Home Work)
                            </label>
                            <input
                              type="checkbox"
                              checked={activeCust.hwChecked}
                              onChange={(e) => updateCustomization(activeDay.date, 'hwChecked', e.target.checked)}
                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                            />
                          </div>
                          
                          {isEditing ? (
                            <textarea
                              value={editHw}
                              onChange={(e) => setEditHw(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[15px] font-medium leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none"
                              rows={3}
                            />
                          ) : (
                            <p className="text-[16px] font-bold text-slate-700 bg-white/40 p-3 rounded-xl min-h-[60px] leading-relaxed relative pl-4 border-l-4 border-amber-400">
                              {activeDay.hw}
                            </p>
                          )}
                        </div>

                        {/* Custom Teacher Note section inside Diary */}
                        <div className="space-y-2 bg-[#f4ebd9]/30 p-4 rounded-2xl border border-amber-900/5">
                          <label className="text-xs font-black text-slate-600 flex items-center">
                            <Edit2 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                            শিক্ষকের ব্যক্তিগত মন্তব্য ও ডায়েরি নোট
                          </label>
                          <textarea
                            value={activeCust.teacherNotes}
                            onChange={(e) => updateCustomization(activeDay.date, 'teacherNotes', e.target.value)}
                            placeholder="এই দিনটির জন্য বিশেষ কোনো নির্দেশনা থাকলে এখানে লিখে রাখুন..."
                            className="w-full bg-transparent border-b border-amber-900/10 py-1 text-sm font-semibold text-slate-800 placeholder:text-slate-400/80 focus:border-emerald-600 focus:ring-0 outline-none resize-none"
                            rows={2}
                          />
                        </div>

                        {/* Traditional Signature Block */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-amber-900/15">
                          <div className="text-center">
                            <div className="h-8 border-b border-amber-900/10 flex items-end justify-center pb-1">
                              {activeCust.cwChecked && activeCust.hwChecked ? (
                                <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">অনুমোদিত</span>
                              ) : null}
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 block">শিক্ষকের স্বাক্ষর</span>
                          </div>
                          <div className="text-center">
                            <div className="h-8 border-b border-amber-900/10" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 block">অভিভাবকের মন্তব্য ও সই</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Page Navigation Controls */}
                <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-2xl border border-slate-200/55 shadow-sm">
                  <button
                    onClick={() => setCurrentDiaryPage(p => Math.max(0, p - 1))}
                    disabled={currentDiaryPage === 0}
                    className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black border border-slate-200 transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>পূর্ববর্তী</span>
                  </button>

                  <div className="flex items-center space-x-1 font-mono text-sm font-black text-slate-500">
                    <span>{currentDiaryPage + 1}</span>
                    <span className="opacity-40">/</span>
                    <span>{parsedDays.length}</span>
                  </div>

                  <button
                    onClick={() => setCurrentDiaryPage(p => Math.min(parsedDays.length - 1, p + 1))}
                    disabled={currentDiaryPage === parsedDays.length - 1}
                    className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black border border-slate-200 transition-all active:scale-95"
                  >
                    <span>পরবর্তী</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: INTERACTIVE LEARNING MAP (ROADMAP) */}
        {activeTab === 'map' && (
          <div className="animate-in fade-in duration-300">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
              <div>
                <h4 className="text-sm font-black text-slate-800">ইন্টারেক্টিভ লার্নিং রোডম্যাপ (Map)</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">প্রতিটি দিনের ধাপ কাস্টমাইজ করুন এবং অগ্রগতি ট্র্যাকিং করুন</p>
              </div>
              <div className="flex items-center space-x-2 text-xs font-black bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl">
                <span>সম্পন্ন: {parsedDays.filter(d => (customizations[d.date]?.status === 'completed')).length} / {parsedDays.length} দিন</span>
              </div>
            </div>

            {parsedDays.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <Map className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-bold">কোনো রুটিন ডেটা খুঁজে পাওয়া যায়নি।</p>
              </div>
            ) : (
              <div className="relative pl-6 sm:pl-8 space-y-12 before:absolute before:top-4 before:left-3 before:sm:left-4 before:bottom-4 before:w-1 before:bg-slate-200/80">
                {parsedDays.map((day, idx) => {
                  const cust = customizations[day.date] || {
                    status: 'planned',
                    color: 'emerald',
                    teacherNotes: '',
                    cwChecked: false,
                    hwChecked: false
                  };

                  const isEditing = editingDate === day.date;
                  const scheme = colorSchemes[cust.color || 'emerald'] || colorSchemes.emerald;

                  return (
                    <div key={day.date} className="relative group transition-all duration-300">
                      
                      {/* Timeline Dot with Interactive Status */}
                      <button
                        onClick={() => {
                          const nextStatus = 
                            cust.status === 'planned' ? 'current' :
                            cust.status === 'current' ? 'completed' : 'planned';
                          updateCustomization(day.date, 'status', nextStatus);
                        }}
                        className={`absolute -left-[30px] sm:-left-[34px] top-1.5 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all z-10 border-4 border-white shadow-md active:scale-90 ${
                          cust.status === 'completed' ? 'bg-emerald-600 text-white' :
                          cust.status === 'current' ? 'bg-amber-500 text-white animate-pulse' :
                          'bg-slate-300 text-slate-600 hover:bg-slate-400'
                        }`}
                        title="অগ্রগতি পরিবর্তন করতে ক্লিক করুন"
                      >
                        {cust.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                        {cust.status === 'current' && <PlayCircle className="w-4 h-4" />}
                        {cust.status === 'planned' && <Circle className="w-4 h-4 fill-white" />}
                      </button>

                      {/* Bento Card representing each node */}
                      <div className={`rounded-3xl border-2 p-6 transition-all duration-500 bg-white hover:shadow-xl ${scheme.border} shadow-lg ${scheme.glow}/10`}>
                        
                        {/* Day Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                          <div className="flex items-center space-x-3">
                            <span className={`text-xs font-black uppercase tracking-wider text-white px-3 py-1 rounded-full ${scheme.badge}`}>
                              ধাপ {idx + 1}
                            </span>
                            <div>
                              <h4 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                                {day.date} 
                              </h4>
                              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">লার্নিং নোড</p>
                            </div>
                          </div>

                          {/* Quick Controls: Status, Color picker & Edit */}
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Color Selector */}
                            <div className="flex items-center space-x-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                              <Palette className="w-3.5 h-3.5 text-slate-500 mr-1" />
                              {(['emerald', 'blue', 'amber', 'rose'] as const).map(color => (
                                <button
                                  key={color}
                                  onClick={() => updateCustomization(day.date, 'color', color)}
                                  className={`w-4.5 h-4.5 rounded-full border-2 transition-transform hover:scale-110 ${
                                    color === 'emerald' ? 'bg-emerald-500' :
                                    color === 'blue' ? 'bg-blue-500' :
                                    color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                                  } ${cust.color === color ? 'border-white ring-2 ring-emerald-600 scale-105' : 'border-transparent'}`}
                                  title={`${color} থিম কাস্টমাইজ করুন`}
                                />
                              ))}
                            </div>

                            {/* Editing Button */}
                            {isEditing ? (
                              <button
                                onClick={saveEditing}
                                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>সংরক্ষণ</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => startEditing(day)}
                                className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>সম্পাদনা</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Day Card content */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* Class work card */}
                          <div className={`p-4 rounded-2xl border ${scheme.border} ${scheme.bg}/40 flex flex-col justify-between`}>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[11px] font-black uppercase tracking-wider ${scheme.text}`}>শ্রেণির কাজ (C.W)</span>
                                <input
                                  type="checkbox"
                                  checked={cust.cwChecked}
                                  onChange={(e) => updateCustomization(day.date, 'cwChecked', e.target.checked)}
                                  className="w-4.5 h-4.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                />
                              </div>
                              {isEditing ? (
                                <textarea
                                  value={editCw}
                                  onChange={(e) => setEditCw(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                                  rows={2}
                                />
                              ) : (
                                <p className="text-sm font-bold text-slate-700 leading-relaxed">{day.cw}</p>
                              )}
                            </div>
                          </div>

                          {/* Home work card */}
                          <div className={`p-4 rounded-2xl border ${scheme.border} ${scheme.bg}/40 flex flex-col justify-between`}>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[11px] font-black uppercase tracking-wider ${scheme.text}`}>বাড়ির কাজ (H.W)</span>
                                <input
                                  type="checkbox"
                                  checked={cust.hwChecked}
                                  onChange={(e) => updateCustomization(day.date, 'hwChecked', e.target.checked)}
                                  className="w-4.5 h-4.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                />
                              </div>
                              {isEditing ? (
                                <textarea
                                  value={editHw}
                                  onChange={(e) => setEditHw(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                                  rows={2}
                                />
                              ) : (
                                <p className="text-sm font-bold text-slate-700 leading-relaxed">{day.hw}</p>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Visual Progress bar inside Node */}
                        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                          {/* Text Comment Edit */}
                          <div className="flex-grow flex items-center space-x-2 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/50">
                            <PenTool className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <input
                              type="text"
                              value={cust.teacherNotes}
                              onChange={(e) => updateCustomization(day.date, 'teacherNotes', e.target.value)}
                              placeholder="এই নোডের জন্য কাস্টম শিক্ষক নোট যোগ করুন..."
                              className="bg-transparent border-none text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-0 outline-none w-full"
                            />
                          </div>

                          <span className={`text-[11px] font-black uppercase tracking-wider self-end sm:self-auto px-3 py-1 rounded-full ${
                            cust.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                            cust.status === 'current' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            অবস্থা: {
                              cust.status === 'completed' ? 'সম্পন্ন' :
                              cust.status === 'current' ? 'চলমান' : 'পরিকল্পিত'
                            }
                          </span>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
      
      <style>{`
        .lesson-table-container table {
          table-layout: fixed;
          width: 100%;
        }
        .lesson-table-container th:first-child, 
        .lesson-table-container td:first-child {
          width: 130px;
        }
        .lesson-table-container th:last-child, 
        .lesson-table-container td:last-child {
          width: 90px;
        }
        @media print {
          .no-print {
            display: none !important;
          }
        }
        .animate-spin-hover:hover {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PlanDisplay;
