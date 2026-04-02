import { Capacitor, registerPlugin } from '@capacitor/core';

export interface SmsMessage {
  id: number;
  address: string | null;
  body: string;
  date: number;
  read: boolean;
  type: number;
  threadId: number;
}

interface SmsBridgePlugin {
  requestPermission(): Promise<{ granted: boolean }>;
  readInbox(options?: { limit?: number }): Promise<{ messages: SmsMessage[]; count: number }>;
}

const SmsBridge = registerPlugin<SmsBridgePlugin>('SmsBridge');

export function isSmsBridgeAvailable(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export async function requestSmsPermission(): Promise<boolean> {
  if (!isSmsBridgeAvailable()) {
    return false;
  }

  const result = await SmsBridge.requestPermission();
  return Boolean(result.granted);
}

export async function readSmsInbox(limit = 50): Promise<SmsMessage[]> {
  if (!isSmsBridgeAvailable()) {
    throw new Error('当前仅支持 Android 原生短信读取');
  }

  const result = await SmsBridge.readInbox({ limit });
  return result.messages || [];
}