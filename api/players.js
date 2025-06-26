const { db } = require('./firebase');

const LEAGUE_BASE_PATH = 'artifacts/hkplweb/public/data/leagues/hkpl';
const PLAYERS_COLLECTION = `${LEAGUE_BASE_PATH}/players`;

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        try {
            const snapshot = await db.collection(PLAYERS_COLLECTION).get();
            const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.status(200).json(players);
        } catch (error) {
            console.error('Error fetching players:', error);
            res.status(500).json({ message: 'Error fetching players' });
        }
    } else if (req.method === 'POST') {
        try {
            const newPlayerId = `hkpl_${db.collection(PLAYERS_COLLECTION).doc().id}`;
            const newPlayerData = {
                imageUrl: req.body.imageUrl || '',
                name: req.body.name || '',
                name_en: req.body.name_en || '',
                number: Number(req.body.number) || 0,
                position: req.body.position || '',
                team_id: req.body.team_id || '',
            };
            if (!newPlayerData.name || !newPlayerData.team_id || !newPlayerData.position) {
                return res.status(400).json({ message: 'Player name, team, and position are required.' });
            }
            const allowedPositions = ['GK', 'DF', 'MF', 'FW'];
            if (!allowedPositions.includes(newPlayerData.position)) {
                return res.status(400).json({ message: 'Invalid player position. Must be GK, DF, MF, or FW.' });
            }
            await db.collection(PLAYERS_COLLECTION).doc(newPlayerId).set(newPlayerData);
            res.status(201).json({ message: 'Player added successfully', id: newPlayerId });
        } catch (error) {
            console.error('Error adding player:', error);
            res.status(500).json({ message: 'Error adding player' });
        }
    } else if (req.method === 'PUT') {
        try {
            const playerId = req.query.id;
            if (!playerId) return res.status(400).json({ message: 'Player ID is required.' });
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
    } else if (req.method === 'DELETE') {
        try {
            const playerId = req.query.id;
            if (!playerId) return res.status(400).json({ message: 'Player ID is required.' });
            await db.collection(PLAYERS_COLLECTION).doc(playerId).delete();
            res.json({ message: 'Player deleted successfully' });
        } catch (error) {
            console.error('Error deleting player:', error);
            res.status(500).json({ message: 'Error deleting player' });
        }
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
