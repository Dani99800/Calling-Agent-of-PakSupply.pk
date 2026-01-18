
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
  const [apiKey, setApiKey] = useState('');

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newCustomScript, setNewCustomScript] = useState('');

  const agentRef = useRef<GeminiCallAgent | null>(null);

  const handleStartCall = async (contact: ManufacturerContact) => {
    if (telephonyMode === 'real') {
      if (!apiKey) {
        alert("Please set a Vapi/Retell API Key in Settings.");
        setCurrentView(CallView.HISTORY);
        return;
      }
      alert(`Connecting Real SIM to ${contact.phone}...`);
      return;
    }

    // WEB MODE
    setActiveCallContact(contact);
    setIsConnecting(true);
    setTranscriptions([]);

    const handlers: CallHandlers = {
      onTranscription: (text, speaker) => {
        setTranscriptions(prev => [...prev, { text, speaker, timestamp: new Date() }]);
      },
      onInterrupted: () => {},
      onClose: () => {
        setIsConnecting(false);
        setActiveCallContact(null);
      },
      onError: (err) => {
        setIsConnecting(false);
        setActiveCallContact(null);
        alert("Call Error: " + err);
      }
    };

    if (agentRef.current) agentRef.current.stopCall();
    agentRef.current = new GeminiCallAgent();

    const success = await agentRef.current.startCall(handlers, contact);
    if (success) {
      // Small delay to ensure 'onopen' has time to be reflected
      setTimeout(() => setIsConnecting(false), 500);
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: 'calling' } : c));
    } else {
      setIsConnecting(false);
      setActiveCallContact(null);
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
      category: newCategory,
      customScript: newCustomScript
    };
    setContacts([newContact, ...contacts]);
    setNewName(''); setNewPhone(''); setNewCompany(''); setNewCategory(''); setNewCustomScript('');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <header className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-green-600 p-3 rounded-2xl shadow-lg shadow-green-600/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              PAK<span className="text-green-500">SUPPLY</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Calling Agent Pro v2.5</p>
          </div>
        </div>

        <nav className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-700">
          <button onClick={() => setCurrentView(CallView.DASHBOARD)} className={`px-6 py-2 rounded-lg transition-all ${currentView === CallView.DASHBOARD ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400'}`}>Dashboard</button>
          <button onClick={() => setCurrentView(CallView.HISTORY)} className={`px-6 py-2 rounded-lg transition-all ${currentView === CallView.HISTORY ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400'}`}>Settings</button>
        </nav>
      </header>

      <main>
        {currentView === CallView.DASHBOARD ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
                <h3 className="text-lg font-bold mb-4 text-white">Method</h3>
                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl">
                  <button onClick={() => setTelephonyMode('web')} className={`py-2 text-xs font-bold rounded-lg ${telephonyMode === 'web' ? 'bg-green-600 text-white' : 'text-slate-500'}`}>Web Agent</button>
                  <button onClick={() => setTelephonyMode('real')} className={`py-2 text-xs font-bold rounded-lg ${telephonyMode === 'real' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>SIM Gateway</button>
                </div>
              </div>

              <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
                <h3 className="text-lg font-bold mb-4 text-white">Add Individual</h3>
                <form onSubmit={handleAddContact} className="space-y-3">
                  <input type="text" placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:border-green-500 outline-none" />
                  <input type="tel" placeholder="Phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:border-green-500 outline-none" />
                  <textarea placeholder="Custom Script..." value={newCustomScript} onChange={e => setNewCustomScript(e.target.value)} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:border-green-500 outline-none" />
                  <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg">Add to Queue</button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 backdrop-blur-sm">
                <h3 className="text-lg font-bold text-white">Call Queue</h3>
                <span className="text-[10px] font-black uppercase text-slate-500">Mariya Pro Online</span>
              </div>
              <table className="w-full text-left">
                <tbody className="divide-y divide-slate-700/50">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-5">
                        <div className="font-bold text-white text-lg">{contact.name}</div>
                        <div className="text-xs text-slate-400">{contact.phone} • {contact.company}</div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          disabled={isConnecting || !!activeCallContact}
                          onClick={() => handleStartCall(contact)}
                          className={`p-4 rounded-2xl ${telephonyMode === 'real' ? 'bg-blue-600' : 'bg-green-600'} text-white shadow-xl active:scale-90`}
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-2xl">
             <h2 className="text-2xl font-black text-white mb-10">SIM Gateway Settings</h2>
             <label className="block text-xs font-black text-slate-500 uppercase mb-2">Vapi/Retell API Key</label>
             <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 text-white font-mono" placeholder="Enter key..." />
          </div>
        )}
      </main>

      {activeCallContact && (
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
