
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
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="p-8 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className={`w-24 h-24 flex items-center justify-center bg-slate-800 rounded-full border-2 ${isConnecting ? 'border-slate-700' : 'border-green-500'} transition-all`}>
              {isConnecting ? (
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              ) : (
                <div className="pulse-ring absolute inset-0"></div>
              )}
              <svg className={`w-10 h-10 ${isConnecting ? 'text-slate-600' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-black text-white">{contact.company}</h2>
          <p className="text-slate-400 text-sm mb-4">{contact.name} • {contact.phone}</p>
          
          <div className="flex gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                {isConnecting ? 'Initializing...' : 'Mariya Live'}
              </span>
            </div>
            
            {contact.outcome && (
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                contact.outcome === 'agreed' ? 'bg-green-600 text-white border-green-500' :
                contact.outcome === 'declined' ? 'bg-red-600 text-white border-red-500' :
                'bg-amber-600 text-white border-amber-500'
              }`}>
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Outcome: {contact.outcome}
                </span>
              </div>
            )}
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-slate-950/20 scroll-smooth"
        >
          {transcriptions.map((t, idx) => (
            <div key={idx} className={`flex flex-col ${t.speaker === 'agent' ? 'items-start' : 'items-end'}`}>
              <span className="text-[9px] font-bold text-slate-600 uppercase mb-1">{t.speaker === 'agent' ? 'Mariya' : 'Lead'}</span>
              <div className={`max-w-[85%] p-3 rounded-2xl ${
                t.speaker === 'agent' ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-green-600 text-white'
              }`}>
                <p className="text-sm font-medium">{t.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 flex justify-center">
          <button onClick={onHangUp} className="bg-red-500 hover:bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90">
            <svg className="w-8 h-8 rotate-[135deg]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
