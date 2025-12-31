const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { genAI } = require('../utils/clients');

/**
 * @swagger
 * /api/grammar/random-concepts:
 *   get:
 *     summary: Get Grammar Concepts
 *     tags: [Section 3]
 *     description: Section 3 - Grammar Challenge. Fetches random advanced grammar concepts from CSV.
 *     responses:
 *       200:
 *         description: List of grammar concepts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 concepts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       section:
 *                         type: string
 *                       title:
 *                         type: string
 *                       example:
 *                         type: string
 *                   example: [{"section": "Inversion", "title": "Negative Adverbials", "example": "Never have I ever..."}]
 */
// 5. Get Random Grammar Concepts from CSV
router.get('/api/grammar/random-concepts', async (req, res) => {
    try {
        // Correct path to step out of 'routes' folder into 'public'
        const csvPath = path.join(__dirname, '../public', 'GrammarFiles', 'grammarConcepts.csv');

        if (!fs.existsSync(csvPath)) {
            return res.status(404).json({ error: 'Grammar concepts CSV file not found' });
        }

        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim() !== '');

        // Skip header row
        const dataLines = lines.slice(1);

        if (dataLines.length === 0) {
            return res.status(404).json({ error: 'No grammar concepts found in CSV' });
        }

        // Shuffle and pick 5 random concepts
        const shuffled = dataLines.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);

        // Parse CSV lines
        const concepts = selected.map(line => {
            const parts = line.split(',');
            return {
                section: parts[0] || '',
                title: parts[1] || '',
                example: parts[2] || ''
            };
        });

        res.json({ concepts });

    } catch (error) {
        console.error('Grammar Concepts Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/gemini/correct-grammar:
 *   post:
 *     summary: Correct Grammar Exercises
 *     tags: [Section 3]
 *     description: Section 3 - Grammar Challenge. Corrects sentences for B2/C1 levels based on specific concepts.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sentences
 *             properties:
 *               sentences:
 *                 type: array
 *                 items:
 *                     type: object
 *                     properties:
 *                       section:
 *                         type: string
 *                       concept:
 *                         type: string
 *                       example:
 *                         type: string
 *                       userSentence:
 *                         type: string
 *     responses:
 *       200:
 *         description: Grammar corrections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 feedback:
 *                   type: string
 *                   description: JSON string containing array of corrections
 *                   example: '{"frase_numero": 1, "errores_gramaticales": "...", "nivel_c1": "..."}'
 */
// 6. Correct Grammar Sentences with Gemini
router.post('/api/gemini/correct-grammar', async (req, res) => {
    try {
        const { sentences } = req.body; // Array of { section, concept, example, userSentence }
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Build prompt for all sentences with full context
        const sentencesText = sentences.map((item, index) => {
            let conceptInfo = `Frase ${index + 1}\nConcepto Gramatical: ${item.concept}`;
            if (item.section) conceptInfo += `\nCategoría: ${item.section}`;
            if (item.example) conceptInfo += `\nEjemplo de referencia: ${item.example}`;
            conceptInfo += `\nFrase del usuario: "${item.userSentence}"`;
            return conceptInfo;
        }).join('\n\n');

        const prompt = `Eres un profesor de inglés y tienes que corregirme las siguientes frases indicando los errores gramaticales, una forma más inglesa de decirlo en un nivel B2 y otra en un nivel C1.

${sentencesText}

IMPORTANT: Debes devolver SOLO un objeto JSON válido sin formato markdown ni backticks.
La estructura JSON debe ser un array con un objeto por cada frase:
[
    {
        "frase_numero": 1,
        "seccion": "categoría del concepto gramatical",
        "concepto": "el concepto gramatical que se estaba practicando",
        "ejemplo": "el ejemplo de referencia si existe",
        "frase_original": "la frase del usuario",
        "errores_gramaticales": "descripción de los errores encontrados o 'Ningún error' si está correcta",
        "nivel_b2": "versión más natural en inglés nivel B2",
        "nivel_c1": "versión avanzada en inglés nivel C1"
    },
    ...
]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up potential markdown code blocks
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json({ feedback: text });

    } catch (error) {
        console.error('Grammar Correction Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
