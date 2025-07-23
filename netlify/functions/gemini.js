// This is a Netlify serverless function.
// It acts as a secure proxy to the Gemini API.

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
            // Return a specific error if the key is missing
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'GEMINI_API_KEY is not set in the Netlify environment variables. Please check your site configuration on Netlify.' }),
            };
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

        const data = await response.json();

        if (!response.ok) {
            // If Google's API returns an error, pass it back to the frontend
            const errorText = data?.error?.message || 'An unknown error occurred with the Gemini API.';
            throw new Error(errorText);
        }

        // Extract the text from the response
        const botResponseText = data.candidates[0]?.content?.parts[0]?.text;
        
        if (!botResponseText) {
            throw new Error("The API returned a valid response, but it contained no text.");
        }

        // Send the extracted text back to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ text: botResponseText }),
        };

    } catch (error) {
        console.error('Error in serverless function:', error.message);
        // Return the actual error message for easier debugging
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
