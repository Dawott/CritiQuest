import { z } from 'zod';

// Enums na podstawie designu gry
export enum Rarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary'
}

// Statystyki
export const PhilosopherStatsSchema = z.object({
  wisdom: z.number().min(1).max(100),
  logic: z.number().min(1).max(100),
  rhetoric: z.number().min(1).max(100),
  influence: z.number().min(1).max(100),
  originality: z.number().min(1).max(100)
});

export const SpecialAbilitySchema = z.object({
  name: z.string(),
  description: z.string(),
  cooldown: z.number(), 
  effect: z.object({
    type: z.enum(['boost', 'debuff', 'transform', 'special']),
    target: z.enum(['self', 'opponent', 'both']),
    stats: z.record(z.number()).optional(),
    duration: z.number().optional()
  })
});

// Match z interfacem
export const PhilosopherSchema = z.object({
  name: z.string(),
  era: z.string(),
  school: z.string(),
  rarity: z.nativeEnum(Rarity),
  baseStats: PhilosopherStatsSchema,
  description: z.string(),
  imageUrl: z.string(),
  quotes: z.array(z.string()),
  specialAbility: SpecialAbilitySchema
});

export type PhilosopherStats = z.infer<typeof PhilosopherStatsSchema>;
export type SpecialAbility = z.infer<typeof SpecialAbilitySchema>;
export type Philosopher = z.infer<typeof PhilosopherSchema>;

