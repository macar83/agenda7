// backend/scripts/createDemoUser.js
const bcrypt = require('bcryptjs');
const { initDatabase, runQuery } = require('../config/database');

async function createDemoUser() {
  try {
    console.log('🚀 Creating demo user...');
    
    // Inizializza database
    await initDatabase();
    
    // Dati del demo user
    const demoUser = {
      email: 'test@demo.com',
      name: 'Demo User',
      password: 'password123'
    };
    
    // Hash della password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(demoUser.password, saltRounds);
    
    // Controlla se l'utente esiste già
    const existingUser = await require('../config/database').getOne(
      'SELECT id FROM users WHERE email = ?',
      [demoUser.email]
    );
    
    if (existingUser) {
      console.log('ℹ️ Demo user already exists');
      return;
    }
    
    // Crea l'utente
    const result = await runQuery(`
      INSERT INTO users (email, name, password_hash, theme, sound_enabled, selected_rss_source)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      demoUser.email,
      demoUser.name,
      passwordHash,
      'light',
      true,
      'techcrunch'
    ]);
    
    const userId = result.lastID;
    
    // Crea liste di esempio
    const sampleLists = [
      {
        name: 'Lista di Benvenuto',
        color: '#3B82F6',
        description: 'I tuoi primi task per iniziare!',
        position: 1
      },
      {
        name: 'Lavoro',
        color: '#EF4444',
        description: 'Task relativi al lavoro',
        position: 2
      },
      {
        name: 'Personale',
        color: '#10B981',
        description: 'Task personali e hobby',
        position: 3
      }
    ];
    
    const listIds = [];
    
    for (const list of sampleLists) {
      const listResult = await runQuery(`
        INSERT INTO lists (user_id, name, color, description, position)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, list.name, list.color, list.description, list.position]);
      
      listIds.push(listResult.lastID);
    }
    
    // Crea task di esempio
    const sampleTasks = [
      {
        listId: listIds[0],
        title: 'Benvenuto in Task Manager Pro! 🎉',
        details: 'Questo è un task di esempio. Puoi modificarlo o eliminarlo.',
        priority: 'medium',
        position: 1,
        completed: false
      },
      {
        listId: listIds[0],
        title: 'Esplora le funzionalità',
        details: 'Prova a creare nuovi task, liste e personalizza le impostazioni.',
        priority: 'low',
        position: 2,
        completed: false
      },
      {
        listId: listIds[0],
        title: 'Completa questo task',
        details: 'Clicca sulla checkbox per contrassegnare questo task come completato.',
        priority: 'high',
        position: 3,
        completed: false
      },
      {
        listId: listIds[1],
        title: 'Riunione di team',
        details: 'Partecipa alla riunione settimanale del team alle 14:00.',
        priority: 'high',
        position: 1,
        completed: false,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Domani
      },
      {
        listId: listIds[1],
        title: 'Rivedere il progetto X',
        details: 'Controllare i progressi e aggiornare la documentazione.',
        priority: 'medium',
        position: 2,
        completed: true,
        completedAt: new Date().toISOString()
      },
      {
        listId: listIds[2],
        title: 'Leggere un libro',
        details: 'Continuare la lettura del libro iniziato la settimana scorsa.',
        priority: 'low',
        position: 1,
        completed: false
      },
      {
        listId: listIds[2],
        title: 'Fare la spesa',
        details: 'Comprare ingredienti per la cena di domani.',
        priority: 'medium',
        position: 2,
        completed: false
      }
    ];
    
    for (const task of sampleTasks) {
      await runQuery(`
        INSERT INTO tasks (
          list_id, 
          title, 
          details, 
          priority, 
          position, 
          completed, 
          due_date,
          completed_at,
          user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        task.listId,
        task.title,
        task.details,
        task.priority,
        task.position,
        task.completed ? 1 : 0,
        task.dueDate || null,
        task.completedAt || null,
        userId
      ]);
    }
    
    console.log('✅ Demo user created successfully!');
    console.log('📧 Email:', demoUser.email);
    console.log('🔑 Password:', demoUser.password);
    console.log('📊 Sample data:', {
      lists: sampleLists.length,
      tasks: sampleTasks.length
    });
    
  } catch (error) {
    console.error('❌ Error creating demo user:', error);
    throw error;
  }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
  createDemoUser()
    .then(() => {
      console.log('🎯 Demo user setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Demo user setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createDemoUser };