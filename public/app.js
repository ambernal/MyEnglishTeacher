const API_BASE = 'http://localhost:3000/api';

const state = {
    currentTopic: null,
    phrasalVerbs: [],
    exercises: [],
    userAnswers: {},
    grammarConcepts: [],
    grammarSentences: {},
    // Section 3: Pronunciation
    pronunciationMode: 'gemini', // 'gemini' or 'list'
    allWords: [],
    currentWord: null,
    audioRecorder: null,
    audioBlob: null,
    pronunciationFeedback: null
};

const SECTION_SUBTITLES = {
    'default': 'Transforma tus notas de Notion en ejercicios de alto nivel.',
    'menu': 'Transforma tus notas de Notion en ejercicios de alto nivel.',
    'section-1': 'Practica comprensión, vocabulario y gramática basada en un tópico C1.',
    '2': 'Expande tu léxico C1 con palabras avanzadas y phrasal verbs.',
    '3': 'Domina estructuras complejas como inversiones, modales y consistencia de tiempos.',
    '5': 'Mejora tu entonación y fluidez con ejercicios de audio enfocados.',
    '6': 'Lecciones profundas de gramática y estilo con ejercicios interactivos.'
};

// DOM Elements
const views = {
    menu: document.getElementById('main-menu-section'),
    section1: document.getElementById('section-1-view'),
    section2: document.getElementById('section-2-view'),
    section3: document.getElementById('section-3-view'),
    topic: document.getElementById('topic-section'),
    exercises: document.getElementById('exercise-section'),
    feedback: document.getElementById('feedback-section')
};

