var stemmer = (function(){var a="aeiou",b={ational:"ate",tional:"tion",enci:"ence",anci:"ance",izer:"ize",bli:"ble",alli:"al",entli:"ent",eli:"e",ousli:"ous",ization:"ize",ation:"ate",ator:"ate",alism:"al",iveness:"ive",fulness:"ful",ousness:"ous",aliti:"al",iviti:"ive",biliti:"ble",logi:"log"},c={icate:"ic",ative:"",alize:"al",iciti:"ic",ical:"ic",ful:"",ness:""},d={al:!0,ance:!0,ence:!0,er:!0,ic:!0,able:!0,ible:!0,ant:!0,ement:!0,ment:!0,ent:!0,ou:!0,ism:!0,ate:!0,iti:!0,ous:!0,ive:!0,ize:!0},e={ion:!0},f="s",g="s",h="eed",i="ed",j="ing",k=/^(.+?)(ss|i)es$/,l=/^(.+?)([^s])s$/,m=/^(.+?)eed$/,n=/^(.+?)(ed|ing)$/,o=/(at|bl|iz)$/,p=new RegExp("^([^"+a+"][^aeiouy]*)"),q=new RegExp("([^"+a+"][aeiouy][^"+a+"][^aeiouy]*)$"),r=/ll$/,s=/^(s|t)$/,t=new RegExp("([^"+a+"][aeiouy][^"+a+"][^aeiouy]*[aeiouy][^"+a+"])$"),u=function(b){var c,e,f,g,i,j,k,l,o;if(3>b.length)return b;c=b.substr(0,1);"y"==c&&(b=c.toUpperCase()+b.substr(1));g=/([aeiouy])y/g;b=b.replace(g,"$1Y");i=/(ss|i)es$/;j=/s$/;i.test(b)?b=b.replace(i,"$1"):(j.test(b)&&(f=b.substr(0,b.length-2),e=b.substr(b.length-1),l=p,o=l.exec(f),"s"!=e||"s"==f.substr(f.length-1)?b=b.replace(j,""):o&&o[0].length==f.length&&1==b.length?b=b:""));return b};return function(p){var v,w,x,y,z,A,B,C,D;if(3>p.length)return p;if("y"==p.substr(0,1)&&(p="Y"+p.substr(1)),k.test(p)?p=p.replace(k,"$1$2"):l.test(p)&&(p=p.replace(l,"$1$2")),m.test(p)){x=m.exec(p),v=x[1];z=q;z.test(v)&&(p=v+h.substr(1))}else if(n.test(p)){x=n.exec(p),v=x[1],w=x[2],z=/(.[aeiouy])/,z.test(v)&&(p=v,A=q,B=t,o.test(p)?p+="e":(r.test(p)?p=p.substr(0,p.length-1):s.test(p)&&A.test(p)&&!B.test(p)&&(p=p.substr(0,p.length-1))))}y=p.length;z=/[aeiouy].*y$/,z.test(p)&&y>2&&(p=p.substr(0,y-1)+"i");y=p.length;A=/ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi$/;if(A.test(p)){x=A.exec(p),v=x[0],z=q,z.test(p.substr(0,p.length-v.length))&&(p=p.substr(0,p.length-v.length)+b[v])}B=/icate|ative|alize|iciti|ical|ful|ness$/;if(B.test(p)){x=B.exec(p),v=x[0],z=q,z.test(p.substr(0,p.length-v.length))&&(p=p.substr(0,p.length-v.length)+c[v])}C=/al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize$/;D=/ion$/;if(C.test(p)){x=C.exec(p),v=x[0],z=q,z.test(p.substr(0,p.length-v.length))&&(p=p.substr(0,p.length-v.length))}else if(D.test(p)){x=D.exec(p),v=x[0],z=q,B=t,w=p.substr(0,p.length-v.length),B.test(w)&&e[v]&&("s"==w.substr(w.length-1)||"t"==w.substr(w.length-1))&&(p=w)}y=p.length,z=/e$/,z.test(p)&&y>2&&(w=p.substr(0,y-1),A=q,B=t,C=p.substr(y-2,1),(A.test(w)&&!B.test(w)||"c"!=C&&"g"!=C&&A.test(w)&&B.test(w))&&w.length>1)&&(p=w),z=/ll$/,A=q,z.test(p)&&A.test(p)&&(p=p.substr(0,p.length-1));"Y"==p.substr(0,1)&&(p="y"+p.substr(1));return p}})();
let tsneChartInstances = {};
let pcaChartInstances = {}; 

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let storedFiles = []; // Array of { title, xmlString }
    let currentSearchResults = [];
    let zipfChartInstance = null;
    let zipfAnalysisText = '';
    let zipfResults = {};

    // --- LEVENSHTEIN DISTANCE FUNCTION FOR TOLERANT SEARCH ---
    function levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
        for (let i = 0; i <= a.length; i++) { matrix[0][i] = i; }
        for (let j = 0; j <= b.length; j++) { matrix[j][0] = j; }
        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,        // deletion
                    matrix[j - 1][i] + 1,        // insertion
                    matrix[j - 1][i - 1] + indicator, // substitution
                );
            }
        }
        return matrix[b.length][a.length];
    }

    // --- DOM ELEMENT SELECTORS ---
    const algorithmSelect = document.getElementById('algorithm-select'); // NEW
    const toggleOriginalZipf = document.getElementById('toggle-original-zipf'); // NEW
    const togglePorterZipf = document.getElementById('toggle-porter-zipf'); // NEW
    const zipfTotalWordsOriginal = document.getElementById('zipf-total-words-original');
    const zipfUniqueTermsOriginal = document.getElementById('zipf-unique-terms-original');
    const zipfTotalWordsPorter = document.getElementById('zipf-total-words-porter');
    const zipfUniqueTermsPorter = document.getElementById('zipf-unique-terms-porter');
    const startYearInput = document.getElementById('start-year');
    const endYearInput = document.getElementById('end-year');
    const toleranceSelect = document.getElementById('tolerance-select'); // New tolerance control
    const viewLibraryBtn = document.getElementById('view-library-btn');
    const importPaperBtn = document.getElementById('import-paper-btn');
    const mainSearchInput = document.getElementById('main-search-input');
    const resultsArea = document.getElementById('search-results-area');
    const fullscreenDashboardBtn = document.getElementById('fullscreen-dashboard-btn');
    const libraryModal = document.getElementById('library-modal');
    const closeLibraryModalBtn = document.getElementById('close-library-modal-btn');
    const libraryTableBody = document.getElementById('library-table-body');
    const sortSelect = document.getElementById('sort-select');
    const sortDirectionBtn = document.getElementById('sort-direction-btn');
    const sortDirectionIcon = document.getElementById('sort-direction-icon');
    const homeSortSelect = document.getElementById('home-sort-select');
    const importModal = document.getElementById('import-modal');
    const closeImportModalBtn = document.getElementById('close-import-modal-btn');
    const xmlUpload = document.getElementById('xml-upload');
    const paperDashboard = document.getElementById('paper-dashboard');
    const closeDashboardBtn = document.getElementById('close-dashboard-btn');
    const keywordStatDiv = document.querySelector('.keyword-stat');
    const activeKeywordDisplay = document.getElementById('active-keyword-display');
    const statKeywordCount = document.getElementById('stat-keyword-count');
    const libraryCountSpan = document.getElementById('library-count');
    const analyzeBtn = document.getElementById('analyze-btn');
    const zipfTableBody = document.getElementById('zipf-table-body');
    const zipfTotalWords = document.getElementById('zipf-total-words');
    const zipfUniqueTerms = document.getElementById('zipf-unique-terms');
    const zipfChartCanvas = document.getElementById('zipf-chart');
    const exportChartBtn = document.getElementById('export-chart-btn');
    const exportTableBtn = document.getElementById('export-table-btn');
    const zipfModalTitle = document.querySelector('#zipf-modal h2');
    const zipfAnalyzedFilesCount = document.getElementById('zipf-analyzed-files-count');
    const analysisModal = document.getElementById('analysis-modal');
    const closeAnalysisModalBtn = document.getElementById('close-analysis-modal-btn');
    const analysisModalTitle = document.getElementById('analysis-modal-title');
    
    // HW3 ======
    const showZipfBtn = document.getElementById('show-zipf-btn');
    const showSimilarityBtn = document.getElementById('show-similarity-btn');
    const zipfViewContainer = document.getElementById('zipf-view-container');
    const similarityViewContainer = document.getElementById('similarity-view-container');
    const modelSelect = document.getElementById('model-select');
    const getSimilarityBtn = document.getElementById('get-similarity-btn');
    const similarityResultsArea = document.getElementById('similarity-results-area');
    const showTsneBtn = document.getElementById('show-tsne-btn');
    const tsneViewContainer = document.getElementById('tsne-view-container');
    const tsneGrid = document.getElementById('tsne-grid');
    const showPcaBtn = document.getElementById('show-pca-btn');
    const pcaViewContainer = document.getElementById('pca-view-container');
    const pcaGrid = document.getElementById('pca-grid');
    // ======

    // --- INITIALIZATION ---
    function init() {
        loadFilesFromStorage();
        setupEventListeners();
    }

    // --- EVENT LISTENERS SETUP ---
    function setupEventListeners() {
        // Main page search controls
        if (algorithmSelect) {
            algorithmSelect.addEventListener('change', () => performGlobalSearch(mainSearchInput.value));
        }
        startYearInput.addEventListener('input', () => performGlobalSearch(mainSearchInput.value));
        endYearInput.addEventListener('input', () => performGlobalSearch(mainSearchInput.value));
        toleranceSelect.addEventListener('change', () => performGlobalSearch(mainSearchInput.value));
        homeSortSelect.addEventListener('change', () => performGlobalSearch(mainSearchInput.value));

        // Main search input with delayed search
        mainSearchInput.addEventListener('keyup', (e) => {
            clearTimeout(mainSearchInput.timer);
            if (e.key === 'Enter') {
                performGlobalSearch(e.target.value);
            } else {
                mainSearchInput.timer = setTimeout(() => {
                    performGlobalSearch(e.target.value);
                }, 300);
            }
        });

        // Modal and button controls
        importPaperBtn.addEventListener('click', () => importModal.classList.remove('hidden'));
        closeImportModalBtn.addEventListener('click', () => importModal.classList.add('hidden'));

        viewLibraryBtn.addEventListener('click', () => {
            libraryModal.classList.remove('hidden');
            renderLibraryModal();
        });
        closeLibraryModalBtn.addEventListener('click', () => libraryModal.classList.add('hidden'));
        
        closeDashboardBtn.addEventListener('click', () => paperDashboard.classList.remove('visible'));
        fullscreenDashboardBtn.addEventListener('click', toggleDashboardFullscreen);
        
        // HW3 ======
        analyzeBtn.addEventListener('click', handleAnalyzeClick);
        closeAnalysisModalBtn.addEventListener('click', () => analysisModal.classList.add('hidden'));

        showZipfBtn.addEventListener('click', () => switchAnalysisView('zipf'));
        showSimilarityBtn.addEventListener('click', () => switchAnalysisView('similarity'));
        showTsneBtn.addEventListener('click', () => switchAnalysisView('tsne'));
        showPcaBtn.addEventListener('click', () => switchAnalysisView('pca'));
        // ======

        // File handling
        xmlUpload.addEventListener('change', handleFileUpload);
        window.addEventListener('storage', handlePubMedImport);

        // Click handlers for dynamically created content
        resultsArea.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.result-item');
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                e.stopPropagation();
                handleDeleteFile(deleteBtn.dataset.title);
            } else if (resultItem) {
                showPaperDashboard(resultItem.dataset.title);
            }
        });

        libraryTableBody.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-btn-library');
            if (deleteBtn) {
                e.stopPropagation();
                const title = deleteBtn.dataset.title;
                handleDeleteFile(title);
            }
        });
        
        // Library sorting controls
        sortSelect.addEventListener('change', renderLibraryModal);
        sortDirectionBtn.addEventListener('click', toggleSortDirection);

        // --- CORRECTED ZIPF CHECKBOX LISTENERS ---
        
        // Listener for the "Original" checkbox
        toggleOriginalZipf.addEventListener('change', () => {
            if (!zipfChartInstance) return;
            // CORRECT: This now ONLY affects the first dataset (index 0)
            zipfChartInstance.data.datasets[0].hidden = !toggleOriginalZipf.checked;
            zipfChartInstance.update();
        });

        // Listener for the "Porter" checkbox
        togglePorterZipf.addEventListener('change', () => {
            if (!zipfChartInstance) return;
            // CORRECT: This now ONLY affects the second dataset (index 1)
            zipfChartInstance.data.datasets[1].hidden = !togglePorterZipf.checked;
            zipfChartInstance.update();
        });

        // ADD THESE LINES
        exportChartBtn.addEventListener('click', exportChartAsPNG);
        exportTableBtn.addEventListener('click', exportTableAsCSV);
    }
    
    // --- HELPER & PARSING FUNCTIONS ---
    function getTitleFromXmlDoc(xmlDoc) { return xmlDoc.querySelector('ArticleTitle, title')?.textContent || 'No Title Found'; }
    function getPmidFromXmlDoc(xmlDoc) { return xmlDoc.querySelector('PMID')?.textContent || 'N/A'; }
    function getYearFromXmlDoc(xmlDoc) {
        const yearNode = xmlDoc.querySelector('PubDate > Year, DateCompleted > Year');
        if (yearNode) return parseInt(yearNode.textContent, 10);
        const medlineDate = xmlDoc.querySelector('MedlineDate')?.textContent;
        if (medlineDate) return parseInt(medlineDate.match(/\d{4}/)?.[0], 10) || null;
        return null;
    }
    function getAuthorsFromXmlDoc(xmlDoc) {
        const authorNodes = xmlDoc.querySelectorAll('AuthorList > Author');
        if (authorNodes.length === 0) return 'No Authors Listed';
        
        let authors = Array.from(authorNodes).map(author => {
            const lastName = author.querySelector('LastName')?.textContent || '';
            const initials = author.querySelector('Initials')?.textContent || '';
            return `${lastName} ${initials}`.trim();
        });

        if (authors.length > 3) {
            return `${authors.slice(0, 3).join(', ')}, et al.`;
        }
        return authors.join(', ');
    }

    function getPubDateFromXmlDoc(xmlDoc) {
        const year = xmlDoc.querySelector('PubDate > Year')?.textContent;
        const month = xmlDoc.querySelector('PubDate > Month')?.textContent;
        const day = xmlDoc.querySelector('PubDate > Day')?.textContent;

        if (year && month && day) {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const monthIndex = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
            const monthNumber = monthIndex > -1 ? (monthIndex + 1).toString().padStart(2, '0') : month;
            return `${year}-${monthNumber}-${day.padStart(2, '0')}`;
        }
        return year || 'N/A';
    }

    function getPlainTextAbstractFromXmlDoc(xmlDoc) {
        const sections = xmlDoc.querySelectorAll('Abstract > AbstractText');
        return Array.from(sections).map(s => s.textContent).join('\n\n');
    }

    function processText(text, algorithm) {
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        if (algorithm === 'porter') {
            return words.map(word => stemmer(word));
        }
        return words;
    }

    // --- CORE FUNCTIONALITY ---
    function performGlobalSearch(query) {
        const lowerCaseQuery = query.trim().toLowerCase();
        const startYear = parseInt(startYearInput.value, 10) || 1900;
        const endYear = parseInt(endYearInput.value, 10) || 2100;
        const tolerance = parseInt(toleranceSelect.value, 10);
        const sortBy = homeSortSelect.value;
        const algorithm = algorithmSelect ? algorithmSelect.value : 'original';
        
        currentSearchResults = [];

        if (storedFiles.length === 0) {
            renderSearchResults([], '');
            return;
        }

        storedFiles.forEach(file => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(file.xmlString, "application/xml");
            const paperYear = getYearFromXmlDoc(xmlDoc);

            if (paperYear && (paperYear < startYear || paperYear > endYear)) return;

            const title = getTitleFromXmlDoc(xmlDoc);
            const abstract = getPlainTextAbstractFromXmlDoc(xmlDoc);
            const content = `${title} ${abstract}`;
            
            let isMatch = false;
            let keywordCount = 0;
            const matchedWords = new Set();
            const processedQuery = algorithm === 'porter' ? stemmer(lowerCaseQuery) : lowerCaseQuery;

            if (lowerCaseQuery === '') {
                isMatch = true; // Show all files if search is empty
            } else {
                // CORRECTED LOGIC:
                // 1. Process the entire document's content first
                const contentWords = processText(content, 'original'); // Use original words for matching
                const uniqueContentWords = [...new Set(contentWords)];
                
                // 2. Find all words in the document that are a match
                for (const word of uniqueContentWords) {
                    const processedWord = algorithm === 'porter' ? stemmer(word) : word;
                    if (levenshteinDistance(processedWord, processedQuery) <= tolerance) {
                        // Add the ORIGINAL word from the text to our set for highlighting
                        matchedWords.add(word);
                    }
                }
                
                // 3. If we found any matches, update the state
                if (matchedWords.size > 0) {
                    isMatch = true;
                    // 4. Count all occurrences of all matched variations
                    const matchRegex = new RegExp(`\\b(${Array.from(matchedWords).join('|')})\\b`, 'gi');
                    keywordCount = (content.match(matchRegex) || []).length;
                }
            }

            if (isMatch) {
                currentSearchResults.push({
                    storageTitle: file.title,
                    displayTitle: title,
                    pmid: getPmidFromXmlDoc(xmlDoc),
                    year: paperYear,
                    keywordCount: keywordCount,
                    // Pass the complete set of matched words for highlighting
                    matchedWords: Array.from(matchedWords), 
                    authors: getAuthorsFromXmlDoc(xmlDoc),
                    pubDate: getPubDateFromXmlDoc(xmlDoc)
                });
            }
        });

        // Sorting logic remains the same...
        if (sortBy === 'relevance' && lowerCaseQuery !== '') {
            currentSearchResults.sort((a, b) => b.keywordCount - a.keywordCount);
        } else {
            currentSearchResults.sort((a, b) => {
                switch (sortBy) {
                    case 'title_asc': return a.displayTitle.localeCompare(b.displayTitle);
                    case 'title_desc': return b.displayTitle.localeCompare(a.displayTitle);
                    case 'year_desc': return (b.year || 0) - (a.year || 0);
                    case 'year_asc': return (a.year || 0) - (b.year || 0);
                    case 'keyword_desc': return b.keywordCount - a.keywordCount;
                    default: return 0;
                }
            });
        }

        renderSearchResults(currentSearchResults, lowerCaseQuery);
        analyzeBtn.classList.toggle('hidden', currentSearchResults.length === 0 || lowerCaseQuery === '');
    }

    function renderSearchResults(results, query) {
        resultsArea.innerHTML = '';
        if (results.length === 0) {
            resultsArea.innerHTML = `<div class="placeholder-text"><p>找不到符合條件的文件，或您的文件庫是空的。</p></div>`;
            return;
        }
        results.forEach(result => {
            let highlightedTitle = result.displayTitle;
            if (query && result.matchedWords.length > 0) {
                const highlightRegex = new RegExp(`\\b(${result.matchedWords.join('|')})\\b`, 'gi');
                highlightedTitle = result.displayTitle.replace(highlightRegex, `<mark>$&</mark>`);
            }
            const resultEl = document.createElement('div');
            resultEl.className = 'result-item';
            resultEl.dataset.title = result.storageTitle;
            resultEl.innerHTML = `
                <div class="icon"><i class="fas fa-file-pdf"></i></div>
                <div class="info">
                    <h3>${highlightedTitle}</h3>
                    <p class="meta-line">
                        <i class="fas fa-users"></i>
                        <strong>Authors:</strong> ${result.authors}
                    </p>
                    <p class="meta-line">
                        <i class="fas fa-calendar-alt"></i>
                        <strong>Date:</strong> ${result.pubDate} | <strong>PMID:</strong> ${result.pmid}
                    </p>
                </div>
                <div class="stats">
                    <div class="stat-item"><span class="label">年份</span><span class="value">${result.year || 'N/A'}</span></div>
                    <div class="stat-item"><span class="label">搜尋詞筆數</span><span class="value">${result.keywordCount}</span></div>
                </div>
                <button class="delete-btn" data-title="${result.storageTitle}" title="Delete this file"><i class="fas fa-trash-alt"></i></button>
            `;
            resultsArea.appendChild(resultEl);
        });
    }
    
    // --- BUG FIX: Function to render the library modal is restored ---
    function renderLibraryModal() {
        libraryCountSpan.textContent = storedFiles.length;
        const currentQuery = mainSearchInput.value.trim().toLowerCase();
        const tolerance = parseInt(toleranceSelect.value, 10);
        const sortBy = sortSelect.value;
        const sortDirection = sortDirectionBtn.dataset.sortDirection;

        const enrichedFiles = storedFiles.map(file => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(file.xmlString, "application/xml");
            const title = getTitleFromXmlDoc(xmlDoc);
            const abstract = getPlainTextAbstractFromXmlDoc(xmlDoc);
            const content = `${title} ${abstract}`;
            let keywordCount = 0;

            if (currentQuery) {
                const contentWords = [...new Set(content.toLowerCase().match(/\b\w+\b/g) || [])];
                const matchedWords = new Set();
                for (const word of contentWords) {
                    if (levenshteinDistance(word, currentQuery) <= tolerance) {
                        matchedWords.add(word);
                    }
                }
                if (matchedWords.size > 0) {
                    const matchRegex = new RegExp(`\\b(${Array.from(matchedWords).join('|')})\\b`, 'gi');
                    keywordCount = (content.match(matchRegex) || []).length;
                }
            }

            return {
                storageTitle: file.title,
                displayTitle: title,
                year: getYearFromXmlDoc(xmlDoc) || 0,
                pmid: getPmidFromXmlDoc(xmlDoc),
                keywordCount: keywordCount
            };
        });

        enrichedFiles.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'year': comparison = b.year - a.year; break;
                case 'keyword_count': comparison = b.keywordCount - a.keywordCount; break;
                default: comparison = a.displayTitle.localeCompare(b.displayTitle); break;
            }
            if (sortDirection === 'asc') return comparison * (sortBy === 'title' ? 1 : -1);
            if (sortDirection === 'desc' && sortBy === 'title') return comparison * -1;
            return comparison;
        });

        libraryTableBody.innerHTML = '';
        if (enrichedFiles.length === 0) {
            libraryTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">您的文件庫是空的。</td></tr>`;
            return;
        }

        enrichedFiles.forEach(file => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${file.displayTitle}</td>
                <td>${file.year || 'N/A'}</td>
                <td>${file.pmid}</td>
                <td style="text-align: center;">${file.keywordCount}</td>
                <td style="text-align: center;">
                    <button class="delete-btn-library" data-title="${file.storageTitle}" title="Delete this file">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            libraryTableBody.appendChild(row);
        });
    }
    
    function toggleSortDirection() {
        const newDirection = this.dataset.sortDirection === 'desc' ? 'asc' : 'desc';
        this.dataset.sortDirection = newDirection;
        sortDirectionIcon.className = newDirection === 'desc' ? 'fas fa-arrow-down-wide-short' : 'fas fa-arrow-up-wide-short';
        renderLibraryModal();
    }

    function showPaperDashboard(fileTitle) {
        const file = storedFiles.find(f => f.title === fileTitle);
        if (!file) return;

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(file.xmlString, "application/xml");
        
        const title = getTitleFromXmlDoc(xmlDoc);
        const plainTextAbstract = getPlainTextAbstractFromXmlDoc(xmlDoc);
        
        document.getElementById('dashboard-title').textContent = title;
        document.getElementById('dashboard-pmid').textContent = getPmidFromXmlDoc(xmlDoc);
        document.getElementById('dashboard-year').textContent = getYearFromXmlDoc(xmlDoc) || 'N/A';
        
        const abstractSections = xmlDoc.querySelectorAll('Abstract > AbstractText');
        const htmlAbstract = Array.from(abstractSections).map(section => {
            const label = section.getAttribute('Label');
            return label ? `<strong>${label}</strong><br>${section.textContent}` : section.textContent;
        }).join('<br><br>') || 'No abstract available.';
        
        const currentQuery = mainSearchInput.value.trim().toLowerCase();
        const tolerance = parseInt(toleranceSelect.value, 10);
        
        if (currentQuery) {
            const contentForKeywords = `${title} ${plainTextAbstract}`.toLowerCase();
            const contentWords = [...new Set(contentForKeywords.match(/\b\w+\b/g) || [])];
            const matchedWords = new Set();
            for (const word of contentWords) {
                if (levenshteinDistance(word, currentQuery) <= tolerance) {
                    matchedWords.add(word);
                }
            }
            
            let count = 0;
            const dashboardAbstractEl = document.getElementById('dashboard-abstract');
            if (matchedWords.size > 0) {
                const matchRegex = new RegExp(`\\b(${Array.from(matchedWords).join('|')})\\b`, 'gi');
                count = (contentForKeywords.match(matchRegex) || []).length;
                dashboardAbstractEl.innerHTML = htmlAbstract.replace(matchRegex, `<mark>$&</mark>`);
            } else {
                 dashboardAbstractEl.innerHTML = htmlAbstract;
            }
            activeKeywordDisplay.textContent = `"${currentQuery}"`;
            statKeywordCount.textContent = count;
            keywordStatDiv.style.display = 'block';
        } else {
            keywordStatDiv.style.display = 'none';
            document.getElementById('dashboard-abstract').innerHTML = htmlAbstract;
        }

        analyzeAbstractText(plainTextAbstract);
        paperDashboard.classList.add('visible');
        paperDashboard.classList.remove('fullscreen');
        updateFullscreenIcon(false);
    }
    
    // --- OTHER UNCHANGED FUNCTIONS ---
    function handleDeleteFile(fileTitle) {
        if (!confirm(`您確定要刪除文件 "${fileTitle}" 嗎？此操作無法復原。`)) return;
        const fileIndex = storedFiles.findIndex(file => file.title === fileTitle);
        if (fileIndex > -1) {
            storedFiles.splice(fileIndex, 1);
            localStorage.setItem('biomedXmlFiles', JSON.stringify(storedFiles));
            performGlobalSearch(mainSearchInput.value);
            if (paperDashboard.classList.contains('visible') && document.getElementById('dashboard-title').textContent === fileTitle) {
                paperDashboard.classList.remove('visible');
            }
        }
    }
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
            const fullXmlString = e.target.result;
            const parser = new DOMParser();
            const mainXmlDoc = parser.parseFromString(fullXmlString, "application/xml");

            // Find all <PubmedArticle> elements in the file
            const articles = mainXmlDoc.querySelectorAll('PubmedArticle');

            // --- LOGIC TO HANDLE MULTIPLE ARTICLES ---
            if (articles.length > 1) {
                let successCount = 0;
                let duplicateCount = 0;
                const serializer = new XMLSerializer();

                articles.forEach(articleNode => {
                    // Crucial step: Convert the individual article's XML node back to a string
                    const singleXmlString = serializer.serializeToString(articleNode);
                    
                    // Now, re-use the parsing logic for this single article string
                    const singleXmlDoc = parser.parseFromString(singleXmlString, "application/xml");
                    const title = getTitleFromXmlDoc(singleXmlDoc);
                    const pmid = getPmidFromXmlDoc(singleXmlDoc);
                    const storageTitle = pmid !== 'N/A' ? `PMID: ${pmid}` : title.substring(0, 40) + '...';

                    if (saveFileToStorage(storageTitle, singleXmlString)) {
                        successCount++;
                    } else {
                        duplicateCount++;
                    }
                });

                // Provide a summary feedback message for the batch import
                let alertMessage = `成功匯入 ${successCount} 份新文件。`;
                if (duplicateCount > 0) {
                    alertMessage += `\n跳過了 ${duplicateCount} 份重複文件。`;
                }
                alert(alertMessage);

            // --- ORIGINAL LOGIC for single article files ---
            } else {
                // This is the original code block for handling a single file
                const title = getTitleFromXmlDoc(mainXmlDoc);
                const pmid = getPmidFromXmlDoc(mainXmlDoc);
                const storageTitle = pmid !== 'N/A' ? `PMID: ${pmid}` : title.substring(0, 40) + '...';
                
                if (saveFileToStorage(storageTitle, fullXmlString)) {
                    alert(`成功匯入文件: "${title}"`);
                }
            }

            // Common actions for both cases: close modal and refresh view
            importModal.classList.add('hidden');
            performGlobalSearch(''); // Refresh the main search view
            event.target.value = ''; // Clear the file input for re-uploading the same file
        };
        reader.readAsText(file);
    }
    function loadFilesFromStorage() {
        storedFiles = JSON.parse(localStorage.getItem('biomedXmlFiles') || '[]');
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
    function handlePubMedImport(event) {
        // 1. Handle BATCH import
        if (event.key === 'pubmedXmlBatchToImport' && event.newValue) {
            const xmlStrings = JSON.parse(event.newValue);
            let successCount = 0;
            
            xmlStrings.forEach(xmlString => {
                const pmid = new DOMParser().parseFromString(xmlString, "application/xml").querySelector('PMID')?.textContent || `imported_${Date.now()}`;
                const title = `PMID: ${pmid}`;
                if (saveFileToStorage(title, xmlString)) {
                    successCount++;
                }
            });

            if (successCount > 0) {
                alert(`Successfully imported ${successCount} new documents.`);
                performGlobalSearch(''); // Refresh the main view
            }
            localStorage.removeItem('pubmedXmlBatchToImport');
        } 
        // 2. Handle SINGLE import (for backwards compatibility)
        else if (event.key === 'pubmedXmlToImport' && event.newValue) {
            const xmlString = event.newValue;
            const pmid = new DOMParser().parseFromString(xmlString, "application/xml").querySelector('PMID')?.textContent || `imported_${Date.now()}`;
            const title = `PMID: ${pmid}`;
            if (saveFileToStorage(title, xmlString)) {
                alert(`Successfully imported document (${title}).`);
                performGlobalSearch(''); // Refresh the main view
            }
            localStorage.removeItem('pubmedXmlToImport');
        }
    }

    function toggleDashboardFullscreen() {
        const isFullscreen = paperDashboard.classList.toggle('fullscreen');
        updateFullscreenIcon(isFullscreen);
    }
    function updateFullscreenIcon(isFullscreen) {
        fullscreenDashboardBtn.querySelector('i').className = isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
    }
    function analyzeAbstractText(text) {
        document.getElementById('stat-non-ascii-char').textContent = (text.match(/[^\x00-\x7F]/g) || []).length;
        const normalizedText = text.replace(/[\r\n\u00A0]+/g, ' ').trim();
        document.getElementById('stat-word-count').textContent = (normalizedText.match(/\b\w+\b/g) || []).length;
        document.getElementById('stat-char-spaces').textContent = normalizedText.length;
        document.getElementById('stat-char-no-spaces').textContent = normalizedText.replace(/\s/g, '').length;
        document.getElementById('stat-sentence-count').textContent = (normalizedText.match(/[^.!?]+[.!?]+/g) || []).length || (normalizedText.length > 0 ? 1 : 0);
        document.getElementById('stat-non-ascii-word').textContent = (normalizedText.match(/\b\w*[^\x00-\x7F]+\w*\b/g) || []).length;
    }

    // HW3 ======
     function handleAnalyzeClick() {
        // Run the Zipf part first, as it's the default view
        runZipfAnalysis(); 
        
        // Update modal title
        const currentQuery = mainSearchInput.value.trim();
        if (currentQuery) {
            analysisModalTitle.textContent = `Analysis for "${currentQuery}"`;
        } else {
            analysisModalTitle.textContent = 'Analysis for All Documents';
        }
        
        // Show the modal
        analysisModal.classList.remove('hidden');
        // Ensure the default view (Zipf) is active
        switchAnalysisView('zipf');
    }

    // RENAME your original handleAnalyzeClick content to a new function
    function runZipfAnalysis() {
        if (currentSearchResults.length === 0) {
            // Don't show an alert, just handle gracefully
            return;
        }

        let fullText = '';
        currentSearchResults.forEach(result => {
            const file = storedFiles.find(f => f.title === result.storageTitle);
            if (file) {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(file.xmlString, "application/xml");
                fullText += `${getTitleFromXmlDoc(xmlDoc)} ${getPlainTextAbstractFromXmlDoc(xmlDoc)} `;
            }
        });
        
        // (The rest of your original Zipf analysis logic here...)
        const originalWords = processText(fullText, 'original');
        const porterWords = processText(fullText, 'porter');
        
        const originalFreq = {};
        originalWords.forEach(word => { originalFreq[word] = (originalFreq[word] || 0) + 1; });
        
        const porterFreq = {};
        porterWords.forEach(word => { porterFreq[word] = (porterFreq[word] || 0) + 1; });

        zipfResults = {
            original: {
                data: Object.entries(originalFreq).sort((a, b) => b[1] - a[1]),
                totalWords: originalWords.length
            },
            porter: {
                data: Object.entries(porterFreq).sort((a, b) => b[1] - a[1]),
                totalWords: porterWords.length
            }
        };
        
        renderZipfDashboard();
    }
    // ======

    function renderZipfDashboard() {
        const originalData = zipfResults.original.data;
        const porterData = zipfResults.porter.data;

        // Update stats for both
        zipfTotalWordsOriginal.textContent = zipfResults.original.totalWords.toLocaleString();
        zipfUniqueTermsOriginal.textContent = originalData.length.toLocaleString();
        zipfTotalWordsPorter.textContent = zipfResults.porter.totalWords.toLocaleString();
        zipfUniqueTermsPorter.textContent = porterData.length.toLocaleString();
        zipfAnalyzedFilesCount.textContent = currentSearchResults.length.toLocaleString();

        zipfTableBody.innerHTML = '';
        const maxRows = Math.max(originalData.length, porterData.length);

        for (let i = 0; i < maxRows; i++) {
            const row = document.createElement('tr');
            
            const originalTerm = originalData[i] ? originalData[i][0] : '';
            const originalFreq = originalData[i] ? originalData[i][1].toLocaleString() : '';
            const porterTerm = porterData[i] ? porterData[i][0] : '';
            const porterFreq = porterData[i] ? porterData[i][1].toLocaleString() : '';

            row.innerHTML = `
                <td style="text-align: center;">${i + 1}</td>
                <td>${originalTerm}</td>
                <td style="text-align: center;">${originalFreq}</td>
                <td>${porterTerm}</td>
                <td style="text-align: center;">${porterFreq}</td>
            `;
            zipfTableBody.appendChild(row);
        }
        
        renderZipfChart(); // No parameters needed
    }

    function renderZipfChart() {
        if (zipfChartInstance) {
            zipfChartInstance.destroy();
        }

        const originalData = zipfResults.original.data.slice(0, 100);
        const porterData = zipfResults.porter.data.slice(0, 100);

        // STEP 1: Add the actual term to each data point object
        const chartDataPointsOriginal = originalData.map((item, index) => ({
            x: index + 1,
            y: item[1],
            term: item[0] // <-- ADD THIS LINE to include the word
        }));
        const chartDataPointsPorter = porterData.map((item, index) => ({
            x: index + 1,
            y: item[1],
            term: item[0] // <-- ADD THIS LINE to include the stem
        }));

        zipfChartInstance = new Chart(zipfChartCanvas, {
            type: 'scatter',
            data: {
                datasets: [
                    // Original Data (Blue)
                    {
                        label: 'Original Term Freq.',
                        data: chartDataPointsOriginal,
                        backgroundColor: 'rgba(0, 90, 156, 0.6)',
                        hidden: !toggleOriginalZipf.checked
                    },
                    // Porter Data (Green)
                    {
                        label: 'Porter Stemmed Freq.',
                        data: chartDataPointsPorter,
                        backgroundColor: 'rgba(40, 167, 69, 0.6)',
                        hidden: !togglePorterZipf.checked
                    }
                ]
            },
            // STEP 2: Configure the tooltip to display the term
            options: {
                scales: {
                    x: {
                        title: { display: true, text: 'Rank' }
                    },
                    y: {
                        title: { display: true, text: 'Frequency' }
                    }
                },
                // ADD THIS 'plugins' OBJECT
                plugins: {
                    tooltip: {
                        callbacks: {
                            // This customizes the title of the tooltip (e.g., "Rank: 1")
                            title: function (context) {
                                return `Rank: ${context[0].parsed.x}`;
                            },
                            // This customizes the body of the tooltip
                            label: function (context) {
                                // context.raw contains our full data object: {x, y, term}
                                const term = context.raw.term;
                                const freq = context.parsed.y;
                                return `Term: ${term} (Freq: ${freq})`;
                            }
                        }
                    }
                }
            }
        });
    }
    function exportChartAsPNG() {
        if (!zipfChartInstance) {
            alert('Chart has not been generated yet.');
            return;
        }

        const currentQuery = mainSearchInput.value.trim().replace(/\s+/g, '_') || "results";
        const fileName = `zipf_chart_${currentQuery}.png`;

        const link = document.createElement('a');
        link.href = zipfChartInstance.toBase64Image('image/png', 1.0);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function exportTableAsCSV() {
        if (!zipfResults.original || !zipfResults.porter) {
            alert('No data available to export.');
            return;
        }

        // Helper to escape commas and quotes in CSV
        const escapeCSV = (str) => {
            if (str.includes(',') || str.includes('"')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        let csvContent = "Rank,Original Term,Original Freq,Stemmed Term,Stemmed Freq\r\n";

        const originalData = zipfResults.original.data;
        const porterData = zipfResults.porter.data;
        const maxRows = Math.max(originalData.length, porterData.length);

        for (let i = 0; i < maxRows; i++) {
            const rank = i + 1;
            
            const originalTerm = originalData[i] ? escapeCSV(originalData[i][0]) : '';
            const originalFreq = originalData[i] ? originalData[i][1] : '';
            
            const porterTerm = porterData[i] ? escapeCSV(porterData[i][0]) : '';
            const porterFreq = porterData[i] ? porterData[i][1] : '';

            csvContent += `${rank},${originalTerm},${originalFreq},${porterTerm},${porterFreq}\r\n`;
        }
        
        const currentQuery = mainSearchInput.value.trim().replace(/\s+/g, '_') || "results";
        const fileName = `zipf_table_${currentQuery}.csv`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // HW3 ======
    function switchAnalysisView(viewName) {
        // Hide all views first
        zipfViewContainer.classList.add('hidden');
        similarityViewContainer.classList.add('hidden');
        tsneViewContainer.classList.add('hidden');
        pcaViewContainer.classList.add('hidden');

        // Deactivate all buttons
        showZipfBtn.classList.remove('active');
        showSimilarityBtn.classList.remove('active');
        showTsneBtn.classList.remove('active');
        showPcaBtn.classList.remove('active');

        if (viewName === 'zipf') {
            zipfViewContainer.classList.remove('hidden');
            showZipfBtn.classList.add('active');
        } else if (viewName === 'similarity') {
            similarityViewContainer.classList.remove('hidden');
            showSimilarityBtn.classList.add('active');
            fetchSimilarityDataframe(); // Trigger data fetch
        } else if (viewName === 'tsne') {
            tsneViewContainer.classList.remove('hidden');
            showTsneBtn.classList.add('active');
            fetchTsneData(); // Trigger data fetch for t-SNE
        } else if (viewName === 'pca') { // NEW
            pcaViewContainer.classList.remove('hidden');
            showPcaBtn.classList.add('active');
            fetchPcaData(); 
        }
    }

    async function fetchSimilarityDataframe() {
        const keyword = mainSearchInput.value.trim();

        if (!keyword) {
            similarityResultsArea.innerHTML = `<div class="similarity-status">Please enter a search term in the main search bar first.</div>`;
            return;
        }

        similarityResultsArea.innerHTML = `<div class="similarity-status"><i class="fas fa-spinner fa-spin"></i> Comparing models for words similar to "${keyword}"...</div>`;

        try {
            const response = await fetch(`http://127.0.0.1:5000/get-all-similarities?keyword=${encodeURIComponent(keyword)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'An unknown server error occurred.');
            }

            // Directly render the data. No caching needed.
            renderSimilarityDataframe(data);

        } catch (error) {
            console.error('Dataframe fetch error:', error);
            similarityResultsArea.innerHTML = `<div class="similarity-status"><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</div>`;
        }
    }

    function renderSimilarityDataframe(data) {
        const columns = [
            { header: 'Skip-gram (Original)', key: 'skipgram' },
            { header: 'CBOW (Original)', key: 'cbow' },
            { header: 'Skip-gram (No Stopwords)', key: 'skipgram_no_stopwords' },
            { header: 'CBOW (No Stopwords)', key: 'cbow_no_stopwords' },
            { header: 'Skip-gram (Stemmed)', key: 'skipgram_stemmed' },
            { header: 'CBOW (Stemmed)', key: 'cbow_stemmed' }
        ];

        let tableHTML = `
            <table class="library-table similarity-dataframe">
                <thead>
                    <tr>
                        <th>Rank</th>
                        ${columns.map(col => `<th>${col.header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        for (let i = 0; i < 10; i++) {
            tableHTML += `<tr><td>${i + 1}</td>`;

            columns.forEach(col => {
                const result = data[col.key] && data[col.key][i];
                
                if (result) {
                    let displayWord;
                    
                    // The new, simpler logic:
                    // If it's a stemmed result AND has original words, show them.
                    if (col.key.includes('stemmed') && result.originals && result.originals.length > 0) {
                        displayWord = `<span class="sim-word">${result.originals.join(', ')}</span>`;
                    } else {
                        // Otherwise, just show the word we got.
                        displayWord = `<span class="sim-word">${result.word}</span>`;
                    }
                    
                    tableHTML += `
                        <td>
                            ${displayWord}
                            <span class="sim-score">Score: ${result.score.toFixed(4)}</span>
                        </td>
                    `;
                } else {
                    tableHTML += `<td>N/A</td>`;
                }
            });
            tableHTML += `</tr>`;
        }

        tableHTML += `</tbody></table>`;
        similarityResultsArea.innerHTML = tableHTML;
    }

    async function fetchProjectionData(type, gridElement) {
        const keyword = mainSearchInput.value.trim();
        if (!keyword) {
            gridElement.innerHTML = `<div class="similarity-status" style="grid-column: 1 / -1;">Please enter a search term first.</div>`;
            return;
        }
        gridElement.innerHTML = `<div class="similarity-status" style="grid-column: 1 / -1;"><i class="fas fa-spinner fa-spin"></i> Calculating ${type.toUpperCase()} projections... This may take a few seconds.</div>`;
        try {
            const response = await fetch(`http://127.0.0.1:5000/get-${type}-visualization?keyword=${encodeURIComponent(keyword)}`);
            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || 'Server error'); }
            return data;
        } catch (error) {
            console.error(`${type} fetch error:`, error);
            gridElement.innerHTML = `<div class="similarity-status" style="grid-column: 1 / -1;"><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</div>`;
            return null;
        }
    }

    function renderProjectionVisualizations(data, type, gridElement, chartInstances) {
        Object.values(chartInstances).forEach(chart => chart.destroy());
        chartInstances = {};
        
        gridElement.innerHTML = `
            <div class="projection-grid-header">Original</div>
            <div class="projection-grid-header">No Stopwords</div>
            <div class="projection-grid-header">Stemmed</div>
        `;

        const modelOrder = [ { key: 'skipgram', title: 'Skip-gram' }, { key: 'skipgram_no_stopwords', title: 'Skip-gram' }, { key: 'skipgram_stemmed', title: 'Skip-gram' }, { key: 'cbow', title: 'CBOW' }, { key: 'cbow_no_stopwords', title: 'CBOW' }, { key: 'cbow_stemmed', title: 'CBOW' } ];
        
        modelOrder.forEach(modelInfo => {
            const modelData = data[modelInfo.key];
            const wrapper = document.createElement('div');
            wrapper.className = 'projection-chart-wrapper';
            wrapper.innerHTML = `<h4>${modelInfo.title}</h4><canvas id="${type}-chart-${modelInfo.key}"></canvas>`;
            gridElement.appendChild(wrapper);

            const ctx = document.getElementById(`${type}-chart-${modelInfo.key}`).getContext('2d');
            
            if (!modelData || modelData.length === 0) {
                wrapper.innerHTML += '<p class="placeholder-text">Keyword not found in this model.</p>';
                return;
            }

            const isPca = type === 'pca';
            chartInstances[modelInfo.key] = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        data: modelData,
                        pointBackgroundColor: modelData.map(p => {
                            if (p.type === 'keyword') return 'rgba(217, 83, 79, 1)';     // Red
                            if (p.type === 'similar') return 'rgba(0, 90, 156, 0.9)';   // Blue
                            return 'rgba(200, 200, 200, 0.5)'; // Gray for sample
                        }),
                        pointRadius: modelData.map(p => {
                            if (p.type === 'keyword') return 8;
                            if (p.type === 'similar') return 5;
                            return 3;
                        }),
                        pointBorderColor: 'rgba(255, 255, 255, 0.5)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: function(context) { return context.raw.label; } } }
                    },
                    scales: {
                        // For PCA, show axes; for t-SNE, hide them.
                        x: { display: isPca, title: isPca ? { display: true, text: 'PC1' } : {} },
                        y: { display: isPca, title: isPca ? { display: true, text: 'PC2' } : {} }
                    }
                }
            });
        });
    }

    async function fetchTsneData() {
        const data = await fetchProjectionData('tsne', tsneGrid);
        if (data) {
            renderProjectionVisualizations(data, 'tsne', tsneGrid, tsneChartInstances);
        }
    }

    async function fetchPcaData() {
        const data = await fetchProjectionData('pca', pcaGrid);
        if (data) {
            renderProjectionVisualizations(data, 'pca', pcaGrid, pcaChartInstances);
        }
    }
    // ======

    // --- START THE APP ---
    init();
});

