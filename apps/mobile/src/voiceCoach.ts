/**
 * 训练语音提醒（FR-066 / M9-voice）
 * 端侧 expo-speech；默认开（自用 Dev Client 取舍）。
 * 原生模块未编入 Dev Client 时静默降级，不崩 App。
 */

type SpeechApi = {
  stop: () => void;
  speak: (
    text: string,
    opts?: { language?: string; rate?: number; pitch?: number },
  ) => void;
};

let Speech: SpeechApi | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Speech = require('expo-speech') as SpeechApi;
} catch {
  Speech = null;
}

/** 产品取舍：本机自用默认开（PRD 写默认关）。 */
let voiceEnabled = true;

function speechAvailable(): boolean {
  if (!Speech) return false;
  try {
    // 旧 Dev Client 无原生模块时，调用会抛 Cannot find native module
    return typeof Speech.speak === 'function';
  } catch {
    return false;
  }
}

export async function hydrateVoiceEnabled(): Promise<boolean> {
  return voiceEnabled;
}

export function isVoiceEnabled(): boolean {
  return voiceEnabled;
}

export async function setVoiceEnabled(on: boolean): Promise<void> {
  voiceEnabled = on;
  if (!on) {
    try {
      Speech?.stop();
    } catch {
      /* ignore */
    }
  }
}

/** 打断旧句后播报；关闭、无原生模块或空文案则忽略。 */
export function speakCoach(message: string): void {
  const text = message.trim();
  if (!voiceEnabled || !text || !Speech) return;
  try {
    Speech.stop();
    Speech.speak(text, {
      language: 'zh-CN',
      rate: 1.05,
      pitch: 1.0,
    });
  } catch {
    /* 无 ExpoSpeech 原生模块时静默 */
  }
}

export function isSpeechNativeReady(): boolean {
  return speechAvailable();
}
