import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Loader2, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { AFRICA_DATA } from '../data';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: `👋 **Bienvenue !** Je suis votre Assistant Géodésique.

Je peux vous aider avec :
- 🌍 Les cadres de référence (ITRF, WGS84, AFREF)
- 📊 Les données de géodésie par pays en Afrique
- 🛰️ Les questions techniques sur les époques et réseaux

Posez-moi votre question !`
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Build context from AFRICA_DATA
      const dataContext = JSON.stringify(AFRICA_DATA.map(c => ({
        country: c.country,
        former: c.formerNetwork,
        current: c.currentNetwork,
        itrf: c.itrf,
        epoch: c.epoch,
        status: c.status,
        zone: c.zone
      })));

      const systemInstruction = `
        You are an expert geodetic assistant specializing in Geodetic Reference Frames in Africa.
        
        Your knowledge is strictly based on:
        1. Current Project Data provided in context (AFRICA_DATA).
        2. Official geodetic literature from organizations like the International Federation of Surveyors (FIG - https://www.fig.net), IGS, and AFREF.
        3. Professional geodetic articles and technical notebooks.
        
        Strict Guidelines:
        - BE PRECISE AND TECHNICAL.
        - NEVER INVENT OR HALLUCINATE INFORMATION. If you don't know something, say so or search for it.
        - Use the Google Search tool extensively to verify facts, find recent data, or consult official sites (FIG, IGS, AFREF).
        - If someone asks about a specific country, always check the project data first.
        - Explain the dynamics of reference frames (ITRF, epochs, WGS84, AFREF) with clarity.
        - Answer clearly and directly to the user's questions.
        - Answer in the language of the user (French or English).
        - Format your response with markdown for readability.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
          tools: [{ googleSearch: {} }]
        }
      });

      const assistantContent = response.text || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Une erreur est survenue lors de la communication avec l'IA. Veuillez vérifier votre clé API ou réessayer plus tard." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[1000] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? '60px' : '500px'
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden w-[calc(100vw-32px)] sm:w-[400px] max-w-[400px] flex flex-col mb-4 transition-all duration-300"
          >
            {/* Header */}
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Assistant Géodésique 🚀</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-indigo-100 uppercase tracking-wider font-medium">Active</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
                >
                  {messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
                          msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-slate-200 text-slate-400 shadow-sm'
                        }`}>
                          {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm ${
                          msg.role === 'user' 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                          : 'bg-white border border-slate-100 text-slate-700 shadow-sm'
                        }`}>
                          <div className="markdown-body text-sm">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin text-indigo-600" />
                        <span className="text-xs text-slate-500 font-medium italic">En train d'écrire...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-100 bg-white">
                  <div className="relative group">
                    <input 
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask about geodetic frames..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all group-hover:bg-slate-100/50"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-white rounded-lg transition-all disabled:opacity-30 disabled:scale-95"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-1 justify-center">
                    <Sparkles size={10} className="text-indigo-400" />
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Basé sur des articles d'experts en géodésie</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-3 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        <MessageSquare size={24} />
        <span className="font-bold text-sm pr-2">CHATBOT</span>
      </motion.button>
    </div>
  );
};
