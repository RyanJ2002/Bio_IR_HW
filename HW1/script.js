document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let storedFiles = []; // Array of { title, xmlString }

    const startYearInput = document.getElementById('start-year');
    const endYearInput = document.getElementById('end-year');
    // --- DOM ELEMENT SELECTORS ---
    const sidebar = document.querySelector('.sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const viewLibraryBtn = document.getElementById('view-library-btn');
    const importPaperBtn = document.getElementById('import-paper-btn');
    const mainSearchInput = document.getElementById('main-search-input');
    const resultsArea = document.getElementById('search-results-area');
    const fullscreenDashboardBtn = document.getElementById('fullscreen-dashboard-btn');
    const dashboardAbstract = document.getElementById('dashboard-abstract');
    const libraryModal = document.getElementById('library-modal');
    const closeLibraryModalBtn = document.getElementById('close-library-modal-btn');
    const libraryTableBody = document.getElementById('library-table-body');
    const sortSelect = document.getElementById('sort-select');
    const sortDirectionBtn = document.getElementById('sort-direction-btn');
    const sortDirectionIcon = document.getElementById('sort-direction-icon');
    
    // Modal elements
    const importModal = document.getElementById('import-modal');
    const closeImportModalBtn = document.getElementById('close-import-modal-btn');
    const xmlUpload = document.getElementById('xml-upload');

    // Dashboard elements
    const paperDashboard = document.getElementById('paper-dashboard');
    const closeDashboardBtn = document.getElementById('close-dashboard-btn');

    // At the top of your script.js, near the other DOM selectors, add these new ones:
    const keywordStatDiv = document.querySelector('.keyword-stat');
    const activeKeywordDisplay = document.getElementById('active-keyword-display');
    const statKeywordCount = document.getElementById('stat-keyword-count');

    const resultsHeader = document.getElementById('results-header');
    const resultsSortSelect = document.getElementById('results-sort-select');
    const resultsSortDirectionBtn = document.getElementById('results-sort-direction-btn');
    const resultsSortDirectionIcon = document.getElementById('results-sort-direction-icon');

    const mainSortControls = document.getElementById('main-sort-controls');
    const mainSortSelect = document.getElementById('main-sort-select');
    const mainSortDirectionBtn = document.getElementById('main-sort-direction-btn');
    const mainSortDirectionIcon = document.getElementById('main-sort-direction-icon');
    const homeSortSelect = document.getElementById('home-sort-select');
    // --- INITIALIZATION ---
    let originalAbstractText = '';
    function init() {
        loadFilesFromStorage();
        setupEventListeners();
    }

    // --- EVENT LISTENERS SETUP ---
    function setupEventListeners() {
        startYearInput.addEventListener('input', () => performGlobalSearch(mainSearchInput.value));
        endYearInput.addEventListener('input', () => performGlobalSearch(mainSearchInput.value));
        toggleSidebarBtn.addEventListener('click', () => sidebar.classList.toggle('hidden'));
        
        importPaperBtn.addEventListener('click', () => importModal.classList.remove('hidden'));
        closeImportModalBtn.addEventListener('click', () => importModal.classList.add('hidden'));

        viewLibraryBtn.addEventListener('click', () => {
            libraryModal.classList.remove('hidden');
            renderLibraryModal(); // Call the new render function
        });

        mainSearchInput.addEventListener('keyup', (e) => {
            // Debounce search to avoid too many calls
            clearTimeout(mainSearchInput.timer);
            mainSearchInput.timer = setTimeout(() => {
                performGlobalSearch(e.target.value);
            }, 300);
        });

        xmlUpload.addEventListener('change', handleFileUpload);
        window.addEventListener('storage', handlePubMedImport);
        homeSortSelect.addEventListener('change', () => performGlobalSearch(mainSearchInput.value));
        // Event delegation for clicking on a search result
        resultsArea.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.result-item');
            const deleteBtn = e.target.closest('.delete-btn');

            if (deleteBtn) {
                // If the delete button (or its icon) was clicked
                e.stopPropagation(); // Prevent the dashboard from opening
                const title = deleteBtn.dataset.title;
                handleDeleteFile(title);
            } else if (resultItem) {
                // If any other part of the result item was clicked
                const title = resultItem.dataset.title;
                showPaperDashboard(title);
            }
        });
        
        closeDashboardBtn.addEventListener('click', () => paperDashboard.classList.remove('visible'));
        fullscreenDashboardBtn.addEventListener('click', toggleDashboardFullscreen)
        closeLibraryModalBtn.addEventListener('click', () => libraryModal.classList.add('hidden'));
        sortSelect.addEventListener('change', renderLibraryModal);
        sortDirectionBtn.addEventListener('click', toggleSortDirection);

        resultsSortSelect.addEventListener('change', () => performGlobalSearch(mainSearchInput.value));
        resultsSortDirectionBtn.addEventListener('click', () => {
            // Toggle direction logic, similar to the library modal
            const currentDirection = resultsSortDirectionBtn.dataset.sortDirection;
            const newDirection = currentDirection === 'desc' ? 'asc' : 'desc';
            resultsSortDirectionBtn.dataset.sortDirection = newDirection;

            // Update icon
            if (newDirection === 'desc') {
                resultsSortDirectionIcon.className = 'fas fa-arrow-down-wide-short';
            } else {
                resultsSortDirectionIcon.className = 'fas fa-arrow-up-wide-short';
            }
            performGlobalSearch(mainSearchInput.value);
        });

        mainSortSelect.addEventListener('change', () => performGlobalSearch(mainSearchInput.value));
        mainSortDirectionBtn.addEventListener('click', () => {
            // We can reuse the same toggle logic, but for the main page button
            const currentDirection = mainSortDirectionBtn.dataset.sortDirection;
            const newDirection = currentDirection === 'desc' ? 'asc' : 'desc';
            mainSortDirectionBtn.dataset.sortDirection = newDirection;

            // Update the icon
            if (newDirection === 'desc') {
                mainSortDirectionIcon.className = 'fas fa-arrow-down-wide-short';
            } else {
                mainSortDirectionIcon.className = 'fas fa-arrow-up-wide-short';
            }
            performGlobalSearch(mainSearchInput.value); // Re-run search/sort
        });
    }
    

    
    function renderLibraryModal() {
        const currentQuery = mainSearchInput.value.trim().toLowerCase();
        const sortBy = sortSelect.value;
        const sortDirection = sortDirectionBtn.dataset.sortDirection;

        // 1. Pre-computation: Create an enriched array with all necessary data
        const enrichedFiles = storedFiles.map(file => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(file.xmlString, "application/xml");
            const abstract = xmlDoc.querySelector('AbstractText')?.textContent || '';
            
            let keywordCount = 0;
            if (currentQuery) {
                const regex = new RegExp('\\b' + currentQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'gi');
                const matches = abstract.match(regex);
                keywordCount = matches ? matches.length : 0;
            }

            return {
                storageTitle: file.title,
                displayTitle: getTitleFromXmlDoc(xmlDoc),
                year: getYearFromXmlDoc(xmlDoc) || 0, // Default to 0 for sorting
                pmid: getPmidFromXmlDoc(xmlDoc),
                keywordCount: keywordCount
            };
        });

        // 2. Sorting Logic
        enrichedFiles.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'year':
                    comparison = b.year - a.year; // Descending by default
                    break;
                case 'keyword_count':
                    comparison = b.keywordCount - a.keywordCount; // Descending by default
                    break;
                case 'title':
                default:
                    comparison = a.displayTitle.localeCompare(b.displayTitle); // Ascending for text
                    break;
            }
            // Apply direction (reverse if ascending for numeric sorts, or descending for text)
            if (sortDirection === 'asc') {
                if (sortBy === 'title') return comparison;
                return comparison * -1;
            }
            if (sortDirection === 'desc' && sortBy === 'title') {
                return comparison * -1;
            }
            return comparison;
        });

        // 3. Rendering
        libraryTableBody.innerHTML = ''; // Clear previous results
        if (enrichedFiles.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4" style="text-align: center;">您的文件庫是空的。</td>`;
            libraryTableBody.appendChild(row);
            return;
        }

        enrichedFiles.forEach(file => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${file.displayTitle}</td>
                <td>${file.year || 'N/A'}</td>
                <td>${file.pmid}</td>
                <td style="text-align: center;">${file.keywordCount}</td>
            `;
            libraryTableBody.appendChild(row);
        });
    }
    // Find your existing handleDeleteFile function and replace it with this entire block.
// If you don't have this function yet, add it anywhere in your script.js.

/**
 * Handles the deletion of a specific file from storage and refreshes the UI.
 * @param {string} fileTitle - The unique title of the file to delete.
 */
    function handleDeleteFile(fileTitle) {
        // Step 0: Confirm with the user to prevent accidental deletion.
        if (!confirm(`您確定要刪除文件 "${fileTitle}" 嗎？此操作無法復原。`)) {
            return; // If user clicks "Cancel", stop the function.
        }

        // Step 1: Find the index of the file to remove from our in-memory array.
        const fileIndex = storedFiles.findIndex(file => file.title === fileTitle);

        // Check if the file was actually found.
        if (fileIndex > -1) {
            // Step 2: Remove the file from the `storedFiles` array using splice.
            storedFiles.splice(fileIndex, 1);
            
            // Step 3: CRITICAL - Update localStorage to persist the change.
            // If you miss this step, the file will reappear on page reload.
            localStorage.setItem('biomedXmlFiles', JSON.stringify(storedFiles));
            
            // Step 4: CRITICAL - Refresh the current view to show the file is gone.
            // The easiest way is to re-run the search with the current query.
            performGlobalSearch(mainSearchInput.value);
            
            // Bonus: If the dashboard for the deleted file is open, close it.
            const dashboardTitle = document.getElementById('dashboard-title').textContent;
            // Check if the open file's title is part of the deleted file's storage title (e.g., "PMID: 12345").
            if (paperDashboard.classList.contains('visible') && fileTitle.includes(dashboardTitle)) {
                paperDashboard.classList.remove('visible');
            }

            console.log(`Successfully deleted file: ${fileTitle}`);
            // You could add a more user-friendly notification here if you wanted.

        } else {
            // This is an edge case, but good for debugging.
            console.error(`Error: Could not find file to delete with title: ${fileTitle}`);
            alert("刪除時發生錯誤，找不到該文件。");
        }
    }

    function getTitleFromXmlDoc(xmlDoc) {
        let title = null;
        // 1. Primary check for PubMed standard
        const articleTitle = xmlDoc.querySelector('ArticleTitle');
        // 2. Fallback check for a generic <title> tag
        const genericTitle = xmlDoc.querySelector('title');

        if (articleTitle) {
            title = articleTitle.textContent;
        } else if (genericTitle) {
            title = genericTitle.textContent;
        }
        return title || 'No Title Found';
    }

    function getPmidFromXmlDoc(xmlDoc) {
        const pmidElement = xmlDoc.querySelector('PMID');
        return pmidElement ? pmidElement.textContent : 'N/A';
    }

    function getYearFromXmlDoc(xmlDoc) {
        let year = null;
        const pubDateYear = xmlDoc.querySelector('PubDate > Year');
        const completedDateYear = xmlDoc.querySelector('DateCompleted > Year');
        const medlineDate = xmlDoc.querySelector('MedlineDate');

        if (pubDateYear) year = pubDateYear.textContent;
        else if (completedDateYear) year = completedDateYear.textContent;
        else if (medlineDate) {
            const match = medlineDate.textContent.match(/\d{4}/);
            if (match) year = match[0];
        }
        return year ? parseInt(year, 10) : null; // Return as a number
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const xmlString = e.target.result;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlString, "application/xml");

                // --- NEW: Immediately parse and create a meaningful title ---
                const pmid = getPmidFromXmlDoc(xmlDoc);
                const abstract = getPlainTextAbstractFromXmlDoc(xmlDoc);

                let storageTitle;
                if (pmid !== 'N/A') {
                    storageTitle = `PMID: ${pmid}`;
                } else if (articleTitle !== 'No Title Found') {
                    // Use a truncated title if no PMID is available
                    storageTitle = articleTitle.substring(0, 40) + '...';
                } else {
                    // Fallback to the original filename
                    storageTitle = file.name;
                }

                if (saveFileToStorage(storageTitle, xmlString)) {
                    alert(`成功匯入文件: "${articleTitle}"`);
                    importModal.classList.add('hidden');
                    performGlobalSearch(''); // Refresh the library view
                }
            };
            reader.readAsText(file);
        }
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
      const startYear = parseInt(startYearInput.value, 10) || 1900;
      const endYear = parseInt(endYearInput.value, 10) || 2100;
      const sortBy = homeSortSelect.value;

      let searchResults = [];
      storedFiles.forEach(file => {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(file.xmlString, "application/xml");

          const paperYear = getYearFromXmlDoc(xmlDoc);
          if (paperYear && (paperYear < startYear || paperYear > endYear)) {
              return; 
          }

          const title = getTitleFromXmlDoc(xmlDoc);
          const pmid = getPmidFromXmlDoc(xmlDoc);
          
          // THIS IS THE FIX: Use the reliable helper function.
          const abstract = getPlainTextAbstractFromXmlDoc(xmlDoc);

          const content = `${title} ${abstract}`.toLowerCase();
          
          if (lowerCaseQuery === '' || content.includes(lowerCaseQuery)) {
              let keywordCount = 0;
              if (lowerCaseQuery) {
                  // This count is now guaranteed to be on the FULL abstract.
                  const regex = new RegExp('\\b' + lowerCaseQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'gi');
                  const matches = content.match(regex);
                  keywordCount = matches ? matches.length : 0;
              }
              searchResults.push({
                  storageTitle: file.title,
                  displayTitle: title,
                  pmid: pmid,
                  year: paperYear,
                  keywordCount: keywordCount
              });
          }
      });

      if (sortBy !== 'relevance') {
          searchResults.sort((a, b) => {
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
            resultEl.dataset.title = result.storageTitle; // This is how we open the dashboard
            resultEl.innerHTML = `
                <div class="icon"><i class="fas fa-file-pdf"></i></div>
                <div class="info">
                    <h3>${highlightedTitle}</h3>
                    <p>PMID: ${result.pmid}</p>
                </div>
                <div class="stats">
                    <div class="stat-item">
                        <span class="label">年份</span>
                        <span class="value">${result.year || 'N/A'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">搜尋詞筆數</span>
                        <span class="value">${result.keywordCount}</span>
                    </div>
                </div>
                <button class="delete-btn" data-title="${result.storageTitle}" title="Delete this file">
                  <i class="fas fa-trash-alt"></i>
                </button>
            `;
            resultsArea.appendChild(resultEl);
        });
    }

// Replace your existing showPaperDashboard function with this one.
    function getPlainTextAbstractFromXmlDoc(xmlDoc) {
        const abstractSections = xmlDoc.querySelectorAll('Abstract > AbstractText');
        if (abstractSections.length > 0) {
            // Map over all sections, get their textContent, and join them with newlines.
            return Array.from(abstractSections).map(section => section.textContent).join('\n\n');
        }
        // Return an empty string if no abstract is found.
        return '';
    }

    function showPaperDashboard(fileTitle) {
        const file = storedFiles.find(f => f.title === fileTitle);
        if (!file) return;

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(file.xmlString, "application/xml");
        
        // --- 1. Get all necessary data pieces ---
        const title = getTitleFromXmlDoc(xmlDoc);
        const pmid = getPmidFromXmlDoc(xmlDoc);
        const year = getYearFromXmlDoc(xmlDoc);
        const plainTextAbstract = getPlainTextAbstractFromXmlDoc(xmlDoc) || 'No abstract available.';
        originalAbstractText = plainTextAbstract; // For the hover feature
        
        // Update the main display elements
        document.getElementById('dashboard-title').textContent = title;
        document.getElementById('dashboard-pmid').textContent = pmid;
        document.getElementById('dashboard-year').textContent = year ? year : 'N/A';
        
        // Build the HTML version of the abstract for display
        const abstractSections = xmlDoc.querySelectorAll('Abstract > AbstractText');
        const htmlAbstract = Array.from(abstractSections).map(section => {
            const label = section.getAttribute('Label');
            const text = section.textContent;
            return label ? `<strong>${label}</strong><br>${text}` : text;
        }).join('<br><br>') || 'No abstract available.';
        
        // --- 2. Perform and Display All Analysis ---
        const currentQuery = mainSearchInput.value.trim().toLowerCase();
        
        // A) Keyword Count (calculated on title + abstract) - THIS IS THE FIX
        if (currentQuery) {
            const contentForKeywords = `${title} ${plainTextAbstract}`.toLowerCase();
            const regex = new RegExp('\\b' + currentQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'gi');
            const matches = contentForKeywords.match(regex);
            const count = matches ? matches.length : 0;
            
            // Update the UI directly from here
            activeKeywordDisplay.textContent = `"${currentQuery}"`;
            statKeywordCount.textContent = count;
            keywordStatDiv.style.display = 'block';
        } else {
            keywordStatDiv.style.display = 'none';
        }

        // B) Abstract-Specific Stats (calculated on abstract only)
        analyzeAbstractText(plainTextAbstract); // Call our newly refactored function

        // --- 3. Render the abstract with highlighting ---
        const dashboardAbstract = document.getElementById('dashboard-abstract');
        if (currentQuery) {
            const highlightRegex = new RegExp(currentQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
            dashboardAbstract.innerHTML = htmlAbstract.replace(highlightRegex, `<mark>${currentQuery}</mark>`);
        } else {
            dashboardAbstract.innerHTML = htmlAbstract;
        }

        // --- 4. Show the panel ---
        paperDashboard.classList.add('visible');
        paperDashboard.classList.remove('fullscreen');
        updateFullscreenIcon(false);
    }
      
      function toggleDashboardFullscreen() {
          const isFullscreen = paperDashboard.classList.toggle('fullscreen');
          updateFullscreenIcon(isFullscreen);

          // This is where we will activate/deactivate the hover feature
          if (isFullscreen) {
              activateInteractiveText();
          } else {
              deactivateInteractiveText();
          }
      }

      function updateFullscreenIcon(isFullscreen) {
          const icon = fullscreenDashboardBtn.querySelector('i');
          if (isFullscreen) {
              icon.classList.remove('fa-expand');
              icon.classList.add('fa-compress');
          } else {
              icon.classList.remove('fa-compress');
              icon.classList.add('fa-expand');
          }
      }

    // Replace your old function with this one.

    function analyzeAbstractText(text) {
        // --- STEP 1: PRE-NORMALIZATION ANALYSIS ---
        // Perform calculations that need the original, untouched text.

        // A) Calculate non-ASCII characters on the ORIGINAL text.
        // This ensures we correctly count characters like the non-breaking space.
        const nonAsciiChars = text.match(/[^\x00-\x7F]/g) || [];
        document.getElementById('stat-non-ascii-char').textContent = nonAsciiChars.length;

        // --- STEP 2: FULL TEXT NORMALIZATION ---
        // Create a clean version of the text for all other analyses.
        const normalizedText = text
            .replace(/[\r\n]+/g, ' ')      // Replace newlines with regular spaces
            .replace(/\u00A0/g, ' ')      // CRITICAL: Replace non-breaking spaces with regular spaces
            .trim();

        // --- STEP 3: POST-NORMALIZATION ANALYSIS ---
        // Perform all remaining calculations on the fully cleaned `normalizedText`.

        // Word Count
        document.getElementById('stat-word-count').textContent = (normalizedText.split(/\s+/).filter(w => w)).length;
        
        // Character Counts
        document.getElementById('stat-char-spaces').textContent = normalizedText.length;
        document.getElementById('stat-char-no-spaces').textContent = normalizedText.replace(/\s/g, '').length;
        
        // Sentence Count
        const sentences = normalizedText.match(/[^.!?]+[.!?]+(\s*)?(?=(\s[A-Z0-9"('])|($))/g);
        const sentenceCount = sentences ? sentences.length : (normalizedText.length > 0 ? 1 : 0);
        document.getElementById('stat-sentence-count').textContent = sentenceCount;
        
        // Non-ASCII Word Count (this is now fixed)
        // This regex will now only find words with non-ASCII letters/symbols, not whitespace.
        const nonAsciiWords = normalizedText.match(/\b\w*[^\x00-\x7F]+\w*\b/g) || [];
        document.getElementById('stat-non-ascii-word').textContent = nonAsciiWords.length;

        // Console log for debugging (will now show an empty array for the '80 years' case)
        if (nonAsciiWords.length > 0) {
            console.log("--- Found Non-ASCII Words (After Cleaning): ---");
            console.log(nonAsciiWords);
            console.log("-------------------------------------------");
        }
    }

    

    // --- START THE APP ---
    init();
});

