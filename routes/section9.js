const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { genAI, sheets } = require('../utils/clients');

// List of writing topics for random selection
const WRITING_TOPICS = [
    "Describe a challenging situation at work and how you handled it",
    "Write about a trip that changed your perspective on life",
    "Discuss the advantages and disadvantages of remote work",
    "Describe your ideal weekend and explain why it appeals to you",
    "Write about a skill you would like to learn and why",
    "Discuss how technology has changed the way we communicate",
    "Describe a memorable meal and what made it special",
    "Write about a book or movie that had a strong impact on you",
    "Discuss the importance of work-life balance in modern society",
    "Describe a person who has influenced your life significantly",
    "Write about your experience learning English and the challenges you faced",
    "Discuss the role of social media in today's society",
    "Describe a goal you achieved and the steps you took to reach it",
    "Write about an environmental issue you care about",
    "Discuss the pros and cons of living in a big city vs. a small town"
];

// Fisher-Yates shuffle for better randomization
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * @swagger
 * /api/writing-practice/topic:
 *   get:
 *     summary: Get Writing Practice Topic and Phrasal Verbs
 *     tags: [Section 9]
 *     description: Section 9 - Writing Practice. Returns a random writing topic and 4 phrasal verbs (2 from CSV, 2 from Google Sheets).
 *     responses:
 *       200:
 *         description: Topic and phrasal verbs retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topic:
 *                   type: string
 *                   example: "Describe a challenging situation at work..."
 *                 phrasalVerbs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       verb:
 *                         type: string
 *                       definition:
 *                         type: string
 *                       source:
 *                         type: string
 */
