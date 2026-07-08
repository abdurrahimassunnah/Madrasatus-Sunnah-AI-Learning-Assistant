
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LessonForm from './components/LessonForm';
import PlanDisplay from './components/PlanDisplay';
import { LessonPlanRequest, GenerationState, HistoryItem } from './types';
import { generateLessonPlanStream, regenerateDayContent } from './services/geminiService';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentRequest, setCurrentRequest] = useState<LessonPlanRequest | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    progress: 0,
    statusMessage: '',
    error: null,
    result: null,
  });

  useEffect(() => {
    const savedHistory = localStorage.getItem('lessonPlanHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lessonPlanHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (state.result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.result]);

  const handleGenerationRequest = async (request: LessonPlanRequest) => {
    setCurrentRequest(request);
    setState({ 
      isLoading: true, 
      progress: 0, 
      statusMessage: 'প্রস্তুতি চলছে...', 
      error: null, 
      result: null 
    });
    
    try {
      const plan = await generateLessonPlanStream(request, (progress, message) => {
        setState(prev => ({ ...prev, progress, statusMessage: message }));
      });
      
      const newItem: HistoryItem = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
        timestamp: Date.now(),
        gradeLevel: request.gradeLevel,
        duration: request.duration,
        previewText: request.additionalContext.substring(0, 50) || `পরিকল্পনা - ${request.gradeLevel} (${request.duration} দিন)`,
        fullContent: plan,
        requestContext: request
      };

      setHistory(prev => [newItem, ...prev].slice(0, 10));
      
      setState({
        isLoading: false,
        progress: 100,
        statusMessage: 'সম্পন্ন!',
        error: null,
        result: plan,
      });
    } catch (error: any) {
      setState({
        isLoading: false,
        progress: 0,
        statusMessage: '',
        error: error.message || "একটি ত্রুটি ঘটেছে",
        result: null,
      });
    }
  };

  const handleDayRegenerate = async (date: string, previousContent: string) => {
    if (!currentRequest) throw new Error("No active request context found.");
    return await regenerateDayContent(currentRequest, date, previousContent);
  };

  const handleReset = () => {
    setState({ isLoading: false, progress: 0, statusMessage: '', error: null, result: null });
    setCurrentRequest(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHistorySelect = (item: HistoryItem) => {
    if (item.requestContext) {
      setCurrentRequest(item.requestContext);
    } else {
      setCurrentRequest({
        file: null,
        fileData: null,
        mimeType: '',
        duration: item.duration,
        startDate: new Date(item.timestamp).toISOString().split('T')[0],
        startPage: 60,
        endPage: 68,
        gradeLevel: item.gradeLevel,
        additionalContext: item.previewText,
        holidays: '',
        weeks: 1
      });
    }
    setState({
      isLoading: false,
      progress: 100,
      statusMessage: '',
      error: null,
      result: item.fullContent
    });
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="flex h-screen bg-[#fcfdfd] font-sans overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        history={history}
        onSelectHistory={handleHistorySelect}
        onDeleteHistory={handleDeleteHistory}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden w-full transition-all duration-300 z-10">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-7xl mx-auto px-4 py-12 md:px-6 lg:px-10 flex flex-col min-h-full">
            
            <div className={`transition-all duration-700 ${state.result ? 'opacity-50 scale-95 origin-top blur-[1px]' : 'opacity-100 scale-100'}`}>
              <div className="text-center mb-16 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <h2 className="text-5xl font-black text-gray-900 sm:text-6xl mb-6 tracking-tight leading-[1.1]">
                  মাদরাসার জন্য স্মার্ট <br/>
                  <span className="text-emerald-600">এআই পাঠ পরিকল্পনা</span>
                </h2>
                <p className="text-xl text-gray-500 font-medium max-w-lg mx-auto">
                  ৫-ম দিন সবার আগে - এমনভাবে সাজানো আপনার বিশ্বস্ত এআই সহায়ক।
                </p>
              </div>
              
              <div className="w-full max-w-3xl mx-auto animate-in zoom-in-95 duration-700 delay-200">
                <LessonForm 
                  onSubmit={handleGenerationRequest} 
                  isLoading={state.isLoading} 
                  progress={state.progress}
                  statusMessage={state.statusMessage}
                />
                
                {state.error && (
                  <div className="mt-10 rounded-[2rem] bg-rose-50 p-6 border border-rose-100 shadow-xl shadow-rose-900/5 max-w-2xl mx-auto animate-bounce-short">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-7 w-7 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-base font-black text-rose-900 uppercase tracking-wider">ত্রুটি সনাক্ত হয়েছে</h3>
                        <p className="mt-1 text-[15px] font-medium text-rose-700/80">{state.error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {state.result && (
              <div ref={resultRef} className="mt-20 mb-20 w-full max-w-5xl mx-auto scroll-mt-10">
                <div className="mb-8 flex items-center justify-between">
                   <div className="h-px bg-slate-200 flex-grow mr-6"></div>
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] flex-shrink-0">নিচে ফলাফল দেখুন</span>
                   <div className="h-px bg-slate-200 flex-grow ml-6"></div>
                </div>
                <PlanDisplay 
                  content={state.result} 
                  onReset={handleReset} 
                  onRegenerateDay={handleDayRegenerate}
                />
              </div>
            )}
            
            <footer className="mt-auto py-12 text-center border-t border-gray-100/50">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">© {new Date().getFullYear()} মাদরাসাতুস সুন্নাহ এআই</p>
            </footer>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-short { animation: bounce-short 2s infinite; }
      `}</style>
    </div>
  );
};

export default App;
