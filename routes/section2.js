const express = require('express');
const router = express.Router();
const { genAI } = require('../utils/clients');

/**
 * @swagger
 * /api/gemini/vocabulary-dive:
 *   post:
 *     summary: Generate Vocabulary Deep Dive
 *     tags: [Section 2]
 *     description: Section 2 - Vocabulary. Generates detailed study material for a specific phrasal verb.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phrasalVerb
 *               - definition
 *             properties:
 *               phrasalVerb:
 *                 type: string
 *                 example: "Brush up on"
 *               definition:
 *                 type: string
 *                 example: "To improve your knowledge of something"
 *     responses:
 *       200:
 *         description: Deep dive content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 spanish_translation:
 *                   type: string
 *                 examples:
 *                   type: array
 *                   items:
 *                     type: object
 *                 exercises:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pronunciation:
 *                   type: object
 *                 common_error:
 *                   type: object
 *                 c1_tip:
 *                   type: object
 */
// 11. Vocabulary Deep Dive Generation
router.post('/api/gemini/vocabulary-dive', async (req, res) => {
    try {
        const { phrasalVerb, definition } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Create a C1-level deep dive for the phrasal verb: "${phrasalVerb}" (Definition: ${definition}).
        
        Output Requirements (JSON ONLY):
        1. "spanish_translation": The specific meaning of this phrasal verb in Spanish.
        2. "examples": 3 complex C1-level sentences using the verb, with Spanish translations. Keys: "english", "spanish".
        3. "exercises": 3 fill-in-the-blank sentences where the user must use the phrasal verb (perhaps in different tenses). Provide the "answer" (correct form) for checking. Keys: "question", "answer".
        4. "pronunciation": IPA transcription and specific tips for Spanish speakers. Key "tips" must be an array of strings.
        5. "common_error": A common B2-level error related to this verb or concept (e.g. using a different verb, wrong preposition, or confusion with another word). Explain why it's wrong and show the native alternatives.
        6. "c1_tip": A specific C1-level stylistic tip to sound more native (e.g. synonyms, collocations, or register usage).

        JSON Structure:
        {
            "spanish_translation": "...",
            "examples": [
                { "english": "...", "spanish": "..." }
            ],
            "exercises": [
                { "question": "The context [GAP] (phrasal verb gap) ...", "answer": "correct form" }
            ],
            "pronunciation": { "ipa": "...", "tips": ["Tip 1", "Tip 2"] },
            "common_error": { 
                "description": "Explanation of the error...", 
                "correction": "Native alternative...", 
                "examples": ["Incorrect sentence -> Correct sentence"] 
            },
            "c1_tip": { 
                "description": "Explanation of the advanced tip...", 
                "alternatives": ["Alternative 1", "Alternative 2"], 
                "example": "Sentence using the tip..." 
            }
        }
        `;

        console.log('📝 [Section 2 - Vocabulary Dive] Prompt:', prompt);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json(JSON.parse(text));

    } catch (error) {
        console.error('Vocabulary Dive Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/gemini/refine-sentence:
 *   post:
 *     summary: Refine Sentence to C1
 *     tags: [Section 2]
 *     description: Section 2 - Vocabulary. Polishes a user sentence to sound more native/C1.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sentence
 *               - targetContext
 *             properties:
 *               sentence:
 *                 type: string
 *                 example: "I need to look for a new job."
 *               targetContext:
 *                 type: string
 *                 example: "Career"
 *     responses:
 *       200:
 *         description: Polished sentence and explanation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 original:
 *                   type: string
 *                 polished:
 *                   type: string
 *                 explanation:
 *                   type: string
 */
// 12. Refine Sentence (C1 Polishing)
router.post('/api/gemini/refine-sentence', async (req, res) => {
    try {
        const { sentence, targetContext } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Refine the following user sentence to sound like a C1/Native speaker level.
        Context: ${targetContext || 'General'}
        User Sentence: "${sentence}"

        Output JSON ONLY:
        {
            "original": "${sentence}",
            "polished": "The improved version",
            "explanation": "Why the change was made (grammar, vocabulary, tone)"
        }
        `;

        console.log('📝 [Section 2 - Refine Sentence] Prompt:', prompt);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json(JSON.parse(text));

    } catch (error) {
        console.error('Refine Sentence Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
