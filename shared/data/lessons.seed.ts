import { z } from 'zod';

// Import your actual types/enums from database.types.ts
// These should match your existing definitions
export enum Difficulty {
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
  Expert = 'expert'
}

// Lesson Section schema
export const LessonSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  type: z.enum(['text', 'interactive', 'video', 'image']),
  mediaUrl: z.string().optional(),
  interactionType: z.enum(['reflection', 'concept-map', 'timeline', 'comparison']).optional(),
  interactionData: z.any().optional() 
});

// Lesson Rewards schema
export const LessonRewardsSchema = z.object({
  xp: z.number(),
  coins: z.number().optional(),
  unlockedContent: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional()
});

// Main Lesson schema matching your interface
export const LessonSchema = z.object({
  title: z.string(),
  description: z.string(),
  stage: z.string(), // "ancient-philosophy", "modern-philosophy" itd.
  order: z.number(), // Order within the stage
  difficulty: z.nativeEnum(Difficulty),
  estimatedTime: z.number(), // in minutes
  philosophicalConcepts: z.array(z.string()),
  requiredPhilosopher: z.string().optional(),
  content: z.object({
    sections: z.array(LessonSectionSchema)
  }),
  quiz: z.string(), // Quiz ID reference
  rewards: LessonRewardsSchema
});

export type LessonSection = z.infer<typeof LessonSectionSchema>;
export type LessonRewards = z.infer<typeof LessonRewardsSchema>;
export type Lesson = z.infer<typeof LessonSchema>;

