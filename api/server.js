require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000; // Default to 5000 for local development

// --- Firebase Admin SDK Initialization ---
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
  });
}

const db = admin.firestore(); // This is your privileged Firestore instance

// --- Middleware ---
// Configure CORS to allow requests from your frontend's domain
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://127.0.0.1:3000', // Adjust for local dev and production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // If you send cookies/auth headers
}));
app.use(express.json()); // To parse JSON request bodies

// --- Basic Admin Authentication Middleware (IMPORTANT!) ---
app.use(async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];

    if (!idToken) {
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        // Optionally, add logic here to check if the user has an 'admin' custom claim or is in a specific admin group
        next();
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        res.status(403).json({ message: 'Unauthorized: Invalid token.' });
    }
});

// --- Constants for Firestore Paths ---
const LEAGUE_BASE_PATH = 'artifacts/hkplweb/public/data/leagues/hkpl';
const TEAMS_COLLECTION = `${LEAGUE_BASE_PATH}/teams`;
const PLAYERS_COLLECTION = `${LEAGUE_BASE_PATH}/players`;
const NEWS_COLLECTION = `${LEAGUE_BASE_PATH}/news`;
const MATCHES_COLLECTION = `${LEAGUE_BASE_PATH}/matches`;

// --- Helper for Date Parsing (New Function) ---
// Parses a "DD-MM-YYYY" string into a Date object
function parseDDMMYYYYToDate(ddmmyyyy) {
    const parts = ddmmyyyy.split('-');
    if (parts.length !== 3) {
        throw new Error('Invalid date format. Expected DD-MM-YYYY.');
    }
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
}

// --- Helper for Daily Sequential ID Generation ---
async function generateDailySequentialId(collectionRef, prefix, dateStringDDMMYYYY) {
    // Count matches with the same date string
    const snapshot = await collectionRef.where('date', '==', dateStringDDMMYYYY).get();
    const count = snapshot.size;
    const sequentialNum = (count + 1).toString().padStart(2, '0'); // e.g., 01, 02
    return `${dateStringDDMMYYYY.replace(/-/g, '')}-${sequentialNum}`; // Format DDMMYYYY-NN
}

// --- Admin API Routes ---

// 0. Health Check (before auth middleware, for Cloud Run)
app.get('/', (req, res) => {
    res.status(200).send('Admin Panel Backend is running!');
});


// 1. Teams Management
// Fields: LogoUrl(string),draw(number),ga(number),gf(number),lost(number),name(string),name_mm(string),played(number),won(number)
app.get('/api/teams', async (req, res) => {
    try {
        const snapshot = await db.collection(TEAMS_COLLECTION).get();
        const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(teams);
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ message: 'Error fetching teams' });
    }
});

app.post('/api/teams', async (req, res) => {
    try {
        const newTeamData = {
            LogoUrl: req.body.LogoUrl || '',
            draw: Number(req.body.draw) || 0,
            ga: Number(req.body.ga) || 0,
            gf: Number(req.body.gf) || 0,
            lost: Number(req.body.lost) || 0,
            name: req.body.name || '',
            name_mm: req.body.name_mm || '',
            played: Number(req.body.played) || 0,
            won: Number(req.body.won) || 0,
        };

        // Basic validation
        if (!newTeamData.name) {
            return res.status(400).json({ message: 'Team name is required.' });
        }

        const docRef = await db.collection(TEAMS_COLLECTION).add(newTeamData);
        res.status(201).json({ message: 'Team added successfully', id: docRef.id });
    } catch (error) {
        console.error('Error adding team:', error);
        res.status(500).json({ message: 'Error adding team' });
    }
});

app.put('/api/teams/:id', async (req, res) => {
    try {
        const teamId = req.params.id;
        const updatedData = {
            LogoUrl: req.body.LogoUrl,
            draw: Number(req.body.draw),
            ga: Number(req.body.ga),
            gf: Number(req.body.gf),
            lost: Number(req.body.lost),
            name: req.body.name,
            name_mm: req.body.name_mm,
            played: Number(req.body.played),
            won: Number(req.body.won),
        };
        // Filter out undefined values if fields are optional
        Object.keys(updatedData).forEach(key => updatedData[key] === undefined && delete updatedData[key]);

        await db.collection(TEAMS_COLLECTION).doc(teamId).update(updatedData);
        res.json({ message: 'Team updated successfully' });
    } catch (error) {
        console.error('Error updating team:', error);
        res.status(500).json({ message: 'Error updating team' });
    }
});

app.delete('/api/teams/:id', async (req, res) => {
    try {
        const teamId = req.params.id;
        await db.collection(TEAMS_COLLECTION).doc(teamId).delete();
        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({ message: 'Error deleting team' });
    }
});


// 2. Players Management
// Fields: imageUrl(string), name(string), name_en(string), number(number), position(string), team_id(string)
app.get('/api/players', async (req, res) => {
    try {
        const snapshot = await db.collection(PLAYERS_COLLECTION).get();
        const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(players);
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ message: 'Error fetching players' });
    }
});

