
import { Product, QuoteItem } from "../types";

// IA desativada temporariamente para evitar erros de quota
// O sistema agora prioriza o banco de dados local do Firebase

export const getAIPrediction = async (partialDescription: string, history: Product[]): Promise<Partial<Product>[]> => {
  // Retornamos vazio para não disparar chamadas de API
  return [];
};

export const analyzeQuote = async (items: QuoteItem[]): Promise<{ suggestions: string[], healthScore: number }> => {
  // Retorno padrão de sucesso manual
  return { 
    suggestions: ["Análise de IA desativada. Use a conferência manual."], 
    healthScore: 100 
  };
};
