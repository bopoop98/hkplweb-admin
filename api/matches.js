const { db } = require('./firebase');

const LEAGUE_BASE_PATH = 'artifacts/hkplweb/public/data/leagues/hkpl';
const MATCHES_COLLECTION = `${LEAGUE_BASE_PATH}/matches`;

// Helper for date validation
function isValidDDMMYYYY(date) {
    return /^\d{2}-\d{2}-\d{4}$/.test(date);
}

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        try {
            const snapshot = await db.collection(MATCHES_COLLECTION).orderBy('date', 'desc').orderBy('time', 'desc').get();
            const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.status(200).json(matches);
        } catch (error) {
            console.error('Error fetching matches:', error);
            res.status(500).json({ message: 'Error fetching matches' });
        }
    } else if (req.method === 'POST') {
        try {
            const matchDateStringDDMMYYYY = req.body.date;
            if (!matchDateStringDDMMYYYY || !isValidDDMMYYYY(matchDateStringDDMMYYYY)) {
                return res.status(400).json({ message: 'Match date must be in "DD-MM-YYYY" format.' });
            }
            const newMatchId = `match-${Date.now()}`;
            const newMatchData = {
                awayScore: Number(req.body.awayScore) || 0,
                awayTeamId: req.body.awayTeamId || '',
                date: matchDateStringDDMMYYYY,
                homeScore: Number(req.body.homeScore) || 0,
                homeTeamId: req.body.homeTeamId || '',
                status: req.body.status || 'upcoming',
                time: req.body.time || '00:00',
                matchId: newMatchId,
            };
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
    } else if (req.method === 'PUT') {
        try {
            const matchId = req.query.id;
            if (!matchId) return res.status(400).json({ message: 'Match ID is required.' });
            const updatedData = {
                awayScore: req.body.awayScore !== undefined ? Number(req.body.awayScore) : undefined,
                awayTeamId: req.body.awayTeamId,
                date: req.body.date,
                homeScore: req.body.homeScore !== undefined ? Number(req.body.homeScore) : undefined,
                homeTeamId: req.body.homeTeamId,
                status: req.body.status,
                time: req.body.time,
            };
            Object.keys(updatedData).forEach(key => updatedData[key] === undefined && delete updatedData[key]);
            if (updatedData.status) {
                const allowedStatuses = ['ongoing', 'upcoming', 'finished'];
                if (!allowedStatuses.includes(updatedData.status)) {
                    return res.status(400).json({ message: 'Invalid match status. Must be ongoing, upcoming, or finished.' });
                }
            }
            if (updatedData.date) {
                if (!isValidDDMMYYYY(updatedData.date)) {
                    return res.status(400).json({ message: 'Match date must be in "DD-MM-YYYY" format.' });
                }
            }
            await db.collection(MATCHES_COLLECTION).doc(matchId).update(updatedData);
            res.json({ message: 'Match updated successfully' });
        } catch (error) {
            console.error('Error updating match:', error);
            res.status(500).json({ message: 'Error updating match' });
        }
    } else if (req.method === 'DELETE') {
        try {
            const matchId = req.query.id;
            if (!matchId) return res.status(400).json({ message: 'Match ID is required.' });
            await db.collection(MATCHES_COLLECTION).doc(matchId).delete();
            res.json({ message: 'Match deleted successfully' });
        } catch (error) {
            console.error('Error deleting match:', error);
            res.status(500).json({ message: 'Error deleting match' });
        }
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
