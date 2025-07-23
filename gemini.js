// This is a Netlify serverless function.
// It acts as a secure proxy to the Gemini API.

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
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
                body: JSON.stringify({ error: 'API key is missing. Please check your Netlify environment variables.' }),
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

        // Always try to get the JSON body, even if the request failed,
        // as it might contain a specific error message from Google.
        const responseData = await response.json();

        if (!response.ok) {
            // If the response is not OK, throw an error with the message from the API
            const errorMessage = responseData?.error?.message || 'An unknown error occurred with the Gemini API.';
            throw new Error(errorMessage);
        }

        const botResponseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!botResponseText) {
            // This handles cases where the API gives a 200 OK response but no content (e.g., due to safety filters)
            throw new Error("The API returned a response with no text. This might be due to the prompt being blocked for safety reasons.");
        }

        // Send the extracted text back to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ text: botResponseText }),
        };

    } catch (error) {
        console.error('Error in serverless function:', error);
        // Ensure the error message is always a string and send it back as JSON
        const errorMessage = error.message || "An unknown server error occurred.";
        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage }),
        };
    }
};