app.post('/api/players', async (req, res) => {
    try {
        const newPlayerId = `hkpl_${db.collection(PLAYERS_COLLECTION).doc().id}`; // Generate Firebase auto-ID with prefix
        const newPlayerData = {
            imageUrl: req.body.imageUrl || '',
            name: req.body.name || '',
            name_en: req.body.name_en || '',
            number: Number(req.body.number) || 0,
            position: req.body.position || '',
            team_id: req.body.team_id || '',
        };

        // Basic validation
        if (!newPlayerData.name || !newPlayerData.team_id || !newPlayerData.position) {
            return res.status(400).json({ message: 'Player name, team, and position are required.' });
        }
        const allowedPositions = ['GK', 'DF', 'MF', 'FW'];
        if (!allowedPositions.includes(newPlayerData.position)) {
            return res.status(400).json({ message: 'Invalid player position. Must be GK, DF, MF, or FW.' });
        }

        await db.collection(PLAYERS_COLLECTION).doc(newPlayerId).set(newPlayerData); // Use set() with custom ID
        res.status(201).json({ message: 'Player added successfully', id: newPlayerId });
    } catch (error) {
        console.error('Error adding player:', error);
        res.status(500).json({ message: 'Error adding player' });
    }
});

app.put('/api/players/:id', async (req, res) => {
    try {
        const playerId = req.params.id;
        const updatedData = {
            imageUrl: req.body.imageUrl,
            name: req.body.name,
            name_en: req.body.name_en,
            number: Number(req.body.number),
            position: req.body.position,
            team_id: req.body.team_id,
        };
        Object.keys(updatedData).forEach(key => updatedData[key] === undefined && delete updatedData[key]);

        if (updatedData.position) {
            const allowedPositions = ['GK', 'DF', 'MF', 'FW'];
            if (!allowedPositions.includes(updatedData.position)) {
                return res.status(400).json({ message: 'Invalid player position. Must be GK, DF, MF, or FW.' });
            }
        }

        await db.collection(PLAYERS_COLLECTION).doc(playerId).update(updatedData);
        res.json({ message: 'Player updated successfully' });
    } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ message: 'Error updating player' });
    }
});

app.delete('/api/players/:id', async (req, res) => {
    try {
        const playerId = req.params.id;
        await db.collection(PLAYERS_COLLECTION).doc(playerId).delete();
        res.json({ message: 'Player deleted successfully' });
    } catch (error) {
        console.error('Error deleting player:', error);
        res.status(500).json({ message: 'Error deleting player' });
    }
});


// 3. News Management
// Fields: body(string), date(timestamp), imgUrl(array), tags(array), title(string)
app.get('/api/news', async (req, res) => {
    try {
        const snapshot = await db.collection(NEWS_COLLECTION).orderBy('date', 'desc').get(); // Order by date for display
        const news = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(news);
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ message: 'Error fetching news' });
    }
});

app.post('/api/news', async (req, res) => {
    try {
        const currentLocalDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
        const newNewsId = await generateDailySequentialId(db.collection(NEWS_COLLECTION), 'news', currentLocalDate);

        const newNewsData = {
            body: req.body.body || '',
            date: admin.firestore.Timestamp.fromDate(new Date()), // Store current timestamp
            imgUrl: Array.isArray(req.body.imgUrl) ? req.body.imgUrl : [],
            tags: Array.isArray(req.body.tags) ? req.body.tags : [],
            title: req.body.title || '',
        };

        if (!newNewsData.title || !newNewsData.body) {
            return res.status(400).json({ message: 'News title and body are required.' });
        }

        await db.collection(NEWS_COLLECTION).doc(newNewsId).set(newNewsData);
        res.status(201).json({ message: 'News article added successfully', id: newNewsId });
    } catch (error) {
        console.error('Error adding news:', error);
        res.status(500).json({ message: 'Error adding news' });
    }
});

app.put('/api/news/:id', async (req, res) => {
    try {
        const newsId = req.params.id;
        const updatedData = {
            body: req.body.body,
            // date: We generally don't update creation date unless specific requirement
            imgUrl: Array.isArray(req.body.imgUrl) ? req.body.imgUrl : undefined,
            tags: Array.isArray(req.body.tags) ? req.body.tags : undefined,
            title: req.body.title,
        };
        Object.keys(updatedData).forEach(key => updatedData[key] === undefined && delete updatedData[key]);

        await db.collection(NEWS_COLLECTION).doc(newsId).update(updatedData);
        res.json({ message: 'News article updated successfully' });
    } catch (error) {
        console.error('Error updating news:', error);
        res.status(500).json({ message: 'Error updating news' });
    }
});

