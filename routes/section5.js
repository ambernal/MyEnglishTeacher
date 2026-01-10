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

        // Random categories to ensure variety
        const categories = [
            "words with silent letters (like 'knight', 'psychology', 'receipt')",
            "words with the 'th' sound (both voiced and voiceless)",
            "words with unusual vowel combinations (like 'queue', 'choir', 'aisle')",
            "words with double consonants that sound different than expected",
            "words ending in '-ough' with different pronunciations",
            "words with the schwa sound that Spanish speakers often mispronounce",
            "medical or scientific terms used in everyday English",
            "words borrowed from French with unusual pronunciations",
            "words with stress patterns different from their spelling suggests",
            "common verbs with irregular past tense pronunciations",
            "words where 'c' or 'g' have unexpected sounds",
            "words with the '-tion' or '-sion' endings",
            "words with 'wr-', 'kn-', or 'gn-' combinations",
            "adjectives ending in '-ous' or '-eous'",
            "words with the 'ure' sound (like 'sure', 'measure', 'treasure')"
        ];

        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const randomSeed = Math.floor(Math.random() * 10000);

        const prompt = `Generate a single English word that is challenging for pronunciation, particularly for Spanish speakers learning English at C1 level.

IMPORTANT: Generate a DIFFERENT word each time. Random seed: ${randomSeed}

Focus on this category: ${randomCategory}

The word should be:
- Not too obscure (should be useful in everyday or professional contexts)
- Genuinely challenging for Spanish speakers
- Different from common examples like "thorough" or "colonel"

Return ONLY valid JSON with no markdown:
{
    "word": "the word",
    "spanish_translation": "meaning in Spanish",
    "ipa": "IPA phonetic transcription",
    "difficulty": "easy|medium|hard",
    "tips": "brief pronunciation tip for Spanish speakers"
}`;

        console.log('📝 [Section 5 - Gemini Word] Prompt:', prompt);
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
 * /api/pronunciation/custom-word:
 *   post:
 *     summary: Get Pronunciation Info for Custom Word
 *     tags: [Section 5]
 *     description: Section 5 - Pronunciation Trainer. Uses Gemini to generate IPA and tips for a user-provided word.
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
 *                 example: "worcestershire"
 *     responses:
 *       200:
 *         description: Word pronunciation details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 word:
 *                   type: string
 *                 ipa:
 *                   type: string
 *                 spanish_translation:
 *                   type: string
 *                 tips:
 *                   type: string
 */
router.post('/api/pronunciation/custom-word', async (req, res) => {
    try {
        const { word } = req.body;

        if (!word || word.trim().length === 0) {
            return res.status(400).json({ error: 'Word is required' });
        }

        const cleanWord = word.trim().toLowerCase();
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Generate pronunciation information for the English word "${cleanWord}".

If this is NOT a valid English word, return:
{
    "error": true,
    "message": "This doesn't appear to be a valid English word"
}

If it IS a valid English word, return ONLY valid JSON with no markdown:
{
    "word": "${cleanWord}",
    "spanish_translation": "meaning in Spanish",
    "ipa": "IPA phonetic transcription",
    "difficulty": "easy|medium|hard",
    "tips": "specific pronunciation tips for Spanish speakers, focusing on sounds that don't exist in Spanish or common mistakes"
}

Be helpful and encouraging in the tips. Focus on practical advice.`;

        console.log('📝 [Section 5 - Custom Word] Word:', cleanWord);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const wordData = JSON.parse(text);

        if (wordData.error) {
            return res.status(400).json({ error: wordData.message });
        }

        res.json(wordData);

    } catch (error) {
        console.error('Custom Word Error:', error);
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

        console.log('📝 [Section 5 - Pronunciation Analyze] Prompt:', prompt);
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
