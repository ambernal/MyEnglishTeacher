require('dotenv').config();

/**
 * --- Environment Variables Configuration ---
 * 
 * This application requires several API keys to function.
 * You can provide these keys in two ways:
 * 
 * 1. .env File (Recommended for local dev):
 *    Create a file named '.env' in the root directory and add:
 *    NOTION_KEY=your_secret_key
 *    NOTION_DATABASE_ID=your_database_id
 *    GOOGLE_SHEETS_API_KEY=your_google_api_key
 *    GOOGLE_SHEETS_ID=your_sheet_id
 *    GEMINI_API_KEY=your_gemini_key
 * 
 * 2. System Environment Variables:
 *    If the .env file is missing or variables are not set there, 
 *    the app will look for system environment variables.
 *    
 *    How to set them in terminal (Mac/Linux):
 *    export NOTION_KEY="secret_..."
 *    export GEMINI_API_KEY="AIza..."
 *    
 *    How to set them in PowerShell (Windows):
 *    $env:NOTION_KEY="secret_..."
 * 
 * Note: System variables usually take precedence over .env values 
 * depending on how they are loaded, but dotenv default behavior 
 * is to NOT overwrite existing system variables.
 * -------------------------------------------
 */
const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from public directory

// Initialize Clients
const notion = new Client({ auth: process.env.NOTION_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_SHEETS_API_KEY });

// --- Routes ---

const fs = require('fs');
const path = require('path');

// --- Configuration ---
// --- Configuration ---
const IGNORED_TITLES_PATH = path.join(__dirname, 'ControlPage', 'ignored_titles.json');
const SAVED_WORDS_PATH = path.join(__dirname, 'ControlPage', 'saved_words.json');

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

// Ensure Saved Words file exists
if (!fs.existsSync(SAVED_WORDS_PATH)) {
    try {
        fs.writeFileSync(SAVED_WORDS_PATH, JSON.stringify([], null, 4));
    } catch (e) {
        console.error('Could not create saved words file:', e);
    }
}

// ... (Routes) ...

// 5. Save Word to List
app.post('/api/words/save', (req, res) => {
    try {
        const { word, ipa, tip } = req.body;
        if (!word) return res.status(400).json({ error: 'Word is required' });

        let savedWords = [];
        if (fs.existsSync(SAVED_WORDS_PATH)) {
            const data = fs.readFileSync(SAVED_WORDS_PATH, 'utf8');
            savedWords = JSON.parse(data);
        }

        // Check if exists
        if (!savedWords.find(w => w.word.toLowerCase() === word.toLowerCase())) {
            savedWords.push({
                word,
                ipa: ipa || '',
                tip: tip || '',
                date: new Date().toISOString()
            });
            fs.writeFileSync(SAVED_WORDS_PATH, JSON.stringify(savedWords, null, 4));
        }

        res.json({ success: true, message: 'Word saved' });

    } catch (error) {
        console.error('Save Word Error:', error);
        res.status(500).json({ error: error.message });
    }
});


// --- Routes ---