const topicTextEl = document.getElementById('topic-text');
const topicLoader = document.getElementById('topic-loader');
const generateBtn = document.getElementById('generate-btn');
const exercisesContainer = document.getElementById('exercises-container');
const submitBtn = document.getElementById('submit-btn');
const feedbackContainer = document.getElementById('feedback-container');
const nextTopicBtn = document.getElementById('next-topic-btn');
const newTopicBtn = document.getElementById('new-topic-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const phrasalVerbsListEl = document.getElementById('phrasal-verbs-list');
const stepperContainer = document.getElementById('stepper-container');

// Stepper elements
const stepper = {
    1: { el: document.querySelector('[data-step="1"]'), line: document.getElementById('line-1') },
    2: { el: document.querySelector('[data-step="2"]'), line: document.getElementById('line-2') },
    3: { el: document.querySelector('[data-step="3"]'), line: null }
};

// --------------------- VIEW MANAGEMENT ---------------------

function showView(viewName) {
    console.log('🔄 showView called with:', viewName);

    // Map sections to views
    const viewMap = {
        'menu': 'main-menu-section',
        'section-1': 'section-1-view',
        'feedback': 'feedback-section',
        '2': 'section-vocabulary-view',
        '3': 'section-2-view',
        '5': 'section-3-view',
        '6': 'c1-improvement-section',
        '7': 'section-stories-view'
    };

    const targetId = viewMap[viewName] || viewName;
    const allViews = [
        'main-menu-section',
        'section-1-view',
        'section-2-view',
        'section-3-view',
        'section-vocabulary-view',
        'topic-section',
        'exercise-section',
        'feedback-section',
        'c1-improvement-section',
        'section-stories-view'
    ];

    // Hide all views
    allViews.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // Handle nested views for Section 1 specifically
    if (viewName === 'section-1' || viewName === 'exercises') {
        const sec1 = document.getElementById('section-1-view');
        if (sec1) sec1.classList.remove('hidden');

        if (viewName === 'exercises') {
            const exSection = document.getElementById('exercise-section');
            const topicSection = document.getElementById('topic-section');
            if (exSection) exSection.classList.remove('hidden');
            if (topicSection) topicSection.classList.add('hidden');
        } else {
            // Default section-1 view (topic)
            const topicSection = document.getElementById('topic-section');
            const exSection = document.getElementById('exercise-section');
            if (topicSection) topicSection.classList.remove('hidden');
            if (exSection) exSection.classList.add('hidden');
        }
    }
    // Handle standard top-level views
    else {
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.classList.remove('hidden');
            targetView.classList.add('animate-slide-up');
        } else {
            console.error(`View not found: ${viewName} (mapped to ${targetId})`);
        }
    }

    // Specific logic triggers
    if (viewName === '2') {
        loadVocabularyDeepDive();
    } else if (viewName === '3') {
        loadGrammarConcepts();
    } else if (viewName === '5') {
        initializePronunciationTrainer();
    } else if (viewName === '7') {
        initializeInteractiveStory();
    }

    // Update Subtitle
    const subtitleEl = document.getElementById('app-subtitle');
    if (subtitleEl) {
        const text = SECTION_SUBTITLES[viewName] || SECTION_SUBTITLES['default'];
        subtitleEl.textContent = text;
        subtitleEl.classList.remove('animate-fade-in');
        void subtitleEl.offsetWidth; // Trigger reflow for animation restart
        subtitleEl.classList.add('animate-fade-in');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateStepper(step) {
    if (!stepperContainer) return;

    // Reset all steps
    document.querySelectorAll('.step-item').forEach(el => {
        el.classList.add('opacity-40', 'grayscale');
        el.classList.remove('active');
    });
    document.querySelectorAll('[id^="line-"]').forEach(line => {
        line.classList.remove('bg-brand-600');
        line.classList.add('bg-slate-200');
    });

    // Activate steps up to current
    for (let i = 1; i <= step; i++) {
        const item = document.querySelector(`[data-step="${i}"]`);
        if (!item) continue;

        item.classList.remove('opacity-40', 'grayscale');
        const circle = item.querySelector('.w-10');
        if (circle) {
            circle.classList.remove('bg-white', 'border-2', 'border-slate-200', 'text-slate-400');
            circle.classList.add('bg-brand-600', 'text-white', 'shadow-lg');
        }

        if (i < step) {
            const line = document.getElementById(`line-${i}`);
            if (line) {
                line.classList.remove('bg-slate-200');
                line.classList.add('bg-brand-600');
            }
        }
    }
}

// --------------------- MENU RENDERING ---------------------
//    { id: 3, title: "Grammar Challenge", description: "Domina estructuras complejas como inversiones, modales y consistencia de tiempos.", icon: "dna" },

const appSections = [
    { id: 1, title: "Daily Topic & Exercises", description: "Practica comprensión, vocabulario y gramática basada en tu DAG de Notion.", icon: "book-open" },
    { id: 2, title: "Vocabulary Deep Dive", description: "Expande tu léxico C1 con palabras avanzadas y phrasal verbs.", icon: "layers" },
    { id: 3, title: "Grammar Challenge", description: "Domina estructuras comunes como tipicos Locations, Follow-ups, Transition Phrases, Fillers and prepositional Phrases", icon: "dna" },
    { id: 4, title: "Writing Practice (C1)", description: "Genera ensayos y recibe feedback estructurado sobre estilo y cohesión.", icon: "feather" },
    { id: 5, title: "Pronunciation Trainer", description: "Mejora tu entonación y fluidez con ejercicios de audio enfocados.", icon: "megaphone" },
    { id: 6, title: "Improve your C1 Level", description: "Lecciones profundas de gramática y estilo con ejercicios interactivos.", icon: "zap" },
];

function renderMenu() {
    const menuGrid = document.getElementById('menu-sections-grid');
    if (!menuGrid) return;

    menuGrid.innerHTML = appSections.map(section => `
        <div 
            class="menu-card clean-card p-6 rounded-xl border-2 border-slate-100 hover:border-brand-500 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-brand-500/10"
            data-section-id="${section.id}">
            <div class="w-12 h-12 flex items-center justify-center rounded-lg bg-brand-50 text-brand-600 mb-4 group-hover:bg-brand-100 transition-colors">
                <i data-lucide="${section.icon}" class="w-6 h-6"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-2 group-hover:text-brand-700 transition-colors">${section.title}</h3>
            <p class="text-sm text-slate-500">${section.description}</p>
        </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    document.querySelectorAll('.menu-card').forEach(card => {
        card.addEventListener('click', () => {
            const sectionId = parseInt(card.dataset.sectionId);
            if (sectionId === 1) {
                showView('section-1');
                setTimeout(() => {
                    loadDailyTopic();
                    loadPhrasalVerbs();
                }, 100);
            } else if (sectionId === 2) {
                // Vocabulary Deep Dive
                showView('2');
            } else if (sectionId === 3) {
                // Grammar Challenge
                showView('3');
            } else if (sectionId === 5) {
                // Pronunciation Trainer
                showView('5');
            } else if (sectionId === 6) {
                // Improve your C1 Level
                showView('6');
                setTimeout(() => {
                    loadC1Lesson();
                }, 100);
            } else {
                alert(`Sección ${sectionId}: ${appSections.find(s => s.id === sectionId).title}. Contenido no implementado aún.`);
            }
        });
    });
}

// --------------------- DATA LOADING ---------------------

async function loadDailyTopic() {
    console.log('🔄 loadDailyTopic called');
    console.log('topicTextEl:', topicTextEl);
    console.log('topicLoader:', topicLoader);

    if (topicLoader) topicLoader.classList.remove('hidden');

    try {
        console.log('📡 Fetching from:', `${API_BASE}/notion/page`);
        const res = await fetch(`${API_BASE}/notion/page`);
        if (!res.ok) throw new Error('Failed to fetch topic');

        const data = await res.json();
        console.log('✅ Topic data received:', data);
        state.currentTopic = data;

        renderTopic(data);
        checkReady();
    } catch (error) {
        console.error('❌ Error loading topic:', error);
        if (topicTextEl) {
            topicTextEl.innerHTML = `<p class="text-rose-600">Error loading topic: ${error.message}. <br>Make sure server is running and .env is configured.</p>`;
        }
    } finally {
        if (topicLoader) topicLoader.classList.add('hidden');
    }
}

async function loadPhrasalVerbs() {
    console.log('🔄 loadPhrasalVerbs called');
    console.log('phrasalVerbsListEl:', phrasalVerbsListEl);

    try {
        console.log('📡 Fetching from:', `${API_BASE}/sheets/phrasal-verbs`);
        const res = await fetch(`${API_BASE}/sheets/phrasal-verbs`);
        if (res.ok) {
            const data = await res.json();
            console.log('✅ Phrasal verbs data received:', data);
            const allRows = data.rows || [];
            if (allRows.length > 0) {
                const shuffled = allRows.sort(() => 0.5 - Math.random());
                state.phrasalVerbs = shuffled.slice(0, 5);
                console.log('📝 Selected phrasal verbs:', state.phrasalVerbs);
                renderPhrasalVerbs(state.phrasalVerbs);
            } else {
                phrasalVerbsListEl.innerHTML = '<p class="text-slate-500">No vocabulary found.</p>';
            }
        }
        checkReady();
    } catch (error) {
        console.error('❌ Error loading phrasal verbs:', error);
        phrasalVerbsListEl.innerHTML = '<p class="text-slate-500">Could not load vocabulary.</p>';
    }
}

function checkReady() {
    if (state.currentTopic && generateBtn) {
        generateBtn.disabled = false;
    }
}

// --------------------- RENDERING FUNCTIONS ---------------------

function renderPhrasalVerbs(verbs) {
    if (!phrasalVerbsListEl) return;

    const html = verbs.map(row => {
        const verb = row[0] || '';
        const def = row[1] || '';
        return `
            <div class="bg-white p-5 rounded-xl border border-slate-200 hover:border-brand-400 hover:shadow-lg hover:shadow-brand-500/5 transition-all group cursor-default">
                <div class="flex justify-between items-start mb-2">
                    <strong class="text-slate-900 font-bold text-lg group-hover:text-brand-600 transition-colors">${verb}</strong>
                    <span class="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded">Verb</span>
                </div>
                <p class="text-sm text-slate-600">${def}</p>
            </div>
        `;
    }).join('');

    phrasalVerbsListEl.innerHTML = html || '<p class="text-slate-500">No verbs available.</p>';
}

function renderTopic(topic) {
    if (!topicTextEl) return;

    let htmlContent = '';
    let plainTextContent = '';

    if (topic.content && Array.isArray(topic.content)) {
        htmlContent = topic.content.map(block => {
            const type = block.type;

            // Skip child_page blocks in content - they'll be shown in the Secciones list
            if (type === 'child_page') {
                const title = block.child_page.title;
                plainTextContent += `\n[Sub-section: ${title}]\n`;
                return ''; // Don't render in main content
            }

            if (block[type] && block[type].rich_text) {
                const text = block[type].rich_text.map(t => t.plain_text).join('');
                plainTextContent += text + '\n';
                if (!text.trim()) return '';

                switch (type) {
                    case 'heading_1':
                        return `<h3 class="text-2xl font-bold text-slate-800 mb-4">${text}</h3>`;
                    case 'heading_2':
                        return `<h4 class="text-xl font-bold text-slate-700 mb-3">${text}</h4>`;
                    case 'heading_3':
                        return `<h5 class="text-lg font-semibold text-slate-600 mb-2">${text}</h5>`;
                    case 'bulleted_list_item':
                        return `<div class="ml-4 mb-1">• ${text}</div>`;
                    case 'numbered_list_item':
                        return `<div class="ml-4 mb-1">1. ${text}</div>`;
                    case 'quote':
                        return `<blockquote class="border-l-4 border-brand-500 pl-4 italic text-slate-600 my-4">${text}</blockquote>`;
                    default:
                        return `<p class="text-slate-600 leading-relaxed text-lg mb-4">${text}</p>`;
                }
            }
            return '';
        }).join('');
    }

    // Build sub-pages list
    const subPagesHtml = topic.subPageTitles && topic.subPageTitles.length > 0
        ? `
            <div class="border-t border-slate-100 pt-6 mt-6">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <i data-lucide="list" class="w-3 h-3"></i>
                    Secciones
                </h4>
                <ul class="space-y-3">
                    ${topic.subPageTitles.map(t => {
            const id = t.id.replace(/-/g, '');
            return `
                            <li>
                                <a href="https://www.notion.so/${id}" target="_blank" class="flex items-center gap-3 text-brand-600 hover:text-brand-800 group p-2 -ml-2 rounded-lg hover:bg-brand-50 transition-colors">
                                    <div class="w-6 h-6 flex items-center justify-center rounded bg-brand-100 text-brand-600 group-hover:bg-brand-200">
                                        <i data-lucide="link" class="w-3 h-3"></i>
                                    </div>
                                    <span class="font-medium text-sm">${t.title}</span>
                                    <i data-lucide="external-link" class="w-3 h-3 text-slate-300 group-hover:text-brand-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                </a>
                            </li>
                        `;
        }).join('')}
                </ul>
            </div>
        `
        : '';

    topicTextEl.innerHTML = `
        <h3 class="text-2xl font-bold text-slate-800 mb-4">
            <a href="${topic.url}" target="_blank" class="hover:text-brand-600 hover:underline decoration-2 underline-offset-4 transition-colors">
                ${topic.title}
            </a>
        </h3>
        ${htmlContent || '<p class="text-slate-500">No content available for this page.</p>'}
        ${subPagesHtml}
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    state.currentTopic.textContent = plainTextContent;
}

// --------------------- EXERCISE GENERATION ---------------------

async function generateExercises() {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="loader border-white/30 border-b-white w-5 h-5"></span> Generating...';

    try {
        const res = await fetch(`${API_BASE}/gemini/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topicContent: state.currentTopic.textContent,
                phrasalVerbs: state.phrasalVerbs
            })
        });

        const data = await res.json();
        console.log('📦 Raw response from server:', data);
        let exercisesData = {};

        try {
            let cleanText = data.generated;
            console.log('🧹 Clean text before parsing:', cleanText);
            if (typeof cleanText === 'string') {
                cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
                exercisesData = JSON.parse(cleanText);
                console.log('✅ Parsed exercises data:', exercisesData);
            } else {
                exercisesData = cleanText;
            }
        } catch (e) {
            console.error('❌ Failed to parse Gemini JSON', e);
            console.error('Raw text was:', data.generated);
            alert('Error parsing generated exercises. Check console.');
            return;
        }

        state.exercises = [];
        let html = '';

        console.log('🎯 B2 exercises:', exercisesData.b2);
        console.log('🎯 C1 exercises:', exercisesData.c1);

        if (exercisesData.b2 && exercisesData.b2.length > 0) {
            html += `<h3 class="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <span class="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-sm">B2 Level</span>
                     </h3>`;
            html += renderLevelExercises(exercisesData.b2, 'b2');
            exercisesData.b2.forEach((ex, i) => state.exercises.push({ ...ex, id: `b2-${i}`, level: 'B2' }));
        }

        if (exercisesData.c1 && exercisesData.c1.length > 0) {
            html += `<h3 class="text-xl font-bold text-slate-900 mb-6 mt-10 flex items-center gap-2">
                        <span class="bg-purple-100 text-purple-600 px-3 py-1 rounded-lg text-sm">C1 Level</span>
                     </h3>`;
            html += renderLevelExercises(exercisesData.c1, 'c1');
            exercisesData.c1.forEach((ex, i) => state.exercises.push({ ...ex, id: `c1-${i}`, level: 'C1' }));
        }

        console.log('📝 Generated HTML length:', html.length);
        console.log('📝 HTML preview:', html.substring(0, 200));

        exercisesContainer.innerHTML = html;
        console.log('✅ Exercises container updated');

        showView('exercises');
        updateStepper(2);

    } catch (error) {
        alert('Error generating exercises: ' + error.message);
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i data-lucide="sparkles" class="w-5 h-5"></i><span>Generate AI Exercises</span><i data-lucide="arrow-right" class="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function renderLevelExercises(exercises, prefix) {
    return exercises.map((ex, index) => {
        const inputName = `${prefix}-${index}`;
        let questionHtml = ex.question;
        let inputHtml = '';

        if (ex.type === 'multiple_choice' && ex.options) {
            inputHtml = `
                <div class="space-y-3">
                    ${ex.options.map(opt => `
                        <label class="flex items-center p-4 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50 cursor-pointer transition-all group bg-slate-50/50">
                            <input type="radio" name="${inputName}" value="${opt}" class="w-5 h-5 accent-brand-600 border-slate-300">
                            <span class="ml-3 text-slate-700 group-hover:text-brand-900 font-medium">${opt}</span>
                        </label>
                    `).join('')}
                </div>
            `;
        } else {
            // Fill in the blank - create inline inputs
            // Replace patterns like _______, (1), (2), etc. with input fields
            let blankCounter = 0;

            // First, replace numbered blanks like (1), (2)
            questionHtml = questionHtml.replace(/\((\d+)\)\s*_+/g, (match, num) => {
                const inputId = `${inputName}-blank-${blankCounter}`;
                blankCounter++;
                return `<input type="text" 
                    class="inline-input mx-1 px-3 py-1 border-b-2 border-slate-300 focus:border-brand-600 bg-transparent text-brand-700 font-semibold outline-none transition-colors" 
                    name="${inputId}" 
                    data-parent="${inputName}"
                    placeholder="..." 
                    style="width: 120px;">`;
            });

            // Then replace standalone underscores
            questionHtml = questionHtml.replace(/_+/g, (match) => {
                const inputId = `${inputName}-blank-${blankCounter}`;
                blankCounter++;
                const width = Math.max(80, Math.min(match.length * 8, 200));
                return `<input type="text" 
                    class="inline-input mx-1 px-3 py-1 border-b-2 border-slate-300 focus:border-brand-600 bg-transparent text-brand-700 font-semibold outline-none transition-colors" 
                    name="${inputId}" 
                    data-parent="${inputName}"
                    placeholder="..." 
                    style="width: ${width}px;">`;
            });

            // Store the number of blanks for later retrieval
            questionHtml = `<div data-blanks="${blankCounter}">${questionHtml}</div>`;
        }

        return `
            <div class="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mb-6" data-exercise-id="${inputName}">
                <div class="flex justify-between mb-4">
                    <span class="text-xs font-bold text-brand-600 tracking-wider bg-brand-50 px-2 py-1 rounded">EXERCISE ${index + 1}</span>
                    <span class="text-xs text-slate-400 font-medium">${ex.type === 'multiple_choice' ? 'Multiple Choice' : 'Fill in the blank'}</span>
                </div>
                <div class="text-lg text-slate-700 mb-5 leading-relaxed font-medium">
                    ${questionHtml}
                </div>
                ${inputHtml}
            </div>
        `;
    }).join('');
}

// --------------------- ANSWER SUBMISSION ---------------------

async function submitAnswers() {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loader border-white/30 border-b-white w-5 h-5"></span> Checking...';

    // Show waiting activity
    showWaitingActivity();

    const answers = [];
    state.exercises.forEach((ex) => {
        const inputName = ex.id;
        let answer = '';

        if (ex.type === 'multiple_choice') {
            const selected = document.querySelector(`input[name="${inputName}"]:checked`);
            answer = selected ? selected.value : '';
        } else {
            // For fill_in_blank, collect all inline inputs
            const inlineInputs = document.querySelectorAll(`input[data-parent="${inputName}"]`);
            if (inlineInputs.length > 0) {
                // Multiple blanks - join with commas
                answer = Array.from(inlineInputs).map(input => input.value.trim()).join(', ');
            } else {
                // Fallback to single input (shouldn't happen with new design)
                const input = document.querySelector(`input[name="${inputName}"]`);
                answer = input ? input.value : '';
            }
        }

        answers.push({
            question: ex.question,
            userAnswer: answer,
            level: ex.level
        });
    });

    const feedbackPromises = answers.map(item =>
        fetch(`${API_BASE}/gemini/correct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: item.question,
                userAnswer: item.userAnswer,
                context: state.currentTopic.textContent
            })
        }).then(r => r.json())
    );

    try {
        const results = await Promise.all(feedbackPromises);
        renderFeedback(results, answers);
        showView('feedback');
        updateStepper(3);
    } catch (error) {
        alert('Error checking answers: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Check Answers</span><i data-lucide="check-circle" class="w-5 h-5"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function renderFeedback(results, answers) {
    feedbackContainer.innerHTML = results.map((res, index) => {
        let correction = {};
        try {
            let cleanText = res.correction.replace(/```json/g, '').replace(/```/g, '').trim();
            correction = JSON.parse(cleanText);
        } catch (e) {
            correction = { correct: false, feedback: res.correction, correct_answer: 'N/A' };
        }

        const isCorrect = correction.correct;
        const userAns = answers[index].userAnswer || '(No answer)';
        const question = answers[index].question;
        const correctAnswer = correction.correct_answer || 'N/A';

        if (isCorrect) {
            return `
                <div class="p-5 rounded-xl bg-emerald-50 border border-emerald-100 flex gap-4">
                    <div class="mt-1 text-emerald-600 shrink-0">
                        <i data-lucide="check-circle" class="w-6 h-6 fill-emerald-100"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-xs font-bold text-emerald-700 tracking-wider mb-2 uppercase">Correct ✓</p>
                        <p class="text-slate-700 text-sm mb-3 font-medium"><strong>Question:</strong> ${question}</p>
                        <p class="text-slate-600 text-sm mb-2">Your answer: <span class="text-emerald-700 font-bold text-base">${userAns}</span></p>
                        <p class="text-sm text-slate-500">${correction.feedback}</p>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="p-5 rounded-xl bg-rose-50 border border-rose-100 flex gap-4">
                    <div class="mt-1 text-rose-500 shrink-0">
                        <i data-lucide="x-circle" class="w-6 h-6 fill-rose-100"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-xs font-bold text-rose-600 tracking-wider mb-2 uppercase">Incorrect ✗</p>
                        <p class="text-slate-700 text-sm mb-3 font-medium"><strong>Question:</strong> ${question}</p>
                        <div class="flex items-center gap-3 mb-3">
                            <span class="text-slate-400 line-through text-sm">${userAns}</span>
                            <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400"></i>
                            <span class="text-emerald-700 font-bold text-base">${correctAnswer}</span>
                        </div>
                        <div class="text-sm text-slate-600 bg-white p-3 rounded-lg border border-rose-100/50 shadow-sm">
                            <strong>Feedback:</strong> ${correction.feedback}
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --------------------- EVENT LISTENERS ---------------------

if (generateBtn) generateBtn.addEventListener('click', generateExercises);
if (submitBtn) submitBtn.addEventListener('click', submitAnswers);
if (nextTopicBtn) nextTopicBtn.addEventListener('click', () => showView('section-1'));
if (newTopicBtn) newTopicBtn.addEventListener('click', () => {
    if (topicLoader) topicLoader.classList.remove('hidden');
    generateBtn.disabled = true; // Disable until both loads complete
    loadDailyTopic();
    loadPhrasalVerbs();
});
if (backToMenuBtn) backToMenuBtn.addEventListener('click', () => showView('menu'));

// --------------------- SECTION 2: GRAMMAR PRACTICE ---------------------

const grammarLoader = document.getElementById('grammar-loader');
const grammarConceptsContainer = document.getElementById('grammar-concepts-container');
const grammarSubmitContainer = document.getElementById('grammar-submit-container');
const submitGrammarBtn = document.getElementById('submit-grammar-btn');
const grammarFeedbackSection = document.getElementById('grammar-feedback-section');
const grammarFeedbackContainer = document.getElementById('grammar-feedback-container');
const newGrammarPracticeBtn = document.getElementById('new-grammar-practice-btn');
const backToMenuBtn2 = document.getElementById('back-to-menu-btn-2');

async function loadGrammarConcepts() {
    console.log('🔄 loadGrammarConcepts called');

    if (grammarLoader) grammarLoader.classList.remove('hidden');
    if (grammarConceptsContainer) grammarConceptsContainer.innerHTML = '';
    if (grammarSubmitContainer) grammarSubmitContainer.classList.add('hidden');
    if (grammarFeedbackSection) grammarFeedbackSection.classList.add('hidden');

    try {
        const res = await fetch(`${API_BASE}/grammar/random-concepts`);
        if (!res.ok) throw new Error('Failed to fetch grammar concepts');

        const data = await res.json();
        console.log('✅ Grammar concepts received:', data);
        state.grammarConcepts = data.concepts;
        state.grammarSentences = {};

        renderGrammarConcepts(data.concepts);
        if (grammarSubmitContainer) grammarSubmitContainer.classList.remove('hidden');

    } catch (error) {
        console.error('❌ Error loading grammar concepts:', error);
        if (grammarConceptsContainer) {
            grammarConceptsContainer.innerHTML = `<p class="text-rose-600">Error loading concepts: ${error.message}</p>`;
        }
    } finally {
        if (grammarLoader) grammarLoader.classList.add('hidden');
    }
}

function renderGrammarConcepts(concepts) {
    if (!grammarConceptsContainer) return;

    const html = concepts.map((concept, index) => `
        <div class="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <span class="text-xs font-bold text-brand-600 tracking-wider bg-brand-50 px-2 py-1 rounded mb-2 inline-block">
                        ${concept.section}
                    </span>
                    <h3 class="text-lg font-bold text-slate-900 mb-2">${concept.title}</h3>
                    ${concept.example ? `<p class="text-sm text-slate-500 italic">Ejemplo: ${concept.example}</p>` : ''}
                </div>
            </div>
            <div class="mt-4">
                <label class="block text-sm font-medium text-slate-700 mb-2">Tu ejemplo:</label>
                <textarea 
                    id="grammar-input-${index}"
                    class="input-clean w-full p-4 rounded-xl text-slate-800 placeholder-slate-400 min-h-[100px] resize-y"
                    placeholder="Escribe una frase usando este concepto gramatical..."
                ></textarea>
            </div>
        </div>
    `).join('');

    grammarConceptsContainer.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function submitGrammarSentences() {
    if (!submitGrammarBtn) return;

    // Collect user sentences
    const sentences = [];
    state.grammarConcepts.forEach((concept, index) => {
        const input = document.getElementById(`grammar-input-${index}`);
        if (input && input.value.trim()) {
            sentences.push({
                section: concept.section,
                concept: concept.title,
                example: concept.example,
                userSentence: input.value.trim()
            });
        }
    });

    if (sentences.length === 0) {
        alert('Por favor, escribe al menos una frase antes de corregir.');
        return;
    }

    submitGrammarBtn.disabled = true;
    submitGrammarBtn.innerHTML = '<span class="loader border-white/30 border-b-white w-5 h-5"></span> Corrigiendo...';

    // Show waiting activity
    showWaitingActivity();

    try {
        const res = await fetch(`${API_BASE}/gemini/correct-grammar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sentences })
        });

        const data = await res.json();
        console.log('📦 Grammar feedback received:', data);

        let feedbackArray = [];
        try {
            let cleanText = data.feedback.replace(/```json/g, '').replace(/```/g, '').trim();
            feedbackArray = JSON.parse(cleanText);

            // Merge concept information from our state with Gemini's feedback
            // This ensures we always have the concept details even if Gemini doesn't return them
            feedbackArray = feedbackArray.map((item, index) => {
                const originalSentence = sentences[index];
                return {
                    ...item,
                    seccion: item.seccion || originalSentence.section,
                    concepto: item.concepto || originalSentence.concept,
                    ejemplo: item.ejemplo || originalSentence.example
                };
            });

            console.log('✅ Merged feedback with concept info:', feedbackArray);
        } catch (e) {
            console.error('❌ Failed to parse feedback JSON', e);
            alert('Error parsing feedback. Check console.');
            return;
        }

        renderGrammarFeedback(feedbackArray);
        if (grammarFeedbackSection) grammarFeedbackSection.classList.remove('hidden');
        window.scrollTo({ top: document.getElementById('grammar-feedback-section').offsetTop - 100, behavior: 'smooth' });

    } catch (error) {
        console.error('❌ Error submitting grammar sentences:', error);
        alert('Error al corregir las frases: ' + error.message);
    } finally {
        submitGrammarBtn.disabled = false;
        submitGrammarBtn.innerHTML = '<span>Corregir</span><i data-lucide="check-circle" class="w-5 h-5"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function renderGrammarFeedback(feedbackArray) {
    if (!grammarFeedbackContainer) return;

    const html = feedbackArray.map((item, index) => `
        <div class="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h3 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span class="bg-brand-100 text-brand-600 px-3 py-1 rounded-lg text-sm">Frase ${item.frase_numero || index + 1}</span>
            </h3>
            
            <!-- Grammar Concept Being Practiced -->
            <div class="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p class="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Concepto Gramatical:</p>
                <p class="text-slate-900 font-bold mb-1">${item.concepto || 'N/A'}</p>
                ${item.seccion ? `<p class="text-xs text-slate-500 mb-2">${item.seccion}</p>` : ''}
                ${item.ejemplo ? `<p class="text-sm text-slate-600 italic">Ejemplo: ${item.ejemplo}</p>` : ''}
            </div>
            
            <!-- Original Sentence -->
            <div class="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tu frase:</p>
                <p class="text-slate-700 font-medium">"${item.frase_original}"</p>
            </div>

            <!-- Grammatical Errors Section -->
            <div class="mb-6">
                <div class="flex items-center gap-2 mb-3">
                    <i data-lucide="alert-circle" class="w-5 h-5 text-rose-500"></i>
                    <h4 class="text-md font-bold text-slate-900">Errores Gramaticales</h4>
                </div>
                <div class="p-4 bg-rose-50 border border-rose-100 rounded-lg">
                    <p class="text-slate-700">${item.errores_gramaticales}</p>
                </div>
            </div>

            <!-- B2 Level Section -->
            <div class="mb-6">
                <div class="flex items-center gap-2 mb-3">
                    <i data-lucide="trending-up" class="w-5 h-5 text-blue-500"></i>
                    <h4 class="text-md font-bold text-slate-900">Nivel B2 (Más Natural)</h4>
                </div>
                <div class="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <p class="text-slate-700 font-medium">"${item.nivel_b2}"</p>
                </div>
            </div>

            <!-- C1 Level Section -->
            <div>
                <div class="flex items-center gap-2 mb-3">
                    <i data-lucide="award" class="w-5 h-5 text-purple-500"></i>
                    <h4 class="text-md font-bold text-slate-900">Nivel C1 (Más Avanzado)</h4>
                </div>
                <div class="p-4 bg-purple-50 border border-purple-100 rounded-lg">
                    <p class="text-slate-700 font-medium">"${item.nivel_c1}"</p>
                </div>
            </div>
        </div>
    `).join('');

    grammarFeedbackContainer.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Event Listeners for Section 2
if (submitGrammarBtn) submitGrammarBtn.addEventListener('click', submitGrammarSentences);
if (newGrammarPracticeBtn) newGrammarPracticeBtn.addEventListener('click', () => {
    if (grammarFeedbackSection) grammarFeedbackSection.classList.add('hidden');
    loadGrammarConcepts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
if (backToMenuBtn2) backToMenuBtn2.addEventListener('click', () => showView('menu'));

// --------------------- SECTION 3: PRONUNCIATION TRAINER ---------------------

const modeGeminiBtn = document.getElementById('mode-gemini-btn');
const modeListBtn = document.getElementById('mode-list-btn');
const wordListContainer = document.getElementById('word-list-container');
const wordListGrid = document.getElementById('word-list-grid');
const currentWordDisplay = document.getElementById('current-word-display');
const wordLoader = document.getElementById('word-loader');
const wordContent = document.getElementById('word-content');
const wordText = document.getElementById('word-text');
const wordIpa = document.getElementById('word-ipa');
const wordTipsText = document.getElementById('word-tips-text');
const recordingControls = document.getElementById('recording-controls');
const recordBtn = document.getElementById('record-btn');
const stopBtn = document.getElementById('stop-btn');
const recordingStatus = document.getElementById('recording-status');
const audioPreview = document.getElementById('audio-preview');
const audioPlayback = document.getElementById('audio-playback');
const analyzeContainer = document.getElementById('analyze-container');
const analyzeBtn = document.getElementById('analyze-btn');
const newWordBtn = document.getElementById('new-word-btn');
const pronunciationFeedbackSection = document.getElementById('pronunciation-feedback-section');
const pronunciationScore = document.getElementById('pronunciation-score');
const pronunciationFeedbackContainer = document.getElementById('pronunciation-feedback-container');
const playCorrectBtn = document.getElementById('play-correct-btn');
const backToMenuBtn3 = document.getElementById('back-to-menu-btn-3');
const saveWordBtn = document.getElementById('save-word-btn');

async function initializePronunciationTrainer() {
    console.log('🔄 initializePronunciationTrainer called');

    // Load all words for list mode
    try {
        const res = await fetch(`${API_BASE}/pronunciation/words`);
        if (res.ok) {
            const data = await res.json();
            state.allWords = data.words;
            renderWordList();
        }
    } catch (error) {
        console.error('❌ Error loading words:', error);
    }

    // Load initial word (Gemini mode by default)
    loadWord();
}

function toggleMode(mode) {
    state.pronunciationMode = mode;

    if (mode === 'gemini') {
        modeGeminiBtn.classList.remove('bg-white', 'border-2', 'border-slate-200', 'text-slate-600');
        modeGeminiBtn.classList.add('bg-brand-600', 'text-white');
        modeListBtn.classList.remove('bg-brand-600', 'text-white');
        modeListBtn.classList.add('bg-white', 'border-2', 'border-slate-200', 'text-slate-600');
        wordListContainer.classList.add('hidden');
        loadWord();
    } else {
        modeListBtn.classList.remove('bg-white', 'border-2', 'border-slate-200', 'text-slate-600');
        modeListBtn.classList.add('bg-brand-600', 'text-white');
        modeGeminiBtn.classList.remove('bg-brand-600', 'text-white');
        modeGeminiBtn.classList.add('bg-white', 'border-2', 'border-slate-200', 'text-slate-600');
        wordListContainer.classList.remove('hidden');
    }
}

function renderWordList() {
    if (!wordListGrid || !state.allWords.length) return;

    const html = state.allWords.map((word, index) => {
        const isSaved = word.difficulty === 'saved';
        return `
            <button 
                class="word-list-item px-4 py-3 rounded-lg bg-white border-2 border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-all text-left relative overflow-hidden group"
                data-word-index="${index}">
                ${isSaved ? '<div class="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">SAVED</div>' : ''}
                <div class="font-bold text-slate-900">${word.word}</div>
                <div class="text-xs text-slate-500">${word.ipa}</div>
            </button>
        `;
    }).join('');

    wordListGrid.innerHTML = html;

    // Add click listeners
    document.querySelectorAll('.word-list-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.wordIndex);
            selectWordFromList(state.allWords[index]);
        });
    });
}

function selectWordFromList(word) {
    state.currentWord = word;
    displayWord(word);
    wordListContainer.classList.add('hidden');
}

async function loadWord() {
    if (wordLoader) wordLoader.classList.remove('hidden');
    if (wordContent) wordContent.classList.add('hidden');
    if (recordingControls) recordingControls.classList.add('hidden');
    if (analyzeContainer) analyzeContainer.classList.add('hidden');
    if (pronunciationFeedbackSection) pronunciationFeedbackSection.classList.add('hidden');

    // Reset audio
    state.audioBlob = null;
    if (audioPreview) audioPreview.classList.add('hidden');

    try {
        if (state.pronunciationMode === 'gemini') {
            console.log('✨ Fetching random word from Gemini...');
            const res = await fetch(`${API_BASE}/pronunciation/gemini-word`);
            if (!res.ok) throw new Error('Failed to fetch from Gemini');
            const data = await res.json();
            state.currentWord = data;
            displayWord(data);
        } else {
            // List Mode: Random from local list
            if (!state.allWords || state.allWords.length === 0) {
                const res = await fetch(`${API_BASE}/pronunciation/words`);
                if (res.ok) {
                    const data = await res.json();
                    state.allWords = data.words;
                }
            }
            if (state.allWords && state.allWords.length > 0) {
                const wordData = state.allWords[Math.floor(Math.random() * state.allWords.length)];
                state.currentWord = wordData;
                displayWord(wordData);
            } else {
                throw new Error('No words available');
            }
        }

    } catch (error) {
        console.error('❌ Error loading word:', error);
        if (wordContent) {
            wordContent.innerHTML = `<p class="text-rose-600">Error loading word: ${error.message}</p>`;
            wordContent.classList.remove('hidden');
        }
    } finally {
        if (wordLoader) wordLoader.classList.add('hidden');
    }
}

const wordTranslation = document.getElementById('word-translation');

function displayWord(word) {
    if (wordText) wordText.textContent = word.word;
    if (wordTranslation) wordTranslation.textContent = word.spanish_translation || ''; // Show translation or empty
    if (wordIpa) wordIpa.textContent = word.ipa || '';
    if (wordTipsText) wordTipsText.textContent = word.tips || 'No tips available';

    if (wordContent) wordContent.classList.remove('hidden');
    if (recordingControls) recordingControls.classList.remove('hidden');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Reset save button state
    if (saveWordBtn) {
        saveWordBtn.disabled = false;
        saveWordBtn.innerHTML = '<i data-lucide="bookmark" class="w-4 h-4"></i><span>Save</span>';
        saveWordBtn.classList.remove('bg-emerald-50', 'text-emerald-600', 'border-emerald-200');
        saveWordBtn.classList.add('bg-white', 'text-brand-600', 'border-brand-200');
        lucide.createIcons();
    }
}

async function saveCurrentWord() {
    if (!state.currentWord || !saveWordBtn) return;

    saveWordBtn.disabled = true;
    saveWordBtn.innerHTML = '<span class="loader w-4 h-4 border-2 border-brand-600"></span>';

    try {
        const res = await fetch(`${API_BASE}/words/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.currentWord)
        });

        if (res.ok) {
            saveWordBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i><span>Saved</span>';
            saveWordBtn.classList.remove('bg-white', 'text-brand-600', 'border-brand-200');
            saveWordBtn.classList.add('bg-emerald-50', 'text-emerald-600', 'border-emerald-200');

            // Refresh words list to include the new one
            const wordsRes = await fetch(`${API_BASE}/pronunciation/words`);
            if (wordsRes.ok) {
                const wordsData = await wordsRes.json();
                state.allWords = wordsData.words;
                renderWordList();
            }
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        console.error('Save error:', error);
        saveWordBtn.innerHTML = '<span>Error</span>';
        setTimeout(() => {
            saveWordBtn.disabled = false;
            saveWordBtn.innerHTML = '<i data-lucide="bookmark" class="w-4 h-4"></i><span>Save</span>';
            lucide.createIcons();
        }, 2000);
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
            state.audioBlob = new Blob(chunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(state.audioBlob);
            if (audioPlayback) {
                audioPlayback.src = audioUrl;
                audioPreview.classList.remove('hidden');
            }
            if (analyzeContainer) analyzeContainer.classList.remove('hidden');

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        state.audioRecorder = recorder;

        // Update UI
        if (recordBtn) recordBtn.disabled = true;
        if (stopBtn) {
            stopBtn.disabled = false;
            stopBtn.classList.remove('bg-slate-400');
            stopBtn.classList.add('bg-slate-900', 'hover:bg-slate-800');
        }
        if (recordingStatus) recordingStatus.classList.remove('hidden');

    } catch (error) {
        console.error('❌ Error starting recording:', error);
        alert('Error al acceder al micrófono. Por favor, permite el acceso al micrófono.');
    }
}

function stopRecording() {
    if (state.audioRecorder && state.audioRecorder.state !== 'inactive') {
        state.audioRecorder.stop();

        // Update UI
        if (recordBtn) recordBtn.disabled = false;
        if (stopBtn) {
            stopBtn.disabled = true;
            stopBtn.classList.remove('bg-slate-900', 'hover:bg-slate-800');
            stopBtn.classList.add('bg-slate-400');
        }
        if (recordingStatus) recordingStatus.classList.add('hidden');
    }
}

async function analyzePronunciation() {
    if (!state.audioBlob) {
        alert('Por favor, graba tu pronunciación primero.');
        return;
    }

    if (!state.currentWord) {
        alert('No hay palabra seleccionada.');
        return;
    }

    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span class="loader border-white/30 border-b-white w-5 h-5"></span> Analizando...';

        // Show waiting activity
        showWaitingActivity();
    }

    try {
        // Convert blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
        });
        reader.readAsDataURL(state.audioBlob);
        const audioBase64 = await base64Promise;

        const res = await fetch(`${API_BASE}/pronunciation/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                word: state.currentWord.word,
                ipa: state.currentWord.ipa,
                audioBase64: audioBase64
            })
        });

        const data = await res.json();
        console.log('📦 Pronunciation analysis received:', data);

        if (data.error) {
            throw new Error(data.error);
        }

        let analysis = {};
        try {
            if (!data.analysis) throw new Error('No analysis data received');
            let cleanText = data.analysis.replace(/```json/g, '').replace(/```/g, '').trim();
            analysis = JSON.parse(cleanText);
        } catch (e) {
            console.error('❌ Failed to parse analysis JSON', e);
            alert('Error parsing analysis: ' + e.message);
            return;
        }

        state.pronunciationFeedback = analysis;
        renderPronunciationFeedback(analysis);
        if (pronunciationFeedbackSection) pronunciationFeedbackSection.classList.remove('hidden');
        window.scrollTo({ top: document.getElementById('pronunciation-feedback-section').offsetTop - 100, behavior: 'smooth' });

    } catch (error) {
        console.error('❌ Error analyzing pronunciation:', error);
        alert('Error al analizar la pronunciación: ' + error.message);
    } finally {
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i data-lucide="brain" class="w-6 h-6"></i><span>Analizar Pronunciación</span>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

function renderPronunciationFeedback(analysis) {
    // Update score
    if (pronunciationScore) {
        pronunciationScore.textContent = analysis.score || 0;
    }

    // Render feedback sections
    if (!pronunciationFeedbackContainer) return;

    const html = `
        <!-- Overall Feedback -->
        <div class="p-6 bg-blue-50 rounded-xl border border-blue-200">
            <div class="flex items-center gap-2 mb-3">
                <i data-lucide="message-circle" class="w-5 h-5 text-blue-600"></i>
                <h3 class="text-lg font-bold text-slate-900">Feedback General</h3>
            </div>
            <p class="text-slate-700">${analysis.feedback || 'No feedback available'}</p>
        </div>
        
        <!-- Improvements -->
        ${analysis.improvements && analysis.improvements.length > 0 ? `
        <div class="p-6 bg-amber-50 rounded-xl border border-amber-200">
            <div class="flex items-center gap-2 mb-3">
                <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-600"></i>
                <h3 class="text-lg font-bold text-slate-900">Áreas de Mejora</h3>
            </div>
            <ul class="space-y-2">
                ${analysis.improvements.map(item => `
                    <li class="flex items-start gap-2">
                        <span class="text-amber-600 mt-1">•</span>
                        <span class="text-slate-700">${item}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
        ` : ''}
        
        <!-- Tips -->
        <div class="p-6 bg-emerald-50 rounded-xl border border-emerald-200">
            <div class="flex items-center gap-2 mb-3">
                <i data-lucide="lightbulb" class="w-5 h-5 text-emerald-600"></i>
                <h3 class="text-lg font-bold text-slate-900">Consejos</h3>
            </div>
            <p class="text-slate-700">${analysis.tips || 'Keep practicing!'}</p>
        </div>
    `;

    pronunciationFeedbackContainer.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function playCorrectPronunciation() {
    if (!state.currentWord) return;

    // Use Web Speech API for TTS
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(state.currentWord.word);
        utterance.lang = 'en-US';
        utterance.rate = 0.8; // Slower for learning
        window.speechSynthesis.speak(utterance);
    } else {
        alert('Tu navegador no soporta síntesis de voz.');
    }
}

// Event Listeners for Section 3
if (modeGeminiBtn) modeGeminiBtn.addEventListener('click', () => toggleMode('gemini'));
if (modeListBtn) modeListBtn.addEventListener('click', () => toggleMode('list'));
if (recordBtn) recordBtn.addEventListener('click', startRecording);
if (stopBtn) stopBtn.addEventListener('click', stopRecording);
if (analyzeBtn) analyzeBtn.addEventListener('click', analyzePronunciation);
if (newWordBtn) newWordBtn.addEventListener('click', () => {
    if (pronunciationFeedbackSection) pronunciationFeedbackSection.classList.add('hidden');
    loadWord();
});
if (playCorrectBtn) playCorrectBtn.addEventListener('click', playCorrectPronunciation);
if (backToMenuBtn3) backToMenuBtn3.addEventListener('click', () => showView('menu'));
if (saveWordBtn) saveWordBtn.addEventListener('click', saveCurrentWord);

// --------------------- INITIALIZATION ---------------------

// --------------------- SECTION 2: VOCABULARY DEEP DIVE (New) ---------------------

const vocabLoader = document.getElementById('vocab-loader');
const vocabContent = document.getElementById('vocab-content');
const vocabVerb = document.getElementById('vocab-verb');
const vocabDefinition = document.getElementById('vocab-definition');
const vocabExamplesContainer = document.getElementById('vocab-examples-container');
const vocabExercisesContainer = document.getElementById('vocab-exercises-container');
const vocabFeedbackArea = document.getElementById('vocab-feedback-area');
const vocabIpa = document.getElementById('vocab-ipa');
const vocabTipsList = document.getElementById('vocab-tips-list');
const nextVocabBtn = document.getElementById('next-vocab-btn');
const checkVocabBtn = document.getElementById('check-vocab-btn');
const backToMenuVocabBtn = document.getElementById('back-to-menu-vocab-btn');

async function loadVocabularyDeepDive(specificVerb = null, specificDef = null) {
    if (vocabLoader) vocabLoader.classList.remove('hidden');
    if (vocabContent) vocabContent.classList.add('hidden');

    try {
        let phrasalVerb = specificVerb;
        let definition = specificDef;

        if (!phrasalVerb || !definition) {
            // 1. Get Random Verb from Sheets API if no specific one provided
            const resSheets = await fetch(`${API_BASE}/sheets/phrasal-verbs`);
            if (!resSheets.ok) throw new Error('Failed to fetch verbs list');

            const dataSheets = await resSheets.json();
            const rows = dataSheets.rows || [];
            if (rows.length === 0) throw new Error('No phrasal verbs found');

            const randomRow = rows[Math.floor(Math.random() * rows.length)];
            phrasalVerb = randomRow[0];
            definition = randomRow[1];
        }

        console.log(`✨ Selected Verb: ${phrasalVerb}`);

        // 2. Call Gemini for Deep Dive
        const resGemini = await fetch(`${API_BASE}/gemini/vocabulary-dive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phrasalVerb, definition })
        });

        const deepDiveData = await resGemini.json();
        console.log('📦 Deep Dive Data:', deepDiveData);

        state.vocabExercises = deepDiveData.exercises;

        renderVocabularyDeepDive(phrasalVerb, definition, deepDiveData);

    } catch (error) {
        console.error('Error loading Vocabulary Deep Dive:', error);
        alert('Error loading content. Please try again.');
    } finally {
        if (vocabLoader) vocabLoader.classList.add('hidden');
    }
}

