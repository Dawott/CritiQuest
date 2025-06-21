import { z } from 'zod';

export type QuestionType = 'single' | 'multiple' | 'scenario' | 'debate';
export type QuizType = 'multiple-choice' | 'scenario' | 'debate';

export const DebateConfigSchema = z.object({
  title: z.string(),
  context: z.string(),
  question: z.string(),
  schools_involved: z.array(z.string()),
  max_rounds: z.number(),
  time_per_round: z.number().optional(),
  required_philosophers: z.array(z.string()).optional(),
  audience_segments: z.array(z.object({
    type: z.enum(['academics', 'students', 'general_public']),
    size: z.number(),
    biases: z.array(z.string())
  })).optional()
});

// Question schema
export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(['single', 'multiple', 'scenario', 'debate']),
  options: z.array(z.string()),
  correctAnswers: z.array(z.string()),
  explanation: z.string(),
  philosophicalContext: z.string(),
  points: z.number(),
  debateConfig: DebateConfigSchema.optional()
});

// Quiz schema
export const QuizSchema = z.object({
  lessonId: z.string(),
  title: z.string(),
  type: z.enum(['multiple-choice', 'scenario', 'debate']),
  timeLimit: z.number().optional(),
  questions: z.array(QuestionSchema),
  passingScore: z.number(),
  philosopherBonus: z.object({
    philosopherId: z.string(),
    bonusMultiplier: z.number()
  }).optional()
});

// Debate Argument schema
export const DebateArgumentSchema = z.object({
  id: z.string(),
  text: z.string(),
  philosophical_basis: z.string(),
  strength_against: z.array(z.string()),
  weakness_against: z.array(z.string()),
  school_bonus: z.array(z.string()),
  conviction_power: z.number(),
  requires_philosopher: z.string().optional()
});

export type Question = z.infer<typeof QuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type DebateArgument = z.infer<typeof DebateArgumentSchema>;

