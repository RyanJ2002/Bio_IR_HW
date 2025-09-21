document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let storedFiles = []; // Array of { title, xmlString }

    // --- DOM ELEMENT SELECTORS ---
    const sidebar = document.querySelector('.sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const viewLibraryBtn = document.getElementById('view-library-btn');
    const importPaperBtn = document.getElementById('import-paper-btn');
    const mainSearchInput = document.getElementById('main-search-input');
    const resultsArea = document.getElementById('search-results-area');
    
    // Modal elements
    const importModal = document.getElementById('import-modal');
    const closeImportModalBtn = document.getElementById('close-import-modal-btn');
    const xmlUpload = document.getElementById('xml-upload');

    // Dashboard elements
    const paperDashboard = document.getElementById('paper-dashboard');
    const closeDashboardBtn = document.getElementById('close-dashboard-btn');

    // --- INITIALIZATION ---
    function init() {
        loadFilesFromStorage();
        setupEventListeners();
    }

    // --- EVENT LISTENERS SETUP ---
    function setupEventListeners() {
        toggleSidebarBtn.addEventListener('click', () => sidebar.classList.toggle('hidden'));
        
        importPaperBtn.addEventListener('click', () => importModal.classList.remove('hidden'));
        closeImportModalBtn.addEventListener('click', () => importModal.classList.add('hidden'));

        viewLibraryBtn.addEventListener('click', () => performGlobalSearch(''));

        mainSearchInput.addEventListener('keyup', (e) => {
            // Debounce search to avoid too many calls
            clearTimeout(mainSearchInput.timer);
            mainSearchInput.timer = setTimeout(() => {
                performGlobalSearch(e.target.value);
            }, 300);
        });

        xmlUpload.addEventListener('change', handleFileUpload);
        window.addEventListener('storage', handlePubMedImport);

        // Event delegation for clicking on a search result
        resultsArea.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.result-item');
            if (resultItem) {
                const title = resultItem.dataset.title;
                showPaperDashboard(title);
            }
        });
        
        closeDashboardBtn.addEventListener('click', () => paperDashboard.classList.remove('visible'));
    }

    // --- DATA PERSISTENCE FUNCTIONS ---
    function loadFilesFromStorage() {
        const filesJson = localStorage.getItem('biomedXmlFiles');
        storedFiles = filesJson ? JSON.parse(filesJson) : [];
        console.log(`Loaded ${storedFiles.length} files from storage.`);
    }

    function saveFileToStorage(title, xmlString) {
        if (storedFiles.some(file => file.title === title)) {
            alert(`File "${title}" already exists.`);
            return false;
        }
        storedFiles.push({ title, xmlString });
        localStorage.setItem('biomedXmlFiles', JSON.stringify(storedFiles));
        return true;
    }

    // --- CORE FUNCTIONALITY ---

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (saveFileToStorage(file.name, e.target.result)) {
                    alert(`Successfully imported "${file.name}".`);
                    importModal.classList.add('hidden');
                    performGlobalSearch(''); // Refresh library view
                }
            };
            reader.readAsText(file);
        }
    }

    function handlePubMedImport(event) {
        if (event.key === 'pubmedXmlToImport' && event.newValue) {
            const xmlString = event.newValue;
            const parser = new DOMParser();
            const tempDoc = parser.parseFromString(xmlString, "application/xml");
            const pmid = tempDoc.querySelector('PMID')?.textContent || `imported_${Date.now()}`;
            const title = `PMID: ${pmid}`;

            if (saveFileToStorage(title, xmlString)) {
                alert(`Successfully imported document (${title}).`);
                performGlobalSearch(''); // Refresh library view
            }
            localStorage.removeItem('pubmedXmlToImport');
        }
    }

    function performGlobalSearch(query) {
        const lowerCaseQuery = query.trim().toLowerCase();
        let searchResults = [];

        if (storedFiles.length === 0) {
            renderSearchResults([]); // Show placeholder if no files
            return;
        }

        storedFiles.forEach(file => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(file.xmlString, "application/xml");
            const title = xmlDoc.querySelector('ArticleTitle')?.textContent || 'No Title';
            const abstract = xmlDoc.querySelector('AbstractText')?.textContent || '';
            const pmid = xmlDoc.querySelector('PMID')?.textContent || 'N/A';
            
            const content = `${title} ${abstract}`.toLowerCase();

            if (lowerCaseQuery === '' || content.includes(lowerCaseQuery)) {
                searchResults.push({
                    fileTitle: file.title,
                    displayTitle: title,
                    pmid: pmid,
                    abstractSnippet: abstract.substring(0, 150) + '...'
                });
            }
        });
        renderSearchResults(searchResults, lowerCaseQuery);
    }
    
    function renderSearchResults(results, query) {
        resultsArea.innerHTML = '';
        if (results.length === 0) {
            resultsArea.innerHTML = `<div class="placeholder-text"><p>找不到符合條件的文件，或您的文件庫是空的。</p></div>`;
            return;
        }
        
        const highlightRegex = query ? new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi') : null;

        results.forEach(result => {
            const highlightedTitle = highlightRegex ? result.displayTitle.replace(highlightRegex, `<mark>${query}</mark>`) : result.displayTitle;
            
            const resultEl = document.createElement('div');
            resultEl.className = 'result-item';
            resultEl.dataset.title = result.fileTitle; // Use the unique stored title as key
            resultEl.innerHTML = `
                <div class="icon"><i class="fas fa-file-pdf"></i></div>
                <div class="info">
                    <h3>${highlightedTitle}</h3>
                    <p>PMID: ${result.pmid}</p>
                </div>
            `;
            resultsArea.appendChild(resultEl);
        });
    }

    function showPaperDashboard(fileTitle) {
        const file = storedFiles.find(f => f.title === fileTitle);
        if (!file) return;

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(file.xmlString, "application/xml");
        
        // Populate preview
        document.getElementById('dashboard-title').textContent = xmlDoc.querySelector('ArticleTitle')?.textContent || 'No Title';
        document.getElementById('dashboard-pmid').textContent = xmlDoc.querySelector('PMID')?.textContent || 'N/A';
        document.getElementById('dashboard-year').textContent = xmlDoc.querySelector('DateCompleted Year')?.textContent || 'N/A';
        const abstractText = xmlDoc.querySelector('AbstractText')?.textContent || 'No abstract available.';
        document.getElementById('dashboard-abstract').textContent = abstractText;
        
        // Run and display analysis
        runAndDisplayAnalysis(abstractText);

        // Show the panel
        paperDashboard.classList.add('visible');
    }

    function runAndDisplayAnalysis(text) {
        document.getElementById('stat-word-count').textContent = (text.trim().split(/\s+/).filter(w => w)).length;
        document.getElementById('stat-char-spaces').textContent = text.length;
        document.getElementById('stat-char-no-spaces').textContent = text.replace(/\s/g, '').length;
        document.getElementById('stat-sentence-count').textContent = (text.split(/[.!?]+/).filter(s => s.trim())).length;
        document.getElementById('stat-non-ascii-char').textContent = (text.match(/[^\x00-\x7F]/g) || []).length;
        document.getElementById('stat-non-ascii-word').textContent = (text.match(/\b\w*[^\x00-\x7F]+\w*\b/g) || []).length;
    }

    // --- START THE APP ---
    init();
});