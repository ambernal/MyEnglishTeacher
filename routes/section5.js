const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { genAI } = require('../utils/clients');

/**
 * @swagger
 * /api/pronunciation/words:
 *   get:
 *     summary: Get Pronunciation Word List
 *     tags: [Section 5]
 *     description: Section 5 - Pronunciation Trainer. Fetches the static JSON list of challenging words.
 *     responses:
 *       200:
 *         description: List of words
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 words:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       word:
 *                         type: string
 *                       ipa:
 *                         type: string
 */
// 7. Get All Pronunciation Words
router.get('/api/pronunciation/words', async (req, res) => {
    try {
        // Correct path: routes -> server root -> public
        const wordsPath = path.join(__dirname, '../public', 'PronunciationWords', 'words.json');

        if (!fs.existsSync(wordsPath)) {
            return res.status(404).json({ error: 'Words file not found' });
        }

        const wordsContent = fs.readFileSync(wordsPath, 'utf8');
        const words = JSON.parse(wordsContent);

        res.json({ words });

    } catch (error) {
        console.error('Words Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/pronunciation/gemini-word:
 *   get:
 *     summary: Generate Challenging Word
 *     tags: [Section 5]
 *     description: Section 5 - Pronunciation Trainer. Uses Gemini to find a difficult word for Spanish speakers.
 *     responses:
 *       200:
 *         description: Generated word details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 word:
 *                   type: string
 *                   example: "Colonel"
 *                 ipa:
 *                   type: string
 *                   example: "/ˈkɜːrnəl/"
 *                 difficulty:
 *                   type: string
 *                   example: "hard"
 *                 tips:
 *                   type: string
 */
// 8. Get Gemini-Generated Random Word
router.get('/api/pronunciation/gemini-word', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Generate a single English word that is challenging for pronunciation, particularly for Spanish speakers learning English at C1 level.

The word should have common pronunciation difficulties like:
- Silent letters
- Unexpected vowel sounds
- Consonant clusters
- Stress patterns different from spelling

Return ONLY valid JSON with no markdown:
{
    "word": "the word",
    "spanish_translation": "meaning in Spanish",
    "ipa": "IPA phonetic transcription",
    "difficulty": "easy|medium|hard",
    "tips": "brief pronunciation tip for Spanish speakers"
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const wordData = JSON.parse(text);

        res.json(wordData);

    } catch (error) {
        console.error('Gemini Word Generation Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/pronunciation/analyze:
 *   post:
 *     summary: Analyze Pronunciation Audio
 *     tags: [Section 5]
 *     description: Section 5 - Pronunciation Trainer. Analyzes user audio recording against target word.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - word
 *               - ipa
 *               - audioBase64
 *             properties:
 *               word:
 *                 type: string
 *                 example: "Colonel"
 *               ipa:
 *                 type: string
 *                 example: "/ˈkɜːrnəl/"
 *               audioBase64:
 *                 type: string
 *                 description: Base64 encoded audio string (webm)
 *     responses:
 *       200:
 *         description: Pronunciation score and feedback
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analysis:
 *                   type: string
 *                   description: JSON string with score and tips
 *                   example: '{"score": 85, "feedback": "Good effort..."}'
 */
// 9. Analyze Pronunciation
router.post('/api/pronunciation/analyze', async (req, res) => {
    try {
        const { word, ipa, audioBase64 } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Clean base64 string (remove data:audio/webm;base64, prefix if present)
        const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, "");

        const prompt = `Analyze the pronunciation of the word "${word}" (IPA: ${ipa}).
        The user (Spanish speaker) has recorded themselves saying this word.
        
        Provide:
        1. A score from 0-100.
        2. Specific feedback on phonemes that sounded incorrect vs correct.
        3. Tips to improve.
        
        Return in JSON format:
        {
            "score": 85,
            "feedback": "You pronounced the 'th' as 'd'...",
            "tips": "Place your tongue between teeth..."
        }`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "audio/webm",
                    data: base64Data
                }
            }
        ]);

        const response = await result.response;
        let text = response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json({ analysis: text });

    } catch (error) {
        console.error('Pronunciation Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
