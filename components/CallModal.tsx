
import React, { useEffect, useRef } from 'react';
import { TranscriptionItem, ManufacturerContact } from '../types';

interface CallModalProps {
  contact: ManufacturerContact;
  transcriptions: TranscriptionItem[];
  onHangUp: () => void;
  isConnecting: boolean;
}

const CallModal: React.FC<CallModalProps> = ({ contact, transcriptions, onHangUp, isConnecting }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(22,163,74,0.15)] flex flex-col max-h-[90vh]">
        
        {/* Call Status Header */}
        <div className="p-10 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className={`w-28 h-28 flex items-center justify-center bg-slate-800 rounded-full border-2 ${isConnecting ? 'border-slate-700' : 'border-green-500'} transition-all duration-700`}>
              {isConnecting ? (
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              ) : (
                <div className="pulse-ring absolute inset-0"></div>
              )}
              <svg className={`w-12 h-12 ${isConnecting ? 'text-slate-600' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            {!isConnecting && (
              <div className="absolute -bottom-2 -right-2 bg-green-500 text-slate-900 p-2 rounded-full shadow-lg">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          <h2 className="text-3xl font-black text-white mb-1">{contact.company}</h2>
          <p className="text-slate-400 font-medium mb-4">{contact.name} • {contact.phone}</p>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-800 rounded-full border border-slate-700">
            <span className={`w-2 h-2 rounded-full ${isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></span>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isConnecting ? 'text-amber-500' : 'text-green-500'}`}>
              {isConnecting ? 'Connecting VOIP Gateway...' : 'Mariya Live'}
            </span>
          </div>
        </div>

        {/* Live Transcript */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-8 py-4 space-y-6 bg-slate-950/30 scroll-smooth"
        >
          {transcriptions.map((t, idx) => (
            <div key={idx} className={`flex flex-col ${t.speaker === 'agent' ? 'items-start' : 'items-end'}`}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-2">
                {t.speaker === 'agent' ? 'Mariya (AI Agent)' : 'Receiver'}
              </span>
              <div className={`max-w-[85%] p-4 rounded-3xl ${
                t.speaker === 'agent' 
                  ? 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700' 
                  : 'bg-green-600 text-white rounded-tr-none shadow-lg shadow-green-900/20'
              }`}>
                <p className="text-[15px] leading-relaxed font-medium">{t.text}</p>
              </div>
            </div>
          ))}
          {transcriptions.length === 0 && !isConnecting && (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
               <div className="w-1 bg-green-500 h-8 rounded-full animate-pulse"></div>
               <p className="text-xs mt-4 uppercase tracking-[0.3em] font-bold">Mariya is initializing...</p>
            </div>
          )}
        </div>

        {/* Call Actions */}
        <div className="p-10 flex flex-col items-center">
          <button 
            onClick={onHangUp}
            className="group relative flex items-center justify-center bg-red-500 hover:bg-red-600 text-white w-20 h-20 rounded-full transition-all active:scale-95 shadow-2xl shadow-red-500/30"
          >
            <svg className="w-10 h-10 rotate-[135deg]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </button>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">End Session</p>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
