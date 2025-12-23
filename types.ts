
export enum Role {
  USER = 'user',
  JULIA = 'julia'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  audio?: string; // base64 PCM data
  image?: string; // base64 image data for user uploads
  timestamp: Date;
  isCritical?: boolean;
  isConfirmation?: boolean;
  isFinalQuote?: boolean;
  summary?: string;
}

export interface StudioInfo {
  name: string;
  address: string;
  mapsLink: string;
}

export interface BudgetState {
  isCoverUp?: boolean;
  bodyLocation?: string;
  size?: string;
  style?: string;
  isColor?: boolean;
  referenceImage?: string;
}
