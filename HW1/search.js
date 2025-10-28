document.addEventListener('DOMContentLoaded', () => {
    const queryInput = document.getElementById('pubmed-query');
    const searchBtn = document.getElementById('pubmed-search-btn');
    const resultsContainer = document.getElementById('results-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    // The URL where your Python backend is running
    const BACKEND_URL = 'http://127.0.0.1:5000';

    searchBtn.addEventListener('click', performSearch);
    queryInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    async function performSearch() {
        const query = queryInput.value.trim();
        if (!query) {
            alert('Please enter a search term.');
            return;
        }

        resultsContainer.innerHTML = '';
        loadingSpinner.style.display = 'block';

        try {
            // Step 1: Use ESearch to get a list of PubMed IDs (PMIDs) for the query
            const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=20&retmode=json`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();
            const pmids = searchData.esearchresult.idlist;

            if (pmids.length === 0) {
                resultsContainer.innerHTML = '<p>No results found.</p>';
                loadingSpinner.style.display = 'none';
                return;
            }

            // Step 2: Use EFetch to get summaries for those PMIDs
            const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&rettype=abstract&retmode=json`;
            // Note: The above URL gets a different format. We need to parse a text-based format.
            // A better way is to fetch full data and extract summary. Let's get summary directly.
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
            return;
        }

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

    async function importPaper(event) {
        const button = event.target;
        const pmid = button.dataset.pmid;
        
        button.disabled = true;
        button.textContent = 'Importing...';

        try {
            // Step 3: Call our Python backend to get the full XML
            const response = await fetch(`${BACKEND_URL}/fetch-xml?pmid=${pmid}`);
            if (!response.ok) {
                throw new Error(`Server returned status: ${response.status}`);
            }
            const xmlData = await response.text();
            
            // Step 4: Use localStorage to send the XML data back to the main page
            localStorage.setItem('pubmedXmlToImport', xmlData);

            button.textContent = 'Imported!';
            button.style.backgroundColor = '#6c757d'; // Gray out
            
            // Optional: close this window after a short delay
            setTimeout(() => {
                window.close();
            }, 1000);

        } catch (error) {
            console.error('Error importing paper:', error);
            alert(`Failed to import paper. Please make sure your Python backend is running. Error: ${error.message}`);
            button.disabled = false;
            button.textContent = 'Import this Paper';
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
        console.log('Backend response status:', response.status); // <-- ADD THIS LINE

        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }
        const xmlData = await response.text();
        console.log('Received XML data from backend:', xmlData.substring(0, 200) + '...'); // <-- ADD THIS LINE
        
        // Step 4: Use localStorage to send the XML data back to the main page
        localStorage.setItem('pubmedXmlToImport', xmlData);
        console.log('Successfully set XML data to localStorage.'); // <-- ADD THIS LINE

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