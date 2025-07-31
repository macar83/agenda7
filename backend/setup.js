// backend/setup.js
// Script per inizializzare il database e creare utente demo - VERSIONE CORRETTA

const bcrypt = require('bcryptjs');
const { initDatabase, runQuery, getOne } = require('./config/database');

async function setupBackend() {
  try {
    console.log('🚀 Initializing backend...');
    
    // 1. Inizializza database (crea tabelle se non esistono)
    console.log('📊 Setting up database...');
    await initDatabase();
    console.log('✅ Database initialized');
    
    // 2. Crea utente demo
    console.log('👤 Creating demo user...');
    await createDemoUser();
    
    console.log('🎉 Backend setup completed!');
    console.log('');
    console.log('🎯 Demo Credentials:');
    console.log('📧 Email: test@demo.com');
    console.log('🔑 Password: password123');
    console.log('');
    console.log('🚀 You can now start the backend with: npm run dev');
    
  } catch (error) {
    console.error('❌ Backend setup failed:', error);
    throw error;
  }
}

async function createDemoUser() {
  try {
    // Dati del demo user
    const demoUser = {
      email: 'test@demo.com',
      name: 'Demo User',
      password: 'password123'
    };
    
    // Controlla se l'utente esiste già
    const existingUser = await getOne(
      'SELECT id, email FROM users WHERE email = ?',
      [demoUser.email]
    );
    
    if (existingUser) {
      console.log('ℹ️ Demo user already exists:', existingUser.email);
      console.log('🔍 User ID:', existingUser.id);
      
      // Verifica se ha già delle liste
      const existingLists = await getOne(
        'SELECT COUNT(*) as count FROM lists WHERE user_id = ?',
        [existingUser.id]
      );
      
      if (existingLists.count > 0) {
        console.log('📋 User already has', existingLists.count, 'lists');
        return existingUser;
      } else {
        console.log('📋 Creating sample data for existing user...');
        await createSampleData(existingUser.id);
        return existingUser;
      }
    }
    
    // Hash della password
    console.log('🔐 Hashing password...');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(demoUser.password, saltRounds);
    
    // Crea l'utente con un approccio più robusto
    console.log('📝 Creating user in database...');
    
    // Prima inserisci l'utente
    await runQuery(`
      INSERT INTO users (email, name, password_hash, theme, sound_enabled, selected_rss_source)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      demoUser.email,
      demoUser.name,
      passwordHash,
      'light',
      1, // true -> 1 in SQLite
      'techcrunch'
    ]);
    
    // Poi recupera l'ID dell'utente appena creato
    const createdUser = await getOne(
      'SELECT id, email FROM users WHERE email = ?',
      [demoUser.email]
    );
    
    if (!createdUser || !createdUser.id) {
      throw new Error('Failed to create user or retrieve user ID');
    }
    
    const userId = createdUser.id;
    console.log('✅ Demo user created with ID:', userId);
    
    // Crea i dati di esempio
    await createSampleData(userId);
    
    return { userId, email: demoUser.email };
    
  } catch (error) {
    console.error('❌ Error creating demo user:', error);
    throw error;
  }
}

async function createSampleData(userId) {
  try {
    console.log('📋 Creating sample lists for user ID:', userId);
    
    // Verifica che l'userId sia valido
    if (!userId) {
      throw new Error('Invalid userId provided to createSampleData');
    }
    
    const sampleLists = [
      {
        name: '🎯 Getting Started',
        color: '#3B82F6',
        description: 'I tuoi primi task per iniziare con Task Manager Pro!',
        position: 1
      },
      {
        name: '💼 Lavoro',
        color: '#EF4444',
        description: 'Task relativi al lavoro e progetti',
        position: 2
      },
      {
        name: '🏠 Personale',
        color: '#10B981',
        description: 'Task personali, hobby e vita quotidiana',
        position: 3
      }
    ];
    
    const listIds = [];
    
    for (const list of sampleLists) {
      console.log(`  📝 Creating list: ${list.name} for user ${userId}`);
      
      // Inserisci la lista
      await runQuery(`
        INSERT INTO lists (user_id, name, color, description, position)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, list.name, list.color, list.description, list.position]);
      
      // Recupera l'ID della lista appena creata
      const createdList = await getOne(`
        SELECT id FROM lists 
        WHERE user_id = ? AND name = ? 
        ORDER BY id DESC LIMIT 1
      `, [userId, list.name]);
      
      if (!createdList || !createdList.id) {
        throw new Error(`Failed to create list: ${list.name}`);
      }
      
      listIds.push(createdList.id);
      console.log(`  ✅ Created list: ${list.name} (ID: ${createdList.id})`);
    }
    
    // Crea task di esempio
    console.log('📝 Creating sample tasks...');
    const sampleTasks = [
      // Lista Getting Started
      {
        listId: listIds[0],
        title: 'Benvenuto in Task Manager Pro! 🎉',
        details: 'Questo è un task di esempio. Puoi modificarlo, completarlo o eliminarlo quando vuoi!',
        priority: 'medium',
        position: 1,
        completed: false
      },
      {
        listId: listIds[0],
        title: 'Esplora le funzionalità principali',
        details: 'Prova a: creare nuovi task, organizzare le liste, personalizzare le impostazioni e visualizzare le statistiche.',
        priority: 'low',
        position: 2,
        completed: false
      },
      {
        listId: listIds[0],
        title: 'Completa il tuo primo task',
        details: 'Clicca sulla checkbox di questo task per contrassegnarlo come completato e vedere come funziona!',
        priority: 'high',
        position: 3,
        completed: false
      },
      
      // Lista Lavoro
      {
        listId: listIds[1],
        title: 'Riunione di team settimanale',
        details: 'Partecipa alla riunione settimanale del team alle 14:00 per discutere i progressi del progetto.',
        priority: 'high',
        position: 1,
        completed: false,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Domani
      },
      {
        listId: listIds[1],
        title: 'Rivedere documenti del progetto X',
        details: 'Controllare i progressi, aggiornare la documentazione e preparare il report per il cliente.',
        priority: 'medium',
        position: 2,
        completed: true,
        completedAt: new Date().toISOString()
      },
      {
        listId: listIds[1],
        title: 'Pianificare sprint successivo',
        details: 'Organizzare le priorità e assegnare i task per il prossimo ciclo di sviluppo.',
        priority: 'medium',
        position: 3,
        completed: false
      },
      
      // Lista Personale
      {
        listId: listIds[2],
        title: 'Leggere "Atomic Habits"',
        details: 'Continuare la lettura del libro sulle abitudini e prendere appunti sui concetti chiave.',
        priority: 'low',
        position: 1,
        completed: false
      },
      {
        listId: listIds[2],
        title: 'Fare la spesa per la settimana',
        details: 'Comprare ingredienti freschi per i pasti della settimana, inclusi frutta e verdura.',
        priority: 'medium',
        position: 2,
        completed: false,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // Dopodomani
      },
      {
        listId: listIds[2],
        title: 'Chiamare i genitori',
        details: 'Fare una videochiamata per sapere come stanno e raccontare le novità.',
        priority: 'medium',
        position: 3,
        completed: false
      }
    ];
    
    for (const task of sampleTasks) {
      console.log(`  📝 Creating task: ${task.title}`);
      
      await runQuery(`
        INSERT INTO tasks (
          list_id, 
          user_id,
          title, 
          details, 
          priority, 
          position, 
          completed, 
          due_date,
          completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        task.listId,
        userId,
        task.title,
        task.details,
        task.priority,
        task.position,
        task.completed ? 1 : 0,
        task.dueDate || null,
        task.completedAt || null
      ]);
      
      console.log(`  ✅ Created task: ${task.title}`);
    }
    
    console.log('📊 Sample data created successfully:', {
      lists: sampleLists.length,
      tasks: sampleTasks.length
    });
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
}

// Esegui setup se chiamato direttamente
if (require.main === module) {
  setupBackend()
    .then(() => {
      console.log('✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupBackend, createDemoUser };