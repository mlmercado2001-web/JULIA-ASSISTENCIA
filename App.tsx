
import React, { useState, useRef, useEffect } from 'react';
import { Role, Message } from './types';
import { STUDIO_INFO } from './constants';
import { JuliaService } from './services/geminiService';
import { playPCM } from './services/audioService';

// Imagem de perfil refinada
const OFFICIAL_LOGO = "https://images.unsplash.com/photo-1598135753163-6167c1a1ad65?q=80&w=400&auto=format&fit=crop";

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [preference, setPreference] = useState<'text' | 'audio' | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const juliaRef = useRef<JuliaService | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (!juliaRef.current) {
      juliaRef.current = new JuliaService();
    }
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleStart = async () => {
    if (!userName.trim()) return;
    initAudio();
    setIsStarted(true);
    setIsLoading(true);

    const initialGreeting = `Olá! Meu nome é ${userName}.`;
    const response = await juliaRef.current!.processMessage(initialGreeting, null);
    
    const juliaMsg: Message = {
      id: Date.now().toString(),
      role: Role.JULIA,
      text: response.displayText,
      audio: response.audioData,
      isCritical: response.isCritical,
      timestamp: new Date()
    };

    setMessages([juliaMsg]);
    setIsLoading(false);

    if (response.audioData && audioContextRef.current) {
      playPCM(response.audioData, audioContextRef.current);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customImage?: string, forcedText?: string) => {
    e?.preventDefault();
    const textToSend = forcedText || inputValue;
    if (!textToSend.trim() && !customImage) return;

    let currentPreference = preference;
    if (!preference && !isAdminMode) {
      if (textToSend.toLowerCase().includes('áudio') || textToSend.toLowerCase().includes('audio')) {
        currentPreference = 'audio';
        setPreference('audio');
      } else if (textToSend.toLowerCase().includes('texto')) {
        currentPreference = 'text';
        setPreference('text');
      }
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: textToSend,
      image: customImage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await juliaRef.current!.processMessage(textToSend, currentPreference, customImage);
      
      if (response.isAdminActive) {
        setIsAdminMode(true);
        setPreference('text');
      }

      const juliaMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: Role.JULIA,
        text: response.displayText,
        audio: response.audioData,
        isCritical: response.isCritical,
        isConfirmation: response.isConfirmation,
        isFinalQuote: response.isFinalQuote,
        summary: response.summary,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, juliaMsg]);
      
      if (response.audioData && audioContextRef.current && currentPreference === 'audio' && !response.isAdminActive) {
        playPCM(response.audioData, audioContextRef.current);
      }
    } catch (error) {
      console.error("Error sending message", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleSendMessage(undefined, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const lastMessage = messages[messages.length - 1];
  const showConfirmationButtons = lastMessage?.role === Role.JULIA && lastMessage.isConfirmation;

  const getWhatsAppLink = (summary?: string) => {
    const baseText = `Olá Mersão! Fiz um orçamento com a Júlia.\n\n${summary || "Quero agendar uma tatuagem."}`;
    return `https://wa.me/${STUDIO_INFO.whatsappNumber}?text=${encodeURIComponent(baseText)}`;
  };

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-zinc-950 text-white">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-amber-600/30 rounded-full blur-3xl opacity-50 animate-pulse"></div>
            <img 
              src={OFFICIAL_LOGO} 
              alt="Mersão Tattoo" 
              className="relative rounded-full border-2 border-zinc-800 w-48 h-48 object-cover mx-auto shadow-2xl grayscale hover:grayscale-0 transition-all duration-1000 cursor-pointer" 
            />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">Mersão Tattoo</h1>
            <p className="text-amber-500 font-bold tracking-[0.3em] uppercase text-[10px]">Assistant Virtual Júlia</p>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-sm p-8 rounded-3xl border border-zinc-800/50 space-y-6 shadow-xl">
            <div className="space-y-4">
              <label className="text-zinc-500 text-xs uppercase font-bold tracking-widest block text-left ml-2">Identificação</label>
              <input 
                type="text" 
                placeholder="Como posso te chamar?" 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-white placeholder-zinc-700 font-medium"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
            </div>
            <button 
              onClick={handleStart}
              disabled={!userName.trim()}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-20 disabled:grayscale text-zinc-950 font-black py-5 px-6 rounded-2xl transition-all shadow-xl shadow-amber-500/10 uppercase tracking-widest text-sm transform hover:scale-[1.02] active:scale-95"
            >
              Iniciar Consultoria
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen bg-black overflow-hidden max-w-2xl mx-auto border-x ${isAdminMode ? 'border-amber-600/30 ring-1 ring-amber-500/10' : 'border-zinc-900 shadow-2xl'}`}>
      {/* Header */}
      <header className={`${isAdminMode ? 'bg-amber-950/20' : 'bg-zinc-900/40'} backdrop-blur-xl border-b ${isAdminMode ? 'border-amber-700/30' : 'border-zinc-800/50'} p-4 sticky top-0 z-50 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={OFFICIAL_LOGO} className="w-10 h-10 rounded-full border border-zinc-700 object-cover" alt="Avatar" />
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${isAdminMode ? 'bg-amber-400 animate-pulse' : 'bg-green-500'} rounded-full border-2 border-black`}></div>
          </div>
          <div>
            <h2 className={`font-bold uppercase tracking-tighter text-sm ${isAdminMode ? 'text-amber-400' : 'text-white'}`}>Júlia - Mersão Tattoo</h2>
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-medium">
              {isAdminMode ? 'Interface de Aprendizado Ativa' : 'Estúdio de Tatuagem Profissional'}
            </p>
          </div>
        </div>
        
        {isAdminMode ? (
          <div className="flex flex-col items-end">
            <span className="bg-amber-500 text-zinc-950 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">MESTRE</span>
            <span className="text-amber-500/50 text-[7px] mt-0.5 uppercase tracking-widest font-bold">Modo Admin</span>
          </div>
        ) : preference && (
          <div className="bg-zinc-800/50 px-3 py-1.5 rounded-full text-[9px] text-zinc-300 flex items-center gap-2 border border-zinc-700/50">
            <i className={`fa-solid ${preference === 'audio' ? 'fa-volume-high animate-pulse' : 'fa-font'}`}></i>
            <span className="font-bold tracking-widest">{preference.toUpperCase()}</span>
          </div>
        )}
      </header>

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 chat-container bg-zinc-950 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`message-bubble rounded-2xl px-4 py-3 shadow-sm ${
              msg.role === Role.USER 
                ? 'bg-amber-500 text-zinc-950 rounded-tr-none font-medium' 
                : isAdminMode
                  ? 'bg-zinc-900 text-amber-100 border-l-4 border-amber-500 rounded-tl-none shadow-amber-900/10'
                  : msg.isCritical 
                    ? 'bg-white text-zinc-900 border-l-4 border-amber-600 rounded-tl-none font-semibold shadow-amber-500/20 shadow-xl' 
                    : msg.isConfirmation
                      ? 'bg-zinc-100 text-zinc-900 border-l-4 border-amber-500 rounded-tl-none font-medium'
                      : 'bg-zinc-900 text-zinc-200 rounded-tl-none border border-zinc-800/50'
            }`}>
              {msg.image && (
                <div className="relative mb-3 group">
                  <img src={msg.image} alt="Referência" className="rounded-xl max-h-72 w-full object-cover border border-white/5 transition-all group-hover:brightness-110" />
                  {isAdminMode && (
                    <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                      <span className="bg-amber-500 text-black px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">Análise de Dados</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="whitespace-pre-wrap leading-relaxed text-sm">
                {msg.text}
              </div>

              {msg.isFinalQuote && (
                <div className="mt-5 pt-4 border-t border-black/10">
                   <a 
                    href={getWhatsAppLink(msg.summary)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 bg-green-500 hover:bg-green-400 text-zinc-950 font-black py-4 px-4 rounded-2xl transition-all shadow-xl shadow-green-500/20 uppercase tracking-tighter text-xs"
                  >
                    <i className="fa-brands fa-whatsapp text-xl"></i>
                    Concluir no WhatsApp
                  </a>
                </div>
              )}

              <div className="mt-2 flex items-center justify-end gap-1 opacity-30 text-[8px] font-bold tracking-widest uppercase">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-zinc-900/50 px-4 py-3 rounded-full flex gap-1.5 border border-zinc-800/50">
              <div className={`w-1.5 h-1.5 ${isAdminMode ? 'bg-amber-400' : 'bg-amber-500'} rounded-full animate-bounce`}></div>
              <div className={`w-1.5 h-1.5 ${isAdminMode ? 'bg-amber-400' : 'bg-amber-500'} rounded-full animate-bounce delay-75`}></div>
              <div className={`w-1.5 h-1.5 ${isAdminMode ? 'bg-amber-400' : 'bg-amber-500'} rounded-full animate-bounce delay-150`}></div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </main>

      {/* Footer / Input */}
      <footer className={`${isAdminMode ? 'bg-zinc-950 border-amber-900/30' : 'bg-zinc-900/60'} p-4 border-t backdrop-blur-md transition-colors`}>
        {!preference && !isAdminMode && messages.length > 0 && (
          <div className="flex gap-3 mb-4">
            <button onClick={() => setInputValue('Vou preferir por Áudio')} className="flex-1 bg-zinc-800/50 hover:bg-zinc-700 text-white text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl border border-zinc-700/50 transition-all flex items-center justify-center gap-2">
              <i className="fa-solid fa-microphone text-amber-500"></i> Áudio
            </button>
            <button onClick={() => setInputValue('Prefiro por Texto')} className="flex-1 bg-zinc-800/50 hover:bg-zinc-700 text-white text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl border border-zinc-700/50 transition-all flex items-center justify-center gap-2">
              <i className="fa-solid fa-message text-amber-500"></i> Texto
            </button>
          </div>
        )}

        {showConfirmationButtons && !isLoading && (
          <div className="flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2">
            <button 
              onClick={() => handleSendMessage(undefined, undefined, 'Sim, os dados estão corretos.')} 
              className="flex-1 bg-white hover:bg-zinc-200 text-zinc-950 text-[10px] font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-xl"
            >
              Confirmar Dados
            </button>
            <button 
              onClick={() => handleSendMessage(undefined, undefined, 'Não, preciso ajustar algo.')} 
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold uppercase tracking-widest py-3.5 rounded-xl border border-zinc-700 transition-all"
            >
              Ajustar Informações
            </button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <label className={`cursor-pointer ${isAdminMode ? 'text-amber-500' : 'text-zinc-600'} hover:text-amber-400 p-2 transition-colors`}>
            <i className={`fa-solid ${isAdminMode ? 'fa-plus-circle' : 'fa-camera-retro'} text-xl`}></i>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
          </label>
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder={isAdminMode ? "Ensine algo novo à Júlia..." : "Sua mensagem aqui..."}
              className={`w-full ${isAdminMode ? 'bg-amber-950/5 border-amber-900/30 placeholder-amber-900/50' : 'bg-zinc-950 border-zinc-800 placeholder-zinc-700'} border text-white rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm transition-all`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            className={`${isAdminMode ? 'bg-amber-400' : 'bg-amber-500'} text-zinc-950 w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-20 disabled:grayscale transition-all shadow-lg shadow-amber-500/10`}
            disabled={!inputValue.trim() || isLoading}
          >
            <i className={`fa-solid ${isAdminMode ? 'fa-brain' : 'fa-paper-plane'} text-lg`}></i>
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <a href={STUDIO_INFO.whatsappLink} target="_blank" className="text-[9px] text-zinc-600 hover:text-green-500 font-black uppercase tracking-[0.2em] transition-colors">
             Atendimento Direto WhatsApp <i className="fa-brands fa-whatsapp ml-1 text-xs"></i>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;