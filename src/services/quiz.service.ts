import { Quiz, Question, QuizType } from '@/types/database.types';
import DatabaseService from './firebase/database.service';
import { Difficulty } from '@/types/database.types';
import { GamificationService } from './gamification.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuizResult, QuizSession } from '@/store/quizAtoms';
import NetInfo from '@react-native-community/netinfo';
import { getErrorMessage } from '../utils/error.utils';

interface QuizGenerationOptions {
  concepts: string[];
  difficulty: Difficulty;
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

  // Dynamiczny quiz na bazie progresu
  async generateAdaptiveQuiz(
    userId: string,
    lessonId: string,
    options: Partial<QuizGenerationOptions> = {}
  ): Promise<Quiz> {
    // Pobierz wyniki
    const userStats = await this.getUserQuizStats(userId);
    const difficulty = await this.calculateAdaptiveDifficulty(userId, userStats);
    
    // Pobierz dane lekcji
    const lesson = await DatabaseService.getLesson(lessonId);
    if (!lesson) throw new Error('Lekcji brak');

    // Generuj na bazie koncepcji i poziomu
    const questions = await this.generateQuestions({
      concepts: lesson.philosophicalConcepts,
      difficulty: difficulty.level,
      questionCount: options.questionCount || 5,
      type: options.type || 'multiple-choice',
      philosopherContext: options.philosopherContext,
    });

    // Dynamiczne wyniki zaliczenia
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
    // Typy scenariuszy
    type ScenarioCategory = 'ethics' | 'epistemology' | 'metaphysics' | 'aesthetics' | 'social' | 'science' | 'mind';
    
    interface Scenario {
      text: string;
      options: string[];
      philosophicalContext: string;
    }
    
    // Predefinowane scenariusze do dema
    const scenarios: Record<ScenarioCategory, Record<string, Scenario>> = {
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
      metaphysics: {
        shipOfTheseus: {
          text: "Statek Tezeusza jest stopniowo naprawiany - każda deska jest wymieniana na nową. Po wymianie wszystkich części, czy to wciąż ten sam statek?",
          options: [
            "Tak, tożsamość obiektu nie zależy od jego części materialnych",
            "Nie, to zupełnie nowy statek",
            "To zależy od ciągłości funkcji i formy",
            "Pytanie nie ma sensu - tożsamość to iluzja",
          ],
          philosophicalContext: "Problem tożsamości i ciągłości bytów w czasie",
        },
      },
      aesthetics: {
        artValue: {
          text: "Obraz namalowany przez sztuczną inteligencję wygrywa konkurs sztuki. Czy może być uznany za prawdziwe dzieło sztuki?",
          options: [
            "Tak, liczy się efekt końcowy, nie proces twórczy",
            "Nie, sztuka wymaga ludzkiej intencji i emocji",
            "To zależy od tego, czy wywołuje emocje u odbiorcy",
            "Pytanie redefiniuje nasze rozumienie sztuki",
          ],
          philosophicalContext: "Natura sztuki i rola twórcy w procesie artystycznym",
        },
    },
        social: {
        veilOfIgnorance: {
          text: "Projektujesz system społeczny, ale nie wiesz, jaką pozycję w nim zajmiesz - możesz być bogaty lub biedny, zdrowy lub chory, większością lub mniejszością. Jaki system wybierzesz?",
          options: [
            "Egalitarny - równy dostęp do zasobów i możliwości dla wszystkich",
            "Merytokratyczny - nagrody proporcjonalne do wysiłku i talentu",
            "Libertariański - minimalna ingerencja, maksymalna wolność jednostki",
            "Utylitarny - maksymalizacja ogólnego dobrostanu społeczeństwa",
          ],
          philosophicalContext: "Zasłona niewiedzy Rawlsa - sprawiedliwość jako bezstronność",
        },
        paradoxOfTolerance: {
          text: "Społeczeństwo tolerancyjne akceptuje wszystkie poglądy. Grupa otwarcie głosi nietolerancję i dąży do zniszczenia tolerancji. Czy należy tolerować nietolerancję?",
          options: [
            "Tak, tolerancja musi być absolutna, inaczej staje się hipokryzją",
            "Nie, tolerancja wobec nietolerancji prowadzi do zniszczenia tolerancji",
            "To zależy od tego, czy nietolerancja przejawia się w działaniach czy tylko słowach",
            "Należy edukować, nie wykluczać - dialog jest kluczem",
          ],
          philosophicalContext: "Paradoks tolerancji Poppera - granice otwartego społeczeństwa",
        },
      },
      science: {
        laplaceDemon: {
          text: "Hipotetyczna istota zna położenie i pęd każdej cząstki we wszechświecie. Czy może przewidzieć całą przyszłość, łącznie z twoimi decyzjami?",
          options: [
            "Tak, wszechświat jest deterministyczny, wolna wola to iluzja",
            "Nie, mechanika kwantowa wprowadza fundamentalną nieprzewidywalność",
            "Nie, świadomość i wolna wola wykraczają poza fizykę",
            "To pytanie przekracza granice ludzkiego poznania",
          ],
          philosophicalContext: "Demon Laplace'a - determinizm, przewidywalność i wolna wola",
        },
        galileoChoice: {
          text: "Twoje badania naukowe dowodzą teorii sprzecznej z dominującym światopoglądem. Publikacja grozi ci ostracyzmem lub gorzej. Co robisz?",
          options: [
            "Publikuję - prawda naukowa jest najważniejsza",
            "Czekam na lepszy moment społeczny do publikacji",
            "Publikuję anonimowo, chroniąc siebie i rozpowszechniając wiedzę",
            "Nie publikuję - bezpieczeństwo moje i bliskich jest ważniejsze",
          ],
          philosophicalContext: "Konflikt Galileusza - prawda naukowa vs presja społeczna",
        },
      },
      mind: {
        chineseRoom: {
          text: "Osoba w pokoju otrzymuje chińskie znaki i według instrukcji układa odpowiedzi, nie znając chińskiego. Czy 'rozumie' chiński?",
          options: [
            "Tak, jeśli odpowiedzi są poprawne, to jest rozumienie",
            "Nie, wykonuje tylko mechaniczne operacje bez zrozumienia",
            "System jako całość rozumie, nawet jeśli osoba nie rozumie",
            "Pytanie błędnie definiuje czym jest 'rozumienie'",
          ],
          philosophicalContext: "Chiński pokój Searle'a - czy sztuczna inteligencja może naprawdę rozumieć?",
        },
        teleporter: {
          text: "Teleporter skanuje twoje ciało, niszczy je, i odtwarza idealną kopię w innym miejscu. Kopia ma wszystkie twoje wspomnienia. Czy to nadal ty?",
          options: [
            "Tak, tożsamość to ciągłość psychologiczna, nie fizyczna",
            "Nie, oryginalne 'ja' umiera, powstaje tylko kopia",
            "To zależy od tego, czy świadomość może być przeniesiona",
            "Pytanie pokazuje, że 'ja' to użyteczna iluzja",
          ],
          philosophicalContext: "Problem tożsamości osobowej i ciągłości świadomości",
        },
      },
    };

    // Type guard
    const isValidCategory = (c: string): c is ScenarioCategory => {
      return c in scenarios;
    };

    // Wybierz konkretny scenariusz
    const category: ScenarioCategory = isValidCategory(concept) ? concept : 'ethics';
    const scenarioSet = scenarios[category];
    
    const scenarioKeys = Object.keys(scenarioSet);
    const selectedKey = scenarioKeys[Math.floor(Math.random() * scenarioKeys.length)];
    const scenario = scenarioSet[selectedKey];

    return {
      id: `scenario_${concept}_${Date.now()}`,
      text: scenario.text,
      type: 'scenario',
      options: scenario.options,
      correctAnswers: [], // Brak "poprawnych" odpowiedzi
      explanation: "W dylematach etycznych nie ma jednoznacznie poprawnych odpowiedzi. Liczy się proces myślenia i uzasadnienie wyboru.",
      philosophicalContext: scenario.philosophicalContext,
      points: 20,
    };
  }

