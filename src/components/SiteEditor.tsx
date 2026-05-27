import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Search, Globe, Save, Check, RefreshCw, AlertCircle, Edit3, ChevronUp } from 'lucide-react';
import { useLanguage, Language } from '../context/LanguageContext';

export default function SiteEditor() {
  const { 
    isEditMode, 
    setIsEditMode, 
    updateTranslation, 
    getRawTranslation, 
    allKeys, 
    language 
  } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editorValues, setEditorValues] = useState<Record<Language, string>>({
    en: '',
    fr: '',
    ar: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Categories helper to easily group keys for editing
  const categories = [
    { label: 'All Elements', filter: '' },
    { label: 'Hero Section', filter: 'hero.' },
    { label: 'Navigation Bar', filter: 'nav.' },
    { label: 'Stats Banner', filter: 'stats.' },
    { label: 'Course Catalog', filter: 'courses.' },
    { label: 'Dashboard & Profile', filter: 'dashboard.' },
    { label: 'AI Video Mentor', filter: 'ai.' },
    { label: 'Support Page', filter: 'support.' }
  ];
  const [activeCategory, setActiveCategory] = useState('All Elements');

  // Sync state with selected translation key
  useEffect(() => {
    if (selectedKey) {
      setEditorValues({
        en: getRawTranslation('en', selectedKey),
        fr: getRawTranslation('fr', selectedKey),
        ar: getRawTranslation('ar', selectedKey)
      });
      setSaveStatus('idle');
    }
  }, [selectedKey, getRawTranslation]);

  // Handle active value changes directly to simulate real-time visual output
  const handleValueChange = (lang: Language, value: string) => {
    setEditorValues(prev => ({ ...prev, [lang]: value }));
    updateTranslation(lang, selectedKey!, value);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 1200);
  };

  const filteredKeys = allKeys.filter(key => {
    const matchesSearch = key.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          getRawTranslation('en', key).toLowerCase().includes(searchTerm.toLowerCase());
    const cat = categories.find(c => c.label === activeCategory);
    const matchesCat = cat?.filter ? key.startsWith(cat.filter) : true;
    return matchesSearch && matchesCat;
  });

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-4 bg-purple-600 text-white rounded-2xl shadow-xl shadow-purple-600/30 font-black cursor-pointer hover:bg-purple-500 transition-all border border-purple-500/30 group"
      >
        <Settings className="w-5 h-5 animate-spin-slow group-hover:rotate-45 transition-transform" />
        <span className="text-sm tracking-tight">Live Site Editor</span>
        {isEditMode && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        )}
      </motion.button>

      {/* Editor Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 155 }}
            className="fixed inset-x-0 bottom-0 h-[60vh] md:h-[50vh] bg-zinc-950 border-t border-purple-900/40 z-50 flex flex-col shadow-2xl overflow-hidden glass-surface-dark"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-radial rounded-xl">
                  <Edit3 className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white uppercase leading-none mb-1">Live Site Customs Studio</h3>
                  <p className="text-xs text-purple-400 font-mono">Select any element to edit translation values in real time</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Visual indicator of custom layout */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20 text-xs font-mono text-green-400">
                  <Check className="w-3.5 h-3.5" />
                  <span>Interactive Sync Live</span>
                </div>

                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-grow flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/5 overflow-hidden">
              
              {/* Left Column: Keys Selection */}
              <div className="w-full md:w-[35%] flex flex-col h-1/2 md:h-full overflow-hidden">
                {/* Tools Filters */}
                <div className="p-4 border-b border-white/5 flex flex-col gap-3 shrink-0">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search translation element keys or text..."
                      className="w-full bg-zinc-900 border border-purple-900/20 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  {/* Categories Pills */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-purple-900/30 text-xs whitespace-nowrap">
                    {categories.map((c) => (
                      <button
                        key={c.label}
                        onClick={() => setActiveCategory(c.label)}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                          activeCategory === c.label
                            ? 'bg-purple-600 text-white'
                            : 'bg-zinc-900 text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keys List */}
                <div className="flex-grow overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-purple-900/30">
                  {filteredKeys.length > 0 ? (
                    filteredKeys.map((key) => {
                      const isActive = selectedKey === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedKey(key)}
                          className={`w-full text-left p-3 rounded-xl transition-all border ${
                            isActive 
                              ? 'bg-purple-600/10 border-purple-500/40 text-white' 
                              : 'bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
                          }`}
                        >
                          <div className="text-xs font-mono font-bold tracking-tight text-purple-400 mb-1">{key}</div>
                          <div className="text-sm truncate font-medium">{getRawTranslation(language, key) || 'Empty string (click to edit)'}</div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-10">
                      <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                      <span className="text-sm text-gray-500 font-mono">No elements matching filters</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Values Editor inputs */}
              <div className="flex-grow flex flex-col h-1/2 md:h-full p-6 overflow-y-auto bg-black/40">
                {selectedKey ? (
                  <div className="space-y-5 h-full flex flex-col">
                    {/* Top title info */}
                    <div className="flex justify-between items-center bg-zinc-900/30 p-4 border border-purple-900/10 rounded-2xl shrink-0">
                      <div>
                        <span className="text-micro font-mono text-purple-400">CURRENT SELECTED KEY</span>
                        <h4 className="text-base font-black tracking-tight text-white mb-0.5">{selectedKey}</h4>
                        <p className="text-xs text-gray-400">Original value fallback: <span className="text-zinc-500">{getRawTranslation('en', selectedKey)}</span></p>
                      </div>

                      {saveStatus === 'success' && (
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-mono"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Real-time Applied</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Editor Inputs Grid */}
                    <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto">
                      {/* English Editor */}
                      <div className="flex flex-col gap-2 p-4 bg-zinc-900/40 border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-1">
                          <Globe className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-black uppercase text-gray-400">English (EN)</span>
                        </div>
                        <textarea
                          value={editorValues.en}
                          onChange={(e) => handleValueChange('en', e.target.value)}
                          placeholder="English contents..."
                          rows={4}
                          className="w-full flex-grow bg-zinc-950 border border-purple-900/20 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-purple-500/40 font-medium resize-none"
                        />
                      </div>

                      {/* French Editor */}
                      <div className="flex flex-col gap-2 p-4 bg-zinc-900/40 border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-1">
                          <Globe className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-black uppercase text-gray-400">French (FR)</span>
                        </div>
                        <textarea
                          value={editorValues.fr}
                          onChange={(e) => handleValueChange('fr', e.target.value)}
                          placeholder="French contents..."
                          rows={4}
                          className="w-full flex-grow bg-zinc-950 border border-purple-900/20 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-purple-500/40 font-medium resize-none"
                        />
                      </div>

                      {/* Arabic Editor */}
                      <div className="flex flex-col gap-2 p-4 bg-zinc-900/40 border border-white/5 rounded-2xl" dir="rtl">
                        <div className="flex items-center gap-2 mb-1">
                          <Globe className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-black uppercase text-gray-400">Arabic (AR)</span>
                        </div>
                        <textarea
                          value={editorValues.ar}
                          onChange={(e) => handleValueChange('ar', e.target.value)}
                          placeholder="المحتوى باللغة العربية..."
                          rows={4}
                          className="w-full flex-grow bg-zinc-950 border border-purple-900/20 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-purple-500/40 font-medium resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-10 select-none">
                    <Edit3 className="w-16 h-16 text-purple-900/40 mb-4 animate-bounce" style={{ animationDuration: '3s' }} />
                    <h3 className="text-lg font-black text-white/40 uppercase tracking-tighter">No Element Selected</h3>
                    <p className="text-sm text-gray-500 max-w-sm mt-1">Select any text element from the list on the left to start editing and making your entire site dynamic!</p>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
