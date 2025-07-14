class UndrstandingApp {
    constructor() {
        this.currentTab = 'main.py';
        this.sessionId = null;
        this.isTyping = false;
        this.isWaitingForInput = false;
        this.inputCallback = null;
        this.sidebarCollapsed = true; // Start with sidebar collapsed
        this.files = {};
        this.isRecording = false;
        this.recognition = null;
        this.currentSearchResults = [];
        this.currentSearchIndex = -1;
        this.searchHighlights = [];
        this.customHeadings = {}; // Store custom headings for files
        this.programmingQuestions = this.initializeProgrammingQuestions();
        this.webDevelopmentQuestions = this.initializeWebDevelopmentQuestions();
        this.currentDifficulty = 'easy';
        this.currentQuestion = null;
        this.currentErrorHighlights = []; // Track error highlights for cleanup
        this.init();
    }

    init() {
        // Ensure DOM is fully loaded
        setTimeout(() => {
            this.setupEventListeners();
            this.updateLineNumbers();
            this.loadSessionStatus();
            this.updateCursorPosition();
            this.setupChatInputAutoResize();

            // Focus on code editor by default
            const codeInput = document.getElementById('codeInput');
            if (codeInput) {
                codeInput.focus();
            }

            // Initialize with welcome message scroll
            this.scrollChatToBottom();

            // Apply default sidebar state (collapsed)
            this.applySidebarState();

            // Verify critical elements are present
            this.verifyElements();

             // Initialize file creation and folder management
            this.initializeFileCreation();
            this.initializeFolderManagement();

            // Initialize resize functionality
            this.initializeResizers();

            // Initialize speech recognition
            this.initializeSpeechRecognition();

            // Apply language colors to existing file items
            this.applyLanguageColorsToExistingFiles();

            // Initialize run button for current file
            this.updateRunButtonForFileType(this.currentTab);

            // Initialize upload functionality
            this.initializeUploadFunctionality();
        }, 100);
    }

    verifyElements() {
        const requiredElements = [
            'chatInput',
            'sendMessage', 
            'messagesArea',
            'analyzeCode',
            'runCode'
        ];

        const missing = requiredElements.filter(id => !document.getElementById(id));
        if (missing.length > 0) {
            console.warn('Missing required elements:', missing);
        }
    }

    setupEventListeners() {
        // File tree interactions
        document.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.file-menu-btn')) {
                    this.selectFile(item.dataset.file);
                }
            });

            // Add menu button event listener
            const menuBtn = item.querySelector('.file-menu-btn');
            if (menuBtn) {
                menuBtn.addEventListener('click', (e) => {
                    this.showFileMenu(e, item, item.dataset.file);
                });
            }
        });

        // Folder menu interactions
        document.querySelectorAll('.folder-header').forEach(header => {
            const menuBtn = header.querySelector('.folder-menu-btn');
            if (menuBtn) {
                const folderItem = header.closest('.folder-item');
                const folderName = header.querySelector('.folder-name')?.textContent;

                menuBtn.addEventListener('click', (e) => {
                    this.showFolderMenu(e, folderItem, folderName);
                });
            }
        });

        // Setup file menu listeners
        this.setupFileMenuListeners();

        // Back to top button
        const backToTopBtn = document.getElementById('backToTop');
        if (backToTopBtn) {
            backToTopBtn.addEventListener('click', () => {
                this.scrollCodeToTop();
            });
        }



        // Tab interactions
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (!e.target.closest('.tab-close')) {
                    this.switchTab(tab.dataset.file);
                }
            });
        });

        document.querySelectorAll('.tab-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(closeBtn.closest('.tab').dataset.file);
            });
        });

        // Panel tab interactions
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchBottomPanel(tab.dataset.panel);
            });
        });

        // Code editor events
        const codeInput = document.getElementById('codeInput');
        if (codeInput) {
            codeInput.addEventListener('input', () => {
                this.updateLineNumbers();
                this.updateLineCount();
            });

            codeInput.addEventListener('keydown', (e) => {
                this.handleCodeInputKeydown(e);
            });

            codeInput.addEventListener('keyup', () => {
                this.updateCursorPosition();
            });

            codeInput.addEventListener('click', () => {
                this.updateCursorPosition();
            });

            codeInput.addEventListener('scroll', () => {
                this.syncLineNumbersScroll();
                this.toggleBackToTopButton();
            });
        }

        // Chat functionality
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendMessage');

        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            chatInput.addEventListener('input', () => {
                this.autoResizeChatInput();
            });
        }

        if (sendButton) {
            sendButton.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Voice to text functionality
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.toggleVoiceRecording();
            });
        }

        // File creation button - context-aware (handled in initializeFileCreation)

        // Action buttons
        const runButton = document.getElementById('runCode');
        const analyzeButton = document.getElementById('analyzeCode');
        const visualizeButton = document.getElementById('visualizeBtn');
        const walkthroughButton = document.getElementById('walkthroughBtn');

        if (runButton) {
            runButton.addEventListener('click', () => {
                this.runCode();
            });
        }

        if (analyzeButton) {
            analyzeButton.addEventListener('click', () => {
                this.analyzeCode();
            });
        }

        if (visualizeButton) {
            visualizeButton.addEventListener('click', () => {
                this.openFullscreenVisualization();
            });
        }

        if (walkthroughButton) {
            walkthroughButton.addEventListener('click', () => {
                const code = this.getCodeFromEditor();
                if (code.trim()) {
                    this.toggleTerminalCollapse();
                    // Scroll to top of the code editor for walkthrough
                    this.scrollCodeToTop();
                }
                this.startStepByStepExecution();
            });
        }



        // Folder toggle
        document.querySelectorAll('.folder-header').forEach(header => {
            header.addEventListener('click', () => {
                this.toggleFolder(header.closest('.folder-item'));
            });
        });

        // Library button
        const libraryBtn = document.getElementById('libraryBtn');
        if (libraryBtn) {
            libraryBtn.addEventListener('click', () => {
                this.openLibrary();
            });
        }

        // Collapsed library button
        const collapsedLibraryBtn = document.getElementById('collapsedLibraryBtn');
        if (collapsedLibraryBtn) {
            collapsedLibraryBtn.addEventListener('click', () => {
                this.openLibrary();
            });
        }



        // Terminal functionality
        const clearTerminalBtn = document.getElementById('clearTerminal');
        if (clearTerminalBtn) {
            clearTerminalBtn.addEventListener('click', () => this.clearTerminal());
        }

        // Terminal collapse functionality
        const collapseTerminalBtn = document.getElementById('collapseTerminal');
        if (collapseTerminalBtn) {
            collapseTerminalBtn.addEventListener('click', () => this.toggleTerminalCollapse());
        }

        // Terminal tab switching
        document.querySelectorAll('.terminal-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTerminalTab(tab.dataset.tab);
            });
        });

        // File header editing for main.py (existing functionality)
        const editHeaderBtn = document.getElementById('editHeaderBtn');
        const saveHeaderBtn = document.getElementById('saveHeaderBtn');
        const headerInput = document.querySelector('.file-header-input');

        if (editHeaderBtn && saveHeaderBtn) {
            editHeaderBtn.addEventListener('click', () => {
                this.enableHeaderEditing();
            });
            saveHeaderBtn.addEventListener('click', () => {
                this.saveHeaderEditing();
            });
        }

        // Click-to-edit functionality for header input
        if (headerInput) {
            headerInput.addEventListener('click', (e) => {
                if (headerInput.hasAttribute('readonly')) {
                    this.enableHeaderEditing();
                }
            });
        }

        // Sidebar close functionality
        const sidebarClose = document.getElementById('sidebarClose');
        if (sidebarClose) {
            sidebarClose.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeSidebar();
            });
        }



        // Sidebar click to open/close functionality with file creation cancellation
        const explorerPanel = document.querySelector('.explorer-panel');
        if (explorerPanel) {
            explorerPanel.addEventListener('click', (e) => {
                // Remove temporary file creation if clicking outside the input (but allow other clicks to work)
                const tempFileItem = explorerPanel.querySelector('.file-item.new-file');
                if (tempFileItem && !e.target.closest('.file-item.new-file')) {
                    tempFileItem.remove();
                }

                // If sidebar is collapsed, open it when clicking anywhere on the panel
                if (this.sidebarCollapsed) {
                    this.openSidebar();
                    e.stopPropagation();
                    return;
                }
                // Don't close when clicking inside the expanded sidebar
                e.stopPropagation();
            });
        }

        // Specific handler for collapsed sidebar content area
        const collapsedContent = document.querySelector('.collapsed-sidebar-content');
        if (collapsedContent) {
            collapsedContent.addEventListener('click', (e) => {
                if (this.sidebarCollapsed) {
                    this.openSidebar();
                    e.stopPropagation();
                }
            });
        }

        // Collapsed sidebar icon functionality
        document.querySelectorAll('.collapsed-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const iconElement = icon.querySelector('i');

                if (iconElement && iconElement.classList.contains('fa-search')) {
                    // Always open sidebar first, then show search
                    if (this.sidebarCollapsed) {
                        this.openSidebar();
                        // Delay search panel creation to allow sidebar to open
                        setTimeout(() => {
                            this.toggleExpandedSearchPanel();
                        }, 100);
                    } else {
                        this.toggleExpandedSearchPanel();
                    }
                } else if (iconElement && iconElement.classList.contains('fa-lightbulb')) {
                    // Check file type before proceeding
                    const currentFile = this.currentTab;
                    const fileExtension = currentFile ? currentFile.split('.').pop().toLowerCase() : '';

                    if (['txt', 'md', 'markdown'].includes(fileExtension)) {
                        this.addMessage('🚫 Programming questions are not available for text and markdown files. Switch to a programming language file to access coding challenges.', 'assistant');
                        return;
                    }

                    // Always open sidebar first, then show questions
                    if (this.sidebarCollapsed) {
                        this.openSidebar();
                        // Delay questions panel creation to allow sidebar to open
                        setTimeout(() => {
                            this.toggleExpandedQuestionsPanel();
                        }, 100);
                    } else {
                        this.toggleExpandedQuestionsPanel();
                    }
                } else if (iconElement && iconElement.classList.contains('fa-folder')) {
                    // Open sidebar to show directory structure
                    if (this.sidebarCollapsed) {
                        this.openSidebar();
                    }
                }
            });
        });

        // Search button in expanded sidebar
        const searchExpandedBtn = document.getElementById('searchExpandedBtn');
        if (searchExpandedBtn) {
            searchExpandedBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleExpandedSearchPanel();
            });
        }

        // Questions button in expanded sidebar
        const questionsExpandedBtn = document.getElementById('questionsExpandedBtn');
        if (questionsExpandedBtn) {
            questionsExpandedBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleExpandedQuestionsPanel();
            });
        }

        // Click outside sidebar to close (but not when resizing AI panel)
        document.addEventListener('click', (e) => {
            // Don't close sidebar if clicking on AI sidebar, resize handles, or main content area
            if (!this.sidebarCollapsed && 
                !e.target.closest('.explorer-panel') && 
                !e.target.closest('.ai-sidebar') && 
                !e.target.closest('.main-content') &&
                !e.target.closest('.ai-sidebar-resize-handle') &&
                !e.target.closest('.terminal-resize-handle')) {
                this.closeSidebar();
            }
        });


    }

    setupChatInputAutoResize() {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            // Set initial height
            chatInput.style.height = 'auto';
            chatInput.style.height = chatInput.scrollHeight + 'px';
        }
    }

    autoResizeChatInput() {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.style.height = 'auto';
            const newHeight = Math.min(chatInput.scrollHeight, 120);
            chatInput.style.height = newHeight + 'px';
        }
    }

    scrollChatToBottom() {
        const messagesArea = document.getElementById('messagesArea');
        if (messagesArea) {
            setTimeout(() => {
                messagesArea.scrollTo({
                    top: messagesArea.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }

    scrollCodeToTop() {
        const activeContent = document.querySelector('.editor-content.active');
        if (activeContent) {
            const codeInput = activeContent.querySelector('.code-input');
            if (codeInput) {
                codeInput.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        }
    }

    toggleBackToTopButton() {
        const backToTopBtn = document.getElementById('backToTop');
        const activeContent = document.querySelector('.editor-content.active');

        if (backToTopBtn && activeContent) {
            const codeInput = activeContent.querySelector('.code-input');
            if (codeInput) {
                if (codeInput.scrollTop > 100) {
                    backToTopBtn.classList.add('show');
                } else {
                    backToTopBtn.classList.remove('show');
                }
            }
        }
    }



    selectFile(filename) {
        if (!filename) return;

        // Check if it's an image file
        if (this.isImageFile(filename)) {
            this.openImageViewer(filename);
            return;
        }

        // Update file tree selection
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
        });

        const fileItem = document.querySelector(`[data-file="${filename}"]`);
        if (fileItem) {
            fileItem.classList.add('active');
        }

        // If file tab doesn't exist, create it
        if (!document.querySelector(`[data-file="${filename}"].tab`)) {
            this.createTab(filename);
        }

        this.switchTab(filename);

        // Update run button for the selected file type
        this.updateRunButtonForFileType(filename);
    }

    createTab(filename) {
        const tabBar = document.querySelector('.tab-bar');
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.file = filename;

        const extension = filename.split('.').pop();
        const iconClass = this.getFileIcon(extension);
        const languageClass = this.getLanguageClass(filename);

        tab.innerHTML = `
            <i class="${iconClass} tab-icon"></i>
            <span class="tab-name">${filename}</span>
            <button class="tab-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Set language data attribute for CSS styling
        tab.dataset.language = languageClass;

        // Add event listeners
        tab.addEventListener('click', (e) => {
            if (!e.target.closest('.tab-close')) {
                this.switchTab(filename);
            }
        });

        tab.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(filename);
        });

        tabBar.appendChild(tab);

        // Create corresponding editor content with complete file header
        const editorArea = document.querySelector('.editor-area');
        const editorContent = document.createElement('div');
        editorContent.className = 'editor-content';
        editorContent.dataset.file = filename;

        editorContent.innerHTML = `
            <!-- File Header Bar -->
            <div class="file-header-bar">
                <div class="file-header-left">
                    <i class="${iconClass} file-header-icon"></i>
                    <input type="text" class="file-header-input" value="${filename}" readonly>
                </div>
                <div class="file-header-right">
                    <button class="file-header-btn edit-header-btn" title="Edit heading">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="file-header-btn save-header-btn" title="Save heading" style="display: none;">
                        <i class="fas fa-save"></i>
                    </button>
                    <button class="file-header-btn" title="File info">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            </div>

            <div class="code-editor">
                <div class="line-numbers"></div>
                <div class="code-input-container">
                    <textarea class="code-input" placeholder="// Your ${filename} code here..." spellcheck="false"></textarea>
                </div>
            </div>
        `;

        editorArea.appendChild(editorContent);

        // Setup header edit listeners for this specific file
        this.setupHeaderEditListeners(editorContent, filename);
    }

    setupFileMenuListeners() {
        // Close any open menus when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.item-menu') && !e.target.closest('.file-menu-btn') && !e.target.closest('.folder-menu-btn') && !e.target.closest('.context-menu')) {
                this.closeAllMenus();
            }
        });

        // Close menus when mouse leaves the file tree area
        const fileTree = document.querySelector('.file-tree');
        if (fileTree) {
            fileTree.addEventListener('mouseleave', (e) => {
                // Small delay to prevent immediate closing when moving between elements
                setTimeout(() => {
                    if (!e.target.closest('.item-menu') && !e.target.closest('.context-menu')) {
                        this.closeAllMenus();
                    }
                }, 200);
            });
        }

        // Close menus on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllMenus();
            }
        });
    }

    isImageFile(filename) {
        if (!filename) return false;
        const extension = filename.split('.').pop().toLowerCase();
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'];
        return imageExtensions.includes(extension);
    }

    closeAllMenus() {
        const openMenus = document.querySelectorAll('.item-menu');
        openMenus.forEach(menu => {
            menu.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
            menu.style.opacity = '0';
            menu.style.transform = 'translateY(-4px)';
            setTimeout(() => menu.remove(), 150);
        });
    }

    showFileMenu(event, fileItem, filename) {
        event.stopPropagation();
        this.closeAllMenus();

        const menu = document.createElement('div');
        menu.className = 'item-menu';
        menu.style.opacity = '0';
        menu.style.transform = 'translateY(-4px)';

        // Check if it's an image file and show restricted menu
        if (this.isImageFile(filename)) {
            menu.innerHTML = `
                <button class="item-menu-item" data-action="view-image">
                    <i class="fas fa-eye"></i>
                    View Image
                </button>
                <button class="item-menu-item" data-action="rename">
                    <i class="fas fa-edit"></i>
                    Rename
                </button>
                <button class="item-menu-item" data-action="download">
                    <i class="fas fa-download"></i>
                    Download
                </button>
                <div class="item-menu-separator"></div>
                <button class="item-menu-item danger" data-action="delete">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            `;
        } else {
            menu.innerHTML = `
                <button class="item-menu-item" data-action="rename">
                    <i class="fas fa-edit"></i>
                    Rename
                </button>
                <button class="item-menu-item" data-action="download">
                    <i class="fas fa-download"></i>
                    Save to Device
                </button>
                <div class="item-menu-separator"></div>
                <button class="item-menu-item danger" data-action="delete">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            `;
        }

        // Position menu relative to the file item
        fileItem.style.position = 'relative';
        fileItem.appendChild(menu);

        // Smooth animation
        requestAnimationFrame(() => {
            menu.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
            menu.style.opacity = '1';
            menu.style.transform = 'translateY(0)';
        });

        // Add event listeners
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.closest('.item-menu-item')?.dataset.action;
            if (action) {
                this.handleFileAction(action, fileItem, filename);
                this.closeAllMenus();
            }
        });

        // Auto-close menu after 3 seconds if no interaction
        setTimeout(() => {
            if (menu.parentNode && !menu.matches(':hover')) {
                this.closeAllMenus();
            }
        }, 3000);
    }

    showFolderMenu(event, folderItem, foldername) {
        event.stopPropagation();
        this.closeAllMenus();

        const menu = document.createElement('div');
        menu.className = 'item-menu';
        menu.style.opacity = '0';
        menu.style.transform = 'translateY(-4px)';
        menu.innerHTML = `
            <button class="item-menu-item" data-action="create-file">
                <i class="fas fa-file-plus"></i>
                <span>New File</span>
            </button>
            <button class="item-menu-item" data-action="create-folder">
                <i class="fas fa-folder-plus"></i>
                <span>New Folder</span>
            </button>
            <div class="item-menu-separator"></div>
            <button class="item-menu-item" data-action="collapse-all">
                <i class="fas fa-minus-square"></i>
                <span>Collapse All Subfolders</span>
            </button>
            <div class="item-menu-separator"></div>
            <button class="item-menu-item" data-action="rename">
                <i class="fas fa-edit"></i>
                <span>Rename</span>
            </button>
            <button class="item-menu-item" data-action="download-zip">
                <i class="fas fa-file-archive"></i>
                <span>Download as ZIP</span>
            </button>
            <div class="item-menu-separator"></div>
            <button class="item-menu-item danger" data-action="delete">
                <i class="fas fa-trash"></i>
                <span>Delete</span>
            </button>
        `;

        // Position menu relative to the folder item
        folderItem.style.position = 'relative';
        folderItem.appendChild(menu);

        // Smooth animation
        requestAnimationFrame(() => {
            menu.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
            menu.style.opacity = '1';
            menu.style.transform = 'translateY(0)';
        });

        // Add event listeners
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.closest('.item-menu-item')?.dataset.action;
            if (action) {
                this.handleFolderAction(action, folderItem, foldername);
                this.closeAllMenus();
            }
        });

        // Auto-close menu after 3 seconds if no interaction
        setTimeout(() => {
            if (menu.parentNode && !menu.matches(':hover')) {
                this.closeAllMenus();
            }
        }, 3000);
    }

    handleFileAction(action, fileItem, filename) {
        switch (action) {
            case 'view-image':
                this.openImageViewer(filename);
                break;
            case 'rename':
                this.makeFileEditable(fileItem, filename);
                break;
            case 'download':
                this.downloadFile(filename);
                break;
            case 'delete':
                this.deleteFile(fileItem, filename);
                break;
        }
    }

    handleFolderAction(action, folderItem, foldername) {
        switch (action) {
            case 'create-file':
                this.createFileInFolder(folderItem);
                break;
            case 'create-folder':
                this.createFolderInFolder(folderItem);
                break;
            case 'collapse-all':
                this.collapseAllSubfolders(folderItem);
                break;
            case 'rename':
                this.renameFolderInline(folderItem, foldername);
                break;
            case 'download-zip':
                this.downloadFolderAsZip(folderItem, foldername);
                break;
            case 'delete':
                this.deleteFolder(folderItem, foldername);
                break;
        }
    }

    downloadFile(filename) {
        const activeContent = document.querySelector(`[data-file="${filename}"].editor-content`);
        if (activeContent) {
            const codeInput = activeContent.querySelector('.code-input');
            const content = codeInput ? codeInput.value : '';

            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.addMessage(`✅ File "${filename}" downloaded successfully.`, 'assistant');
        }
    }

    deleteFile(fileItem, filename) {
        if (confirm(`Are you sure you want to delete "${filename}"?`)) {
            // Remove from files object
            delete this.files[filename];

            // Remove file item from tree
            fileItem.remove();

            // Close tab if open
            this.closeTab(filename);

            // Switch to another tab if this was the active one
            if (this.currentTab === filename) {
                const remainingTab = document.querySelector('.tab');
                if (remainingTab) {
                    this.switchTab(remainingTab.dataset.file);
                } else {
                    this.currentTab = null;
                }
            }

            this.addMessage(`🗑️ File "${filename}" deleted successfully.`, 'assistant');
        }
    }

    deleteFolder(folderItem, foldername) {
        // Count files and subfolders for confirmation
        const folderContent = folderItem.querySelector('.folder-content');
        let fileCount = 0;
        let folderCount = 0;

        if (folderContent) {
            fileCount = folderContent.querySelectorAll('.file-item').length;
            folderCount = folderContent.querySelectorAll('.folder-item').length;
        }

        let confirmMessage = `Are you sure you want to delete folder "${foldername}"?`;
        if (fileCount > 0 || folderCount > 0) {
            confirmMessage += `\n\nThis will also delete:`;
            if (fileCount > 0) confirmMessage += `\n• ${fileCount} file${fileCount !== 1 ? 's' : ''}`;
            if (folderCount > 0) confirmMessage += `\n• ${folderCount} subfolder${folderCount !== 1 ? 's' : ''}`;
        }

        if (confirm(confirmMessage)) {
            // Recursively handle all files and subfolders
            this.deleteFolderRecursive(folderItem);

            // Remove folder from tree
            folderItem.remove();

            const totalItems = fileCount + folderCount;
            if (totalItems > 0) {
                this.addMessage(`🗑️ Folder "${foldername}" and ${totalItems} item${totalItems !== 1 ? 's' : ''} deleted successfully.`, 'assistant');
            } else {
                this.addMessage(`🗑️ Folder "${foldername}" deleted successfully.`, 'assistant');
            }
        }
    }

    deleteFolderRecursive(folderItem) {
        const folderContent = folderItem.querySelector('.folder-content');
        if (!folderContent) return;

        // Delete all files in this folder
        const fileItems = folderContent.querySelectorAll('.file-item');
        fileItems.forEach(fileItem => {
            const filename = fileItem.dataset.file;
            if (filename) {
                // Remove from files object
                delete this.files[filename];
                // Close tab if open
                this.closeTab(filename);
            }
        });

        // Recursively delete all subfolders
        const subfolders = folderContent.querySelectorAll('.folder-item');
        subfolders.forEach(subfolder => {
            this.deleteFolderRecursive(subfolder);
        });
    }

    downloadFolderAsZip(folderItem, folderName) {
        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            this.addMessage('❌ ZIP functionality not available. Please refresh the page.', 'assistant');
            return;
        }

        // Collect all files and subfolders recursively
        const folderData = this.collectFolderContents(folderItem, folderName);

        if (folderData.files.length === 0) {
            this.addMessage(`📁 Folder "${folderName}" is empty - nothing to download.`, 'assistant');
            return;
        }

        // Show progress message
        this.addMessage(`📦 Creating ZIP archive for "${folderName}" with ${folderData.files.length} file(s)...`, 'assistant');

        // Create ZIP file using JSZip
        const zip = new JSZip();

        // Add each file to the ZIP
        folderData.files.forEach(file => {
            const content = file.content || '';
            zip.file(file.path, content);
        });

        // Generate ZIP file and download
        zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6
            }
        }).then((blob) => {
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${folderName}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.addMessage(`✅ Successfully downloaded "${folderName}.zip" with ${folderData.files.length} file(s).`, 'assistant');
        }).catch((error) => {
            console.error('Error creating ZIP file:', error);
            this.addMessage(`❌ Failed to create ZIP file: ${error.message}`, 'assistant');
        });
    }

    collectFolderContents(folderItem, basePath = '') {
        const folderContent = folderItem.querySelector('.folder-content');
        const result = { files: [] };

        if (!folderContent) return result;

        // Collect files in this folder
        const fileItems = folderContent.querySelectorAll(':scope > .file-item');
        fileItems.forEach(fileItem => {
            const filename = fileItem.dataset.file;
            if (filename) {
                const filePath = basePath ? `${basePath}/${filename}` : filename;
                const content = this.getFileContent(filename);
                result.files.push({
                    path: filePath,
                    name: filename,
                    content: content
                });
            }
        });

        // Recursively collect from subfolders
        const subfolders = folderContent.querySelectorAll(':scope > .folder-item');
        subfolders.forEach(subfolder => {
            const subfolderName = subfolder.querySelector('.folder-name')?.textContent;
            if (subfolderName) {
                const subPath = basePath ? `${basePath}/${subfolderName}` : subfolderName;
                const subResult = this.collectFolderContents(subfolder, subPath);
                result.files.push(...subResult.files);
            }
        });

        return result;
    }

    getFileContent(filename) {
        // Get content from active editor if it's the current file
        if (this.currentTab === filename) {
            return this.getCodeFromEditor();
        }

        // Get content from files object
        if (this.files[filename]) {
            return this.files[filename].content || '';
        }

        // Try to get content from inactive editor tab
        const editorContent = document.querySelector(`[data-file="${filename}"].editor-content`);
        if (editorContent) {
            const codeInput = editorContent.querySelector('.code-input');
            return codeInput ? codeInput.value : '';
        }

        return '';
    }

    switchTab(filename) {
        if (!filename) return;

        // Update tab appearance
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const targetTab = document.querySelector(`[data-file="${filename}"].tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Update editor content
        document.querySelectorAll('.editor-content').forEach(content => {
            content.classList.remove('active');
        });

        const targetContent = document.querySelector(`[data-file="${filename}"].editor-content`);
        if (targetContent) {
            targetContent.classList.add('active');
        }

        this.currentTab = filename;

        // Update file header
        this.updateFileHeader(filename);

        // Focus appropriate input
        const codeInput = targetContent?.querySelector('.code-input');
        if (codeInput) {
            codeInput.focus();
        }

        this.updateLineNumbers();
        this.updateCursorPosition();

        // Update run button for HTML files
        this.updateRunButtonForFileType(filename);
    }

    updateFileHeader(filename) {
        const headerInput = document.querySelector('.file-header-input');
        const headerIcon = document.querySelector('.file-header-icon');

        if (headerInput) {
            // Use custom heading if available, otherwise use filename
            const displayText = this.customHeadings && this.customHeadings[filename] 
                ? this.customHeadings[filename] 
                : filename;

            headerInput.value = displayText;
        }

        if (headerIcon) {
            // Update icon based on file extension
            const extension = filename.split('.').pop();
            const iconClass = this.getFileIcon(extension);
            const languageClass = this.getLanguageClass(filename);
            headerIcon.className = iconClass + ' file-header-icon';

            // Set language class for CSS styling
            const headerBar = headerIcon.closest('.file-header-bar');
            if (headerBar) {
                headerBar.dataset.language = languageClass;
            }
        }
    }

    updateRunButtonForFileType(filename) {
        const runButton = document.getElementById('runCode');
        const analyzeButton = document.getElementById('analyzeCode');
        if (!runButton || !analyzeButton) return;

        const fileExtension = filename ? filename.split('.').pop().toLowerCase() : '';

        // Handle visualization panel visibility
        this.updateVisualizationPanelVisibility(fileExtension);

        if (['txt'].includes(fileExtension)) {
            // Hide run button for txt files
            runButton.style.display = 'none';
            // Update analyze button to grammar analysis for txt files
            analyzeButton.innerHTML = '<i class="fas fa-spell-check"></i> Analyse Grammar';
            analyzeButton.title = 'Analyse grammar and writing suggestions';
        } else if (['css', 'scss', 'sass', 'less'].includes(fileExtension)) {
            // Hide run button for CSS files
            runButton.style.display = 'none';
            // Keep analyze button as default for CSS files
            analyzeButton.innerHTML = '<i class="fas fa-search"></i> Analyse';
            analyzeButton.title = 'Analyze Code';
        } else if (['html', 'htm', 'xhtml'].includes(fileExtension)) {
            // Update button for HTML files
            runButton.style.display = 'inline-flex';
            runButton.innerHTML = '<i class="fas fa-eye"></i> Preview';
            runButton.title = 'Preview HTML file';
            // Reset analyze button to default
            analyzeButton.innerHTML = '<i class="fas fa-search"></i> Analyse';
            analyzeButton.title = 'Analyze Code';
        } else if (['md', 'markdown'].includes(fileExtension)) {
            // Update button for Markdown files
            runButton.style.display = 'inline-flex';
            runButton.innerHTML = '<i class="fas fa-eye"></i> Preview';
            runButton.title = 'Preview Markdown file';
            // Reset analyze button to default
            analyzeButton.innerHTML = '<i class="fas fa-search"></i> Analyse';
            analyzeButton.title = 'Analyze Code';
        } else {
            // Default button for other files
            runButton.style.display = 'inline-flex';
            runButton.innerHTML = '<i class="fas fa-play"></i> Run';
            runButton.title = 'Run Code';
            // Reset analyze button to default
            analyzeButton.innerHTML = '<i class="fas fa-search"></i> Analyse';
            analyzeButton.title = 'Analyze Code';
        }
    }

    updateVisualizationPanelVisibility(fileExtension) {
        const visualizeTab = document.getElementById('visualizeTab');

        if (['txt', 'md', 'markdown'].includes(fileExtension)) {
            // Hide visualization tab for txt and markdown files
            if (visualizeTab) {
                visualizeTab.style.display = 'none';
            }

            // If visualization tab was active, switch to terminal tab
            if (visualizeTab && visualizeTab.classList.contains('active')) {
                this.switchTerminalTab('terminal');
            }
        } else {
            // Show visualization tab for other file types
            if (visualizeTab) {
                visualizeTab.style.display = 'flex';
            }
        }
    }

    closeTab(filename) {
        const tab = document.querySelector(`[data-file="${filename}"].tab`);
        const content = document.querySelector(`[data-file="${filename}"].editor-content`);

        if (tab) tab.remove();
        if (content) content.remove();

        // If closing active tab, switch to another tab
        if (this.currentTab === filename) {
            const remainingTab = document.querySelector('.tab');
            if (remainingTab) {
                this.switchTab(remainingTab.dataset.file);
            }
        }
    }

    switchBottomPanel(panelName) {
        // Update tab appearance
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const activeTab = document.querySelector(`[data-panel="${panelName}"].panel-tab`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Update panel content
        document.querySelectorAll('.panel-view').forEach(view => {
            view.classList.remove('active');
        });

        const activeView = document.querySelector(`[data-panel="${panelName}"].panel-view`);
        if (activeView) {
            activeView.classList.add('active');
        }
    }

    toggleFolder(folderItem) {
        folderItem.classList.toggle('expanded');
        const arrow = folderItem.querySelector('.folder-arrow');
        const icon = folderItem.querySelector('.folder-icon');
        const content = folderItem.querySelector('.folder-content');

        if (folderItem.classList.contains('expanded')) {
            arrow.classList.remove('fa-chevron-right');
            arrow.classList.add('fa-chevron-down');
            icon.classList.remove('fa-folder');
            icon.classList.add('fa-folder-open');
            if (content) {
                content.style.display = 'block';
            }
        } else {
            arrow.classList.remove('fa-chevron-down');
            arrow.classList.add('fa-chevron-right');
            icon.classList.remove('fa-folder-open');
            icon.classList.add('fa-folder');
            if (content) {
                content.style.display = 'none';
            }
        }
    }

    updateLineNumbers() {
        const activeContent = document.querySelector('.editor-content.active');
        if (!activeContent) return;

        const codeInput = activeContent.querySelector('.code-input');
        const lineNumbers = activeContent.querySelector('.line-numbers');

        if (!codeInput || !lineNumbers) return;

        const lines = codeInput.value.split('\n');
        const lineCount = Math.max(lines.length, 1);

        let numbersHTML = '';
        for (let i = 1; i <= lineCount; i++) {
            numbersHTML += i + '\n';
        }

        lineNumbers.textContent = numbersHTML;
    }

    syncLineNumbersScroll() {
        const activeContent = document.querySelector('.editor-content.active');
        if (!activeContent) return;

        const codeInput = activeContent.querySelector('.code-input');
        const lineNumbers = activeContent.querySelector('.line-numbers');

        if (codeInput && lineNumbers) {
            lineNumbers.scrollTop = codeInput.scrollTop;
        }
    }

    updateCursorPosition() {
        const activeContent = document.querySelector('.editor-content.active');
        if (!activeContent) return;

        const codeInput = activeContent.querySelector('.code-input');
        const cursorPos = document.getElementById('cursorPosition');

        if (!codeInput || !cursorPos) return;

        const start = codeInput.selectionStart;
        const value = codeInput.value;
        const lines = value.substring(0, start).split('\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;

        cursorPos.textContent = `Ln ${line}, Col ${col}`;
    }

    updateLineCount() {
        const activeContent = document.querySelector('.editor-content.active');
        if (!activeContent) return;

        const codeInput = activeContent.querySelector('.code-input');
        const lineCountEl = document.getElementById('lineCount');

        if (!codeInput || !lineCountEl) return;

        const lines = codeInput.value.split('\n').length;
        lineCountEl.textContent = `${lines} lines`;
    }

    handleCodeInputKeydown(e) {
        const codeInput = e.target;

        // Tab handling
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = codeInput.selectionStart;
            const end = codeInput.selectionEnd;
            const value = codeInput.value;

            // Insert 4 spaces
            codeInput.value = value.substring(0, start) + '    ' + value.substring(end);
            codeInput.selectionStart = codeInput.selectionEnd = start + 4;
            this.updateLineNumbers();
        }

        // Auto-indent on Enter
        if (e.key === 'Enter') {
            const start = codeInput.selectionStart;
            const value = codeInput.value;
            const lines = value.substring(0, start).split('\n');
            const currentLine = lines[lines.length - 1];

            // Get current indentation
            const indent = currentLine.match(/^\s*/)[0];
            let newIndent = indent;

            // Add extra indent for lines ending with ':'
            if (currentLine.trim().endsWith(':')) {
                newIndent += '    ';
            }

            if (newIndent) {
                e.preventDefault();
                const newValue = value.substring(0, start) + '\n' + newIndent + value.substring(start);
                codeInput.value = newValue;
                codeInput.selectionStart = codeInput.selectionEnd = start + 1 + newIndent.length;
                this.updateLineNumbers();
            }
        }
    }

    async sendMessage() {
        const chatInput = document.getElementById('chatInput');
        const messagesArea = document.getElementById('messagesArea');
        const sendButton = document.getElementById('sendMessage');

        if (!chatInput || !messagesArea) {
            console.error('Chat elements not found');
            return;
        }

        const message = chatInput.value.trim();
        if (!message || this.isTyping) return;

        // Disable send button
        if (sendButton) {
            sendButton.disabled = true;
        }

        // Add user message
        this.addMessage(message, 'user');
        chatInput.value = '';
        this.autoResizeChatInput();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    type: 'code'
                })
            });

            const data = await response.json();

            // Remove typing indicator
            this.hideTypingIndicator();

            // Handle successful responses (including rate limit fallbacks)
            if (data.response) {
                this.addMessage(data.response, 'assistant');

                // Handle learning mode suggestions
                if (data.is_learning_mode && data.suggested_topic) {
                    this.showLearningModeDialog(data.suggested_topic);
                }
            } else if (data.error) {
                // Handle error responses
                this.addMessage(`I'm experiencing some difficulties: ${data.error}. Please try again in a moment.`, 'assistant');
            } else {
                this.addMessage(`I received an unexpected response. Please try again.`, 'assistant');
            }
        } catch (error) {
            this.hideTypingIndicator();

            if (error.message.includes('Failed to fetch')) {
                this.addMessage('I\'m having trouble connecting. Please check your internet connection and try again.', 'assistant');
            } else {
                this.addMessage('Sorry, I encountered an error. Please try again in a moment.', 'assistant');
            }
            console.error('Chat error:', error);
        } finally {
            // Re-enable send button with small delay
            setTimeout(() => {
                if (sendButton) {
                    sendButton.disabled = false;
                }
            }, 1000); // 1 second delay to prevent spam
        }
    }

    addMessage(content, sender) {
        const messagesArea = document.getElementById('messagesArea');
        if (!messagesArea) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        const senderName = sender === 'assistant' ? 'Undrstanding AI' : 'You';

        // Process structured content for assistant messages
        let processedContent = content;
        if (sender === 'assistant') {
            processedContent = this.formatStructuredMessage(content);
        }

        const avatarContent = sender === 'assistant' ? 
            '<div class="avatar-mini assistant-avatar"></div>' : 
            '<div class="avatar-mini user-avatar"><i class="fas fa-user"></i></div>';

        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${avatarContent}
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    <div class="message-header">
                        <span class="message-sender">${senderName}</span>
                        <span class="message-time">${timeStr}</span>
                    </div>
                    <div class="message-text"></div>
                </div>
            </div>
        `;

        // Set the processed content as innerHTML to render HTML properly
        const messageTextEl = messageDiv.querySelector('.message-text');
        if (messageTextEl) {
            messageTextEl.innerHTML = processedContent;
        }

        messagesArea.appendChild(messageDiv);
        this.scrollChatToBottom();
    }

    formatStructuredMessage(content) {
        // Check for status indicators and format accordingly
        const lines = content.split('\n');

        if (lines.length > 0) {
            const firstLine = lines[0].trim();

            // Check for status indicators
            if (firstLine.includes('🟢') || firstLine.includes('🔴') || 
                firstLine.includes('🟡') || firstLine.includes('💡') || 
                firstLine.includes('📚') || firstLine.includes('💬')) {

                const statusLine = firstLine;
                const remainingContent = lines.slice(1).join('\n').trim();

                // Split remaining content into title and description if possible
                const contentParts = remainingContent.split('\n\n');

                if (contentParts.length >= 2) {
                    const title = contentParts[0].trim();
                    const description = contentParts.slice(1).join('\n').trim();

                    return `<div class="message-status-header">${statusLine}</div><div class="message-title">${title}</div><div class="message-description">${this.highlightCodeBlocks(description)}</div>`;
                } else if (remainingContent) {
                    return `<div class="message-status-header">${statusLine}</div><div class="message-description">${this.highlightCodeBlocks(remainingContent)}</div>`;
                } else {
                    return statusLine;
                }
            }
        }

        return this.highlightCodeBlocks(content);
    }

    highlightCodeBlocks(text) {
        // Handle code blocks with language specification or without
        const codeBlockRegex = /```(?:([\w-]+))?\n?([\s\S]*?)```/g;

        return text.replace(codeBlockRegex, (match, language, code) => {
            let highlightedCode;
            const lang = language ? language.toLowerCase() : 'python';

            switch (lang) {
                case 'html':
                case 'htm':
                case 'xml':
                    highlightedCode = this.highlightHTMLCode(code.trim());
                    break;
                case 'python':
                case 'py':
                default:
                    highlightedCode = this.highlightPythonCode(code.trim());
                    break;
            }

            return `<pre><code class="hljs ${lang}">${highlightedCode}</code></pre>`;
        });
    }

    highlightPythonCode(code) {
        // Escape HTML to prevent conflicts
        let highlighted = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Process strings and comments first to avoid highlighting keywords inside them
        const stringAndCommentRegex = /(["'](?:[^"'\\]|\\.)*["']|#.*$)/gm;
        const protectedParts = [];

        highlighted = highlighted.replace(stringAndCommentRegex, (match) => {
            const placeholder = `__PROTECTED_${protectedParts.length}__`;
            if (match.startsWith('#')) {
                protectedParts.push(`<span class="hljs-comment">${match}</span>`);
            } else {
                protectedParts.push(`<span class="hljs-string">${match}</span>`);
            }
            return placeholder;
        });

        // Keywords - avoid replacing if already inside a span
        const keywords = ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'break', 'continue', 'pass', 'lambda', 'and', 'or', 'not', 'is', 'in', 'True', 'False', 'None'];
        keywords.forEach(keyword => {
            const regex = new RegExp(`(?<!<[^>]*>)\\b(${keyword})\\b(?![^<]*>)`, 'g');
            highlighted = highlighted.replace(regex, '<span class="hljs-keyword">$1</span>');
        });

        // Built-in functions
        const builtins = ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'tuple', 'set', 'input', 'open', 'type', 'isinstance', 'hasattr', 'getattr', 'setattr'];
        builtins.forEach(builtin => {
            const regex = new RegExp(`(?<!<[^>]*>)\\b(${builtin})\\b(?![^<]*>)`, 'g');
            highlighted = highlighted.replace(regex, '<span class="hljs-built_in">$1</span>');
        });

        // Numbers
        highlighted = highlighted.replace(/(?<!<[^>]*>)\b(\d+(?:\.\d+)?)\b(?![^<]*>)/g, '<span class="hljs-number">$1</span>');

        // Function definitions
        highlighted = highlighted.replace(/(?<!<[^>]*>)\b(def\s+)(\w+)(?![^<]*>)/g, '$1<span class="hljs-function">$2</span>');

        // Variables in assignments (simple pattern)
        highlighted = highlighted.replace(/^(\s*)(\w+)(\s*=)(?![^<]*>)/gm, '$1<span class="hljs-variable">$2</span>$3');

        // Restore protected strings and comments
        protectedParts.forEach((part, index) => {
            highlighted = highlighted.replace(`__PROTECTED_${index}__`, part);
        });

        return highlighted;
    }

    highlightHTMLCode(code) {
        // Escape HTML to prevent conflicts
        let highlighted = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Highlight HTML comments
        highlighted = highlighted.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hljs-comment">$1</span>');

        // Highlight DOCTYPE declaration
        highlighted = highlighted.replace(/(&lt;!DOCTYPE[^&gt;]*&gt;)/gi, '<span class="hljs-meta">$1</span>');

        // Highlight HTML tags and attributes
        highlighted = highlighted.replace(/(&lt;\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z-]+(?:="[^"]*")?)*?)(\s*\/?&gt;)/g, (match, openBracket, tagName, attributes, closeBracket) => {
            let result = openBracket + `<span class="hljs-tag">${tagName}</span>`;

            // Highlight attributes
            if (attributes) {
                result += attributes.replace(/(\s+)([a-zA-Z-]+)(="([^"]*)")?/g, (attrMatch, space, attrName, fullValue, attrValue) => {
                    if (fullValue) {
                        return space + `<span class="hljs-attr">${attrName}</span>=<span class="hljs-string">"${attrValue}"</span>`;
                    } else {
                        return space + `<span class="hljs-attr">${attrName}</span>`;
                    }
                });
            }

            result += closeBracket;
            return result;
        });

        return highlighted;
    }

    showTypingIndicator() {
        this.isTyping = true;
        const messagesArea = document.getElementById('messagesArea');

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant-message';
        typingDiv.id = 'typingIndicator';

        typingDiv.innerHTML = `
            <div class="message-avatar">
                <div class="avatar-mini assistant-avatar"></div>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    Undrstanding AI is thinking
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;

        messagesArea.appendChild(typingDiv);
        this.scrollChatToBottom();
    }

    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    showLearningModeDialog(topic) {
        const shouldLearn = confirm(`Would you like to learn more about ${topic.replace('-', ' ')} or continue coding?`);

        if (shouldLearn) {
            window.open(`/docs/${topic}`, '_blank');
        }
    }

    async analyzeCode() {
        const activeContent = document.querySelector('.editor-content.active');
        if (!activeContent) {
            console.log('No active editor found');
            return;
        }

        const codeInput = activeContent.querySelector('.code-input');
        if (!codeInput) {
            console.log('No code input found');
            return;
        }

        const code = codeInput.value.trim();
        if (!code) {
            this.addMessage('Write some code first, then I can help you analyze it!', 'assistant');
            return;
        }

        this.addMessage('Analyzing code...', 'assistant');

        try {
            const response = await fetch('/api/analyze-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    language: 'python'
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.addMessage(data.analysis, 'assistant');

                // Show visualization if algorithm detected
                if (data.visualization) {
                    this.addMessage('🎯 Algorithm detected! Showing visualization...', 'assistant');
                    this.showVisualization(data.visualization.type, data.visualization.data);
                }

                // Show problems if any
                if (data.suggestions && data.suggestions.length > 0) {
                    this.showProblems(data.suggestions);
                }
            } else {
                this.addMessage(`Analysis failed: ${data.error}`, 'assistant');
            }
        } catch (error) {
            this.addMessage(`Analysis error: ${error.message}`, 'assistant');
        }
    }

    async analyzeCode() {
        const content = this.getCodeFromEditor();
        if (!content.trim()) {
            this.addMessage('Write some content first, then I can help you analyze it!', 'assistant');
            return;
        }

        const currentFile = this.currentTab;
        const fileExtension = currentFile ? currentFile.split('.').pop().toLowerCase() : '';

        // Check if it's a txt file for grammar analysis
        if (['txt'].includes(fileExtension)) {
            await this.analyzeGrammar(content, currentFile);
            return;
        }

        // Original code analysis for other file types
        const analyzeBtn = document.getElementById('analyzeCode');
        const editorArea = document.querySelector('.editor-area');

        if (analyzeBtn) {
            analyzeBtn.classList.add('analyzing');
            analyzeBtn.innerHTML = '<i class="fas fa-magic"></i> Analyzing...';
        }

        if (editorArea) {
            editorArea.classList.add('analyzing');
            this.createMagicalParticles(editorArea);
        }

        const magicalMessages = [
            '🔮 Awakening the AI spirits...',
            '✨ Casting analysis spells on your code...',
            '🧙‍♂️ Consulting the ancient algorithms...',
            '💫 Channeling computational magic...',
            '🌟 Weaving through your code patterns...',
            '🎭 Revealing hidden code secrets...'
        ];

        let messageIndex = 0;
        this.addMessage(magicalMessages[messageIndex], 'assistant');

        const messageInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % magicalMessages.length;
            const lastMessage = document.querySelector('.message.assistant-message:last-child .message-text');
            if (lastMessage) {
                lastMessage.innerHTML = magicalMessages[messageIndex];
            }
        }, 1500);

        try {
            const response = await fetch('/api/analyze-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: content,
                    language: 'python'
                })
            });

            const data = await response.json();

            clearInterval(messageInterval);

            if (response.ok) {
                const lastMessage = document.querySelector('.message.assistant-message:last-child .message-text');
                if (lastMessage) {
                    lastMessage.innerHTML = '🎉 <strong>Analysis Complete!</strong> The AI has spoken...';
                }

                setTimeout(() => {
                    this.addMessage(data.analysis, 'assistant');
                }, 1000);

                if (data.suggestions && data.suggestions.length > 0) {
                    this.showProblems(data.suggestions);
                }
            } else {
                const lastMessage = document.querySelector('.message.assistant-message:last-child .message-text');
                if (lastMessage) {
                    lastMessage.innerHTML = `🔴 <strong>Analysis Spell Failed:</strong> ${data.error}`;
                }
            }
        } catch (error) {
            clearInterval(messageInterval);
            const lastMessage = document.querySelector('.message.assistant-message:last-child .message-text');
            if (lastMessage) {
                lastMessage.innerHTML = `⚡ <strong>Magical Interference Detected:</strong> ${error.message}`;
            }
        } finally {
            setTimeout(() => {
                if (analyzeBtn) {
                    analyzeBtn.classList.remove('analyzing');
                    const buttonText = ['txt'].includes(fileExtension) ? 
                        '<i class="fas fa-spell-check"></i> Analyse Grammar' : 
                        '<i class="fas fa-search"></i> Analyse';
                    analyzeBtn.innerHTML = buttonText;
                }

                if (editorArea) {
                    editorArea.classList.remove('analyzing');
                    this.removeMagicalParticles(editorArea);
                }
            }, 2000);
        }
    }

    createMagicalParticles(container) {
        const particleContainer = document.createElement('div');
        particleContainer.className = 'ai-magic-particles';
        container.appendChild(particleContainer);

        // Create 35 magical particles
        for (let i = 0; i < 35; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'magic-particle';

                // Random horizontal position
                particle.style.left = Math.random() * 100 + '%';

                // Random animation delay
                particle.style.animationDelay = Math.random() * 2 + 's';

                particleContainer.appendChild(particle);

                // Remove particle after animation
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.remove();
                    }
                }, 4000);
            }, i * 100); // Stagger particle creation
        }
    }

    removeMagicalParticles(container) {
        const particleContainer = container.querySelector('.ai-magic-particles');
        if (particleContainer) {
            particleContainer.style.opacity = '0';
            setTimeout(() => {
                if (particleContainer.parentNode) {
                    particleContainer.remove();
                }
            }, 500);
        }
    }

    createExecutionOverlay() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        // Remove existing overlay if present
        const existingOverlay = document.querySelector('.execution-navbar');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Create execution navigation bar
        const navBar = document.createElement('div');
        navBar.className = 'execution-navbar';
        navBar.innerHTML = `
            <div class="execution-nav-left">
                <div class="execution-status-indicator">
                    <div class="status-icon"></div>
                    <span>Code Walkthrough Active</span>
                </div>
                <div class="execution-progress-info">
                    <span class="step-label">Step</span>
                    <span class="current-step">1</span>
                    <span class="step-separator">of</span>
                    <span class="total-steps">${this.executionState.lines.length}</span>
                </div>
            </div>

            <div class="execution-nav-center">
                <div class="execution-progress-bar">
                    <div class="progress-fill" style="width: ${(1 / this.executionState.lines.length) * 100}%"></div>
                </div>
                <div class="execution-line-info">
                    <span class="current-line-text">Ready to begin code walkthrough</span>
                </div>
            </div>

            <div class="execution-nav-right">
                <button class="execution-nav-btn restart-btn" id="restartExecutionBtn" title="Restart walkthrough">
                    <i class="fas fa-redo"></i>
                    <span>Restart</span>
                </button>
                <button class="execution-nav-btn prev-btn" id="prevStepBtn" title="Previous step" disabled>
                    <i class="fas fa-chevron-left"></i>
                    <span>Previous</span>
                </button>
                <button class="execution-nav-btn next-btn primary" id="nextStepBtn" title="Next step">
                    <i class="fas fa-chevron-right"></i>
                    <span>Next Step</span>
                </button>
                <button class="execution-nav-btn stop-btn" id="stopExecutionBtn" title="Stop walkthrough">
                    <i class="fas fa-times"></i>
                    <span>Stop</span>
                </button>
            </div>
        `;

        // Insert navigation bar at the top of main content (after tab bar)
        const tabBar = mainContent.querySelector('.tab-bar');
        if (tabBar) {
            mainContent.insertBefore(navBar, tabBar.nextSibling);
        } else {
            mainContent.insertBefore(navBar, mainContent.firstChild);
        }

        // Enable execution mode on the code editor
        const activeContent = document.querySelector('.editor-content.active');
        if (activeContent) {
            const codeEditor = activeContent.querySelector('.code-editor');
            if (codeEditor) {
                codeEditor.classList.add('execution-mode');
            }
        }

        // Add event listeners
        document.getElementById('nextStepBtn').addEventListener('click', () => {
            this.nextStep();
        });

        document.getElementById('prevStepBtn').addEventListener('click', () => {
            this.prevStep();
        });

        document.getElementById('restartExecutionBtn').addEventListener('click', () => {
            this.restartExecution();
        });

        document.getElementById('stopExecutionBtn').addEventListener('click', () => {
            this.stopExecution();
        });
    }

    executeCurrentStep() {
        if (!this.executionState.isActive || this.executionState.currentStep >= this.executionState.lines.length) {
            this.completeExecution();
            return;
        }

        const currentLine = this.executionState.lines[this.executionState.currentStep];
        const explanation = this.generateLineExplanation(currentLine, this.executionState.currentStep);

        // Update navigation bar
        this.updateExecutionNavBar();

        // Highlight current line in editor
        this.highlightExecutionLine(this.executionState.currentStep);

        // Show explanation
        this.showLineExplanation(explanation, this.executionState.currentStep);

        // Update variables state (simplified simulation)
        this.updateVariableState(currentLine);
    }

    updateExecutionNavBar() {
        const currentStepEl = document.querySelector('.current-step');
        const progressFill = document.querySelector('.progress-fill');
        const currentLineText = document.querySelector('.current-line-text');
        const prevBtn = document.getElementById('prevStepBtn');
        const nextBtn = document.getElementById('nextStepBtn');

        if (currentStepEl) {
            currentStepEl.textContent = this.executionState.currentStep + 1;
        }

        if (progressFill) {
            const progressPercent = ((this.executionState.currentStep + 1) / this.executionState.lines.length) * 100;
            progressFill.style.width = progressPercent + '%';
        }

        if (currentLineText) {
            const currentLine = this.executionState.lines[this.executionState.currentStep];
            currentLineText.textContent = `Analyzing: ${currentLine.trim()}`;
        }

        // Update button states
        if (prevBtn) {
            prevBtn.disabled = this.executionState.currentStep === 0;
        }

        if (nextBtn) {
            const isLastStep = this.executionState.currentStep >= this.executionState.lines.length - 1;
            nextBtn.disabled = isLastStep;
            if (isLastStep) {
                nextBtn.innerHTML = '<i class="fas fa-check"></i><span>Complete</span>';
            } else {
                nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i><span>Next Step</span>';
            }
        }
    }

    generateLineExplanation(line, stepNumber) {
        const trimmedLine = line.trim();

        // Variable assignment
        if (trimmedLine.includes('=') && !trimmedLine.includes('==') && !trimmedLine.includes('!=') && !trimmedLine.includes('<=') && !trimmedLine.includes('>=') && !trimmedLine.includes('in')) {
            const parts = trimmedLine.split('=');
            const varName = parts[0].trim();
            const value = parts[1].trim();

            if (value.includes('input(')) {
                const promptMatch = value.match(/input\(['"]([^'"]*)['"]\)/);
                const prompt = promptMatch ? promptMatch[1] : '';
                return {
                    title: `Variable Assignment with User Input`,
                    description: `This line prompts the user for input${prompt ? ` with the message "${prompt}"` : ''} and stores the entered value in the variable '${varName}'. The input will be treated as a string by default.`,
                    technical: `Python's input() function always returns a string, even if numbers are entered.`
                };
            } else if (!isNaN(value)) {
                return {
                    title: `Numeric Variable Assignment`,
                    description: `The variable '${varName}' is being assigned the numeric value ${value}. This creates a new variable in memory that stores this number.`,
                    technical: `In Python, numbers are automatically typed as int or float based on their format.`
                };
            } else if (value.startsWith('"') || value.startsWith("'")) {
                return {
                    title: `String Variable Assignment`,
                    description: `The variable '${varName}' is being assigned the text value ${value}. String literals in Python can use either single or double quotes.`,
                    technical: `Strings are immutable objects in Python, meaning they cannot be changed after creation.`
                };
            } else if (value.includes('+') || value.includes('-') || value.includes('*') || value.includes('/')) {
                return {
                    title: `Mathematical Expression Assignment`,
                    description: `This line evaluates the mathematical expression '${value}' and stores the calculated result in the variable '${varName}'. The computation happens first, then the result is assigned.`,
                    technical: `Python follows standard order of operations (PEMDAS) when evaluating expressions.`
                };
            } else {
                return {
                    title: `Variable Assignment`,
                    description: `The variable '${varName}' is being assigned the value '${value}'. This could be referencing another variable or calling a function.`,
                    technical: `Variable names in Python are case-sensitive and follow specific naming conventions.`
                };
            }
        }

        // Print statements
        if (trimmedLine.startsWith('print(')) {
            const content = trimmedLine.match(/print\((.*)\)/)?.[1] || '';
            return {
                title: `Console Output`,
                description: `This line displays the value of ${content} to the console. The print() function converts the input to a string and outputs it to the terminal.`,
                technical: `print() automatically adds a newline character at the end unless specified otherwise.`
            };
        }

        // If statements
        if (trimmedLine.startsWith('if ')) {
            const condition = trimmedLine.replace('if ', '').replace(':', '');
            return {
                title: `Conditional Statement`,
                description: `This line begins an if statement that checks whether the condition '${condition}' evaluates to True. If the condition is met, the code block below will execute.`,
                technical: `Python uses truthiness - values like 0, empty strings, and None evaluate to False.`
            };
        }

        // Elif statements
        if (trimmedLine.startsWith('elif ')) {
            const condition = trimmedLine.replace('elif ', '').replace(':', '');
            return {
                title: `Alternative Conditional`,
                description: `This elif (else if) statement provides an alternative condition '${condition}' to check if the previous if/elif conditions were False.`,
                technical: `elif statements are only evaluated if all previous conditions in the chain were False.`
            };
        }

        // Else statements
        if (trimmedLine.startsWith('else:')) {
            return {
                title: `Default Case`,
                description: `This else block will execute only if all previous if and elif conditions in this conditional chain evaluated to False. It serves as the default action.`,
                technical: `An else block is optional and can only appear once at the end of an if-elif chain.`
            };
        }

        // For loops
        if (trimmedLine.startsWith('for ')) {
            const loopMatch = trimmedLine.match(/for (\w+) in (.+):/);
            const loopVar = loopMatch ? loopMatch[1] : 'variable';
            const iterable = loopMatch ? loopMatch[2] : 'collection';
            return {
                title: `For Loop Initialization`,
                description: `This starts a for loop where the variable '${loopVar}' will take on each value from ${iterable} one at a time. The code block below will execute once for each item.`,
                technical: `For loops in Python work with any iterable object (lists, strings, ranges, etc.).`
            };
        }

        // While loops
        if (trimmedLine.startsWith('while ')) {
            const condition = trimmedLine.replace('while ', '').replace(':', '');
            return {
                title: `While Loop Initialization`,
                description: `This starts a while loop that will continue executing the code block below as long as the condition '${condition}' remains True. The condition is checked before each iteration.`,
                technical: `Be careful with while loops to avoid infinite loops by ensuring the condition eventually becomes False.`
            };
        }

        // Function definitions
        if (trimmedLine.startsWith('def ')) {
            const funcMatch = trimmedLine.match(/def (\w+)\((.*)\):/);
            const funcName = funcMatch ? funcMatch[1] : 'function';
            const params = funcMatch ? funcMatch[2] : '';
            return {
                title: `Function Definition`,
                description: `This line defines a new function named '${funcName}'${params ? ` that accepts parameters: ${params}` : ' with no parameters'}. The function code will be in the indented block below.`,
                technical: `Functions are first-class objects in Python and can be assigned to variables or passed as arguments.`
            };
        }

        // Function calls
        if (trimmedLine.includes('()') && !trimmedLine.includes('=')) {
            const funcName = trimmedLine.match(/(\w+)\(/)?.[1] || 'function';
            return {
                title: `Function Call`,
                description: `This line calls the function '${funcName}', executing all the code defined within that function. Control will return here after the function completes.`,
                technical: `Function calls create a new scope and may return a value that can be used or ignored.`
            };
        }

        // Return statements
        if (trimmedLine.startsWith('return ')) {
            const returnValue = trimmedLine.replace('return ', '');
            return {
                title: `Function Return`,
                description: `This line exits the current function and sends the value '${returnValue}' back to wherever the function was called from.`,
                technical: `Functions without explicit return statements automatically return None.`
            };
        }

        // Import statements
        if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('from ')) {
            const moduleMatch = trimmedLine.match(/(?:import|from)\s+(\w+)/);
            const moduleName = moduleMatch ? moduleMatch[1] : 'module';
            return {
                title: `Module Import`,
                description: `This line imports functionality from the '${moduleName}' module, making its functions and classes available for use in this program.`,
                technical: `Python's import system follows the module search path and caches imported modules for efficiency.`
            };
        }

        // Generic fallback
        return {
            title: `Code Execution`,
            description: `Executing the statement: ${trimmedLine}`,
            technical: `This line performs a specific operation as part of the program's logic flow.`
        };
    }

    highlightExecutionLine(stepNumber) {
        const activeContent = document.querySelector('.editor-content.active');
        const codeInput = activeContent?.querySelector('.code-input');

        if (!codeInput) return;

        // Remove previous highlights and explanations
        const existingHighlights = activeContent.querySelectorAll('.execution-line-highlight');
        const existingExplanations = activeContent.querySelectorAll('.line-explanation');
        existingHighlights.forEach(highlight => highlight.remove());
        existingExplanations.forEach(explanation => explanation.remove());

        // Find the actual line number in the original code
        const allLines = codeInput.value.split('\n');
        const executableLines = this.executionState.lines;
        const currentExecutableLine = executableLines[stepNumber];

        let actualLineNumber = -1;
        for (let i = 0; i < allLines.length; i++) {
            if (allLines[i].trim() === currentExecutableLine.trim()) {
                actualLineNumber = i;
                break;
            }
        }

        if (actualLineNumber >= 0) {
            // Get computed line height from the actual textarea
            const computedStyle = window.getComputedStyle(codeInput);
            const lineHeight = parseFloat(computedStyle.lineHeight) || 21;
            const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

            // Calculate position based on actual line metrics
            const topPosition = paddingTop + (actualLineNumber * lineHeight);

            // Create highlight element
            const highlight = document.createElement('div');
            highlight.className = 'execution-line-highlight';
            highlight.style.cssText = `
                position: absolute;
                left: 0;
                right: 0;
                background: rgba(255, 193, 7, 0.2);
                border-left: 3px solid #ffc107;
                pointer-events: none;
                z-index: 5;
                top: ${topPosition}px;
                height: ${lineHeight}px;
            `;

            // Add to code input container
            const container = codeInput.parentElement;
            container.style.position = 'relative';
            container.appendChild(highlight);

            // Create floating explanation modal instead of inline
            this.createInlineExplanation(currentExecutableLine, stepNumber, actualLineNumber, lineHeight);
        }
    }

    createInlineExplanation(currentLine, stepNumber, actualLineNumber, lineHeight) {
        const explanation = this.generateLineExplanation(currentLine, stepNumber);
        const activeContent = document.querySelector('.editor-content.active');
        const codeInputContainer = activeContent?.querySelector('.code-input-container');

        if (!codeInputContainer) return;

        // Remove any existing inline explanations
        const existingExplanations = codeInputContainer.querySelectorAll('.inline-explanation');
        existingExplanations.forEach(exp => exp.remove());

        // Calculate position for inline explanation
        const codeInput = codeInputContainer.querySelector('.code-input');
        const computedStyle = window.getComputedStyle(codeInput);
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;

        // Get editor bounds to ensure modal fits within visible area
        const editorRect = codeInputContainer.getBoundingClientRect();
        const terminalHeight = 200; // Terminal height
        const availableHeight = window.innerHeight - terminalHeight - 100; // Account for nav bars

        // Position the explanation below the highlighted line
        let topPosition = paddingTop + ((actualLineNumber + 1) * lineHeight);

        // Calculate if explanation would go below visible area
        const explanationEstimatedHeight = 120; // Estimated height of explanation
        const maxTopPosition = availableHeight - explanationEstimatedHeight - 50;

        // If explanation would be hidden, position it above the line instead
        if (topPosition > maxTopPosition) {
            topPosition = Math.max(paddingTop + (actualLineNumber * lineHeight) - explanationEstimatedHeight - 10, paddingTop + 10);
        }

        // Create minimalistic inline explanation
        const explanationDiv = document.createElement('div');
        explanationDiv.className = 'inline-explanation';
        explanationDiv.style.cssText = `
            position: absolute;
            left: ${paddingLeft}px;
            right: 20px;
            top: ${topPosition}px;
            max-height: 200px;
            overflow-y: auto;
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 4px;
            padding: 8px 12px;
            font-family: var(--font-sans);
            font-size: 12px;
            color: var(--editor-text);
            z-index: 1000;
            animation: slideInExplanation 0.3s ease-out;
            margin-top: 4px;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        explanationDiv.innerHTML = `
            <div class="explanation-content-inline">
                <div class="explanation-header-inline">
                    <span class="step-badge">Step ${stepNumber + 1}</span>
                    <span class="explanation-title-inline">${explanation.title}</span>
                </div>
                <div class="explanation-text-inline">
                    ${explanation.description}
                </div>
                <div class="explanation-controls-inline">
                    <button class="inline-nav-btn" id="inlinePrevBtn" ${stepNumber === 0 ? 'disabled' : ''} title="Previous step">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span class="step-info">${stepNumber + 1} / ${this.executionState.lines.length}</span>
                    <button class="inline-nav-btn" id="inlineNextBtn" ${stepNumber >= this.executionState.lines.length - 1 ? 'disabled' : ''} title="${stepNumber >= this.executionState.lines.length - 1 ? 'Complete' : 'Next step'}">
                        ${stepNumber >= this.executionState.lines.length - 1 ? '<i class="fas fa-check"></i>' : '<i class="fas fa-chevron-right"></i>'}
                    </button>
                </div>
            </div>
        `;

        // Add to container
        codeInputContainer.appendChild(explanationDiv);

        // Add event listeners
        const prevBtn = explanationDiv.querySelector('#inlinePrevBtn');
        const nextBtn = explanationDiv.querySelector('#inlineNextBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.prevStep();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (stepNumber >= this.executionState.lines.length - 1) {
                    this.completeExecution();
                } else {
                    this.nextStep();
                }
            });
        }

        // Auto-hide after 10 seconds (optional)
        setTimeout(() => {
            if (explanationDiv.parentNode) {
                explanationDiv.style.opacity = '0.7';
            }
        }, 8000);
    }

    showLineExplanation(explanation, stepNumber) {
        // This method is now handled by highlightExecutionLine
        // Keep for backward compatibility but functionality moved
    }

    updateVariableState(line) {
        // Simple variable tracking (basic simulation)
        if (line.includes('=') && !line.includes('==')) {
            const parts = line.split('=');
            const varName = parts[0].trim();
            const value = parts[1].trim();

            if (!isNaN(value)) {
                this.executionState.variables[varName] = parseInt(value);
            } else if (value.startsWith('"') || value.startsWith("'")) {
                this.executionState.variables[varName] = value;
            } else {
                this.executionState.variables[varName] = value;
            }
        }
    }

    formatVariableState() {
        const vars = this.executionState.variables;
        if (Object.keys(vars).length === 0) {
            return '<em>No variables yet</em>';
        }

        return Object.entries(vars)
            .map(([name, value]) => `${name} = ${value}`)
            .join(', ');
    }

    nextStep() {
        if (!this.executionState.isActive) return;

        this.executionState.currentStep++;
        this.executeCurrentStep();
    }

    prevStep() {
        if (!this.executionState.isActive || this.executionState.currentStep <= 0) return;

        this.executionState.currentStep--;
        this.executeCurrentStep();
    }

    restartExecution() {
        if (!this.executionState.isActive) return;

        this.executionState.currentStep = 0;
        this.executionState.variables = {};
        this.executeCurrentStep();

        this.addMessage('🔄 Execution restarted from the beginning.', 'assistant');
    }

    stopExecution() {
        this.executionState.isActive = false;

        // Remove navigation bar
        const navBar = document.querySelector('.execution-navbar');
        if (navBar) {
            navBar.remove();
        }

        // Remove execution mode from code editor
        const activeContent = document.querySelector('.editor-content.active');
        if (activeContent) {
            const codeEditor = activeContent.querySelector('.code-editor');
            if (codeEditor) {
                codeEditor.classList.remove('execution-mode');
            }
        }

        // Remove highlights and explanations
        const highlights = document.querySelectorAll('.execution-line-highlight');
        const explanations = document.querySelectorAll('.line-explanation');
        const inlineExplanations = document.querySelectorAll('.inline-explanation');
        const explanationPanel = document.querySelector('.execution-explanation-panel');

        highlights.forEach(highlight => highlight.remove());
        explanations.forEach(explanation => explanation.remove());
        inlineExplanations.forEach(explanation => explanation.remove());
        if (explanationPanel) {
            explanationPanel.remove();
        }

        // Clear any execution state
        this.executionState = null;

        this.addMessage('Step-by-step execution stopped.', 'assistant');
    }

    completeExecution() {
        this.addMessage('Code walkthrough completed successfully! You have analyzed every executable line in your program.', 'assistant');

        // Update navigation bar for completion
        const statusIndicator = document.querySelector('.execution-status-indicator');
        const currentLineText = document.querySelector('.current-line-text');
        const nextBtn = document.getElementById('nextStepBtn');
        const progressFill = document.querySelector('.progress-fill');

        if (statusIndicator) {
            statusIndicator.innerHTML = '<div class="status-icon complete"></div><span>Walkthrough Complete</span>';
            statusIndicator.style.color = 'var(--green)';
        }

        if (currentLineText) {
            currentLineText.textContent = 'All code lines have been analyzed successfully';
        }

        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.innerHTML = '<i class="fas fa-check"></i><span>Complete</span>';
        }

        if (progressFill) {
            progressFill.style.width = '100%';
            progressFill.style.backgroundColor = 'var(--green)';
        }

        // Remove current line highlight and explanation after a delay
        setTimeout(() => {
            const highlights = document.querySelectorAll('.execution-line-highlight');
            const explanations = document.querySelectorAll('.line-explanation');
            const inlineExplanations = document.querySelectorAll('.inline-explanation');
            const explanationPanel = document.querySelector('.execution-explanation-panel');
            highlights.forEach(highlight => highlight.remove());
            explanations.forEach(explanation => explanation.remove());
            inlineExplanations.forEach(explanation => explanation.remove());
            if (explanationPanel) {
                explanationPanel.remove();
            }
        }, 5000);
    }

    startStepByStepExecution() {
        const code = this.getCodeFromEditor();
        if (!code.trim()) {
            this.addMessage('Write some code first, then I can start the walkthrough!', 'assistant');
            return;
        }

        this.addMessage('🚀 Starting step-by-step code walkthrough...', 'assistant');

        // Parse code into executable lines
        const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));

        if (lines.length === 0) {
            this.addMessage('No executable code found. Add some Python statements to analyze.', 'assistant');
            return;
        }

        // Initialize execution state
        this.executionState = {
            lines: lines,
            currentStep: 0,
            variables: {},
            isActive: true
        };

        // Add execution overlay to editor
        this.createExecutionOverlay();

        // Start with first line
        this.executeCurrentStep();
    }

    async generateVisualization() {
        const code = this.getCodeFromEditor();
        if (!code.trim()) {
            this.addMessage('Write some sorting or searching code first, then I can visualize it!', 'assistant');
            return;
        }

        // Check for code errors first by running the code
        try {
            const response = await fetch('/api/run-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    language: 'python'
                })
            });

            const result = await response.json();

            // If there are errors, show message and don't proceed with visualization
            if (!result.success) {
                this.addMessage('⚠️ Please fix the errors in your code before generating visualization. Check the terminal for error details.', 'assistant');
                this.showTerminalOutput(`Error: ${result.error}`, 'error');
                return null;
            }
        } catch (error) {
            this.addMessage('⚠️ Unable to validate your code. Please check for errors before visualizing.', 'assistant');
            return null;
        }

        // Show loading animation in terminal visualization
        this.showVisualizationLoading();
        this.addMessage('🎯 Generating visualization...', 'assistant');

        try {
            const response = await fetch('/api/analyze-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    language: 'python'
                })
            });

            const data = await response.json();

            // Hide loading animation
            this.hideVisualizationLoading();

            if (response.ok) {
                // Show visualization if algorithm detected
                if (data.visualization) {
                    this.addMessage('🎯 Algorithm detected! Showing visualization...', 'assistant');
                    return data.visualization; // Return visualization data
                } else {
                    return null;
                }
            } else {
                this.addMessage(`Visualization failed: ${data.error}`, 'assistant');
                return null;
            }
        } catch (error) {
            this.hideVisualizationLoading();
            this.addMessage(`Visualization error: ${error.message}`, 'assistant');
            return null;
        }
    }

    async runCode() {
        const code = this.getCodeFromEditor();

        if (!code.trim()) {
            // Switch to terminal tab first, then show error
            this.switchTerminalTab('terminal');
            this.showTerminalOutput('Error: Please write some code first before running.', 'error');
            return;
        }

        // Check if current file is HTML, Markdown, or txt
        const currentFile = this.currentTab;
        const fileExtension = currentFile ? currentFile.split('.').pop().toLowerCase() : '';

        if (['txt'].includes(fileExtension)) {
            // Handle txt file grammar analysis
            await this.analyzeGrammar(code, currentFile);
            return;
        } else if (['html', 'htm', 'xhtml'].includes(fileExtension)) {
            // Handle HTML file preview
            await this.runHTMLFile(code, currentFile);
            return;
        } else if (['md', 'markdown'].includes(fileExtension)) {
            // Handle Markdown file preview
            await this.runMarkdownFile(code, currentFile);
            return;
        }

        // Always switch to terminal tab when running code
        this.switchTerminalTab('terminal');

        // Clear terminal and show running status
        this.clearTerminal();
        this.showTerminalOutput('Running Python code...', 'info');

        try {
            // Check if code contains input() calls
            const hasInput = code.includes('input(');

            if (hasInput) {
                // Handle interactive execution
                await this.runInteractiveCode(code);
            } else {
                // Handle regular execution
                const response = await fetch('/api/run-code', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code: code,
                        language: 'python'
                    })
                });

                const result = await response.json();

                if (result.success) {
                    if (result.output) {
                        this.showTerminalOutput(result.output, 'success');
                    } else {
                        this.showTerminalOutput('Code executed successfully (no output)', 'success');
                    }
                } else {
                    // Show error in terminal with Ask AI button
                    this.showErrorWithAskAIButton(result.error);
                }
            }
        } catch (error) {
            const errorMsg = `Network Error: ${error.message}`;
            this.showErrorWithAskAIButton(errorMsg);
        }
    }

    async runHTMLFile(htmlContent, filename) {
        // Switch to terminal tab and show status
        this.switchTerminalTab('terminal');
        this.clearTerminal();
        this.showTerminalOutput(`Opening HTML preview for ${filename}...`, 'info');

        try {
            const response = await fetch('/api/preview-html', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: htmlContent,
                    filename: filename
                })
            });

            const result = await response.json();

            if (result.success) {
                // Open preview in new window/tab
                window.open(result.preview_url, '_blank', 'width=1024,height=768,scrollbars=yes,resizable=yes');
                this.showTerminalOutput(`✓ HTML preview opened in new window`, 'success');
                this.showTerminalOutput(`Preview URL: ${result.preview_url}`, 'info');

                // Add message to chat
                this.addMessage(`🌐 HTML file "${filename}" opened in preview. The preview window should open automatically.`, 'assistant');
            } else {
                this.showTerminalOutput(`Error: ${result.error}`, 'error');
                this.addMessage(`❌ Failed to preview HTML file: ${result.error}`, 'assistant');
            }
        } catch (error) {
            const errorMsg = `Preview Error: ${error.message}`;
            this.showTerminalOutput(errorMsg, 'error');
            this.addMessage(`❌ Failed to preview HTML file: ${error.message}`, 'assistant');
        }
    }

    async runMarkdownFile(markdownContent, filename) {
        // Switch to terminal tab and show status
        this.switchTerminalTab('terminal');
        this.clearTerminal();
        this.showTerminalOutput(`Opening Markdown preview for ${filename}...`, 'info');

        try {
            const response = await fetch('/api/preview-markdown', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: markdownContent,
                    filename: filename
                })
            });

            const result = await response.json();

            if (result.success) {
                // Open preview in new window/tab
                window.open(result.preview_url, '_blank', 'width=1024,height=768,scrollbars=yes,resizable=yes');
                this.showTerminalOutput(`✓ Markdown preview opened in new window`, 'success');
                this.showTerminalOutput(`Preview URL: ${result.preview_url}`, 'info');

                // Add message to chat
                this.addMessage(`📝 Markdown file "${filename}" opened in preview. The preview window should open automatically.`, 'assistant');
            } else {
                this.showTerminalOutput(`Error: ${result.error}`, 'error');
                this.addMessage(`❌ Failed to preview Markdown file: ${result.error}`, 'assistant');
            }
        } catch (error) {
            const errorMsg = `Preview Error: ${error.message}`;
            this.showTerminalOutput(errorMsg, 'error');
            this.addMessage(`❌ Failed to preview Markdown file: ${error.message}`, 'assistant');
        }
    }

    async analyzeGrammar(textContent, filename) {
        // Switch to terminal tab and show status
        this.switchTerminalTab('terminal');
        this.clearTerminal();
        this.showTerminalOutput(`Analyzing grammar for ${filename}...`, 'info');

        try {
            // Add analyzing message to chat
            this.addMessage(`📝 Analyzing grammar and writing quality for "${filename}"...`, 'assistant');

            const response = await fetch('/api/analyze-grammar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: textContent,
                    filename: filename
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showTerminalOutput(`✓ Grammar analysis completed`, 'success');
                this.showTerminalOutput(`Found ${result.suggestions_count || 0} suggestions`, 'info');

                // Add detailed analysis to chat
                this.addMessage(result.analysis, 'assistant');

                // Show suggestions in problems panel if any
                if (result.suggestions && result.suggestions.length > 0) {
                    this.showProblems(result.suggestions);
                    this.switchBottomPanel('problems');
                }
            } else {
                this.showTerminalOutput(`Error: ${result.error}`, 'error');
                this.addMessage(`❌ Failed to analyze grammar: ${result.error}`, 'assistant');
            }
        } catch (error) {
            const errorMsg = `Grammar Analysis Error: ${error.message}`;
            this.showTerminalOutput(errorMsg, 'error');
            this.addMessage(`❌ Failed to analyze grammar: ${error.message}`, 'assistant');
        }
    }

    async runInteractiveCode(code) {
        this.showTerminalOutput('Interactive mode: Code requires user input', 'info');

        try {
            // Collect all inputs first
            const inputMatches = code.match(/input\([^)]*\)/g) || [];
            const userInputs = [];

            if (inputMatches.length > 0) {
                for (let i = 0; i < inputMatches.length; i++) {
                    const match = inputMatches[i];
                    const promptMatch = match.match(/input\(['"]([^'"]*)['"]\)/);
                    const prompt = promptMatch ? promptMatch[1] : 'Enter input: ';

                    this.showTerminalOutput(prompt, 'info');
                    const userInput = await this.showTerminalInput(prompt);
                    userInputs.push(userInput);
                    this.showTerminalOutput(`Received: ${userInput}`, 'success');
                }
            }

            // Send code with collected inputs to backend
            const response = await fetch('/api/run-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    language: 'python',
                    interactive: true,
                    inputs: userInputs
                })
            });

            const result = await response.json();

            if (result.success) {
                if (result.output) {
                    this.showTerminalOutput(result.output, 'success');
                } else {
                    this.showTerminalOutput('Interactive code executed successfully', 'success');
                }
            } else {
                this.showErrorWithAskAIButton(result.error);
            }
        } catch (error) {
            const errorMsg = `Interactive execution error: ${error.message}`;
            this.showErrorWithAskAIButton(errorMsg);
        }
    }

    showErrorWithAskAIButton(errorMessage) {
        // Parse and highlight error lines
        this.highlightErrorLines(errorMessage);

        // Store the error message for later use
        this.lastError = errorMessage;

        // Show error in terminal first
        this.showTerminalOutput(`Error: ${errorMessage}`, 'error');

        // Add a small delay before showing the Ask AI button to let user read the error
        setTimeout(() => {
            this.showTerminalAskAIButton(errorMessage);
        }, 1000);
    }

    showTerminalAskAIButton(errorMessage) {
        const terminalContent = document.getElementById('terminalContent');
        if (!terminalContent) return;

        // Remove any existing Ask AI button
        const existingButton = terminalContent.querySelector('.ask-ai-button-container');
        if (existingButton) {
            existingButton.remove();
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'ask-ai-button-container';
        buttonContainer.style.cssText = `
            border-top: 1px solid var(--border-color);
            background: var(--bg-secondary);
            margin: var(--space-sm) 0;
            border-radius: var(--radius);
        `;

        buttonContainer.innerHTML = `
            <div class="ask-ai-prompt">
                Need help with Undrstanding this error?
            </div>
            <button class="ask-ai-btn" id="askAIAboutError">
                Begin Undrstanding
            </button>
        `;

        terminalContent.appendChild(buttonContainer);

        // Add event listener
        const askAIBtn = buttonContainer.querySelector('#askAIAboutError');
        askAIBtn.addEventListener('click', () => {
            this.askAIAboutError(errorMessage);
        });

        // Auto-scroll to bottom to show the button
        terminalContent.scrollTop = terminalContent.scrollHeight;
    }

    async askAIAboutError(errorMessage) {
        try {
            // Remove the Ask AI button
            const buttonContainer = document.querySelector('.ask-ai-button-container');
            if (buttonContainer) {
                buttonContainer.remove();
            }

            // Show loading in chat
            this.addMessage('🔍 Analyzing your error...', 'assistant');

            const response = await fetch('/api/translate-error', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    error: errorMessage
                })
            });

            const data = await response.json();

            if (data.success) {
                // Show the human-readable error message in chat
                if (data.ai_explanation) {
                    this.addMessage(data.ai_explanation, 'assistant');
                } else if (data.translated_message) {
                    this.addMessage(data.translated_message, 'assistant');
                } else {
                    // Fallback to a generic helpful message
                    this.addMessage('🔴 Code Error\n\nI noticed an error in your code. The error message suggests there might be a syntax or logic issue. Try checking for typos, missing punctuation, or incorrect indentation.', 'assistant');
                }
            } else {
                // If translation fails, show a generic helpful message
                this.addMessage('🔴 Code Error Analysis\n\nI had trouble analyzing the specific error, but I can still help! The error message in the terminal shows what went wrong. Common issues include:\n\n• Syntax errors (missing colons, brackets, or quotes)\n• Indentation problems\n• Typos in variable names\n• Using undefined variables\n\nFeel free to ask me about any specific part of the error message!', 'assistant');
            }
        } catch (error) {
            // If the translation service fails, still provide help
            this.addMessage('🔴 Error Analysis Failed\n\nI couldn\'t connect to analyze the error, but I can still help you debug it! Copy and paste the error message from the terminal into our chat, and I\'ll explain what it means in simple terms.', 'assistant');
        }
    }

    highlightErrorLines(errorMessage) {
        // Clear any existing error highlights first
        this.clearErrorHighlights();

        // Parse error message to extract line numbers
        const lineNumbers = this.parseErrorLineNumbers(errorMessage);

        if (lineNumbers.length === 0) {
            return;
        }

        const activeContent = document.querySelector('.editor-content.active');
        if (!activeContent) {
            return;
        }

        const codeInput = activeContent.querySelector('.code-input');
        if (!codeInput) {
            return;
        }

        // Get the code editor container
        const codeEditor = activeContent.querySelector('.code-editor');
        if (!codeEditor) {
            return;
        }

        // Make sure the code editor has relative positioning
        codeEditor.style.position = 'relative';

        // Get line metrics from the textarea
        const computedStyle = window.getComputedStyle(codeInput);
        const lineHeight = parseFloat(computedStyle.lineHeight) || 21;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 16;
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 16;

        // Store highlights for tracking
        const highlights = [];

        // Create highlights for each error line
        lineNumbers.forEach((lineNumber, index) => {
            const zeroBasedLine = lineNumber - 1;

            if (zeroBasedLine >= 0) {
                // Calculate position relative to the textarea
                const highlightTop = paddingTop + (zeroBasedLine * lineHeight);

                // Create highlight element
                const highlight = document.createElement('div');
                highlight.className = 'error-line-highlight';
                highlight.dataset.lineNumber = lineNumber;

                // Position relative to the code input container
                const codeInputContainer = codeInput.parentElement;
                const containerRect = codeInputContainer.getBoundingClientRect();
                const textareaRect = codeInput.getBoundingClientRect();

                // Calculate offset from container
                const leftOffset = textareaRect.left - containerRect.left;
                const topOffset = textareaRect.top - containerRect.top;

                highlight.style.cssText = `
                    position: absolute;
                    left: ${leftOffset}px;
                    top: ${topOffset + highlightTop}px;
                    right: 0;
                    width: ${textareaRect.width}px;
                    height: ${lineHeight}px;
                    background: rgba(239, 68, 68, 0.15);
                    border-left: 3px solid #ef4444;
                    pointer-events: none;
                    z-index: 5;
                    opacity: 0;
                    transition: opacity 0.3s ease-in;
                `;

                // Position it in the code input container
                codeInputContainer.style.position = 'relative';
                codeInputContainer.appendChild(highlight);
                highlights.push(highlight);

                // Simple fade-in effect
                setTimeout(() => {
                    highlight.style.opacity = '1';
                }, 50);

                // Auto-remove with staggered timing - extended to 20 seconds
                const removeDelay = 20000 + (index * 500) + Math.random() * 2000;

                setTimeout(() => {
                    if (highlight.parentNode) {
                        highlight.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
                        highlight.style.opacity = '0';
                        highlight.style.transform = 'scaleY(0.1)';

                        setTimeout(() => {
                            if (highlight.parentNode) {
                                highlight.remove();
                            }
                        }, 500);
                    }
                }, removeDelay);

                // Update position when scrolling
                const updatePosition = () => {
                    if (highlight.parentNode && codeInput) {
                        const newTop = topOffset + highlightTop - codeInput.scrollTop;
                        highlight.style.top = `${newTop}px`;
                    }
                };

                codeInput.addEventListener('scroll', updatePosition);
                highlight._scrollHandler = updatePosition;
            }
        });

        // Store highlights reference
        this.currentErrorHighlights = highlights;

        // Scroll to first error line
        if (lineNumbers.length > 0) {
            this.scrollToErrorLine(codeInput, lineNumbers[0] - 1, lineHeight, paddingTop);
        }

        // Show summary for multiple errors
        if (lineNumbers.length > 1) {
            setTimeout(() => {
                this.addMessage(`🔍 Found errors on ${lineNumbers.length} lines: ${lineNumbers.join(', ')}. Check the highlighted lines in your code.`, 'assistant');
            }, 1000);
        }
    }

    parseErrorLineNumbers(errorMessage) {
        const lineNumbers = [];

        // Enhanced Python error patterns for better multi-line detection
        const patterns = [
            // "File "filename", line 5, in function_name"
            /File\s+"[^"]*",\s+line\s+(\d+)/gi,
            // "Line 5:" or "line 5:"
            /\bline\s+(\d+):/gi,
            // "Error on line 5" or "error at line 5"
            /error\s+(?:on|at)\s+line\s+(\d+)/gi,
            // "SyntaxError: invalid syntax (line 5)"
            /\(line\s+(\d+)\)/gi,
            // "  File "<string>", line 5"
            /File\s+"<[^>]*>",\s+line\s+(\d+)/gi,
            // "line 5, in <module>"
            /line\s+(\d+),\s+in\s+/gi,
            // Traceback patterns with line numbers
            /^\s*line\s+(\d+)/gmi,
            // Multiple error format: "lines 5-7" or "lines 5, 6, 7"
            /lines?\s+([\d\s,\-]+)/gi,
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(errorMessage)) !== null) {
                const lineStr = match[1];

                // Handle ranges like "5-7"
                if (lineStr.includes('-')) {
                    const [start, end] = lineStr.split('-').map(n => parseInt(n.trim()));
                    if (start > 0 && end > 0 && end >= start) {
                        for (let i = start; i <= Math.min(end, start + 20); i++) { // Limit range to prevent excessive highlighting
                            if (!lineNumbers.includes(i)) {
                                lineNumbers.push(i);
                            }
                        }
                    }
                }
                // Handle comma-separated list like "5, 6, 7"
                else if (lineStr.includes(',')) {
                    const lines = lineStr.split(',').map(n => parseInt(n.trim())).filter(n => n > 0);
                    lines.forEach(lineNum => {
                        if (!lineNumbers.includes(lineNum)) {
                            lineNumbers.push(lineNum);
                        }
                    });
                }
                // Handle single line number
                else {
                    const lineNum = parseInt(lineStr);
                    if (lineNum > 0 && !lineNumbers.includes(lineNum)) {
                        lineNumbers.push(lineNum);
                    }
                }
            }
        });

        // Enhanced traceback parsing for Python stack traces
        const tracebackLines = errorMessage.split('\n');
        tracebackLines.forEach(line => {
            // Match various traceback formats
            const tracePatterns = [
                /^\s*File\s+"[^"]*",\s+line\s+(\d+)/,
                /^\s*line\s+(\d+)/,
                /^\s*>?\s*(\d+)\s*\|/,  // Some formatters show line numbers with pipe
            ];

            tracePatterns.forEach(pattern => {
                const match = line.match(pattern);
                if (match) {
                    const lineNum = parseInt(match[1]);
                    if (lineNum > 0 && !lineNumbers.includes(lineNum)) {
                        lineNumbers.push(lineNum);
                    }
                }
            });
        });

        // Remove duplicates and sort
        const uniqueLines = [...new Set(lineNumbers)].sort((a, b) => a - b);

        // Limit to reasonable number to prevent UI overload
        return uniqueLines.slice(0, 10);
    }

    scrollToErrorLine(codeInput, lineNumber, lineHeight, paddingTop) {
        // Scroll to show the error line with some context
        const scrollTop = Math.max(0, paddingTop + (lineNumber - 2) * lineHeight);
        codeInput.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
        });

        // Also set cursor to the error line
        const lines = codeInput.value.split('\n');
        let cursorPosition = 0;
        for (let i = 0; i < lineNumber && i < lines.length; i++) {
            cursorPosition += lines[i].length + 1; // +1 for newline
        }

        // Set cursor at the beginning of the error line
        codeInput.focus();
        codeInput.setSelectionRange(cursorPosition - (lines[lineNumber] ? lines[lineNumber].length : 0), cursorPosition);
    }

    clearErrorHighlights() {
        // Remove all error highlights
        const allHighlights = document.querySelectorAll('.error-line-highlight, .error-highlight-overlay');
        allHighlights.forEach(highlight => {
            // Remove scroll handler if exists
            if (highlight._scrollHandler) {
                const codeInput = document.querySelector('.code-input');
                if (codeInput) {
                    codeInput.removeEventListener('scroll', highlight._scrollHandler);
                }
            }
            highlight.remove();
        });

        // Remove overlay containers
        const overlayContainers = document.querySelectorAll('.error-overlay-container');
        overlayContainers.forEach(container => {
            if (container._scrollHandler) {
                const codeInput = document.querySelector('.code-input');
                if (codeInput) {
                    codeInput.removeEventListener('scroll', container._scrollHandler);
                }
            }
            container.remove();
        });

        // Clear stored highlights reference
        if (this.currentErrorHighlights) {
            this.currentErrorHighlights.forEach(highlight => {
                if (highlight.parentNode) {
                    if (highlight._scrollHandler) {
                        const codeInput = document.querySelector('.code-input');
                        if (codeInput) {
                            codeInput.removeEventListener('scroll', highlight._scrollHandler);
                        }
                    }
                    highlight.remove();
                }
            });
            this.currentErrorHighlights = [];
        }
    }

    showTerminalOutput(text, type = 'normal') {
        const terminalContent = document.getElementById('terminalContent');
        if (!terminalContent) return;

        const line = document.createElement('div');
        line.className = 'terminal-line';

        const prompt = document.createElement('span');
        prompt.className = 'terminal-prompt';
        prompt.textContent = type === 'error' ? '✗' : type === 'success' ? '✓' : type === 'info' ? 'ℹ' : '$';

        const textSpan = document.createElement('span');
        textSpan.className = `terminal-text${type !== 'normal' ? ' terminal-' + type : ''}`;
        textSpan.textContent = text;

        line.appendChild(prompt);
        line.appendChild(textSpan);
        terminalContent.appendChild(line);

        // Auto-scroll to bottom
        terminalContent.scrollTop = terminalContent.scrollHeight;

        // If this is an error, highlight the error lines in the code editor
        if (type === 'error') {
            this.highlightErrorLines(text);
        }
    }

    clearTerminal() {
        const terminalContent = document.getElementById('terminalContent');
        if (terminalContent) {
            terminalContent.innerHTML = '';

            // Add the initial ready message
            const initialLine = document.createElement('div');
            initialLine.className = 'terminal-line';
            initialLine.innerHTML = `
                <span class="terminal-prompt">$</span>
                <span class="terminal-text">Ready to execute your code...</span>
            `;
            terminalContent.appendChild(initialLine);
        }

        // Clear stored error
        this.lastError = null;
    }

    toggleTerminalCollapse() {
        const terminalArea = document.querySelector('.terminal-area');
        const collapseBtn = document.getElementById('collapseTerminal');
        const icon = collapseBtn?.querySelector('i');

        if (!terminalArea || !collapseBtn || !icon) return;

        if (terminalArea.classList.contains('collapsed')) {
            // Expand terminal
            terminalArea.classList.remove('collapsed');
            terminalArea.style.height = '200px'; // Reset to default height
            icon.className = 'fas fa-chevron-down';
            collapseBtn.title = 'Collapse Terminal';
        } else {
            // Collapse terminal
            terminalArea.classList.add('collapsed');
            icon.className = 'fas fa-chevron-up';
            collapseBtn.title = 'Expand Terminal';
        }
    }

    switchTerminalTab(tabName) {
        // Update tab appearance
        document.querySelectorAll('.terminal-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const activeTab = document.querySelector(`[data-tab="${tabName}"].terminal-tab`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Update view content
        document.querySelectorAll('.terminal-view').forEach(view => {
            view.classList.remove('active');
        });

        const activeView = document.querySelector(`[data-view="${tabName}"].terminal-view`);
        if (activeView) {
            activeView.classList.add('active');
        }

        // Hide test case details when switching tabs
        if (tabName !== 'test-cases') {
            this.hideTestCaseDetails();
        }
    }

    showOutput(text, type = 'normal') {
        const outputContent = document.getElementById('outputContent');
        if (!outputContent) return;

        const line = document.createElement('div');
        line.className = 'output-line';

        if (type === 'error' || type === 'info') {
            line.innerHTML = `
                <span class="output-prefix">[Undrstanding]</span>
                <span class="output-text">${text}</span>
            `;
        } else {
            line.innerHTML = `<span class="output-text">${text}</span>`;
        }

        outputContent.appendChild(line);
        outputContent.scrollTop = outputContent.scrollHeight;
    }

    showProblems(problems) {
        const problemsList = document.getElementById('problemsList');
        if (!problemsList) return;

        problemsList.innerHTML = '';

        // Update badge
        const badge = document.querySelector('[data-panel="problems"] .tab-badge');
        if (badge) {
            badge.textContent = problems.length;
        }

        problems.forEach(problem => {
            const problemDiv = document.createElement('div');
            problemDiv.className = `problem-item ${problem.type}`;

            const iconClass = problem.type === 'error' ? 'fa-times-circle' : 
                             problem.type === 'warning' ? 'fa-exclamation-triangle' : 
                             'fa-info-circle';

            problemDiv.innerHTML = `
                <i class="fas ${iconClass}"></i>
                <span class="problem-message">${problem.message}</span>
            `;

            problemsList.appendChild(problemDiv);
        });
    }

    async loadSessionStatus() {
        try {
            const response = await fetch('/api/session-status');
            const data = await response.json();

            const sessionStatus = document.getElementById('sessionStatus');
            if (sessionStatus) {
                const sessionDisplay = data.session_id ? 
                    `Session: ${data.session_id.substring(0, 8)}...` : 
                    'Session: New';
                sessionStatus.innerHTML = `<i class="fas fa-user-circle"></i> ${sessionDisplay}`;
            }
        } catch (error) {
            console.error('Failed to load session status:', error);
        }
    }

    openLibrary() {
        window.open('/docs/library', '_blank');
    }

    getFileIcon(extension) {
        const iconMap = {
            'py': 'fab fa-python',
            'js': 'fab fa-js',
            'html': 'fab fa-html5',
            'htm': 'fab fa-html5',
            'xhtml': 'fab fa-html5',
            'css': 'fab fa-css3',
            'scss': 'fab fa-sass',
            'sass': 'fab fa-sass',
            'less': 'fab fa-less',
            'md': 'fab fa-markdown',
            'json': 'fas fa-code',
            'txt': 'fas fa-file-alt',
            'cpp': 'far fa-file-code',
            'c': 'far fa-file-code',
            'java': 'fab fa-java',
            'php': 'fab fa-php',
            'xml': 'fas fa-code',
            'svg': 'fas fa-image',
            'jpg': 'fas fa-image',
            'jpeg': 'fas fa-image',
            'png': 'fas fa-image',
            'gif': 'fas fa-image',
            'bmp': 'fas fa-image',
            'webp': 'fas fa-image',
            'ico': 'fas fa-image'
        };
        return iconMap[extension] || 'fas fa-file';
    }

    getCodeFromEditor() {
        const activeContent = document.querySelector('.editor-content.active');
        if (!activeContent) return '';

        const codeInput = activeContent.querySelector('.code-input');
        return codeInput ? codeInput.value : '';
    }

    setupHeaderEditListeners(editorContent, filename) {
        const editBtn = editorContent.querySelector('.edit-header-btn');
        const saveBtn = editorContent.querySelector('.save-header-btn');
        const headerInput = editorContent.querySelector('.file-header-input');

        if (editBtn && saveBtn && headerInput) {
            editBtn.addEventListener('click', () => {
                this.enableHeaderEditingForFile(editorContent, filename);
            });

            saveBtn.addEventListener('click', () => {
                this.saveHeaderEditingForFile(editorContent, filename);
            });

            // Click-to-edit functionality
            headerInput.addEventListener('click', (e) => {
                if (headerInput.hasAttribute('readonly')) {
                    this.enableHeaderEditingForFile(editorContent, filename);
                }
            });
        }
    }

    enableHeaderEditingForFile(editorContent, filename) {
        const headerInput = editorContent.querySelector('.file-header-input');
        const editBtn = editorContent.querySelector('.edit-header-btn');
        const saveBtn = editorContent.querySelector('.save-header-btn');

        if (headerInput && editBtn && saveBtn) {
            headerInput.removeAttribute('readonly');
            headerInput.focus();
            headerInput.select();

            editBtn.style.display = 'none';
            saveBtn.style.display = 'flex';

            // Add placeholder text for guidance
            if (headerInput.value === filename) {
                headerInput.placeholder = `e.g., Program for ${filename.replace(/\.[^/.]+$/, "")}`;
            }

            // Save on Enter key
            const keydownHandler = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.saveHeaderEditingForFile(editorContent, filename);
                    headerInput.removeEventListener('keydown', keydownHandler);
                }
                if (e.key === 'Escape') {
                    this.cancelHeaderEditingForFile(editorContent, filename);
                    headerInput.removeEventListener('keydown', keydownHandler);
                }
            };

            headerInput.addEventListener('keydown', keydownHandler);
        }
    }

    saveHeaderEditingForFile(editorContent, filename) {
        const headerInput = editorContent.querySelector('.file-header-input');
        const editBtn = editorContent.querySelector('.edit-header-btn');
        const saveBtn = editorContent.querySelector('.save-header-btn');

        if (headerInput && editBtn && saveBtn) {
            let customHeading = headerInput.value.trim();

            // If empty, use default filename
            if (!customHeading) {
                customHeading = filename;
            }

            // Store the custom heading
            if (!this.customHeadings) {
                this.customHeadings = {};
            }
            this.customHeadings[filename] = customHeading;

            // Update the display
            headerInput.value = customHeading;
            headerInput.setAttribute('readonly', 'readonly');
            headerInput.placeholder = '';

            editBtn.style.display = 'flex';
            saveBtn.style.display = 'none';

            // Show success message
            this.addMessage(`✅ Header updated for ${filename}: "${customHeading}"`, 'assistant');
        }
    }

    cancelHeaderEditingForFile(editorContent, filename) {
        const headerInput = editorContent.querySelector('.file-header-input');
        const editBtn = editorContent.querySelector('.edit-header-btn');
        const saveBtn = editorContent.querySelector('.save-header-btn');

        if (headerInput && editBtn && saveBtn) {
            // Restore original value
            const originalValue = this.customHeadings && this.customHeadings[filename] 
                ? this.customHeadings[filename] 
                : filename;

            headerInput.value = originalValue;
            headerInput.setAttribute('readonly', 'readonly');
            headerInput.placeholder = '';

            editBtn.style.display = 'flex';
            saveBtn.style.display = 'none';
        }
    }

    enableHeaderEditing() {
        const activeContent = document.querySelector('.editor-content.active');
        if (activeContent) {
            this.enableHeaderEditingForFile(activeContent, this.currentTab);
        }
    }

    saveHeaderEditing() {
        const activeContent = document.querySelector('.editor-content.active');
        if (activeContent) {
            this.saveHeaderEditingForFile(activeContent, this.currentTab);
        }
    }

    cancelHeaderEditing() {
        const activeContent = document.querySelector('.editor-content.active');
        if (activeContent) {
            this.cancelHeaderEditingForFile(activeContent, this.currentTab);
        }
    }

    openSidebar() {
        this.sidebarCollapsed = false;
        this.applySidebarState();
    }

    closeSidebar() {
        this.sidebarCollapsed = true;
        this.applySidebarState();
    }

    applySidebarState() {
        const container = document.querySelector('.editor-container');
        const explorerPanel = document.querySelector('.explorer-panel');
        const aiSidebar = document.querySelector('.ai-sidebar');

        if (!container || !explorerPanel) return;

        // Get current AI sidebar width to preserve it
        const currentAIWidth = aiSidebar ? aiSidebar.offsetWidth : 400;

        if (this.sidebarCollapsed) {
            container.classList.add('sidebar-collapsed');
            explorerPanel.classList.add('collapsed');
            // Update grid with collapsed sidebar but preserve AI width
            container.style.gridTemplateColumns = `40px 1fr ${currentAIWidth}px`;
        } else {
            container.classList.remove('sidebar-collapsed');
            explorerPanel.classList.remove('collapsed');
            // Update grid with expanded sidebar and preserve AI width
            container.style.gridTemplateColumns = `280px 1fr ${currentAIWidth}px`;
        }
    }

    showTerminalInput(prompt = 'Enter input: ') {
        const terminalContent = document.getElementById('terminalContent');
        if (!terminalContent) return Promise.resolve('');

        return new Promise((resolve) => {
            this.isWaitingForInput = true;
            this.inputCallback = resolve;

            const inputLine = document.createElement('div');
            inputLine.className = 'terminal-input-line';
            inputLine.innerHTML = `
                <span class="terminal-prompt">></span>
                <input type="text" class="terminal-input" placeholder="${prompt}" id="terminalInput">
            `;

            terminalContent.appendChild(inputLine);

            const input = inputLine.querySelector('.terminal-input');
            input.focus();

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const value = input.value;

                    // Show the entered value in terminal
                    const resultLine = document.createElement('div');
                    resultLine.className = 'terminal-line';
                    resultLine.innerHTML = `
                        <span class="terminal-prompt">></span>
                        <span class="terminal-text">${value}</span>
                    `;

                    // Replace input line with result
                    terminalContent.replaceChild(resultLine, inputLine);

                    this.isWaitingForInput = false;
                    this.inputCallback = null;

                    // Auto-scroll to bottom
                    terminalContent.scrollTop = terminalContent.scrollHeight;

                    resolve(value);
                }
            });

            // Auto-scroll to bottom
            terminalContent.scrollTop = terminalContent.scrollHeight;
        });
    }

    initializeFileCreation() {
        const createFileBtn = document.getElementById('createFileBtn');
        const createFolderBtn = document.getElementById('createFolderBtn');

        if (createFileBtn) {
            // Add debouncing to prevent multiple rapid clicks
            let isCreating = false;

            createFileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Prevent multiple file creations
                if (isCreating) return;

                // Check if there's already a file being created
                const existingNewFile = document.querySelector('.file-item.new-file');
                if (existingNewFile) return;

                isCreating = true;

                // Only create file if we're not in search or questions mode
                const searchPanel = document.querySelector('.expanded-search-panel');
                const questionsPanel = document.querySelector('.expanded-questions-panel');
                const isSearchMode = searchPanel && searchPanel.style.display !== 'none';
                const isQuestionsMode = questionsPanel && questionsPanel.style.display !== 'none';

                if (!isSearchMode && !isQuestionsMode) {
                    this.createNewFileInline();
                } else {
                    // Show a brief message that file creation is disabled
                    const mode = isSearchMode ? 'search' : 'questions';
                    this.addMessage(`File creation is disabled while in ${mode} mode. Close the ${mode} panel to create files.`, 'assistant');
                }

                // Reset the flag after a short delay
                setTimeout(() => {
                    isCreating = false;
                }, 500);
            });
        }

        // Initialize folder creation functionality
        if (createFolderBtn) {
            createFolderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.createNewFolder();
            });
        }

        // Initialize upload functionality
        const uploadFileBtn = document.getElementById('uploadFileBtn');
        const uploadFolderBtn = document.getElementById('uploadFolderBtn');

        if (uploadFileBtn) {
            uploadFileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.triggerFileUpload();
            });
        }

        if (uploadFolderBtn) {
            uploadFolderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.triggerFolderUpload();
            });
        }
    }

    initializeFolderManagement() {
        // Initialize existing folder click handlers
        document.querySelectorAll('.folder-header').forEach(header => {
            const folderItem = header.closest('.folder-item');
            const folderName = header.querySelector('.folder-name')?.textContent;

            // Add context menu
            header.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showFolderContextMenu(e, folderItem, folderName);
            });

            // Add double-click to rename
            header.addEventListener('dblclick', () => {
                this.renameFolderInline(folderItem, folderName);
            });
        });
    }

    createNewFolder() {
        // Always use the main project folder content for root-level folder creation
        const mainFolder = document.querySelector('.folder-item.expanded .folder-content');
        let folderContent = mainFolder;

        // If main folder is closed, expand it first to show the new folder
        if (!mainFolder) {
            const mainFolderItem = document.querySelector('.folder-item');
            if (mainFolderItem && !mainFolderItem.classList.contains('expanded')) {
                this.toggleFolder(mainFolderItem);
                folderContent = mainFolderItem.querySelector('.folder-content');
            }
        }

        if (!folderContent) return;

        // Check if we're in questions mode and prevent folder creation
        const questionsPanel = document.querySelector('.expanded-questions-panel');
        if (questionsPanel && questionsPanel.style.display !== 'none') {
            this.addMessage('Folder creation is disabled while in questions mode. Close the questions panel to create folders.', 'assistant');
            return;
        }

        // Create a temporary folder item for input
        const folderItem = document.createElement('div');
        folderItem.className = 'folder-item editing new-folder';
        folderItem.innerHTML = `
            <div class="folder-header">
                <i class="fas fa-chevron-right folder-arrow"></i>
                <i class="fas fa-folder folder-icon"></i>
                <input type="text" class="folder-name-input" placeholder="New Folder" spellcheck="false">
            </div>
            <div class="folder-content" style="display: none;"></div>
        `;

        folderContent.appendChild(folderItem);

        const input = folderItem.querySelector('.folder-name-input');
        input.focus();
        input.select();

        let isProcessing = false;

        const confirmCreate = () => {
            if (isProcessing) return;

            const folderName = input.value.trim();

            if (!folderName) {
                folderItem.remove();
                return;
            }

            isProcessing = true;

            // Check if folder already exists
            const existingFolders = document.querySelectorAll('.folder-item:not(.new-folder) .folder-name');
            const folderExists = Array.from(existingFolders).some(el => el.textContent.trim() === folderName);

            if (folderExists) {
                this.addMessage(`❌ Error: A folder with the name "${folderName}" already exists`, 'assistant');
                isProcessing = false;
                input.focus();
                input.select();
                return;
            }

            // Create the folder
            folderItem.className = 'folder-item';
            folderItem.innerHTML = `
                <div class="folder-header">
                    <i class="fas fa-chevron-right folder-arrow"></i>
                    <i class="fas fa-folder folder-icon"></i>
                    <span class="folder-name">${folderName}</span>
                    <button class="folder-menu-btn" title="More options">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
                <div class="folder-content" style="display: none;"></div>
            `;

            // Add event listeners
            const folderHeader = folderItem.querySelector('.folder-header');
            folderHeader.addEventListener('click', (e) => {
                if (!e.target.closest('.folder-menu-btn')) {
                    this.toggleFolder(folderItem);
                }
            });

            // Add context menu functionality for folders
            folderHeader.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showFolderContextMenu(e, folderItem, folderName);
            });

            // Add double-click to rename
            folderHeader.addEventListener('dblclick', (e) => {
                if (!e.target.closest('.folder-menu-btn')) {
                    this.renameFolderInline(folderItem, folderName);
                }
            });

            // Add menu button event listener
            const menuBtn = folderHeader.querySelector('.folder-menu-btn');
            if (menuBtn) {
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showFolderMenu(e, folderItem, folderName);
                });
            }

            this.addMessage(`✅ Created new folder: ${folderName}`, 'assistant');
        };

        const cancelCreate = () => {
            if (!isProcessing) {
                folderItem.remove();
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                input.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
                confirmCreate();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                input.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
                cancelCreate();
            }
        };

        const handleBlur = (e) => {
            setTimeout(() => {
                if (!isProcessing && input.parentNode) {
                    input.removeEventListener('keydown', handleKeyDown);
                    input.removeEventListener('blur', handleBlur);
                    confirmCreate();
                }
            }, 100);
        };

        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('blur', handleBlur);
    }

    showFolderContextMenu(event, folderItem, folderName) {
        // Remove existing context menus
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu folder-context-menu';
        contextMenu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            min-width: 180px;
            padding: 4px 0;
        `;

        contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="new-file">
                <i class="fas fa-file"></i>
                <span>New File</span>
            </div>
            <div class="context-menu-item" data-action="new-folder">
                <i class="fas fa-folder"></i>
                <span>New Folder</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="rename">
                <i class="fas fa-edit"></i>
                <span>Rename</span>
            </div>
            <div class="context-menu-item" data-action="download-zip">
                <i class="fas fa-file-archive"></i>
                <span>Download as ZIP</span>
            </div>
        `;

        document.body.appendChild(contextMenu);

        // Position menu to stay within viewport
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = (event.clientX - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = (event.clientY - rect.height) + 'px';
        }

        // Add event listeners
        contextMenu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action) {
                this.handleFolderContextAction(action, folderItem, folderName);
                contextMenu.remove();
            }
        });

        // Close on outside click
        const closeHandler = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeHandler);
        }, 0);
    }

    handleFolderContextAction(action, folderItem, folderName) {
        switch (action) {
            case 'new-file':
                this.createFileInFolder(folderItem);
                break;
            case 'new-folder':
                this.createFolderInFolder(folderItem);
                break;
            case 'rename':
                this.renameFolderInline(folderItem, folderName);
                break;
            case 'download-zip':
                this.downloadFolderAsZip(folderItem, folderName);
                break;
        }
    }

    collapseAllSubfolders(folderItem) {
        const folderContent = folderItem.querySelector('.folder-content');
        if (!folderContent) return;

        // Find all expanded subfolders within this folder
        const expandedSubfolders = folderContent.querySelectorAll('.folder-item.expanded');
        let collapsedCount = 0;

        expandedSubfolders.forEach(subfolder => {
            // Collapse each expanded subfolder
            this.collapseFolder(subfolder);
            collapsedCount++;
        });

        // Show success message
        const folderName = folderItem.querySelector('.folder-name')?.textContent || 'folder';
        if (collapsedCount > 0) {
            this.addMessage(`📁 Collapsed ${collapsedCount} subfolder${collapsedCount !== 1 ? 's' : ''} in "${folderName}".`, 'assistant');
        } else {
            this.addMessage(`📁 No expanded subfolders found in "${folderName}".`, 'assistant');
        }
    }

    collapseFolder(folderItem) {
        if (!folderItem.classList.contains('expanded')) return;

        // First, recursively collapse all subfolders
        const folderContent = folderItem.querySelector('.folder-content');
        if (folderContent) {
            const expandedSubfolders = folderContent.querySelectorAll('.folder-item.expanded');
            expandedSubfolders.forEach(subfolder => {
                this.collapseFolder(subfolder);
            });
        }

        // Then collapse this folder
        folderItem.classList.remove('expanded');
        const arrow = folderItem.querySelector('.folder-arrow');
        const icon = folderItem.querySelector('.folder-icon');
        const content = folderItem.querySelector('.folder-content');

        if (arrow) {
            arrow.classList.remove('fa-chevron-down');
            arrow.classList.add('fa-chevron-right');
        }

        if (icon) {
            icon.classList.remove('fa-folder-open');
            icon.classList.add('fa-folder');
        }

        if (content) {
            content.style.display = 'none';
        }
    }

    createFileInFolder(folderItem) {
        // Expand folder if not already expanded
        if (!folderItem.classList.contains('expanded')) {
            this.toggleFolder(folderItem);
        }

        const folderContent = folderItem.querySelector('.folder-content');
        if (!folderContent) return;

        // Create new file in this folder
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item editing new-file';
        fileItem.innerHTML = `
            <i class="fas fa-file file-icon"></i>
            <input type="text" class="file-name-input" placeholder="filename.txt" spellcheck="false">
        `;

        folderContent.appendChild(fileItem);

        const input = fileItem.querySelector('.file-name-input');
        input.focus();

        let isProcessing = false;

        const confirmCreate = () => {
            if (isProcessing) return;

            const fileName = input.value.trim();

            if (!fileName) {
                fileItem.remove();
                return;
            }

            isProcessing = true;

            const finalFileName = fileName.includes('.') ? fileName : fileName + '.txt';

            if (!this.isValidFileExtension(finalFileName)) {
                const extension = finalFileName.split('.').pop().toLowerCase();
                fileItem.remove();
                this.addMessage(`❌ Error: "${extension}" is not a supported file extension.`, 'assistant');
                isProcessing = false;
                return;
            }

            // Check if file already exists
            if (this.files[finalFileName] || document.querySelector(`[data-file="${finalFileName}"]:not(.new-file)`)) {
                this.addMessage(`❌ Error: A file with the name "${finalFileName}" already exists`, 'assistant');
                isProcessing = false;
                input.focus();
                input.select();
                return;
            }

            // Create the file
            this.files[finalFileName] = {
                content: '',
                language: this.getLanguageFromExtension(finalFileName.split('.').pop())
            };

            const extension = finalFileName.split('.').pop();
            const iconClass = this.getFileIcon(extension);
            const languageClass = this.getLanguageClass(finalFileName);

            fileItem.className = 'file-item';
            fileItem.dataset.file = finalFileName;
            fileItem.innerHTML = `
                <i class="${iconClass} file-icon ${languageClass}"></i>
                <span class="file-name">${finalFileName}</span>
                <button class="file-menu-btn" title="More options">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            `;

            fileItem.addEventListener('click', (e) => {
                if (!e.target.closest('.file-menu-btn')) {
                    this.selectFile(finalFileName);
                }
            });

            fileItem.addEventListener('dblclick', (e) => {
                if (!e.target.closest('.file-menu-btn')) {
                    this.makeFileEditable(fileItem, finalFileName);
                }
            });

            // Add menu button event listener
            const menuBtn = fileItem.querySelector('.file-menu-btn');
            if (menuBtn) {
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showFileMenu(e, fileItem, finalFileName);
                });
            }

            this.createTab(finalFileName);
            this.switchTab(finalFileName);

            this.addMessage(`✅ Created new file: ${finalFileName}`, 'assistant');
        };

        const cancelCreate = () => {
            if (!isProcessing) {
                fileItem.remove();
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                input.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
                confirmCreate();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                input.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
                cancelCreate();
            }
        };

        const handleBlur = (e) => {
            setTimeout(() => {
                if (!isProcessing && input.parentNode) {
                    input.removeEventListener('keydown', handleKeyDown);
                    input.removeEventListener('blur', handleBlur);
                    confirmCreate();
                }
            }, 100);
        };

        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('blur', handleBlur);
    }

    createFolderInFolder(parentFolderItem) {
        // Expand folder if not already expanded
        if (!parentFolderItem.classList.contains('expanded')) {
            this.toggleFolder(parentFolderItem);
        }

        const folderContent = parentFolderItem.querySelector('.folder-content');
        if (!folderContent) return;

        // Create a new folder inside the parent folder
        const folderItem = document.createElement('div');
        folderItem.className = 'folder-item editing new-folder';
        folderItem.innerHTML = `
            <div class="folder-header">
                <i class="fas fa-chevron-right folder-arrow"></i>
                <i class="fas fa-folder folder-icon"></i>
                <input type="text" class="folder-name-input" placeholder="New Folder" spellcheck="false">
            </div>
            <div class="folder-content" style="display: none;"></div>
        `;

        folderContent.appendChild(folderItem);

        const input = folderItem.querySelector('.folder-name-input');
        input.focus();
        input.select();

        let isProcessing = false;

        const confirmCreate = () => {
            if (isProcessing) return;

            const folderName = input.value.trim();

            if (!folderName) {
                folderItem.remove();
                return;
            }

            isProcessing = true;

            // Check if folder already exists in parent folder
            const existingFolders = folderContent.querySelectorAll('.folder-item:not(.new-folder) .folder-name');
            const folderExists = Array.from(existingFolders).some(el => el.textContent.trim() === folderName);

            if (folderExists) {
                this.addMessage(`❌ Error: A folder with the name "${folderName}" already exists in this location`, 'assistant');
                isProcessing = false;
                input.focus();
                input.select();
                return;
            }

            // Create the folder
            folderItem.className = 'folder-item';
            folderItem.innerHTML = `
                <div class="folder-header">
                    <i class="fas fa-chevron-right folder-arrow"></i>
                    <i class="fas fa-folder folder-icon"></i>
                    <span class="folder-name">${folderName}</span>
                    <button class="folder-menu-btn" title="More options">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
                <div class="folder-content" style="display: none;"></div>
            `;

            // Add event listeners
            const folderHeader = folderItem.querySelector('.folder-header');
            folderHeader.addEventListener('click', (e) => {
                if (!e.target.closest('.folder-menu-btn')) {
                    this.toggleFolder(folderItem);
                }
            });

            folderHeader.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showFolderContextMenu(e, folderItem, folderName);
            });

            folderHeader.addEventListener('dblclick', (e) => {
                if (!e.target.closest('.folder-menu-btn')) {
                    this.renameFolderInline(folderItem, folderName);
                }
            });

            // Add menu button event listener
            const menuBtn = folderHeader.querySelector('.folder-menu-btn');
            if (menuBtn) {
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showFolderMenu(e, folderItem, folderName);
                });
            }

            this.addMessage(`✅ Created new folder: ${folderName}`, 'assistant');
        };

        const cancelCreate = () => {
            if (!isProcessing) {
                folderItem.remove();
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                input.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
                confirmCreate();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                input.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
                cancelCreate();
            }
        };

        const handleBlur = (e) => {
            setTimeout(() => {
                if (!isProcessing && input.parentNode) {
                    input.removeEventListener('keydown', handleKeyDown);
                    input.removeEventListener('blur', handleBlur);
                    confirmCreate();
                }
            }, 100);
        };

        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('blur', handleBlur);
    }

    renameFolderInline(folderItem, currentName) {
        const folderNameSpan = folderItem.querySelector('.folder-name');
        if (!folderNameSpan) return;

        const folderHeader = folderItem.querySelector('.folder-header');
        folderItem.classList.add('editing');

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'folder-name-input';
        input.value = currentName;
        input.spellcheck = false;

        folderNameSpan.replaceWith(input);
        input.focus();
        input.select();

        let isProcessing = false;

        const confirmRename = () => {
            if (isProcessing) return;

            const newName = input.value.trim();

            if (!newName || newName === currentName) {
                // Restore original
                input.replaceWith(folderNameSpan);
                folderItem.classList.remove('editing');
                return;
            }

            isProcessing = true;

            // Check if name already exists
            const parentContent = folderItem.parentElement;
            const existingFolders = parentContent.querySelectorAll('.folder-item:not(.editing) .folder-name');
            const nameExists = Array.from(existingFolders).some(el => el.textContent.trim() === newName);

            if (nameExists) {
                this.addMessage(`❌ Error: A folder with the name "${newName}" already exists`, 'assistant');
                isProcessing = false;
                input.focus();
                input.select();
                return;
            }

            // Update folder name
            folderNameSpan.textContent = newName;
            input.replaceWith(folderNameSpan);
            folderItem.classList.remove('editing');

            this.addMessage(`✅ Renamed folder to: ${newName}`, 'assistant');
        };

        const cancelRename = () => {
            if (!isProcessing) {
                input.replaceWith(folderNameSpan);
                folderItem.classList.remove('editing');
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                input.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
                confirmRename();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                input.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
                cancelRename();
            }
        };

        const handleBlur = (e) => {
            setTimeout(() => {
                if (!isProcessing && input.parentNode) {
                    input.removeEventListener('keydown', handleKeyDown);
                    input.removeEventListener('blur', handleBlur);
                    confirmRename();
                }
            }, 100);
        };

        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('blur', handleBlur);
    }

    initializeResizers() {
        this.initializeTerminalResizer();
        this.initializeAISidebarResizer();
    }

    initializeTerminalResizer() {
        const terminalArea = document.querySelector('.terminal-area');
        const resizeHandle = document.querySelector('.terminal-resize-handle');

        if (!terminalArea || !resizeHandle) {
            console.log('Terminal resize elements not found');
            return;
        }

        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        const doResize = (e) => {
            if (!isResizing) return;
            e.preventDefault();

            const deltaY = startY - e.clientY; // Inverted for upward drag to increase height
            const newHeight = startHeight + deltaY;
            const minHeight = 100;
            const maxHeight = window.innerHeight * 0.6;
            const constrainedHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

            terminalArea.style.height = constrainedHeight + 'px';
        };

        const stopResize = () => {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            resizeHandle.style.background = '';
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
        };

        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            isResizing = true;
            startY = e.clientY;
            startHeight = terminalArea.offsetHeight;

            // Visual feedback
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
            resizeHandle.style.background = 'rgba(99, 102, 241, 0.2)';

            document.addEventListener('mousemove', doResize);
            document.addEventListener('mouseup', stopResize);
        });

        // Double-click to reset to default height
        resizeHandle.addEventListener('dblclick', () => {
            terminalArea.style.height = '200px';
        });
    }

    initializeAISidebarResizer() {
        const aiSidebar = document.querySelector('.ai-sidebar');
        const resizeHandle = document.querySelector('.ai-sidebar-resize-handle');
        const container = document.querySelector('.editor-container');

        if (!aiSidebar || !resizeHandle || !container) {
            console.log('AI sidebar resize elements not found');
            return;
        }

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        const doResize = (e) => {
            if (!isResizing) return;
            e.preventDefault();

            const deltaX = startX - e.clientX; // Drag left increases width
            const newWidth = startWidth + deltaX;
            const minWidth = 280;
            const maxWidth = Math.min(800, window.innerWidth * 0.5);
            const constrainedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

            // Update both the grid and the sidebar width
            const explorerWidth = container.classList.contains('sidebar-collapsed') ? '40px' : '280px';
            container.style.gridTemplateColumns = `${explorerWidth} 1fr ${constrainedWidth}px`;
            aiSidebar.style.width = constrainedWidth + 'px';
            container.style.gridTemplateColumns = `${explorerWidth} 1fr ${constrainedWidth}px`;
            aiSidebar.style.width = constrainedWidth + 'px';
        };

        const stopResize = () => {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            resizeHandle.style.background = '';
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
        };

        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            isResizing = true;
            startX = e.clientX;
            startWidth = aiSidebar.offsetWidth;

            // Visual feedback
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            resizeHandle.style.background = 'rgba(99, 102, 241, 0.2)';

            document.addEventListener('mousemove', doResize);
            document.addEventListener('mouseup', stopResize);
        });

        // Double-click to reset to default width
        resizeHandle.addEventListener('dblclick', () => {
            const explorerWidth = container.classList.contains('sidebar-collapsed') ? '40px' : '280px';
            container.style.gridTemplateColumns = `${explorerWidth} 1fr 400px`;
            aiSidebar.style.width = '400px';
        });
    }

    createNewFileInline() {
        // Create file directly in sidebar
        this.createNewFileInSidebar();
    }

    createNewFileInSidebar() {
        // Always use the main project folder content for root-level file creation
        const mainFolder = document.querySelector('.folder-item.expanded .folder-content');
        let folderContent = mainFolder;

        // If main folder is closed, expand it first to show the new file
        if (!mainFolder) {
            const mainFolderItem = document.querySelector('.folder-item');
            if (mainFolderItem && !mainFolderItem.classList.contains('expanded')) {
                this.toggleFolder(mainFolderItem);
                folderContent = mainFolderItem.querySelector('.folder-content');
            }
        }

        if (!folderContent) return;

        // Check if we're in questions mode and prevent file creation
        const questionsPanel = document.querySelector('.expanded-questions-panel');
        if (questionsPanel && questionsPanel.style.display !== 'none') {
            this.addMessage('File creation is disabled while in questions mode. Close the questions panel to create files.', 'assistant');
            return;
        }

        // Create a temporary file item for input
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item editing new-file';
        fileItem.innerHTML = `
            <i class="fas fa-file file-icon"></i>
            <input type="text" class="file-name-input" placeholder="filename.txt" spellcheck="false">
        `;

        folderContent.appendChild(fileItem);

        const input = fileItem.querySelector('.file-name-input');
        input.focus();

        let isProcessing = false; // Flag to prevent multiple calls

        const confirmCreate = () => {
            if (isProcessing) return; // Prevent multiple executions

            const fileName = input.value.trim();

            if (!fileName) {
                fileItem.remove();
                return;
            }

            isProcessing = true; // Set flag to prevent further calls

            // Add .txt extension if no extension provided
            const finalFileName = fileName.includes('.') ? fileName : fileName + '.txt';

            // Validate file extension
            if (!this.isValidFileExtension(finalFileName)) {
                const extension = finalFileName.split('.').pop().toLowerCase();

                // Remove the file item immediately to prevent further attempts
                fileItem.remove();

                // Show error message only once
                this.addMessage(`❌ Error: "${extension}" is not a supported file extension. Supported extensions: py, js, html, css, json, md, cpp, c, java, php, xml, sql, sh, yml, yaml, ts, tsx, jsx, scss, sass, less, txt`, 'assistant');

                // Reset processing flag
                isProcessing = false;
                return;
            }

            // Check if file already exists
            if (this.files[finalFileName] || document.querySelector(`[data-file="${finalFileName}"]:not(.new-file)`)) {
                this.addMessage(`❌ Error: A file with the name "${finalFileName}" already exists`, 'assistant');
                isProcessing = false; // Reset flag on error
                input.focus();
                input.select();
                return;
            }

            // Create the file
            this.files[finalFileName] = {
                content: '',
                language: this.getLanguageFromExtension(finalFileName.split('.').pop())
            };

            // Replace temporary item with actual file item
            const extension = finalFileName.split('.').pop();
            const iconClass = this.getFileIcon(extension);
            const languageClass = this.getLanguageClass(finalFileName);

            fileItem.className = 'file-item';
            fileItem.dataset.file = finalFileName;
            fileItem.innerHTML = `
                <i class="${iconClass} file-icon ${languageClass}"></i>
                <span class="file-name">${finalFileName}</span>
                <button class="file-menu-btn" title="More options">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            `;

            // Add event listeners
            fileItem.addEventListener('click', (e) => {
                if (!e.target.closest('.file-menu-btn')) {
                    this.selectFile(finalFileName);
                }
            });

            fileItem.addEventListener('dblclick', (e) => {
                if (!e.target.closest('.file-menu-btn')) {
                    this.makeFileEditable(fileItem, finalFileName);
                }
            });

            // Add menu button event listener
            const menuBtn = fileItem.querySelector('.file-menu-btn');
            if (menuBtn) {
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showFileMenu(e, fileItem, finalFileName);
                });
            }

            // Create tab and switch to it
            this.createTab(finalFileName);
            this.switchTab(finalFileName);

            // Set empty content in editor
            const activeContent = document.querySelector('.editor-content.active');
            if (activeContent) {
                const codeInput = activeContent.querySelector('.code-input');
                if (codeInput) {
                    codeInput.value = '';
                    this.updateLineNumbers();
                }
            }

            // Add success message to chat
            this.addMessage(`✅ Created new file: ${finalFileName}`, 'assistant');
        };

        const cancelCreate = () => {
            if (!isProcessing) {
                fileItem.remove();
            }
        };

        // Use a single event listener approach to prevent duplicates
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                input.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
                confirmCreate();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                input.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
                cancelCreate();
            }
        };

        const handleBlur = (e) => {
            // Small delay to allow time for other events to process
            setTimeout(() => {
                if (!isProcessing && input.parentNode) {
                    input.removeEventListener('keydown', handleKeyDown);
                    input.removeEventListener('blur', handleBlur);
                    confirmCreate();
                }
            }, 100);
        };

        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('blur', handleBlur);
    }

    // Add the missing helper methods
    isValidFileExtension(fileName) {
        const supportedExtensions = [
            'py', 'js', 'html', 'htm', 'css', 'json', 'md', 'cpp', 'c', 'java', 
            'php', 'xml', 'sql', 'sh', 'yml', 'yaml', 'ts', 'tsx', 'jsx', 
            'scss', 'sass', 'less', 'txt'
        ];
        const extension = fileName.split('.').pop().toLowerCase();

        // Prevent manual creation of image files - they should only be uploaded
        if (this.isImageFile(fileName)) {
            return false;
        }

        return supportedExtensions.includes(extension);
    }

    getLanguageFromExtension(extension) {
        const languageMap = {
            'py': 'python',
            'js': 'javascript',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'cpp': 'cpp',
            'c': 'c',
            'java': 'java',
            'php': 'php',
            'xml': 'xml',
            'sql': 'sql',
            'sh': 'shell',
            'yml': 'yaml',
            'yaml': 'yaml',
            'ts': 'typescript',
            'tsx': 'typescript',
            'jsx': 'javascript',
            'scss': 'css',
            'sass': 'css',
            'less': 'css',
            'txt': 'text'
        };
        return languageMap[extension] || 'text';
    }

    getLanguageClass(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        const classMap = {
            'py': 'python',
            'js': 'javascript',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'cpp': 'cpp',
            'c': 'c',
            'java': 'java',
            'php': 'php',
            'xml': 'xml',
            'sql': 'sql',
            'sh': 'shell',
            'yml': 'yaml',
            'yaml': 'yaml',
            'ts': 'typescript',
            'tsx': 'typescript',
            'jsx': 'javascript',
            'scss': 'css',
            'sass': 'css',
            'less': 'css',
            'txt': 'text'
        };
        return classMap[extension] || 'text';
    }

    setEditorContent(content) {
        const activeContent = document.querySelector('.editor-content.active');
        if (activeContent) {
            const codeInput = activeContent.querySelector('.code-input');
            if (codeInput) {
                codeInput.value = content;
                this.updateLineNumbers();
            }
        }
    }

    makeFileEditable(fileItem, fileName) {
        // Implementation for making files editable (rename functionality)
        const fileNameSpan = fileItem.querySelector('.file-name');
        if (!fileNameSpan) return;

        fileItem.classList.add('editing');

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'file-name-input';
        input.value = fileName;
        input.spellcheck = false;

        fileNameSpan.replaceWith(input);
        input.focus();
        input.select();

        let isProcessing = false;

        const confirmRename = () => {
            if (isProcessing) return;

            const newName = input.value.trim();

            if (!newName || newName === fileName) {
                // Restore original
                input.replaceWith(fileNameSpan);
                fileItem.classList.remove('editing');
                return;
            }

            isProcessing = true;

            // Add extension if none provided
            const finalNewName = newName.includes('.') ? newName : newName + '.txt';

            if (!this.isValidFileExtension(finalNewName)) {
                this.addMessage(`❌ Error: Invalid file extension`, 'assistant');
                isProcessing = false;
                input.focus();
                input.select();
                return;
            }

            // Check if name already exists
            if (this.files[finalNewName] || document.querySelector(`[data-file="${finalNewName}"]:not(.editing)`)) {
                this.addMessage(`❌ Error: A file with the name "${finalNewName}" already exists`, 'assistant');
                isProcessing = false;
                input.focus();
                input.select();
                return;
            }

            // Update file
            if (this.files[fileName]) {
                this.files[finalNewName] = this.files[fileName];
                delete this.files[fileName];
            }

            // Update UI
            fileNameSpan.textContent = finalNewName;
            fileItem.dataset.file = finalNewName;
            input.replaceWith(fileNameSpan);
            fileItem.classList.remove('editing');

            // Update tab if exists
            const tab = document.querySelector(`[data-file="${fileName}"].tab`);
            if (tab) {
                tab.dataset.file = finalNewName;
                const tabName = tab.querySelector('.tab-name');
                if (tabName) tabName.textContent = finalNewName;
            }

            // Update editor content if active
            const editorContent = document.querySelector(`[data-file="${fileName}"].editor-content`);
            if (editorContent) {
                editorContent.dataset.file = finalNewName;
            }

            // Update current tab reference
            if (this.currentTab === fileName) {
                this.currentTab = finalNewName;
            }

            this.addMessage(`✅ Renamed file to: ${finalNewName}`, 'assistant');
        };

        const cancelRename = () => {
            if (!isProcessing) {
                input.replaceWith(fileNameSpan);
                fileItem.classList.remove('editing');
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                input.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
                confirmRename();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                input.removeEventListener('keydown', handleKeyDown);
                input.removeEventListener('blur', handleBlur);
                cancelRename();
            }
        };

        const handleBlur = (e) => {
            setTimeout(() => {
                if (!isProcessing && input.parentNode) {
                    input.removeEventListener('keydown', handleKeyDown);
                    input.removeEventListener('blur', handleBlur);
                    confirmRename();
                }
            }, 100);
        };

        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('blur', handleBlur);
    }

    initializeUploadFunctionality() {
        const fileUploadInput = document.getElementById('fileUploadInput');
        const folderUploadInput = document.getElementById('folderUploadInput');

        if (fileUploadInput) {
            fileUploadInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }

        if (folderUploadInput) {
            folderUploadInput.addEventListener('change', (e) => {
                this.handleFolderUpload(e.target.files);
            });
        }
    }

    triggerFileUpload() {
        const fileUploadInput = document.getElementById('fileUploadInput');
        if (fileUploadInput) {
            fileUploadInput.click();
        }
    }

    triggerFolderUpload() {
        const folderUploadInput = document.getElementById('folderUploadInput');
        if (folderUploadInput) {
            folderUploadInput.click();
        }
    }

    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        // Ensure main folder is expanded
        const mainFolderItem = document.querySelector('.folder-item');
        if (mainFolderItem && !mainFolderItem.classList.contains('expanded')) {
            this.toggleFolder(mainFolderItem);
        }

        let uploadedCount = 0;
        let skippedCount = 0;
        const skippedFiles = [];

        for (const file of files) {
            try {
                // Check if it's an image file or regular file
                const isImage = this.isImageFile(file.name);

                // For non-image files, check if extension is supported
                if (!isImage && !this.isValidFileExtension(file.name)) {
                    skippedCount++;
                    skippedFiles.push(file.name);
                    continue;
                }

                // Check if file already exists
                if (this.files[file.name] || document.querySelector(`[data-file="${file.name}"]`)) {
                    const shouldOverwrite = confirm(`File "${file.name}" already exists. Do you want to overwrite it?`);
                    if (!shouldOverwrite) {
                        skippedCount++;
                        skippedFiles.push(file.name);
                        continue;
                    }
                }

                // Read file content
                let content;
                if (isImage) {
                    // For images, create a data URL
                    content = await this.readImageFileAsDataURL(file);
                } else {
                    // For text files, read as text
                    content = await this.readFileContent(file);
                }

                // Create/update file
                this.files[file.name] = {
                    content: content,
                    language: isImage ? 'image' : this.getLanguageFromExtension(file.name.split('.').pop()),
                    isImage: isImage,
                    size: file.size,
                    type: file.type
                };

                // Add to file tree if not exists
                const existingFileItem = document.querySelector(`[data-file="${file.name}"]`);
                if (!existingFileItem) {
                    this.addFileToTree(file.name, file.name.split('.').pop());
                }

                // If file is currently open and it's not an image, update the editor content
                if (this.currentTab === file.name && !isImage) {
                    this.setEditorContent(content);
                }

                uploadedCount++;
            } catch (error) {
                console.error(`Error uploading file ${file.name}:`, error);
                skippedCount++;
                skippedFiles.push(file.name);
            }
        }

        // Show summary message
        let message = `✅ Successfully uploaded ${uploadedCount} file${uploadedCount !== 1 ? 's' : ''}`;
        if (skippedCount > 0) {
            message += `\n⚠️ Skipped ${skippedCount} file${skippedCount !== 1 ? 's' : ''}: ${skippedFiles.join(', ')}`;
        }
        this.addMessage(message, 'assistant');

        // Reset the input
        const fileUploadInput = document.getElementById('fileUploadInput');
        if (fileUploadInput) {
            fileUploadInput.value = '';
        }
    }

    async readImageFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(file);
        });
    }

    async handleFolderUpload(files) {
        if (!files || files.length === 0) return;

        // Ensure main folder is expanded
        const mainFolderItem = document.querySelector('.folder-item');
        if (mainFolderItem && !mainFolderItem.classList.contains('expanded')) {
            this.toggleFolder(mainFolderItem);
        }

        let uploadedCount = 0;
        let skippedCount = 0;
        let foldersCreated = 0;
        const skippedFiles = [];
        const createdFolders = new Set();

        // Sort files to create folders first
        const sortedFiles = Array.from(files).sort((a, b) => {
            const aDepth = a.webkitRelativePath.split('/').length;
            const bDepth = b.webkitRelativePath.split('/').length;
            return aDepth - bDepth;
        });

        for (const file of sortedFiles) {
            try {
                const relativePath = file.webkitRelativePath;
                const pathParts = relativePath.split('/');
                const fileName = pathParts[pathParts.length - 1];

                // Skip hidden files and directories
                if (fileName.startsWith('.')) {
                    continue;
                }

                // Check if it's an image file or regular file
                const isImage = this.isImageFile(fileName);

                // For non-image files, check if extension is supported
                if (!isImage && !this.isValidFileExtension(fileName)) {
                    skippedCount++;
                    skippedFiles.push(fileName);
                    continue;
                }

                // Create folder structure if needed
                if (pathParts.length > 1) {
                    await this.createFolderStructure(pathParts.slice(0, -1), createdFolders);
                }

                // Check if file already exists
                const fileKey = pathParts.length > 1 ? relativePath : fileName;
                if (this.files[fileKey] || document.querySelector(`[data-file="${fileKey}"]`)) {
                    const shouldOverwrite = confirm(`File "${fileName}" already exists. Do you want to overwrite it?`);
                    if (!shouldOverwrite) {
                        skippedCount++;
                        skippedFiles.push(fileName);
                        continue;
                    }
                }

                // Read file content
                let content;
                if (isImage) {
                    content = await this.readImageFileAsDataURL(file);
                } else {
                    content = await this.readFileContent(file);
                }

                // Store file with relative path as key for nested files
                this.files[fileKey] = {
                    content: content,
                    language: isImage ? 'image' : this.getLanguageFromExtension(fileName.split('.').pop()),
                    path: relativePath,
                    isImage: isImage,
                    size: file.size,
                    type: file.type
                };

                // Add to appropriate folder in tree
                this.addFileToFolderTree(fileName, pathParts, fileName.split('.').pop());

                uploadedCount++;
            } catch (error) {
                console.error(`Error uploading file ${file.webkitRelativePath}:`, error);
                skippedCount++;
                skippedFiles.push(file.name);
            }
        }

        foldersCreated = createdFolders.size;

        // Show summary message
        let message = `✅ Successfully uploaded ${uploadedCount} file${uploadedCount !== 1 ? 's' : ''}`;
        if (foldersCreated > 0) {
            message += ` and created ${foldersCreated} folder${foldersCreated !== 1 ? 's' : ''}`;
        }
        if (skippedCount > 0) {
            message += `\n⚠️ Skipped ${skippedCount} file${skippedCount !== 1 ? 's' : ''}: ${skippedFiles.join(', ')}`;
        }
        this.addMessage(message, 'assistant');

        // Reset the input
        const folderUploadInput = document.getElementById('folderUploadInput');
        if (folderUploadInput) {
            folderUploadInput.value = '';
        }
    }

    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));

            // Try to read as text first
            try {
                reader.readAsText(file);
            } catch (error) {
                reject(error);
            }
        });
    }

    async createFolderStructure(pathParts, createdFolders) {
        let currentPath = '';
        let currentContainer = document.querySelector('.folder-content');

        for (let i = 0; i < pathParts.length; i++) {
            const folderName = pathParts[i];
            currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

            if (createdFolders.has(currentPath)) {
                // Folder already created, find it and continue
                const existingFolder = currentContainer.querySelector(`[data-folder-path="${currentPath}"]`);
                if (existingFolder) {
                    currentContainer = existingFolder.querySelector('.folder-content');
                }
                continue;
            }

            // Check if folder already exists
            let existingFolder = currentContainer.querySelector(`.folder-item .folder-name[data-name="${folderName}"]`);

            if (!existingFolder) {
                // Create new folder
                const folderItem = document.createElement('div');
                folderItem.className = 'folder-item';
                folderItem.dataset.folderPath = currentPath;

                folderItem.innerHTML = `
                    <div class="folder-header">
                        <i class="fas fa-chevron-right folder-arrow"></i>
                        <i class="fas fa-folder folder-icon"></i>
                        <span class="folder-name" data-name="${folderName}">${folderName}</span>
                        <button class="folder-menu-btn" title="More options">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                    <div class="folder-content" style="display: none;"></div>
                `;

                // Add event listeners
                const folderHeader = folderItem.querySelector('.folder-header');
                folderHeader.addEventListener('click', (e) => {
                    if (!e.target.closest('.folder-menu-btn')) {
                        this.toggleFolder(folderItem);
                    }
                });

                const menuBtn = folderHeader.querySelector('.folder-menu-btn');
                if (menuBtn) {
                    menuBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showFolderMenu(e, folderItem, folderName);
                    });
                }

                currentContainer.appendChild(folderItem);
                createdFolders.add(currentPath);

                // Update current container to the new folder's content
                currentContainer = folderItem.querySelector('.folder-content');
            } else {
                // Folder exists, navigate to its content
                const folderItem = existingFolder.closest('.folder-item');
                currentContainer = folderItem.querySelector('.folder-content');
            }
        }
    }

    addFileToFolderTree(fileName, pathParts, extension) {
        let targetContainer = document.querySelector('.folder-content');

        // Navigate to the correct folder
        if (pathParts.length > 1) {
            let currentPath = '';
            for (let i = 0; i < pathParts.length - 1; i++) {
                const folderName = pathParts[i];
                currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

                const folder = targetContainer.querySelector(`[data-folder-path="${currentPath}"]`);
                if (folder) {
                    targetContainer = folder.querySelector('.folder-content');
                }
            }
        }

        // Create file item
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.file = pathParts.join('/');

        const iconClass = this.getFileIcon(extension);
        const languageClass = this.getLanguageClass(fileName);

        fileItem.innerHTML = `
            <i class="${iconClass} file-icon"></i>
            <span class="file-name">${fileName}</span>
            <button class="file-menu-btn" title="More options">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        `;

        fileItem.dataset.language = languageClass;

        // Add event listeners
        fileItem.addEventListener('click', (e) => {
            if (!e.target.closest('.file-menu-btn')) {
                this.selectFile(pathParts.join('/'));
            }
        });

        const menuBtn = fileItem.querySelector('.file-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showFileMenu(e, fileItem, pathParts.join('/'));
            });
        }

        targetContainer.appendChild(fileItem);
    }



    showFileNameDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'file-name-dialog-overlay';
        dialog.innerHTML = `
            <div class="file-name-dialog">
                <div class="dialog-header">
                    <h3>Create New File</h3>
                    <button class="dialog-close" onclick="this.closest('.file-name-dialog-overlay').remove()">×</button>
                </div>
                <div class="dialog-content">
                    <label for="fileNameInput">File Name:</label>
                    <input type="text" id="fileNameInput" placeholder="Enter file name (e.g., hello.c, script.py)" autocomplete="off">
                    <div class="dialog-error" id="fileNameError"></div>
                </div>
                <div class="dialog-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.file-name-dialog-overlay').remove()">Cancel</button>
                    <button class="btn btn-primary" id="createFileConfirm">Create File</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const input = dialog.querySelector('#fileNameInput');
        const errorDiv = dialog.querySelector('#fileNameError');
        const createBtn = dialog.querySelector('#createFileConfirm');

        input.focus();

        const createFile = () => {
            const fileName = input.value.trim();

            if (!fileName) {
                this.showDialogError(errorDiv, 'Please enter a file name');
                return;
            }

            // Add .txt extension if no extension provided
            const finalFileName = fileName.includes('.') ? fileName : fileName + '.txt';

            // Check if file already exists
            if (this.files[finalFileName] || document.querySelector(`[data-file="${finalFileName}"]`)) {
                this.showDialogError(errorDiv, 'A file with this name already exists');
                return;
            }

            // Create the file
            this.files[finalFileName] = {
                content: '',
                language: this.getLanguageFromExtension(finalFileName.split('.').pop())
            };

            // Add to file tree
            this.addFileToTree(finalFileName, finalFileName.split('.').pop());

            // Create tab and switch to it
            this.createTab(finalFileName);
            this.switchTab(finalFileName);

            // Set empty content in editor
            this.setEditorContent('');

            // Add success message to chat
            this.addMessage(`✅ Created new file: ${finalFileName}`, 'assistant');

            // Remove dialog
            dialog.remove();
        };

        createBtn.addEventListener('click', createFile);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                createFile();
            }
        });
    }

    showDialogError(errorDiv, message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }



    makeFileEditable(fileItem, currentFileName) {
        fileItem.classList.add('editing');

        const extension = currentFileName.split('.').pop();
        const iconClass = this.getFileIcon(extension);

        fileItem.innerHTML = `
            <i class="${iconClass} file-icon"></i>
            <input type="text" class="file-name-input" value="${currentFileName}" spellcheck="false">
        `;

        const input = fileItem.querySelector('.file-name-input');

        setTimeout(() => {
            input.focus();
            const nameWithoutExt = currentFileName.replace(/\.[^/.]+$/, "");
            input.setSelectionRange(0, nameWithoutExt.length);
        }, 50);

        const confirmRename = () => {
            const newFileName = input.value.trim();

            if (!newFileName || newFileName === currentFileName) {
                // Restore original state
                this.restoreFileItem(fileItem, currentFileName);
                return;
            }

            // Validate file extension for renamed files
            if (!this.isValidFileExtension(newFileName)) {
                const extension = newFileName.split('.').pop().toLowerCase();
                this.addMessage(`❌ Error: "${extension}" is not a supported file extension. Supported extensions: py, js, html, css, json, md, cpp, c, java, php, xml, sql, sh, yml, yaml, ts, tsx, jsx, scss, sass, less, txt`, 'assistant');
                // Restore original state
                this.restoreFileItem(fileItem, currentFileName);
                return;
            }

            // Add .txt extension if no extension provided
            const finalFileName = newFileName.includes('.') ? newFileName : newFileName + '.txt';

            // Check if name already exists (but exclude current file from check)
            const existingFile = document.querySelector(`[data-file="${finalFileName}"]:not(.new-file)`);
            if (this.files[finalFileName] || (existingFile && existingFile !== fileItem && finalFileName !== currentFileName)) {
                this.addMessage(`❌ Error: A file with the name "${finalFileName}" already exists`, 'assistant');
                input.focus();
                input.select();
                return;
            }

            // Update file data
            this.files[finalFileName] = this.files[currentFileName];
            delete this.files[currentFileName];

            // Update tab
            const tab = document.querySelector(`[data-file="${currentFileName}"].tab`);
            if (tab) {
                tab.dataset.file = finalFileName;
                const tabName = tab.querySelector('.tab-name');
                if (tabName) tabName.textContent = finalFileName;

                const newExtension = finalFileName.split('.').pop();
                const newIconClass = this.getFileIcon(newExtension);
                const tabIcon = tab.querySelector('.tab-icon');
                if (tabIcon) {
                    tabIcon.className = newIconClass + ' tab-icon';
                }
            }

            // Update editor content
            const editorContent = document.querySelector(`[data-file="${currentFileName}"].editor-content`);
            if (editorContent) {
                editorContent.dataset.file = finalFileName;
            }

            // Update current tab reference
            if (this.currentTab === currentFileName) {
                this.currentTab = finalFileName;
            }

            // Restore file item with new name
            this.restoreFileItem(fileItem, finalFileName);
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmRename();
            } else if (e.key === 'Escape') {
                this.restoreFileItem(fileItem, currentFileName);
            }
        });

        input.addEventListener('blur', confirmRename);
    }

    restoreFileItem(fileItem, fileName) {
        fileItem.classList.remove('editing');
        fileItem.dataset.file = fileName;

        const extension = fileName.split('.').pop();
        const iconClass = this.getFileIcon(extension);
        const languageClass = this.getLanguageClass(fileName);

        fileItem.innerHTML = `
            <i class="${iconClass} file-icon"></i>
            <span class="file-name">${fileName}</span>
        `;

        // Set language data attribute for CSS styling
        fileItem.dataset.language = languageClass;

        // Re-add event listeners
        fileItem.addEventListener('click', () => {
            this.selectFile(fileName);
        });

        fileItem.addEventListener('dblclick', () => {
            this.makeFileEditable(fileItem, fileName);
        });
    }

    getFileTemplate(extension, template, fileName) {
        if (template === 'empty') {
            return '';
        }

        const templates = {
            'py': `#!/usr/bin/env python3
"""
${fileName}.py - Python script
"""

def main():
    print("Hello from ${fileName}!")

if __name__ == "__main__":
    main()
`,
            'js': `/**
 * ${fileName}.js - JavaScript file
 */

console.log("Hello from ${fileName}!");

function main() {
    // Your code here
}

main();
`,
            'html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        p {
            line-height: 1.6;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to ${fileName}</h1>
        <p>This is a new HTML file. Start building your web page here!</p>

        <!-- Add your content below -->
        <section>
            <h2>Getting Started</h2>
            <ul>
                <li>Edit this HTML file</li>
                <li>Add CSS styles</li>
                <li>Include JavaScript for interactivity</li>
                <li>Click the Run button to preview</li>
            </ul>
        </section>
    </div>

    <script>
        // Add your JavaScript here
        console.log('${fileName} loaded successfully!');
    </script>
</body>
</html>
`,
            'css': `/* ${fileName}.css - Stylesheet */

body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
}
`,
            'json': `{
    "name": "${fileName}",
    "version": "1.0.0",
    "description": "JSON file for ${fileName}",
    "data": {}
}
`,
            'md': `# ${fileName}

This is a new Markdown file.

## Getting Started

Write your documentation here.
`,
            'cpp': `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from ${fileName}!" << endl;
    return 0;
}
`,
            'java': `public class ${fileName.charAt(0).toUpperCase() + fileName.slice(1)} {
    public static void main(String[] args) {
        System.out.println("Hello from ${fileName}!");
    }
}
`,
            'jsx': `import React from 'react';

