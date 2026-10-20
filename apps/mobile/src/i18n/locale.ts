import { File, Paths } from 'expo-file-system';
import { NativeModules, Platform } from 'react-native';
import { EN } from './en';

export type Language = 'zh' | 'en';
export type LanguagePreference = 'system' | Language;

type LocaleState = {
  preference: LanguagePreference;
  language: Language;
};

const FILE_NAME = 'locale-v1.json';

let state: LocaleState = {
  preference: 'system',
  language: systemLanguage(),
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLanguage(): Language {
  return state.language;
}

export function getLanguagePreference(): LanguagePreference {
  return state.preference;
}

export function systemLanguage(): Language {
  let tag = '';
  try {
    tag = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
  } catch {
    tag = '';
  }
  if (!tag && Platform.OS === 'ios') {
    const settings = NativeModules.SettingsManager?.settings as
      | { AppleLocale?: string; AppleLanguages?: string[] }
      | undefined;
    const languages = settings?.AppleLanguages;
    if (Array.isArray(languages) && typeof languages[0] === 'string') {
      tag = languages[0];
    } else if (typeof settings?.AppleLocale === 'string') {
      tag = settings.AppleLocale;
    }
  }
  if (!tag) return 'zh';
  return tag.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function speechLanguage(): string {
  return state.language === 'en' ? 'en-US' : 'zh-CN';
}

function apply(preference: LanguagePreference): void {
  state = {
    preference,
    language: preference === 'system' ? systemLanguage() : preference,
  };
  emit();
}

export async function hydrateLocale(): Promise<void> {
  try {
    const file = new File(Paths.document, FILE_NAME);
    if (!file.exists) {
      apply('system');
      return;
    }
    const raw = JSON.parse(await file.text()) as { preference?: string };
    const preference = raw.preference;
    if (preference === 'zh' || preference === 'en' || preference === 'system') {
      apply(preference);
      return;
    }
  } catch {
    /* 读不到就跟系统 */
  }
  apply('system');
}

export async function setLanguagePreference(
  preference: LanguagePreference,
): Promise<void> {
  apply(preference);
  const file = new File(Paths.document, FILE_NAME);
  if (!file.exists) file.create();
  file.write(JSON.stringify({ preference }));
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const JOINT_EN: Record<string, string> = {
  脚尖: 'toes',
  肩: 'shoulders',
  肘: 'elbows',
  髋: 'hips',
  膝: 'knees',
  踝: 'ankles',
  腕: 'wrists',
};

function joints(text: string): string {
  const names: string[] = [];
  const leftover = text
    .replace(/脚尖|肩|肘|髋|膝|踝|腕/g, (token) => {
      const name = JOINT_EN[token];
      if (name) names.push(name);
      return '';
    })
    .replace(/[、和\s]/g, '')
    .trim();
  if (names.length === 0) return leftover || text;
  if (names.length === 1) return names[0] ?? leftover;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function poseHint(text: string): string {
  const known = EN[text];
  if (known) return known;
  const rules: Array<[RegExp, string]> = [
    [/^请把手机放远，让(.+)入画后再计秒$/, '$1 in frame'],
    [/^请把手机放远，让(.+)入画，勿挡住镜头$/, '$1 in frame'],
    [/^请把手机放远，让(.+)入画$/, '$1 in frame'],
    [/^请后退，让(.+)入画后再计秒$/, '$1 in frame'],
    [/^请后退，让(.+)入画$/, '$1 in frame'],
    [/^请让(.+)入画$/, '$1 in frame'],
    [/^请把手机放远并侧对镜头，(.+)入画后再计秒$/, '$1 in frame'],
    [/^(.+)入画即可，(.+)$/, '$1 in frame'],
    [/^(.+)入画即可$/, '$1 in frame'],
  ];
  for (const [re, template] of rules) {
    const match = re.exec(text);
    if (!match) continue;
    return template
      .replace('$1', joints(match[1] ?? ''))
      .replace('$2', EN[match[2] ?? ''] ?? match[2] ?? '');
  }
  return text;
}

function one(text: string): string {
  const known = EN[text];
  if (known) return known;
  const day = /^(\d+)月(\d+)日$/.exec(text);
  if (day) {
    const month = Number(day[1]);
    const date = Number(day[2]);
    const name = MONTHS[month - 1] ?? String(month);
    return `${name} ${date}`;
  }
  const sets = /^(.*?) (\d+)组$/.exec(text);
  if (sets) {
    const name = EN[sets[1] ?? ''] ?? sets[1] ?? '';
    const n = Number(sets[2]);
    return `${name} ${n} ${n === 1 ? 'set' : 'sets'}`;
  }
  const volume = /^容量 (\d+(?:\.\d+)?) kg$/.exec(text);
  if (volume) return `Volume ${volume[1]} kg`;
  const yearMonth = /^(\d+)年(\d+)月$/.exec(text);
  if (yearMonth) {
    const month = Number(yearMonth[2]);
    return `${MONTHS[month - 1] ?? month} ${yearMonth[1]}`;
  }
  const more = /^还有 (\d+) 个$/.exec(text);
  if (more) return `${more[1]} more`;
  const lastSignIn = /^上次登录：(.+)$/.exec(text);
  if (lastSignIn) return `Last sign-in: ${lastSignIn[1] ?? ''}`;
  const fault = /^查看上次问题 · (\d+)$/.exec(text);
  if (fault) return `Last issue · ${fault[1]}`;
  if (text.startsWith('请调整姿势')) {
    const body = text.replace(/^请调整姿势\s*[·•]?\s*/, '');
    return `Adjust your position · ${poseHint(body)}`;
  }
  return poseHint(text);
}

export function translate(text: string, language: Language = state.language): string {
  if (language === 'zh' || text.length === 0) return text;
  if (text.includes(' · ')) {
    return text
      .split(' · ')
      .map((part) => one(part))
      .join(' · ');
  }
  return one(text);
}
