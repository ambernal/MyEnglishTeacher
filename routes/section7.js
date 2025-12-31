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

        Task:
        1. Evaluate if the User's Action meaningfuly uses the Required Grammar. 
        2. Evaluate if the action makes sense in the story.
        3. If valid, continue the story (2-3 sentences max) and set a NEW C1 grammar constraint.
        4. If invalid (grammar not used or wrong), provide feedback.

        Output JSON ONLY:
        {
            "is_correct": boolean,
            "feedback": "Why it was wrong (if false)",
            "story_segment": "Next part of the story (if true)",
            "new_grammar_constraint": "New constraint (if true)"
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