const vocabErrorSection = document.getElementById('vocab-common-error-section');
const vocabErrorTitle = document.getElementById('vocab-error-title');
const vocabErrorDesc = document.getElementById('vocab-error-desc');
const vocabErrorCorrection = document.getElementById('vocab-error-correction');
const vocabErrorExamples = document.getElementById('vocab-error-examples');

const vocabTipSection = document.getElementById('vocab-c1-tip-section');
const vocabTipTitle = document.getElementById('vocab-tip-title');
const vocabTipDesc = document.getElementById('vocab-tip-desc');
const vocabTipAlternatives = document.getElementById('vocab-tip-alternatives');
const vocabTipExample = document.getElementById('vocab-tip-example');

const vocabRefineInput = document.getElementById('vocab-refine-input');
const vocabRefineBtn = document.getElementById('vocab-refine-btn');
const vocabRefineResult = document.getElementById('vocab-refine-result');
const vocabRefineOutput = document.getElementById('vocab-refine-output');
const vocabRefineExplanation = document.getElementById('vocab-refine-explanation');

const vocabTranslation = document.getElementById('vocab-translation');

function renderVocabularyDeepDive(verb, def, data) {
    if (!vocabContent) return;

    // Header
    if (vocabVerb) vocabVerb.textContent = verb;
    if (vocabDefinition) vocabDefinition.textContent = def;
    if (vocabTranslation) vocabTranslation.textContent = data.spanish_translation ? `(${data.spanish_translation})` : '';

    // A. Examples
    if (vocabExamplesContainer) {
        vocabExamplesContainer.innerHTML = data.examples.map((ex, i) => `
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p class="text-lg font-bold text-slate-800 mb-1">
                    <span class="text-brand-500 mr-2">${i + 1}.</span> ${ex.english}
                </p>
                <p class="text-slate-500 text-sm flex items-center gap-2">
                    <span class="text-xl leading-none">👉</span> ${ex.spanish}
                </p>
            </div>
        `).join('');
    }

    // B. Exercises
    if (vocabExercisesContainer) {
        vocabFeedbackArea.innerHTML = '';
        vocabFeedbackArea.classList.add('hidden');
        checkVocabBtn.disabled = false;
        checkVocabBtn.textContent = 'Check Answers';

        vocabExercisesContainer.innerHTML = data.exercises.map((ex, i) => {
            // Robust regex to catch [GAP], _____, [...], or (gap)
            const questionHtml = ex.question.replace(/(\[GAP\]|_{3,}|\[\.\.\.\]|\(gap\))/gi, `
                <input type="text" id="vocab-input-${i}" 
                class="inline-input mx-1 px-2 py-1 border-b-2 border-slate-300 focus:border-amber-500 bg-white text-slate-800 font-bold outline-none transition-colors w-32 text-center" 
                autocomplete="off">
            `);

            return `
                <div class="flex items-start gap-3">
                    <span class="mt-1 font-bold text-slate-400 text-sm">${i + 1}.</span>
                    <p class="text-lg text-slate-700 leading-relaxed">${questionHtml}</p>
                </div>
            `;
        }).join('');
    }

    // C. Pronunciation
    if (vocabIpa) vocabIpa.textContent = data.pronunciation.ipa;
    if (vocabTipsList) {
        vocabTipsList.innerHTML = data.pronunciation.tips.map(tip => `<li>${tip}</li>`).join('');
    }

    // D. Common Error (B2)
    if (data.common_error && vocabErrorSection) {
        vocabErrorTitle.textContent = data.common_error.title || 'Error Común (B2)';
        vocabErrorDesc.textContent = data.common_error.description;
        vocabErrorCorrection.textContent = data.common_error.correction || '👉 Native alternative:';
        if (vocabErrorExamples) {
            vocabErrorExamples.innerHTML = data.common_error.examples.map(ex => {
                const text = typeof ex === 'object' && ex !== null
                    ? (ex.text || ex.sentence || ex.english || ex.example || Object.values(ex).join(' - '))
                    : ex;
                return `<li>${text}</li>`;
            }).join('');
        }
        vocabErrorSection.classList.remove('hidden');
    } else if (vocabErrorSection) {
        vocabErrorSection.classList.add('hidden');
    }

    // E. C1 Tip
    if (data.c1_tip && vocabTipSection) {
        vocabTipTitle.textContent = data.c1_tip.title || 'Consejo C1';
        vocabTipDesc.textContent = data.c1_tip.description;
        if (vocabTipAlternatives) {
            vocabTipAlternatives.innerHTML = data.c1_tip.alternatives.map(alt => {
                const text = typeof alt === 'object' && alt !== null
                    ? (alt.text || alt.alternative || alt.phrase || alt.english || Object.values(alt).join(' - '))
                    : alt;
                return `<li><strong>${text}</strong></li>`;
            }).join('');
        }
        vocabTipExample.textContent = data.c1_tip.example;
        vocabTipSection.classList.remove('hidden');
    } else if (vocabTipSection) {
        vocabTipSection.classList.add('hidden');
    }

    // Reset Refine Section
    if (vocabRefineInput) vocabRefineInput.value = '';
    if (vocabRefineResult) vocabRefineResult.classList.add('hidden');

    vocabContent.classList.remove('hidden');
}

