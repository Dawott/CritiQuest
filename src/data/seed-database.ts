import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { philosophersSeedData, PhilosopherSchema, Rarity } from './philosophers.seed';

//Inicjalizacja Firebase SDK
const initializeFirebase = () => {
  try {
    initializeApp({
      credential: cert({
        // Option 1: Use environment variables
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      // Option 2: Use service account file
      // credential: cert('./path-to-your-service-account-key.json'),
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
const validateData = <T>(data: T[], schema: any, dataType: string): boolean => {
  console.log(`\n🔍 Validating ${dataType} data...`);
  
  for (const item of data) {
    try {
      schema.parse(item);
    } catch (error) {
      console.error(`Validation failed for ${dataType}:`, error);
      return false;
    }
  }
  
  console.log(`All ${dataType} data validated successfully`);
  return true;
};

// Seed philosophers data
const seedPhilosophers = async (db: any) => {
  console.log('\n📚 Seeding philosophers...');
  
  // Validate each philosopher in the object
  for (const [id, philosopher] of Object.entries(philosophersSeedData)) {
    try {
      PhilosopherSchema.parse(philosopher);
    } catch (error) {
      console.error(`Validation failed for philosopher ${id}:`, error);
      throw error;
    }
  }
  
  console.log('All philosopher data validated successfully');
  
  const philosophersRef = db.ref('philosophers');
  
  // Clear existing data (optional - comment out if you want to preserve existing data)
  await philosophersRef.remove();
  console.log('🗑️  Cleared existing philosophers data');
  
  // Seed each philosopher
  for (const [id, philosopher] of Object.entries(philosophersSeedData)) {
    try {
      await philosophersRef.child(id).set(philosopher);
      console.log(`Added philosopher: ${philosopher.name} (${philosopher.rarity})`);
    } catch (error) {
      console.error(`Error adding philosopher ${philosopher.name}:`, error);
      throw error;
    }
  }
  
  console.log(`\nSuccessfully seeded ${Object.keys(philosophersSeedData).length} philosophers`);
};

// Create game-specific metadata
const createGameMetadata = async (db: any) => {
  console.log('\nCreating game metadata...');
  
  const metadataRef = db.ref('game_metadata');
  
  // Rarity distribution - staty
  const rarityDistribution: Record<string, number> = {};
  for (const [_, philosopher] of Object.entries(philosophersSeedData)) {
    rarityDistribution[philosopher.rarity] = (rarityDistribution[philosopher.rarity] || 0) + 1;
  }
  
  await metadataRef.child('rarity_distribution').set(rarityDistribution);
  
  // Grupa po szkołach
  const schools: Record<string, string[]> = {};
  for (const [id, philosopher] of Object.entries(philosophersSeedData)) {
    if (!schools[philosopher.school]) {
      schools[philosopher.school] = [];
    }
    schools[philosopher.school].push(id);
  }
  
  await metadataRef.child('schools').set(schools);
  
  // Grupa po erach
  const eras: Record<string, string[]> = {};
  for (const [id, philosopher] of Object.entries(philosophersSeedData)) {
    if (!eras[philosopher.era]) {
      eras[philosopher.era] = [];
    }
    eras[philosopher.era].push(id);
  }
  
  await metadataRef.child('eras').set(eras);
  
  console.log('Game metadata created');
};

// Indexy do lepszego kwerowania
const createSearchIndices = async (db: any) => {
  console.log('\nTworzenie indeksow wyszukiwan...');
  
  const searchRef = db.ref('search_indices');
  
  // Create name index
  const nameIndex: Record<string, string[]> = {};
  const abilityIndex: Record<string, string[]> = {};
  
  for (const [id, philosopher] of Object.entries(philosophersSeedData)) {
    // Prosta tokenizacja
    const tokens = philosopher.name.toLowerCase().split(' ');
    
    for (const token of tokens) {
      if (!nameIndex[token]) {
        nameIndex[token] = [];
      }
      nameIndex[token].push(id);
    }
    
    // Index po szkole
    const schoolKey = philosopher.school.toLowerCase().replace(/\s+/g, '-');
    if (!nameIndex[schoolKey]) {
      nameIndex[schoolKey] = [];
    }
    nameIndex[schoolKey].push(id);
    
    // Index po umiejetnosci
    const abilityKey = philosopher.specialAbility.name.toLowerCase().replace(/\s+/g, '-');
    if (!abilityIndex[abilityKey]) {
      abilityIndex[abilityKey] = [];
    }
    abilityIndex[abilityKey].push(id);
  }
  
  await searchRef.child('philosophers').set(nameIndex);
  await searchRef.child('abilities').set(abilityIndex);
  console.log('✅ Search indices created');
};

// Main seeding function
const seedDatabase = async () => {
  console.log('Starting database seed process...\n');
  
  try {
    const db = initializeFirebase();
    
    // Seed different collections
    await seedPhilosophers(db);
    await createGameMetadata(db);
    await createSearchIndices(db);
    
    // TBD
    // await seedQuotes(db);
    // await seedConcepts(db);
    // await seedDebates(db);
    
    console.log('\nSeeding się powiodl!');
    process.exit(0);
  } catch (error) {
    console.error('\nSeeding nieudany:', error);
    process.exit(1);
  }
};

// CLI argument handling
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

if (isDryRun) {
  console.log('DRY RUN MODE - DANE NIE BEDA ZAPISANE\n');
  
  // Waliduj dane
  for (const [id, philosopher] of Object.entries(philosophersSeedData)) {
    try {
      PhilosopherSchema.parse(philosopher);
      console.log(`Poprawny: ${philosopher.name} (${philosopher.rarity})`);
    } catch (error) {
      console.error(`Błędny filozof ${id}:`, error);
    }
  }
  
  console.log('\nData summary:');
  console.log(`- Filozofów ogolnie: ${Object.keys(philosophersSeedData).length}`);
  
  // Rarity distribution
  const rarityCount: Record<string, number> = {};
  for (const philosopher of Object.values(philosophersSeedData)) {
    rarityCount[philosopher.rarity] = (rarityCount[philosopher.rarity] || 0) + 1;
  }
  console.log('- Rzadkosc:', rarityCount);
  
  console.log('\n✅ Dry run zakończony');
} else {
  // Rozpocznij seeding
  seedDatabase();
}