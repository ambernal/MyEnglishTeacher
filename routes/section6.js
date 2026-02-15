const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { genAI } = require('../utils/clients');

// Configuration
// Correct path: routes -> server root -> ControlPage
const SAVED_C1_LESSONS_PATH = path.join(__dirname, '../ControlPage', 'saved_c1_lessons.json');
const C1_LESSON_HISTORY_PATH = path.join(__dirname, '../ControlPage', 'c1_lesson_history.json');
const MAX_HISTORY_SIZE = 30; // Number of past topics to remember before allowing repeats

// Ensure Saved C1 Lessons file exists
if (!fs.existsSync(SAVED_C1_LESSONS_PATH)) {
    try {
        fs.writeFileSync(SAVED_C1_LESSONS_PATH, JSON.stringify([], null, 4));
    } catch (e) {
        console.error('Could not create saved C1 lessons file:', e);
    }
}

// Ensure C1 Lesson History file exists
if (!fs.existsSync(C1_LESSON_HISTORY_PATH)) {
    try {
        fs.writeFileSync(C1_LESSON_HISTORY_PATH, JSON.stringify([], null, 4));
    } catch (e) {
        console.error('Could not create C1 lesson history file:', e);
    }
}

/**
 * @swagger
 * /api/gemini/c1-lesson:
 *   post:
 *     summary: Generate C1 Lesson
 *     tags: [Section 6]
 *     description: Section 6 - C1 Improvement. Generates a comprehensive lesson on an advanced topic.
 *     responses:
 *       200:
 *         description: C1 Lesson content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topic:
 *                   type: string
 *                 explanation_en:
 *                   type: string
 *                 explanation_es:
 *                   type: string
 *                 examples:
 *                   type: array
 *                 exercises:
 *                   type: array
 */