function checkVocabAnswers() {
    if (!state.vocabExercises) return;

    let allCorrect = true;
    let feedbackHtml = '';

    // Show waiting activity during check? Maybe not needed for simple local check, 
    // but if we were calling API it would be good. 
    // For now, this is client-side check based on Gemini's provided "answer" field.

    state.vocabExercises.forEach((ex, i) => {
        const input = document.getElementById(`vocab-input-${i}`);
        const userAns = input.value.trim().toLowerCase();
        const correctAns = ex.answer.toLowerCase();

        const isCorrect = userAns === correctAns;
        if (!isCorrect) allCorrect = false;

        if (isCorrect) {
            input.classList.remove('border-slate-300', 'border-rose-500');
            input.classList.add('border-emerald-500', 'text-emerald-600');
        } else {
            input.classList.remove('border-slate-300');
            input.classList.add('border-rose-500', 'text-rose-600');
        }

        feedbackHtml += `
            <div class="text-sm border-l-4 ${isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50'} p-2 rounded-r">
                <span class="font-bold text-slate-700">#${i + 1}:</span> 
                ${isCorrect ? 'Correct!' : `Expected: <strong>${ex.answer}</strong>`}
            </div>
        `;
    });

    vocabFeedbackArea.innerHTML = feedbackHtml;
    vocabFeedbackArea.classList.remove('hidden');

    if (allCorrect) {
        checkVocabBtn.textContent = 'Perfect! 🎉';
        checkVocabBtn.disabled = true;
    }
}

