
import React, { useState, useRef } from 'react';
import { ManufacturerContact, TranscriptionItem, CallView } from './types';
import { INITIAL_CONTACTS } from './constants';
import { GeminiCallAgent, CallHandlers } from './services/geminiService';
import CallModal from './components/CallModal';

const App: React.FC = () => {
  const [contacts, setContacts] = useState<ManufacturerContact[]>(INITIAL_CONTACTS);
  const [activeCallContact, setActiveCallContact] = useState<ManufacturerContact | null>(null);
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentView, setCurrentView] = useState<CallView>(CallView.DASHBOARD);
  
  const [telephonyMode, setTelephonyMode] = useState<'web' | 'real'>('web');
  
  // Vapi Config
  const [vapiApiKey, setVapiApiKey] = useState('');
  const [vapiAssistantId, setVapiAssistantId] = useState('');
  const [vapiPhoneNumberId, setVapiPhoneNumberId] = useState('');

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newCustomScript, setNewCustomScript] = useState('');

  const agentRef = useRef<GeminiCallAgent | null>(null);

  const triggerVapiCall = async (contact: ManufacturerContact) => {
    try {
      setIsConnecting(true);
      const response = await fetch('https://api.vapi.ai/call/phone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vapiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: vapiAssistantId,
          phoneNumberId: vapiPhoneNumberId,
          customer: {
            number: contact.phone.startsWith('+') ? contact.phone : `+92${contact.phone.replace(/^0/, '')}`,
            name: contact.name,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Vapi call failed');
      
      alert(`Real call started! Mariya is now dialing ${contact.phone}. Call ID: ${data.id}`);
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: 'calling' } : c));
    } catch (err: any) {
      alert(`SIM Gateway Error: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStartCall = async (contact: ManufacturerContact) => {
    if (telephonyMode === 'real') {
      if (!vapiApiKey || !vapiAssistantId || !vapiPhoneNumberId) {
        alert("Missing Vapi Configuration. Please fill all fields in Settings.");
        setCurrentView(CallView.HISTORY);
        return;
      }
      await triggerVapiCall(contact);
      return;
    }

    // WEB MODE (Gemini Live)
    setActiveCallContact(contact);
    setIsConnecting(true);
    setTranscriptions([]);

    const handlers: CallHandlers = {
      onTranscription: (text, speaker) => {
        setTranscriptions(prev => [...prev, { text, speaker, timestamp: new Date() }]);
      },
      onInterrupted: () => {},
      onOutcome: (outcome) => {
        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, outcome } : c));
      },
      onClose: () => {
        setIsConnecting(false);
        setActiveCallContact(null);
      },
      onError: (err) => {
        setIsConnecting(false);
        setActiveCallContact(null);
        alert(err);
      }
    };

    if (agentRef.current) agentRef.current.stopCall();
    agentRef.current = new GeminiCallAgent();

    const success = await agentRef.current.startCall(handlers, contact);
    if (success) {
      setTimeout(() => setIsConnecting(false), 800);
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: 'calling' } : c));
    }
  };

  const handleHangUp = () => {
    if (agentRef.current) agentRef.current.stopCall();
    setActiveCallContact(null);
    setIsConnecting(false);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone) return;
    const newContact: ManufacturerContact = {
      id: Date.now().toString(),
      name: newName || 'Contact',
      company: newCompany || 'Company',
      phone: newPhone,
      status: 'idle',
      customScript: newCustomScript
    };
    setContacts([newContact, ...contacts]);
    setNewName(''); setNewPhone(''); setNewCompany(''); setNewCustomScript('');
  };

  const handleRemoveContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <header className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-green-600 p-3 rounded-2xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">PAK<span className="text-green-500">SUPPLY</span></h1>
            <p className="text-slate-400 text-sm uppercase tracking-widest font-bold">Mariya Agent Pro</p>
          </div>
        </div>

        <nav className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-700">
          <button 
            onClick={() => setCurrentView(CallView.DASHBOARD)}
            className={`px-6 py-2 rounded-lg transition-all ${currentView === CallView.DASHBOARD ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setCurrentView(CallView.HISTORY)}
            className={`px-6 py-2 rounded-lg transition-all ${currentView === CallView.HISTORY ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Settings
          </button>
        </nav>
      </header>

      <main>
        {currentView === CallView.DASHBOARD ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
                <h3 className="text-lg font-bold mb-4 text-white">Call Method</h3>
                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl mb-4">
                  <button onClick={() => setTelephonyMode('web')} className={`py-2 text-xs font-bold rounded-lg ${telephonyMode === 'web' ? 'bg-green-600 text-white' : 'text-slate-500'}`}>Web Agent</button>
                  <button onClick={() => setTelephonyMode('real')} className={`py-2 text-xs font-bold rounded-lg ${telephonyMode === 'real' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>SIM Gateway</button>
                </div>
                <p className="text-[11px] text-slate-400 p-3 bg-slate-900/50 rounded-xl border border-slate-700 leading-relaxed">
                  {telephonyMode === 'web' ? 'Mariya uses your device microphone. Direct voice interaction via browser.' : 'Mariya calls the customer’s phone number directly via SIM Gateway.'}
                </p>
              </div>

              <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
                <h3 className="text-lg font-bold mb-4 text-white">Add Individual</h3>
                <form onSubmit={handleAddContact} className="space-y-3">
                  <input type="text" placeholder="Contact Name" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500 outline-none" />
                  <input type="text" placeholder="Company Name" value={newCompany} onChange={e => setNewCompany(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500 outline-none" />
                  <input type="tel" placeholder="Phone (e.g. 03001234567)" value={newPhone} onChange={e => setNewPhone(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500 outline-none" />
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 px-1">Special Script Instructions</label>
                    <textarea 
                      placeholder="Customized pitch details..." 
                      value={newCustomScript} 
                      onChange={e => setNewCustomScript(e.target.value)} 
                      rows={4} 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:border-green-500 outline-none resize-none leading-relaxed" 
                    />
                  </div>
                  <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg mt-4 active:scale-95">Add to Call Queue</button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 backdrop-blur-sm">
                <h3 className="text-lg font-bold text-white">Lead Queue</h3>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                   <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">System Online</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-slate-700/50">
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-slate-700/30 group transition-colors">
                        <td className="px-6 py-6">
                          <div className="font-bold text-white text-lg leading-tight">{contact.name}</div>
                          <div className="text-xs text-slate-400 mt-1">{contact.phone} • {contact.company}</div>
                          {contact.customScript && (
                            <div className="mt-2 text-[10px] text-green-400/80 font-medium italic truncate max-w-xs">📜 {contact.customScript}</div>
                          )}
                        </td>
                        <td className="px-6 py-6 text-center">
                          {contact.outcome ? (
                            <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                              contact.outcome === 'agreed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                              contact.outcome === 'declined' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                              'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}>
                              {contact.outcome === 'agreed' ? '✅ AGREED' : 
                               contact.outcome === 'declined' ? '❌ DECLINED' : '⏰ LATER'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button 
                              onClick={() => handleRemoveContact(contact.id)}
                              className="p-3 text-slate-500 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            <button 
                              disabled={isConnecting}
                              onClick={() => handleStartCall(contact)}
                              className={`p-5 rounded-2xl ${telephonyMode === 'real' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-green-600 hover:bg-green-500'} text-white shadow-xl active:scale-95 transition-all`}
                            >
                              {isConnecting ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl -mr-20 -mt-20"></div>
               <h2 className="text-2xl font-black text-white mb-8 relative z-10">Vapi Connectivity Settings</h2>
               
               <div className="space-y-8 relative z-10">
                 <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-[0.2em]">Private API Key (Secret Key)</label>
                   <input 
                     type="password" 
                     value={vapiApiKey} 
                     onChange={e => setVapiApiKey(e.target.value)} 
                     className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-5 text-white focus:border-blue-500 outline-none transition-all font-mono" 
                     placeholder="sk-xxxxxxxxxxxxxxxxxxxx" 
                   />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-[0.2em]">Assistant ID</label>
                      <input 
                        type="text" 
                        value={vapiAssistantId} 
                        onChange={e => setVapiAssistantId(e.target.value)} 
                        className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-5 text-white focus:border-blue-500 outline-none transition-all font-mono" 
                        placeholder="UUID from Assistant Tab" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-[0.2em]">Phone Number ID</label>
                      <input 
                        type="text" 
                        value={vapiPhoneNumberId} 
                        onChange={e => setVapiPhoneNumberId(e.target.value)} 
                        className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-5 text-white focus:border-blue-500 outline-none transition-all font-mono" 
                        placeholder="UUID from Phone Tab" 
                      />
                    </div>
                 </div>

                 <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                    <h4 className="text-blue-400 font-bold text-sm mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Real Call Setup
                    </h4>
                    <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
                      <li>• Get the <strong>Private Key</strong> from Vapi Dashboard Settings.</li>
                      <li>• Create an Assistant in Vapi and paste the Mariya System Prompt there.</li>
                      <li>• Buy a number in Vapi (US numbers work, or link a local provider).</li>
                      <li>• Phone numbers will automatically be prefixed with <strong>+92</strong> for Pakistan.</li>
                    </ul>
                 </div>
               </div>
             </div>
          </div>
        )}
      </main>

      {activeCallContact && telephonyMode === 'web' && (
        <CallModal 
          contact={activeCallContact} 
          transcriptions={transcriptions} 
          isConnecting={isConnecting} 
          onHangUp={handleHangUp} 
        />
      )}
    </div>
  );
};

export default App;
