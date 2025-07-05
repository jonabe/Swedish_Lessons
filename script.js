document.addEventListener('DOMContentLoaded', () => {
    const lessonDisplay = document.getElementById('lesson-display');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const sidebar = document.querySelector('.sidebar');
    
    // Check if we need to reload based on date change
    const lastLoadDate = localStorage.getItem('swedishLessonsLastLoadDate');
    const todayDate = new Date().toDateString();
    
    if (lastLoadDate && lastLoadDate !== todayDate) {
        // Date has changed, reload the page to get fresh data
        localStorage.setItem('swedishLessonsLastLoadDate', todayDate);
        location.reload();
        return;
    }
    
    // Store today's date
    localStorage.setItem('swedishLessonsLastLoadDate', todayDate);
    
    // Version info - update this when making changes
    const VERSION = '1.0.0';
    const LAST_MODIFIED = '2025-07-05 12:55 ET';
    
    // iOS detection with override from localStorage
    const savedMode = localStorage.getItem('swedishLessonsIOSMode');
    if (savedMode !== null) {
        isIOS = savedMode === 'true';
    } else {
        // Default to iOS mode unless explicitly set otherwise
        isIOS = true;
    }
    
    if (isIOS) {
        document.body.classList.add('ios-device');
    }
    
    // Set up version info and mode toggle
    const versionText = document.getElementById('version-text');
    const modeToggle = document.getElementById('mode-toggle');
    
    versionText.textContent = `v${VERSION} (${LAST_MODIFIED})`;
    modeToggle.textContent = isIOS ? 'Desktop' : 'Mobile';
    
    modeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        isIOS = !isIOS;
        localStorage.setItem('swedishLessonsIOSMode', isIOS.toString());
        location.reload();
    });
    async function loadLesson(weekNumber) {
        try {
            // Load the appropriate week file
            const response = await fetch(`lessons/Svenska_for_semestern_vecka_${weekNumber}.md`);
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
        const weekLink = document.getElementById(`week${weekNumber}-link`);
        if (!weekLink) return;
        const weekLi = weekLink.parentElement;
        
        // Check if submenu already exists
        const existingSubmenu = weekLi.querySelector('.day-submenu');
        if (existingSubmenu) {
            // Submenu already exists, just show it
            weekLink.classList.remove('collapsed');
            weekLink.classList.add('expanded');
            existingSubmenu.style.display = 'block';
            return;
        }
        
        // Add expand/collapse functionality to week link
        weekLink.classList.add('has-submenu');
        weekLink.classList.add('expanded'); // Start expanded when created
        
        // Create new submenu
        const submenu = document.createElement('ul');
        submenu.className = 'day-submenu';
        submenu.style.display = 'block'; // Show when created
        
        // Get today's date in the format used in lessons
        const today = new Date();
        const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        dayAnchors.forEach(day => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `#${day.anchorId}`;
            
            // Check if this is today's lesson
            if (day.englishDate === todayFormatted) {
                a.textContent = `Day ${day.number} (today)`;
                a.classList.add('today');
            } else {
                a.textContent = `Day ${day.number}`;
            }
            a.title = day.englishDate;
            
            // Add click handler for smooth scrolling
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.getElementById(day.anchorId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Hide sidebar on small screens or when in iOS mode
                    if (window.innerWidth <= 768 || isIOS) {
                        sidebar.classList.add('hidden');
                    }
                }
            });
            
            li.appendChild(a);
            submenu.appendChild(li);
        });
        
        weekLi.appendChild(submenu);
        
        // Store the toggle handler to avoid multiple bindings
        if (!weekLink.hasToggleHandler) {
            weekLink.hasToggleHandler = true;
            
            // Add toggle functionality to week link
            weekLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const submenuElement = weekLi.querySelector('.day-submenu');
                if (!submenuElement) return;
                
                const isCollapsed = weekLink.classList.contains('collapsed');
                
                if (isCollapsed) {
                    weekLink.classList.remove('collapsed');
                    weekLink.classList.add('expanded');
                    submenuElement.style.display = 'block';
                } else {
                    weekLink.classList.remove('expanded');
                    weekLink.classList.add('collapsed');
                    submenuElement.style.display = 'none';
                }
            });
        }
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
            // Handle both old format: ### **Dag 1: Lördag, 28 Juni (Day 1: Saturday, June 28)**
            // And new format: ### **Dag 1: Lördag, 2025-06-28**
            const dayMatchOld = line.match(/^### \*\*Dag (\d+): (.+?) \(Day \d+: (.+?)\\\)\*\*$/);
            const dayMatchNew = line.match(/^### \*\*Dag (\d+): [^,]+, (\d{4}-\d{2}-\d{2})\*\*$/);
            const dayMatch = dayMatchOld || dayMatchNew;
            
            if (dayMatch) {
                const dayNumber = dayMatch[1];
                const anchorId = `day${dayNumber}`;
                let englishDate;
                let swedishDate;
                
                if (dayMatchOld) {
                    swedishDate = dayMatchOld[2];
                    englishDate = dayMatchOld[3];
                } else {
                    // For new format, extract the Swedish day and date
                    const fullMatch = line.match(/: ([^,]+), (\d{4}-\d{2}-\d{2})/);
                    swedishDate = fullMatch[1];
                    englishDate = fullMatch[2];
                }
                
                // Store day info for submenu
                dayAnchors.push({
                    number: dayNumber,
                    swedishDate: swedishDate,
                    englishDate: englishDate,
                    anchorId: anchorId
                });
                
                // Add anchor to the heading
                if (dayMatchOld) {
                    // Old format keeps the full structure
                    processedLines.push(`### <span id="${anchorId}"></span>**Dag ${dayNumber}: ${dayMatchOld[2]} (Day ${dayNumber}: ${englishDate}\\)**`);
                } else {
                    // New format is simpler
                    processedLines.push(`### <span id="${anchorId}"></span>**Dag ${dayNumber}: ${swedishDate}, ${englishDate}**`);
                }
                i++;
                continue;
            }
            
            // Check if next line is a pronunciation link
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                // Match pronunciation links with or without backticks
                const pronunciationMatch = nextLine.match(/^\s+\*\s*Pronunciation Link:\s*(`[^`]+`|https:\/\/[^\s]+)/);
                
                if (pronunciationMatch) {
                    let swedishWord = null;
                    
                    // Try different patterns to extract Swedish text
                    // Pattern 1: Text in backticks at end of line (e.g., `Hej`)
                    const backtickMatch = line.match(/`([^`]+)`\s*$/);
                    if (backtickMatch) {
                        swedishWord = backtickMatch[1];
                    } else {
                        // Pattern 2: Word after colon without backticks (e.g., **Hello:** Hej)
                        const noBacktickMatch = line.match(/\*\*[^:]+:\*\*\s*([^`\s]+.*?)$/);
                        if (noBacktickMatch) {
                            swedishWord = noBacktickMatch[1].trim();
                        } else {
                            // Pattern 3: Letter patterns (e.g., **Letter Å, å**)
                            const letterMatch = line.match(/\*\*Letter ([ÅÄÖåäö]), [ÅÄÖåäö]\*\*/);
                            if (letterMatch) {
                                swedishWord = letterMatch[1];
                            } else {
                                // Pattern 4: Word with colon and backticks (e.g., **boat:** `båt`)
                                const wordMatch = line.match(/\*\*[^:]+:\*\*\s*`([^`]+)`/);
                                if (wordMatch) {
                                    swedishWord = wordMatch[1];
                                }
                            }
                        }
                    }
                    
                    if (swedishWord) {
                        // Extract the Google Translate URL (with or without backticks)
                        const urlWithBackticks = nextLine.match(/`(https:\/\/translate\.google\.com\/[^`]+)`/);
                        const urlWithoutBackticks = nextLine.match(/(https:\/\/translate\.google\.com\/[^\s]+)/);
                        const urlMatch = urlWithBackticks || urlWithoutBackticks;
                        let googleUrl = urlMatch ? urlMatch[1] : `https://translate.google.com/?sl=en&tl=sv&text=${encodeURIComponent(swedishWord)}&op=translate`;
                        
                        // Fix escaped ampersands in URLs
                        googleUrl = googleUrl.replace(/\\&/g, '&');
                        
                        // Add the button placeholder to the current line with both text and URL
                        processedLines.push(line + ` <button class="pronunciation-button" data-text-to-speak="${swedishWord}" data-google-url="${googleUrl}" aria-label="Play pronunciation for ${swedishWord}"><span class="material-icons">volume_up</span></button>`);
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
            [/\\\\\\_/g, '_'],  // Triple backslash underscores (from Week 2)
            [/\\\\/g, '\\'],  // Double backslashes
            [/\\_/g, '_'],   // Single backslash underscores
            [/\\-/g, '-'],   // Hyphens/dashes
            [/\\\*/g, '*'],  // Asterisks
            [/\\\(/g, '('],  // Opening parentheses
            [/\\\)/g, ')'],  // Closing parentheses
            [/\\!/g, '!'],  // Exclamation marks
            [/\\\[/g, '['],  // Opening brackets
            [/\\\]/g, ']'],  // Closing brackets
            [/\\\+/g, '+'],  // Plus signs
            [/\\=/g, '='],   // Equals signs
            [/\\>/g, '>'],   // Greater than signs
            [/\\</g, '<'],   // Less than signs
            [/\\'/g, "'"],  // Single quotes
            [/\\"/g, '"'],  // Double quotes
            [/\\\?/g, '?'],  // Question marks
            [/\\\./g, '.'],  // Periods
            [/\\,/g, ','],   // Commas
            [/\\;/g, ';'],   // Semicolons
            [/\\:/g, ':'],   // Colons
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
                const googleUrl = button.dataset.googleUrl;
                
                // Use the global isIOS variable
                if (isIOS && googleUrl) {
                    // On iOS, open Google Translate in a popup window
                    window.open(googleUrl, '_blank');
                } else if (textToSpeak) {
                    // On other devices, use Web Speech API
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

    // Function to find yesterday's vocabulary
    async function loadYesterdaysVocabulary() {
        try {
            // Load week 1 for vocabulary
            const response = await fetch(`lessons/Svenska_for_semestern_vecka_1.md`);
            if (!response.ok) {
                    return;
            }
            
            const text = await response.text();
            const lines = text.split('\n');
            
            // Get yesterday's date
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            // Get today's date as fallback
            const today = new Date();
            
            // Format dates to match the new markdown format (e.g., "2025-06-28")
            const formatDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            
            const yesterdayFormatted = formatDate(yesterday);
            const todayFormatted = formatDate(today);
            
            
            // Find the section for yesterday (or today as fallback)
            let foundDate = false;
            let dateToUse = yesterdayFormatted;
            let inPartA = false;
            let inPartB = false;
            let partAWords = [];
            let partBWords = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Check if this is yesterday's section
                if (line.includes(yesterdayFormatted)) {
                    foundDate = true;
                    dateToUse = yesterdayFormatted;
                    continue;
                }
                
                // If we found the date and hit another day, stop
                if (foundDate && line.match(/^### \*\*Dag \d+:/)) {
                    break;
                }
                
                if (foundDate) {
                    // Check for Part A
                    if (line.includes('**Part A:')) {
                        inPartA = true;
                        inPartB = false;
                        continue;
                    }
                    
                    // Check for Part B
                    if (line.includes('**Part B:')) {
                        inPartB = true;
                        inPartA = false;
                        continue;
                    }
                    
                    // Check for Part C (stop collecting)
                    if (line.includes('**Part C:')) {
                        break;
                    }
                    
                    // Extract vocabulary items
                    if ((inPartA || inPartB) && line.trim().startsWith('*')) {
                        // First clean up escape characters
                        let cleanLine = line;
                        cleanLine = cleanLine.replace(/\\!/g, '!');
                        cleanLine = cleanLine.replace(/\\'/g, "'");
                        cleanLine = cleanLine.replace(/\\"/g, '"');
                        
                        // Match patterns like: * **English:** `Swedish` or * **English:** Swedish
                        const matchWithBackticks = cleanLine.match(/\*\s*\*\*([^:]+):\*\*\s*`([^`]+)`/);
                        const matchWithoutBackticks = cleanLine.match(/\*\s*\*\*([^:]+):\*\*\s*([^`\n]+)$/);
                        const match = matchWithBackticks || matchWithoutBackticks;
                        if (match) {
                            let english = match[1].trim();
                            const swedish = match[2].trim();
                            
                            // Clean escape characters from extracted text too
                            english = english.replace(/\\!/g, '!');
                            english = english.replace(/\\'/g, "'");
                            english = english.replace(/\\"/g, '"');
                            
                            if (inPartA) {
                                partAWords.push({ english, swedish });
                            } else if (inPartB) {
                                partBWords.push({ english, swedish });
                            }
                        }
                    }
                }
            }
            
            // If we didn't find yesterday's vocabulary, try today's
            if (!foundDate || (partAWords.length === 0 && partBWords.length === 0)) {
                // Reset and search for today
                foundDate = false;
                inPartA = false;
                inPartB = false;
                partAWords = [];
                partBWords = [];
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // Check if this is today's section
                    if (line.includes(todayFormatted)) {
                        foundDate = true;
                        dateToUse = todayFormatted;
                        continue;
                    }
                    
                    // If we found the date and hit another day, stop
                    if (foundDate && line.match(/^### \*\*Dag \d+:/)) {
                        break;
                    }
                    
                    if (foundDate) {
                        // Check for Part A
                        if (line.includes('**Part A:')) {
                            inPartA = true;
                            inPartB = false;
                            continue;
                        }
                        
                        // Check for Part B
                        if (line.includes('**Part B:')) {
                            inPartB = true;
                            inPartA = false;
                            continue;
                        }
                        
                        // Check for Part C (stop collecting)
                        if (line.includes('**Part C:')) {
                            break;
                        }
                        
                        // Extract vocabulary items
                        if ((inPartA || inPartB) && line.trim().startsWith('*')) {
                            // First clean up escape characters
                            let cleanLine = line;
                            cleanLine = cleanLine.replace(/\\!/g, '!');
                            cleanLine = cleanLine.replace(/\\'/g, "'");
                            cleanLine = cleanLine.replace(/\\"/g, '"');
                            
                            // Match patterns like: * **English:** `Swedish`
                            const match = cleanLine.match(/\*\s*\*\*([^:]+):\*\*\s*`([^`]+)`/);
                            if (match) {
                                let english = match[1].trim();
                                const swedish = match[2].trim();
                                
                                // Clean escape characters from extracted text too
                                english = english.replace(/\\!/g, '!');
                                english = english.replace(/\\'/g, "'");
                                english = english.replace(/\\"/g, '"');
                                
                                if (inPartA) {
                                    partAWords.push({ english, swedish });
                                } else if (inPartB) {
                                    partBWords.push({ english, swedish });
                                }
                            }
                        }
                    }
                }
            }
            
            // If we found vocabulary from either date, show reminder
            if (foundDate && (partAWords.length > 0 || partBWords.length > 0)) {
                showReminder(partAWords, partBWords);
            } else {
                // Try showing from first available day as fallback
                loadFirstDayVocabulary();
            }
            
        } catch (error) {
            console.error('Error loading yesterday\'s vocabulary:', error);
        }
    }
    
    // Function to show reminder
    let reminderInterval = null;
    let currentWords = [];
    
    function showReminder(partAWords, partBWords) {
        const reminderSection = document.getElementById('reminder-section');
        const reminderHeading = reminderSection.querySelector('h3');
        
        // Store words for timer
        currentWords = [...partAWords, ...partBWords];
        if (currentWords.length === 0) return;
        
        // Always show "Do you remember?"
        reminderHeading.textContent = "Do you remember?";
        
        // Show the section
        reminderSection.style.display = 'block';
        
        // Display initial word
        displayRandomWord();
        
        // Clear any existing interval
        if (reminderInterval) {
            clearInterval(reminderInterval);
        }
        
        // Set up interval to change word every minute
        reminderInterval = setInterval(displayRandomWord, 60000); // 60000ms = 1 minute
    }
    
    function displayRandomWord() {
        const reminderText = document.getElementById('reminder-text');
        const answerText = document.getElementById('answer-text');
        const showAnswerBtn = document.getElementById('show-answer');
        
        if (currentWords.length === 0) return;
        
        const randomWord = currentWords[Math.floor(Math.random() * currentWords.length)];
        
        reminderText.textContent = `"${randomWord.english}"`;
        answerText.textContent = randomWord.swedish;
        
        // Reset answer visibility
        answerText.style.display = 'none';
        showAnswerBtn.style.display = 'inline-block';
        
        // Show answer button functionality
        showAnswerBtn.onclick = () => {
            answerText.style.display = 'block';
            showAnswerBtn.style.display = 'none';
        };
    }
    
    // Function to load vocabulary from the first day as fallback
    async function loadFirstDayVocabulary() {
        try {
            // Load week 1 for vocabulary
            const response = await fetch(`lessons/Svenska_for_semestern_vecka_1.md`);
            if (!response.ok) return;
            
            const text = await response.text();
            const lines = text.split('\n');
            
            let foundDay = false;
            let inPartA = false;
            let inPartB = false;
            let partAWords = [];
            let partBWords = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Find first day - match both escaped and unescaped versions
                if (line.match(/^### \*\*Dag \d+:/) || line.includes('**Dag 1:')) {
                    if (!foundDay) {
                        foundDay = true;
                    } else {
                        // We hit another day, stop
                        break;
                    }
                    continue;
                }
                
                if (foundDay) {
                    // Check for Part A
                    if (line.includes('**Part A:')) {
                        inPartA = true;
                        inPartB = false;
                        continue;
                    }
                    
                    // Check for Part B
                    if (line.includes('**Part B:')) {
                        inPartB = true;
                        inPartA = false;
                        continue;
                    }
                    
                    // Check for Part C (stop collecting)
                    if (line.includes('**Part C:')) {
                        break;
                    }
                    
                    // Extract vocabulary items
                    if ((inPartA || inPartB) && line.trim().startsWith('*')) {
                        // First clean up escape characters
                        let cleanLine = line;
                        cleanLine = cleanLine.replace(/\\!/g, '!');
                        cleanLine = cleanLine.replace(/\\'/g, "'");
                        cleanLine = cleanLine.replace(/\\"/g, '"');
                        
                        // Match patterns like: * **English:** `Swedish` or * **English:** Swedish
                        const matchWithBackticks = cleanLine.match(/\*\s*\*\*([^:]+):\*\*\s*`([^`]+)`/);
                        const matchWithoutBackticks = cleanLine.match(/\*\s*\*\*([^:]+):\*\*\s*([^`\n]+)$/);
                        const match = matchWithBackticks || matchWithoutBackticks;
                        if (match) {
                            let english = match[1].trim();
                            const swedish = match[2].trim();
                            
                            // Clean escape characters from extracted text too
                            english = english.replace(/\\!/g, '!');
                            english = english.replace(/\\'/g, "'");
                            english = english.replace(/\\"/g, '"');
                            
                            if (inPartA) {
                                partAWords.push({ english, swedish });
                            } else if (inPartB) {
                                partBWords.push({ english, swedish });
                            }
                        }
                    }
                }
            }
            
            if (partAWords.length > 0 || partBWords.length > 0) {
                showReminder(partAWords, partBWords);
            }
            
        } catch (error) {
            console.error('Error loading first day vocabulary:', error);
        }
    }

    // Dynamically discover available weeks
    async function discoverWeeks() {
        const weeks = [];
        let weekNum = 1;
        
        // Try to find all available week files
        while (true) {
            try {
                const response = await fetch(`lessons/Svenska_for_semestern_vecka_${weekNum}.md`);
                if (response.ok) {
                    weeks.push(weekNum);
                    weekNum++;
                } else {
                    break;
                }
            } catch {
                break;
            }
        }
        
        return weeks;
    }
    
    // Create week navigation
    async function createWeekNavigation() {
        const weekList = document.getElementById('week-list');
        const weeks = await discoverWeeks();
        
        if (weeks.length === 0) {
            console.error('No lesson weeks found');
            return 1; // Default to week 1
        }
        
        // Define date ranges for each week (can be expanded as needed)
        const weekDateRanges = {
            1: { start: new Date('2025-06-28'), end: new Date('2025-07-06') },
            2: { start: new Date('2025-07-07'), end: new Date('2025-07-13') }
            // Add more weeks as needed
        };
        
        const today = new Date();
        let initialWeek = 1;
        let currentWeekFound = false;
        
        // Create week links
        weeks.forEach(weekNum => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.id = `week${weekNum}-link`;
            a.textContent = `Week ${weekNum}`;
            
            // Check if this week contains today
            const range = weekDateRanges[weekNum];
            if (range && today >= range.start && today <= range.end) {
                a.classList.add('active');
                initialWeek = weekNum;
                currentWeekFound = true;
            } else if (!currentWeekFound && weekNum === weeks[weeks.length - 1]) {
                // If no current week found and this is the last week, make it active
                a.classList.add('active');
                initialWeek = weekNum;
            }
            
            // Add click handler
            a.addEventListener('click', (e) => {
                // If this week already has a submenu, let the toggle handler handle it
                if (a.classList.contains('has-submenu')) {
                    return;
                }
                
                e.preventDefault();
                
                // Update active state
                document.querySelectorAll('#week-list a').forEach(link => link.classList.remove('active'));
                a.classList.add('active');
                
                // Hide other week submenus but don't remove them
                document.querySelectorAll('.day-submenu').forEach(submenu => {
                    submenu.style.display = 'none';
                });
                
                // Collapse other week links
                document.querySelectorAll('.has-submenu').forEach(link => {
                    if (link !== a) {
                        link.classList.remove('expanded');
                        link.classList.add('collapsed');
                    }
                });
                
                // Load the week
                loadLesson(weekNum);
            });
            
            li.appendChild(a);
            weekList.appendChild(li);
        });
        
        return initialWeek;
    }
    
    // Initialize week navigation and load initial week
    createWeekNavigation().then(initialWeek => {
        loadLesson(initialWeek);
    });
    
    // Load yesterday's vocabulary with a small delay to ensure DOM is ready
    setTimeout(() => {
        loadYesterdaysVocabulary();
    }, 500);
    
    // On mobile/iOS, show sidebar by default
    if (window.innerWidth <= 768 || isIOS) {
        sidebar.classList.remove('hidden');
    }


    // Toggle sidebar visibility on hamburger menu click
    hamburgerMenu.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        document.querySelector('.container').classList.toggle('sidebar-hidden');
    });
    
    // Popup functionality for Google Translate
    function openTranslatePopup(url) {
        // Open in a small popup window
        const width = 600;
        const height = 500; // Increased by 100px
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        window.open(
            url,
            'GoogleTranslate',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
    }
    
    // Scroll to top functionality
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    const scrollThreshold = window.innerHeight; // One page height
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > scrollThreshold) {
            scrollToTopBtn.classList.add('show');
        } else {
            scrollToTopBtn.classList.remove('show');
        }
    });
    
    // Scroll to top when button is clicked
    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Check periodically if the date has changed (every minute)
    setInterval(() => {
        const currentDate = new Date().toDateString();
        const storedDate = localStorage.getItem('swedishLessonsLastLoadDate');
        
        if (storedDate && storedDate !== currentDate) {
            // Date has changed, update the stored date and reload
            localStorage.setItem('swedishLessonsLastLoadDate', currentDate);
            location.reload();
        }
    }, 60000); // Check every minute
});