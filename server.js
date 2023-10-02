const OpenAIApi = require('openai').OpenAIAPI;
const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();

const metaphorApiKey = JSON.parse(fs.readFileSync(path.join(__dirname, './metaphor_API_key.json'))).API_Key;
const openaiApiKey = JSON.parse(fs.readFileSync(path.join(__dirname, './openAI_API_Key.json'))).API_Key;

//openai.apiKey = openaiApiKey;
const openai = new OpenAIApi({ key: openaiApiKey });

app.use(express.json());

app.post('/search', async (req, res) => {
  try {
    console.log("Received request");

    const { query, options } = req.body;

    console.log("User query: ", query);
    // Get OpenAI completion
    const SYSTEM_MESSAGE = "You are a helpful assistant that generates recipes based strictly off of users comma seperated ingredients. when generating recipes, generate only 1 best recipe given the users ingredients listed, only the name of the recipe";
    const USER_QUESTION = query; 

    console.log("Sending request to OpenAI");
    const response = await openai.ChatCompletion.create({
      engine: "gpt-3.5-turbo",
      prompt: [
        {"role": "system", "content": SYSTEM_MESSAGE},
        {"role": "user", "content": USER_QUESTION},
      ].map(msg => `${msg.role}: ${msg.content}`).join('\n'),
      temperature: 0.6,
      maxTokens: 150,
    });

    console.log("Received response from OpenAI");

    const refinedQuery = response.choices[0].text.trim();

    console.log("Refined query: ", refinedQuery);

    // Make a request to Metaphor API
    const metaphorResponse = await fetch('https://api.metaphor.systems/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': metaphorApiKey },
      body: JSON.stringify({ query: refinedQuery, ...options }),
    });

    if (!metaphorResponse.ok) throw new Error(`Metaphor API HTTP error! Status: ${metaphorResponse.status}`);

    const data = await metaphorResponse.json();
    res.json(data);
    console.log("Received response from Metaphor API");
  } catch (error) {
    console.error("Error fetching data: ", error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