// Quiz seed data
export const quizzesSeedData: Record<string, Quiz> = {
  "quiz-stoicism-intro": {
    lessonId: "stoicism-intro",
    title: "Przetestuj Wiedzę Stoicką",
    type: "multiple-choice",
    timeLimit: 600, // 10 minut
    passingScore: 70,
    philosopherBonus: {
      philosopherId: "marcus-aurelius",
      bonusMultiplier: 1.2
    },
    questions: [
      {
        id: "q-stoic-1",
        text: "Jaki jest klucz do spokojnego życia według stoików?",
        type: "single",
        options: [
          "Gromadzenie bogactwa i władzy",
 "Unikanie wszelkich trudnych sytuacji",
 "Skupianie się na tym, co jest pod naszą kontrolą",
 "Dążenie do przyjemności i unikanie bólu"
        ],
        correctAnswers: ["Skupianie się na tym, co jest pod naszą kontrolą"],
        explanation: "Stoicy nauczali, że spokój umysłu wynika ze skupienia się na tym, co możemy kontrolować (nasze myśli, osądy i działania), a nie na zewnętrznych okolicznościach, na które nie mamy wpływu.",
        philosophicalContext: "Zasada ta, znana jako dychotomia kontroli, była kluczowa dla nauczania Epikteta i znajduje się w Medytacjach Marka Aureliusza.",
        points: 10
      },
      {
        id: "q-stoic-2",
        text: "Które z poniższych jest w naszej kontroli według stoików?",
        type: "multiple",
        options: [
          "Nasza ocena wydarzeń",
 "Działania innych osób",
 "Nasze reakcje emocjonalne",
 "Okoliczności zewnętrzne",
 "Nasze wartości i wybory"
        ],
        correctAnswers: [
          "Nasza ocena wydarzeń",
 "Nasze reakcje emocjonalne",
 "Nasze wartości i wybory"
        ],
        explanation: "Stoicy rozróżniają między tym, co „zależy od nas” (nasze osądy, pragnienia, decyzje), a tym, co „nie zależy od nas” (wydarzenia zewnętrzne, działania innych, nasza reputacja).",
        philosophicalContext: "Klasyfikacja ta pomaga praktykom skoncentrować swoją energię na obszarach, w których mają prawdziwą władzę, zmniejszając frustrację i zwiększając skuteczność.",
        points: 15
      },
      {
        id: "q-stoic-3",
        text: "Starannie przygotowałeś się do rozmowy kwalifikacyjnej, ale nie dostałeś posady. Jak poradziłby ci filozof stoicki?",
        type: "scenario",
        options: [
          "Obwiniaj osobę prowadzącą rozmowę kwalifikacyjną za to, że nie doceniła Twoich kwalifikacji",
 "Zaakceptuj wynik i skup się na tym, czego możesz się nauczyć z tego doświadczenia",
 "Zrezygnuj ze swoich celów zawodowych, ponieważ są one wyraźnie nieosiągalne",
 "Całkowicie zignoruj swoje uczucia związane z odrzuceniem"
        ],
        correctAnswers: ["Zaakceptuj wynik i skup się na tym, czego możesz się nauczyć z tego doświadczenia"],
        explanation: "Stoicyzm uczy nas akceptować zewnętrzne rezultaty, jednocześnie utrzymując nasze zaangażowanie w cnotę i samodoskonalenie. Na wynik nie mamy wpływu, ale na naszą reakcję już tak.",
        philosophicalContext: "Marek Aureliusz napisał: „Ogranicz się do teraźniejszości” i 'Przeszkoda w działaniu przyspiesza działanie. To, co stoi na drodze, staje się drogą'.",
        points: 20
      },
      {
        id: "q-stoic-4",
        text: "Co ma na celu medytacja „Widok z góry”?",
        type: "single",
        options: [
          "Rozwijać nadprzyrodzone moce",
 "Całkowicie uciekać od ziemskich trosk",
 "Zyskać perspektywę na nasze problemy poprzez kosmiczne myślenie",
 "Udowodnić, że indywidualne życie nie ma znaczenia"
        ],
        correctAnswers: ["Zyskać perspektywę na nasze problemy poprzez kosmiczne myślenie"],
        explanation: "To stoickie ćwiczenie pomaga nam spojrzeć na nasze problemy w odpowiednich proporcjach, wyobrażając sobie siebie z kosmicznej perspektywy, zmniejszając niepokój bez minimalizowania prawdziwych obaw.",
        philosophicalContext: "Marek Aureliusz często wykorzystywał kosmiczną perspektywę w swoich Medytacjach, aby zachować spokój, radząc sobie z presją rządzenia imperium.",
        points: 10
      }
    ]
  },

  "quiz-existentialism-freedom": {
    lessonId: "existentialism-freedom",
    title: "Osiągając egzystencjalną wolność",
    type: "scenario",
    timeLimit: 900, // 15 minut
    passingScore: 75,
    philosopherBonus: {
      philosopherId: "simone-de-beauvoir",
      bonusMultiplier: 1.25
    },
    questions: [
      {
        id: "q-exist-1",
        text: "Co oznacza „istnienie poprzedza istotę” w filozofii egzystencjalistycznej?",
        type: "single",
        options: [
          "Fizyczne istnienie jest ważniejsze niż duchowa esencja",
 "Najpierw istniejemy, a następnie tworzymy nasz cel poprzez nasze wybory",
 "Istotne cechy determinują nasze istnienie",
 "Istnienie i esencja to to samo"
        ],
        correctAnswers: ["Najpierw istniejemy, a następnie tworzymy nasz cel poprzez nasze wybory"],
        explanation: "W przeciwieństwie do przedmiotów stworzonych w określonym celu, ludzie najpierw istnieją, a następnie definiują swoją istotę poprzez swoje działania i wybory.",
        philosophicalContext: "Odwraca to tradycyjną filozofię i religię, które twierdziły, że ludzie mają z góry określoną naturę lub cel. De Beauvoir i Sartre twierdzili, że tworzymy samych siebie.",
        points: 10
      },
      {
        id: "q-exist-2",
        text: "Twój przyjaciel mówi: „Nic nie poradzę na to, że jestem pesymistą, to po prostu moja osobowość”. Z egzystencjalistycznego punktu widzenia jest to przykład:",
        type: "scenario",
        options: [
          "Autentyczna samoświadomość",
 "Zła wiara - odmowa wolności wyboru postawy",
 "Akceptacja ograniczeń w dobrej wierze",
 "Odwaga egzystencjalna"
        ],
        correctAnswers: ["Zła wiara - odmowa wolności wyboru postawy"],
        explanation: "Zła wiara polega na zaprzeczaniu naszej podstawowej wolności poprzez udawanie, że nie mamy wyboru. Chociaż możemy mieć tendencje, zawsze zachowujemy wolność wyboru naszej postawy.",
        philosophicalContext: "De Beauvoir analizowała, w jaki sposób ludzie uciekają od lęku przed wolnością w złą wiarę, traktując wybrane postawy jako stałą naturę.",
        points: 15
      },
      {
        id: "q-exist-3",
        text: "Według de Beauvoir autentyczne istnienie wymaga którego z poniższych?",
        type: "multiple",
        options: [
          "Uznanie naszej radykalnej wolności",
 "Ignorowanie ograniczeń społecznych",
 "Szanowanie wolności innych, tak jak pragniemy własnej",
 "Tworzenie znaczenia poprzez nasze wybory",
 "Udawanie, że nie mamy ograniczeń"
        ],
        correctAnswers: [
          "Uznanie naszej radykalnej wolności",
          "Szanowanie wolności innych, tak jak pragniemy własnej",
          "Tworzenie znaczenia poprzez nasze wybory"
        ],
        explanation: "Autentyczność wymaga uznania zarówno naszej wolności, jak i naszej sytuacji, tworzenia znaczenia przy jednoczesnym poszanowaniu równej wolności innych do robienia tego samego.",
        philosophicalContext: "W „Etyce dwuznaczności” de Beauvoir opracowała etykę opartą na uznaniu naszej wspólnej ludzkiej kondycji wolności w ramach ograniczeń.",
        points: 20
      },
      {
        id: "q-exist-4",
        text: "Pozostajesz w niesatysfakcjonującym związku, ponieważ „minęło tyle czasu”, a „rozpoczęcie od nowa wydaje się niemożliwe”. Jak de Beauvoir przeanalizowałaby tę sytuację?",
        type: "scenario",
        options: [
          "Mądrze akceptujesz ograniczenia swojej sytuacji",
 "Wykazujesz złą wiarę, odmawiając sobie wolności wyboru",
 "Relacje są z góry ustalone i nie można ich zmienić",
 "Powinieneś natychmiast odejść bez zastanowienia"
        ],
        correctAnswers: ["Wykazujesz złą wiarę, odmawiając sobie wolności wyboru"],
        explanation: "Uznając rzeczywiste ograniczenia (inwestycje emocjonalne, trudności praktyczne), egzystencjalizm podkreśla, że zachowujemy wolność wyboru. Pozostanie jest wyborem, a nie nieuchronnością.",
        philosophicalContext: "De Beauvoir podkreślała „usytuowaną wolność” - wybieramy w ramach ograniczeń, ale wciąż wybieramy. Zaprzeczanie temu wyborowi to zła wiara.",
        points: 20
      },
      {
        id: "q-exist-5",
        text: "Czym jest „usytuowana wolność” w filozofii de Beauvoir?",
        type: "single",
        options: [
          "Wolność, która istnieje tylko w pewnych sytuacjach",
 "Pełna wolność bez żadnych ograniczeń",
 "Wolność wykonywana w określonych kontekstach i ograniczeniach",
 "Wolność określona przez naszą sytuację"
        ],
        correctAnswers: ["Wolność wykonywana w określonych kontekstach i ograniczeniach"],
        explanation: "Wolność usytuowana uznaje, że zawsze wybieramy w określonych okolicznościach, które zapewniają zarówno możliwości, jak i ograniczenia, ale wybór pozostaje możliwy.",
        philosophicalContext: "Koncepcja ta udoskonaliła egzystencjalizm, uznając ograniczenia świata rzeczywistego, jednocześnie utrzymując, że zawsze pozostaje pewien stopień wyboru.",
        points: 15
      }
    ]
  }
};

