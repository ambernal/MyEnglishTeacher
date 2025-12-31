const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { sheets } = require('../utils/clients');

// Configuration
// Correct path: routes -> server root -> ControlPage
const SAVED_WORDS_PATH = path.join(__dirname, '../public', 'PronunciationWords', 'words.json');

// Ensure Saved Words file exists
if (!fs.existsSync(SAVED_WORDS_PATH)) {
    try {
        fs.writeFileSync(SAVED_WORDS_PATH, JSON.stringify([], null, 4));
    } catch (e) {
        console.error('Could not create saved words file:', e);
    }
}

/**
 * @swagger
 * /api/words/save:
 *   post:
 *     summary: Saves a word to the saved words list
 *     tags: [Helpers]
 *     description: Helper utility to save difficult words for later review. Used in various sections.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - word
 *             properties:
 *               word:
 *                 type: string
 *                 example: "serendipity"
 *               ipa:
 *                 type: string
 *                 example: "/ˌsɛrənˈdɪpɪti/"
 *               tip:
 *                 type: string
 *                 example: "Stress the third syllable."
 *     responses:
 *       200:
 *         description: Word saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Word saved"
 */
// 5. Save Word to List
router.post('/api/words/save', (req, res) => {
    try {
        const { word, ipa, tip } = req.body;
        if (!word) return res.status(400).json({ error: 'Word is required' });

        let savedWords = [];
        if (fs.existsSync(SAVED_WORDS_PATH)) {
            const data = fs.readFileSync(SAVED_WORDS_PATH, 'utf8');
            savedWords = JSON.parse(data);
        }

        // Check if exists
        if (!savedWords.find(w => w.word.toLowerCase() === word.toLowerCase())) {
            savedWords.push({
                word,
                ipa: ipa || '',
                difficulty: 'saved',
                tips: tip || '',
                date: new Date().toISOString()
            });
            fs.writeFileSync(SAVED_WORDS_PATH, JSON.stringify(savedWords, null, 4));
        }

        res.json({ success: true, message: 'Word saved' });

    } catch (error) {
        console.error('Save Word Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/sheets/phrasal-verbs:
 *   get:
 *     summary: Fetch Phrasal Verbs from Google Sheets
 *     tags: [Helpers]
 *     description: Utility to fetch phrasal verbs from configured Google Sheet.
 *     responses:
 *       200:
 *         description: List of phrasal verbs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rows:
 *                   type: array
 *                   items:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Act up", "To behave badly"]
 */
// 2. Get Phrasal Verbs from Sheets
router.get('/api/sheets/phrasal-verbs', async (req, res) => {
    try {
        if (!process.env.GOOGLE_SHEETS_ID) {
            throw new Error('GOOGLE_SHEETS_ID is not set');
        }

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID,
            range: 'A:B', // Assuming Phrasal Verb in A, Definition in B. Adjust as needed.
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'No data found in Sheet' });
        }

        res.json({ rows });

    } catch (error) {
        console.error('Sheets Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
