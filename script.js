document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('haiku-container');

    // Fetch the haikus data with cache busting
    fetch(`haikus.json?v=${Date.now()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Sort by date descending (newest first)
            data.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Render each haiku
            data.forEach((haiku, index) => {
                const card = createHaikuCard(haiku, index);
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error fetching haikus:', error);
            container.innerHTML = '<p style="text-align:center; color: #a0a0a0;">Unable to load thoughts...</p>';
        });

    function createHaikuCard(haiku, index) {
        const article = document.createElement('article');
        article.className = 'haiku-card';
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

        article.appendChild(dateEl);
        article.appendChild(textDiv);

        return article;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
});
