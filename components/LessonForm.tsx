
import { Upload, Calendar, Layers, AlertCircle, X, FileType, Loader2, Sparkles, ChevronRight, PenTool, Hash, Clock } from 'lucide-react';
import React, { useState, useCallback, useRef } from 'react';
import { GradeLevel, LessonPlanRequest } from '../types';
import FilePreview from './FilePreview';

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200; // Optimal size for legibility and payload weight
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Convert to quality 0.75 jpeg
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = (err) => {
      console.error("Failed to load PDF.js from CDN", err);
      reject(new Error("পিডিএফ রিডার লোড করা যায়নি। অনুগ্রহ করে ইন্টারনেট সংযোগ পরীক্ষা করুন।"));
    };
    document.head.appendChild(script);
  });
};

const extractTextFromPdf = async (
  file: File, 
  startPage: number | string,
  endPage: number | string
): Promise<string> => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  const numPages = pdf.numPages;
  
  const sPage = parseInt(String(startPage), 10) || 1;
  const ePage = parseInt(String(endPage), 10) || numPages;
  
  // Calculate exact bounds
  const start = Math.max(1, Math.min(sPage, numPages));
  const end = Math.max(start, Math.min(ePage, numPages));
  
  for (let i = start; i <= end; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    fullText += pageText + '\n';
  }
  
  return fullText;
};