// Debate Arguments seed data (for debate-type questions)
export const debateArgumentsSeedData: Record<string, DebateArgument> = {
  "arg-free-will-stoic": {
    id: "arg-free-will-stoic",
    text: "Prawdziwa wolność nie pochodzi z nieograniczonych wyborów, ale ze zrozumienia tego, co jest pod naszą kontrolą i cnotliwego działania w tych granicach.",
    philosophical_basis: "Stoicka koncepcja wolności poprzez akceptację i dychotomia kontroli",
    strength_against: ["arg-absolute-freedom", "arg-libertarian-free-will"],
    weakness_against: ["arg-existential-freedom", "arg-social-determinism"],
    school_bonus: ["Stoicyzm"],
    conviction_power: 75,
    requires_philosopher: "marcus-aurelius"
  },
  
  "arg-existential-freedom": {
    id: "arg-existential-freedom",
    text: "Jesteśmy skazani na bycie wolnymi - nawet brak wyboru sam w sobie jest wyborem. Nasza wolność jest absolutna i przerażająca.",
    philosophical_basis: "Egzystencjalistyczna radykalna wolność i odpowiedzialność",
    strength_against: ["arg-social-determinism", "arg-fate-based"],
    weakness_against: ["arg-neuroscience-determinism", "arg-practical-constraints"],
    school_bonus: ["Egzystencjalizm"],
    conviction_power: 80,
    requires_philosopher: "simone-de-beauvoir"
  },
  
  "arg-social-determinism": {
    id: "arg-social-determinism",
    text: "Nasze wybory są w dużej mierze zdeterminowane przez struktury społeczne, warunki ekonomiczne i programowanie kulturowe. Indywidualna wolność jest w większości iluzją.",
    philosophical_basis: "Determinizm socjologiczny i analiza strukturalna",
    strength_against: ["arg-absolute-freedom", "arg-existential-freedom"],
    weakness_against: ["arg-free-will-stoic", "arg-pragmatic-freedom"],
    school_bonus: ["Teoria Krytyczna", "Marksizm"],
    conviction_power: 70,
    requires_philosopher: "camus"
  }
};

// Helper functions
export const calculateQuizMaxScore = (quiz: Quiz): number => {
  return quiz.questions.reduce((total, question) => total + question.points, 0);
};

export const getQuizDifficulty = (quiz: Quiz): string => {
  const avgPoints = calculateQuizMaxScore(quiz) / quiz.questions.length;
  if (avgPoints <= 10) return "Easy";
  if (avgPoints <= 15) return "Medium";
  return "Hard";
};

export const isDebateQuestion = (question: Question): question is Question & { debateConfig: NonNullable<Question['debateConfig']> } => {
  return question.type === 'debate' && question.debateConfig !== undefined;
};