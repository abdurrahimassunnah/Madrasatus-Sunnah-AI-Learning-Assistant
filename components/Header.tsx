
import React from 'react';
import { BookOpen, Sparkles, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* Left Side: Menu Button */}
        <div className="flex-1 flex items-center">
          <button 
            onClick={onMenuClick}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors lg:hidden"
            aria-label="Open History"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Center: Brand Identity */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-600 p-2 rounded-xl shadow-md rotate-3 transition-transform hover:rotate-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <h1 className="text-xl font-bold font-sans text-gray-900 leading-tight">মাদরাসাতুস সুন্নাহ</h1>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">এআই শিক্ষা সহায়ক</span>
            </div>
          </div>
        </div>

        {/* Right Side: Badge */}
        <div className="flex-1 flex justify-end">
          <div className="hidden sm:flex items-center space-x-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Powered by AI</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