// 13. C1 Lesson Generation
router.post('/api/gemini/c1-lesson', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Read history of past topics to avoid repetition
        let history = [];
        if (fs.existsSync(C1_LESSON_HISTORY_PATH)) {
            try {
                history = JSON.parse(fs.readFileSync(C1_LESSON_HISTORY_PATH, 'utf8'));
            } catch (e) {
                console.error('Error reading C1 lesson history:', e);
                history = [];
            }
        }

        // Build exclusion list for the prompt
        const excludeTopics = history.length > 0
            ? `\n\nIMPORTANT: Do NOT generate lessons about these topics that have already been covered:\n- ${history.join('\n- ')}\n\nChoose a COMPLETELY DIFFERENT topic from the ones listed above.`
            : '';

        const prompt = `Create a C1-level English lesson on a specific advanced grammar or vocabulary topic (e.g., Inversion, Cleft Sentences, Mixed Conditionals, Subjunctive, Advanced Collocations, Ellipsis, Fronting, Nominalization, Hedging Language, Discourse Markers, Binomial Expressions, Participle Clauses, etc.).

        Topic: Choose a random advanced topic suitable for C1 students.${excludeTopics}

        Output JSON Requirements:
        {
            "topic": "Title of the topic",
            "explanation_en": "Detailed explanation in English (C1 level).",
            "explanation_es": "Detailed explanation in Spanish.",
            "examples": [
                { "english": "Example sentence 1", "spanish": "Translation 1", "note": "Why this is C1" },
                { "english": "Example sentence 2", "spanish": "Translation 2", "note": "Why this is C1" }
            ],
            "exercises": [
                { "question": "Fill in the blank: _____ (Never) have I seen such a thing.", "answer": "Never", "type": "fill_in_blank" },
                { "question": "Rewrite: 'I didn't know she was here.' -> 'Little _____ she was here.'", "answer": "did I know", "type": "rewrite" }
            ]
        }
        Create 3 examples and 3 exercises.
        `;

        console.log('📝 [Section 6 - C1 Lesson] Prompt:', prompt);
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const lessonData = JSON.parse(text);

        // Save the new topic to history
        if (lessonData.topic) {
            history.push(lessonData.topic);

            // Keep only the last MAX_HISTORY_SIZE topics
            if (history.length > MAX_HISTORY_SIZE) {
                history = history.slice(-MAX_HISTORY_SIZE);
            }

            try {
                fs.writeFileSync(C1_LESSON_HISTORY_PATH, JSON.stringify(history, null, 4));
                console.log(`📚 [Section 6] Topic saved to history: "${lessonData.topic}" (${history.length}/${MAX_HISTORY_SIZE})`);
            } catch (e) {
                console.error('Error saving C1 lesson history:', e);
            }
        }

        res.json(lessonData);

    } catch (error) {
        console.error('C1 Lesson Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/gemini/c1-correction:
 *   post:
 *     summary: Correct C1 Exercises
 *     tags: [Section 6]
 *     description: Section 6 - C1 Improvement. Corrects user answers for the C1 lesson exercises.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *               - exercises
 *               - userAnswers
 *             properties:
 *               topic:
 *                 type: string
 *               exercises:
 *                 type: array
 *               userAnswers:
 *                 type: array
 *     responses:
 *       200:
 *         description: Corrections and feedback
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 corrections:
 *                   type: array
 *                 overallFeedback:
 *                   type: string
 */
// 14. C1 Correction
router.post('/api/gemini/c1-correction', async (req, res) => {
    try {
        const { topic, exercises, userAnswers } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are a C1 English teacher. Correct the user's answers for the topic: "${topic}".

        Exercises: ${JSON.stringify(exercises)}
        User Answers: ${JSON.stringify(userAnswers)}

        Output JSON:
        {
            "corrections": [
                { "questionIndex": 0, "isCorrect": boolean, "correctAnswer": "...", "explanation": "..." }
            ],
            "overallFeedback": "General feedback on the user's performance."
        }
        `;

        console.log('📝 [Section 6 - C1 Correction] Prompt:', prompt);
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json(JSON.parse(text));

    } catch (error) {
        console.error('C1 Correction Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/c1/save:
 *   post:
 *     summary: Save C1 Lesson
 *     tags: [Section 6]
 *     description: Section 6 - C1 Improvement. Saves a generated lesson to local file.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *               explanation_en:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 lessonId:
 *                   type: string
 */
// 15. Save C1 Lesson
router.post('/api/c1/save', (req, res) => {
    try {
        const lessonData = req.body;

        let lessons = [];
        if (fs.existsSync(SAVED_C1_LESSONS_PATH)) {
            lessons = JSON.parse(fs.readFileSync(SAVED_C1_LESSONS_PATH, 'utf8'));
        }

        const newLesson = {
            id: Date.now().toString(),
            savedAt: new Date().toISOString(),
            ...lessonData
        };

        lessons.push(newLesson);
        fs.writeFileSync(SAVED_C1_LESSONS_PATH, JSON.stringify(lessons, null, 4));

        res.json({ success: true, message: 'Lesson saved', lessonId: newLesson.id });

    } catch (error) {
        console.error('Save C1 Lesson Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/c1/saved:
 *   get:
 *     summary: Get Saved C1 Lessons
 *     tags: [Section 6]
 *     description: Section 6 - C1 Improvement. Retrieves all saved lessons.
 *     responses:
 *       200:
 *         description: List of saved lessons
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   topic:
 *                     type: string
 *                   savedAt:
 *                     type: string
 */
// 16. Get Saved C1 Lessons
router.get('/api/c1/saved', (req, res) => {
    try {
        if (fs.existsSync(SAVED_C1_LESSONS_PATH)) {
            const lessons = JSON.parse(fs.readFileSync(SAVED_C1_LESSONS_PATH, 'utf8'));
            // Return complete objects so frontend has strings for explanation, exercises, etc.
            res.json(lessons);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Get Saved C1 Lessons Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/c1/saved/{id}:
 *   delete:
 *     summary: Delete Saved C1 Lesson
 *     tags: [Section 6]
 *     description: Section 6 - C1 Improvement. Deletes a specific saved lesson.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "1735415284305"
 *     responses:
 *       200:
 *         description: Success message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 */
// 17. Delete Saved C1 Lesson
router.delete('/api/c1/saved/:id', (req, res) => {
    try {
        const { id } = req.params;

        if (fs.existsSync(SAVED_C1_LESSONS_PATH)) {
            let lessons = JSON.parse(fs.readFileSync(SAVED_C1_LESSONS_PATH, 'utf8'));
            const initialLength = lessons.length;
            lessons = lessons.filter(l => l.id !== id);

            if (lessons.length === initialLength) {
                return res.status(404).json({ error: 'Lesson not found' });
            }

            fs.writeFileSync(SAVED_C1_LESSONS_PATH, JSON.stringify(lessons, null, 4));
            res.json({ success: true, message: 'Lesson deleted' });
        } else {
            res.status(404).json({ error: 'No saved lessons file found' });
        }

    } catch (error) {
        console.error('Delete C1 Lesson Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
