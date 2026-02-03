document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('haiku-container');
    const searchInput = document.getElementById('search-input');
    const searchContainer = document.getElementById('search-container');
    let allHaikus = [];

    // CONFIGURATION:
    // 1. Create a Google Sheet with two columns: "Date" and "Haiku Text"
    // 2. File > Share > Publish to web > Link > Select "Comma-separated values (.csv)"
    // 3. Paste the generated link below.
    // CONFIGURATION:
    // 1. Create a Google Sheet with two columns: "Date" and "Haiku Text"
    // 2. File > Share > Publish to web > Link > Select "Comma-separated values (.csv)"
    // 3. Paste the generated link below.
    const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ26-iFafG1X7_0AYeCsq9msriAmC3IMkEyXzAb32bBQgTm49IpPZkhu9OVJp_Ak0-29qhn5_o2dWQE/pub?output=csv';

    // Fallback to local JSON if no URL is provided yet, or fetch from sheet if available
    const dataSource = GOOGLE_SHEET_CSV_URL.includes('YOUR_GOOGLE_SHEET_CSV_URL_HERE')
        ? 'haikus.json'
        : GOOGLE_SHEET_CSV_URL;

    console.log(`Fetching from: ${dataSource}`);

    fetch(dataSource)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text(); // fetch as text first
        })
        .then(text => {
            let data;
            if (dataSource.endsWith('.json')) {
                data = JSON.parse(text);
            } else {
                data = parseCSV(text);
            }

            // Sort by date descending (newest first)
            data.sort((a, b) => new Date(b.date) - new Date(a.date));

            allHaikus = data;

            // Clear loading indicator
            container.innerHTML = '';

            // Show search container after data loads
            searchContainer.style.display = 'block';

            // Render each haiku
            renderHaikus(allHaikus);

            // Handle URL parameters for highlighting/scrolling to specific haiku
            handleUrlParams();

            // Add search event listener
            searchInput.addEventListener('input', handleSearch);
        })
        .catch(error => {
            console.error('Error fetching haikus:', error);
            container.innerHTML = `
            <div style="text-align: center; color: #a0a0a0;">
                <p>Unable to load thoughts...</p>
                <small>${error.message}</small>
            </div>
        `;
        });

    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase().trim();

        if (searchTerm === '') {
            renderHaikus(allHaikus);
        } else {
            const filtered = allHaikus.filter(haiku => {
                const dateMatch = haiku.date.toLowerCase().includes(searchTerm);
                const textMatch = haiku.text.some(line => line.toLowerCase().includes(searchTerm));
                return dateMatch || textMatch;
            });
            renderHaikus(filtered);
        }
    }

    function renderHaikus(haikus) {
        container.innerHTML = '';
        if (haikus.length === 0) {
            container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #a0a0a0; padding: 2rem;">No haikus found.</div>';
            return;
        }

        haikus.forEach((haiku, index) => {
            const card = createHaikuCard(haiku, index, allHaikus.indexOf(haiku));
            container.appendChild(card);
        });
    }

    function parseCSV(csvText) {
        const rows = [];
        let currentRow = [];
        let currentCell = '';
        let inQuotes = false;

        // Normalize line endings
        const text = csvText.replace(/\r\n/g, '\n');

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (inQuotes) {
                if (char === '"') {
                    if (nextChar === '"') {
                        currentCell += '"'; // Handle escaped quotes
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    currentCell += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    currentRow.push(currentCell.trim());
                    currentCell = '';
                } else if (char === '\n') {
                    currentRow.push(currentCell.trim());
                    if (currentRow.length >= 2) { // Ensure we have at least Date and Text
                        // Skip header row if it contains "Haiku Text" or "Date"
                        const isHeader = currentRow[0].toLowerCase().includes('date') &&
                            currentRow[1].toLowerCase().includes('text');

                        if (!isHeader && currentRow[0] && currentRow[1]) {
                            rows.push({
                                date: currentRow[0],
                                // Split text by newlines to match existing format
                                text: currentRow[1].split('\n').map(line => line.trim()).filter(l => l)
                            });
                        }
                    }
                    currentRow = [];
                    currentCell = '';
                } else {
                    currentCell += char;
                }
            }
        }

        // Handle last row if no newline at EOF
        if (currentCell || currentRow.length > 0) {
            currentRow.push(currentCell.trim());
            if (currentRow.length >= 2 && currentRow[0] && currentRow[1]) {
                rows.push({
                    date: currentRow[0],
                    text: currentRow[1].split('\n').map(line => line.trim()).filter(l => l)
                });
            }
        }

        return rows;
    }

    function createHaikuCard(haiku, index, globalIndex) {
        const article = document.createElement('article');
        article.className = 'haiku-card';
        article.id = `haiku-${globalIndex}`;
        // Add staggered animation delay
        article.style.animationDelay = `${index * 0.1}s`;

        const dateEl = document.createElement('time');
        dateEl.className = 'haiku-date';
        dateEl.textContent = formatDate(haiku.date);
        dateEl.dateTime = haiku.date;

        const textDiv = document.createElement('div');
        textDiv.className = 'haiku-text';

        haiku.text.forEach(line => {
            const lineSpan = document.createElement('span');
            lineSpan.className = 'haiku-line';
            lineSpan.textContent = line;
            textDiv.appendChild(lineSpan);
        });

        // Create share button
        const shareBtn = document.createElement('button');
        shareBtn.className = 'share-btn';
        shareBtn.setAttribute('aria-label', 'Copy share link');
        shareBtn.innerHTML = '🔗';
        shareBtn.title = 'Copy share link';
        shareBtn.addEventListener('click', () => copyShareLink(globalIndex, shareBtn));

        const cardFooter = document.createElement('div');
        cardFooter.className = 'card-footer';
        cardFooter.appendChild(shareBtn);

        article.appendChild(dateEl);
        article.appendChild(textDiv);
        article.appendChild(cardFooter);

        return article;
    }

    function copyShareLink(index, button) {
        const url = `${window.location.origin}${window.location.pathname}?haiku=${index}`;
        navigator.clipboard.writeText(url).then(() => {
            const originalText = button.innerHTML;
            button.innerHTML = '✓';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 2000);
        }).catch(() => {
            alert('Failed to copy link');
        });
    }

    function handleUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const haikuIndex = params.get('haiku');

        if (haikuIndex !== null) {
            const haikuElement = document.getElementById(`haiku-${haikuIndex}`);
            if (haikuElement) {
                haikuElement.classList.add('highlighted');
                haikuElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        // Put check here just in case invalid date
        if (isNaN(date.getTime())) return dateString;

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
});
