import { Quiz, Question, QuizType } from '@/types/database.types';
import DatabaseService from './firebase/database.service';
import { GamificationService } from './gamification.service';

interface QuizGenerationOptions {
  concepts: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questionCount: number;
  type: QuizType;
  philosopherContext?: string;
}

interface QuizReward {
  experience: number;
  tickets: number;
  philosopherChance?: number;
  possiblePhilosophers?: string[];
}

export class QuizService {
  private gamificationService = new GamificationService();

  //Generuj na podstawie zaawansowania
  async generateAdaptiveQuiz(
    userId: string,
    lessonId: string,
    options: Partial<QuizGenerationOptions> = {}
  ): Promise<Quiz> {
    // Pobierz ostatnie wyniki
    const userStats = await this.getUserQuizStats(userId);
    const difficulty = await this.calculateAdaptiveDifficulty(userId, userStats);
    
    // Pobierz dane lekcji
    const lesson = await DatabaseService.getLesson(lessonId);
    if (!lesson) throw new Error('Lekcja nie znaleziona');

    // Generuj na bazie trudności i koncepcji
    const questions = await this.generateQuestions({
      concepts: lesson.philosophicalConcepts,
      difficulty: difficulty.level,
      questionCount: options.questionCount || 5,
      type: options.type || 'multiple-choice',
      philosopherContext: options.philosopherContext,
    });

    // Quiz z dynamicznym wynikiem zdawania
    const passingScore = this.calculatePassingScore(difficulty.level, questions);

    return {
      lessonId,
      title: `${lesson.title} - Quiz`,
      type: options.type || 'multiple-choice',
      timeLimit: this.calculateTimeLimit(questions, difficulty.level),
      questions,
      passingScore,
      philosopherBonus: await this.getPhilosopherBonus(userId, lesson.philosophicalConcepts),
    };
  }

  //Generuj scenariusze
  async generateScenario(
    concept: string,
    philosophicalSchools: string[]
  ): Promise<Question> {
    // Scenariusze predefiniowane - można generować też AI
    const scenarios = {
      ethics: {
        trolleyProblem: {
          text: "Jesteś świadkiem sytuacji: wagonik wymknął się spod kontroli i pędzi w stronę pięciu pracowników na torach. Możesz przestawić zwrotnicę, kierując wagonik na boczny tor, gdzie znajduje się jeden pracownik. Co zrobisz?",
          options: [
            "Przestawię zwrotnicę, ratując pięć osób kosztem jednej",
            "Nie zrobię nic, pozwalając wydarzeniom toczyć się naturalnie",
          ],
          philosophicalContext: "Klasyczny dylemat etyczny badający konflikt między konsekwencjalizmem a deontologią",
        },
        lifeboat: {
          text: "Statek tonie, a w szalupie ratunkowej jest miejsce tylko dla 10 z 15 osób. Jako kapitan, jak zdecydujesz kto zostanie uratowany?",
          options: [
            "Losowanie - wszyscy mają równe szanse",
            "Priorytet dla młodych i zdrowych",
            "Priorytet dla tych z rodzinami na utrzymaniu",
            "Pierwszy przybył, pierwszy obsłużony",
          ],
          philosophicalContext: "Dylemat sprawiedliwości dystrybutywnej i wartości życia",
        },
      },
      epistemology: {
        cave: {
          text: "Wyobraź sobie, że całe życie spędziłeś w jaskini, widząc tylko cienie na ścianie. Nagle ktoś mówi ci, że to nie jest prawdziwy świat. Czy uwierzysz?",
          options: [
            "Tak, jestem gotów zakwestionować swoją rzeczywistość",
            "Nie, moje doświadczenie jest jedyną prawdą którą znam",
            "Potrzebuję dowodów zanim zmienię swoje przekonania",
          ],
          philosophicalContext: "Alegoria jaskini Platona - natura rzeczywistości i wiedzy",
        },
      },
    };

    // Wybierz poprawny scenariusz
    const scenarioSet = scenarios[concept] || scenarios.ethics;
    const scenarioKeys = Object.keys(scenarioSet);
    const selectedKey = scenarioKeys[Math.floor(Math.random() * scenarioKeys.length)];
    const scenario = scenarioSet[selectedKey];

    return {
      id: `scenario_${concept}_${Date.now()}`,
      text: scenario.text,
      type: 'scenario',
      options: scenario.options,
      correctAnswers: [], // Scenariusze nie mają dobrych odpowiedzi
      explanation: "W dylematach etycznych nie ma jednoznacznie poprawnych odpowiedzi. Liczy się proces myślenia i uzasadnienie wyboru.",
      philosophicalContext: scenario.philosophicalContext,
      points: 20,
    };
  }

