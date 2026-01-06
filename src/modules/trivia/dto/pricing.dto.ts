export interface GamePricing {
  basePrice: number; // Base price per question
  difficultyMultipliers: {
    easy: number;
    medium: number;
    hard: number;
  };
  minQuestions: number;
  maxQuestions: number;
}

export const DEFAULT_TRIVIA_PRICING: GamePricing = {
  basePrice: 10, // 10 coins per question
  difficultyMultipliers: {
    easy: 1.0, // 10 coins per question
    medium: 1.5, // 15 coins per question
    hard: 2.0, // 20 coins per question
  },
  minQuestions: 5,
  maxQuestions: 50,
};

export function calculateEntryFee(
  questionCount: number,
  difficulty: string = 'easy',
  pricing: GamePricing = DEFAULT_TRIVIA_PRICING,
): number {
  const validDifficulties: Record<string, number> = pricing.difficultyMultipliers;
  const multiplier = validDifficulties[difficulty.toLowerCase()] || 1.0;
  return pricing.basePrice * questionCount * multiplier;
}