// Seed data with two lesson examples
export const lessonsSeedData: Record<string, Lesson> = {
  "stoicism-intro": {
    title: "Twierdza umysłu",
    description: "Odkryj starożytną filozofię stoicyzmu i dowiedz się, jak budować odporność psychiczną dzięki mądrości Marka Aureliusza i Epikteta.",
    stage: "ancient-philosophy",
    order: 1,
    difficulty: Difficulty.Beginner,
    estimatedTime: 15,
    philosophicalConcepts: ["dichotomy-of-control", "virtue-ethics", "cosmic-perspective", "preferred-indifferents"],
    requiredPhilosopher: "marcus-aurelius",
    content: {
      sections: [
        {
          id: "intro-section",
          title: "Wrak statku, od którego wszystko się zaczęło",
          content: "Około 300 r. p.n.e. bogaty kupiec o imieniu Zeno z Citium żeglował po Morzu Śródziemnym, gdy spotkała go katastrofa. Jego statek rozbił się, a on stracił całą swoją fortunę. Zdruzgotany, zawędrował do ateńskiej księgarni, gdzie odkrył nauki Sokratesa. To przypadkowe spotkanie przekształciło jego stratę w zysk filozofii. „Odbyłem pomyślną podróż, kiedy rozbił się mój statek” - powie później Zenon. Założył stoicyzm, nauczając, że prawdziwe bogactwo nie leży w posiadaniu, ale w mądrości i cnocie. Filozofia ta prowadziła zarówno cesarzy, jak i niewolników przez życiowe burze.",
          type: "text",
          mediaUrl: "https://example.com/ancient-athens-port.jpg"
        },
        {
          id: "dichotomy-section",
          title: "Potęga dychotomii",
          content: "Wyobraź sobie, że masz przystąpić do ważnego egzaminu. Ciężko się uczyłeś, ale niepokoisz się o wynik. Stoicy zapytaliby: co dokładnie sprawia, że jesteś niespokojny? Epiktet, urodzony jako niewolnik, który stał się największym rzymskim nauczycielem filozofii, zidentyfikował źródło ludzkiego cierpienia: próbujemy kontrolować to, czego nie możemy, i zaniedbujemy to, co możemy. \To, nad czym masz kontrolę: wysiłek i przygotowanie, nastawienie podczas egzaminu, reakcja na wynik, to, nad czym nie masz kontroli: pytania na egzaminie, zachowanie innych, ocena końcowa - oto Dychotomia Kontroli - kamień węgielny stoickiego spokoju.",
          type: "interactive",
          interactionType: "concept-map",
          interactionData: {
            centralConcept: "Życie",
            branches: [
              {
                category: "W Twojej Władzy",
                items: ["Myśli", "Akcje", "Wartości", "Wysiłek", "Odpowiedzi"]
              },
              {
                category: "Poza Kontrolą",
                items: ["Opinie innych", "Przeszłe wydarzenia", "Przyszłe wyniki", "Twoja reputacja", "Wydarzenia zewnętrzne"]
              }
            ]
          }
        },
        {
          id: "marcus-section",
          title: "Mądrość ze Złotego Pałacu",
          content: "Marek Aureliusz miał wszystko - bogactwo, władzę, imperium do swojej dyspozycji. Jednak noce spędzał przy świecach, pisząc do siebie notatki o pokorze, obowiązku i akceptacji. Jego „Rozmyślania” ukazują człowieka używającego filozofii jako zbroi przeciwko korupcji władzy absolutnej. 'Masz władzę nad swoim umysłem - nie nad wydarzeniami zewnętrznymi. Uświadom to sobie, a znajdziesz siłę' - pisał, prowadząc kampanie wojskowe na granicy Dunaju. Najpotężniejszy człowiek na świecie znalazł swoją największą siłę nie w swoich legionach, ale w filozofii stoickiej. Jeśli potrafiła ona poprowadzić cesarza przez plagi, wojny i zdrady, wyobraź sobie, co może zrobić z codziennymi wyzwaniami.",
          type: "text",
          mediaUrl: "https://example.com/marcus-aurelius-meditation.jpg"
        },
        {
          id: "practice-section",
          title: "Twoje pierwsze stoickie ćwiczenie",
          content: "Stoicy byli nie tylko teoretykami - opracowali praktyczne ćwiczenia do zastosowania w codziennym życiu. Wypróbuj medytację „Widok z góry”, którą praktykował Marek Aureliusz: \n\n1. Zamknij oczy i wyobraź sobie, że wznosisz się ponad swoją obecną lokalizację\n2. Zobacz z góry swój budynek, a następnie swoją okolicę\n3. Kontynuuj wznoszenie: zobacz swoje miasto, kraj, kontynent\n4. Na koniec zobacz Ziemię jako małą niebieską kulę w bezmiarze kosmosu\n5. To ćwiczenie nie minimalizuje prawdziwych problemów, ale daje perspektywę. Jak napisał Marcus: „Obserwuj gwiazdy w ich biegach, tak jakbyś im towarzyszył, i nieustannie zastanawiaj się nad przemianami żywiołów w siebie nawzajem”.",
          type: "interactive",
          interactionType: "reflection",
          interactionData: {
            prompts: [
              "Jakie zmartwienie wydawało się mniejsze z perspektywy kosmosu?",
 "Jak to zmieniło twoje odczucia na temat sytuacji?",
 "Kiedy mógłbyś użyć tej techniki w codziennym życiu?"
            ],
            saveResponses: true
          }
        }
      ]
    },
    quiz: "quiz-stoicism-intro",
    rewards: {
      xp: 100,
      coins: 50,
      unlockedContent: ["stoicism-daily-practices", "marcus-aurelius-quotes"],
      achievements: ["first-philosophy-lesson", "stoic-initiate"]
    }
  },
  
  "existentialism-freedom": {
    title: "Nieznośny ciężar wolności",
    description: "Poznaj egzystencjalizm przez pryzmat Simone de Beauvoir i odkryj, dlaczego nasza wolność jest zarówno darem, jak i ciężarem w tworzeniu autentycznego życia.",
    stage: "modern-philosophy",
    order: 3,
    difficulty: Difficulty.Intermediate,
    estimatedTime: 25,
    philosophicalConcepts: ["existence-precedes-essence", "bad-faith", "authenticity", "situated-freedom", "the-other"],
    requiredPhilosopher: "simone-de-beauvoir",
    content: {
      sections: [
        {
          id: "cafe-scene",
          title: "Rozmowa w Café de Flore",
          content: "Paryż, rok 1943. W zadymionej mgle Café de Flore Simone de Beauvoir siedzi i pisze. Na zewnątrz szaleje wojna, ale w jej wnętrzu powstają idee, które zrewolucjonizują nasze myślenie o wolności i odpowiedzialności. „Człowiek nie rodzi się, ale raczej staje się...” pisze, a jej pióro zatrzymuje się w połowie zdania. Ta prosta obserwacja zawiera radykalną prawdę: nic w tobie nie jest z góry określone. Ani twój charakter, ani przeznaczenie, ani nawet role płciowe. Jesteś, jak powiedziałby jej partner Sartre, „skazany na wolność”. Ale co oznacza ta wolność, gdy świat wydaje się oferować tak wiele ograniczeń? Kiedy społeczeństwo, rodzina i okoliczności zdają się dyktować nasze wybory?",
          type: "text",
          mediaUrl: "https://example.com/cafe-de-flore-1940s.jpg"
        },
        {
          id: "existence-essence",
          title: "Nie jesteś spinaczem do papieru",
          content: "Spinacz do papieru ma jasny cel - został zaprojektowany do spinania papierów. Jego istota (cel) poprzedzała jego istnienie. Tradycyjna filozofia i religia nauczały, że ludzie, podobnie jak spinacze, mają z góry określoną istotę - boski cel lub naturalną funkcję. Egzystencjaliści radykalnie to odrzucili. Dla ludzi istnienie jest najważniejsze. Istniejesz, a następnie poprzez swoje wybory i działania tworzysz swoją esencję. Nie odkrywasz tego, kim jesteś - tworzysz to, kim jesteś. Jest to jednocześnie wyzwalające i przerażające. Nie ma żadnej kosmicznej instrukcji obsługi, żadnej z góry określonej ścieżki. Każdy dokonany wybór tworzy historię tego, kim jesteś.",
          type: "interactive",
          interactionType: "comparison",
          interactionData: {
            title: "Esencja: Predeterminiowana vs Tworzona",
            comparisons: [
              {
                category: "Spojrzenie Tradycyjne",
                items: [
                  "Urodzony z celem",
 "Odkryj swoje prawdziwe ja",
 "Podążaj za swoją naturą",
 "Wypełnij swoje przeznaczenie"
                ]
              },
              {
                category: "Spojrzenie Egzystencjalistyczne",
                items: [
                  "Urodzony bez celu",
 "Stwórz siebie",
 "Zdefiniuj swoją naturę",
 "Napisz swoje przeznaczenie"
                ]
              }
            ]
          }
        },
        {
          id: "bad-faith-section",
          title: "Wygodne więzienie złej wiary",
          content: "De Beauvoir obserwowała ludzi na całym świecie uciekających od swojej wolności w coś, co ona i Sartre nazywali „złą wiarą” - zaprzeczeniem naszej fundamentalnej wolności wyboru. \Rozważmy następujące przykłady: „Nic nie poradzę na to, że jestem zły, taki już jestem”, „Muszę zostać w tej pracy, nie mam wyboru”, „Społeczeństwo oczekuje, że będę postępował w ten sposób”, „Zmusiły mnie do tego moje geny, wychowanie lub okoliczności”. Ale zła wiara bierze te ograniczenia i nadmuchuje je do absolutnego determinizmu. Jest wygodna, ponieważ usuwa niepokój związany z wyborem i odpowiedzialnością. De Beauvoir była szczególnie zainteresowana tym, jak kobiety były zachęcane do przyjęcia złej wiary, do postrzegania swoich ograniczeń jako naturalnych, a nie narzuconych. Jej praca ujawniła, w jaki sposób ucisk działa poprzez przekonywanie ludzi, że nie mają wyboru.",
          type: "text"
        },
        {
          id: "authenticity-section",
          title: "Etyka Niepewności",
          content: "Jeśli mamy swobodę tworzenia własnego znaczenia, to czy cokolwiek jest dozwolone? De Beauvoir twierdzi, że nie. W „Etyce dwuznaczności” argumentowała, że nasza wolność istnieje w sieci relacji z innymi wolnymi istotami. Autentyczne życie wymaga: 1. **Uznania naszej wolności**: Akceptacji faktu, że zawsze mamy wybór, nawet w ograniczonych sytuacjach. 2. **Przyjmowania dwuznaczności**: Jesteśmy zarówno wolni, jak i ograniczeni, indywidualni i społeczni\n3. **Poszanowanie wolności innych**: Nasza wolność jest spleciona z wolnością innych ludzi\n4. **Działanie z jasnością**: Dokonywanie wyborów z pełną świadomością ich konsekwencji. Autentyczna osoba nie pyta „Co powinienem zrobić?”, ale „Jaką osobą staję się poprzez ten wybór?”.",
          type: "interactive",
          interactionType: "reflection",
          interactionData: {
            scenario: "Otrzymujesz propozycję awansu, który wymagałby zmiany miejsca zamieszkania, pozostawienia przyjaciół i społeczności, którą kochasz. Wzrost wynagrodzenia zapewniłby bezpieczeństwo finansowe, ale praca wydaje się mniej znacząca.",
            prompts: [
              "Wymień czynniki, które wydają się wymuszać Twoją decyzję",
 "Teraz przeformułuj każdy czynnik jako wybór, którego dokonujesz",
 "Co wybór każdej opcji powiedziałby o Twoich wartościach?",
 "Jak uznanie swojej wolności wyboru zmienia Twoje samopoczucie?"
            ],
            guidance: "Nie ma „właściwej” odpowiedzi - ćwiczenie polega na uznaniu wolności wyboru i wartości, które ten wybór wyraża."
          }
        },
        {
          id: "situated-freedom",
          title: "Wolność w Kontekście",
          content: "De Beauvoir udoskonaliła egzystencjalizm, podkreślając „usytuowaną wolność”. Nie wybieramy w próżni - wybieramy w określonych sytuacjach, które stwarzają zarówno możliwości, jak i ograniczenia. Kobieta we Francji lat czterdziestych XX wieku stawała przed innymi wyborami niż dziś. Osoba urodzona w ubóstwie napotyka inne ograniczenia niż osoba urodzona w bogactwie. Jednak w każdej sytuacji, bez względu na to, jak bardzo jest ona ograniczona, pozostaje pewien element wyboru. Ten zniuansowany pogląd pozwala uniknąć dwóch skrajności: fantazji o absolutnej wolności (ignorującej rzeczywiste ograniczenia) oraz rozpaczy determinizmu (zaprzeczającej wszelkiej wolności). Wybierając, pomagasz stworzyć sytuację dla przyszłych wyborów - zarówno swoich, jak i innych.",
          type: "text",
          mediaUrl: "https://example.com/de-beauvoir-writing.jpg"
        },
        {
          id: "closing-section",
          title: "Odwaga do wolności",
          content: "Wychodząc z tej lekcji, niesie ze sobą egzystencjalistyczne spostrzeżenie: jesteś wolny, a wraz z tą wolnością przychodzi ciężar odpowiedzialności za to, kim się stajesz. Nie jest to ciężar, który należy niechętnie znosić, ale głęboka szansa. W każdym wyborze, małym lub dużym, tworzysz siebie i przyczyniasz się do ludzkiego projektu definiowania tego, co to znaczy być człowiekiem. De Beauvoir pokazała nam, że autentyczność nie polega na znalezieniu siebie - polega na stworzeniu siebie z odwagą, jasnością i szacunkiem dla wolności innych. Pytanie brzmi teraz: Kim zdecydujesz się zostać?",
          type: "text"
        }
      ]
    },
    quiz: "quiz-existentialism-freedom", 
    rewards: {
      xp: 150,
      coins: 75,
      unlockedContent: ["bad-faith-analyzer", "authenticity-journal", "de-beauvoir-ethics"],
      achievements: ["freedom-seeker", "authentic-self", "existentialist-thinker"]
    }
  }
};

// Helper functions
export const generateLessonId = (title: string): string => {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
};

// Get lessons by stage
export const getLessonsByStage = (stage: string): [string, Lesson][] => {
  return Object.entries(lessonsSeedData)
    .filter(([_, lesson]) => lesson.stage === stage)
    .sort((a, b) => a[1].order - b[1].order);
};

// Check if user meets philosopher requirement
export const meetsPhilosopherRequirement = (
  lesson: Lesson,
  userPhilosophers: string[]
): boolean => {
  if (!lesson.requiredPhilosopher) return true;
  return userPhilosophers.includes(lesson.requiredPhilosopher);
};

// Calculate total XP available in a stage
export const calculateStageXP = (stage: string): number => {
  return getLessonsByStage(stage)
    .reduce((total, [_, lesson]) => total + lesson.rewards.xp, 0);
};