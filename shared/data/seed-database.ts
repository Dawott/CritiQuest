import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { philosophersSeedData, PhilosopherSchema } from './philosophers.seed';
import { lessonsSeedData, LessonSchema } from './lessons.seed';
import { quizzesSeedData, QuizSchema, debateArgumentsSeedData, DebateArgumentSchema } from './quizzes.seed';
import { achievementsSeedData, AchievementSchema } from './achievements.seed';
import dotenv from 'dotenv';
dotenv.config();

const initializeFirebase = () => {
  try {
    initializeApp({
      /* credential: cert({
        // Option 1: Use environment variables
       projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),*/
      // Option 2: Use service account file
       credential: cert('./critiquest-cert.json'),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    
    console.log('✅ Firebase initialized successfully');
    return getDatabase();
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
    process.exit(1);
  }
};

// Validate data before seeding
/*
const validateData = <T>(data: Record<string, T>, schema: any, dataType: string): boolean => {
  console.log(`\n🔍 Validating ${dataType} data...`);
  
  for (const [id, item] of Object.entries(data)) {
    try {
      schema.parse(item);
    } catch (error) {
      console.error(`❌ Validation failed for ${dataType} ${id}:`, error);
      return false;
    }
  }
  
  console.log(`✅ All ${dataType} data validated successfully`);
  return true;
};
*/
// Seed philosophers data
const seedPhilosophers = async (db: any) => {
  console.log('\n📚 Seeding philosophers...');
  
  // Validate each philosopher in the object
  for (const [id, philosopher] of Object.entries(philosophersSeedData)) {
    try {
      PhilosopherSchema.parse(philosopher);
    } catch (error) {
      console.error(`❌ Validation failed for philosopher ${id}:`, error);
      throw error;
    }
  }
  
  console.log('✅ All philosopher data validated successfully');
  
  const philosophersRef = db.ref('philosophers');
  
  // Clear existing data (optional - comment out if you want to preserve existing data)
  await philosophersRef.remove();
  console.log('🗑️  Cleared existing philosophers data');
  
  // Seed each philosopher
  for (const [id, philosopher] of Object.entries(philosophersSeedData)) {
    try {
      await philosophersRef.child(id).set(philosopher);
      console.log(`✅ Added philosopher: ${philosopher.name} (${philosopher.rarity})`);
    } catch (error) {
      console.error(`❌ Error adding philosopher ${philosopher.name}:`, error);
      throw error;
    }
  }
  
  console.log(`\n✨ Successfully seeded ${Object.keys(philosophersSeedData).length} philosophers`);
};

// Seed lessons data
const seedLessons = async (db: any) => {
  console.log('\n📚 Seeding lessons...');
  
  // Validate each lesson
  for (const [id, lesson] of Object.entries(lessonsSeedData)) {
    try {
      LessonSchema.parse(lesson);
    } catch (error) {
      console.error(`❌ Validation failed for lesson ${id}:`, error);
      throw error;
    }
  }
  
  console.log('✅ All lesson data validated successfully');
  
  const lessonsRef = db.ref('lessons');
  
  // Clear existing data
  await lessonsRef.remove();
  console.log('🗑️  Cleared existing lessons data');
  
  // Seed each lesson
  for (const [id, lesson] of Object.entries(lessonsSeedData)) {
    try {
      await lessonsRef.child(id).set(lesson);
      console.log(`✅ Added lesson: ${lesson.title} (${lesson.stage})`);
    } catch (error) {
      console.error(`❌ Error adding lesson ${lesson.title}:`, error);
      throw error;
    }
  }
  
  console.log(`\n✨ Successfully seeded ${Object.keys(lessonsSeedData).length} lessons`);
};

// Seed quizzes data
const seedQuizzes = async (db: any) => {
  console.log('\n❓ Seeding quizzes...');
  
  // Validate each quiz
  for (const [id, quiz] of Object.entries(quizzesSeedData)) {
    try {
      QuizSchema.parse(quiz);
    } catch (error) {
      console.error(`❌ Validation failed for quiz ${id}:`, error);
      throw error;
    }
  }
  
  console.log('✅ All quiz data validated successfully');
  
  const quizzesRef = db.ref('quizzes');
  
  // Clear existing data
  await quizzesRef.remove();
  console.log('🗑️  Cleared existing quizzes data');
  
  // Seed each quiz
  for (const [id, quiz] of Object.entries(quizzesSeedData)) {
    try {
      await quizzesRef.child(id).set(quiz);
      console.log(`✅ Added quiz: ${quiz.title} (${quiz.type})`);
    } catch (error) {
      console.error(`❌ Error adding quiz ${quiz.title}:`, error);
      throw error;
    }
  }
  
  console.log(`\n✨ Successfully seeded ${Object.keys(quizzesSeedData).length} quizzes`);
};

// Seed debate arguments
const seedDebateArguments = async (db: any) => {
  console.log('\n💬 Seeding debate arguments...');
  
  // Validate each argument
  for (const [id, argument] of Object.entries(debateArgumentsSeedData)) {
    try {
      DebateArgumentSchema.parse(argument);
    } catch (error) {
      console.error(`❌ Validation failed for debate argument ${id}:`, error);
      throw error;
    }
  }
  
  const argumentsRef = db.ref('debate_arguments');
  await argumentsRef.remove();
  
  for (const [id, argument] of Object.entries(debateArgumentsSeedData)) {
    await argumentsRef.child(id).set(argument);
    console.log(`✅ Added debate argument: ${id}`);
  }
  
  console.log(`\n✨ Successfully seeded ${Object.keys(debateArgumentsSeedData).length} debate arguments`);
};

// Create game-specific metadata
const createGameMetadata = async (db: any) => {
  console.log('\n🎮 Creating game metadata...');
  
  const metadataRef = db.ref('game_metadata');
  
  // Create rarity distribution stats
  const rarityDistribution: Record<string, number> = {};
  for (const [_, philosopher] of Object.entries(philosophersSeedData)) {
    rarityDistribution[philosopher.rarity] = (rarityDistribution[philosopher.rarity] || 0) + 1;
  }
  
  await metadataRef.child('rarity_distribution').set(rarityDistribution);
  
  // Create school groupings
  const schools: Record<string, string[]> = {};
  for (const [id, philosopher] of Object.entries(philosophersSeedData)) {
    if (!schools[philosopher.school]) {
      schools[philosopher.school] = [];
    }
    schools[philosopher.school].push(id);
  }
  
  await metadataRef.child('schools').set(schools);
  
  // Create era groupings
  const eras: Record<string, string[]> = {};
  for (const [id, philosopher] of Object.entries(philosophersSeedData)) {
    if (!eras[philosopher.era]) {
      eras[philosopher.era] = [];
    }
    eras[philosopher.era].push(id);
  }
  
  await metadataRef.child('eras').set(eras);
  
  console.log('✅ Game metadata created');
};

// Create lesson metadata and indices
const createLessonMetadata = async (db: any) => {
  console.log('\n📊 Creating lesson metadata...');
  
  const metadataRef = db.ref('lesson_metadata');
  
  // Group lessons by stage
  const stages: Record<string, string[]> = {};
  for (const [id, lesson] of Object.entries(lessonsSeedData)) {
    if (!stages[lesson.stage]) {
      stages[lesson.stage] = [];
    }
    stages[lesson.stage].push(id);
  }
  
  await metadataRef.child('stages').set(stages);
  
  // Create concept index
  const concepts: Record<string, string[]> = {};
  for (const [id, lesson] of Object.entries(lessonsSeedData)) {
    for (const concept of lesson.philosophicalConcepts) {
      if (!concepts[concept]) {
        concepts[concept] = [];
      }
      concepts[concept].push(id);
    }
  }
  
  await metadataRef.child('concepts').set(concepts);
  
  // Create difficulty distribution
  const difficulties: Record<string, number> = {};
  for (const lesson of Object.values(lessonsSeedData)) {
    difficulties[lesson.difficulty] = (difficulties[lesson.difficulty] || 0) + 1;
  }
  
  await metadataRef.child('difficulty_distribution').set(difficulties);
  
  console.log('✅ Lesson metadata created');
};

// Create search indices for better querying
const createSearchIndices = async (db: any) => {
  console.log('\n🔍 Creating search indices...');
  
  const searchRef = db.ref('search_indices');
  
  // Create philosopher indices
  const philosopherNameIndex: Record<string, string[]> = {};
  const abilityIndex: Record<string, string[]> = {};
  
  for (const [id, philosopher] of Object.entries(philosophersSeedData)) {
    // Simple tokenization for search
    const tokens = philosopher.name.toLowerCase().split(' ');
    
    for (const token of tokens) {
      if (!philosopherNameIndex[token]) {
        philosopherNameIndex[token] = [];
      }
      philosopherNameIndex[token].push(id);
    }
    
    // Index by school
    const schoolKey = philosopher.school.toLowerCase().replace(/\s+/g, '-');
    if (!philosopherNameIndex[schoolKey]) {
      philosopherNameIndex[schoolKey] = [];
    }
    philosopherNameIndex[schoolKey].push(id);
    
    // Index by special ability
    const abilityKey = philosopher.specialAbility.name.toLowerCase().replace(/\s+/g, '-');
    if (!abilityIndex[abilityKey]) {
      abilityIndex[abilityKey] = [];
    }
    abilityIndex[abilityKey].push(id);
  }
  
  // Create lesson indices
  const lessonTitleIndex: Record<string, string[]> = {};
  const conceptIndex: Record<string, string[]> = {};
  
  for (const [id, lesson] of Object.entries(lessonsSeedData)) {
    // Index by title tokens
    const tokens = lesson.title.toLowerCase().split(' ');
    for (const token of tokens) {
      if (token.length > 2) { // Skip short words
        if (!lessonTitleIndex[token]) {
          lessonTitleIndex[token] = [];
        }
        lessonTitleIndex[token].push(id);
      }
    }
    
    // Index by concepts
    for (const concept of lesson.philosophicalConcepts) {
      if (!conceptIndex[concept]) {
        conceptIndex[concept] = [];
      }
      conceptIndex[concept].push(id);
    }
  }
  
  // Create achievement indices
  const achievementNameIndex: Record<string, string[]> = {};
  
  for (const [id, achievement] of Object.entries(achievementsSeedData)) {
    // Index by name tokens
    const tokens = achievement.name.toLowerCase().split(' ');
    for (const token of tokens) {
      if (token.length > 2) { // Skip short words
        if (!achievementNameIndex[token]) {
          achievementNameIndex[token] = [];
        }
        achievementNameIndex[token].push(id);
      }
    }
  }
  
  await searchRef.child('philosophers').set(philosopherNameIndex);
  await searchRef.child('abilities').set(abilityIndex);
  await searchRef.child('lessons').set(lessonTitleIndex);
  await searchRef.child('concepts').set(conceptIndex);
  await searchRef.child('achievements').set(achievementNameIndex);
  
  console.log('✅ Search indices created');
};

// Seed achievements data
const seedAchievements = async (db: any) => {
  console.log('\n🏆 Seeding achievements...');
  
  // Validate each achievement
  for (const [id, achievement] of Object.entries(achievementsSeedData)) {
    try {
      AchievementSchema.parse(achievement);
    } catch (error) {
      console.error(`❌ Validation failed for achievement ${id}:`, error);
      throw error;
    }
  }
  
  console.log('✅ All achievement data validated successfully');
  
  const achievementsRef = db.ref('achievements');
  
  // Clear existing data
  await achievementsRef.remove();
  console.log('🗑️  Cleared existing achievements data');
  
  // Seed each achievement
  for (const [id, achievement] of Object.entries(achievementsSeedData)) {
    try {
      await achievementsRef.child(id).set(achievement);
      console.log(`✅ Added achievement: ${achievement.name} (${achievement.rewards.gachaTickets} tickets)`);
    } catch (error) {
      console.error(`❌ Error adding achievement ${achievement.name}:`, error);
      throw error;
    }
  }
  
  console.log(`\n✨ Successfully seeded ${Object.keys(achievementsSeedData).length} achievements`);
};

// Create achievement metadata
const createAchievementMetadata = async (db: any) => {
  console.log('\n📊 Creating achievement metadata...');
  
  const metadataRef = db.ref('achievement_metadata');
  
  // Group achievements by type
  const types: Record<string, string[]> = {};
  for (const [id, achievement] of Object.entries(achievementsSeedData)) {
    const type = achievement.criteria.type;
    if (!types[type]) {
      types[type] = [];
    }
    types[type].push(id);
  }
  
  await metadataRef.child('types').set(types);
  
  // Calculate reward tiers
  const tiers: Record<string, string[]> = {
    bronze: [],
    silver: [],
    gold: [],
    platinum: []
  };
  
  for (const [id, achievement] of Object.entries(achievementsSeedData)) {
    const totalReward = achievement.rewards.experience + (achievement.rewards.gachaTickets * 100);
    
    if (totalReward >= 1500) tiers.platinum.push(id);
    else if (totalReward >= 700) tiers.gold.push(id);
    else if (totalReward >= 300) tiers.silver.push(id);
    else tiers.bronze.push(id);
  }
  
  await metadataRef.child('tiers').set(tiers);
  
  // Calculate total rewards available
  const totalRewards = Object.values(achievementsSeedData).reduce(
    (totals, achievement) => ({
      totalExperience: totals.totalExperience + achievement.rewards.experience,
      totalGachaTickets: totals.totalGachaTickets + achievement.rewards.gachaTickets
    }),
    { totalExperience: 0, totalGachaTickets: 0 }
  );
  
  await metadataRef.child('total_rewards').set(totalRewards);
  
  console.log('✅ Achievement metadata created');
  console.log(`   Total XP available: ${totalRewards.totalExperience}`);
  console.log(`   Total Gacha Tickets: ${totalRewards.totalGachaTickets}`);
};

// Main seeding function
const seedDatabase = async () => {
  console.log('🌱 Starting database seed process...\n');
  
  try {
    const db = initializeFirebase();
    
    // Seed different collections
    await seedPhilosophers(db);
    await createGameMetadata(db);
    await seedLessons(db);
    await createLessonMetadata(db);
    await seedQuizzes(db);
    await seedDebateArguments(db);
    await seedAchievements(db);
    await createAchievementMetadata(db);
    await createSearchIndices(db);
    
    // Add more seed functions here as you create them:
    // await seedDailyChallenges(db);
    // await seedEvents(db);
    
    // Add more seed functions here as you create them:
    // await seedQuotes(db);
    // await seedConcepts(db);
    // await seedDebates(db);
    
    console.log('\n🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Add command line argument handling
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

if (isDryRun) {
  console.log('🏃 DRY RUN MODE - No data will be written\n');
  
  // Validate philosophers
  console.log('📋 Validating Philosophers...');
  for (const [id, philosopher] of Object.entries(philosophersSeedData)) {
    try {
      PhilosopherSchema.parse(philosopher);
      console.log(`✅ Valid: ${philosopher.name} (${philosopher.rarity})`);
    } catch (error) {
      console.error(`❌ Invalid philosopher ${id}:`, error);
    }
  }
  
  // Validate lessons
  console.log('\n📋 Validating Lessons...');
  for (const [id, lesson] of Object.entries(lessonsSeedData)) {
    try {
      LessonSchema.parse(lesson);
      console.log(`✅ Valid: ${lesson.title} (${lesson.difficulty})`);
    } catch (error) {
      console.error(`❌ Invalid lesson ${id}:`, error);
    }
  }
  
  // Validate quizzes
  console.log('\n📋 Validating Quizzes...');
  for (const [id, quiz] of Object.entries(quizzesSeedData)) {
    try {
      QuizSchema.parse(quiz);
      console.log(`✅ Valid: ${quiz.title} (${quiz.questions.length} questions)`);
    } catch (error) {
      console.error(`❌ Invalid quiz ${id}:`, error);
    }
  }
  
  // Validate achievements
  console.log('\n📋 Validating Achievements...');
  for (const [id, achievement] of Object.entries(achievementsSeedData)) {
    try {
      AchievementSchema.parse(achievement);
      console.log(`✅ Valid: ${achievement.name} (${achievement.criteria.type})`);
    } catch (error) {
      console.error(`❌ Invalid achievement ${id}:`, error);
    }
  }
  
  console.log('\n📊 Data summary:');
  console.log(`- Total Philosophers: ${Object.keys(philosophersSeedData).length}`);
  console.log(`- Total Lessons: ${Object.keys(lessonsSeedData).length}`);
  console.log(`- Total Quizzes: ${Object.keys(quizzesSeedData).length}`);
  console.log(`- Total Achievements: ${Object.keys(achievementsSeedData).length}`);
  console.log(`- Total Debate Arguments: ${Object.keys(debateArgumentsSeedData).length}`);
  
  // Show rarity distribution
  const rarityCount: Record<string, number> = {};
  for (const philosopher of Object.values(philosophersSeedData)) {
    rarityCount[philosopher.rarity] = (rarityCount[philosopher.rarity] || 0) + 1;
  }
  console.log('\n- Philosopher Rarity Distribution:', rarityCount);
  
  // Show lesson stages
  const stageCount: Record<string, number> = {};
  for (const lesson of Object.values(lessonsSeedData)) {
    stageCount[lesson.stage] = (stageCount[lesson.stage] || 0) + 1;
  }
  console.log('- Lesson Stages:', stageCount);
  
  // Show achievement types
  const achievementTypes: Record<string, number> = {};
  for (const achievement of Object.values(achievementsSeedData)) {
    const type = achievement.criteria.type;
    achievementTypes[type] = (achievementTypes[type] || 0) + 1;
  }
  console.log('- Achievement Types:', achievementTypes);
  
  console.log('\n✅ Dry run completed successfully');
} else {
  // Run the actual seeding
  seedDatabase();
}