async function polishSentence() {
    const vocabVerb = document.getElementById('vocab-verb'); // Re-select to be sure
    const currentVerb = vocabVerb ? vocabVerb.textContent : '';
    const sentence = vocabRefineInput.value.trim();

    if (!sentence) {
        alert('Please write a sentence first.');
        return;
    }

    vocabRefineBtn.disabled = true;
    vocabRefineBtn.innerHTML = '<span class="loader w-4 h-4 border-white"></span> Polishing...';

    // Show waiting activity
    showWaitingActivity();

    try {
        const res = await fetch(`${API_BASE}/gemini/refine-sentence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sentence: sentence,
                targetContext: currentVerb
            })
        });

        const data = await res.json();

        if (vocabRefineOutput) vocabRefineOutput.textContent = data.polished;
        if (vocabRefineExplanation) vocabRefineExplanation.textContent = data.explanation;
        if (vocabRefineResult) vocabRefineResult.classList.remove('hidden');

    } catch (error) {
        console.error('Error polishing sentence:', error);
        alert('Could not polish sentence. Try again.');
    } finally {
        vocabRefineBtn.disabled = false;
        vocabRefineBtn.innerHTML = '<i data-lucide="sparkles" class="w-4 h-4"></i> Polish to C1';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

const vocabAudioBtn = document.getElementById('vocab-audio-btn');

// ... existing code ...

// Event Listeners
if (nextVocabBtn) nextVocabBtn.addEventListener('click', loadVocabularyDeepDive);
if (backToMenuVocabBtn) backToMenuVocabBtn.addEventListener('click', () => showView('menu'));
if (checkVocabBtn) checkVocabBtn.addEventListener('click', checkVocabAnswers);
if (vocabRefineBtn) vocabRefineBtn.addEventListener('click', polishSentence);
if (vocabAudioBtn) {
    vocabAudioBtn.addEventListener('click', () => {
        const verb = vocabVerb ? vocabVerb.textContent : '';
        if (verb) {
            const utterance = new SpeechSynthesisUtterance(verb);
            utterance.lang = 'en-US'; // Default to US English
            utterance.rate = 0.9;
            window.speechSynthesis.cancel(); // Stop any previous
            window.speechSynthesis.speak(utterance);
        }
    });
}


// --------------------- WAITING ACTIVITY LOGIC ---------------------

async function preloadQuickActivities() {
    console.log('⏳ Preloading quick activities...');
    try {
        const res = await fetch(`${API_BASE}/sheets/phrasal-verbs`);
        if (res.ok) {
            const data = await res.json();
            const allRows = data.rows || [];
            if (allRows.length > 0) {
                // Shuffle and pick 5
                const shuffled = allRows.sort(() => 0.5 - Math.random());
                const quickActivities = shuffled.slice(0, 5).map(row => ({
                    verb: row[0],
                    definition: row[1]
                }));
                sessionStorage.setItem('quickActivities', JSON.stringify(quickActivities));
                console.log('✅ Quick activities stored:', quickActivities.length);
            }
        }
    } catch (error) {
        console.error('❌ Error preloading quick activities:', error);
    }
}

function showWaitingActivity() {
    const rawData = sessionStorage.getItem('quickActivities');
    if (!rawData) return; // Nothing to show

    try {
        const activities = JSON.parse(rawData);
        if (!activities || activities.length === 0) return;

        // Pick one random activity from the stored 5
        const activity = activities[Math.floor(Math.random() * activities.length)];

        // Create Modal HTML
        const modalId = 'waiting-activity-modal';
        // Remove existing if any
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modalHtml = `
            <div id="${modalId}" class="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                <!-- Backdrop with blur -->
                <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-all duration-300"></div>
                
                <!-- Card -->
                <div class="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full border border-white/20 transform scale-100 transition-all duration-300">
                    <button onclick="closeWaitingActivity()" class="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>

                    <div class="flex flex-col items-center text-center">
                        <div class="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 animate-pulse">
                            <i data-lucide="hourglass" class="w-6 h-6"></i>
                        </div>
                        
                        <h3 class="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-2">While you wait...</h3>
                        <h2 class="text-2xl font-bold text-slate-900 mb-4">Did you know?</h2>
                        
                        <div class="bg-indigo-50 rounded-xl p-6 w-full border border-indigo-100 mb-6">
                        <p class="text-xl font-bold text-indigo-900 mb-2">${activity.verb}</p>
                            <p class="text-slate-600">${activity.definition}</p>
                        </div>

                        <button id="deep-dive-btn" class="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-all mb-3 flex items-center justify-center gap-2 group">
                            <i data-lucide="layers" class="w-5 h-5"></i>
                            <span>Study in Deep Dive</span>
                            <i data-lucide="arrow-right" class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                        </button>

                        <p class="text-xs text-slate-400 italic">Processing your results...</p>
                        <button onclick="closeWaitingActivity()" class="mt-4 text-sm text-slate-500 hover:text-slate-800 underline">
                            I'm done reading
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Add event listener for Deep Dive
        document.getElementById('deep-dive-btn').addEventListener('click', () => {
            closeWaitingActivity();
            showView('2'); // View 2 is Vocabulary Deep Dive
            loadVocabularyDeepDive(activity.verb, activity.definition);
        });
    } catch (e) {
        console.error('Error showing waiting activity:', e);
    }
}

// Global scope for onclick
window.closeWaitingActivity = function () {
    const modal = document.getElementById('waiting-activity-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.remove(), 300);
    }
};

// --------------------- SECTION 6: C1 IMPROVEMENT LESSON (New) ---------------------

const c1Loader = document.getElementById('c1-loader');
const c1Content = document.getElementById('c1-content');
const c1Topic = document.getElementById('c1-topic');
const c1ExplanationEn = document.getElementById('c1-explanation-en');
const c1ExplanationEs = document.getElementById('c1-explanation-es');
const c1ExamplesContainer = document.getElementById('c1-examples-container');
const c1ExercisesContainer = document.getElementById('c1-exercises-container');
const checkC1Btn = document.getElementById('check-c1-btn');
const c1FeedbackArea = document.getElementById('c1-feedback-area');
const c1OverallFeedback = document.getElementById('c1-overall-feedback');
const c1CorrectionsList = document.getElementById('c1-corrections-list');
const newC1LessonBtn = document.getElementById('new-c1-lesson-btn');
const backToMenuBtn6 = document.getElementById('back-to-menu-btn-6');

// New Logic Elements
const saveC1LessonBtn = document.getElementById('save-c1-lesson-btn');
const loadC1Btn = document.getElementById('load-c1-btn');
const savedLessonsModal = document.getElementById('saved-lessons-modal');
const savedLessonsList = document.getElementById('saved-lessons-list');
const deleteC1LessonBtn = document.getElementById('delete-c1-lesson-btn');

// Global scope for closing modal
window.closeSavedLessonsModal = function () {
    if (savedLessonsModal) savedLessonsModal.classList.add('hidden');
};

async function loadC1Lesson() {
    console.log('⚡ loadC1Lesson called');
    if (!c1Loader) console.error('❌ c1Loader element not found');

    if (c1Loader) c1Loader.classList.remove('hidden');
    if (c1Content) c1Content.classList.add('hidden');

    try {
        const res = await fetch(`${API_BASE}/gemini/c1-lesson`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) throw new Error('Failed to fetch lesson');

        const data = await res.json();
        state.c1LessonData = data; // Store for correction

        renderC1Lesson(data);

    } catch (error) {
        console.error('Error loading C1 Lesson:', error);
        alert('Error loading lesson. Please try again.');
    } finally {
        if (c1Loader) c1Loader.classList.add('hidden');
    }
}

async function saveCurrentC1Lesson() {
    if (!state.c1LessonData) return;

    if (saveC1LessonBtn) {
        saveC1LessonBtn.disabled = true;
        saveC1LessonBtn.innerHTML = '<span class="loader w-4 h-4 border-emerald-600"></span> Saving...';
    }

    try {
        const res = await fetch(`${API_BASE}/c1/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.c1LessonData)
        });

        const data = await res.json();

        if (data.success) {
            // Mark as saved in state
            state.c1LessonData.id = data.lessonId;

            if (saveC1LessonBtn) {
                saveC1LessonBtn.innerHTML = '<i data-lucide="check" class="w-5 h-5"></i><span>Saved</span>';
                saveC1LessonBtn.classList.remove('text-emerald-600', 'bg-white', 'border-slate-200');
                saveC1LessonBtn.classList.add('bg-emerald-100', 'text-emerald-700', 'border-emerald-200');
            }
            // Show delete button
            if (deleteC1LessonBtn) deleteC1LessonBtn.classList.remove('hidden');
        }

    } catch (error) {
        console.error('Error saving lesson:', error);
        alert('Could not save lesson.');
        if (saveC1LessonBtn) {
            saveC1LessonBtn.disabled = false;
            saveC1LessonBtn.innerHTML = '<i data-lucide="bookmark" class="w-5 h-5"></i><span>Save Lesson</span>';
        }
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function openSavedLessonsModal() {
    if (savedLessonsModal) savedLessonsModal.classList.remove('hidden');

    // Fetch lessons
    try {
        const res = await fetch(`${API_BASE}/c1/saved`);
        const lessons = await res.json();
        renderSavedLessonsList(lessons);
    } catch (error) {
        console.error('Error fetching saved C1 lessons:', error);
        if (savedLessonsList) savedLessonsList.innerHTML = '<p class="text-rose-500">Error loading lessons.</p>';
    }
}

function renderSavedLessonsList(lessons) {
    if (!savedLessonsList) return;

    if (lessons.length === 0) {
        savedLessonsList.innerHTML = '<div class="text-center py-10 text-slate-500"><i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 opacity-50"></i><p>No saved lessons yet.</p></div>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    savedLessonsList.innerHTML = lessons.map(lesson => `
        <div class="group p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer relative bg-white"
            onclick="loadSavedC1Lesson('${lesson.id}')">
            
            <div class="pr-10">
                <h4 class="font-bold text-slate-900 mb-1 group-hover:text-purple-700 transition-colors">${lesson.topic}</h4>
                <p class="text-xs text-slate-500 flex items-center gap-2">
                    <i data-lucide="calendar" class="w-3 h-3"></i>
                    ${new Date(lesson.savedAt).toLocaleDateString()} at ${new Date(lesson.savedAt).toLocaleTimeString()}
                </p>
            </div>

            <button onclick="event.stopPropagation(); deleteSavedC1Lesson('${lesson.id}');" 
                    class="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all z-10"
                    title="Delete">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </div>
    `).join('');

    // We store all lessons in a temp variable to easily retrieve the full object later
    window.tempSavedLessons = lessons;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Global scope for onclicks
window.loadSavedC1Lesson = function (id) {
    const lesson = window.tempSavedLessons.find(l => l.id === id);
    if (lesson) {
        state.c1LessonData = lesson;
        renderC1Lesson(lesson);
        closeSavedLessonsModal();

        // Setup buttons for saved state
        if (saveC1LessonBtn) {
            saveC1LessonBtn.innerHTML = '<i data-lucide="check" class="w-5 h-5"></i><span>Saved</span>';
            saveC1LessonBtn.classList.remove('text-emerald-600', 'bg-white', 'border-slate-200');
            saveC1LessonBtn.classList.add('bg-emerald-100', 'text-emerald-700', 'border-emerald-200');
            saveC1LessonBtn.disabled = true;
        }
        if (deleteC1LessonBtn) deleteC1LessonBtn.classList.remove('hidden');
    }
};

window.deleteSavedC1Lesson = async function (id) {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
        const res = await fetch(`${API_BASE}/c1/saved/${id}`, { method: 'DELETE' });
        if (res.ok) {
            // Reload list
            openSavedLessonsModal();

            // If current lesson is the one deleted, reset state?
            if (state.c1LessonData && state.c1LessonData.id === id) {
                // Reset buttons
                if (saveC1LessonBtn) {
                    saveC1LessonBtn.disabled = false;
                    saveC1LessonBtn.innerHTML = '<i data-lucide="bookmark" class="w-5 h-5"></i><span>Save Lesson</span>';
                    saveC1LessonBtn.classList.add('text-emerald-600', 'bg-white', 'border-slate-200');
                    saveC1LessonBtn.classList.remove('bg-emerald-100');
                }
                if (deleteC1LessonBtn) deleteC1LessonBtn.classList.add('hidden');
                // Could verify if we want to clear the content too, but maybe overkill
            }
        }
    } catch (e) {
        console.error('Delete error', e);
        alert('Failed to delete');
    }
};

function renderC1Lesson(data) {
    if (!c1Content) return;

    // Reset UI: hide previous feedback/corrections
    if (c1FeedbackArea) c1FeedbackArea.classList.add('hidden');
    if (c1CorrectionsList) c1CorrectionsList.innerHTML = '';
    if (c1OverallFeedback) c1OverallFeedback.textContent = '';

    if (c1Topic) c1Topic.textContent = data.topic;

    // Handle new bilingual structure or fallback to old structure
    if (c1ExplanationEn && data.explanation_en) {
        c1ExplanationEn.textContent = data.explanation_en;
    } else if (c1ExplanationEn && data.explanation) {
        // Fallback if API returns old format
        c1ExplanationEn.textContent = data.explanation;
    }

    if (c1ExplanationEs && data.explanation_es) {
        c1ExplanationEs.textContent = data.explanation_es;
    } else if (c1ExplanationEs && !data.explanation_es) {
        c1ExplanationEs.innerHTML = '<span class="text-slate-400 italic">Traducción no disponible para este ejemplo antiguo.</span>';
    }

    if (c1ExamplesContainer && Array.isArray(data.examples)) {
        c1ExamplesContainer.innerHTML = data.examples.map(ex => `
            <div class="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <p class="text-lg font-bold text-slate-800 mb-1">
                    ${ex.english}
                </p>
                <p class="text-slate-500 text-sm flex items-center gap-2">
                    <span class="text-xl leading-none">👉</span> ${ex.spanish}
                </p>
            </div>
        `).join('');
    } else if (c1ExamplesContainer) {
        c1ExamplesContainer.innerHTML = '<p class="text-slate-500">No examples available.</p>';
    }

    if (c1ExercisesContainer && Array.isArray(data.exercises)) {
        // Reset feedback
        if (c1FeedbackArea) c1FeedbackArea.classList.add('hidden');
        if (checkC1Btn) {
            checkC1Btn.disabled = false;
            checkC1Btn.innerHTML = '<span>Check Answers</span><i data-lucide="check-circle" class="w-5 h-5"></i>';
        }

        // Reset Save Button State when rendering new/loaded lesson
        if (deleteC1LessonBtn) deleteC1LessonBtn.classList.add('hidden');
        if (saveC1LessonBtn) {
            saveC1LessonBtn.disabled = false;
            saveC1LessonBtn.innerHTML = '<i data-lucide="bookmark" class="w-5 h-5"></i><span>Save Lesson</span>';
            saveC1LessonBtn.classList.add('text-emerald-600', 'bg-white', 'border-slate-200');
            saveC1LessonBtn.classList.remove('bg-emerald-100', 'text-emerald-700', 'border-emerald-200');
        }

        c1ExercisesContainer.innerHTML = data.exercises.map((ex, i) => {
            const hasGaps = /_{2,}/.test(ex.question);
            let questionHtml = ex.question;

            if (hasGaps) {
                questionHtml = ex.question.replace(/_{2,}/g, `
                    <input type="text" id="c1-input-${i}"
                        class="inline-input mx-1 px-2 py-1 border-b-2 border-slate-300 focus:border-purple-500 bg-white text-slate-800 font-bold outline-none transition-colors w-40 text-center"
                        autocomplete="off">
                `);
            }

            return `
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div class="flex flex-col gap-3">
                        <div class="flex items-start gap-3">
                            <span class="mt-1 font-bold text-purple-400 text-sm">${i + 1}.</span>
                            <p class="text-lg text-slate-700 leading-relaxed">${questionHtml}</p>
                        </div>
                        ${!hasGaps ? `
                            <div class="pl-8">
                                <input type="text" id="c1-input-${i}"
                                    class="w-full px-4 py-2 border-2 border-slate-100 rounded-lg focus:border-purple-500 bg-slate-50 text-slate-800 font-medium outline-none transition-all"
                                    placeholder="Type your answer here..."
                                    autocomplete="off">
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } else if (c1ExercisesContainer) {
        c1ExercisesContainer.innerHTML = '<p class="text-slate-500">No exercises generated.</p>';
    }

    c1Content.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function checkC1Exercises() {
    if (!state.c1LessonData) return;

    // Collect answers
    const userAnswers = [];
    let allFilled = true;

    state.c1LessonData.exercises.forEach((ex, i) => {
        const input = document.getElementById(`c1-input-${i}`);
        if (input) {
            userAnswers.push(input.value.trim());
            if (!input.value.trim()) allFilled = false;
        }
    });

    if (!allFilled) {
        alert('Please complete all exercises before checking.');
        return;
    }

    if (checkC1Btn) {
        checkC1Btn.disabled = true;
        checkC1Btn.innerHTML = '<span class="loader w-4 h-4 border-white"></span> Checking...';
    }

    // Show waiting activity popup
    showWaitingActivity();

    try {
        const res = await fetch(`${API_BASE}/gemini/c1-correction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: state.c1LessonData.topic,
                exercises: state.c1LessonData.exercises,
                userAnswers: userAnswers
            })
        });

        const data = await res.json();

        // Hide waiting activity before showing results (optional, but cleaner if we rely on user to close it, or we can force close it)
        // window.closeWaitingActivity(); 

        renderC1Feedback(data);

    } catch (error) {
        console.error('Error checking C1 exercises:', error);
        alert('Error checking answers. Please try again.');
        if (checkC1Btn) {
            checkC1Btn.disabled = false;
            checkC1Btn.innerHTML = '<span>Check Answers</span><i data-lucide="check-circle" class="w-5 h-5"></i>';
        }
    }
}

