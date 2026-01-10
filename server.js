require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Swagger Dependencies
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Route Imports
const commonRouter = require('./routes/common');
const section1Router = require('./routes/section1');
const section2Router = require('./routes/section2');
const section3Router = require('./routes/section3');
const section5Router = require('./routes/section5');
const section6Router = require('./routes/section6');
const section7Router = require('./routes/section7');
const section8Router = require('./routes/section8');
const section9Router = require('./routes/section9');

const app = express();
const port = process.env.PORT || 3000;

// Swagger Options
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'English Trainer API',
            version: '1.0.0',
            description: 'API for English Trainer application involving Notion, Google Sheets and Gemini AI.',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Local server',
            },
        ],
    },
    // Files containing annotations
    apis: ['./server.js', './routes/*.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from public directory

// --- Mount Routes ---
app.use(commonRouter);
app.use(section1Router);
app.use(section2Router);
app.use(section3Router);
app.use(section5Router);
app.use(section6Router);
app.use(section7Router);
app.use(section8Router);
app.use(section9Router);


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
