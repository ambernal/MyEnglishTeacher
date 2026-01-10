const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { notion, genAI } = require('../utils/clients');

// Configuration
const IGNORED_TITLES_PATH = path.join(__dirname, '../ControlPage', 'ignored_titles.json');

function getIgnoredTitles() {
    try {
        if (fs.existsSync(IGNORED_TITLES_PATH)) {
            const data = fs.readFileSync(IGNORED_TITLES_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading ignored titles file:', error);
    }
    return ['Resources', 'Archive', 'Template', 'Home']; // Fallback
}

/**
 * @swagger
 * /api/notion/page:
 *   get:
 *     summary: Fetch a random Study Topic from Notion
 *     tags: [Section 1]
 *     description: Section 1 - Daily Topic. Fetches a random page from the user's Notion workspace keys configured in environment.
 *     responses:
 *       200:
 *         description: Notion page content retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "page-id-123"
 *                 title:
 *                   type: string
 *                   example: "Environmental Issues"
 *                 url:
 *                   type: string
 *                   example: "https://notion.so/..."
 *                 subPageTitles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       id:
 *                         type: string
 *                 content:
 *                   type: array
 *                   description: Raw Notion blocks
 */
/**
 * Recursively fetches all nested child pages from a Notion page.
 * Returns an array of page objects with their blocks.
 */
async function getAllNestedPages(blockId, ignoredTitles, depth = 0, maxDepth = 10) {
    if (depth > maxDepth) return [];

    const allPages = [];

    try {
        const response = await notion.blocks.children.list({ block_id: blockId });

        for (const block of response.results) {
            if (block.type === 'child_page') {
                const pageTitle = block.child_page.title || 'Untitled';

                // Skip ignored titles
                if (ignoredTitles.includes(pageTitle)) {
                    continue;
                }

                // Fetch the blocks of this page to check for headings
                const pageBlocks = await notion.blocks.children.list({ block_id: block.id });

                // Check if page has at least one heading (H1, H2, or H3)
                const hasHeading = pageBlocks.results.some(b =>
                    b.type === 'heading_1' ||
                    b.type === 'heading_2' ||
                    b.type === 'heading_3'
                );

                if (hasHeading) {
                    // This page has content, add it to the list
                    allPages.push({
                        id: block.id,
                        title: pageTitle,
                        blocks: pageBlocks.results
                    });
                }

                // Recursively search for nested pages within this page
                const nestedPages = await getAllNestedPages(block.id, ignoredTitles, depth + 1, maxDepth);
                allPages.push(...nestedPages);
            }
        }
    } catch (error) {
        console.error(`Error fetching nested pages at depth ${depth}:`, error.message);
    }

    return allPages;
}

// 1. Get Random Topic from Notion
router.get('/api/notion/page', async (req, res) => {
    try {
        if (!process.env.NOTION_DATABASE_ID) {
            throw new Error('NOTION_DATABASE_ID (or Root Page ID) is not set');
        }

        const ignoredTitles = getIgnoredTitles();

        console.log('🔍 Fetching all nested pages with content...');

        // Recursively fetch all nested pages that have at least one heading
        const allPages = await getAllNestedPages(process.env.NOTION_DATABASE_ID, ignoredTitles);

        if (allPages.length === 0) {
            return res.status(404).json({
                error: 'No pages with content (H1, H2, or H3 headings) found under the provided Notion Page'
            });
        }

        console.log(`📚 Found ${allPages.length} pages with content`);

        // Pick a random page from all valid pages
        const randomPage = allPages[Math.floor(Math.random() * allPages.length)];
        const title = randomPage.title;

        // Get full page details to get URL
        const pageDetails = await notion.pages.retrieve({ page_id: randomPage.id });
        const pageUrl = pageDetails.url;

        // Extract sub-page titles from the already-fetched blocks
        const subPageTitles = randomPage.blocks
            .filter(b => b.type === 'child_page')
            .map(b => ({
                title: b.child_page.title,
                id: b.id
            }));

        res.json({
            id: randomPage.id,
            title: title,
            url: pageUrl,
            subPageTitles: subPageTitles,
            content: randomPage.blocks
        });

    } catch (error) {
        console.error('Notion Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/gemini/generate:
 *   post:
 *     summary: Generate B2/C1 Exercises
 *     tags: [Section 1]
 *     description: Section 1 - Daily Topic. Uses Gemini to generate B2 and C1 level exercises based on the content of a Notion page and selected phrasal verbs.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topicContent
 *               - phrasalVerbs
 *             properties:
 *               topicContent:
 *                 type: string
 *                 example: "Text content describing Environmental Issues..."
 *               phrasalVerbs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Cut down", "Use up"]
 *     responses:
 *       200:
 *         description: Exercises generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generated:
 *                   type: string
 *                   description: JSON string containing questions for b2 and c1 levels.
 *                   example: '{"b2": [{"question": "...", "type": "fill_in_blank"}], "c1": []}'
 */
// 3. Generate Exercises with Gemini
router.post('/api/gemini/generate', async (req, res) => {
    try {
        console.log('Preparando Prompt de generación de ejercicios...');
        const { topicContent, phrasalVerbs } = req.body;
        // Updated to use available model from user's list
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Create English exercises based on the following topic content.
        The goal is to create two blocks of exercises: one for B2 level and one for C1 level.
        The exercises should be based on the topic content and MUST include some of the provided phrasal verbs if they fit naturally.
        
        Topic Content: ${JSON.stringify(topicContent).substring(0, 1500)}
        
        Phrasal Verbs: ${JSON.stringify(phrasalVerbs)}
        
        IMPORTANT RULES:
        1. Return ONLY a valid JSON object with no markdown formatting or backticks.
        2. For "fill_in_blank" exercises: The question MUST be a complete sentence with blanks marked using underscores (______). 
           Example: "She ______ (to give up) smoking last year."
           DO NOT write general instructions like "Complete the sentences..." - each question must BE the actual sentence to complete.
        3. For "multiple_choice" exercises: Include 4 options (A, B, C, D) with the question.
        4. Each exercise must be a standalone, complete exercise that can be answered directly.
        
        The JSON structure must be:
        {
            "b2": [
                { "question": "The company had to ______ (shut down) due to the crisis.", "type": "fill_in_blank" },
                { "question": "What is the best synonym for 'accomplish'?", "type": "multiple_choice", "options": ["Achieve", "Avoid", "Abandon", "Accept"] }
            ],
            "c1": [
                { "question": "Had it not been for his perseverance, he ______ (give up) long ago.", "type": "fill_in_blank" },
                { "question": "Which sentence demonstrates proper use of inversion?", "type": "multiple_choice", "options": ["Never have I seen such a thing.", "I never have seen such a thing.", "Have I never seen such a thing.", "Such a thing I have never seen."] }
            ]
        }
        Create 3 exercises for each level. Mix fill_in_blank and multiple_choice types.
        `;
        console.log('Gemini Prompt:', prompt);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up potential markdown code blocks if Gemini ignores instructions
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json({ generated: text });

    } catch (error) {
        console.error('Gemini Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/gemini/correct:
 *   post:
 *     summary: Correct User Exercises
 *     tags: [Section 1]
 *     description: Section 1 - Daily Topic. Corrects a single exercise answer using Gemini.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - userAnswer
 *               - context
 *             properties:
 *               question:
 *                 type: string
 *                 example: "The company _____ bankrupt."
 *               userAnswer:
 *                 type: string
 *                 example: "went"
 *               context:
 *                 type: string
 *                 example: "Financial context..."
 *     responses:
 *       200:
 *         description: Correction feedback
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 correction:
 *                   type: string
 *                   description: JSON string with correction details
 *                   example: '{"correct": true, "correct_answer": "went", "feedback": "Correct usage."}'
 */
// 4. Correct Exercises with Gemini
router.post('/api/gemini/correct', async (req, res) => {
    try {
        const { question, userAnswer, context } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Question: ${question}
        User Answer: ${userAnswer}
        Context: ${context}
        
        Evaluate if the user's answer is correct for this question.
        
        IMPORTANT: You MUST return a JSON object with the following structure:
        {
            "correct": boolean (true if correct, false if incorrect),
            "correct_answer": "the correct answer or answers here",
            "feedback": "explanation of why it's correct or incorrect"
        }
        
        Rules:
        - Always include the "correct_answer" field, even if the user is correct
        - If the question has multiple blanks, provide all correct answers separated by commas
        - Be specific and educational in your feedback
        - Return ONLY valid JSON, no markdown formatting
        `;

        console.log('📝 [Section 1 - Correct] Prompt:', prompt);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ correction: text });

    } catch (error) {
        console.error('Gemini Correct Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
