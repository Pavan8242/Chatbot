// This is a Netlify serverless function.
// It acts as a secure proxy to the Gemini API.

// We need to use 'node-fetch' because the standard 'fetch' is not available in this Node.js environment.
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Get the chat history from the frontend's request
        const { history } = JSON.parse(event.body);

        // Get the secret API key from the environment variables set in the Netlify UI
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        
        if (!GEMINI_API_KEY) {
            throw new Error('API key not found.');
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const payload = {
            contents: history
        };

        // Call the real Gemini API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            // If Google's API returns an error, pass it back to the frontend
            const errorBody = await response.text();
            return { statusCode: response.status, body: errorBody };
        }

        const data = await response.json();

        // Extract the text from the response
        const botResponseText = data.candidates[0]?.content?.parts[0]?.text || "Sorry, I couldn't get a response.";

        // Send the extracted text back to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ text: botResponseText }),
        };

    } catch (error) {
        console.error('Error in serverless function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
