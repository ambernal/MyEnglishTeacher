# English Trainer

A web application designed to help you practice English using your own study notes from Notion and vocabulary from Google Sheets. It leverages Google's Gemini AI to generate personalized exercises and provide real-time feedback.

## Features

*   **Daily Topic**: Fetches a random page from your Notion English notes database to serve as the daily study topic.
*   **Vocabulary Integration**: Pulls phrasal verbs from a Google Sheet to incorporate into exercises.
*   **AI-Powered Exercises**: Uses Gemini API to generate unique exercises (Multiple Choice, Fill in the Blanks) based on the daily topic and vocabulary.
*   **Smart Correction**: Gemini analyzes your answers and provides detailed explanations for any mistakes.

## Architecture

The application is built with a simple client-server architecture to ensure secure API key management and avoid CORS issues.

*   **Frontend**: Vanilla HTML, CSS (Glassmorphism design), and JavaScript. It handles the UI and communicates with the local backend.
*   **Backend**: Node.js with Express. It acts as a proxy and logic layer, handling authentication and requests to:
    *   **Notion API**: To retrieve page content.
    *   **Google Sheets API**: To retrieve phrasal verbs.
    *   **Gemini API**: To generate and correct exercises.

## Prerequisites

*   Node.js installed.
*   API Keys for:
    *   Notion (Integration Token + Database ID)
    *   Google Sheets (API Key + Spreadsheet ID)
    *   Google Gemini (API Key)

## Setup & Running

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configuration**:
    Create a `.env` file in the root directory (or set system environment variables) with the following credentials:
    ```env
    NOTION_KEY=your_notion_integration_token
    NOTION_DATABASE_ID=your_database_id
    GOOGLE_SHEETS_API_KEY=your_google_api_key
    GOOGLE_SHEETS_ID=your_spreadsheet_id
    GEMINI_API_KEY=your_gemini_api_key
    PORT=3000
    ```

3.  **Start the Server**:
    ```bash
    npm start
    ```
    For development with auto-reload:
    ```bash
    npm run dev
    ```

4.  **Access the App**:
    Open your browser and navigate to `http://localhost:3000`.
