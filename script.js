document.addEventListener('DOMContentLoaded', () => {
    const lessonDisplay = document.getElementById('lesson-display');
    const week1Link = document.getElementById('week1-link');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const sidebar = document.querySelector('.sidebar');

    async function loadLesson(weekNumber) {
        try {
            const response = await fetch(`lessons/Svenska_for_semestern_vecka_1.md`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            displayLesson(text);
        } catch (error) {
            console.error('Error loading lesson:', error);
            lessonDisplay.innerHTML = `<p>Failed to load lesson for Week ${weekNumber}. Please try again later.</p>`;
        }
    }

    function displayLesson(markdownContent) {
        let htmlContent = markdownContent;

        // Process pronunciation links before markdown conversion
        // The structure is:
        // * **English:** `Swedish`
        //   * Pronunciation Link: `URL`
        
        const lines = htmlContent.split('\n');
        const processedLines = [];
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i];
            
            // Check if next line is a pronunciation link
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                const pronunciationMatch = nextLine.match(/^\s+\*\s*Pronunciation Link:\s*`[^`]+`/);
                
                if (pronunciationMatch) {
                    // Extract Swedish word from current line
                    const swedishMatch = line.match(/`([^`]+)`\s*$/);
                    if (swedishMatch) {
                        const swedishWord = swedishMatch[1];
                        // Add the button placeholder to the current line
                        processedLines.push(line + ` <button class="pronunciation-button" data-text-to-speak="${swedishWord}" aria-label="Play pronunciation for ${swedishWord}"><span class="material-icons">volume_up</span></button>`);
                        i += 2; // Skip both current and pronunciation link line
                        continue;
                    }
                }
            }
            
            processedLines.push(line);
            i++;
        }
        
        htmlContent = processedLines.join('\n');

        // Markdown to HTML Conversion
        // Process block-level elements first

        // Horizontal rules
        htmlContent = htmlContent.replace(/^-{3,}\s*$/gm, '<hr>');

        // Headings
        htmlContent = htmlContent.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        htmlContent = htmlContent.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        htmlContent = htmlContent.replace(/^# (.*$)/gm, '<h1>$1</h1>');

        // Bold text
        htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Inline code (process before lists to ensure backticks are handled)
        htmlContent = htmlContent.replace(/`(.*?)`/g, '<code>$1</code>');

        // Basic list item conversion (handle leading whitespace for nested lists)
        // This will convert each line starting with * into an <li>
        htmlContent = htmlContent.replace(/^(\s*)\*\s*(.*$)/gm, '$1<li>$2</li>');

        // Wrap consecutive <li> tags in <ul> tags
        // This regex looks for one or more <li> tags (possibly with whitespace between them)
        // and wraps them in <ul>. The 's' flag makes '.' match newlines.
        htmlContent = htmlContent.replace(/((?:\s*<li>.*?<\/li>\s*)+)/gs, '<ul>$1</ul>');

        // Paragraphs and line breaks
        // Replace multiple newlines with paragraph tags. This needs to be done carefully
        // to not break existing block-level elements (like headings, lists, hr).
        // This is a very simplified approach. A full Markdown parser would build an AST.
        htmlContent = htmlContent.split('\n\n').map(paragraph => {
            // Only wrap if it's not already a block element
            if (!paragraph.trim().startsWith('<h') &&
                !paragraph.trim().startsWith('<ul') &&
                !paragraph.trim().startsWith('<hr')) {
                return `<p>${paragraph.trim()}</p>`;
            }
            return paragraph;
        }).join('\n\n');

        // Replace single newlines with <br> within paragraphs (if not already handled by list/heading)
        // This should be done after block-level parsing.
        htmlContent = htmlContent.replace(/\n/g, '<br>');


        // Update the main display with the processed HTML
        lessonDisplay.innerHTML = htmlContent;

        // Add event listeners to the new buttons
        lessonDisplay.querySelectorAll('.pronunciation-button').forEach(button => {
            button.addEventListener('click', () => {
                const textToSpeak = button.dataset.textToSpeak;
                if (textToSpeak) {
                    if ('speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance(textToSpeak);
                        utterance.lang = 'sv-SE'; // Set language to Swedish
                        speechSynthesis.speak(utterance);
                    } else {
                        console.warn('Web Speech API not supported in this browser.');
                        alert('Your browser does not support the Web Speech API for pronunciation.');
                    }
                }
            });
        });
    }

    // Initial load for Week 1
    loadLesson(1);

    // Event listener for Week 1 link (if more weeks are added, this can be generalized)
    week1Link.addEventListener('click', (e) => {
        e.preventDefault();
        // Remove active class from all links and add to current
        document.querySelectorAll('.sidebar ul li a').forEach(link => link.classList.remove('active'));
        week1Link.classList.add('active');
        loadLesson(1);
        // Hide sidebar on link click for mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.add('hidden');
        }
    });

    // Toggle sidebar visibility on hamburger menu click
    hamburgerMenu.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
    });
});