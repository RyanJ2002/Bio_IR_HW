document.addEventListener('DOMContentLoaded', () => {

    // --- 頁面導航邏輯 ---
    const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
    const projectPages = document.querySelectorAll('.project-page');
    const sidebarItems = document.querySelectorAll('.sidebar ul li');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');

            projectPages.forEach(page => page.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            sidebarItems.forEach(item => item.classList.remove('active'));
            link.parentElement.classList.add('active');
        });
    });

    // --- HW #1: 功能實作 ---
    
    // 獲取 Project 1 的所有 DOM 元素
    const textInput = document.getElementById('text-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const xmlUpload = document.getElementById('xml-upload');
    const downloadSampleBtn = document.getElementById('download-sample');
    const fileNameSpan = document.getElementById('file-name');
    const searchQueryInput = document.getElementById('search-query');
    const yearFilterInput = document.getElementById('year-filter');
    const searchBtn = document.getElementById('search-btn');
    const xmlContentDisplay = document.getElementById('xml-content-display');
    const searchResultsContainer = document.getElementById('search-results-container');

    let parsedXmlDoc = null; // 用來儲存解析後的 XML 文件

    // 1. 文件字數統計功能
    analyzeBtn.addEventListener('click', () => {
        const text = textInput.value;
        
        // Keywords / Words: 依據空白字元分割
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        document.getElementById('word-count').textContent = words.length;

        // Characters (including spaces)
        document.getElementById('char-count-spaces').textContent = text.length;
        
        // Characters (excluding spaces)
        document.getElementById('char-count-no-spaces').textContent = text.replace(/\s/g, '').length;

        // Sentences: 依據句點、問號、驚嘆號分割
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        document.getElementById('sentence-count').textContent = sentences.length;

        // Non-ASCII characters
        const nonAsciiChars = text.match(/[^\x00-\x7F]/g) || [];
        document.getElementById('non-ascii-char-count').textContent = nonAsciiChars.length;

        // Non-ASCII words (包含至少一個非ASCII字元的詞)
        const nonAsciiWords = text.match(/\b\w*[^\x00-\x7F]+\w*\b/g) || [];
        document.getElementById('non-ascii-word-count').textContent = nonAsciiWords.length;
    });

    // 2. 上傳 XML 功能
    xmlUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            fileNameSpan.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                const xmlString = e.target.result;
                xmlContentDisplay.textContent = xmlString; // 顯示原始XML

                // 使用 DOMParser 解析 XML
                const parser = new DOMParser();
                parsedXmlDoc = parser.parseFromString(xmlString, "application/xml");
                alert('XML 檔案已成功上傳並解析！');
            };
            reader.readAsText(file);
        }
    });

    // 2. 下載範例 XML 功能
    downloadSampleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const sampleXml = `
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation Status="MEDLINE" Owner="NLM">
      <PMID Version="1">12345678</PMID>
      <DateCompleted>
        <Year>2022</Year><Month>01</Month><Day>10</Day>
      </DateCompleted>
      <Article PubModel="Print">
        <Journal>
          <Title>Journal of Biomedical Informatics</Title>
        </Journal>
        <ArticleTitle>A novel method for gene expression analysis using deep learning.</ArticleTitle>
        <Abstract>
          <AbstractText>This study presents a groundbreaking deep learning model for analyzing gene expression data. We show that our method outperforms traditional statistical approaches in identifying significant biomarkers for cancer diagnosis.</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
  <PubmedArticle>
    <MedlineCitation Status="MEDLINE" Owner="NLM">
      <PMID Version="1">87654321</PMID>
      <DateCompleted>
        <Year>2023</Year><Month>05</Month><Day>20</Day>
      </DateCompleted>
      <Article PubModel="Print">
        <Journal>
          <Title>Nature Medicine</Title>
        </Journal>
        <ArticleTitle>CRISPR-based therapies for genetic disorders: A review.</ArticleTitle>
        <Abstract>
          <AbstractText>Recent advancements in CRISPR technology have opened new avenues for treating genetic diseases. This review discusses the challenges and opportunities of gene editing therapies. The safety of these methods is paramount.</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;
        const blob = new Blob([sampleXml.trim()], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_pubmed.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // 3 & 4. 搜尋功能 (含過濾)
    searchBtn.addEventListener('click', () => {
        if (!parsedXmlDoc) {
            alert('請先上傳一個 XML 檔案！');
            return;
        }

        const query = searchQueryInput.value.trim().toLowerCase();
        const yearFilter = yearFilterInput.value.trim();
        
        if (!query) {
            alert('請輸入搜尋關鍵字！');
            return;
        }

        searchResultsContainer.innerHTML = ''; // 清空上次結果
        let resultsFound = 0;

        const articles = parsedXmlDoc.querySelectorAll('PubmedArticle');

        articles.forEach(article => {
            const titleElement = article.querySelector('ArticleTitle');
            const abstractElement = article.querySelector('AbstractText');
            const yearElement = article.querySelector('DateCompleted Year');
            
            const title = titleElement ? titleElement.textContent : '';
            const abstract = abstractElement ? abstractElement.textContent : '';
            const year = yearElement ? yearElement.textContent : '';
            const pmid = article.querySelector('PMID') ? article.querySelector('PMID').textContent : 'N/A';
            
            // 4. 搜尋選項：年份過濾
            if (yearFilter && year !== yearFilter) {
                return; // 如果年份不符，跳過此篇文章
            }
            
            const fullText = `${title} ${abstract}`.toLowerCase();

            // 3. 搜尋功能：關鍵字比對
            if (fullText.includes(query)) {
                resultsFound++;
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';

                // 高亮關鍵字
                const highlightRegex = new RegExp(query, 'gi');
                const highlightedTitle = title.replace(highlightRegex, `<mark>${query}</mark>`);
                const highlightedAbstract = abstract.replace(highlightRegex, `<mark>${query}</mark>`);

                resultItem.innerHTML = `
                    <h4>${highlightedTitle}</h4>
                    <p><strong>PMID:</strong> ${pmid} | <strong>Year:</strong> ${year}</p>
                    <p>${highlightedAbstract}</p>
                `;
                searchResultsContainer.appendChild(resultItem);
            }
        });

        if (resultsFound === 0) {
            searchResultsContainer.innerHTML = '<p>找不到符合條件的結果。</p>';
        }
    });

    // 5. 視覺化呈現：Tab 切換功能
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetTab = link.getAttribute('data-tab');

            tabLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');

            tabContents.forEach(content => {
                if (content.id === targetTab) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
});

// script.js

document.addEventListener('DOMContentLoaded', () => {

    // ... (all your existing JS code) ...

    // --- NEW: PubMed Live Search Functionality ---

    const pubmedSearchTerm = document.getElementById('pubmed-search-term');
    const pubmedSearchBtn = document.getElementById('pubmed-search-btn');
    const pubmedResultsContainer = document.getElementById('pubmed-results-container');
    const BACKEND_URL = 'http://127.0.0.1:5000'; // The address of your Python server

    // Function to fetch XML and load it into the application
    function loadXmlIntoApp(pmid) {
        alert(`正在從 PubMed 載入 PMID: ${pmid} 的 XML 資料...`);
        fetch(`${BACKEND_URL}/fetch?pmid=${pmid}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(xmlText => {
                // Update the XML viewer
                xmlContentDisplay.textContent = xmlText;

                // Parse the new XML for searching
                const parser = new DOMParser();
                parsedXmlDoc = parser.parseFromString(xmlText, "application/xml");

                // Update the file name display
                fileNameSpan.textContent = `PMID_${pmid}.xml (loaded from PubMed)`;
                
                alert(`PMID: ${pmid} 的 XML 已成功載入！您現在可以對其進行搜尋。`);

                // Optional: Automatically switch to the XML content tab
                document.querySelector('.tab-link[data-tab="xml-content-tab"]').click();
            })
            .catch(error => {
                console.error('Error fetching XML:', error);
                alert(`載入 XML 失敗: ${error.message}`);
            });
    }

    // Event listener for the PubMed search button
    pubmedSearchBtn.addEventListener('click', () => {
        const term = pubmedSearchTerm.value.trim();
        if (!term) {
            alert('請輸入 PubMed 搜尋關鍵字！');
            return;
        }

        // Show a loading indicator
        pubmedResultsContainer.innerHTML = '<div class="loading-spinner"></div>';

        fetch(`${BACKEND_URL}/search?term=${encodeURIComponent(term)}`)
            .then(response => response.json())
            .then(data => {
                pubmedResultsContainer.innerHTML = ''; // Clear loading spinner
                if (data.error) {
                    throw new Error(data.error);
                }
                if (data.length === 0) {
                    pubmedResultsContainer.innerHTML = '<p>找不到相關文章。</p>';
                    return;
                }

                // Display each result
                data.forEach(article => {
                    const item = document.createElement('div');
                    item.className = 'pubmed-result-item';
                    item.innerHTML = `
                        <div class="info">
                            <p>${article.title}</p>
                            <a href="${article.url}" target="_blank">PMID: ${article.pmid} (在 PubMed 上查看)</a>
                        </div>
                        <div class="actions">
                            <button class="load-xml-btn" data-pmid="${article.pmid}">載入此 XML</button>
                        </div>
                    `;
                    pubmedResultsContainer.appendChild(item);
                });

                // Add event listeners to the new "Load XML" buttons
                document.querySelectorAll('.load-xml-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const pmid = e.target.getAttribute('data-pmid');
                        loadXmlIntoApp(pmid);
                    });
                });
            })
            .catch(error => {
                console.error('Error searching PubMed:', error);
                pubmedResultsContainer.innerHTML = `<p style="color: red;">搜尋失敗: ${error.message}</p>`;
            });
    });

}); // End of DOMContentLoaded