  // Performance - nagrody
  async calculateRewards(
    userId: string,
    quizId: string,
    score: number,
    timeSpent: number,
    perfectStreak: boolean
  ): Promise<QuizReward> {
    const quiz = await DatabaseService.getQuiz(quizId);
    if (!quiz) throw new Error('Brak quizu');

    let baseExperience = Math.round(score * 10);
    let tickets = 0;
    let philosopherChance = 0;

    // Bonusy
    if (score >= 90) {
      baseExperience *= 1.5;
      tickets = 2;
      philosopherChance = 0.1; // 10%
    } else if (score >= 80) {
      baseExperience *= 1.2;
      tickets = 1;
      philosopherChance = 0.05; // 5%
    } else if (score >= quiz.passingScore) {
      baseExperience *= 1.1;
      tickets = 1;
    }

    // Bonus czas
    if (quiz.timeLimit && timeSpent < quiz.timeLimit * 0.5) {
      baseExperience *= 1.1;
    }

    // Perfect streak bonus
    if (perfectStreak) {
      baseExperience *= 1.3;
      philosopherChance += 0.15; // +15%
      tickets += 1;
    }

    // Philosopher bonus
    const userPhilosophers = await DatabaseService.getUserPhilosophers(userId);
    if (quiz.philosopherBonus && userPhilosophers[quiz.philosopherBonus.philosopherId]) {
      baseExperience *= quiz.philosopherBonus.bonusMultiplier;
    }

    // Nagrody
    const possiblePhilosophers = await this.selectRewardPhilosophers(
      quiz.lessonId,
      score,
      philosopherChance
    );

    return {
      experience: Math.round(baseExperience),
      tickets,
      philosopherChance,
      possiblePhilosophers,
    };
  }

  //Analityka
  async analyzePerformance(
    userId: string,
    quizId: string,
    answers: Record<string, string[]>
  ): Promise<{
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    philosophicalAlignment: string;
  }> {
    const quiz = await DatabaseService.getQuiz(quizId);
    if (!quiz) throw new Error('Brak quizu');

    const analysis = {
      conceptScores: {} as Record<string, number>,
      responsePatterns: [] as string[],
      timePerQuestion: [] as number[],
    };

    // Analiza odpowiedzi
    quiz.questions.forEach((question) => {
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer?.sort().join(',') === question.correctAnswers.sort().join(',');

      // Performance
      const concept = question.philosophicalContext;
      if (concept) {
        analysis.conceptScores[concept] = (analysis.conceptScores[concept] || 0) + 
          (isCorrect ? question.points : 0);
      }

      // Wzorce
      if (question.type === 'scenario') {
        analysis.responsePatterns.push(userAnswer?.[0] || 'no-answer');
      }
    });

    // Siły/słabości
    const strengths = Object.entries(analysis.conceptScores)
      .filter(([_, score]) => score > 15)
      .map(([concept]) => concept);

    const weaknesses = Object.entries(analysis.conceptScores)
      .filter(([_, score]) => score < 10)
      .map(([concept]) => concept);

    // Alignment
    const philosophicalAlignment = this.determinePhilosophicalAlignment(
      analysis.responsePatterns
    );

    // Rekomendacje
    const recommendations = this.generateRecommendations(
      strengths,
      weaknesses,
      philosophicalAlignment
    );

    return {
      strengths,
      weaknesses,
      recommendations,
      philosophicalAlignment,
    };
  }

  // Helpery
  private async getUserQuizStats(userId: string) {
    // 10 ostatnich rezulatów
    const quizHistory = await DatabaseService.getUserQuizHistory(userId, 10);
    
    return {
      averageScore: quizHistory.reduce((sum, q) => sum + q.score, 0) / quizHistory.length || 0,
      completionRate: quizHistory.filter(q => q.completed).length / quizHistory.length || 0,
      averageTime: quizHistory.reduce((sum, q) => sum + q.timeSpent, 0) / quizHistory.length || 0,
    };
  }

