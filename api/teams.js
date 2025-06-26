const { db } = require('./firebase');

const LEAGUE_BASE_PATH = 'artifacts/hkplweb/public/data/leagues/hkpl';
const TEAMS_COLLECTION = `${LEAGUE_BASE_PATH}/teams`;

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        try {
            const snapshot = await db.collection(TEAMS_COLLECTION).get();
            const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.status(200).json(teams);
        } catch (error) {
            console.error('Error fetching teams:', error);
            res.status(500).json({ message: 'Error fetching teams' });
        }
    } else if (req.method === 'POST') {
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
            if (!newTeamData.name) {
                return res.status(400).json({ message: 'Team name is required.' });
            }
            const docRef = await db.collection(TEAMS_COLLECTION).add(newTeamData);
            res.status(201).json({ message: 'Team added successfully', id: docRef.id });
        } catch (error) {
            console.error('Error adding team:', error);
            res.status(500).json({ message: 'Error adding team' });
        }
    } else if (req.method === 'PUT') {
        try {
            const teamId = req.query.id;
            if (!teamId) return res.status(400).json({ message: 'Team ID is required.' });
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
            Object.keys(updatedData).forEach(key => updatedData[key] === undefined && delete updatedData[key]);
            await db.collection(TEAMS_COLLECTION).doc(teamId).update(updatedData);
            res.json({ message: 'Team updated successfully' });
        } catch (error) {
            console.error('Error updating team:', error);
            res.status(500).json({ message: 'Error updating team' });
        }
    } else if (req.method === 'DELETE') {
        try {
            const teamId = req.query.id;
            if (!teamId) return res.status(400).json({ message: 'Team ID is required.' });
            await db.collection(TEAMS_COLLECTION).doc(teamId).delete();
            res.json({ message: 'Team deleted successfully' });
        } catch (error) {
            console.error('Error deleting team:', error);
            res.status(500).json({ message: 'Error deleting team' });
        }
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
