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
            const dayAnchors = displayLesson(text);
            
            // Create submenu for days
            if (dayAnchors && dayAnchors.length > 0) {
                updateDaySubmenu(weekNumber, dayAnchors);
            }
        } catch (error) {
            console.error('Error loading lesson:', error);
            lessonDisplay.innerHTML = `<p>Failed to load lesson for Week ${weekNumber}. Please try again later.</p>`;
        }
    }
    
    function updateDaySubmenu(weekNumber, dayAnchors) {
        // Find or create submenu container
        const week1Link = document.getElementById('week1-link');
        const weekLi = week1Link.parentElement;
        
        // Check if submenu already exists
        const existingSubmenu = weekLi.querySelector('.day-submenu');
        if (existingSubmenu) {
            // Submenu already exists, don't recreate it
            return;
        }
        
        // Add expand/collapse functionality to week link
        week1Link.classList.add('has-submenu');
        week1Link.classList.add('collapsed'); // Start collapsed
        
        // Create new submenu
        const submenu = document.createElement('ul');
        submenu.className = 'day-submenu';
        submenu.style.display = 'none'; // Hidden by default
        
        dayAnchors.forEach(day => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `#${day.anchorId}`;
            a.textContent = `Day ${day.number}`;
            a.title = day.englishDate;
            
            // Add click handler for smooth scrolling
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.getElementById(day.anchorId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Hide sidebar on mobile after click
                    if (window.innerWidth <= 768) {
                        sidebar.classList.add('hidden');
                    }
                }
            });
            
            li.appendChild(a);
            submenu.appendChild(li);
        });
        
        weekLi.appendChild(submenu);
        
        // Remove any existing click handlers first
        const newWeek1Link = week1Link.cloneNode(true);
        week1Link.parentNode.replaceChild(newWeek1Link, week1Link);
        
        // Add toggle functionality to week link
        newWeek1Link.addEventListener('click', (e) => {
            e.preventDefault();
            const isCollapsed = newWeek1Link.classList.contains('collapsed');
            
            if (isCollapsed) {
                newWeek1Link.classList.remove('collapsed');
                newWeek1Link.classList.add('expanded');
                submenu.style.display = 'block';
            } else {
                newWeek1Link.classList.remove('expanded');
                newWeek1Link.classList.add('collapsed');
                submenu.style.display = 'none';
            }
            
            // Don't reload the lesson, just toggle the menu
        });
    }

    function displayLesson(markdownContent) {
        let htmlContent = markdownContent;
        const dayAnchors = []; // Store day information for submenu

        // Process pronunciation links before markdown conversion
        // The structure is:
        // * **English:** `Swedish`
        //   * Pronunciation Link: `URL`
        
        const lines = htmlContent.split('\n');
        const processedLines = [];
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i];
            
            // Check for day headings and add anchors
            const dayMatch = line.match(/^### \*\*Dag (\d+): (.+?) \(Day \d+: (.+?)\\\)\*\*$/);
            if (dayMatch) {
                const dayNumber = dayMatch[1];
                const swedishDate = dayMatch[2];
                const englishDate = dayMatch[3];
                const anchorId = `day${dayNumber}`;
                
                // Store day info for submenu
                dayAnchors.push({
                    number: dayNumber,
                    swedishDate: swedishDate,
                    englishDate: englishDate,
                    anchorId: anchorId
                });
                
                // Add anchor to the heading
                processedLines.push(`### <span id="${anchorId}"></span>**Dag ${dayNumber}: ${swedishDate} (Day ${dayNumber}: ${englishDate}\\)**`);
                i++;
                continue;
            }
            
            // Check if next line is a pronunciation link
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                const pronunciationMatch = nextLine.match(/^\s+\*\s*Pronunciation Link:\s*`[^`]+`/);
                
                if (pronunciationMatch) {
                    let swedishWord = null;
                    
                    // Try different patterns to extract Swedish text
                    // Pattern 1: Text in backticks at end of line (e.g., `Hej`)
                    const backtickMatch = line.match(/`([^`]+)`\s*$/);
                    if (backtickMatch) {
                        swedishWord = backtickMatch[1];
                    } else {
                        // Pattern 2: Letter patterns (e.g., **Letter Å, å**)
                        const letterMatch = line.match(/\*\*Letter ([ÅÄÖåäö]), [ÅÄÖåäö]\*\*/);
                        if (letterMatch) {
                            swedishWord = letterMatch[1];
                        } else {
                            // Pattern 3: Word with colon and backticks (e.g., **boat:** `båt`)
                            const wordMatch = line.match(/\*\*[^:]+:\*\*\s*`([^`]+)`/);
                            if (wordMatch) {
                                swedishWord = wordMatch[1];
                            }
                        }
                    }
                    
                    if (swedishWord) {
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
        
        // Fix escaped characters before markdown conversion
        // This handles common markdown escapes that shouldn't be escaped in our context
        const escapeReplacements = [
            [/\\_/g, '_'],   // Underscores
            [/\\-/g, '-'],   // Hyphens/dashes
            [/\\\*/g, '*'],  // Asterisks
            [/\\\(/g, '('],  // Opening parentheses
            [/\\\)/g, ')'],  // Closing parentheses
            [/\\\!/g, '!'],  // Exclamation marks
            [/\\\[/g, '['],  // Opening brackets
            [/\\\]/g, ']'],  // Closing brackets
            [/\\\+/g, '+'],  // Plus signs
            [/\\=/g, '='],   // Equals signs
            [/\\>/g, '>'],   // Greater than signs
            [/\\</g, '<'],   // Less than signs
        ];
        
        escapeReplacements.forEach(([pattern, replacement]) => {
            htmlContent = htmlContent.replace(pattern, replacement);
        });

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
        
        // Return day anchors for submenu creation
        return dayAnchors;
    }

    // Initial load for Week 1
    loadLesson(1);

    // Note: Week 1 click handler is now managed in updateDaySubmenu function

    // Toggle sidebar visibility on hamburger menu click
    hamburgerMenu.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        hamburgerMenu.classList.toggle('dark');
        document.querySelector('.container').classList.toggle('sidebar-hidden');
    });
});