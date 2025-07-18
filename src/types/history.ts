export interface History {
  id: number;
  subject: string;
  originalEmail: string;
  reply: string;
  language: string;
  tone: string;
  createdAt: Date;
}

export interface CreateHistoryInput {
  subject: string;
  originalEmail: string;
  reply: string;
  language: string;
  tone: string;
} 