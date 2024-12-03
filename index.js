/*
first page google scraper 1.0
Jonáš Skalický
3.12. 2024
*/

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const cors = require('cors'); 


const app = express();
const PORT = process.env.PORT || 10000;
app.use(cors({ origin: 'https://dzonny147.github.io' }));

app.use(bodyParser.json());

// Endpoint pro zpracování textu a generování CSV
app.post('/api/search', async (req, res) => {
    const { inputText } = req.body;

    //error message
    if (!inputText) {
        return res.status(400).send('Chyba: Text není zadaný.');
    }

    //editing enterd frase to remove spaces
    const searchTerm = inputText.replace(/ /g, '+'); // Nahrazení mezer
    const csvPath = path.join(__dirname, 'result.csv');

    try {
        // starting browser for puppeteer
        const browser = await puppeteer.launch({ headless: true , cacheDirectory: '/opt/render/.cache/puppeteer',});
        const page = await browser.newPage();
        await page.goto(`https://www.google.com/search?q=${searchTerm}`);

        // decline cookies if nesecery
        try {
            await page.click('#W0wltc');
        } catch {
            console.log('No cookie consent button found.');
        }

        // extraction of results of google search
        const searchResults = await page.$$('.tF2Cxc');
        
        let results = [];

        for (const result of searchResults) {
            //extraction of information
            const title = await result.$eval('h3', el => el.textContent).catch(() => 'No title found');
            const url = await result.$eval('a', el => el.href).catch(() => 'No URL found');
            const description = await result.$eval('.VwiC3b', el => el.textContent).catch(() => 'No description found');

            results.push({ title, url, description });
        }

        await browser.close();

        // Generování CSV souboru
        let csvContent = 'Title,URL,Description\n';
        results.forEach(row => {
            csvContent += `"${row.title.replace(/"/g, '""')}","${row.url.replace(/"/g, '""')}","${row.description.replace(/"/g, '""')}"\n`;
        });

        //to ensure unicnes of files
        const timestamp = Date.now(); // Unikátní časové razítko
        const csvPath = path.join(__dirname, `result-${searchTerm}-${timestamp}.csv`);

        fs.writeFileSync(csvPath, csvContent);

        // response with link for download of file
        res.json({ downloadLink: `/download/result-${searchTerm}-${timestamp}.csv` });


    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).send('Chyba při vyhledávání.');
    }
});

// Endpoint for download CSV file
app.get('/download/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, fileName);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('Soubor nebyl nalezen.');
    }
});

// Start of the server
app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
