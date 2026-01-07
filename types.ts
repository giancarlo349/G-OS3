
export interface Product {
  id: string;
  description: string;
  price: number;
  lastUsed?: number;
  userId: string;
}

export interface QuoteItem {
  id: string;
  description: string;
  price: number;
  quantity: number;
  comment?: string;
  isVerified?: boolean;
}

export type QuoteStatus = 'Pendente' | 'Finalizado' | 'Enviado';

export interface Quote {
  id: string;
  clientName: string;
  clientPhone?: string;
  author: string;
  status: QuoteStatus;
  items: QuoteItem[];
  total: number;
  createdAt: number;
  updatedAt: number;
  userId: string;
}

export interface User {
  uid: string;
  email: string | null;
}
