
export interface ManufacturerContact {
  id: string;
  name: string;
  company: string;
  phone: string;
  status: 'idle' | 'calling' | 'completed' | 'failed';
  outcome?: 'agreed' | 'declined' | 'later';
  category?: string;
  customScript?: string;
  notes?: string;
}

export interface TranscriptionItem {
  speaker: 'agent' | 'user';
  text: string;
  timestamp: Date;
}

export enum CallView {
  DASHBOARD = 'dashboard',
  ACTIVE_CALL = 'active_call',
  HISTORY = 'history'
}
