const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { runQuery, getOne } = require('../config/database');

// Configurazione OAuth2
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/auth/google/callback` // Redirect URI (da gestire nel frontend o backend proxy)
);

// Nota: In sviluppo locale, spesso è più semplice gestire il redirect direttamente dal backend
// Ma per React, useremo un approccio ibrido:
// 1. Frontend chiama /api/auth/google/login -> Backend risponde con URL auth
// 2. Frontend reindirizza utente
// 3. Google reindirizza a /api/auth/google/callback (Backend)
// 4. Backend processa, crea sessione e reindirizza a Frontend (/)

// Configura redirect URI corretto per il backend
const BACKEND_REDIRECT_URI = `http://localhost:${process.env.PORT || 5001}/api/auth/google/callback`;

const oauth2ClientBackend = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    BACKEND_REDIRECT_URI
);

// GET /api/auth/google/login
// Inizia il flow: genera URL e reindirizza
router.get('/login', (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
    ];

    const url = oauth2ClientBackend.generateAuthUrl({
        access_type: 'offline', // Fondamentale per avere il Refresh Token
        scope: scopes,
        prompt: 'consent' // Forza il consenso per essere sicuri di avere il refresh token
    });

    res.redirect(url);
});

// GET /api/auth/google/callback
// Riceve il codice da Google, scambia token, crea sessione
router.get('/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
    }

    try {
        const { tokens } = await oauth2ClientBackend.getToken(code);
        oauth2ClientBackend.setCredentials(tokens);

        // Ottieni info utente
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2ClientBackend });
        const userInfo = await oauth2.userinfo.get();

        const email = userInfo.data.email;
        const googleId = userInfo.data.id;
        const name = userInfo.data.name;
        const picture = userInfo.data.picture;

        // Cerca o crea utente
        let user = await getOne('SELECT * FROM users WHERE email = ?', [email]);

        if (user) {
            // Aggiorna
            const refreshToken = tokens.refresh_token || user.google_refresh_token; // Mantieni vecchio se non c'è nuovo
            await runQuery(
                'UPDATE users SET google_refresh_token = ?, google_id = ?, avatar_url = ? WHERE id = ?',
                [refreshToken, googleId, picture, user.id]
            );
        } else {
            // Crea
            if (!tokens.refresh_token) {
                // Se è un nuovo utente e non abbiamo refresh token, è un problema.
                // Ma con prompt='consent' dovremmo averlo sempre.
                console.warn('⚠️ New user created without refresh token!');
            }
            await runQuery(
                'INSERT INTO users (email, name, google_id, google_refresh_token, avatar_url) VALUES (?, ?, ?, ?, ?) RETURNING id',
                [email, name, googleId, tokens.refresh_token, picture]
            );
            user = await getOne('SELECT * FROM users WHERE email = ?', [email]);
        }

        // CREA SESSIONE
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.isAuthenticated = true;

        // Salva sessione esplicitamente prima del redirect
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.redirect(`${process.env.FRONTEND_URL}?error=session_error`);
            }
            // Redirect al frontend (successo)
            res.redirect(`${process.env.FRONTEND_URL}`);
        });

    } catch (error) {
        console.error('Callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
    }
});

// GET /api/auth/google/token
// Endpoint chiamato dal frontend per ottenere l'access token corrente
router.get('/token', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ isAuthenticated: false });
    }

    try {
        const user = await getOne('SELECT google_refresh_token, email, name, avatar_url FROM users WHERE id = ?', [req.session.userId]);

        if (!user || !user.google_refresh_token) {
            return res.status(401).json({ isAuthenticated: false, error: 'No refresh token' });
        }

        // Usa refresh token per ottenere access token fresco
        oauth2ClientBackend.setCredentials({
            refresh_token: user.google_refresh_token
        });

        const { credentials } = await oauth2ClientBackend.refreshAccessToken();

        res.json({
            isAuthenticated: true,
            accessToken: credentials.access_token,
            expiryDate: credentials.expiry_date,
            user: {
                email: user.email,
                name: user.name,
                picture: user.avatar_url
            }
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({ isAuthenticated: false, error: 'Token refresh failed' });
    }
});

// POST /api/auth/google/logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid'); // Nome default cookie express-session
        res.json({ success: true });
    });
});

module.exports = router;
