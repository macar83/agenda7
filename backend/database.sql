-- Schema Database per Agenda App
-- PostgreSQL compatible

-- Tabella Utenti
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(100) UNIQUE,
    google_refresh_token TEXT, -- Token per accesso offline
    avatar_url TEXT,
    theme VARCHAR(20) DEFAULT 'light',
    sound_enabled BOOLEAN DEFAULT true,
    selected_rss_source VARCHAR(50) DEFAULT 'techcrunch',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Liste
CREATE TABLE IF NOT EXISTS lists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL, -- Hex color
    description TEXT,
    position INTEGER DEFAULT 0, -- Per ordinamento custom
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabella Task
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    list_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    details TEXT,
    completed BOOLEAN DEFAULT false,
    priority VARCHAR(10) DEFAULT 'medium', -- low, medium, high
    reminder TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    position INTEGER DEFAULT 0, -- Per ordinamento custom
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabella Impostazioni Utente
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabella Log Attività (per statistiche)
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL, -- task_created, task_completed, list_created, etc.
    entity_type VARCHAR(20), -- task, list, user
    entity_id INTEGER,
    metadata TEXT, -- JSON per dati aggiuntivi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabella Sessioni (per gestire login)
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON tasks(reminder);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Views per statistiche comuni
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id as user_id,
    u.name,
    COUNT(DISTINCT l.id) as total_lists,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.completed = true THEN t.id END) as completed_tasks,
    COUNT(DISTINCT CASE WHEN t.completed = false THEN t.id END) as pending_tasks,
    COUNT(DISTINCT CASE WHEN DATE(t.reminder) = CURRENT_DATE AND t.completed = false THEN t.id END) as tasks_today
FROM users u
LEFT JOIN lists l ON u.id = l.user_id
LEFT JOIN tasks t ON l.id = t.list_id
GROUP BY u.id, u.name;

-- View per task con info lista
CREATE OR REPLACE VIEW tasks_with_list AS
SELECT 
    t.*,
    l.name as list_name,
    l.color as list_color
FROM tasks t
JOIN lists l ON t.list_id = l.id;

-- Funzione generica per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per aggiornare updated_at automaticamente
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
CREATE TRIGGER update_users_timestamp 
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lists_timestamp ON lists;
CREATE TRIGGER update_lists_timestamp 
    BEFORE UPDATE ON lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_timestamp ON tasks;
CREATE TRIGGER update_tasks_timestamp 
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Funzione per settare completed_at
CREATE OR REPLACE FUNCTION set_task_completed_at_func()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed = true AND OLD.completed = false THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per settare completed_at quando task viene completato
DROP TRIGGER IF EXISTS set_task_completed_at ON tasks;
CREATE TRIGGER set_task_completed_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_task_completed_at_func();

-- Funzione per loggare creazione task
CREATE OR REPLACE FUNCTION log_task_created_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.user_id, 'task_created', 'task', NEW.id, 
            json_build_object('title', NEW.title, 'list_id', NEW.list_id)::text);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per logging automatico delle attività (task created)
DROP TRIGGER IF EXISTS log_task_created ON tasks;
CREATE TRIGGER log_task_created
    AFTER INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_created_func();

-- Funzione per loggare completamento task
CREATE OR REPLACE FUNCTION log_task_completed_func()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed = true AND OLD.completed = false THEN
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
        VALUES (NEW.user_id, 'task_completed', 'task', NEW.id,
                json_build_object('title', NEW.title, 'list_id', NEW.list_id)::text);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per logging automatico delle attività (task completed)
DROP TRIGGER IF EXISTS log_task_completed ON tasks;
CREATE TRIGGER log_task_completed
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_completed_func();

-- Funzione per loggare creazione lista
CREATE OR REPLACE FUNCTION log_list_created_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.user_id, 'list_created', 'list', NEW.id,
            json_build_object('name', NEW.name, 'color', NEW.color)::text);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per logging automatico delle attività (list created)
DROP TRIGGER IF EXISTS log_list_created ON lists;
CREATE TRIGGER log_list_created
    AFTER INSERT ON lists
    FOR EACH ROW
    EXECUTE FUNCTION log_list_created_func();