// 1. Get Random Topic from Notion
app.get('/api/notion/page', async (req, res) => {
    try {
        if (!process.env.NOTION_DATABASE_ID) {
            throw new Error('NOTION_DATABASE_ID (or Root Page ID) is not set');
        }

        // Fetch children of the root page (User is using a Page as a container, not a Database)
        const response = await notion.blocks.children.list({
            block_id: process.env.NOTION_DATABASE_ID,
        });

        // Filter for actual sub-pages
        const pages = response.results.filter(block => block.type === 'child_page');

        if (pages.length === 0) {
            return res.status(404).json({ error: 'No sub-pages found under the provided Notion Page' });
        }

        // Pick a random page with retry logic
        let randomPage;
        let title = '';
        let attempts = 0;
        const maxAttempts = 10;
        const ignoredTitles = getIgnoredTitles();

        do {
            randomPage = pages[Math.floor(Math.random() * pages.length)];
            title = randomPage.child_page.title || 'Untitled';
            attempts++;
        } while (ignoredTitles.includes(title) && attempts < maxAttempts);

        if (ignoredTitles.includes(title)) {
            return res.status(404).json({ error: 'Could not find a valid page after multiple attempts (all picked were ignored).' });
        }

        // Get full page details to get URL
        const pageDetails = await notion.pages.retrieve({ page_id: randomPage.id });
        const pageUrl = pageDetails.url;

        // Get page content (blocks)
        const blocks = await notion.blocks.children.list({
            block_id: randomPage.id,
        });

        // Extract title from child_page block
        // const title = randomPage.child_page.title || 'Untitled'; // 'title' is already defined above

        // Extract sub-page titles from the content blocks
        const subPageTitles = blocks.results
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
            content: blocks.results
        });

    } catch (error) {
        console.error('Notion Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Get Phrasal Verbs from Sheets
app.get('/api/sheets/phrasal-verbs', async (req, res) => {
    try {
        if (!process.env.GOOGLE_SHEETS_ID) {
            throw new Error('GOOGLE_SHEETS_ID is not set');
        }

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID,
            range: 'A:B', // Assuming Phrasal Verb in A, Definition in B. Adjust as needed.
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'No data found in Sheet' });
        }

        // Transform to object array, skipping header if present
        // Assuming first row might be header, let's just return raw for now or random 5
        res.json({ rows });

    } catch (error) {
        console.error('Sheets Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Generate Exercises with Gemini
app.post('/api/gemini/generate', async (req, res) => {
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
        
        IMPORTANT: Return ONLY a valid JSON object with no markdown formatting or backticks.
        The JSON structure must be:
        {
            "b2": [
                { "question": "Question text...", "type": "fill_in_blank" },
                { "question": "Question text...", "type": "multiple_choice", "options": ["A", "B", "C"] }
            ],
            "c1": [
                { "question": "Question text...", "type": "fill_in_blank" },
                { "question": "Question text...", "type": "multiple_choice", "options": ["A", "B", "C"] }
            ]
        }
        Create 3 exercises for each level.
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

// 4. Correct Exercises with Gemini
app.post('/api/gemini/correct', async (req, res) => {
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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ correction: text });

    } catch (error) {
        console.error('Gemini Correct Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 5. Get Random Grammar Concepts from CSV
app.get('/api/grammar/random-concepts', async (req, res) => {
    try {
        const csvPath = path.join(__dirname, 'public', 'GrammarFiles', 'grammarConcepts.csv');

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

// 6. Correct Grammar Sentences with Gemini
app.post('/api/gemini/correct-grammar', async (req, res) => {
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

IMPORTANTE: Debes devolver SOLO un objeto JSON válido sin formato markdown ni backticks.
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

// 7. Get All Pronunciation Words
app.get('/api/pronunciation/words', async (req, res) => {
    try {
        const wordsPath = path.join(__dirname, 'public', 'PronunciationWords', 'words.json');

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

// 8. Get Gemini-Generated Random Word
app.get('/api/pronunciation/gemini-word', async (req, res) => {
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

// 9. Analyze Pronunciation with Gemini (Audio)
app.post('/api/pronunciation/analyze', async (req, res) => {
    try {
        const { word, ipa, audioBase64 } = req.body;

        if (!audioBase64) {
            return res.status(400).json({ error: 'No audio data provided' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Remove data URL prefix if present
        const base64Audio = audioBase64.replace(/^data:audio\/\w+;base64,/, '');

        const prompt = `You are an English pronunciation expert. Listen to the user's pronunciation of the word "${word}" and provide detailed feedback.

The correct pronunciation is: ${ipa || 'not provided'}

Analyze the pronunciation and provide:
1. A score from 0-100 (be realistic but encouraging)
2. Specific feedback on what was good and what needs improvement
3. Common mistakes for Spanish speakers with this word
4. Practical tips for improvement

Return ONLY valid JSON with no markdown:
{
    "score": 85,
    "feedback": "Overall assessment of the pronunciation...",
    "improvements": ["Specific point 1", "Specific point 2"],
    "tips": "Practical advice for improving..."
}`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "audio/webm",
                    data: base64Audio
                }
            }
        ]);

        const response = await result.response;
        let text = response.text();

        // Clean up markdown
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json({ analysis: text });

    } catch (error) {
        console.error('Pronunciation Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 10. Generate TTS Audio (using Web Speech API will be done client-side)
// This endpoint is a placeholder for future Google Cloud TTS integration
// 11. Vocabulary Deep Dive Generation
app.post('/api/gemini/vocabulary-dive', async (req, res) => {
    try {
        const { phrasalVerb, definition } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Create a C1-level deep dive for the phrasal verb: "${phrasalVerb}" (Definition: ${definition}).
        
        Output Requirements (JSON ONLY):
        1. "examples": 3 complex C1-level sentences using the verb, with Spanish translations.
        2. "exercises": 3 fill-in-the-blank sentences where the user must use the phrasal verb (perhaps in different tenses). Provide the "answer" (correct form) for checking.
        3. "pronunciation": IPA transcription and specific tips for Spanish speakers.
        4. "common_error": A common B2-level error related to this verb or concept (e.g. using a different verb, wrong preposition, or confusion with another word). Explain why it's wrong and show the native alternatives.
        5. "c1_tip": A specific C1-level stylistic tip to sound more native (e.g. synonyms, collocations, or register usage).

        JSON Structure:
        {
            "examples": [
                { "english": "...", "spanish": "..." }
            ],
            "exercises": [
                { "question": "He _____ at the last minute. (Past tense)", "answer": "chickened out" }
            ],
            "pronunciation": {
                "ipa": "/.../",
                "tips": ["Tip 1", "Tip 2"]
            },
            "common_error": {
                "title": "Error muy común (nivel B2)",
                "description": "Decir '...' cuando hablas de...",
                "correction": "En esos casos, un nativo diría:",
                "examples": ["I'm giving a presentation", "I have to give a presentation"]
            },
            "c1_tip": {
                "title": "Consejo C1",
                "description": "Para sonar más natural, alterna con:",
                "alternatives": ["deliver a presentation", "present something"],
                "example": "I had to deliver a presentation to senior management..."
            }
        }
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json(JSON.parse(text));

    } catch (error) {
        console.error('Vocabulary Dive Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 12. Refine Sentence (C1 Polishing)
app.post('/api/gemini/refine-sentence', async (req, res) => {
    try {
        const { sentence, targetContext } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Refine the following user sentence to sound like a C1/Native speaker level.
        Context/Verb being studied: "${targetContext}"
        User Sentence: "${sentence}"

        If the sentence is already good, offer a more sophisticated variation.
        Output JSON ONLY:
        {
            "original": "${sentence}",
            "polished": "The improved C1 version...",
            "explanation": "Why this version is better (grammar, style, collocations)..."
        }
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json(JSON.parse(text));

    } catch (error) {
        console.error('Refine Sentence Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