  private async calculateAdaptiveDifficulty(userId: string, stats: any) {
    const performance = [stats.averageScore];
    const difficultyAdjustment = await this.gamificationService.adjustDifficulty(
      userId,
      performance
    );

    const difficultyMap = {
      0.8: 'beginner',
      1.0: 'intermediate',
      1.2: 'advanced',
    } as const;

    return {
      level: difficultyMap[difficultyAdjustment.newDifficulty] || 'intermediate',
      multiplier: difficultyAdjustment.newDifficulty,
      reasoning: difficultyAdjustment.reasoning,
    };
  }

  private calculatePassingScore(
    difficulty: string,
    questions: Question[]
  ): number {
    const baseScore = {
      beginner: 60,
      intermediate: 70,
      advanced: 80,
    };

    return baseScore[difficulty] || 70;
  }

  private calculateTimeLimit(
    questions: Question[],
    difficulty: string
  ): number {
    const timePerQuestion = {
      'single': 30,
      'multiple': 45,
      'scenario': 120,
    };

    const difficultyMultiplier = {
      beginner: 1.2,
      intermediate: 1.0,
      advanced: 0.8,
    };

    const totalTime = questions.reduce((sum, q) => 
      sum + (timePerQuestion[q.type] || 30), 0
    );

    return Math.round(totalTime * (difficultyMultiplier[difficulty] || 1) / 60); // Convert to minutes
  }

  private async getPhilosopherBonus(userId: string, concepts: string[]) {
    const userPhilosophers = await DatabaseService.getUserPhilosophers(userId);
     // Sprawdź zbliżonych filozofów
    const relevantPhilosophers = Object.keys(userPhilosophers).filter(id => {
      // Mock
      return Math.random() > 0.7; // 30% - demo
    });

    if (relevantPhilosophers.length > 0) {
      return {
        philosopherId: relevantPhilosophers[0],
        bonusMultiplier: 1.2,
      };
    }

    return undefined;
  }

  private async selectRewardPhilosophers(
    lessonId: string,
    score: number,
    chance: number
  ): Promise<string[]> {
    if (Math.random() > chance) return [];

    // Mock data
    return ['socrates', 'plato'];
  }

  private determinePhilosophicalAlignment(patterns: string[]): string {
    // Wzorce
    
    const utilitarian = patterns.filter(p => p.includes('większość')).length;
    const deontological = patterns.filter(p => p.includes('obowiązek')).length;
    
    if (utilitarian > deontological) return 'Utylitarysta';
    if (deontological > utilitarian) return 'Deontolog';
    return 'Eklektyk';
  }

  private generateRecommendations(
    strengths: string[],
    weaknesses: string[],
    alignment: string
  ): string[] {
    const recommendations = [];

    if (weaknesses.includes('ethics')) {
      recommendations.push('Spróbuj lekcji "Podstawy etyki normatywnej"');
    }

    if (alignment === 'Utylitarysta') {
      recommendations.push('Poznaj perspektywę Kanta na etykę obowiązku');
    }

    if (strengths.includes('logic')) {
      recommendations.push('Jesteś gotowy na zaawansowane paradoksy logiczne');
    }

    return recommendations;
  }

  private async generateQuestions(
    options: QuizGenerationOptions
  ): Promise<Question[]> {
    // Mock
    const questions: Question[] = [];
    
    for (let i = 0; i < options.questionCount; i++) {
      if (options.type === 'scenario' && i === 0) {
        questions.push(await this.generateScenario(
          options.concepts[0],
          ['utylitaryzm', 'deontologia']
        ));
      } else {
        questions.push({
          id: `q_${i}_${Date.now()}`,
          text: `Pytanie ${i + 1} o ${options.concepts[i % options.concepts.length]}`,
          type: 'single',
          options: ['Opcja A', 'Opcja B', 'Opcja C', 'Opcja D'],
          correctAnswers: ['Opcja A'],
          explanation: 'Wyjaśnienie odpowiedzi...',
          philosophicalContext: options.concepts[i % options.concepts.length],
          points: 10,
        });
      }
    }
    
    return questions;
  }
}

export default new QuizService();