app.delete('/api/news/:id', async (req, res) => {
    try {
        const newsId = req.params.id;
        await db.collection(NEWS_COLLECTION).doc(newsId).delete();
        res.json({ message: 'News article deleted successfully' });
    } catch (error) {
            console.error('Error deleting news:', error);
            res.status(500).json({ message: 'Error deleting news' });
        }
});


// 4. Matches Management
// Fields: awayScore(number),awayTeamId(string),date(string),homeScore(number),homeTeamId(string),status(string),time(string)
app.get('/api/matches', async (req, res) => {
    try {
        // Query matches, ordering by date (which is now Timestamp) and then time
        const snapshot = await db.collection(MATCHES_COLLECTION).orderBy('date', 'desc').orderBy('time', 'desc').get();
        const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(matches);
    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({ message: 'Error fetching matches' });
    }
});

app.post('/api/matches', async (req, res) => {
    try {
        const matchDateStringDDMMYYYY = req.body.date; // Frontend sends DD-MM-YYYY
        if (!matchDateStringDDMMYYYY || !/^\d{2}-\d{2}-\d{4}$/.test(matchDateStringDDMMYYYY)) {
             return res.status(400).json({ message: 'Match date must be in "DD-MM-YYYY" format.' });
        }
        const parsedMatchDate = parseDDMMYYYYToDate(matchDateStringDDMMYYYY);

        const newMatchId = await generateDailySequentialId(db.collection(MATCHES_COLLECTION), 'match', matchDateStringDDMMYYYY);
        // Prevent overwrite: check if matchId already exists
        const existing = await db.collection(MATCHES_COLLECTION).doc(newMatchId).get();
        if (existing.exists) {
            return res.status(409).json({ message: 'A match with this ID already exists for this date.' });
        }

        const newMatchData = {
            awayScore: Number(req.body.awayScore) || 0,
            awayTeamId: req.body.awayTeamId || '',
            date: matchDateStringDDMMYYYY, // Store as string (DD-MM-YYYY)
            homeScore: Number(req.body.homeScore) || 0,
            homeTeamId: req.body.homeTeamId || '',
            status: req.body.status || 'upcoming',
            time: req.body.time || '00:00',
            matchId: newMatchId,
        };

        // Basic validation
        if (!newMatchData.homeTeamId || !newMatchData.awayTeamId || !newMatchData.date || !newMatchData.time || !newMatchData.status) {
            return res.status(400).json({ message: 'All match fields (teams, date, time, status) are required.' });
        }
        const allowedStatuses = ['ongoing', 'upcoming', 'finished'];
        if (!allowedStatuses.includes(newMatchData.status)) {
            return res.status(400).json({ message: 'Invalid match status. Must be ongoing, upcoming, or finished.' });
        }

        await db.collection(MATCHES_COLLECTION).doc(newMatchId).set(newMatchData);
        res.status(201).json({ message: 'Match added successfully', id: newMatchId });
    } catch (error) {
        console.error('Error adding match:', error);
        res.status(500).json({ message: 'Error adding match' });
    }
});

app.put('/api/matches/:id', async (req, res) => {
    try {
        const matchId = req.params.id;
        const updatedData = {
            awayScore: req.body.awayScore !== undefined ? Number(req.body.awayScore) : undefined,
            awayTeamId: req.body.awayTeamId,
            date: req.body.date, // This will be the DD-MM-YYYY string from frontend, need to parse
            homeScore: req.body.homeScore !== undefined ? Number(req.body.homeScore) : undefined,
            homeTeamId: req.body.homeTeamId,
            status: req.body.status,
            time: req.body.time,
        };
        // Filter out undefined values from request body
        Object.keys(updatedData).forEach(key => updatedData[key] === undefined && delete updatedData[key]);

        if (updatedData.status) {
            const allowedStatuses = ['ongoing', 'upcoming', 'finished'];
            if (!allowedStatuses.includes(updatedData.status)) {
                return res.status(400).json({ message: 'Invalid match status. Must be ongoing, upcoming, or finished.' });
            }
        }
        if (updatedData.date) { // If date is being updated, validate format only
            if (!/^\d{2}-\d{2}-\d{4}$/.test(updatedData.date)) {
                return res.status(400).json({ message: 'Match date must be in "DD-MM-YYYY" format.' });
            }
            // Keep as string, do not convert to Timestamp
        }

        await db.collection(MATCHES_COLLECTION).doc(matchId).update(updatedData);
        res.json({ message: 'Match updated successfully' });
    } catch (error) {
        console.error('Error updating match:', error);
        res.status(500).json({ message: 'Error updating match' });
    }
});

app.delete('/api/matches/:id', async (req, res) => {
    try {
        const matchId = req.params.id;
        await db.collection(MATCHES_COLLECTION).doc(matchId).delete();
        res.json({ message: 'Match deleted successfully' });
    } catch (error) {
        console.error('Error deleting match:', error);
        res.status(500).json({ message: 'Error deleting match' });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Admin backend running on port ${PORT}`);
    console.log(`Open in browser for testing: http://localhost:${PORT}`);
});