export const philosophersSeedData: Record<string, Philosopher> = {
  "marcus-aurelius": {
    name: "Marek Aureliusz",
    era: "Starożytność",
    school: "Stoicyzm",
    rarity: Rarity.Legendary,
    baseStats: {
      wisdom: 95,
      logic: 85,
      rhetoric: 75,
      influence: 90,
      originality: 70
    },
    description: "Cesarz rzymski i filozof stoicki, który napisał „Rozmyślania”. Mistrz praktycznej mądrości i utrzymywania wewnętrznego spokoju pośród chaosu. Jego filozoficzna zbroja czyni go niemal odpornym na ataki emocjonalne.",
    imageUrl: "./src/assets/marcus-aurelius.jpg",
    quotes: [
      "Masz władzę nad swoim umysłem - nie nad wydarzeniami zewnętrznymi. Uświadom to sobie, a znajdziesz siłę.",
 "Przeszkoda w działaniu przyspiesza działanie. To, co stoi na drodze, staje się drogą.",
 "Do szczęśliwego życia potrzeba bardzo niewiele; wszystko jest w tobie.",
 "Najlepszą zemstą jest nie być jak twój wróg.",
 "To, co robimy teraz, odbija się echem w wieczności."
    ],
    specialAbility: {
      name: "Stoicka Forteca",
      description: "Staje się odporny na wszystkie osłabienia na 3 tury i zyskuje +20 do wszystkich statystyk obronnych.",
      cooldown: 5,
      effect: {
        type: "special",
        target: "self",
        stats: {
          wisdom: 20,
          logic: 20,
          rhetoric: 20
        },
        duration: 3
      }
    }
  },
  "simone-de-beauvoir": {
    name: "Simone de Beauvoir",
    era: "Współczesność",
    school: "Egzystencjalizm",
    rarity: Rarity.Epic,
    baseStats: {
      wisdom: 85,
      logic: 80,
      rhetoric: 90,
      influence: 85,
      originality: 95
    },
    description: "Pionierka filozofii feministycznej i myślicielka egzystencjalistyczna. Autorka „Drugiej płci”, zrewolucjonizowała rozumienie płci i wolności. Jej zdolność do dekonstrukcji konstruktów społecznych jest niezrównana.",
    imageUrl: "./src/assets/simone-de-beauvoir.jpg",
    quotes: [
      "Kobietą się nie rodzi, kobietą się staje.",
 "Jestem zbyt inteligentna, zbyt wymagająca i zbyt zaradna, by ktokolwiek mógł przejąć nade mną całkowitą kontrolę.",
 "Autentyczność wymaga od nas zmierzenia się z naszą wolnością i związaną z nią udręką.",
 "Zmień swoje życie już dziś. Nie stawiaj na przyszłość, działaj teraz, bez zwłoki.",
 "Nie chodzi o to, by kobiety po prostu odbierały władzę mężczyznom, bo to nie zmieniłoby niczego w świecie."
    ],
    specialAbility: {
      name: "Uderzenie Wyzwolenia",
      description: "Usuwa wszystkie modyfikacje statystyk obu graczy i zadaje obrażenia w oparciu o różnicę.",
      cooldown: 4,
      effect: {
        type: "transform",
        target: "both",
        duration: 1
      }
    }
  },
  "diogenes": {
    name: "Diogenes",
    era: "Starożytność",
    school: "Cynizm",
    rarity: Rarity.Epic,
    baseStats: {
      wisdom: 90,
      logic: 70,
      rhetoric: 70,
      influence: 85,
      originality: 95
    },
    description: "Kontrowersyjny filozof grecki, twórca szkoły cyników",
    imageUrl: "./src/assets/Diogenes.jpg",
    quotes: [
      "Bieda jest nauczycielką i podporą filozofii, bo do czego filozofia nakłania słowami, do tego bieda zmusza w praktyce.",
 "Gdybym był zawodnikiem, to czy zbliżając się do mety miałbym zwolnić kroku, czy raczej jeszcze bardziej przyśpieszyć?",
 "Jedynym państwem dobrze urządzonym byłoby państwo obejmujące cały świat.",
 "Słońce także kloaki nawiedza, a nie maże się.",
 "Jestem obywatelem świata."
    ],
    specialAbility: {
      name: "Oto Człowiek!",
      description: "Niweluje dodatkowe modyfikatory obu graczy",
      cooldown: 4,
      effect: {
        type: "transform",
        target: "both",
        duration: 1
      }
    }
  },
  "socrates": {
    name: "Sokrates",
    era: "Starożytność",
    school: "Etyka",
    rarity: Rarity.Legendary,
    baseStats: {
      wisdom: 100,
      logic: 85,
      rhetoric: 90,
      influence: 90,
      originality: 80
    },
    description: "Rewolucyjny filozof grecki, inspirator wielu nurtów filozoficznych i etyki",
    imageUrl: "./src/assets/Socrates.jpg",
    quotes: [
      "Najmądrzejszy jest, który wie, czego nie wie. ",
 "Sprawiedliwość jest odmianą mądrości.",
 "W całym życiu szanuj prawdę tak, by twoje słowa były bardziej wiarygodne od przyrzeczeń innych.",
 "Wszelka dusza jest nieśmiertelna.",
 "Ateny są jak ospały koń, a ja jak giez, który próbuje go ożywić."
    ],
    specialAbility: {
      name: "Metoda Sokratejska",
      description: "Placeholder",
      cooldown: 4,
      effect: {
        type: "transform",
        target: "both",
        duration: 1
      }
    }
  },
  "avicenna": {
    name: "Awicenna",
    era: "Wczesne Średniowiecze",
    school: "Metafizyka",
    rarity: Rarity.Rare,
    baseStats: {
      wisdom: 65,
      logic: 85,
      rhetoric: 55,
      influence: 80,
      originality: 70
    },
    description: "Lekarz i filozof islamski, kontynuujący nauki Arystotelesa. Skupiał się na filozofii natury, metafizyce i kosmologii",
    imageUrl: "./src/assets/Avicenna.jpg",
    quotes: [
      "Przeto odrębność człowieka polega na pojmowaniu i osądzaniu idei ogólnych i wyciąganiu rzeczy nieznanych z nauk i sztuk. To wszystko jest w mocy jednej duszy.",
 "Lekarz ignorant jest adiutantem śmierci.",
 "Szerokość życia jest ważniejsza niż długość życia.",
 "Ten co wie, że wie – tego słuchajcie, ten co wie, że nie wie – tego pouczcie, ten co nie wie, że wie – tego obudźcie, ten co nie wie, że nie wie – tego zostawcie samego sobie."
    ],
    specialAbility: {
      name: "Bóg i Natura",
      description: "Placeholder",
      cooldown: 4,
      effect: {
        type: "transform",
        target: "both",
        duration: 1
      }
    }
  },
  "camus": {
    name: "Albert Camus",
    era: "Współczesność",
    school: "Absurdyzm",
    rarity: Rarity.Legendary,
    baseStats: {
      wisdom: 70,
      logic: 85,
      rhetoric: 80,
      influence: 85,
      originality: 85
    },
    description: "Pisarz oraz dziennikarz. Jedna z barwniejszych postaci powojennego egzystencjalizmu",
    imageUrl: "./src/assets/Camus.jpg",
    quotes: [
      "Człowiek jest jedynym stworzeniem, które nie godzi się być tym, czym jest.",
 "Aby wypełnić ludzkie serce, wystarczy walka prowadząca ku szczytom. Trzeba sobie wyobrażać Syzyfa szczęśliwym.",
 "Przyzwyczajenie się do rozpaczy jest gorsze niż sama rozpacz",
 "W ludziach więcej rzeczy zasługuje na podziw niż na pogardę."
    ],
    specialAbility: {
      name: "Syzyf",
      description: "Placeholder",
      cooldown: 4,
      effect: {
        type: "transform",
        target: "both",
        duration: 1
      }
    }
  },
  "locke": {
    name: "John Locke",
    era: "Barok",
    school: "Empiryzm",
    rarity: Rarity.Epic,
    baseStats: {
      wisdom: 90,
      logic: 80,
      rhetoric: 60,
      influence: 85,
      originality: 80
    },
    description: "Jeden z prekursorów klasycznego liberalizmu oraz teorii ekonomicznej. W filozofii rozważał tematy społeczne i naukowe",
    imageUrl: "./src/assets/Locke.jpg",
    quotes: [
      "Nic nie zachodzi bez przyczyny.",
 "Wolność od absolutnej, arbitralnej władzy jest tak konieczna i ściśle złączona z samozachowaniem człowieka, że ten nie może ich rozdzielić, gdyż utraciłby wtedy samozachowanie wraz z życiem",
 "Stopień ekscentryczności w społeczeństwie jest proporcjonalny do zawartego w nim geniuszu, materialnego wigoru i odwagi moralnej.",
 "Naturalną wolnością człowieka jest bycie niezależnym od jakiejkolwiek nadrzędnej władzy na Ziemi oraz niepodleganie woli lub władzy prawodawczej człowieka, ale bycie rządzonym jedynie przez prawo Natury."
    ],
    specialAbility: {
      name: "Zmysł Wewnętrzny",
      description: "Placeholder",
      cooldown: 4,
      effect: {
        type: "transform",
        target: "both",
        duration: 1
      }
    }
  }
};

// Helper function to generate philosopher IDs from names
export const generatePhilosopherId = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

// Rarity distribution helper
export const getRarityStats = (rarity: Rarity): { min: number, max: number, total: number } => {
  switch (rarity) {
    case Rarity.Common:
      return { min: 40, max: 70, total: 300 };
    case Rarity.Uncommon:
      return { min: 50, max: 75, total: 330 };
    case Rarity.Rare:
      return { min: 60, max: 80, total: 360 };
    case Rarity.Epic:
      return { min: 70, max: 90, total: 400 };
    case Rarity.Legendary:
      return { min: 75, max: 95, total: 425 };
  }
};

// Templatka do dodawania nowych filozofów
export const philosopherTemplate: Partial<Philosopher> = {
  era: "", 
  school: "", 
  rarity: Rarity.Common,
  baseStats: {
    wisdom: 50,
    logic: 50,
    rhetoric: 50,
    influence: 50,
    originality: 50
  },
  description: "",
  imageUrl: "",
  quotes: [],
  specialAbility: {
    name: "",
    description: "",
    cooldown: 3,
    effect: {
      type: "boost",
      target: "self",
      stats: {},
      duration: 2
    }
  }
};