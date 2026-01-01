const express = require('express');
const router = express.Router();
const { genAI } = require('../utils/clients');

/**
 * @swagger
 * /api/translate-levels:
 *   post:
 *     summary: Translate Spanish to English (B2 and C1)
 *     tags: [Section 8]
 *     description: Section 8 - How to tell this... Translates a Spanish phrase into English at B2 and C1 levels.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phrase
 *             properties:
 *               phrase:
 *                 type: string
 *                 example: "Me gustaría saber si puedo ayudarte"
 *     responses:
 *       200:
 *         description: Translations at B2 and C1 levels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 b2:
 *                   type: object
 *                   properties:
 *                     translation: { type: string }
 *                     explanation: { type: string }
 *                 c1:
 *                   type: object
 *                   properties:
 *                     translation: { type: string }
 *                     explanation: { type: string }
 */
router.post('/api/translate-levels', async (req, res) => {
    try {
        const { phrase } = req.body;
        if (!phrase) {
            return res.status(400).json({ error: 'Phrase is required' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        User input (Spanish): "${phrase}"
        
        Task:
        1. Translate this phrase into English at a B2 (Upper Intermediate) level.
        2. Translate this phrase into English at a C1 (Advanced/Professional) level.
        3. Provide a brief (1 sentence) explanation for why each version fits its level.
        
        Output JSON ONLY:
        {
            "b2": {
                "translation": "English B2 version...",
                "explanation": "Why this is B2..."
            },
            "c1": {
                "translation": "English C1 version...",
                "explanation": "Why this is C1 (mention specific advanced structures, vocabulary, or register)..."
            }
        }
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        res.json(JSON.parse(text));

    } catch (error) {
        console.error('Translation Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