  //Kalkulacja nagród n/b wyniku
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

    // Performance bonus
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

    // Time bonus
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

    // Nagrody możliwe za filozofa
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
    if (!quiz) throw new Error('Quiz not found');

    const analysis = {
      conceptScores: {} as Record<string, number>,
      responsePatterns: [] as string[],
      timePerQuestion: [] as number[],
    };

    // Analiza pytań
    quiz.questions.forEach((question) => {
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer?.sort().join(',') === question.correctAnswers.sort().join(',');

      const concept = question.philosophicalContext;
      if (concept) {
        analysis.conceptScores[concept] = (analysis.conceptScores[concept] || 0) + 
          (isCorrect ? question.points : 0);
      }

      // Wzorce odpowiedzi
      if (question.type === 'scenario') {
        analysis.responsePatterns.push(userAnswer?.[0] || 'no-answer');
      }
    });

    // Siły i słabości
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
    // 10 ostatnich wyników
    const quizHistory = await DatabaseService.getUserQuizHistory(userId, 10);
    
    return {
      averageScore: quizHistory.reduce((sum, q) => sum + q.score, 0) / quizHistory.length || 0,
      completionRate: quizHistory.filter(q => q.completed).length / quizHistory.length || 0,
      averageTime: quizHistory.reduce((sum, q) => sum + q.timeSpent, 0) / quizHistory.length || 0,
    };
  }

  private async calculateAdaptiveDifficulty(userId: string, stats: any) {
    //type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
    type DifficultyMultiplier = 0.8 | 1.0 | 1.2;
    
    const performance = [stats.averageScore];
    const difficultyAdjustment = await this.gamificationService.adjustDifficulty(
      userId,
      performance
    );

    const difficultyMap: Record<DifficultyMultiplier, Difficulty> = {
      0.8: 'beginner',
      1.0: 'intermediate',
      1.2: 'advanced',
    };

    const multiplier = difficultyAdjustment.newDifficulty as DifficultyMultiplier;
    
    return {
      level: difficultyMap[multiplier] || 'intermediate',
      multiplier: difficultyAdjustment.newDifficulty,
      reasoning: difficultyAdjustment.reasoning,
    };
  }

  private calculatePassingScore(
    difficulty: string,
    questions: Question[]
  ): number {
    type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
    
    const baseScore: Record<DifficultyLevel, number> = {
      beginner: 60,
      intermediate: 70,
      advanced: 80,
    };

    const isDifficultyLevel = (d: string): d is DifficultyLevel => {
      return d in baseScore;
    };

    return isDifficultyLevel(difficulty) ? baseScore[difficulty] : 70;
  }

  private calculateTimeLimit(
    questions: Question[],
    difficulty: string
  ): number {
    const timePerQuestion = {
      'single': 30,
      'multiple': 45,
      'scenario': 120,
      'debate': 180,
    };

    const difficultyMultiplier = {
      beginner: 1.2,
      intermediate: 1.0,
      advanced: 0.8,
      expert: 0.5,
    };

    const isDifficultyLevel = (d: string): d is Difficulty => {
      return d in difficultyMultiplier;
    };

    const totalTime = questions.reduce((sum, q) => 
      sum + (timePerQuestion[q.type] || 30), 0
    );

    const multiplier = isDifficultyLevel(difficulty) ? difficultyMultiplier[difficulty] : 1;
    return Math.round(totalTime * multiplier / 60); // Minuty
  }

  private async getPhilosopherBonus(userId: string, concepts: string[]) {
    const userPhilosophers = await DatabaseService.getUserPhilosophers(userId);
    
    // TBD - mapping filozofów
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

    // Mock
    return ['socrates', 'plato'];
  }

  private determinePhilosophicalAlignment(patterns: string[]): string {
    // Mocki
    
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
    // Mocki
    
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

  calculateQuizResults(session: QuizSession, progress: any, timer: any): QuizResult {
    const { quiz, answers, debateResults, philosopherBonus, hintsUsed } = session;
    
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const earnedPoints = progress.criticalThinkingScore;
    const score = Math.round((earnedPoints / totalPoints) * 100);
    
    let experience = Math.round(earnedPoints * 10);
    
    if (philosopherBonus) {
      experience = Math.round(experience * philosopherBonus.multiplier);
    }

    if (score === 100 && progress.correctStreak === quiz.questions.length) {
      experience = Math.round(experience * 1.5);
    }

    if (quiz.timeLimit && timer.elapsed < quiz.timeLimit * 0.5) {
      experience = Math.round(experience * 1.2);
    }

    let tickets = 0;
    if (score >= quiz.passingScore) {
      tickets = Math.ceil(score / 20);
    }

    if (progress.correctStreak >= 3) {
      tickets += 1;
    }

    if (hintsUsed > 0) {
      experience = Math.round(experience * Math.max(0.8, 1 - (hintsUsed * 0.1)));
    }

    const insights = this.generatePhilosophicalInsights(session, progress, score);

    return {
      score,
      totalPoints,
      correctAnswers: progress.questionsAnswered,
      totalQuestions: quiz.questions.length,
      timeSpent: timer.elapsed,
      philosophicalInsights: insights,
      rewards: {
        experience,
        tickets,
        newPhilosopher: score === 100 ? 'reward_philosopher' : undefined
      }
    };
  }

  async checkNetworkStatus(): Promise<boolean> {
    try {
      const networkState = await NetInfo.fetch();
      return (networkState.isConnected ?? false) && (networkState.isInternetReachable ?? false);
    } catch (error) {
      console.error('Network check failed:', error);
      return false;
    }
  }

  async storeOfflineSubmission(session: QuizSession, result: QuizResult, userId: string): Promise<void> {
    try {
      const offlineSubmissions = await AsyncStorage.getItem('offlineQuizzes') || '[]';
      const submissions = JSON.parse(offlineSubmissions);
      
      submissions.push({
        id: `offline_${Date.now()}`,
        session,
        result,
        userId,
        timestamp: Date.now()
      });
      
      await AsyncStorage.setItem('offlineQuizzes', JSON.stringify(submissions));
      console.log('Quiz zapisany offline');
    } catch (error) {
      console.error('Nie udało się zapisać offline:', error);
      throw new Error('Nie udało się zapisać offline');
    }
  }

  private generatePhilosophicalInsights(
    session: QuizSession,
    progress: any,
    score: number
  ): string[] {
    const insights: string[] = [];
    const { quiz, answers, debateResults } = session;

    if (score >= 95) {
      insights.push("Exceptional philosophical reasoning! You demonstrate mastery of complex concepts.");
    } else if (score >= 85) {
      insights.push("Strong philosophical understanding. You're thinking like a true philosopher.");
    } else if (score >= 70) {
      insights.push("Good philosophical foundation. Continue exploring these ideas deeply.");
    } else if (score >= 50) {
      insights.push("Philosophy is about questioning and learning. Every attempt makes you wiser.");
    } else {
      insights.push("Remember: in philosophy, struggling with ideas is part of the growth process.");
    }

    const questionTypes = quiz.questions.map(q => q.type);
    
    if (questionTypes.includes('scenario')) {
      const scenarioAnswers = Object.entries(answers).filter(([qId]) => {
        const question = quiz.questions.find(q => q.id === qId);
        return question?.type === 'scenario';
      });
      
      if (scenarioAnswers.length > 0) {
        insights.push("Your ethical reasoning shows thoughtful consideration of moral complexities.");
      }
    }

    if (questionTypes.includes('debate') && debateResults) {
      const victories = Object.values(debateResults).filter(r => r.winner === 'user').length;
      if (victories > 0) {
        insights.push(`You won ${victories} philosophical debate(s), showing strong argumentative skills.`);
      }
    }

    if (session.quiz.timeLimit && session.timeElapsed < session.quiz.timeLimit * 0.5) {
      insights.push("Your quick thinking demonstrates intuitive understanding of philosophical concepts.");
    } else if (session.quiz.timeLimit && session.timeElapsed > session.quiz.timeLimit * 0.9) {
      insights.push("Taking time to think deeply is a hallmark of philosophical wisdom.");
    }

    if (progress.correctStreak === quiz.questions.length) {
      insights.push("Perfect consistency! You maintained clarity throughout the entire quiz.");
    } else if (progress.correctStreak >= Math.floor(quiz.questions.length * 0.7)) {
      insights.push("Strong consistency in your reasoning shows developing philosophical maturity.");
    }
    return insights;
  }

  async submitQuizWithOfflineSupport(
    session: QuizSession,
    progress: any,
    timer: any,
    userId: string
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    isOffline?: boolean;
  }> {
    try {
      const result = this.calculateQuizResults(session, progress, timer);
      
      const isOnline = await this.checkNetworkStatus();
      
      if (isOnline) {
        await DatabaseService.submitQuizResult(userId, session.quizId, result.score, timer.elapsed);
        await this.updateUserStatsAfterQuiz(userId, result);
        return { success: true, result };
      } else {
        await this.storeOfflineSubmission(session, result, userId);
        return { success: true, result, isOffline: true };
      }
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }
/*
  private async storeOfflineSubmission(session: QuizSession, result: any, userId: string) {
    const offlineSubmissions = await AsyncStorage.getItem('offlineQuizzes') || '[]';
    const submissions = JSON.parse(offlineSubmissions);
    
    submissions.push({
      id: `offline_${Date.now()}`,
      session,
      result,
      userId,
      timestamp: Date.now()
    });
    
    await AsyncStorage.setItem('offlineQuizzes', JSON.stringify(submissions));
  }*/

    private async updateUserStatsAfterQuiz(userId: string, result: QuizResult): Promise<void> {
    try {
      await this.gamificationService.addExperience(userId, result.rewards.experience);
      
      if (result.rewards.tickets > 0) {
        await DatabaseService.updateUserStats(userId, {
          gachaTickets: result.rewards.tickets
        });
      }

      // Check for achievements
      if (result.score === 100) {
        await this.gamificationService.checkAchievement(userId, 'perfect_quiz');
      }
      
      if (result.timeSpent < 300) { 
        await this.gamificationService.checkAchievement(userId, 'speed_thinker');
      }
      
    } catch (error) {
      console.error('Failed to update user stats:', error);
    }
  }

  async processOfflineSubmissions(userId: string): Promise<number> {
    const offlineSubmissions = await AsyncStorage.getItem('offlineQuizzes') || '[]';
    const submissions = JSON.parse(offlineSubmissions);
    
    let processed = 0;
    const remaining = [];
    
    for (const submission of submissions) {
      try {
        await DatabaseService.submitQuizResult(
          submission.userId, 
          submission.session.quizId, 
          submission.result.score, 
          submission.result.timeSpent
        );
        await this.updateUserStatsAfterQuiz(submission.userId, submission.result);
        processed++;
      } catch (error) {
        remaining.push(submission);
      }
    }
    
    await AsyncStorage.setItem('offlineQuizzes', JSON.stringify(remaining));
    return processed;
  }

  async getEnhancedAnalytics(userId: string): Promise<{
    basic: any; 
    enhanced: {
      learningVelocity: number;
      conceptMastery: Record<string, number>;
      difficultyReadiness: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  philosophicalConsistency: number;
      //streakData: { current: number; best: number };
      streakAnalysis: {
    currentStreak: number;
    longestStreak: number;
    streakTrend: 'improving' | 'stable' | 'declining';
  };
      engagementScore: number;
  timeEfficiency: number;
      //averageScore: number;
      //improvementTrend: number;
      //recommendedDifficulty: string;
    };
  }> {
    const basicAnalytics = await this.analyzePerformance(userId, 'latest', {});
    
    const quizHistory = await DatabaseService.getUserQuizHistory(userId, 20);
    const enhancedAnalytics = this.gamificationService.calculateEnhancedMetrics(quizHistory);
    
    return {
      basic: basicAnalytics,
      enhanced: enhancedAnalytics
    };
  }

}

export default new QuizService();