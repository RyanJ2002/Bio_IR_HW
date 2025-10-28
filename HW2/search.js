document.addEventListener('DOMContentLoaded', () => {
    const queryInput = document.getElementById('pubmed-query');
    const searchBtn = document.getElementById('pubmed-search-btn');
    const resultsContainer = document.getElementById('results-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    const multiImportControls = document.getElementById('multi-import-controls');
    const importCountSelect = document.getElementById('import-count-select');
    const importMultipleBtn = document.getElementById('import-multiple-btn');
    let displayedPmids = [];

    // The URL where your Python backend is running
    const BACKEND_URL = 'http://127.0.0.1:5000';
    const delay = ms => new Promise(res => setTimeout(res, ms));

    searchBtn.addEventListener('click', () => {
        performSearch(queryInput.value);
    });

    queryInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            performSearch(queryInput.value);
        }
    });

    importMultipleBtn.addEventListener('click', importMultiplePapers);
    performSearch('');

    async function performSearch(query) {
        // Use the provided query, or a default term if the query is empty/whitespace
        const searchQuery = query.trim() || 'biomedical research';
        
        // Update the input box if we used the default term, so the user knows what was searched
        if (query.trim() === '') {
            queryInput.value = searchQuery;
        }

        resultsContainer.innerHTML = '';
        loadingSpinner.style.display = 'block';
        multiImportControls.classList.add('hidden'); // Hide controls during search
        displayedPmids = []; // Clear old PMIDs

        try {
            // Step 1: Use ESearch to get a list of PubMed IDs (PMIDs) for the query
            const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchQuery)}&retmax=20&retmode=json&sort=relevance`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();
            const pmids = searchData.esearchresult.idlist;

            if (pmids.length === 0) {
                resultsContainer.innerHTML = '<p>No results found.</p>';
                loadingSpinner.style.display = 'none';
                return;
            }

            // Step 2: Use ESummary to get summaries for those PMIDs
            const summaryFetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json`;
            const summaryResponse = await fetch(summaryFetchUrl);
            const summaryData = await summaryResponse.json();
            
            displayResults(summaryData.result);

        } catch (error) {
            console.error('Error fetching from PubMed:', error);
            resultsContainer.innerHTML = '<p>An error occurred while searching. Please try again.</p>';
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    function displayResults(results) {
        resultsContainer.innerHTML = ''; // Clear previous results
        const uids = results.uids;

        if (!uids || uids.length === 0) {
            resultsContainer.innerHTML = '<p>No results found.</p>';
            multiImportControls.classList.add('hidden');
            return;
        }

        displayedPmids = uids; // Store the fetched PMIDs
        multiImportControls.classList.remove('hidden');

        uids.forEach(uid => {
            const paper = results[uid];
            const authors = paper.authors.map(author => author.name).join(', ');
            
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <h3>${paper.title}</h3>
                <p><strong>Authors:</strong> ${authors}</p>
                <p><strong>Journal:</strong> ${paper.fulljournalname} (${paper.pubdate})</p>
                <p><strong>PMID:</strong> ${paper.uid}</p>
                <button class="import-btn" data-pmid="${paper.uid}">Import this Paper</button>
            `;
            resultsContainer.appendChild(resultItem);
        });

        // Add event listeners to the new buttons
        document.querySelectorAll('.import-btn').forEach(button => {
            button.addEventListener('click', importPaper);
        });
    }


    async function importMultiplePapers() {
        const count = parseInt(importCountSelect.value, 10);
        const pmidsToImport = displayedPmids.slice(0, count);

        if (pmidsToImport.length === 0) {
            alert("No papers to import.");
            return;
        }

        importMultipleBtn.disabled = true;
        const xmlStrings = [];

        try {
            // Process papers one by one with a delay to avoid rate-limiting
            for (let i = 0; i < pmidsToImport.length; i++) {
                const pmid = pmidsToImport[i];
                // Update button text to show progress
                importMultipleBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Importing ${i + 1} of ${pmidsToImport.length}...`;

                const response = await fetch(`${BACKEND_URL}/fetch-xml?pmid=${pmid}`);
                if (!response.ok) {
                    // If one fails, we can choose to stop or continue. Here, we'll log and stop.
                    throw new Error(`Failed to fetch PMID ${pmid}. Server responded with status ${response.status}.`);
                }
                const xmlText = await response.text();
                xmlStrings.push(xmlText);

                await delay(350); // Wait 350ms before the next request (about 3 requests/sec)
            }

            // Use a NEW localStorage key for batch import
            localStorage.setItem('pubmedXmlBatchToImport', JSON.stringify(xmlStrings));

            importMultipleBtn.innerHTML = `<i class="fas fa-check-circle"></i> Imported ${xmlStrings.length}!`;
            importMultipleBtn.style.backgroundColor = '#218838';

            setTimeout(() => window.close(), 1200);

        } catch (error) {
            console.error('Error during batch import:', error);
            alert(`Failed to import papers. Please check the console. Error: ${error.message}`);
            importMultipleBtn.disabled = false;
            importMultipleBtn.innerHTML = '<i class="fas fa-file-download"></i> Import Selected';
        }
    }
});

// In search.js, find the importPaper function and modify it

async function importPaper(event) {
    const button = event.target;
    const pmid = button.dataset.pmid;
    
    button.disabled = true;
    button.textContent = 'Importing...';

    try {
        // Step 3: Call our Python backend to get the full XML
        const response = await fetch(`${BACKEND_URL}/fetch-xml?pmid=${pmid}`);
        console.log('Backend response status:', response.status); // <-- REMOVE THIS LINE IF IT'S THE DUPLICATE

        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }
        const xmlData = await response.text();
        console.log('Received XML data from backend:', xmlData.substring(0, 200) + '...'); // <-- REMOVE THIS LINE IF IT'S THE DUPLICATE
        
        // Step 4: Use localStorage to send the XML data back to the main page
        localStorage.setItem('pubmedXmlToImport', xmlData);
        console.log('Successfully set XML data to localStorage.'); // <-- REMOVE THIS LINE IF IT'S THE DUPLICATE

        button.textContent = 'Imported!';
        button.style.backgroundColor = '#6c757d'; // Gray out
        
        setTimeout(() => {
            window.close();
        }, 1000);

    } catch (error) {
        console.error('Error importing paper:', error);
        alert(`Failed to import paper. Please check the console for details. Error: ${error.message}`);
        button.disabled = false;
        button.textContent = 'Import this Paper';
    }
}