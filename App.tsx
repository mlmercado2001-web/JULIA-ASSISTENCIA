
import React, { useState, useRef, useEffect } from 'react';
import { Role, Message } from './types';
import { STUDIO_INFO } from './constants';
import { JuliaService } from './services/geminiService';
import { playPCM } from './services/audioService';

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

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-zinc-950 text-white">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="relative inline-block">
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600 to-amber-400 rounded-full blur opacity-75"></div>
            <img src="https://picsum.photos/150/150" alt="Mersão Tattoo" className="relative rounded-full border-4 border-zinc-900 w-32 h-32 object-cover mx-auto shadow-2xl" />
          </div>
          
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Mersão Tattoo</h1>
            <p className="text-zinc-400">Eu sou a Júlia! Qual o seu nome?</p>
          </div>

          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Digite seu nome..." 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-white"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            />
            <button 
              onClick={handleStart}
              disabled={!userName.trim()}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-amber-500/20 uppercase tracking-widest"
            >
              Iniciar Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen bg-black overflow-hidden max-w-2xl mx-auto border-x ${isAdminMode ? 'border-amber-600/50 shadow-amber-900/20' : 'border-zinc-900 shadow-2xl'}`}>
      {/* Header */}
      <header className={`${isAdminMode ? 'bg-amber-950/40' : 'bg-zinc-900/80'} backdrop-blur-md border-b ${isAdminMode ? 'border-amber-700/50' : 'border-zinc-800'} p-3 sticky top-0 z-50 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <img src="https://picsum.photos/150/150" className="w-8 h-8 rounded-full border border-zinc-700" alt="Avatar" />
          <div>
            <h2 className="font-bold text-white text-xs">Júlia - Mersão Tattoo</h2>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 ${isAdminMode ? 'bg-amber-400 animate-pulse' : 'bg-green-500'} rounded-full`}></div>
              <p className={`text-[10px] uppercase ${isAdminMode ? 'text-amber-400 font-bold' : 'text-zinc-400'}`}>
                {isAdminMode ? 'Modo Mestre Ativo' : 'Atendimento Objetivo'}
              </p>
            </div>
          </div>
        </div>
        {isAdminMode ? (
          <div className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[9px] font-bold border border-amber-500/50">
            ADMIN
          </div>
        ) : preference && (
          <div className="bg-zinc-800 px-2 py-1 rounded text-[10px] text-zinc-400 flex items-center gap-1">
            <i className={`fa-solid ${preference === 'audio' ? 'fa-volume-high' : 'fa-font'}`}></i>
            {preference.toUpperCase()}
          </div>
        )}
      </header>

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 chat-container bg-zinc-950">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
            <div className={`message-bubble rounded-2xl px-4 py-2 shadow-sm ${
              msg.role === Role.USER 
                ? 'bg-amber-500 text-zinc-950 rounded-tr-none' 
                : isAdminMode
                  ? 'bg-zinc-800 text-amber-100 border-l-4 border-amber-400 rounded-tl-none'
                  : msg.isCritical 
                    ? 'bg-white text-zinc-900 border-l-4 border-amber-600 rounded-tl-none font-medium' 
                    : msg.isConfirmation
                      ? 'bg-zinc-100 text-zinc-900 border-l-4 border-amber-500 rounded-tl-none'
                      : 'bg-zinc-900 text-zinc-100 rounded-tl-none border border-zinc-800'
            }`}>
              {msg.image && (
                <div className="relative mb-2">
                  <img src={msg.image} alt="Ref" className="rounded-lg max-h-56 w-full object-cover border border-white/10" />
                  {isAdminMode && <div className="absolute top-2 right-2 bg-amber-500 text-zinc-900 text-[8px] font-bold px-1.5 py-0.5 rounded">TREINO</div>}
                </div>
              )}
              <div className="whitespace-pre-wrap leading-tight text-sm">
                {msg.text}
              </div>
              <div className="mt-1 flex items-center justify-end gap-1 opacity-40 text-[9px]">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 px-3 py-2 rounded-full flex gap-1">
              <div className={`w-1 h-1 ${isAdminMode ? 'bg-amber-400' : 'bg-amber-500'} rounded-full animate-bounce`}></div>
              <div className={`w-1 h-1 ${isAdminMode ? 'bg-amber-400' : 'bg-amber-500'} rounded-full animate-bounce delay-75`}></div>
              <div className={`w-1 h-1 ${isAdminMode ? 'bg-amber-400' : 'bg-amber-500'} rounded-full animate-bounce delay-150`}></div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </main>

      {/* Footer / Input */}
      <footer className={`${isAdminMode ? 'bg-zinc-950 border-amber-900/30' : 'bg-zinc-900 border-zinc-800'} p-3 border-t transition-colors`}>
        {/* Quick preference or confirmation buttons */}
        {!preference && !isAdminMode && messages.length > 0 && (
          <div className="flex gap-2 mb-3">
            <button onClick={() => setInputValue('Áudio')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs py-2 rounded-lg border border-zinc-700 transition-colors">
              <i className="fa-solid fa-microphone mr-2"></i> Áudio
            </button>
            <button onClick={() => setInputValue('Texto')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs py-2 rounded-lg border border-zinc-700 transition-colors">
              <i className="fa-solid fa-message mr-2"></i> Texto
            </button>
          </div>
        )}

        {showConfirmationButtons && !isLoading && (
          <div className="flex gap-2 mb-3 animate-in fade-in slide-in-from-bottom-2">
            <button 
              onClick={() => handleSendMessage(undefined, undefined, 'Sim, os dados estão corretos.')} 
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-amber-500/10"
            >
              Sim, confirmar
            </button>
            <button 
              onClick={() => handleSendMessage(undefined, undefined, 'Não, preciso ajustar algo.')} 
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs py-2.5 rounded-lg border border-zinc-700 transition-all"
            >
              Não, ajustar
            </button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <label className={`cursor-pointer ${isAdminMode ? 'text-amber-500' : 'text-zinc-500'} hover:text-amber-500 p-2 transition-colors`}>
            <i className={`fa-solid ${isAdminMode ? 'fa-image' : 'fa-camera'} text-lg`}></i>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
          </label>
          <input 
            type="text" 
            placeholder={isAdminMode ? "Ensine a Júlia agora..." : "Responda aqui..."}
            className={`flex-1 ${isAdminMode ? 'bg-amber-950/10 border-amber-900/50' : 'bg-zinc-950 border-zinc-800'} border text-white rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm transition-all`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button 
            type="submit" 
            className={`${isAdminMode ? 'bg-amber-400' : 'bg-amber-500'} text-zinc-950 w-9 h-9 rounded-full flex items-center justify-center hover:bg-amber-300 disabled:opacity-50 transition-all`}
            disabled={!inputValue.trim() || isLoading}
          >
            <i className={`fa-solid ${isAdminMode ? 'fa-graduation-cap' : 'fa-arrow-up'}`}></i>
          </button>
        </form>
        {isAdminMode ? (
          <div className="mt-2 text-center">
            <span className="text-[9px] text-amber-600/70 font-mono tracking-tighter uppercase italic">
              A Júlia está aprendendo com você agora.
            </span>
          </div>
        ) : (
          <div className="mt-2 text-center">
            <a href={STUDIO_INFO.whatsapp} target="_blank" className="text-[10px] text-zinc-500 hover:text-green-500">
               Agendar no WhatsApp <i className="fa-brands fa-whatsapp ml-1"></i>
            </a>
          </div>
        )}
      </footer>
    </div>
  );
};

export default App;