function renderC1Feedback(data) {
    if (!c1FeedbackArea || !c1CorrectionsList) return;

    if (c1OverallFeedback) c1OverallFeedback.textContent = data.overallFeedback;

    c1CorrectionsList.innerHTML = data.corrections.map((corr, i) => `
        <div class="p-4 rounded-lg border ${corr.isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}">
            <div class="flex items-center gap-2 mb-2">
                <i data-lucide="${corr.isCorrect ? 'check' : 'x'}" class="w-5 h-5 ${corr.isCorrect ? 'text-emerald-600' : 'text-rose-500'}"></i>
                <span class="font-bold ${corr.isCorrect ? 'text-emerald-700' : 'text-rose-700'}">Question ${i + 1}</span>
            </div>
            
            ${!corr.isCorrect ? `
                <div class="mb-2">
                     <span class="text-xs font-bold text-slate-500 uppercase">Correct Answer:</span>
                     <p class="text-emerald-700 font-bold">${corr.correctAnswer}</p>
                </div>
            ` : ''}

            <p class="text-sm text-slate-600 italic">${corr.explanation}</p>
        </div>
    `).join('');

    c1FeedbackArea.classList.remove('hidden');

    // Scroll to feedback
    c1FeedbackArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Event Listeners for Section 6
if (newC1LessonBtn) newC1LessonBtn.addEventListener('click', loadC1Lesson);
if (checkC1Btn) checkC1Btn.addEventListener('click', checkC1Exercises);
if (backToMenuBtn6) backToMenuBtn6.addEventListener('click', () => showView('menu'));
if (saveC1LessonBtn) saveC1LessonBtn.addEventListener('click', saveCurrentC1Lesson);
if (loadC1Btn) loadC1Btn.addEventListener('click', openSavedLessonsModal);
if (deleteC1LessonBtn) deleteC1LessonBtn.addEventListener('click', async () => {
    if (state.c1LessonData && state.c1LessonData.id) {
        await window.deleteSavedC1Lesson(state.c1LessonData.id);
        // Reset UI after deletion of current
        if (deleteC1LessonBtn) deleteC1LessonBtn.classList.add('hidden');
        if (saveC1LessonBtn) {
            saveC1LessonBtn.disabled = false;
            saveC1LessonBtn.innerHTML = '<i data-lucide="bookmark" class="w-5 h-5"></i><span>Save Lesson</span>';
            saveC1LessonBtn.classList.add('text-emerald-600', 'bg-white', 'border-slate-200');
            saveC1LessonBtn.classList.remove('bg-emerald-100', 'text-emerald-700', 'border-emerald-200');
        }
        delete state.c1LessonData.id; // Remove id so we could save it again as new if we wanted
    }
});


// --------------------- INITIALIZATION ---------------------

window.addEventListener('DOMContentLoaded', () => {
    renderMenu();
    showView('menu');
    // Preload activities in background
    setTimeout(preloadQuickActivities, 1000);

    // Header Home Link
    const appTitle = document.getElementById('app-title');
    if (appTitle) {
        appTitle.addEventListener('click', () => showView('menu'));
    }
});
