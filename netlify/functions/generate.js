// netlify/functions/generate.js
const axios = require('axios');

exports.handler = async function (event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { userPrompt, systemPrompt } = JSON.parse(event.body);
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not defined in environment variables.");
        }

        if (!userPrompt || !systemPrompt) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'userPrompt and systemPrompt are required.' })
            };
        }

        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

        const payload = {
            contents: [{ parts: [{ text: userPrompt }] }],
            tools: [{ "google_search": {} }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };

        const geminiResponse = await axios.post(geminiApiUrl, payload);

        return {
            statusCode: 200,
            body: JSON.stringify(geminiResponse.data)
        };

    } catch (error) {
        console.error('Error in Netlify function:', error.response ? error.response.data : error.message);
        return {
            statusCode: error.response?.status || 500,
            body: JSON.stringify({
                error: 'Failed to fetch from Gemini API.',
                details: error.response?.data || error.message
            })
        };
    }
};