function ${fileName.charAt(0).toUpperCase() + fileName.slice(1)}() {
    return (
        <div>
            <h1>Hello from ${fileName}!</h1>
        </div>
    );
}

export default ${fileName.charAt(0).toUpperCase() + fileName.slice(1)};
`,
            'ts': `// ${fileName}.ts - TypeScript file

interface Config {
    name: string;
    version: string;
}

const config: Config = {
    name: "${fileName}",
    version: "1.0.0"
};

console.log("Hello from ${fileName}!", config);
`,
            'sh': `#!/bin/bash
# ${fileName}.sh - Shell script

echo "Hello from ${fileName}!"
`,
            'sql': `-- ${fileName}.sql - SQL file

CREATE TABLE IF NOT EXISTS ${fileName} (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`
        };

        return templates[extension] || `// ${fileName}.${extension}\n\n`;
    }

    getLanguageClass(filename) {
        if (!filename) return '';

        const extension = filename.split('.').pop()?.toLowerCase();
        if (!extension) return '';

        // Map file extensions to CSS language color classes
        const languageClassMap = {
            // Web Technologies
            'html': 'html',
            'htm': 'html',
            'xhtml': 'html',
            'css': 'css',
            'scss': 'css',
            'sass': 'css',
            'less': 'css',
            'js': 'javascript',
            'mjs': 'javascript',
            'jsx': 'react',
            'ts': 'typescript',
            'tsx': 'react',
            'vue': 'vue',

            // Programming Languages
            'py': 'python',
            'pyw': 'python',
            'java': 'java',
            'class': 'java',
            'kt': 'kotlin',
            'kts': 'kotlin',
            'cpp': 'cpp',
            'cxx': 'cpp',
            'cc': 'cpp',
            'c': 'c',
            'h': 'c',
            'hpp': 'cpp',
            'cs': 'csharp',
            'php': 'php',
            'phtml': 'php',
            'rb': 'ruby',
            'rbw': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',

            // Data & Configuration
            'json': 'json',
            'json5': 'json',
            'jsonc': 'json',
            'xml': 'xml',
            'xsl': 'xml',
            'xsd': 'xml',
            'svg': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'toml': 'toml',

            // Shell & Scripts
            'sh': 'shell',
            'bash': 'shell',
            'zsh': 'shell',
            'fish': 'shell',
            'ps1': 'powershell',
            'psm1': 'powershell',
            'bat': 'shell',
            'cmd': 'shell',

            // Database
            'sql': 'sql',
            'mysql': 'sql',
            'pgsql': 'sql',
            'sqlite': 'sql',

            // Documentation & Text
            'md': 'markdown',
            'markdown': 'markdown',
            'mdown': 'markdown',
            'mkd': 'markdown',
            'txt': 'file', // Use generic file class for txt

            // Build Tools
            'dockerfile': 'dockerfile',
            'dockerignore': 'dockerfile'
        };

        return languageClassMap[extension] || '';
    }

    applyLanguageColorsToExistingFiles() {
        // Apply language colors to all existing file items in the file tree
        document.querySelectorAll('.file-item').forEach(fileItem => {
            const filename = fileItem.dataset.file;
            if (filename) {
                const languageClass = this.getLanguageClass(filename);
                if (languageClass) {
                    fileItem.dataset.language = languageClass;
                }
            }
        });

        // Apply language colors to all existing tabs
        document.querySelectorAll('.tab').forEach(tab => {
            const filename = tab.dataset.file;
            if (filename) {
                const languageClass = this.getLanguageClass(filename);
                if (languageClass) {
                    tab.dataset.language = languageClass;
                }
            }
        });

        // Apply language colors to file header bars
        document.querySelectorAll('.file-header-bar').forEach(headerBar => {
            const editorContent = headerBar.closest('.editor-content');
            if (editorContent) {
                const filename = editorContent.dataset.file;
                if (filename) {
                    const languageClass = this.getLanguageClass(filename);
                    if (languageClass) {
                        headerBar.dataset.language = languageClass;
                    }
                }
            }
        });
    }

    isValidFileExtension(fileName) {
        const validExtensions = [
            'py', 'js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'xhtml',
            'css', 'scss', 'sass', 'less', 'json', 'md', 'markdown',
            'cpp', 'c', 'java', 'php', 'xml', 'svg', 'sql', 'sh',
            'yml', 'yaml', 'txt'
        ];

        const extension = fileName.split('.').pop().toLowerCase();
        return validExtensions.includes(extension);
    }

    getLanguageFromExtension(extension) {
        const languageMap = {
            'py': 'python',
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'html': 'html',
            'htm': 'html',
            'xhtml': 'html',
            'css': 'css',
            'scss': 'css',
            'sass': 'css',
            'less': 'css',
            'json': 'json',
            'md': 'markdown',
            'cpp': 'cpp',
            'c': 'c',
            'java': 'java',
            'php': 'php',
            'xml': 'xml',
            'svg': 'xml',
            'sql': 'sql',
            'sh': 'bash',
            'yml': 'yaml',
            'yaml': 'yaml'
        };
        return languageMap[extension] || 'text';
    }

    setEditorContent(content) {
        const activeContent = document.querySelector('.editor-content.active');
        if (activeContent) {
            const codeInput = activeContent.querySelector('.code-input');
            if (codeInput) {
                codeInput.value = content;
                this.updateLineNumbers();
                this.updateLineCount();
                this.updateCursorPosition();
            }
        }
    }

    addFileToTree(fileName, extension) {
        const folderContent = document.querySelector('.folder-content');
        if (!folderContent) return;

        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.file = fileName;

        const iconClass = this.getFileIcon(extension);
        const languageClass = this.getLanguageClass(fileName);

        // Mark image files with special class
        if (this.isImageFile(fileName)) {
            fileItem.classList.add('image-file');
            fileItem.dataset.language = 'image';
        } else {
            fileItem.dataset.language = languageClass;
        }

        fileItem.innerHTML = `
            <i class="${iconClass} file-icon"></i>
            <span class="file-name">${fileName}</span>
            <button class="file-menu-btn" title="More options">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        `;

        // Add event listener for file selection
        fileItem.addEventListener('click', (e) => {
            if (!e.target.closest('.file-menu-btn')) {
                this.selectFile(fileName);
            }
        });

        // Add double-click event for renaming (not for images)
        fileItem.addEventListener('dblclick', (e) => {
            if (!e.target.closest('.file-menu-btn')) {
                if (this.isImageFile(fileName)) {
                    this.openImageViewer(fileName);
                } else {
                    this.makeFileEditable(fileItem, fileName);
                }
            }
        });

        // Add menu button event listener
        const menuBtn = fileItem.querySelector('.file-menu-btn');
        menuBtn.addEventListener('click', (e) => {
            this.showFileMenu(e, fileItem, fileName);
        });

        folderContent.appendChild(fileItem);
    }

    openImageViewer(filename) {
        // Create image viewer modal
        const modal = document.createElement('div');
        modal.className = 'image-viewer-modal';
        modal.innerHTML = `
            <div class="image-viewer-overlay">
                <div class="image-viewer-content">
                    <div class="image-viewer-header">
                        <h3>
                            <i class="fas fa-image"></i>
                            Image Viewer
                        </h3>
                        <button class="image-viewer-close" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="image-viewer-body">
                        <div class="image-container">
                            <div class="image-loading">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>Loading image...</p>
                            </div>
                            <img class="viewer-image" alt="${filename}">
                            <div class="image-error" style="display: none;">
                                <i class="fas fa-exclamation-triangle"></i>
                                <p>Failed to load image</p>
                            </div>
                        </div>
                    </div>
                    <div class="image-viewer-footer">
                        <div class="image-info">
                            <div class="image-name">${filename}</div>
                            <div class="image-size" id="imageSizeInfo">Loading...</div>
                        </div>
                        <div class="image-actions">
                            <button class="btn" id="downloadImageBtn">
                                <i class="fas fa-download"></i>
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Show modal immediately
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);

        // Get image data and display with multiple loading strategies
        const imageData = this.files[filename];
        const img = modal.querySelector('.viewer-image');
        const loadingDiv = modal.querySelector('.image-loading');
        const errorDiv = modal.querySelector('.image-error');
        const sizeInfo = modal.querySelector('#imageSizeInfo');

        const showError = (message) => {
            loadingDiv.style.display = 'none';
            errorDiv.style.display = 'flex';
            errorDiv.querySelector('p').textContent = message || 'Failed to load image';
            sizeInfo.textContent = 'Unknown size';
        };

        const showImage = () => {
            loadingDiv.style.display = 'none';
            img.style.display = 'block';
            sizeInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight}px`;
        };

        // Strategy 1: Try stored data URL first
        if (imageData && imageData.content) {
            img.onload = showImage;
            img.onerror = () => {
                console.log('Data URL failed, trying relative path');
                // Strategy 2: Try relative path if data URL fails
                img.onload = showImage;
                img.onerror = () => {
                    console.log('Relative path failed, trying uploads folder');
                    // Strategy 3: Try upload folder path
                    img.onload = showImage;
                    img.onerror = () => {
                        console.log('All strategies failed');
                        showError('Image file not found or corrupted');
                    };
                    img.src = `/uploads/${filename}`;
                };
                img.src = `static/images/${filename}`;
            };
            img.src = imageData.content;
        } else {
            console.log('No image data found, trying static folder first');
            // Strategy 1: Try static images folder first
            img.onload = showImage;
            img.onerror = () => {
                console.log('Static folder failed, trying relative path');
                // Strategy 2: Try relative path
                img.onload = showImage;
                img.onerror = () => {
                    console.log('Relative path failed, trying uploads folder');
                    // Strategy 3: Try upload folder path
                    img.onload = showImage;
                    img.onerror = () => {
                        console.log('All strategies failed');
                        showError('Image file not found');
                    };
                    img.src = `/uploads/${filename}`;
                };
                img.src = filename;
            };
            img.src = `static/images/${filename}`;
        }

        // Event listeners
        const closeBtn = modal.querySelector('.image-viewer-close');
        const downloadBtn = modal.querySelector('#downloadImageBtn');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 150);
        };

        closeBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('image-viewer-overlay')) {
                closeModal();
            }
        });

        downloadBtn.addEventListener('click', () => {
            this.downloadImageFile(filename);
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    downloadImageFile(filename) {
        const imageData = this.files[filename];

        if (imageData && imageData.content) {
            // Create download link
            const a = document.createElement('a');
            a.href = imageData.content;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            this.addMessage(`✅ Image "${filename}" downloaded successfully.`, 'assistant');
        } else {
            // Try to download from relative path
            fetch(filename)
                .then(response => response.blob())
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    this.addMessage(`✅ Image "${filename}" downloaded successfully.`, 'assistant');
                })
                .catch(error => {
                    console.error('Error downloading image:', error);
                    this.addMessage(`❌ Failed to download image "${filename}".`, 'assistant');
                });
        }
    }

    toggleSearchPanel() {
        // Only allow search when sidebar is expanded
        if (this.sidebarCollapsed) {
            this.openSidebar();
            return;
        }

        const existingSearchPanel = document.querySelector('.expanded-search-panel');

        if (existingSearchPanel) {
            // Toggle visibility
            if (existingSearchPanel.style.display === 'none') {
                this.showExpandedSearchPanel();
            } else {
                this.hideExpandedSearchPanel();
            }
        } else {
            // Create and show search panel in expanded sidebar
            this.createExpandedSearchPanel();
        }
    }

    toggleExpandedSearchPanel() {
        // Only allow search when sidebar is expanded
        if (this.sidebarCollapsed) {
            this.openSidebar();
            return;
        }

        // Close any existing questions panel first to prevent overlap
        const existingQuestionsPanel = document.querySelector('.expanded-questions-panel');
        if (existingQuestionsPanel) {
            this.hideExpandedQuestionsPanel();
        }

        const existingSearchPanel = document.querySelector('.expanded-search-panel');

        if (existingSearchPanel) {
            // Toggle visibility
            if (existingSearchPanel.style.display === 'none') {
                this.showExpandedSearchPanel();
            } else {
                this.hideExpandedSearchPanel();
            }
        } else {
            // Create and show search panel in expanded sidebar
            this.createExpandedSearchPanel();
        }
    }



    createExpandedSearchPanel() {
        const explorerPanel = document.querySelector('.explorer-panel');
        if (!explorerPanel) return;

        // Create search panel that replaces file tree temporarily
        const searchPanel = document.createElement('div');
        searchPanel.className = 'expanded-search-panel';

        searchPanel.innerHTML = `
            <div class="expanded-search-header">
                <h3><i class="fas fa-search"></i> Search</h3>
                <button class="expanded-search-close" id="closeExpandedSearch">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="expanded-search-content">
                <input type="text" id="expandedSearchInput" class="search-input-minimal" placeholder="Search files..." />

                <div class="search-options-minimal">
                    <label class="search-option-minimal">
                        <input type="checkbox" id="expandedCaseSensitive"> Aa
                    </label>
                    <label class="search-option-minimal">
                        <input type="checkbox" id="expandedWholeWord"> Ab
                    </label>
                    <label class="search-option-minimal">
                        <input type="checkbox" id="expandedUseRegex"> .*
                    </label>
                </div>

                <input type="text" id="expandedReplaceInput" class="search-input-minimal" placeholder="Replace..." />

                <div class="search-actions-minimal">
                    <button class="search-btn-minimal primary" id="expandedFindAllBtn">Find</button>
                    <button class="search-btn-minimal" id="expandedFindNextBtn">Next</button>
                    <button class="search-btn-minimal" id="expandedReplaceBtn">Replace</button>
                    <button class="search-btn-minimal" id="expandedReplaceAllBtn">All</button>
                </div>

                <div class="search-results-section">
                    <div class="search-results-header-minimal">
                        <h4>Results</h4>
                        <span class="results-count-minimal" id="expandedResultsCount">0</span>
                    </div>
                    <div class="search-results-minimal" id="expandedSearchResults">
                        <div class="no-results-minimal">
                            <i class="fas fa-search"></i>
                            <p>No results</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Hide file tree and show search panel
        const fileTree = explorerPanel.querySelector('.file-tree');
        const explorerLibrary = explorerPanel.querySelector('.explorer-library');

        if (fileTree) fileTree.style.display = 'none';
        if (explorerLibrary) explorerLibrary.style.display = 'none';

        explorerPanel.appendChild(searchPanel);
        this.setupExpandedSearchEventListeners();
        this.showExpandedSearchPanel();

        // Update action button states
        this.updateActionButtonStates();
    }

    updateActionButtonStates() {
        const searchPanel = document.querySelector('.expanded-search-panel');
        const questionsPanel = document.querySelector('.expanded-questions-panel');
        const isSearchMode = searchPanel && searchPanel.style.display !== 'none';
        const isQuestionsMode = questionsPanel && questionsPanel.style.display !== 'none';

        // Get explorer actions bar
        const explorerActions = document.querySelector('.explorer-actions');

        if (isSearchMode || isQuestionsMode) {
            // Hide the entire explorer actions bar when in search or questions mode
            if (explorerActions) {
                explorerActions.classList.add('hidden');
            }
        } else {
            // Show the explorer actions bar when back to file explorer
            if (explorerActions) {
                explorerActions.classList.remove('hidden');
            }
        }
    }

    setupExpandedSearchEventListeners() {
        const closeBtn = document.getElementById('closeExpandedSearch');
        const findAllBtn = document.getElementById('expandedFindAllBtn');
        const findNextBtn = document.getElementById('expandedFindNextBtn');
        const replaceBtn = document.getElementById('expandedReplaceBtn');
        const replaceAllBtn = document.getElementById('expandedReplaceAllBtn');
        const searchInput = document.getElementById('expandedSearchInput');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideExpandedSearchPanel());
        }

        if (findAllBtn) {
            findAllBtn.addEventListener('click', () => this.performExpandedSearch());
        }

        if (findNextBtn) {
            findNextBtn.addEventListener('click', () => this.findNextInExpanded());
        }

        if (replaceBtn) {
            replaceBtn.addEventListener('click', () => this.replaceNextInExpanded());
        }

        if (replaceAllBtn) {
            replaceAllBtn.addEventListener('click', () => this.replaceAllInExpanded());
        }

        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.performExpandedSearch();
                }
            });
        }

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideExpandedSearchPanel();
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Store handler for cleanup
        const searchPanel = document.querySelector('.expanded-search-panel');
        if (searchPanel) {
            searchPanel._escapeHandler = escapeHandler;
        }
    }

    showExpandedSearchPanel() {
        const searchPanel = document.querySelector('.expanded-search-panel');
        if (searchPanel) {
            searchPanel.style.display = 'flex';
            const searchInput = document.getElementById('expandedSearchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Hide explorer actions bar
        this.updateActionButtonStates();
    }

    hideExpandedSearchPanel() {
        const searchPanel = document.querySelector('.expanded-search-panel');
        const explorerPanel = document.querySelector('.explorer-panel');

        if (searchPanel && explorerPanel) {
            // Remove escape handler
            if (searchPanel._escapeHandler) {
                document.removeEventListener('keydown', searchPanel._escapeHandler);
            }

            // Remove search panel
            searchPanel.remove();

            // Show file tree and library again
            const fileTree = explorerPanel.querySelector('.file-tree');
            const explorerLibrary = explorerPanel.querySelector('.explorer-library');

            if (fileTree) fileTree.style.display = 'block';
            if (explorerLibrary) explorerLibrary.style.display = 'block';

            // Show explorer actions bar again
            this.updateActionButtonStates();
        }

        // Clear any search highlights
        this.clearSearchHighlights();
    }

    performExpandedSearch() {
        const searchTerm = document.getElementById('expandedSearchInput')?.value.trim();
        if (!searchTerm) {
            this.showExpandedSearchMessage('Please enter a search term');
            return;
        }

        const caseSensitive = document.getElementById('expandedCaseSensitive')?.checked || false;
        const wholeWord = document.getElementById('expandedWholeWord')?.checked || false;
        const useRegex = document.getElementById('expandedUseRegex')?.checked || false;

        this.currentSearchResults = [];
        this.currentSearchIndex = -1;

        // Search in current active editor
        const activeContent = document.querySelector('.editor-content.active');
        if (activeContent) {
            const codeInput = activeContent.querySelector('.code-input');
            if (codeInput) {
                const results = this.searchInEditor(codeInput, searchTerm, caseSensitive, wholeWord, useRegex);
                this.currentSearchResults = results;
                this.displayExpandedSearchResults(results, searchTerm);

                if (results.length > 0) {
                    this.highlightSearchResults(codeInput, results);
                    this.currentSearchIndex = 0;
                    this.scrollToResult(codeInput, results[0]);
                }
            }
        }
    }

    findNextInExpanded() {
        if (!this.currentSearchResults || this.currentSearchResults.length === 0) {
            this.performExpandedSearch();
            return;
        }

        this.currentSearchIndex = (this.currentSearchIndex + 1) % this.currentSearchResults.length;
        this.jumpToExpandedResult(this.currentSearchIndex);
    }

    replaceNextInExpanded() {
        if (!this.currentSearchResults || this.currentSearchResults.length === 0) {
            this.showExpandedSearchMessage('No search results to replace');
            return;
        }

        const replaceText = document.getElementById('expandedReplaceInput')?.value || '';
        const activeContent = document.querySelector('.editor-content.active');

        if (activeContent && this.currentSearchIndex >= 0) {
            const codeInput = activeContent.querySelector('.code-input');
            if (codeInput) {
                const result = this.currentSearchResults[this.currentSearchIndex];
                const content = codeInput.value;

                // Replace the text
                const newContent = content.substring(0, result.startIndex) + 
                                 replaceText + 
                                 content.substring(result.endIndex);

                codeInput.value = newContent;
                this.updateLineNumbers();

                // Re-perform search to update results
                setTimeout(() => this.performExpandedSearch(), 100);
            }
        }
    }

    replaceAllInExpanded() {
        if (!this.currentSearchResults || this.currentSearchResults.length === 0) {
            this.showExpandedSearchMessage('No search results to replace');
            return;
        }

        const replaceText = document.getElementById('expandedReplaceInput')?.value || '';
        const activeContent = document.querySelector('.editor-content.active');

        if (activeContent) {
            const codeInput = activeContent.querySelector('.code-input');
            if (codeInput) {
                let content = codeInput.value;

                // Replace from end to beginning to maintain indices
                for (let i = this.currentSearchResults.length - 1; i >= 0; i--) {
                    const result = this.currentSearchResults[i];
                    content = content.substring(0, result.startIndex) + 
                             replaceText + 
                             content.substring(result.endIndex);
                }

                codeInput.value = content;
                this.updateLineNumbers();

                this.showExpandedSearchMessage(`Replaced ${this.currentSearchResults.length} occurrence${this.currentSearchResults.length !== 1 ? 's' : ''}`);

                // Clear results and re-search
                setTimeout(() => this.performExpandedSearch(), 100);
            }
        }
    }

    jumpToExpandedResult(index) {
        if (!this.currentSearchResults || index >= this.currentSearchResults.length) return;

        this.currentSearchIndex = index;
        const result = this.currentSearchResults[index];
        const activeContent = document.querySelector('.editor-content.active');

        if (activeContent) {
            const codeInput = activeContent.querySelector('.code-input');
            if (codeInput) {
                this.scrollToResult(codeInput, result);

                // Highlight current result
                document.querySelectorAll('.expanded-search-result-item').forEach(item => {
                    item.classList.remove('active');
                });

                const resultItem = document.querySelector(`[data-expanded-index="${index}"]`);
                if (resultItem) {
                    resultItem.classList.add('active');
                }
            }
        }
    }

    displayExpandedSearchResults(results, searchTerm) {
        const resultsContainer = document.getElementById('expandedSearchResults');
        const resultsCount = document.getElementById('expandedResultsCount');

        if (!resultsContainer || !resultsCount) return;

        resultsCount.textContent = results.length.toString();

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results-minimal">
                    <i class="fas fa-search"></i>
                    <p>No matches</p>
                </div>
            `;
            return;
        }

        let resultsHTML = '';
        results.forEach((result, index) => {
            const preview = this.createLinePreview(result.lineContent, result.columnStart, result.columnEnd);
            resultsHTML += `
                <div class="expanded-search-result-item" data-expanded-index="${index}">
                    <div class="result-location-minimal">
                        <span class="file-name-minimal">${this.currentTab}</span>
                        <span class="line-number-minimal">${result.lineNumber}</span>
                    </div>
                    <div class="result-preview-minimal">${preview}</div>
                </div>
            `;
        });

        resultsContainer.innerHTML = resultsHTML;

        // Add click listeners to results
        document.querySelectorAll('.expanded-search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.expandedIndex);
                this.jumpToExpandedResult(index);
            });
        });
    }

    showExpandedSearchMessage(message) {
        // Show a temporary message in the results area
        const resultsContainer = document.getElementById('expandedSearchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="search-message">
                    <i class="fas fa-info-circle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    searchInEditor(codeInput, searchTerm, caseSensitive, wholeWord, useRegex) {
        const content = codeInput.value;
        const results = [];

        let searchPattern;

        try {
            if (useRegex) {
                const flags = caseSensitive ? 'g' : 'gi';
                searchPattern = new RegExp(searchTerm, flags);
            } else {
                let escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (wholeWord) {
                    escapedTerm = `\\b${escapedTerm}\\b`;
                }
                const flags = caseSensitive ? 'g' : 'gi';
                searchPattern = new RegExp(escapedTerm, flags);
            }
        } catch (e) {
            this.showSearchMessage('Invalid regular expression');
            return [];
        }

        const lines = content.split('\n');
        let match;
        let globalIndex = 0;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const lineStartIndex = globalIndex;

            // Reset regex lastIndex for each line
            searchPattern.lastIndex = 0;

            while ((match = searchPattern.exec(line)) !== null) {
                results.push({
                    lineNumber: lineIndex + 1,
                    lineContent: line,
                    startIndex: lineStartIndex + match.index,
                    endIndex: lineStartIndex + match.index + match[0].length,
                    matchText: match[0],
                    columnStart: match.index,
                    columnEnd: match.index + match[0].length
                });

                // Prevent infinite loops with zero-width matches
                if (match.index === searchPattern.lastIndex) {
                    searchPattern.lastIndex++;
                }
            }

            globalIndex += line.length + 1; // +1 for newline character
        }

        return results;
    }

    displaySearchResults(results, searchTerm) {
        const resultsContainer = document.getElementById('searchResults');
        const resultsCount = document.getElementById('resultsCount');

        if (!resultsContainer || !resultsCount) return;

        resultsCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No results found for "${searchTerm}"</p>
                </div>
            `;
            return;
        }

        let resultsHTML = '';
        results.forEach((result, index) => {
            const preview = this.createLinePreview(result.lineContent, result.columnStart, result.columnEnd);
            resultsHTML += `
                <div class="search-result-item" data-index="${index}">
                    <div class="result-location">
                        <span class="file-name">${this.currentTab}</span>
                        <span class="line-number">Line ${result.lineNumber}</span>
                    </div>
                    <div class="result-preview">${preview}</div>
                </div>
            `;
        });

        resultsContainer.innerHTML = resultsHTML;

        // Add click listeners to results
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.jumpToResult(index);
            });
        });
    }

    createLinePreview(line, startCol, endCol) {
        const maxLength = 80;
        const beforeMatch = line.substring(0, startCol);
        const matchText = line.substring(startCol, endCol);
        const afterMatch = line.substring(endCol);

        let preview = '';

        if (beforeMatch.length > 40) {
            preview += '...' + beforeMatch.substring(beforeMatch.length - 37);
        } else {
            preview += beforeMatch;
        }

        preview += `<mark class="search-match">${matchText}</mark>`;

        if (afterMatch.length > 40) {
            preview += afterMatch.substring(0, 37) + '...';
        } else {
            preview += afterMatch;
        }

        return preview;
    }

    highlightSearchResults(codeInput, results) {
        // Clear previous highlights
        this.clearSearchHighlights();

        // Store results for navigation
        this.searchHighlights = results;
    }

    clearSearchHighlights() {
        // Remove any existing highlights
        const highlights = document.querySelectorAll('.search-highlight');
        highlights.forEach(highlight => highlight.remove());
        this.searchHighlights = [];
    }

    jumpToResult(index) {
        if (!this.currentSearchResults || index >= this.currentSearchResults.length) return;

        this.currentSearchIndex = index;
        const result = this.currentSearchResults[index];
        const activeContent = document.querySelector('.editor-content.active');

        if (activeContent) {
            const codeInput = activeContent.querySelector('.code-input');
            if (codeInput) {
                this.scrollToResult(codeInput, result);

                // Highlight current result
                document.querySelectorAll('.search-result-item').forEach(item => {
                    item.classList.remove('active');
                });

                const resultItem = document.querySelector(`[data-index="${index}"]`);
                if (resultItem) {
                    resultItem.classList.add('active');
                }
            }
        }
    }

    scrollToResult(codeInput, result) {
        // Set cursor position to the match
        codeInput.focus();
        codeInput.setSelectionRange(result.startIndex, result.endIndex);

        // Calculate line position and scroll
        const lines = codeInput.value.substring(0, result.startIndex).split('\n');
        const lineNumber = lines.length;
        const lineHeight = parseFloat(getComputedStyle(codeInput).lineHeight) || 21;
        const scrollTop = (lineNumber - 3) * lineHeight; // Show a few lines above

        codeInput.scrollTop = Math.max(0, scrollTop);
    }

    findNext() {
        if (!this.currentSearchResults || this.currentSearchResults.length === 0) {
            this.performSearch();
            return;
        }

        this.currentSearchIndex = (this.currentSearchIndex + 1) % this.currentSearchResults.length;
        this.jumpToResult(this.currentSearchIndex);
    }

    replaceNext() {
        if (!this.currentSearchResults || this.currentSearchResults.length === 0) {
            this.showSearchMessage('No search results to replace');
            return;
        }

        const replaceText = document.getElementById('replaceInput')?.value || '';
        const activeContent = document.querySelector('.editor-content.active');

        if (activeContent && this.currentSearchIndex >= 0) {
            const codeInput = activeContent.querySelector('.code-input');
            if (codeInput) {
                const result = this.currentSearchResults[this.currentSearchIndex];
                const content = codeInput.value;

                // Replace the text
                const newContent = content.substring(0, result.startIndex) + 
                                 replaceText + 
                                 content.substring(result.endIndex);

                codeInput.value = newContent;
                this.updateLineNumbers();

                // Re-perform search to update results
                setTimeout(() => this.performSearch(), 100);
            }
        }
    }

    replaceAll() {
        if (!this.currentSearchResults || this.currentSearchResults.length === 0) {
            this.showSearchMessage('No search results to replace');
            return;
        }

        const replaceText = document.getElementById('replaceInput')?.value || '';
        const activeContent = document.querySelector('.editor-content.active');

        if (activeContent) {
            const codeInput = activeContent.querySelector('.code-input');
            if (codeInput) {
                let content = codeInput.value;

                // Replace from end to beginning to maintain indices
                for (let i = this.currentSearchResults.length - 1; i >= 0; i--) {
                    const result = this.currentSearchResults[i];
                    content = content.substring(0, result.startIndex) + 
                             replaceText + 
                             content.substring(result.endIndex);
                }

                codeInput.value = content;
                this.updateLineNumbers();

                this.showSearchMessage(`Replaced ${this.currentSearchResults.length} occurrence${this.currentSearchResults.length !== 1 ? 's' : ''}`);

                // Clear results and re-search
                setTimeout(() => this.performSearch(), 100);
            }
        }
    }

    showSearchMessage(message) {
        // Show a temporary message in the results area
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="search-message">
                    <i class="fas fa-info-circle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    initializeSpeechRecognition() {
        // Check if browser supports Web Speech API
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported in this browser');
            const voiceBtn = document.getElementById('voiceBtn');
            if (voiceBtn) {
                voiceBtn.disabled = true;
                voiceBtn.title = 'Speech recognition not supported in this browser';
            }
            return;
        }

        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isRecording = true;
            const voiceBtn = document.getElementById('voiceBtn');
            if (voiceBtn) {
                voiceBtn.classList.add('recording');
                voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
                voiceBtn.title = 'Stop recording';
            }
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                // Append to existing text or replace if empty
                const currentText = chatInput.value.trim();
                chatInput.value = currentText ? currentText + ' ' + transcript : transcript;
                this.autoResizeChatInput();
                chatInput.focus();
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.stopVoiceRecording();

            let errorMessage = 'Voice recognition error occurred';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMessage = 'Microphone access denied. Please check permissions.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone permission denied. Please allow microphone access.';
                    break;
                case 'network':
                    errorMessage = 'Network error occurred during speech recognition.';
                    break;
            }

            this.addMessage(`🎤 ${errorMessage}`, 'assistant');
        };

        this.recognition.onend = () => {
            this.stopVoiceRecording();
        };
    }

    toggleVoiceRecording() {
        if (!this.recognition) {
            this.initializeSpeechRecognition();
            if (!this.recognition) return;
        }

        if (this.isRecording) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                this.addMessage('🎤 Unable to start voice recording. Please check microphone permissions.', 'assistant');
            }
        }
    }

    stopVoiceRecording() {
        this.isRecording = false;
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            voiceBtn.title = 'Voice to text';
        }
    }

    toggleExpandedQuestionsPanel() {
        // Check current file type and restrict access for non-programming files
        const currentFile = this.currentTab;
        const fileExtension = currentFile ? currentFile.split('.').pop().toLowerCase() : '';

        // Restrict access for txt and markdown files
        if (['txt', 'md', 'markdown'].includes(fileExtension)) {
            this.addMessage('🚫 Programming questions are not available for text and markdown files. Switch to a programming language file (Python, JavaScript, etc.) to access coding challenges.', 'assistant');
            return;
        }

        // Only allow questions when sidebar is expanded
        if (this.sidebarCollapsed) {
            this.openSidebar();
            return;
        }

        // Close any existing search panel first to prevent overlap
        const existingSearchPanel = document.querySelector('.expanded-search-panel');
        if (existingSearchPanel) {
            this.hideExpandedSearchPanel();
        }

        const existingQuestionsPanel = document.querySelector('.expanded-questions-panel');

        if (existingQuestionsPanel) {
            // Toggle visibility
            if (existingQuestionsPanel.style.display === 'none') {
                this.showExpandedQuestionsPanel();
            } else {
                this.hideExpandedQuestionsPanel();
            }
        } else {
            // Create and show questions panel in expanded sidebar
            this.createExpandedQuestionsPanel();
        }
    }

    createExpandedQuestionsPanel() {
        const explorerPanel = document.querySelector('.explorer-panel');
        if (!explorerPanel) return;

        // Get current file type to customize content
        const currentFile = this.currentTab;
        const fileExtension = currentFile ? currentFile.split('.').pop().toLowerCase() : '';
        const isWebTech = ['html', 'htm', 'xhtml', 'css', 'scss', 'sass', 'less'].includes(fileExtension);

        // Create questions panel that replaces file tree temporarily
        const questionsPanel = document.createElement('div');
        questionsPanel.className = 'expanded-questions-panel';

        const panelTitle = isWebTech ? 'Web Development Questions' : 'Programming Questions';
        const panelIcon = isWebTech ? 'fa-globe' : 'fa-lightbulb';
        const readyText = isWebTech ? 'Ready to practice web development?' : 'Ready to Practice?';
        const descriptionText = isWebTech ? 
            'Select a difficulty level and click "Get Random Question" to start practicing HTML/CSS challenges' :
            'Select a difficulty level and click "Get Random Question" to start practicing coding problems';

        questionsPanel.innerHTML = `
            <div class="expanded-questions-header">
                <h3><i class="fas ${panelIcon}"></i> ${panelTitle}</h3>
                <button class="expanded-questions-close" id="closeExpandedQuestions">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="expanded-questions-content">
                <div class="difficulty-selector">
                    <button class="difficulty-btn easy active" data-difficulty="easy">Easy</button>
                    <button class="difficulty-btn medium" data-difficulty="medium">Medium</button>
                    <button class="difficulty-btn hard" data-difficulty="hard">Hard</button>
                </div>

                <div class="question-display" id="questionDisplay">
                    <div class="no-question">
                        <i class="fas ${panelIcon}"></i>
                        <h4>${readyText}</h4>
                        <p>${descriptionText}</p>
                    </div>
                </div>

                <div class="question-actions">
                    <button class="question-btn primary" id="randomQuestionBtn">
                        <i class="fas fa-random"></i>
                        Get Random Question
                    </button>
                </div>
            </div>
        `;

        // Hide file tree and show questions panel
        const fileTree = explorerPanel.querySelector('.file-tree');
        const explorerLibrary = explorerPanel.querySelector('.explorer-library');

        if (fileTree) fileTree.style.display = 'none';
        if (explorerLibrary) explorerLibrary.style.display = 'none';

        explorerPanel.appendChild(questionsPanel);
        this.setupExpandedQuestionsEventListeners();
        this.showExpandedQuestionsPanel();

        // Update action button states
        this.updateActionButtonStates();
    }

    setupExpandedQuestionsEventListeners() {
        const closeBtn = document.getElementById('closeExpandedQuestions');
        const randomBtn = document.getElementById('randomQuestionBtn');
        const difficultyBtns = document.querySelectorAll('.difficulty-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideExpandedQuestionsPanel());
        }

        if (randomBtn) {
            randomBtn.addEventListener('click', () => this.showRandomQuestion());
        }

        difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active difficulty
                difficultyBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentDifficulty = btn.dataset.difficulty;
            });
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideExpandedQuestionsPanel();
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Store handler for cleanup
        const questionsPanel = document.querySelector('.expanded-questions-panel');
        if (questionsPanel) {
            questionsPanel._escapeHandler = escapeHandler;
        }
    }

    showExpandedQuestionsPanel() {
        const questionsPanel = document.querySelector('.expanded-questions-panel');
        if (questionsPanel) {
            questionsPanel.style.display = 'flex';
        }
        
        // Hide explorer actions bar
        this.updateActionButtonStates();
    }

    hideExpandedQuestionsPanel() {
        const questionsPanel = document.querySelector('.expanded-questions-panel');
        const explorerPanel = document.querySelector('.explorer-panel');

        if (questionsPanel && explorerPanel) {
            // Remove escape handler
            if (questionsPanel._escapeHandler) {
                document.removeEventListener('keydown', questionsPanel._escapeHandler);
            }

            // Remove questions panel
            questionsPanel.remove();

            // Show file tree and library again
            const fileTree = explorerPanel.querySelector('.file-tree');
            const explorerLibrary = explorerPanel.querySelector('.explorer-library');

            if (fileTree) fileTree.style.display = 'block';
            if (explorerLibrary) explorerLibrary.style.display = 'block';

            // Hide test cases tab when questions panel is closed
            this.hideTestCasesTab();

            // Show explorer actions bar again
            this.updateActionButtonStates();
        }
    }

    showRandomQuestion() {
        // Check current file type to determine question type
        const currentFile = this.currentTab;
        const fileExtension = currentFile ? currentFile.split('.').pop().toLowerCase() : '';
        const isWebTech = ['html', 'htm', 'xhtml', 'css', 'scss', 'sass', 'less'].includes(fileExtension);

        let questions;
        if (isWebTech) {
            questions = this.webDevelopmentQuestions[this.currentDifficulty];
        } else {
            questions = this.programmingQuestions[this.currentDifficulty];
        }

        if (!questions || questions.length === 0) return;

        const randomIndex = Math.floor(Math.random() * questions.length);
        this.currentQuestion = questions[randomIndex];
        this.displayQuestion(this.currentQuestion);
    }

    showNextQuestion() {
        // Check current file type to determine question type
        const currentFile = this.currentTab;
        const fileExtension = currentFile ? currentFile.split('.').pop().toLowerCase() : '';
        const isWebTech = ['html', 'htm', 'xhtml', 'css', 'scss', 'sass', 'less'].includes(fileExtension);

        let questions;
        if (isWebTech) {
            questions = this.webDevelopmentQuestions[this.currentDifficulty];
        } else {
            questions = this.programmingQuestions[this.currentDifficulty];
        }

        if (!questions || questions.length === 0) return;

        if (!this.currentQuestion) {
            this.showRandomQuestion();
            return;
        }

        // Find current question index and show next
        const currentIndex = questions.findIndex(q => q.title === this.currentQuestion.title);
        const nextIndex = (currentIndex + 1) % questions.length;
        this.currentQuestion = questions[nextIndex];
        this.displayQuestion(this.currentQuestion);
    }

    displayQuestion(question) {
        const questionDisplay = document.getElementById('questionDisplay');
        if (!questionDisplay) return;

        questionDisplay.innerHTML = `
            <div class="question-difficulty ${question.difficulty}">${question.difficulty.toUpperCase()}</div>
            <div class="question-title">${question.title}</div>
            <div class="question-content">${question.content}</div>
            <div class="question-example">${question.example}</div>
            <div class="question-stats">
                <span>Time: ${question.timeComplexity}</span>
                <span>Space: ${question.spaceComplexity}</span>
            </div>
            <div class="question-actions">
                <button class="question-btn secondary" id="startCodingBtn">
                    <i class="fas fa-code"></i>
                    Begin Undrstanding
                </button>
            </div>
        `;

        // Add event listener for the start coding button
        const startCodingBtn = document.getElementById('startCodingBtn');
        if (startCodingBtn) {
            startCodingBtn.addEventListener('click', () => {
                this.startCodingSession(question);
            });
        }

        // Add to chat for AI assistance
        this.addMessage(`📝 Programming Question: ${question.title} (${question.difficulty.toUpperCase()})`, 'assistant');
    }

    startCodingSession(question) {
        // Update the code editor header with the problem statement for the currently active file
        const activeContent = document.querySelector('.editor-content.active');
        if (activeContent) {
            const headerInput = activeContent.querySelector('.file-header-input');
            if (headerInput) {
                headerInput.value = `${question.title} - ${question.difficulty.toUpperCase()}`;

                // Store the custom heading for the current file
                if (!this.customHeadings) {
                    this.customHeadings = {};
                }
                this.customHeadings[this.currentTab] = headerInput.value;
            }

            // Add helpful comments to the code editor
            const codeInput = activeContent.querySelector('.code-input');
            if (codeInput) {
                const helpfulComments = this.generateProblemComments(question);

                // Get existing code content
                const existingCode = codeInput.value.trim();

                // Add comments at the beginning, preserving existing code
                const newContent = helpfulComments + (existingCode ? '\n\n' + existingCode : '');
                codeInput.value = newContent;

                // Update line numbers and position cursor after comments
                this.updateLineNumbers();
                this.updateLineCount();

                // Position cursor at the end of comments (ready to start coding)
                const commentLines = helpfulComments.split('\n').length;
                const cursorPosition = helpfulComments.length + (existingCode ? 2 : 0); // +2 for the two newlines
                codeInput.setSelectionRange(cursorPosition, cursorPosition);
                codeInput.focus();
            }
        }

        // Show test cases tab and generate test cases for the question
        this.showTestCasesTab();
        this.generateTestCases(question);

        // DON'T close the questions panel - keep it open
        // this.hideExpandedQuestionsPanel(); // Removed this line

        // Activate AI with the problem statement
        const aiPrompt = `I want to work on this coding problem: "${question.title}"

Problem Description:
${question.content}

Example:
${question.example}

Time Complexity: ${question.timeComplexity}
Space Complexity: ${question.spaceComplexity}

Please guide me through solving this step by step. Don't give me the complete solution, but help me understand the approach and logic needed.`;

        // Add the problem context to chat
        this.addMessage(`🚀 Starting coding session for: ${question.title}`, 'assistant');

        // Set up the chat input with the prompt and send it
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = aiPrompt;
            this.sendMessage();
        }

        // Focus on the code editor
        const codeInput = document.getElementById('codeInput');
        if (codeInput) {
            codeInput.focus();
        }
    }

    generateProblemComments(question) {
        const currentFile = this.currentTab;
        const fileExtension = currentFile ? currentFile.split('.').pop().toLowerCase() : '';

        // Check if it's HTML/CSS file
        if (['html', 'htm', 'xhtml'].includes(fileExtension)) {
            return `<!--
CODING PROBLEM: ${question.title} (${question.difficulty.toUpperCase()})

PROBLEM DESCRIPTION:
${question.content}

EXAMPLE:
${question.example}

APPROACH HINTS:
- Plan your HTML structure first
- Think about semantic HTML elements
- Consider responsive design
- Test with the provided example first

TODO:
1. Understand the problem requirements
2. Plan your HTML structure
3. Write the HTML markup
4. Add CSS styling if needed
5. Test and refine

Start coding below:
-->

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${question.title}</title>
    <style>
        /* Add your CSS here */
    </style>
</head>
<body>
    <!-- Your HTML code here -->

</body>
</html>`;
        } else if (['css', 'scss', 'sass', 'less'].includes(fileExtension)) {
            return `/*
CODING PROBLEM: ${question.title} (${question.difficulty.toUpperCase()})

PROBLEM DESCRIPTION:
${question.content}

EXAMPLE:
${question.example}

APPROACH HINTS:
- Plan your CSS structure first
- Think about responsive design
- Consider the box model
- Test with the provided example first

TODO:
1. Understand the problem requirements
2. Plan your CSS approach
3. Write the CSS rules
4. Test and refine
5. Optimize if needed

Start coding below:
*/

/* Your CSS code here */`;
        } else if (['js', 'jsx', 'ts', 'tsx'].includes(fileExtension)) {
            return `/*
CODING PROBLEM: ${question.title} (${question.difficulty.toUpperCase()})

PROBLEM DESCRIPTION:
${question.content}

EXAMPLE:
${question.example}

CONSTRAINTS:
- Time Complexity: ${question.timeComplexity}
- Space Complexity: ${question.spaceComplexity}

APPROACH HINTS:
- Break down the problem into smaller steps
- Think about edge cases (empty input, single element, etc.)
- Consider the most efficient algorithm for the given constraints
- Test with the provided example first

TODO:
1. Understand the problem requirements
2. Plan your approach
3. Write the main function/algorithm
4. Test with example cases
5. Optimize if needed

Start coding below:
*/

function solution() {
    // Your code here
}

// Test the solution
// Add test cases here`;
        } else {
            // Default to Python comments for .py files and others
            return `"""
CODING PROBLEM: ${question.title} (${question.difficulty.toUpperCase()})

PROBLEM DESCRIPTION:
${question.content}

EXAMPLE:
${question.example}

CONSTRAINTS:
- Time Complexity: ${question.timeComplexity}
- Space Complexity: ${question.spaceComplexity}

APPROACH HINTS:
- Break down the problem into smaller steps
- Think about edge cases (empty input, single element, etc.)
- Consider the most efficient algorithm for the given constraints
- Test with the provided example first

TODO:
1. Understand the problem requirements
2. Plan your approach
3. Write the main function/algorithm
4. Test with example cases
5. Optimize if needed

Start coding below:
"""

def solution():
    # Your code here
    pass

# Test the solution
if __name__ == "__main__":
    # Add test cases here
    pass`;
        }
    }

    initializeProgrammingQuestions() {
        return {
            easy: [
                {
                    title: "Two Sum",
                    content: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                    example: "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: nums[0] + nums[1] = 2 + 7 = 9",
                    difficulty: "easy",
                    timeComplexity: "O(n)",
                    spaceComplexity: "O(n)"
                },
                {
                    title: "Reverse String",
                    content: "Write a function that reverses a string. The input string is given as an array of characters s.",
                    example: "Input: s = ['h','e','l','l','o']\nOutput: ['o','l','l','e','h']",
                    difficulty: "easy",
                    timeComplexity: "O(n)",
                    spaceComplexity: "O(1)"
                },
                {
                    title: "Valid Parentheses",
                    content: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
                    example: "Input: s = '()'\nOutput: true\nInput: s = '([)]'\nOutput: false",
                    difficulty: "easy",
                    timeComplexity: "O(n)",
                    spaceComplexity: "O(n)"
                },
                {
                    title: "Palindrome Number",
                    content: "Given an integer x, return true if x is palindrome integer. An integer is a palindrome when it reads the same backward as forward.",
                    example: "Input: x = 121\nOutput: true\nInput: x = -121\nOutput: false",
                    difficulty: "easy",
                    timeComplexity: "O(log n)",
                    spaceComplexity: "O(1)"
                },
                {
                    title: "Maximum Subarray",
                    content: "Given an integer array nums, find the contiguous subarray which has the largest sum and return its sum.",
                    example: "Input: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: [4,-1,2,1] has the largest sum = 6",
                    difficulty: "easy",
                    timeComplexity: "O(n)",
                    spaceComplexity: "O(1)"
                }
            ],
            medium: [
                {
                    title: "Longest Substring Without Repeating Characters",
                    content: "Given a string s, find the length of the longest substring without repeating characters.",
                    example: "Input: s = 'abcabcbb'\nOutput: 3\nExplanation: The answer is 'abc', with the length of 3",
                    difficulty: "medium",
                    timeComplexity: "O(n)",
                    spaceComplexity: "O(min(m,n))"
                },
                {
                    title: "Add Two Numbers",
                    content: "You are given two non-empty linked lists representing two non-negative integers. Add the two numbers and return the sum as a linked list.",
                    example: "Input: l1 = [2,4,3], l2 = [5,6,4]\nOutput: [7,0,8]\nExplanation: 342 + 465 = 807",
                    difficulty: "medium",
                    timeComplexity: "O(max(m,n))",
                    spaceComplexity: "O(max(m,n))"
                },
                {
                    title: "3Sum",
                    content: "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.",
                    example: "Input: nums = [-1,0,1,2,-1,-4]\nOutput: [[-1,-1,2],[-1,0,1]]",
                    difficulty: "medium",
                    timeComplexity: "O(n²)",
                    spaceComplexity: "O(1)"
                },
                {
                    title: "Container With Most Water",
                    content: "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container that holds the most water.",
                    example: "Input: height = [1,8,6,2,5,4,8,3,7]\nOutput: 49",
                    difficulty: "medium",
                    timeComplexity: "O(n)",
                    spaceComplexity: "O(1)"
                },
                {
                    title: "Group Anagrams",
                    content: "Given an array of strings strs, group the anagrams together. You can return the answer in any order.",
                    example: "Input: strs = ['eat','tea','tan','ate','nat','bat']\nOutput: [['bat'],['nat','tan'],['ate','eat','tea']]",
                    difficulty: "medium",
                    timeComplexity: "O(n*k*log(k))",
                    spaceComplexity: "O(n*k)"
                }
            ],
            hard: [
                {
                    title: "Median of Two Sorted Arrays",
                    content: "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).",
                    example: "Input: nums1 = [1,3], nums2 = [2]\nOutput: 2.0\nExplanation: merged array = [1,2,3] and median is 2",
                    difficulty: "hard",
                    timeComplexity: "O(log(min(m,n)))",
                    spaceComplexity: "O(1)"
                },
                {
                    title: "Trapping Rain Water",
                    content: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
                    example: "Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6",
                    difficulty: "hard",
                    timeComplexity: "O(n)",
                    spaceComplexity: "O(1)"
                },
                {
                    title: "Longest Valid Parentheses",
                    content: "Given a string containing just the characters '(' and ')', find the length of the longest valid (well-formed) parentheses substring.",
                    example: "Input: s = '(()'\nOutput: 2\nExplanation: The longest valid parentheses substring is '()'",
                    difficulty: "hard",
                    timeComplexity: "O(n)",
                    spaceComplexity: "O(n)"
                },
                {
                    title: "Merge k Sorted Lists",
                    content: "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.",
                    example: "Input: lists = [[1,4,5],[1,3,4],[2,6]]\nOutput: [1,1,2,3,4,4,5,6]",
                    difficulty: "hard",
                    timeComplexity: "O(n*log(k))",
                    spaceComplexity: "O(log(k))"
                },
                {
                    title: "Regular Expression Matching",
                    content: "Given an input string s and a pattern p, implement regular expression matching with support for '.' and '*' where '.' matches any single character and '*' matches zero or more of the preceding element.",
                    example: "Input: s = 'aa', p = 'a*'\nOutput: true\nExplanation: '*' means zero or more of the preceding element, 'a'",
                    difficulty: "hard",
                    timeComplexity: "O(m*n)",
                    spaceComplexity: "O(m*n)"
                }
            ]
        };
    }

    initializeWebDevelopmentQuestions() {
        return {
            easy: [
                {
                    title: "Basic HTML Structure",
                    content: "Create a simple HTML page with a header, main content area, and footer. Include a title, heading, paragraph, and at least one link.",
                    example: "Structure should include:\n- DOCTYPE declaration\n- HTML5 semantic elements\n- Proper heading hierarchy (h1, h2)\n- Valid link with href attribute",
                    difficulty: "easy",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                },
                {
                    title: "CSS Box Model",
                    content: "Style a div element with specific margin, padding, border, and background color. Make the total width exactly 300px including all spacing.",
                    example: "Target: 300px total width\nContent width: 200px\nPadding: 20px on each side\nBorder: 5px solid\nMargin: Calculate the remaining space",
                    difficulty: "easy",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                },
                {
                    title: "HTML Forms",
                    content: "Create a contact form with proper input types: name (text), email (email), phone (tel), message (textarea), and a submit button.",
                    example: "Form should include:\n- Proper input types\n- Labels for accessibility\n- Required attributes\n- Form validation",
                    difficulty: "easy",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                },
                {
                    title: "CSS Flexbox Layout",
                    content: "Create a navigation bar using Flexbox with logo on the left and menu items on the right. Items should be vertically centered.",
                    example: "Navigation should include:\n- Logo/brand name (left)\n- Menu items (right)\n- Vertical alignment\n- Responsive behavior",
                    difficulty: "easy",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                },
                {
                    title: "HTML Lists and Links",
                    content: "Create an unordered list of your favorite websites with clickable links that open in new tabs.",
                    example: "List should include:\n- At least 5 websites\n- Proper link attributes (href, target)\n- Semantic HTML structure\n- Basic styling with CSS",
                    difficulty: "easy",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                }
            ],
            medium: [
                {
                    title: "CSS Grid Layout",
                    content: "Create a responsive photo gallery using CSS Grid. The gallery should display 3 columns on desktop, 2 on tablet, and 1 on mobile.",
                    example: "Grid requirements:\n- 3 columns (desktop: >768px)\n- 2 columns (tablet: 480-768px)\n- 1 column (mobile: <480px)\n- Equal spacing between items",
                    difficulty: "medium",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                },
                {
                    title: "CSS Animations",
                    content: "Create a button with hover animations including color transition, scale effect, and box-shadow changes. Animation should be smooth and professional.",
                    example: "Button effects:\n- Color transition (0.3s ease)\n- Scale to 1.05 on hover\n- Box-shadow depth change\n- Cursor pointer",
                    difficulty: "medium",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                },
                {
                    title: "Responsive Web Design",
                    content: "Create a responsive card layout that adapts from 4 cards per row on desktop to 1 card per row on mobile using CSS media queries.",
                    example: "Breakpoints:\n- Desktop (>1024px): 4 cards per row\n- Tablet (768-1024px): 2 cards per row\n- Mobile (<768px): 1 card per row",
                    difficulty: "medium",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                },
                {
                    title: "CSS Custom Properties",
                    content: "Create a theme system using CSS custom properties (variables) for colors, fonts, and spacing. Include a dark/light theme toggle.",
                    example: "Theme system should include:\n- Color variables (primary, secondary, background)\n- Typography variables (font-family, sizes)\n- Spacing variables\n- Theme switching capability",
                    difficulty: "medium",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                },
                {
                    title: "HTML5 Semantic Elements",
                    content: "Build a blog post layout using proper HTML5 semantic elements: article, section, aside, nav, header, footer, and time elements.",
                    example: "Semantic structure:\n- Header with navigation\n- Main article with sections\n- Sidebar with related content\n- Footer with metadata\n- Proper heading hierarchy",
                    difficulty: "medium",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                }
            ],
            hard: [
                {
                    title: "CSS-only Dropdown Menu",
                    content: "Create a multi-level dropdown navigation menu using only CSS (no JavaScript). Include hover effects, transitions, and keyboard accessibility.",
                    example: "Menu features:\n- Multi-level dropdowns\n- Smooth hover transitions\n- Keyboard navigation support\n- Mobile-friendly toggle\n- Pure CSS implementation",
                    difficulty: "hard",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                },
                {
                    title: "CSS Masonry Layout",
                    content: "Create a Pinterest-style masonry layout using CSS Grid or Flexbox. Items should have varying heights and flow naturally.",
                    example: "Masonry requirements:\n- Variable height items\n- No large gaps\n- Responsive columns\n- Smooth loading animation\n- Performance optimization",
                    difficulty: "hard",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                },
                {
                    title: "Advanced CSS Shapes",
                    content: "Create complex geometric shapes and layouts using CSS clip-path, transform, and positioning. Build a creative hero section design.",
                    example: "Design should include:\n- Custom clip-path shapes\n- Complex transforms\n- Layered positioning\n- Creative use of pseudo-elements\n- Responsive behavior",
                    difficulty: "hard",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                },
                {
                    title: "CSS Loading Animations",
                    content: "Create a set of sophisticated loading animations using pure CSS. Include spinners, progress bars, and skeleton screens.",
                    example: "Animation set:\n- Rotating spinner with easing\n- Progress bar with percentage\n- Skeleton loading cards\n- Pulsing effects\n- Optimized performance",
                    difficulty: "hard",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                },
                {
                    title: "Responsive Typography System",
                    content: "Create a complete typography system with fluid fonts, proper line heights, and optimal reading experience across all devices.",
                    example: "Typography system:\n- Fluid font sizing (clamp)\n- Proper line height ratios\n- Responsive spacing\n- Accessibility considerations\n- Print stylesheet",
                    difficulty: "hard",
                    timeComplexity: "N/A",
                    spaceComplexity: "N/A"
                }
            ]
        };
    }

    // Test Cases methods
    showTestCasesTab() {
        const testCasesTab = document.getElementById('testCasesTab');
        if (testCasesTab) {
            testCasesTab.style.display = 'flex';
        }
    }

    hideTestCasesTab() {
        const testCasesTab = document.getElementById('testCasesTab');
        if (testCasesTab) {
            testCasesTab.style.display = 'none';
        }

        // Switch back to terminal tab if test cases tab was active
        const testCasesTabElement = document.querySelector('[data-tab="test-cases"]');
        if (testCasesTabElement && testCasesTabElement.classList.contains('active')) {
            this.switchTerminalTab('terminal');
        }
    }

    generateTestCases(question) {
        const testCases = this.getTestCasesForQuestion(question);
        this.currentTestCases = testCases;
        this.renderTestCases(testCases);
        this.setupTestCasesEventListeners();
    }

    getTestCasesForQuestion(question) {
        // Generate test cases based on the question type
        const title = question.title.toLowerCase();

        if (title.includes('two sum')) {
            return [
                {
                    id: 1,
                    title: 'Basic Case',
                    description: 'Standard two sum with valid solution',
                    input: 'nums = [2,7,11,15], target = 9',
                    expectedOutput: '[0,1]',
                    actualOutput: null,
                    status: 'pending'
                },
                {
                    id: 2,
                    title: 'Edge Case',
                    description: 'Two sum with negative numbers',
                    input: 'nums = [3,2,4], target = 6',
                    expectedOutput: '[1,2]',
                    actualOutput: null,
                    status: 'pending'
                },
                {
                    id: 3,
                    title: 'Duplicate Values',
                    description: 'Two sum with duplicate values',
                    input: 'nums = [3,3], target = 6',
                    expectedOutput: '[0,1]',
                    actualOutput: null,
                    status: 'pending'
                }
            ];
        } else if (title.includes('reverse string')) {
            return [
                {
                    id: 1,
                    title: 'Basic Case',
                    description: 'Reverse a simple string',
                    input: 's = ["h","e","l","l","o"]',
                    expectedOutput: '["o","l","l","e","h"]',
                    actualOutput: null,
                    status: 'pending'
                },
                {
                    id: 2,
                    title: 'Single Character',
                    description: 'Reverse single character',
                    input: 's = ["a"]',
                    expectedOutput: '["a"]',
                    actualOutput: null,
                    status: 'pending'
                }
            ];
        } else if (title.includes('palindrome')) {
            return [
                {
                    id: 1,
                    title: 'Positive Palindrome',
                    description: 'Check if positive number is palindrome',
                    input: 'x = 121',
                    expectedOutput: 'true',
                    actualOutput: null,
                    status: 'pending'
                },
                {
                    id: 2,
                    title: 'Negative Number',
                    description: 'Check if negative number is palindrome',
                    input: 'x = -121',
                    expectedOutput: 'false',
                    actualOutput: null,
                    status: 'pending'
                },
                {
                    id: 3,
                    title: 'Single Digit',
                    description: 'Check if single digit is palindrome',
                    input: 'x = 7',
                    expectedOutput: 'true',
                    actualOutput: null,
                    status: 'pending'
                }
            ];
        } else {
            // Generic test cases for other problems
            return [
                {
                    id: 1,
                    title: 'Test Case 1',
                    description: 'Basic functionality test',
                    input: 'Sample input based on problem',
                    expectedOutput: 'Expected output',
                    actualOutput: null,
                    status: 'pending'
                },
                {
                    id: 2,
                    title: 'Test Case 2',
                    description: 'Edge case test',
                    input: 'Edge case input',
                    expectedOutput: 'Expected edge case output',
                    actualOutput: null,
                    status: 'pending'
                }
            ];
        }
    }

    renderTestCases(testCases) {
        const testCasesList = document.getElementById('testCasesList');
        if (!testCasesList) return;

        if (testCases.length === 0) {
            testCasesList.innerHTML = `
                <div class="no-tests">
                    <i class="fas fa-vial"></i>
                    <p>No test cases available</p>
                </div>
            `;
            return;
        }

        let testCasesHTML = '';
        testCases.forEach(testCase => {
            const statusIcon = testCase.status === 'passed' ? 'fa-check' : 
                             testCase.status === 'failed' ? 'fa-times' : 'fa-clock';

            testCasesHTML += `
                <div class="test-case-item ${testCase.status}" data-test-id="${testCase.id}">
                    <div class="test-case-info">
                        <div class="test-case-title">${testCase.title}</div>
                        <div class="test-case-description">${testCase.description}</div>
                    </div>
                    <div class="test-case-status ${testCase.status}">
                        <i class="fas ${statusIcon}"></i>
                        <span>${testCase.status.charAt(0).toUpperCase() + testCase.status.slice(1)}</span>
                    </div>
                </div>
            `;
        });

        testCasesList.innerHTML = testCasesHTML;
    }

    setupTestCasesEventListeners() {
        // Test case item click listeners
        document.querySelectorAll('.test-case-item').forEach(item => {
            item.addEventListener('click', () => {
                const testId = parseInt(item.dataset.testId);
                this.showTestCaseDetails(testId);
            });
        });

        // Run all tests button
        const runAllTestsBtn = document.getElementById('runAllTestsBtn');
        if (runAllTestsBtn) {
            runAllTestsBtn.addEventListener('click', () => {
                this.runAllTests();
            });
        }

        // Close test details button
        const closeTestDetails = document.getElementById('closeTestDetails');
        if (closeTestDetails) {
            closeTestDetails.addEventListener('click', () => {
                this.hideTestCaseDetails();
            });
        }
    }

    showTestCaseDetails(testId) {
        const testCase = this.currentTestCases.find(tc => tc.id === testId);
        if (!testCase) return;

        const testCaseDetails = document.getElementById('testCaseDetails');
        const testDetailsTitle = document.getElementById('testDetailsTitle');
        const testInput = document.getElementById('testInput');
        const testExpected = document.getElementById('testExpected');
        const testActual = document.getElementById('testActual');

        if (testCaseDetails && testDetailsTitle && testInput && testExpected && testActual) {
            testDetailsTitle.textContent = `${testCase.title} - Details`;
            testInput.textContent = testCase.input;
            testExpected.textContent = testCase.expectedOutput;
            testActual.textContent = testCase.actualOutput || 'Not run yet';

            // Apply styling based on test result
            if (testCase.status === 'passed') {
                testActual.className = 'test-detail-box success';
            } else if (testCase.status === 'failed') {
                testActual.className = 'test-detail-box error';
            } else {
                testActual.className = 'test-detail-box';
            }

            testCaseDetails.style.display = 'flex';
        }
    }

    hideTestCaseDetails() {
        const testCaseDetails = document.getElementById('testCaseDetails');
        if (testCaseDetails) {
            testCaseDetails.style.display = 'none';
        }
    }

    async runAllTests() {
        if (!this.currentTestCases) return;

        const code = this.getCodeFromEditor();
        if (!code.trim()) {
            this.addMessage('Please write some code before running tests.', 'assistant');
            return;
        }

        this.addMessage('🧪 Running all test cases...', 'assistant');
        this.switchTerminalTab('test-cases');

        for (let testCase of this.currentTestCases) {
            testCase.status = 'pending';
            await this.runSingleTest(testCase, code);
        }

        this.renderTestCases(this.currentTestCases);

        const passedTests = this.currentTestCases.filter(tc => tc.status === 'passed').length;
        const totalTests = this.currentTestCases.length;

        if (passedTests === totalTests) {
            this.addMessage(`🎉 All ${totalTests} test cases passed! Great job!`, 'assistant');
        } else {
            this.addMessage(`📊 ${passedTests}/${totalTests} test cases passed. Check the failed tests for details.`, 'assistant');
        }
    }

    async runSingleTest(testCase, code) {
        try {
            // This is a simplified test runner - in a real implementation,
            // you would execute the code with the test inputs and compare outputs

            // Simulate test execution with a random result for demo purposes
            // In a real implementation, you would parse the input, run the code, and compare outputs
            const success = Math.random() > 0.3; // 70% success rate for demo

            if (success) {
                testCase.status = 'passed';
                testCase.actualOutput = testCase.expectedOutput;
            } else {
                testCase.status = 'failed';
                testCase.actualOutput = 'Different output or error occurred';
            }

            // Add a small delay to simulate execution time
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            testCase.status = 'failed';
            testCase.actualOutput = `Error: ${error.message}`;
        }
    }

    // Visualization methods
    showVisualization(type, data) {
        const visualizationContainer = document.getElementById('visualizationContainer');
        const placeholder = document.getElementById('visualizationPlaceholder');

        if (!visualizationContainer) {
            console.error('Visualization container not found');
            return;
        }

        // Hide placeholder
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Switch to visualize tab
        this.switchTerminalTab('visualize');

        // Clear previous visualization (except placeholder)
        const existingViz = visualizationContainer.querySelector('.visualization-content');
        if (existingViz) {
            existingViz.remove();
        }

        // Create visualization content container
        const vizContent = document.createElement('div');
        vizContent.className = 'visualization-content';
        visualizationContainer.appendChild(vizContent);

        switch (type) {
            case 'sorting':
                this.visualizeSorting(data, vizContent);
                break;
            case 'searching':
                this.visualizeSearching(data, vizContent);
                break;
            default:
                this.showTerminalOutput('Visualization type not supported.', 'info');
                break;
        }
    }

    visualizeSorting(data, container) {
        if (!data || !data.array || !Array.isArray(data.array)) {
            this.showTerminalOutput('Invalid sorting data received.', 'error');
            return;
        }

        const array = [...data.array]; // Create copy for manipulation
        const steps = data.steps || [];
        const algorithm = data.algorithm || 'Sorting';

        container.innerHTML = `
            <div class="visualization-info">
                <h5>${algorithm} Algorithm Visualization</h5>
                <p>Original array: [${array.join(', ')}] - ${steps.length} steps to sort</p>
                <div class="step-description" id="stepDescription">
                    <span class="step-counter">Ready to begin</span>
                    <span class="step-text">Click "Next" or "Play" to start the visualization</span>
                </div>
            </div>
        `;

        // Create array elements
        const arrayContainer = document.createElement('div');
        arrayContainer.className = 'visualization-array';
        arrayContainer.style.cssText = `
            display: flex;
            align-items: flex-end;
            justify-content: center;
            gap: 8px;
            padding: var(--space-md);
            background: var(--editor-bg-secondary);
            border-radius: 8px;
            margin: var(--space-md) 0;
            border: 1px solid var(--editor-border);
            min-height: 180px;
        `;
        container.appendChild(arrayContainer);

        this.renderArrayElements(array, arrayContainer);

        // Create step controls
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'visualization-step-controls';
        controlsContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: var(--space-sm);
            padding: var(--space-md);
            background: var(--editor-bg-secondary);
            border-radius: 8px;
            margin: var(--space-md) 0;
            border: 1px solid var(--editor-border);
        `;
        controlsContainer.innerHTML = `
            <button class="step-control-btn" id="prevStepBtn" disabled style="padding: 8px 16px; font-size: 13px;">
                <i class="fas fa-step-backward"></i>
                Previous
            </button>
            <button class="step-control-btn play-pause" id="playPauseBtn" style="padding: 8px 16px; font-size: 13px;">
                <i class="fas fa-play"></i>
                Play
            </button>
            <button class="step-control-btn" id="nextStepBtn" style="padding: 8px 16px; font-size: 13px;">
                <i class="fas fa-step-forward"></i>
                Next
            </button>
            <button class="step-control-btn reset" id="resetBtn" style="padding: 8px 16px; font-size: 13px;">
                <i class="fas fa-undo"></i>
                Reset
            </button>
        `;
        container.appendChild(controlsContainer);

        // Initialize visualization state
        this.vizState = {
            array: [...array],
            originalArray: [...array],
            steps: steps,
            currentStep: 0,
            isPlaying: false,
            playInterval: null,
            algorithm: algorithm
        };

        // Add event listeners
        this.setupVisualizationControls(container);
    }

    renderArrayElements(array, container) {
        container.innerHTML = '';
        const maxValue = Math.max(...array);
        array.forEach((value, index) => {
            const element = document.createElement('div');
            element.className = 'array-element visualization-element';

            // Calculate proportional height with minimum
            const height = Math.max((value / maxValue) * 120, 40);
            element.style.cssText = `
                height: ${height}px;
                background: var(--blue);
                border: 2px solid var(--blue);
                border-radius: 12px;
                margin-bottom: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-width: 50px;
                padding: 8px;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            `;

            // Add value and index display
            element.innerHTML = `
                <div class="element-value" style="color: white; font-weight: 600; font-size: 14px; margin-bottom: 2px;">${value}</div>
                <div class="element-index" style="font-size: 10px; color: var(--text-secondary); position: absolute; bottom: -16px; font-family: var(--font-mono);">${index}</div>
            `;

            element.dataset.index = index;
            element.dataset.value = value;

            // Add hover effect
            element.addEventListener('mouseenter', () => {
                if (!element.classList.contains('comparing') && !element.classList.contains('swapping')) {
                    element.style.transform = 'translateY(-2px) scale(1.02)';
                    element.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                }
            });

            element.addEventListener('mouseleave', () => {
                if (!element.classList.contains('comparing') && !element.classList.contains('swapping')) {
                    element.style.transform = '';
                    element.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                }
            });

            container.appendChild(element);
        });
    }

    setupVisualizationControls(container) {
        const prevBtn = container.querySelector('#prevStepBtn');
        const playPauseBtn = container.querySelector('#playPauseBtn');
        const nextBtn = container.querySelector('#nextStepBtn');
        const resetBtn = container.querySelector('#resetBtn');

        prevBtn.addEventListener('click', () => this.previousVisualizationStep(container));
        playPauseBtn.addEventListener('click', () => this.toggleVisualizationPlay(container));
        nextBtn.addEventListener('click', () => this.nextVisualizationStep(container));
        resetBtn.addEventListener('click', () => this.resetVisualization(container));
    }

    nextVisualizationStep(container) {
        if (!this.vizState || this.vizState.currentStep >= this.vizState.steps.length) {
            this.completeVisualization(container);
            return;
        }

        const step = this.vizState.steps[this.vizState.currentStep];
        const arrayContainer = container.querySelector('.visualization-array');

        // First update the array if step contains new array state
        if (step.array) {
            this.vizState.array = [...step.array];
            this.renderArrayElements(this.vizState.array, arrayContainer);
        }

        // Get fresh elements after potential re-render
        const elements = arrayContainer.querySelectorAll('.visualization-element');

        // Clear previous states with a small delay to see transitions
        setTimeout(() => {
            elements.forEach(el => {
                el.classList.remove('comparing', 'swapping', 'selected', 'found', 'eliminated', 'sorted', 'pivot', 'left-partition', 'right-partition', 'greater-partition', 'merging');
                el.style.background = '';
                el.style.borderColor = '';
            });

            // Handle different step types with enhanced animations
            switch (step.type) {
                case 'compare':
                    if (step.indices) {
                        const [i, j] = step.indices;
                        if (elements[i] && elements[j]) {
                            elements[i].classList.add('comparing');
                            elements[j].classList.add('comparing');
                        }
                    } else if (step.index !== undefined) {
                        if (elements[step.index]) {
                            elements[step.index].classList.add('comparing');
                        }
                    }
                    break;

                case 'swap':
                    if (step.indices) {
                        const [i, j] = step.indices;
                        if (elements[i] && elements[j]) {
                            elements[i].classList.add('swapping');
                            elements[j].classList.add('swapping');

                            // Add visual feedback with longer duration for swap
                            setTimeout(() => {
                                if (elements[i] && elements[j]) {
                                    elements[i].classList.remove('swapping');
                                    elements[j].classList.remove('swapping');
                                }
                            }, 1000);
                        }
                    }
                    break;

                case 'select':
                case 'new_min':
                    if (step.index !== undefined && elements[step.index]) {
                        elements[step.index].classList.add('selected');
                    }
                    break;

                case 'found':
                    if (step.index !== undefined && elements[step.index]) {
                        elements[step.index].classList.add('found');
                    }
                    break;

                case 'eliminate_left':
                case 'eliminate_right':
                    // Highlight eliminated range
                    const start = step.type === 'eliminate_left' ? 0 : step.left || 0;
                    const end = step.type === 'eliminate_left' ? (step.new_left || 0) - 1 : (step.new_right || elements.length - 1) + 1;
                    for (let k = start; k < end && k < elements.length; k++) {
                        if (elements[k]) {
                            elements[k].classList.add('eliminated');
                        }
                    }
                    break;

                // Quick Sort specific cases
                case 'select_pivot':
                    if (step.pivot_index !== undefined && elements[step.pivot_index]) {
                        elements[step.pivot_index].classList.add('pivot');
                        elements[step.pivot_index].classList.add('selected');
                    }
                    // Highlight the range being partitioned
                    if (step.left !== undefined && step.right !== undefined) {
                        for (let k = step.left; k <= step.right; k++) {
                            if (elements[k] && k !== step.pivot_index) {
                                elements[k].style.background = 'rgba(99, 102, 241, 0.05)';
                                elements[k].style.borderColor = 'rgba(99, 102, 241, 0.2)';
                            }
                        }
                    }
                    break;

                case 'partition_compare':
                    if (step.comparing_index !== undefined && elements[step.comparing_index]) {
                        elements[step.comparing_index].classList.add('comparing');
                    }
                    if (step.pivot_index !== undefined && elements[step.pivot_index]) {
                        elements[step.pivot_index].classList.add('pivot');
                    }
                    break;

                case 'partition_move':
                    if (step.element_index !== undefined && elements[step.element_index]) {
                        elements[step.element_index].classList.add('left-partition');
                    }
                    if (step.pivot_index !== undefined && elements[step.pivot_index]) {
                        elements[step.pivot_index].classList.add('pivot');
                    }
                    break;

                case 'partition_greater':
                    if (step.element_index !== undefined && elements[step.element_index]) {
                        elements[step.element_index].classList.add('greater-partition');
                    }
                    if (step.pivot_index !== undefined && elements[step.pivot_index]) {
                        elements[step.pivot_index].classList.add('pivot');
                    }
                    break;

                case 'place_pivot':
                    if (step.final_position !== undefined && elements[step.final_position]) {
                        elements[step.final_position].classList.add('found');
                        elements[step.final_position].classList.add('pivot');
                    }
                    // Show partitioned sections
                    if (step.final_position !== undefined) {
                        for (let k = 0; k < step.final_position; k++) {
                            if (elements[k]) {
                                elements[k].classList.add('left-partition');
                            }
                        }
                        for (let k = step.final_position + 1; k < elements.length; k++) {
                            if (elements[k]) {
                                elements[k].classList.add('greater-partition');
                            }
                        }
                    }
                    break;

                // Merge Sort specific cases
                case 'divide':
                    if (step.left_half && step.right_half) {
                        // Highlight left half
                        step.left_half.forEach(index => {
                            if (elements[index]) {
                                elements[index].classList.add('left-partition');
                            }
                        });
                        // Highlight right half
                        step.right_half.forEach(index => {
                            if (elements[index]) {
                                elements[index].classList.add('right-partition');
                            }
                        });
                    }
                    break;

                case 'merge_compare':
                    if (step.left_index !== undefined && elements[step.left_index]) {
                        elements[step.left_index].classList.add('comparing');
                        elements[step.left_index].classList.add('left-partition');
                    }
                    if (step.right_index !== undefined && elements[step.right_index]) {
                        elements[step.right_index].classList.add('comparing');
                        elements[step.right_index].classList.add('right-partition');
                    }
                    break;

                case 'merge_place':
                    if (step.target_index !== undefined && elements[step.target_index]) {
                        elements[step.target_index].classList.add('merging');
                        elements[step.target_index].classList.add('selected');
                    }
                    // Highlight the merging range
                    if (step.merge_range) {
                        for (let k = step.merge_range[0]; k <= step.merge_range[1]; k++) {
                            if (elements[k] && k !== step.target_index) {
                                elements[k].style.background = 'rgba(251, 191, 36, 0.1)';
                                elements[k].style.borderColor = 'rgba(251, 191, 36, 0.3)';
                            }
                        }
                    }
                    break;

                case 'merge_complete':
                    if (step.merged_range) {
                        for (let k = step.merged_range[0]; k <= step.merged_range[1]; k++) {
                            if (elements[k]) {
                                elements[k].classList.add('found');
                            }
                        }
                    }
                    break;

                case 'complete':
                    elements.forEach((el, index) => {
                        setTimeout(() => {
                            el.classList.add('sorted');
                            el.classList.add('found');
                        }, index * 100); // Staggered completion animation
                    });
                    break;
            }
        }, 50);

        this.vizState.currentStep++;
        this.updateVisualizationControls(container);
    }

    previousVisualizationStep(container) {
        if (!this.vizState || this.vizState.currentStep <= 0) return;

        this.vizState.currentStep--;

        // Get the previous step's array state
        if (this.vizState.currentStep > 0) {
            const prevStep = this.vizState.steps[this.vizState.currentStep - 1];
            if (prevStep.array) {
                this.vizState.array = [...prevStep.array];
            }
        } else {
            // Reset to original array
            this.vizState.array = [...this.vizState.originalArray];
        }

        const arrayContainer = container.querySelector('.visualization-array');
        this.renderArrayElements(this.vizState.array, arrayContainer);

        // Clear all visual states
        const elements = arrayContainer.querySelectorAll('.visualization-element');
        elements.forEach(el => {
            el.classList.remove('comparing', 'swapping', 'selected', 'found', 'eliminated');
        });

        this.updateVisualizationControls(container);
    }

    toggleVisualizationPlay(container) {
        if (!this.vizState) return;

        if (this.vizState.isPlaying) {
            this.pauseVisualization(container);
        } else {
            this.playVisualization(container);
        }
    }

    playVisualization(container) {
        if (!this.vizState) return;

        this.vizState.isPlaying = true;
        const playPauseBtn = container.querySelector('#playPauseBtn');
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>Pause';

        this.vizState.playInterval = setInterval(() => {
            if (this.vizState.currentStep >= this.vizState.steps.length) {
                this.pauseVisualization(container);
                return;
            }
            this.nextVisualizationStep(container);
        }, 1000);
    }

    pauseVisualization(container) {
        if (!this.vizState) return;

        this.vizState.isPlaying = false;
        const playPauseBtn = container.querySelector('#playPauseBtn');
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>Play';

        if (this.vizState.playInterval) {
            clearInterval(this.vizState.playInterval);
            this.vizState.playInterval = null;
        }
    }

    resetVisualization(container) {
        if (!this.vizState) return;

        this.pauseVisualization(container);
        this.vizState.currentStep = 0;
        this.vizState.array = [...this.vizState.originalArray];

        const arrayContainer = container.querySelector('.visualization-array');
        this.renderArrayElements(this.vizState.array, arrayContainer);
        this.updateVisualizationControls(container);
    }

    updateVisualizationControls(container) {
        if (!this.vizState) return;

        const prevBtn = container.querySelector('#prevStepBtn');
        const nextBtn = container.querySelector('#nextStepBtn');
        const playPauseBtn = container.querySelector('#playPauseBtn');
        const stepDescription = container.querySelector('#stepDescription');

        prevBtn.disabled = this.vizState.currentStep <= 0;
        nextBtn.disabled = this.vizState.currentStep >= this.vizState.steps.length;

        // Update step description
        if (stepDescription) {
            const stepCounter = stepDescription.querySelector('.step-counter');
            const stepText = stepDescription.querySelector('.step-text');

            if (this.vizState.currentStep >= this.vizState.steps.length) {
                stepCounter.textContent = 'Complete!';
                stepText.textContent = 'Array is now sorted';
            } else if (this.vizState.currentStep === 0) {
                stepCounter.textContent = 'Ready to begin';
                stepText.textContent = 'Click "Next" or "Play" to start the visualization';
            } else {
                const step = this.vizState.steps[this.vizState.currentStep - 1];
                stepCounter.textContent = `Step ${this.vizState.currentStep} of ${this.vizState.steps.length}`;
                stepText.textContent = this.getStepDescription(step);
            }
        }

        if (this.vizState.currentStep >= this.vizState.steps.length) {
            playPauseBtn.innerHTML = '<i class="fas fa-check"></i>Complete';
            playPauseBtn.disabled = true;
        } else {
            playPauseBtn.disabled = false;
            if (this.vizState.isPlaying) {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>Pause';
            } else {
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>Play';
            }
        }
    }

    getStepDescription(step) {
        switch (step.type) {
            case 'compare':
                if (step.indices) {
                    return `Comparing elements at positions ${step.indices[0]} and ${step.indices[1]}`;
                }
                return `Comparing element at position ${step.index}`;

            case 'swap':
                return `Swapping elements at positions ${step.indices[0]} and ${step.indices[1]}`;

            case 'select':
                return `Selecting element at position ${step.index}`;

            case 'new_min':
                return `Found new minimum at position ${step.index}`;

            case 'select_pivot':
                return `Selecting pivot element at position ${step.pivot_index || step.index}`;

            case 'partition_compare':
                return `Comparing element with pivot during partitioning`;

            case 'partition_move':
                return `Moving element to left partition (smaller than pivot)`;

            case 'partition_greater':
                return `Element stays in right partition (greater than pivot)`;

            case 'place_pivot':
                return `Placing pivot in its final sorted position`;

            case 'divide':
                return `Dividing array into smaller subarrays`;

            case 'merge_compare':
                return `Comparing elements from left and right subarrays`;

            case 'merge_place':
                return `Placing element in merged position`;

            case 'merge_complete':
                return `Completed merging this subarray`;

            case 'found':
                return step.index !== undefined ? `Target found at position ${step.index}` : 'Target found!';

            case 'eliminate_left':
                return `Eliminating left half of search space`;

            case 'eliminate_right':
                return `Eliminating right half of search space`;

            case 'not_found':
                return `Target not found in the array`;

            case 'complete':
                return `Algorithm completed - array is sorted!`;

            default:
                return step.description || 'Processing step...';
        }
    }

    completeVisualization(container) {
        this.pauseVisualization(container);

        const playPauseBtn = container.querySelector('#playPauseBtn');
        const nextBtn = container.querySelector('#nextStepBtn');

        if (playPauseBtn) {
            playPauseBtn.innerHTML = '<i class="fas fa-check"></i>Complete';
            playPauseBtn.disabled = true;
        }

        if (nextBtn) {
            nextBtn.disabled = true;
        }

        // Highlight all elements as completed
        const elements = container.querySelectorAll('.visualization-element');
        elements.forEach(el => {
            el.classList.remove('comparing', 'swapping', 'selected', 'eliminated');
            el.classList.add('found');
        });
    }

    showVisualizationLoading() {
        const visualizationContainer = document.getElementById('visualizationContainer');
        const placeholder = document.getElementById('visualizationPlaceholder');

        if (!visualizationContainer) return;

        // Hide placeholder
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Switch to visualize tab
        this.switchTerminalTab('visualize');

        // Clear previous visualization
        const existingViz = visualizationContainer.querySelector('.visualization-content');
        if (existingViz) {
            existingViz.remove();
        }

        // Create loading animation
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'visualization-loading';
        loadingDiv.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <div class="loading-text">
                    <h4>Analyzing Algorithm</h4>
                    <p>Generating visualization...</p>
                </div>
            </div>
        `;

        visualizationContainer.appendChild(loadingDiv);
    }

    hideVisualizationLoading() {
        const loadingDiv = document.querySelector('.visualization-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    showFullscreenVisualizationLoading(container) {
        container.innerHTML = `
            <div class="fullscreen-loading-container">
                <div class="loading-content">
                    <div class="loading-spinner large">
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                    </div>
                    <div class="loading-text">
                        <h3>Analyzing Your Code</h3>
                        <p>Detecting algorithms and generating interactive visualization...</p>
                        <div class="loading-progress">
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <span class="progress-text">Processing...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add progress animation
        const progressFill = container.querySelector('.progress-fill');
        const progressText = container.querySelector('.progress-text');

        if (progressFill && progressText) {
            let progress = 0;
            const progressSteps = ['Analyzing code...', 'Detecting algorithms...', 'Building visualization...', 'Almost ready...'];
            let stepIndex = 0;

            const progressInterval = setInterval(() => {
                progress += Math.random() * 15 + 5;
                if (progress > 90) progress = 90;

                progressFill.style.width = progress + '%';

                if (stepIndex < progressSteps.length && progress > (stepIndex + 1) * 20) {
                    progressText.textContent = progressSteps[stepIndex];
                    stepIndex++;
                }
            }, 300);

            // Store interval for cleanup
            container._progressInterval = progressInterval;
        }
    }

    showFullscreenError(container, errorMessage) {
        // Clear any progress interval
        if (container._progressInterval) {
            clearInterval(container._progressInterval);
            delete container._progressInterval;
        }

        container.innerHTML = `
            <div class="fullscreen-error-container">
                <div class="error-content">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Visualization Error</h3>
                    <p>${errorMessage}</p>
                    <button class="error-retry-btn" onclick="this.closest('.fullscreen-visualization').querySelector('.exit-fullscreen-btn').click()">
                        <i class="fas fa-times"></i>
                        Close
                    </button>
                </div>
            </div>
        `;
    }

    async openFullscreenVisualization() {
        // Check if code editor is empty
        const code = this.getCodeFromEditor();
        if (!code.trim()) {
            this.addMessage('Write some code first, then I can visualize it!', 'assistant');
            return;
        }

        // Check current file type and handle appropriately
        const currentFile = this.currentTab;
        const fileExtension = currentFile ? currentFile.split('.').pop().toLowerCase() : '';

        // Handle non-algorithmic file types
        if (['html', 'htm', 'xhtml', 'css', 'scss', 'sass', 'less', 'txt', 'md', 'markdown'].includes(fileExtension)) {
            this.handleNonAlgorithmicVisualization(fileExtension);
            return;
        }

        // Check for code errors first by running the code (only for Python files)
        try {
            const response = await fetch('/api/run-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    language: 'python'
                })
            });

            const result = await response.json();

            // If there are errors, show message and don't open visualization
            if (!result.success) {
                this.addMessage('⚠️ Please fix the errors in your code before opening the visualization window. Check the terminal for error details.', 'assistant');
                this.showTerminalOutput(`Error: ${result.error}`, 'error');
                return;
            }
        } catch (error) {
            this.addMessage('⚠️ Unable to validate your code. Please check for errors before visualizing.', 'assistant');
            return;
        }

        // Generate visualization first
        const vizData = await this.generateVisualization();

        // If no visualization data exists, show message instead of opening fullscreen
        if (!vizData) {
            this.addMessage('📊 Visualization doesn\'t exist for your current code. Try writing sorting algorithms (bubble sort, selection sort) or searching algorithms (binary search) to see interactive visualizations.', 'assistant');
            return;
        }

        // Create fullscreen visualization modal
        const fullscreenModal = document.createElement('div');
        fullscreenModal.className = 'fullscreen-visualization';
        fullscreenModal.id = 'fullscreenVisualization';

        fullscreenModal.innerHTML = `
            <div class="fullscreen-viz-header">
                <h2>
                    <i class="fas fa-chart-bar"></i>
                    Algorithm Visualization
                </h2>
                <div class="fullscreen-viz-controls">
                    <button class="exit-fullscreen-btn" id="exitFullscreenBtn">
                        <i class="fas fa-times"></i>
                        Close
                    </button>
                </div>
            </div>
            <div class="fullscreen-viz-content" id="fullscreenVizContent">
            </div>
        `;

        document.body.appendChild(fullscreenModal);

        // Show modal
        setTimeout(() => {
            fullscreenModal.classList.add('active');
        }, 50);

        // Show visualization data
        const fullscreenContent = document.getElementById('fullscreenVizContent');
        this.showVisualizationInContainer(vizData.type, vizData.data, fullscreenContent);

        // Add event listeners
        const exitBtn = fullscreenModal.querySelector('#exitFullscreenBtn');

        exitBtn.addEventListener('click', () => {
            this.closeFullscreenVisualization();
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeFullscreenVisualization();
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Store escape handler for cleanup
        fullscreenModal._escapeHandler = escapeHandler;
    }

    closeFullscreenVisualization() {
        const fullscreenModal = document.getElementById('fullscreenVisualization');
        if (fullscreenModal) {
            fullscreenModal.classList.remove('active');

            // Remove escape key handler
            if (fullscreenModal._escapeHandler) {
                document.removeEventListener('keydown', fullscreenModal._escapeHandler);
            }

            setTimeout(() => {
                if (fullscreenModal.parentNode) {
                    fullscreenModal.parentNode.removeChild(fullscreenModal);
                }
            }, 300);
        }
    }

    handleNonAlgorithmicVisualization(fileExtension) {
        // For txt and markdown files, don't show any visualization panel
        if (['txt', 'md', 'markdown'].includes(fileExtension)) {
            return;
        }

        let message, suggestions;

        switch (fileExtension) {
            case 'html':
            case 'htm':
            case 'xhtml':
                message = '🌐 <strong>HTML File Visualization</strong>\n\nHTML files don\'t have algorithm visualizations, but you can preview them visually!';
                suggestions = [
                    '• Click the <strong>Preview</strong> button to see your HTML rendered in a browser',
                    '• Use browser developer tools (F12) to inspect elements and debug',
                    '• Add CSS and JavaScript to make your page interactive',
                    '• Check the browser console for any JavaScript errors'
                ];
                break;

            case 'css':
            case 'scss':
            case 'sass':
            case 'less':
                message = '🎨 <strong>CSS File Visualization</strong>\n\nCSS files style your web pages but don\'t contain algorithms to visualize.';
                suggestions = [
                    '• Link this CSS to an HTML file to see the styling effects',
                    '• Use browser developer tools to test CSS changes live',
                    '• Create responsive designs that work on different screen sizes',
                    '• Consider using CSS animations and transitions for visual effects'
                ];
                break;

            case 'txt':
                message = '📄 <strong>Text File Visualization</strong>\n\nText files contain plain content without algorithms to visualize.';
                suggestions = [
                    '• Use this file for documentation, notes, or data storage',
                    '• Convert to Markdown (.md) for better formatting options',
                    '• Process the text data with Python for analysis or manipulation',
                    '• Use the content as input for other programs or scripts'
                ];
                break;

            case 'md':
            case 'markdown':
                message = '📝 <strong>Markdown File Visualization</strong>\n\nMarkdown files are for formatted text and documentation.';
                suggestions = [
                    '• Use Markdown syntax for headers, lists, links, and code blocks',
                    '• Click the <strong>Preview</strong> button to see your Markdown rendered as HTML',
                    '• Great for README files, documentation, and project notes',
                    '• Preview shows live rendering with proper formatting and styling'
                ];
                break;

            default:
                message = '📁 <strong>File Visualization</strong>\n\nThis file type doesn\'t contain algorithms that can be visualized.';
                suggestions = [
                    '• Algorithm visualizations work with sorting and searching code in supported languages',
                    '• Try writing bubble sort, selection sort, or binary search algorithms',
                    '• Use this file for its intended purpose based on the file type'
                ];
        }

        // Create the message content
        const suggestionsList = suggestions.map(suggestion => `${suggestion}`).join('\n');
        const fullMessage = `${message}\n\n<strong>💡 What you can do instead:</strong>\n${suggestionsList}\n\n<strong>🔍 For Algorithm Visualizations:</strong>\nSwitch to a supported programming language file and write sorting or searching algorithms to see interactive step-by-step visualizations.`;

        this.addMessage(fullMessage, 'assistant');

        // Also show in terminal for additional context
        this.switchTerminalTab('terminal');
        this.showTerminalOutput(`Visualization not available for ${fileExtension.toUpperCase()} files`, 'info');
        this.showTerminalOutput('Try supported programming language files with sorting/searching algorithms for visualizations', 'info');
    }

    async generateFullscreenVisualization() {
        const code = this.getCodeFromEditor();
        if (!code.trim()) {
            this.addMessage('Write some sorting or searching code first, then I can visualize it!', 'assistant');
            return;
        }

        const fullscreenContent = document.getElementById('fullscreenVizContent');
        if (!fullscreenContent) return;

        // Show loading animation in fullscreen
        this.showFullscreenVisualizationLoading(fullscreenContent);
        this.addMessage('🎯 Generating fullscreen visualization...', 'assistant');

        try {
            const response = await fetch('/api/analyze-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    language: 'python'
                })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.visualization) {
                    this.addMessage('🎯 Algorithm detected! Showing fullscreen visualization...', 'assistant');

                    // Clear the loading and show visualization
                    fullscreenContent.innerHTML = '';
                    this.showVisualizationInContainer(data.visualization.type, data.visualization.data, fullscreenContent);
                } else {
                    // Show error state
                    this.showFullscreenError(fullscreenContent, 'No sorting or searching algorithm detected in your code. Try writing a bubble sort, selection sort, or binary search algorithm.');
                    this.addMessage('No sorting or searching algorithm detected in your code. Try writing a bubble sort, selection sort, or binary search algorithm.', 'assistant');
                }
            } else {
                this.showFullscreenError(fullscreenContent, `Visualization failed: ${data.error}`);
                this.addMessage(`Visualization failed: ${data.error}`, 'assistant');
            }
        } catch (error) {
            this.showFullscreenError(fullscreenContent, `Visualization error: ${error.message}`);
            this.addMessage(`Visualization error: ${error.message}`, 'assistant');
        }
    }

    showVisualizationInContainer(type, data, container) {
        switch (type) {
            case 'sorting':
                this.visualizeSortingInContainer(data, container);
                break;
            case 'searching':
                this.visualizeSearchingInContainer(data, container);
                break;
            default:
                container.innerHTML = '<p style="color: var(--editor-text); text-align: center;">Visualization type not supported.</p>';
                break;
        }
    }

    visualizeSortingInContainer(data, container) {
        if (!data || !data.array || !Array.isArray(data.array)) {
            container.innerHTML = '<p style="color: var(--red); text-align: center;">Invalid sorting data received.</p>';
            return;
        }

        const array = [...data.array];
        const steps = data.steps || [];

        container.innerHTML = `
            <div class="visualization-info">
                <h5 style="font-size: 18px;">Sorting Algorithm Visualization</h5>
                <p style="font-size: 16px;">Original array: [${array.join(', ')}] - ${steps.length} steps to sort</p>
            </div>
        `;

        // Create larger array elements for fullscreen
        const arrayContainer = document.createElement('div');
        arrayContainer.className = 'visualization-array';
        arrayContainer.style.cssText = `
            display: flex;
            align-items: flex-end;
            justify-content: center;
            gap: 8px;
            padding: var(--space-xl);
            background: var(--editor-bg-secondary);
            border-radius: 12px;
            margin: var(--space-xl) 0;
            border: 1px solid var(--editor-border);
            min-height: 300px;
        `;
        container.appendChild(arrayContainer);

        this.renderLargeArrayElements(array, arrayContainer);

        // Create enhanced step controls
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'visualization-step-controls';
        controlsContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: var(--space-md);
            padding: var(--space-xl);
            background: var(--editor-bg-secondary);
            border-radius: 12px;
            margin: var(--space-xl) 0;
            border: 1px solid var(--editor-border);
        `;
        controlsContainer.innerHTML = `
            <button class="step-control-btn" id="prevStepBtn" disabled style="padding: var(--space-md) var(--space-lg); font-size: 16px;">
                <i class="fas fa-step-backward"></i>
                Previous
            </button>
            <button class="step-control-btn play-pause" id="playPauseBtn" style="padding: var(--space-md) var(--space-lg); font-size: 16px;">
                <i class="fas fa-play"></i>
                Play
            </button>
            <button class="step-control-btn" id="nextStepBtn" style="padding: var(--space-md) var(--space-lg); font-size: 16px;">
                <i class="fas fa-step-forward"></i>
                Next
            </button>
            <button class="step-control-btn reset" id="resetBtn" style="padding: var(--space-md) var(--space-lg); font-size: 16px;">
                <i class="fas fa-undo"></i>
                Reset
            </button>
        `;
        container.appendChild(controlsContainer);

        // Initialize visualization state
        this.vizState = {
            array: [...array],
            originalArray: [...array],
            steps: steps,
            currentStep: 0,
            isPlaying: false,
            playInterval: null
        };

        // Add event listeners
        this.setupVisualizationControls(container);
    }

    renderLargeArrayElements(array, container) {
        container.innerHTML = '';
        const maxValue = Math.max(...array);
        array.forEach((value, index) => {
            const element = document.createElement('div');
            element.className = 'array-element visualization-element';
            const height = Math.max((value / maxValue) * 250, 80);
            element.style.cssText = `
                background: var(--blue);
                color: white;
                padding: var(--space-md);
                border-radius: 16px;
                min-width: 80px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 18px;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                border: 4px solid var(--blue);
                height: ${height}px;
                box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
                position: relative;
                cursor: pointer;
                margin-bottom: 25px;
            `;

            element.innerHTML = `
                <div class="element-value" style="font-size: 20px; margin-bottom: 4px;">${value}</div>
                <div class="element-index" style="font-size: 12px; opacity: 0.8; position: absolute; bottom: -20px; color: var(--editor-text);">${index}</div>
            `;

            element.dataset.index = index;
            element.dataset.value = value;
            container.appendChild(element);
        });
    }

    visualizeSearchingInContainer(data, container) {
        if (!data || !data.array || !Array.isArray(data.array) || data.target === undefined) {
            container.innerHTML = '<p style="color: var(--red); text-align: center;">Invalid searching data received.</p>';
            return;
        }

        const array = data.array;
        const target = data.target;
        const steps = data.steps || [];

        container.innerHTML = `
            <div class="visualization-info">
                <h5 style="font-size: 18px;">Binary Search Visualization</h5>
                <p style="font-size: 16px;">Target: ${target} in sorted array [${array.join(', ')}] - ${steps.length} steps to search</p>
            </div>
        `;

        // Create larger array elements for fullscreen
        const arrayContainer = document.createElement('div');
        arrayContainer.className = 'visualization-array';
        arrayContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: var(--space-xl);
            background: var(--editor-bg-secondary);
            border-radius: 12px;
            margin: var(--space-xl) 0;
            border: 1px solid var(--editor-border);
            min-height: 200px;
        `;
        container.appendChild(arrayContainer);

        this.renderLargeSearchElements(array, arrayContainer);

        // Create enhanced step controls for fullscreen search
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'visualization-step-controls';
        controlsContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: var(--space-md);
            padding: var(--space-xl);
            background: var(--editor-bg-secondary);
            border-radius: 12px;
            margin: var(--space-xl) 0;
            border: 1px solid var(--editor-border);
        `;
        controlsContainer.innerHTML = `
            <button class="step-control-btn" id="prevSearchStepBtn" disabled style="padding: var(--space-md) var(--space-lg); font-size: 16px;">
                <i class="fas fa-step-backward"></i>
                Previous
            </button>
            <button class="step-control-btn play-pause" id="playSearchBtn" style="padding: var(--space-md) var(--space-lg); font-size: 16px;">
                <i class="fas fa-play"></i>
                Play
            </button>
            <button class="step-control-btn" id="nextSearchStepBtn" style="padding: var(--space-md) var(--space-lg); font-size: 16px;">
                <i class="fas fa-step-forward"></i>
                Next
            </button>
            <button class="step-control-btn reset" id="resetSearchBtn" style="padding: var(--space-md) var(--space-lg); font-size: 16px;">
                <i class="fas fa-undo"></i>
                Reset
            </button>
        `;
        container.appendChild(controlsContainer);

        // Initialize search visualization state
        this.searchState = {
            array: array,
            target: target,
            steps: steps,
            currentStep: 0,
            isPlaying: false,
            playInterval: null
        };

        // Add event listeners for search controls
        this.setupSearchVisualizationControls(container);
    }

    renderLargeSearchElements(array, container) {
        container.innerHTML = '';
        array.forEach((value, index) => {
            const element = document.createElement('div');
            element.className = 'visualization-element';
            element.style.cssText = `
                background: var(--blue);
                color: white;
                padding: var(--space-md);
                border-radius: 8px;
                min-width: 80px;
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 18px;
                transition: all 0.3s ease;
                border: 3px solid transparent;
            `;
            element.textContent = value;
            element.dataset.index = index;
            container.appendChild(element);
        });
    }

    visualizeSearching(data, container) {
        if (!data || !data.array || !Array.isArray(data.array) || data.target === undefined) {
            this.showTerminalOutput('Invalid searching data received.', 'error');
            return;
        }

        const array = data.array;
        const target = data.target;
        const steps = data.steps || [];

        container.innerHTML = `
            <div class="visualization-info">
                <h5>Binary Search Visualization</h5>
                <p>Target: ${target} in sorted array [${array.join(', ')}] - ${steps.length} steps to search</p>
            </div>
        `;

        // Create array elements
        const arrayContainer = document.createElement('div');
        arrayContainer.className = 'visualization-array';
        container.appendChild(arrayContainer);

        this.renderSearchElements(array, arrayContainer);

        // Create step controls for searching
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'visualization-step-controls';
        controlsContainer.innerHTML = `
            <button class="step-control-btn" id="prevSearchStepBtn" disabled>
                <i class="fas fa-step-backward"></i>
                Previous
            </button>
            <button class="step-control-btn play-pause" id="playSearchBtn">
                <i class="fas fa-play"></i>
                Play
            </button>
            <button class="step-control-btn" id="nextSearchStepBtn">
                <i class="fas fa-step-forward"></i>
                Next
            </button>
            <button class="step-control-btn reset" id="resetSearchBtn">
                <i class="fas fa-undo"></i>
                Reset
            </button>
        `;
        container.appendChild(controlsContainer);

        // Initialize search visualization state
        this.searchState = {
            array: array,
            target: target,
            steps: steps,
            currentStep: 0,
            isPlaying: false,
            playInterval: null
        };

        // Add event listeners for search controls
        this.setupSearchVisualizationControls(container);
    }

    renderSearchElements(array, container) {
        container.innerHTML = '';
        array.forEach((value, index) => {
            const element = document.createElement('div');
            element.className = 'visualization-element';
            element.style.height = '50px';
            element.textContent = value;
            element.dataset.index = index;
            container.appendChild(element);
        });
    }

    setupSearchVisualizationControls(container) {
        const prevBtn = container.querySelector('#prevSearchStepBtn');
        const playBtn = container.querySelector('#playSearchBtn');
        const nextBtn = container.querySelector('#nextSearchStepBtn');
        const resetBtn = container.querySelector('#resetSearchBtn');

        prevBtn.addEventListener('click', () => this.previousSearchStep(container));
        playBtn.addEventListener('click', () => this.toggleSearchPlay(container));
        nextBtn.addEventListener('click', () => this.nextSearchStep(container));
        resetBtn.addEventListener('click', () => this.resetSearchVisualization(container));
    }

    nextSearchStep(container) {
        if (!this.searchState || this.searchState.currentStep >= this.searchState.steps.length) {
            this.completeSearchVisualization(container);
            return;
        }

        const step = this.searchState.steps[this.searchState.currentStep];
        const arrayContainer = container.querySelector('.visualization-array');
        const elements = arrayContainer.querySelectorAll('.visualization-element');

        // Clear previous states
        elements.forEach(el => {
            el.classList.remove('comparing', 'found', 'eliminated');
        });

        // Handle different search step types
        switch (step.type) {
            case 'compare':
                const index = step.index;
                if (elements[index]) {
                    elements[index].classList.add('comparing');

                    // Check if target is found
                    if (step.value === this.searchState.target) {
                        setTimeout(() => {
                            elements[index].classList.remove('comparing');
                            elements[index].classList.add('found');
                        }, 600);
                    }
                }

                // Show range indicators for binary search
                if (step.left !== undefined && step.right !== undefined) {
                    this.highlightSearchRange(elements, step.left, step.right, index);
                }
                break;

            case 'eliminate_left':
                // Highlight eliminated left portion
                if (step.new_left !== undefined) {
                    for (let i = 0; i < step.new_left && i < elements.length; i++) {
                        elements[i].classList.add('eliminated');
                    }
                }
                break;

            case 'eliminate_right':
                // Highlight eliminated right portion  
                if (step.new_right !== undefined) {
                    for (let i = step.new_right + 1; i < elements.length; i++) {
                        elements[i].classList.add('eliminated');
                    }
                }
                break;

            case 'found':
                if (elements[step.index]) {
                    elements[step.index].classList.add('found');
                }
                break;

            case 'not_found':
                // Mark all elements as eliminated
                elements.forEach(el => el.classList.add('eliminated'));
                break;
        }

        this.searchState.currentStep++;
        this.updateSearchControls(container);
    }

    highlightSearchRange(elements, left, right, current) {
        // Add subtle highlighting to show current search range
        for (let i = left; i <= right && i < elements.length; i++) {
            if (i !== current) {
                elements[i].style.opacity = '1';
                elements[i].style.background = 'rgba(99, 102, 241, 0.1)';
            }
        }

        // Dim elements outside range
        for (let i = 0; i < left; i++) {
            elements[i].style.opacity = '0.3';
        }
        for (let i = right + 1; i < elements.length; i++) {
            elements[i].style.opacity = '0.3';
        }
    }

    previousSearchStep(container) {
        if (!this.searchState || this.searchState.currentStep <= 0) return;

        this.searchState.currentStep--;

        // Reset visual state
        const arrayContainer = container.querySelector('.visualization-array');
        this.renderSearchElements(this.searchState.array, arrayContainer);

        // Re-apply steps up to current step
        for (let i = 0; i < this.searchState.currentStep; i++) {
            // This would ideally replay steps without animation for instant effect
            // For simplicity, we'll just clear and update controls
        }

        this.updateSearchControls(container);
    }

    toggleSearchPlay(container) {
        if (!this.searchState) return;

        if (this.searchState.isPlaying) {
            this.pauseSearchVisualization(container);
        } else {
            this.playSearchVisualization(container);
        }
    }

    playSearchVisualization(container) {
        if (!this.searchState) return;

        this.searchState.isPlaying = true;
        const playBtn = container.querySelector('#playSearchBtn');
        playBtn.innerHTML = '<i class="fas fa-pause"></i>Pause';

        this.searchState.playInterval = setInterval(() => {
            if (this.searchState.currentStep >= this.searchState.steps.length) {
                this.pauseSearchVisualization(container);
                return;
            }
            this.nextSearchStep(container);
        }, 1200); // Slightly slower for search to allow reading
    }

    pauseSearchVisualization(container) {
        if (!this.searchState) return;

        this.searchState.isPlaying = false;
        const playBtn = container.querySelector('#playSearchBtn');
        playBtn.innerHTML = '<i class="fas fa-play"></i>Play';

        if (this.searchState.playInterval) {
            clearInterval(this.searchState.playInterval);
            this.searchState.playInterval = null;
        }
    }

    resetSearchVisualization(container) {
        if (!this.searchState) return;

        this.pauseSearchVisualization(container);
        this.searchState.currentStep = 0;

        const arrayContainer = container.querySelector('.visualization-array');
        this.renderSearchElements(this.searchState.array, arrayContainer);
        this.updateSearchControls(container);
    }

    updateSearchControls(container) {
        if (!this.searchState) return;

        const prevBtn = container.querySelector('#prevSearchStepBtn');
        const nextBtn = container.querySelector('#nextSearchStepBtn');
        const playBtn = container.querySelector('#playSearchBtn');

        prevBtn.disabled = this.searchState.currentStep <= 0;
        nextBtn.disabled = this.searchState.currentStep >= this.searchState.steps.length;

        if (this.searchState.currentStep >= this.searchState.steps.length) {
            playBtn.innerHTML = '<i class="fas fa-check"></i>Complete';
            playBtn.disabled = true;
        } else {
            playBtn.disabled = false;
            if (this.searchState.isPlaying) {
                playBtn.innerHTML = '<i class="fas fa-pause"></i>Pause';
            } else {
                playBtn.innerHTML = '<i class="fas fa-play"></i>Play';
            }
        }
    }

    completeSearchVisualization(container) {
        this.pauseSearchVisualization(container);

        const playBtn = container.querySelector('#playSearchBtn');
        const nextBtn = container.querySelector('#nextSearchStepBtn');

        if (playBtn) {
            playBtn.innerHTML = '<i class="fas fa-check"></i>Complete';
            playBtn.disabled = true;
        }

        if (nextBtn) {
            nextBtn.disabled = true;
        }

        // Show final result
        const lastStep = this.searchState.steps[this.searchState.steps.length - 1];
        if (lastStep.type === 'found') {
            this.showTerminalOutput(`Target ${this.searchState.target} found at index ${lastStep.index}!`, 'success');
        } else if (lastStep.type === 'not_found') {
            this.showTerminalOutput(`Target ${this.searchState.target} not found in the array.`, 'info');
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new UndrstandingApp();
});