const LessonForm: React.FC<LessonFormProps> = ({ onSubmit, isLoading, progress, statusMessage }) => {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(5);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startPage, setStartPage] = useState<number | string>(1);
  const [endPage, setEndPage] = useState<number | string>(10);
  // Defaulting to Grade 5 (পঞ্চম শ্রেণি) as requested
  const [grade, setGrade] = useState<GradeLevel>(GradeLevel.Grade5);
  const [context, setContext] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReadingPdf, setIsReadingPdf] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file && !context.trim()) {
      setError("ফাইল আপলোড করুন অথবা সিলেবাস দিন।");
      return;
    }

    let fileData: string | null = null;
    let mimeType = '';
    let extractedText = '';

    if (file) {
      if (file.type === 'application/pdf' && file.size > 200 * 1024 * 1024) {
        setError("পিডিএফ ফাইলটি অনেক বড় (২০০ মেগাবাইটের বেশি)। অনুগ্রহ করে ২০০ মেগাবাইটের কম সাইজের পিডিএফ ব্যবহার করুন।");
        return;
      }

      try {
        if (file.type.startsWith('image/')) {
          fileData = await compressImage(file);
          mimeType = 'image/jpeg';
        } else if (file.type === 'application/pdf') {
          setIsReadingPdf(true);
          try {
            extractedText = await extractTextFromPdf(file, startPage, endPage);
            mimeType = 'application/pdf';

            if (!extractedText || extractedText.trim().length < 20) {
              if (file.size > 3.5 * 1024 * 1024) {
                setError("এটি একটি স্ক্যান করা পিডিএফ (ছবি দিয়ে তৈরি) এবং এর সাইজ অনেক বড়। স্ক্যান করা বড় পিডিএফ ফাইল থেকে সিলেবাস পড়া সম্ভব হচ্ছে না। অনুগ্রহ করে সিলেবাসের মূল অংশটি কপি করে সরাসরি নিচের 'অতিরিক্ত নির্দেশাবলী' বক্সে দিন অথবা ছোট পিডিএফ/ছবি আপলোড করুন।");
                return;
              } else {
                fileData = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = (err) => reject(err);
                  reader.readAsDataURL(file);
                });
              }
            }
          } catch (pdfErr: any) {
            console.error("PDF extraction error:", pdfErr);
            setError(pdfErr.message || "পিডিএফ ফাইলটি পড়া যায়নি। অনুগ্রহ করে সঠিক পিডিএফ আপলোড করুন।");
            return;
          } finally {
            setIsReadingPdf(false);
          }
        } else {
          fileData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          });
          mimeType = file.type;
        }
      } catch (err) {
        console.error("Error compressing/reading file:", err);
        setError("ফাইল প্রসেস করতে ত্রুটি হয়েছে। অনুগ্রহ করে অন্য ফাইল ব্যবহার করুন বা ম্যানুয়ালি লিখুন।");
        return;
      }
    }

    onSubmit({
      file, fileData, mimeType, extractedText,
      duration, startDate, startPage, endPage, gradeLevel: grade,
      additionalContext: context,
      holidays: '',
      weeks: 1 // legacy support
    });
  }, [file, duration, startDate, startPage, endPage, grade, context, onSubmit]);

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 md:p-12 transition-all relative overflow-hidden max-w-2xl mx-auto">
      <div className="transition-all duration-500">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest mb-5 border border-emerald-100/50">
            <Sparkles className="w-3.5 h-3.5" />
            <span>স্মার্ট শিক্ষা সহায়ক</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">নতুন রুটিন তৈরি করুন</h2>
          <p className="text-[15px] text-slate-500 mt-2 font-medium">পঞ্চম দিন আগে আসবে এমনভাবে রুটিন পান</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center text-rose-800 text-sm font-bold animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-rose-500" />
              {error}
            </div>
          )}

          {/* Upload Section */}
          <div 
            onClick={() => !isLoading && !isReadingPdf && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); if(!isLoading && !isReadingPdf) setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if(!isLoading && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
            className={`relative group border-2 border-dashed rounded-[2rem] p-10 transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
              isDragging ? 'border-emerald-500 bg-emerald-50 scale-[1.01]' : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-500/5'
            }`}
          >
            {!file ? (
              <>
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-[17px] font-black text-slate-900 mb-1">সিলেবাস ফাইল আপলোড করুন</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">PDF বা ইমেজ ড্র্যাগ করুন</p>
                <p className="text-[11px] text-slate-400">সর্বোচ্চ ২০০ মেগাবাইট (বড় পিডিএফ ফাইলের তথ্য ক্লায়েন্ট-সাইডে অত্যন্ত দ্রুত গতিতে বের করা হবে)</p>
              </>
            ) : (
              <div className="flex items-center space-x-5 w-full bg-white p-5 rounded-2xl shadow-sm border border-emerald-100">
                <div className="w-14 h-14 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-200/50">
                  <FileType className="w-7 h-7 text-white" />
                </div>
                <div className="text-left flex-grow overflow-hidden">
                  <p className="text-sm font-black truncate text-slate-900">{file.name}</p>
                  <FilePreview file={file} />
                </div>
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }} 
                  className="p-2.5 hover:bg-rose-50 rounded-full text-slate-300 hover:text-rose-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files && setFile(e.target.files[0])} accept=".pdf,image/*" />
          </div>

          {/* Primary Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1 flex items-center">
                <Layers className="w-3.5 h-3.5 mr-2 text-emerald-500" /> শ্রেণি
              </label>
              <select 
                value={grade} 
                onChange={(e) => setGrade(e.target.value as GradeLevel)} 
                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-[15px] font-bold text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
              >
                {Object.values(GradeLevel).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-2.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-2 text-emerald-500" /> শুরুর তারিখ
              </label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-[15px] font-bold text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all cursor-pointer shadow-sm" 
              />
            </div>
          </div>

          {/* Duration Selector */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1 flex items-center">
              <Clock className="w-3.5 h-3.5 mr-2 text-emerald-500" /> রুটিনের ব্যাপ্তি (দিন)
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 5].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`py-3 rounded-2xl text-sm font-black transition-all border-2 ${
                    duration === d 
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200' 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-emerald-200'
                  }`}
                >
                  {d} দিন
                </button>
              ))}
            </div>
          </div>

          {/* Page Range */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <label className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.15em] ml-1 flex items-center">
                <Hash className="w-3.5 h-3.5 mr-2" /> শুরুর পৃষ্ঠা
              </label>
              <input 
                type="number" 
                value={startPage} 
                onChange={(e) => setStartPage(e.target.value)} 
                className="w-full bg-white border-2 border-emerald-100 rounded-2xl px-5 py-4 text-[15px] font-black text-emerald-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm"
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.15em] ml-1 flex items-center">
                <Hash className="w-3.5 h-3.5 mr-2" /> শেষ পৃষ্ঠা
              </label>
              <input 
                type="number" 
                value={endPage} 
                onChange={(e) => setEndPage(e.target.value)} 
                className="w-full bg-white border-2 border-emerald-100 rounded-2xl px-5 py-4 text-[15px] font-black text-emerald-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Additional Context */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1 flex items-center">
              <PenTool className="w-3.5 h-3.5 mr-2 text-emerald-500" /> অতিরিক্ত নির্দেশাবলী
            </label>
            <textarea 
              value={context} onChange={(e) => setContext(e.target.value)} 
              className="w-full bg-white border border-slate-200 rounded-[2rem] px-7 py-6 text-[15px] font-medium text-slate-700 min-h-[140px] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none leading-relaxed placeholder:text-gray-300 shadow-sm"
              placeholder="পড়া, মুখস্থ করা বা লেখার বিশেষ নির্দেশাবলী এখানে দিন..."
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" disabled={isLoading || isReadingPdf}
            className={`w-full py-6 rounded-[1.75rem] text-white font-black text-xl shadow-2xl transition-all transform active:scale-[0.97] flex flex-col items-center justify-center relative overflow-hidden group ${
              isLoading || isReadingPdf ? 'bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-200'
            }`}
          >
            {isLoading || isReadingPdf ? (
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                  <span className="tracking-tight">
                    {isReadingPdf ? 'সিলেবাস পড়া হচ্ছে...' : 'রুটিন জেনারেট হচ্ছে...'}
                  </span>
                </div>
              </div>
            ) : (
              <span className="flex items-center tracking-tight">
                পাঠ পরিকল্পনা তৈরি করুন
                <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1.5 transition-transform" />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LessonForm;