router.get('/api/writing-practice/topic', async (req, res) => {
    try {
        // Get random topic using Fisher-Yates
        const shuffledTopics = shuffleArray(WRITING_TOPICS);
        const randomTopic = shuffledTopics[0];

        let csvPhrasalVerbs = [];
        let sheetsPhrasalVerbs = [];

        // 1. Load 2 phrasal verbs from EngineerVocabulary.csv
        const csvPath = path.join(__dirname, '../public', 'GrammarFiles', 'EngineerVocabulary.csv');
        if (fs.existsSync(csvPath)) {
            const csvContent = fs.readFileSync(csvPath, 'utf8');
            const lines = csvContent.split('\n').filter(line => line.trim() !== '');
            const dataLines = lines.slice(1); // Skip header

            if (dataLines.length > 0) {
                const shuffledCSV = shuffleArray(dataLines);
                const selected = shuffledCSV.slice(0, 2);

                csvPhrasalVerbs = selected.map(line => {
                    // Parse CSV with potential quoted fields containing commas
                    const parts = line.match(/(?:^|,)("(?:[^"]*(?:""[^"]*)*)"|[^,]*)/g);
                    if (parts && parts.length >= 3) {
                        const cleanParts = parts.map(p => p.replace(/^,/, '').replace(/^"|"$/g, '').trim());
                        return {
                            verb: cleanParts[1] || '',
                            definition: cleanParts[2] || '',
                            source: 'engineer'
                        };
                    }
                    return null;
                }).filter(pv => pv && pv.verb);
            }
        } else {
            console.error('❌ EngineerVocabulary.csv not found at:', csvPath);
        }

        // 2. Load 2 phrasal verbs from Google Sheets
        try {
            if (process.env.GOOGLE_SHEETS_ID) {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
                    range: 'A:B',
                });

                const rows = response.data.values;
                if (rows && rows.length > 1) {
                    // Skip header row (first row)
                    const dataRows = rows.slice(1).filter(row => row[0] && row[0].trim());

                    if (dataRows.length > 0) {
                        const shuffledSheets = shuffleArray(dataRows);

                        // Get verbs that don't duplicate CSV verbs
                        const csvVerbNames = csvPhrasalVerbs.map(pv => pv.verb.toLowerCase());
                        const uniqueSheetVerbs = shuffledSheets.filter(row =>
                            !csvVerbNames.includes(row[0].trim().toLowerCase())
                        );

                        const selectedSheets = uniqueSheetVerbs.slice(0, 2);

                        sheetsPhrasalVerbs = selectedSheets.map(row => ({
                            verb: row[0] ? row[0].trim() : '',
                            definition: row[1] ? row[1].trim() : '',
                            source: 'sheets'
                        })).filter(pv => pv.verb);
                    }
                }
            } else {
                console.warn('⚠️ GOOGLE_SHEETS_ID not configured, skipping Google Sheets source');
            }
        } catch (sheetsError) {
            console.error('⚠️ Google Sheets fetch error:', sheetsError.message);
            // Continue with just CSV verbs if Sheets fails
        }

        // Combine and shuffle final list
        const allPhrasalVerbs = shuffleArray([...csvPhrasalVerbs, ...sheetsPhrasalVerbs]);

        console.log(`✅ Section 9: Selected ${csvPhrasalVerbs.length} from CSV, ${sheetsPhrasalVerbs.length} from Sheets`);

        res.json({
            topic: randomTopic,
            phrasalVerbs: allPhrasalVerbs
        });

    } catch (error) {
        console.error('Writing Practice Topic Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/writing-practice/review:
 *   post:
 *     summary: Review User's Writing
 *     tags: [Section 9]
 *     description: Section 9 - Writing Practice. Reviews user's text as an English teacher, providing grammar corrections and C1-level improvements.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - topic
 *               - phrasalVerbs
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Yesterday I had to deal with a difficult situation..."
 *               topic:
 *                 type: string
 *                 example: "Describe a challenging situation at work..."
 *               phrasalVerbs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["deal with", "come up with", "carry out"]
 *     responses:
 *       200:
 *         description: Writing review feedback
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overallScore:
 *                   type: number
 *                 grammarErrors:
 *                   type: array
 *                 improvements:
 *                   type: array
 *                 phrasalVerbUsage:
 *                   type: object
 *                 generalFeedback:
 *                   type: string
 */
router.post('/api/writing-practice/review', async (req, res) => {
    try {
        const { text, topic, phrasalVerbs } = req.body;

        if (!text || text.trim().length < 20) {
            return res.status(400).json({ error: 'Please write at least 20 characters.' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are an experienced English teacher reviewing a student's writing. The student is a Spanish speaker aiming for C1 level.

Topic: "${topic}"

Phrasal verbs the student should use: ${phrasalVerbs.join(', ')}

Student's text:
"${text}"

Analyze the text and provide detailed feedback. Return a JSON object with:

{
    "overallScore": (0-100 score for overall quality),
    "grammarErrors": [
        {
            "original": "the incorrect phrase or sentence",
            "correction": "the corrected version",
            "explanation": "brief explanation of the error in Spanish"
        }
    ],
    "improvements": [
        {
            "original": "a sentence that could be improved",
            "c1Version": "the same idea expressed at C1 level",
            "explanation": "why this is more advanced (in Spanish)"
        }
    ],
    "phrasalVerbUsage": {
        "used": ["list of phrasal verbs correctly used"],
        "missing": ["phrasal verbs from the list that weren't used"],
        "suggestions": "how they could have incorporated the missing ones (in Spanish)"
    },
    "generalFeedback": "2-3 sentences of overall feedback and encouragement (in Spanish)"
}

IMPORTANT: 
- Return ONLY valid JSON, no markdown formatting.
- Focus on being educational and encouraging.
- Provide at least 2-3 grammar corrections if errors exist.
- Provide at least 2-3 C1 improvements for the sentences.
- Feedback should be in Spanish but corrections/improvements in English.`;

        console.log('📝 [Section 9 - Writing Review] Prompt:', prompt);
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();

        // Clean up markdown if present
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json(JSON.parse(responseText));

    } catch (error) {
        console.error('Writing Review Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
