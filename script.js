document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('haiku-container');
    const searchInput = document.getElementById('search-input');
    const searchContainer = document.getElementById('search-container');
    let allHaikus = [];
    let currentHaiku = null;

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

    // Animate loading dots
    let dotCount = 1;
    const loadingDotsInterval = setInterval(() => {
        const dotsElement = document.querySelector('.loading-dots');
        if (dotsElement) {
            dotCount = dotCount === 3 ? 1 : dotCount + 1;
            dotsElement.textContent = '.'.repeat(dotCount);
        }
    }, 400);

    fetch(dataSource)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text();
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

            // Generate stable IDs for each haiku
            allHaikus = data.map(haiku => ({
                ...haiku,
                id: generateHaikuId(haiku)
            }));

            // Clear loading interval and indicator
            clearInterval(loadingDotsInterval);
            container.innerHTML = '';

            // Show search container after data loads
            searchContainer.style.display = 'block';

            // Render each haiku
            renderHaikus(allHaikus);

            // Add search event listener
            searchInput.addEventListener('input', handleSearch);

            // Handle URL parameters for highlighting/scrolling to specific haiku
            setTimeout(() => handleUrlParams(), 100);

            // Handle browser back/forward buttons
            window.addEventListener('popstate', () => {
                handleUrlParams();
            });
        })
        .catch(error => {
            console.error('Error fetching haikus:', error);
            clearInterval(loadingDotsInterval);
            container.innerHTML = `
            <div style="text-align: center; color: #a0a0a0;">
                <p>Unable to load haikus...</p>
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
            const card = createHaikuCard(haiku, index);
            container.appendChild(card);
        });
    }

    function parseCSV(csvText) {
        const rows = [];
        let currentRow = [];
        let currentCell = '';
        let inQuotes = false;

        const text = csvText.replace(/\r\n/g, '\n');

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (inQuotes) {
                if (char === '"') {
                    if (nextChar === '"') {
                        currentCell += '"';
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
                    if (currentRow.length >= 2) {
                        const isHeader = currentRow[0].toLowerCase().includes('date') &&
                            currentRow[1].toLowerCase().includes('text');

                        if (!isHeader && currentRow[0] && currentRow[1]) {
                            rows.push({
                                date: currentRow[0],
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

    function createHaikuCard(haiku, index) {
        const article = document.createElement('article');
        article.className = 'haiku-card';
        article.id = `haiku-${haiku.id}`;
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

        const shareBtn = document.createElement('button');
        shareBtn.className = 'share-btn';
        shareBtn.setAttribute('aria-label', 'Copy share link');
        shareBtn.innerHTML = '✦ Share';
        shareBtn.title = 'Copy share link';
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyShareLink(haiku.id, shareBtn);
        });

        const cardFooter = document.createElement('div');
        cardFooter.className = 'card-footer';
        cardFooter.appendChild(shareBtn);

        article.appendChild(dateEl);
        article.appendChild(textDiv);
        article.appendChild(cardFooter);

        article.addEventListener('click', () => openShareModal(haiku.id));

        return article;
    }

    function copyShareLink(id, button) {
        const url = `${window.location.origin}${window.location.pathname}?haiku=${id}`;

        window.history.pushState({ haikuId: id }, '', url);

        navigator.clipboard.writeText(url).then(() => {
            const originalText = button.innerHTML;
            button.innerHTML = '✓';

            document.querySelectorAll('.haiku-card.highlighted').forEach(card => {
                card.classList.remove('highlighted');
            });

            const haikuElement = document.getElementById(`haiku-${id}`);
            if (haikuElement) {
                haikuElement.classList.add('highlighted');
                haikuElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            setTimeout(() => {
                button.innerHTML = originalText;
            }, 2000);
        }).catch(() => {
            alert('Failed to copy link');
        });
    }

    function openShareModal(id) {
        const haiku = allHaikus.find(h => h.id === id);
        if (haiku) {
            currentHaiku = haiku;
            document.getElementById('modal-haiku-text').innerHTML = 
                haiku.text.map(line => `<span class="modal-haiku-line">${line}</span>`).join('');
            
            const modal = document.getElementById('share-modal');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            document.querySelectorAll('.haiku-card.highlighted').forEach(card => {
                card.classList.remove('highlighted');
            });
            const haikuElement = document.getElementById(`haiku-${id}`);
            if (haikuElement) {
                haikuElement.classList.add('highlighted');
            }
        }
    }

    function closeModal() {
        document.getElementById('share-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
        currentHaiku = null;
    }

    function copyToClipboard() {
        if (currentHaiku) {
            const text = currentHaiku.text.join('\n');
            navigator.clipboard.writeText(text).then(() => {
                alert('Haiku copied to clipboard!');
            });
        }
    }

    function shareHaiku() {
        if (currentHaiku) {
            const url = `${window.location.origin}${window.location.pathname}?haiku=${currentHaiku.id}`;

            window.history.pushState({ haikuId: currentHaiku.id }, '', url);

            navigator.clipboard.writeText(url).then(() => {
                alert('Share link copied to clipboard!');
                closeModal();
            }).catch(() => {
                alert('Failed to copy link');
            });
        }
    }

    function handleUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const haikuId = params.get('haiku');

        if (haikuId) {
            document.querySelectorAll('.haiku-card.highlighted').forEach(card => {
                card.classList.remove('highlighted');
            });

            const haikuElement = document.getElementById(`haiku-${haikuId}`);
            if (haikuElement) {
                haikuElement.classList.add('highlighted');
                setTimeout(() => {
                    haikuElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 200);
            }
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function generateHaikuId(haiku) {
        const content = haiku.date + haiku.text.join('');

        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        return Math.abs(hash).toString(36).padStart(8, '0').substring(0, 8);
    }

    // Expose modal functions globally
    window.closeModal = closeModal;
    window.copyToClipboard = copyToClipboard;
    window.shareHaiku = shareHaiku;

    // Modal event listeners
    document.getElementById('share-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('share-modal')) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});
