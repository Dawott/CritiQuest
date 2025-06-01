export class GamificationService {
  //Dynamiczna trudność
  async adjustDifficulty(
    userId: string,
    recentPerformance: number[]
  ): Promise<{
    newDifficulty: number;
    reasoning: string;
  }> {
    const avgPerformance = recentPerformance.reduce((a, b) => a + b) / recentPerformance.length;
    
    let newDifficulty: number;
    let reasoning: string;

    if (avgPerformance > 85) {
      newDifficulty = 1.2; 
      reasoning = "Wysoka skuteczność! Zwiększam trudność.";
    } else if (avgPerformance < 60) {
      newDifficulty = 0.8; 
      reasoning = "Poćwicz jeszcze więcej.";
    } else {
      newDifficulty = 1.0;
      reasoning = "Dobra robota! Utrzymujemy tempo.";
    }

    // Update ustawień trudności
    await this.updateUserDifficulty(userId, newDifficulty);

    return { newDifficulty, reasoning };
  }

  //Dailies

  async generateDailyChallenge(): Promise<{
    type: 'dilemma' | 'paradox' | 'thought_experiment';
    title: string;
    description: string;
    philosopherPerspectives: Record<string, string>;
    rewards: {
      experience: number;
      tickets: number;
      specialPhilosopher?: string;
    };
  }> {
    const challengeTypes = ['dilemma', 'paradox', 'thought_experiment'];
    const type = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];

    // Generuj na bazie typu
    const challenge = await this.createChallenge(type);
    
    // Spojrzenie z innej szkoły
    const perspectives = await this.gatherPhilosopherPerspectives(challenge);

    return {
      type,
      ...challenge,
      philosopherPerspectives: perspectives,
      rewards: this.calculateChallengeRewards(type),
    };
  }

  //Synergie

  calculatePhilosopherSynergy(
    team: string[]
  ): {
    synergies: Array<{
      philosophers: string[];
      bonus: string;
      multiplier: number;
    }>;
    totalBonus: number;
  } {
    const synergies = [];
    
    // PRzykłady
    if (team.includes('plato') && team.includes('aristotle')) {
      synergies.push({
        philosophers: ['plato', 'aristotle'],
        bonus: 'Mistrz i Student',
        multiplier: 1.5,
      });
    }

    if (team.filter(p => ['kant', 'hegel', 'nietzsche'].includes(p)).length >= 2) {
      synergies.push({
        philosophers: team.filter(p => ['kant', 'hegel', 'nietzsche'].includes(p)),
        bonus: 'Idealizm Niemiecki',
        multiplier: 1.3,
      });
    }

    const totalBonus = synergies.reduce((acc, s) => acc * s.multiplier, 1);
    
    return { synergies, totalBonus };
  }
}
