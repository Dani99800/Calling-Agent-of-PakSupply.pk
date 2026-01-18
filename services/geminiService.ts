
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../constants';
import { ManufacturerContact } from '../types';

export interface CallHandlers {
  onTranscription: (text: string, speaker: 'agent' | 'user') => void;
  onInterrupted: () => void;
  onClose: () => void;
  onError: (error: string) => void;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class GeminiCallAgent {
  private inputAudioContext?: AudioContext;
  private outputAudioContext?: AudioContext;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private stream?: MediaStream;
  private session?: any;
  private processor?: ScriptProcessorNode;

  async startCall(handlers: CallHandlers, contact: ManufacturerContact) {
    let connectionTimeout: any;

    try {
      console.log('Mariya Web Agent: Initializing...');
      
      if (!process.env.API_KEY) {
        throw new Error("API Key is missing. Please check your environment configuration.");
      }

      // 1. Get Microphone
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Setup Audio Contexts (Mobile Friendly)
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.inputAudioContext = new AudioCtx({ sampleRate: 16000 });
      this.outputAudioContext = new AudioCtx({ sampleRate: 24000 });
      
      await this.inputAudioContext.resume();
      await this.outputAudioContext.resume();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const customTopicContext = contact.customScript 
        ? `\n\n# CUSTOM SCRIPT OVERRIDE:\nTopic: ${contact.category || 'Special'}\nInstructions: ${contact.customScript}\nFocus on this instruction instead of standard PakSupply pitch.`
        : '';

      // 3. Setup Connection with Timeout
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION + customTopicContext,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            clearTimeout(connectionTimeout);
            console.log('Mariya Web Agent: Socket Open');
            
            const micSource = this.inputAudioContext!.createMediaStreamSource(this.stream!);
            this.processor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
            
            this.processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }))
                .catch(err => console.error("Send error:", err));
            };
            
            micSource.connect(this.processor);
            this.processor.connect(this.inputAudioContext!.destination);

            sessionPromise.then(session => {
              session.sendRealtimeInput({ 
                text: contact.customScript 
                  ? `Call started with ${contact.name}. Start conversation about ${contact.category}.`
                  : `Call started with ${contact.name} from ${contact.company}. Start the Mariya pitch.`
              });
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              handlers.onTranscription(message.serverContent.outputTranscription.text, 'agent');
            } else if (message.serverContent?.inputTranscription) {
              handlers.onTranscription(message.serverContent.inputTranscription.text, 'user');
            }

            if (message.serverContent?.modelTurn) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext!.currentTime);
                  const audioBuffer = await decodeAudioData(
                    decode(part.inlineData.data),
                    this.outputAudioContext!,
                    24000,
                    1
                  );
                  const source = this.outputAudioContext!.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(this.outputAudioContext!.destination);
                  source.start(this.nextStartTime);
                  this.nextStartTime += audioBuffer.duration;
                  this.sources.add(source);
                }
              }
            }

            if (message.serverContent?.interrupted) {
              this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
              this.sources.clear();
              this.nextStartTime = 0;
              handlers.onInterrupted();
            }
          },
          onerror: (e: any) => {
            clearTimeout(connectionTimeout);
            handlers.onError('Connection failed. Please ensure your internet is stable and try again.');
          },
          onclose: () => {
            clearTimeout(connectionTimeout);
            handlers.onClose();
          },
        },
      });

      // 4. Set a safety timeout
      connectionTimeout = setTimeout(() => {
        this.stopCall();
        handlers.onError("Connection Timeout: The server didn't respond in time. This usually happens if the preview environment is restricted.");
      }, 15000);

      this.session = await sessionPromise;
      return true;
    } catch (err: any) {
      clearTimeout(connectionTimeout);
      console.error('Call initialization failed:', err);
      handlers.onError(err.message || 'Call failed to start.');
      return false;
    }
  }

  stopCall() {
    this.processor?.disconnect();
    this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
    this.sources.clear();
    this.stream?.getTracks().forEach(t => t.stop());
    if (this.inputAudioContext?.state !== 'closed') this.inputAudioContext?.close();
    if (this.outputAudioContext?.state !== 'closed') this.outputAudioContext?.close();
    if (this.session) {
      try { this.session.close(); } catch(e) {}
    }
  }
}
