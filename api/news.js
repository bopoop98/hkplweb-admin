const { db, admin } = require('./firebase');

const LEAGUE_BASE_PATH = 'artifacts/hkplweb/public/data/leagues/hkpl';
const NEWS_COLLECTION = `${LEAGUE_BASE_PATH}/news`;

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        try {
            const snapshot = await db.collection(NEWS_COLLECTION).orderBy('date', 'desc').get();
            const news = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.status(200).json(news);
        } catch (error) {
            console.error('Error fetching news:', error);
            res.status(500).json({ message: 'Error fetching news' });
        }
    } else if (req.method === 'POST') {
        try {
            const currentLocalDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            // Simple sequential ID: news-<timestamp>
            const newNewsId = `news-${Date.now()}`;
            const newNewsData = {
                body: req.body.body || '',
                date: admin.firestore.Timestamp.fromDate(new Date()),
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
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
