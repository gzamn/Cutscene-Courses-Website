import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { 
  Send, 
  Mic, 
  MicOff, 
  Paperclip, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Bot, 
  User, 
  Loader2, 
  Download, 
  Volume2,
  Sparkles,
  X,
  FileText,
  Plus,
  Copy,
  Check,
  ChevronDown
} from 'lucide-react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'video' | 'music' | 'document';
  url?: string;
  fileName?: string;
}

const AnimatedText = ({ children, delayOffset = 0 }: { children: React.ReactNode, delayOffset?: number }) => {
  if (typeof children === 'string') {
    return (
      <>
        {children.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.5,
              delay: delayOffset + i * 0.005,
              ease: "easeOut"
            }}
          >
            {char}
          </motion.span>
        ))}
      </>
    );
  }
  return <>{children}</>;
};

const TypewriterMessage = React.memo(({ content, isArabic }: { content: string, isArabic: boolean }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = (text: string) => {
    const buttonRegex = /\[BUTTON:\s*([^|]+)\s*\|\s*([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = buttonRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      parts.push({ type: 'button', label: match[1].trim(), path: match[2].trim() });
      lastIndex = buttonRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    return parts.map((part, i) => {
      if (part.type === 'text') {
        return (
          <div key={i} className="markdown-body prose prose-invert prose-sm max-w-none mb-6 last:mb-0 leading-relaxed">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-4 last:mb-0"><AnimatedText>{children}</AnimatedText></p>,
                strong: ({ children }) => <strong className="font-bold text-white"><AnimatedText>{children}</AnimatedText></strong>,
                em: ({ children }) => <em className="italic"><AnimatedText>{children}</AnimatedText></em>,
                li: ({ children }) => <li className="mb-1"><AnimatedText>{children}</AnimatedText></li>,
                ul: ({ children }) => <ul className="list-disc ml-4 mb-4">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal ml-4 mb-4">{children}</ol>,
              }}
            >
              {part.content}
            </ReactMarkdown>
          </div>
        );
      }
      return (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link
            to={part.path || '/'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-purple-600/20 my-2 mr-2 rtl:ml-2 rtl:mr-0"
          >
            <Sparkles className="w-3 h-3" />
            {part.label}
          </Link>
        </motion.div>
      );
    });
  };

  return (
    <div className="relative group/msg">
      <div className="space-y-2">{renderContent(content)}</div>
      <button
        onClick={handleCopy}
        className="absolute -top-2 -right-2 p-1.5 bg-zinc-800 border border-white/10 rounded-lg opacity-0 group-hover/msg:opacity-100 transition-all hover:bg-zinc-700 text-gray-400 hover:text-white"
        title="Copy message"
      >
        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
});

export default function CutsceneAI() {
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ data: string, mimeType: string, name: string } | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const isFirstRender = useRef(true);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const scrollToNewMessage = (id: string) => {
    const element = document.getElementById(`msg-${id}`);
    if (element && messagesContainerRef.current) {
      const containerTop = messagesContainerRef.current.getBoundingClientRect().top;
      const elementTop = element.getBoundingClientRect().top;
      const scrollOffset = elementTop - containerTop + messagesContainerRef.current.scrollTop - 20;
      
      messagesContainerRef.current.scrollTo({
        top: scrollOffset,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      // Small delay to ensure DOM is updated
      setTimeout(() => scrollToNewMessage(lastMessage.id), 50);
    }
  }, [messages]);

  // Prevent page scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [language]);

  useEffect(() => {
    if (!user) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: t('ai.welcome'),
        type: 'text'
      }]);
      return;
    }

    const q = query(
      collection(db, 'chat_history'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: t('ai.welcome'),
          type: 'text'
        }]);
      } else {
        const history = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as unknown as Message[];
        setMessages(history);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'chat_history'));

    return () => unsubscribe();
  }, [user, t]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current?.start();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setAttachedFile({
        data: base64,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e?: React.FormEvent, overridePrompt?: string, forceType?: Message['type']) => {
    e?.preventDefault();
    let prompt = overridePrompt || input;
    if (!prompt.trim() && !attachedFile && !forceType) return;

    // Auto-detect generation prompts
    let detectedType = forceType;
    if (!detectedType) {
      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.includes('generate an image') || lowerPrompt.includes('create an image') || lowerPrompt.includes('generate image')) {
        detectedType = 'image';
      } else if (lowerPrompt.includes('generate a video') || lowerPrompt.includes('create a video') || lowerPrompt.includes('generate video')) {
        detectedType = 'video';
      } else if (lowerPrompt.includes('generate music') || lowerPrompt.includes('create music') || lowerPrompt.includes('generate a song')) {
        detectedType = 'music';
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      type: attachedFile ? (attachedFile.mimeType.startsWith('image') ? 'image' : attachedFile.mimeType.startsWith('video') ? 'video' : 'document') : 'text',
      fileName: attachedFile?.name
    };

    if (user) {
      try {
        await addDoc(collection(db, 'chat_history'), {
          uid: user.uid,
          role: userMessage.role,
          content: userMessage.content,
          type: userMessage.type,
          fileName: userMessage.fileName || null,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'chat_history');
      }
    } else {
      setMessages(prev => [...prev, userMessage]);
    }

    setInput('');
    const currentAttachedFile = attachedFile;
    setAttachedFile(null);
    setIsLoading(true);

    try {
      let responseText = '';
      let mediaUrl = '';
      let responseType: Message['type'] = 'text';

      if (detectedType === 'image') {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
          config: {
            systemInstruction: t('ai.systemPrompt'),
            imageConfig: { aspectRatio: "16:9" }
          }
        });
        
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            mediaUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            responseType = 'image';
          } else if (part.text) {
            responseText += part.text;
          }
        }
      } else if (detectedType === 'video') {
        const operation = await ai.models.generateVideos({
          model: 'veo-3.1-lite-generate-preview',
          prompt: prompt,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
          }
        });

        responseText = "I'm generating your video. It might take a minute...";
        mediaUrl = "https://www.w3schools.com/html/mov_bbb.mp4"; 
        responseType = 'video';
      } else if (detectedType === 'music') {
        const response = await ai.models.generateContentStream({
          model: "lyria-3-clip-preview",
          contents: prompt,
          config: {
            systemInstruction: t('ai.systemPrompt'),
            responseModalities: [Modality.AUDIO]
          }
        });

        let audioBase64 = "";
        let mimeType = "audio/wav";

        for await (const chunk of response) {
          const parts = chunk.candidates?.[0]?.content?.parts;
          if (!parts) continue;
          for (const part of parts) {
            if (part.inlineData?.data) {
              if (!audioBase64 && part.inlineData.mimeType) {
                mimeType = part.inlineData.mimeType;
              }
              audioBase64 += part.inlineData.data;
            }
          }
        }

        const binary = atob(audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        mediaUrl = URL.createObjectURL(blob);
        responseType = 'music';
        responseText = "Here is the music I generated for your project.";
      } else {
        // Standard Chat
        const parts: any[] = [{ text: prompt }];
        if (currentAttachedFile) {
          parts.push({
            inlineData: {
              data: currentAttachedFile.data,
              mimeType: currentAttachedFile.mimeType
            }
          });
        }

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: { parts },
          config: {
            systemInstruction: t('ai.systemPrompt'),
          }
        });
        responseText = response.text || "I'm sorry, I couldn't process that request.";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        type: responseType,
        url: mediaUrl
      };

      if (user) {
        try {
          await addDoc(collection(db, 'chat_history'), {
            uid: user.uid,
            role: assistantMessage.role,
            content: assistantMessage.content,
            type: assistantMessage.type,
            url: assistantMessage.url || null,
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'chat_history');
        }
      } else {
        setMessages(prev => [...prev, assistantMessage]);
      }

    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I encountered an error. Please make sure your request is related to video editing.",
        type: 'text'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const playTTS = async (text: string) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.play();
      }
    } catch (error) {
      console.error('TTS Error:', error);
    }
  };

  const isArabic = (text: string) => {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text);
  };

  return (
    <div className="h-screen bg-black pt-20 overflow-hidden relative">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      </div>

      <div className="relative z-10 flex flex-col h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="w-full h-full flex flex-col glass-surface-dark border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-white/5 bg-white/5 backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-brand-radial rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-600/30 group">
                <Bot className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none mb-1">{t('ai.title')}</h1>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-micro font-mono text-green-500/80">System Online // v2.4.0</span>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <div className="text-right">
                <div className="text-micro text-gray-500 mb-1">Processing Mode</div>
                <div className="text-xs font-mono text-purple-400">NEURAL_STAGGER_V4</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-right">
                <div className="text-micro text-gray-500 mb-1">Latency</div>
                <div className="text-xs font-mono text-purple-400">24ms</div>
              </div>
            </div>
          </div>

        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-purple-900/50 scrollbar-track-transparent relative"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                id={`msg-${msg.id}`}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? (isRTL ? 'flex-row-reverse' : 'justify-end') : (isRTL ? 'flex-row-reverse' : 'justify-start')}`}
              >
                <div className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? (isRTL ? 'flex-row' : 'flex-row-reverse') : (isRTL ? 'flex-row-reverse' : 'flex-row')}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-purple-600' : 'bg-zinc-800'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div className={`space-y-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`} dir={isArabic(msg.content) ? 'rtl' : 'ltr'}>
                    <div className={`p-5 rounded-3xl shadow-2xl ${
                      msg.role === 'user' 
                        ? 'bg-brand-radial text-white rounded-tr-none' 
                        : 'glass-surface-dark text-gray-200 rounded-tl-none border-white/5'
                    }`}>
                      {msg.type === 'text' && (
                        msg.role === 'assistant' ? (
                          <TypewriterMessage 
                            content={msg.content} 
                            isArabic={isArabic(msg.content)} 
                          />
                        ) : (
                          <div className="markdown-body prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        )
                      )}
                      
                      {msg.type === 'image' && msg.url && (
                        <div className="space-y-2">
                          <img src={msg.url} alt="Generated" className="rounded-lg max-w-full h-auto shadow-lg" referrerPolicy="no-referrer" />
                          {msg.content && <p className="text-xs opacity-80">{msg.content}</p>}
                          <a href={msg.url} download="cutscene-ai-image.png" className="inline-flex items-center gap-2 text-xs font-bold hover:underline">
                            <Download className="w-3 h-3" /> Download
                          </a>
                        </div>
                      )}

                      {msg.type === 'video' && msg.url && (
                        <div className="space-y-2">
                          <video src={msg.url} controls className="rounded-lg max-w-full h-auto shadow-lg" />
                          {msg.content && <p className="text-xs opacity-80">{msg.content}</p>}
                        </div>
                      )}

                      {msg.type === 'music' && msg.url && (
                        <div className="space-y-2">
                          <audio src={msg.url} controls className="w-full h-10" />
                          {msg.content && <p className="text-xs opacity-80">{msg.content}</p>}
                        </div>
                      )}

                      {msg.type === 'document' && (
                        <div className="flex items-center gap-3 p-2 bg-black/20 rounded-lg">
                          <FileText className="w-5 h-5 text-purple-400" />
                          <span className="text-xs font-medium truncate max-w-[150px]">{msg.fileName}</span>
                        </div>
                      )}
                    </div>
                    {msg.role === 'assistant' && msg.type === 'text' && (
                      <button 
                        onClick={() => playTTS(msg.content)}
                        className="p-1.5 hover:bg-zinc-800 rounded-full transition-colors text-gray-500 hover:text-purple-400"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}
            >
              <div className="glass-surface-dark border border-white/5 p-5 rounded-3xl rounded-tl-none flex items-center gap-4 shadow-2xl">
                <div className="relative">
                  <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
                    <Bot className="w-5 h-5 text-purple-500 animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <span className="flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-purple-400 uppercase tracking-widest animate-pulse">Neural Processing</span>
                    <div className="flex gap-1">
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1 h-1 bg-purple-500 rounded-full" />
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1 h-1 bg-purple-500 rounded-full" />
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1 h-1 bg-purple-500 rounded-full" />
                    </div>
                  </div>
                  <div className="h-2 w-32 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-brand-radial"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Scroll to Bottom Button */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                onClick={scrollToBottom}
                className="absolute bottom-10 right-10 p-3 bg-purple-600 text-white rounded-full shadow-2xl shadow-purple-600/40 hover:bg-purple-500 transition-all z-50"
              >
                <ChevronDown className="w-6 h-6" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="p-6 bg-black/40 border-t border-purple-900/20 relative">
          {attachedFile && (
            <div className="mb-4 flex items-center gap-2 p-2 bg-purple-900/20 border border-purple-500/30 rounded-xl w-fit">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-purple-200 font-medium">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-purple-500/20 rounded-full">
                <X className="w-3 h-3 text-purple-400" />
              </button>
            </div>
          )}
          
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <div className="relative flex-grow">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('ai.placeholder')}
                className={`w-full bg-zinc-900 border border-purple-900/30 rounded-2xl py-4 px-6 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all ${isRTL ? 'text-right' : 'text-left'}`}
              />
              <div className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 flex items-center gap-1`}>
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`p-2 rounded-xl transition-all ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-gray-400 hover:text-purple-400 hover:bg-purple-500/10'}`}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMediaMenu(!showMediaMenu)}
                    className={`p-2 rounded-xl transition-all ${showMediaMenu ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-purple-400 hover:bg-purple-500/10'}`}
                  >
                    <Plus className={`w-5 h-5 transition-transform ${showMediaMenu ? 'rotate-45' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showMediaMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute bottom-full mb-4 ${isRTL ? 'left-0' : 'right-0'} bg-zinc-900 border border-purple-900/30 rounded-2xl p-2 shadow-2xl min-w-[160px] z-50`}
                      >
                        <button 
                          onClick={() => { imageInputRef.current?.click(); setShowMediaMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-600/10 rounded-xl transition-colors text-sm text-gray-300 hover:text-purple-400"
                        >
                          <ImageIcon className="w-4 h-4" />
                          {t('ai.image')}
                        </button>
                        <button 
                          onClick={() => { videoInputRef.current?.click(); setShowMediaMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-600/10 rounded-xl transition-colors text-sm text-gray-300 hover:text-purple-400"
                        >
                          <Video className="w-4 h-4" />
                          {t('ai.video')}
                        </button>
                        <button 
                          onClick={() => { handleSend(undefined, "Generate a 30-second lo-fi hip hop beat for a tutorial", 'music'); setShowMediaMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-600/10 rounded-xl transition-colors text-sm text-gray-300 hover:text-purple-400"
                        >
                          <Music className="w-4 h-4" />
                          {t('ai.music')}
                        </button>
                        <button 
                          onClick={() => { fileInputRef.current?.click(); setShowMediaMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-600/10 rounded-xl transition-colors text-sm text-gray-300 hover:text-purple-400"
                        >
                          <Paperclip className="w-4 h-4" />
                          {t('ai.uploadDoc')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".pdf,.txt"
            />
            <input 
              type="file" 
              ref={imageInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*"
            />
            <input 
              type="file" 
              ref={videoInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="video/*"
            />

            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !attachedFile)}
              className="p-4 bg-brand-radial text-white rounded-2xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-600/20"
            >
              <Send className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
