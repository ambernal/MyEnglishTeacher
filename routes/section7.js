const express = require('express');
const router = express.Router();
const { genAI } = require('../utils/clients');

/**
 * @swagger
 * /api/stories/start:
 *   post:
 *     summary: Start Interactive Story
 *     tags: [Section 7]
 *     description: Section 7 - Interactive Stories. Starts a new mystery story session.
 *     responses:
 *       200:
 *         description: Initial story segment and grammar constraint
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 story_segment:
 *                   type: string
 *                   example: "It was a dark and stormy night..."
 *                 grammar_constraint:
 *                   type: string
 *                   example: "Mixed Conditional"
 */
// 18. Start Interactive Story (Section 7)
router.post('/api/stories/start', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are a master storyteller (Mystery/Thriller genre) and an English teacher. 
        Start a new suspenseful story in 2-3 sentences. 
        Then, assign a specific advanced C1 grammar constraint that the user MUST use to describe their next action.

        Output JSON ONLY:
        {
            "story_segment": "The text of the story intro...",
            "grammar_constraint": "e.g. Mixed Conditional, Inversion, Cleft Sentence, Participle Clause"
        }
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        res.json(JSON.parse(text));

    } catch (error) {
        console.error('Start Story Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/stories/continue:
 *   post:
 *     summary: Continue Interactive Story
 *     tags: [Section 7]
 *     description: Section 7 - Interactive Stories. Evaluates user action and continues the story.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - previousContext
 *               - userAction
 *               - grammarConstraint
 *             properties:
 *               previousContext:
 *                 type: string
 *                 example: "Previous story text..."
 *               userAction:
 *                 type: string
 *                 example: "I would have opened the door if I were brave."
 *               grammarConstraint:
 *                 type: string
 *                 example: "Mixed Conditional"
 *     responses:
 *       200:
 *         description: Story continuation or feedback
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 is_correct:
 *                   type: boolean
 *                 feedback:
 *                   type: string
 *                 story_segment:
 *                   type: string
 *                 new_grammar_constraint:
 *                   type: string
 */
// 19. Continue Story (Section 7)
router.post('/api/stories/continue', async (req, res) => {
    try {
        const { previousContext, userAction, grammarConstraint } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Context: "${previousContext}"
        User's Action: "${userAction}"
        Required Grammar: "${grammarConstraint}"

        You are a master storyteller (Mystery/Thriller genre) and an advanced English teacher for C1 learners.

        Task:
        1. ALWAYS check if the User's Action correctly uses the Required Grammar structure.
        2. ALWAYS provide corrected version of the user's action if there are any grammar/style issues, or confirm it's correct.
        3. ALWAYS continue the story with a new paragraph (2-3 sentences), incorporating the user's action into the narrative.
        4. In your story continuation, USE specific C1-level grammar structures (inversions, participle clauses, cleft sentences, subjunctive, advanced conditionals, etc.) and C1-level vocabulary.
        5. EXPLICITLY list which C1 grammar structures and vocabulary you used in your continuation.
        6. Set a NEW C1 grammar constraint for the user's next action.

        Output JSON ONLY:
        {
            "grammar_correct": true/false,
            "correction_feedback": "Explanation of the grammar usage. If incorrect, explain why and show the corrected sentence. If correct, briefly praise the usage.",
            "corrected_sentence": "The corrected version of user's sentence (or same if already correct)",
            "story_continuation": "Your 2-3 sentence continuation of the story incorporating the user's action...",
            "c1_structures_used": ["List of C1 grammar structures used in your continuation, e.g., 'Inversion with negative adverb', 'Past participle clause'"],
            "c1_vocabulary_used": ["List of C1-level words/phrases used, e.g., 'ominous', 'to loom', 'eerily silent'"],
            "new_grammar_constraint": "The new C1 grammar structure the user must use next (e.g., 'Cleft Sentence', 'Subjunctive Mood')"
        }
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        res.json(JSON.parse(text));

    } catch (error) {
        console.error('Continue Story Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
