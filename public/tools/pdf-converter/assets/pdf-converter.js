/**
 * Vendora PDF Converter & Editor Toolkit - UI Controller
 * 
 * Coordinates dynamic catalog grids, categorizations, search filters,
 * upload zone bindings, canvas thumbnail renders, drag-and-drop page sorting,
 * action computations, and privacy-compliant analytics reporting.
 */
document.addEventListener('DOMContentLoaded', () => {
  const App = {
    // --- STATE MANAGEMENT ---
    state: {
      activeTool: null,
      selectedFiles: [],
      pdfInfo: null,
      pdfAnalysis: null,
      layoutWarningAcknowledged: false,
      excelMode: 'layout',
      
      // Feature configs
      rotationMap: {}, // pageNum -> degrees
      deletedPages: new Set(), // pageNum (1-indexed)
      organizedPages: [], // array of pageNum (1-indexed)
      
      watermarkText: 'VENDORA',
      watermarkOptions: {
        size: 50,
        opacity: 0.15,
        rotation: 45,
        color: '#000000'
      },
      
      pageNumberOptions: {
        size: 10,
        position: 'bottom_right',
        format: 'page_num'
      },
      
      compressQuality: 0.5,
      
      imageToPdfOptions: {
        orientation: 'portrait',
        pageSize: 'a4',
        margin: 20
      }
    },

    // --- DOM CACHE ---
    dom: {
      hubView: document.getElementById('hub-view'),
      workspaceView: document.getElementById('workspace-view'),
      
      // Catalog & Filters
      searchBar: document.getElementById('search-bar'),
      categoryFilters: document.getElementById('category-filters'),
      toolsGrid: document.getElementById('tools-grid'),
      
      // Workspace General
      backToHubBtn: document.getElementById('back-to-hub-btn'),
      workspaceIcon: document.getElementById('workspace-icon'),
      workspaceTitle: document.getElementById('workspace-title'),
      workspacePrivacyBadge: document.getElementById('workspace-privacy-badge'),
      workspaceLimitationAlert: document.getElementById('workspace-limitation-alert'),
      
      // Upload Zone
      uploadZone: document.getElementById('upload-zone'),
      fileInput: document.getElementById('file-input'),
      supportedFormatsLabel: document.getElementById('supported-formats-label'),
      
      // Processing Panel
      processingPanel: document.getElementById('processing-panel'),
      filesPreviewPane: document.getElementById('files-preview-pane'),
      optionsSidebar: document.getElementById('options-sidebar'),
      sidebarContent: document.getElementById('sidebar-content'),
      
      // Action controls
      btnActionExecute: document.getElementById('btn-action-execute'),
      btnActionReset: document.getElementById('btn-action-reset'),
      
      // Loading & Success Overlays
      progressOverlay: document.getElementById('progress-overlay'),
      progressText: document.getElementById('progress-text'),
      progressBarFill: document.getElementById('progress-bar-fill'),
      
      successOverlay: document.getElementById('success-overlay'),
      successDesc: document.getElementById('success-desc'),
      btnDownloadResult: document.getElementById('btn-download-result'),
      btnNewConversion: document.getElementById('btn-new-conversion'),
      
      warningOverlay: document.getElementById('warning-overlay'),
      warningOverlayText: document.getElementById('warning-overlay-text'),
      btnWarningProceed: document.getElementById('btn-warning-proceed'),
      btnWarningCancel: document.getElementById('btn-warning-cancel'),
      
      errorBanner: document.getElementById('error-banner'),
      errorText: document.getElementById('error-text')
    },

    // --- INITIALIZATION ---
    init: function() {
      console.log("[PdfConverter] Initializing dynamic UI controller...");
      
      // Register global event trackers
      if (window.PdfAnalytics) {
        window.PdfAnalytics.trackView('hub');
      }

      this.renderCategoryFilters();
      this.renderToolsGrid();
      this.bindEvents();

      // Dedicated landing page auto-open
      if (window.PdfToolsConfig && window.PdfToolsConfig.defaultToolId) {
        const defaultTool = window.PdfToolsConfig.tools.find(t => t.id === window.PdfToolsConfig.defaultToolId);
        if (defaultTool) {
          this.openToolWorkspace(defaultTool);
          this.dom.backToHubBtn.href = '../';
        }
      }
    },

    // --- EVENT BINDINGS ---
    bindEvents: function() {
      // 1. Catalog Searching
      this.dom.searchBar.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        this.renderToolsGrid(query);
      });

      // 2. Click back to Hub
      this.dom.backToHubBtn.addEventListener('click', (e) => {
        if (window.PdfToolsConfig && window.PdfToolsConfig.defaultToolId) {
          // Allow normal navigation back to the '../' URL
          return;
        }
        e.preventDefault();
        this.resetToHub();
      });

      // 3. Click upload area
      this.dom.uploadZone.addEventListener('click', () => {
        this.dom.fileInput.click();
      });

      // 4. File input select change
      this.dom.fileInput.addEventListener('change', (e) => {
        this.handleFileSelection(e.target.files);
      });

      // 5. Drag & drop behaviors
      ['dragenter', 'dragover'].forEach(eventName => {
        this.dom.uploadZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          this.dom.uploadZone.classList.add('dragover');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.dom.uploadZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          this.dom.uploadZone.classList.remove('dragover');
        }, false);
      });

      this.dom.uploadZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        this.handleFileSelection(dt.files);
      });

      // 6. Action executions
      this.dom.btnActionExecute.addEventListener('click', () => {
        this.executeToolLogic();
      });

      this.dom.btnActionReset.addEventListener('click', () => {
        this.resetActiveWorkspace();
      });

      this.dom.btnNewConversion.addEventListener('click', () => {
        this.resetActiveWorkspace();
      });
    },

    // --- CATALOG RENDERING ---
    renderCategoryFilters: function() {
      this.dom.categoryFilters.innerHTML = '';
      
      // All category chip
      const allChip = document.createElement('button');
      allChip.className = 'filter-chip active';
      allChip.dataset.category = 'all';
      allChip.innerHTML = `🌐 All Tools`;
      allChip.addEventListener('click', () => this.selectCategoryFilter('all'));
      this.dom.categoryFilters.appendChild(allChip);

      // Map config categories
      Object.entries(window.PdfToolsConfig.categories).forEach(([key, value]) => {
        const chip = document.createElement('button');
        chip.className = 'filter-chip';
        chip.dataset.category = key;
        chip.innerHTML = `${value.icon} ${value.name}`;
        chip.addEventListener('click', () => this.selectCategoryFilter(key));
        this.dom.categoryFilters.appendChild(chip);
      });
    },

    selectCategoryFilter: function(categoryKey) {
      document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.category === categoryKey);
      });
      
      this.state.activeCategory = categoryKey;
      this.renderToolsGrid(this.dom.searchBar.value.toLowerCase().trim());
    },

    renderToolsGrid: function(searchQuery = '') {
      this.dom.toolsGrid.innerHTML = '';
      const tools = window.PdfToolsConfig.tools;
      const activeCategory = this.state.activeCategory || 'all';

      // Filter tools list
      const filtered = tools.filter(tool => {
        const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
        const matchesSearch = !searchQuery || 
                              tool.name.toLowerCase().includes(searchQuery) || 
                              tool.description.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
      });

      if (filtered.length === 0) {
        this.dom.toolsGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);">
            <h3>No PDF tools match your search criteria.</h3>
            <p>Try searching for other keywords like "Merge", "Split", "Password", or "Image".</p>
          </div>
        `;
        return;
      }

      filtered.forEach(tool => {
        const card = document.createElement('article');
        card.className = 'tool-card card';
        
        let statusBadge = '';
        if (tool.status === 'basic') {
          statusBadge = `<span class="tool-status-badge status-badge-basic">Basic Version</span>`;
        } else if (tool.status === 'future') {
          statusBadge = `<span class="tool-status-badge status-badge-future">Coming Soon</span>`;
        }

        card.innerHTML = `
          <span class="tool-card-icon">${tool.icon}</span>
          <h3 class="tool-card-title">${tool.name}</h3>
          <p class="tool-card-desc">${tool.description}</p>
          ${statusBadge}
        `;

        card.addEventListener('click', () => {
          this.openToolWorkspace(tool);
        });

        this.dom.toolsGrid.appendChild(card);
      });
    },

    // --- WORKSPACE NAVIGATION ---
    openToolWorkspace: function(tool) {
      this.state.activeTool = tool;
      this.state.pdfAnalysis = null;
      this.state.layoutWarningAcknowledged = false;
      this.state.excelMode = 'layout';

      // Clear any existing panels/warnings in options-sidebar
      const existingPanel = this.dom.optionsSidebar.querySelector('.pdf-intelligence-panel');
      if (existingPanel) existingPanel.remove();
      const existingWarningBox = this.dom.optionsSidebar.querySelector('.scanned-warning-box');
      if (existingWarningBox) existingWarningBox.remove();
      
      // Safe event logging
      if (window.PdfAnalytics) {
        window.PdfAnalytics.trackSelect(tool.id, tool.category);
        window.PdfAnalytics.trackView(tool.id);
      }

      // 1. Show UI elements
      this.dom.hubView.classList.add('hidden');
      this.dom.workspaceView.classList.remove('hidden');
      
      // 2. Configure workspace info header
      this.dom.workspaceIcon.innerText = tool.icon;
      this.dom.workspaceTitle.innerText = tool.name;
      this.dom.workspacePrivacyBadge.innerHTML = `Privacy: ${tool.privacy || 'Processed 100% inside your browser.'}`;
      
      // Setup file options
      this.dom.fileInput.value = '';
      this.dom.fileInput.multiple = (tool.id === 'merge-pdf' || tool.id === 'image-to-pdf' || tool.id === 'jpg-to-pdf' || tool.id === 'png-to-pdf');
      this.dom.fileInput.accept = tool.supportedFormats;
      this.dom.supportedFormatsLabel.innerText = `Supported files: ${tool.supportedFormats}`;

      // Reset error panel
      this.hideError();

      // Clear previous processing setups
      this.dom.processingPanel.classList.add('hidden');
      this.dom.uploadZone.classList.remove('hidden');

      // Load limitation warnings if basic or future
      if (tool.limitations) {
        this.dom.workspaceLimitationAlert.innerHTML = `
          <strong>Limitation Notice:</strong> ${tool.limitations}
        `;
        this.dom.workspaceLimitationAlert.classList.remove('hidden');
      } else {
        this.dom.workspaceLimitationAlert.classList.add('hidden');
      }

      if (tool.status === 'future') {
        this.dom.uploadZone.classList.add('hidden');
        this.dom.processingPanel.classList.remove('hidden');
        this.dom.filesPreviewPane.innerHTML = `
          <div style="max-width: 520px; margin: 40px auto; text-align: center;">
            <h3>This converter is not live yet</h3>
            <p style="color: var(--muted); font-size: 0.95rem; margin-bottom: 20px;">
              We only enable tools when the browser version can produce a trustworthy result. This keeps the toolkit professional and avoids fake conversions.
            </p>
          </div>
        `;
        this.dom.sidebarContent.innerHTML = `
          <p class="helper-note">Planned feature. Use the active browser-safe tools now, or return when this converter is released.</p>
        `;
        this.dom.btnActionExecute.disabled = true;
        this.dom.btnActionExecute.innerText = 'Coming Soon';
        return;
      }

      this.dom.btnActionExecute.disabled = false;
      this.dom.btnActionExecute.classList.remove('disabled');

      // Build options panels inside sidebar
      this.buildSidebarOptions(tool);

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    resetToHub: function() {
      this.state.activeTool = null;
      this.state.selectedFiles = [];
      this.state.pdfInfo = null;
      this.state.rotationMap = {};
      this.state.deletedPages.clear();
      this.state.organizedPages = [];

      this.dom.workspaceView.classList.add('hidden');
      this.dom.hubView.classList.remove('hidden');
      this.dom.searchBar.value = '';
      this.renderToolsGrid();

      if (window.PdfAnalytics) {
        window.PdfAnalytics.trackView('hub');
      }
    },

    resetActiveWorkspace: function() {
      if (this.state.activeTool) {
        this.openToolWorkspace(this.state.activeTool);
      }
    },

    // --- FILE SELECTION CONTROLLER ---
    handleFileSelection: async function(files) {
      if (!files || files.length === 0) return;
      this.hideError();

      const tool = this.state.activeTool;
      const acceptedExtensions = tool.supportedFormats.toLowerCase().split(',').map(ext => ext.trim());
      
      const validatedFiles = [];
      let totalSize = 0;

      for (const file of files) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        
        // Formats check
        if (!acceptedExtensions.includes(ext)) {
          this.showError(`Invalid file format "${file.name}". This tool accepts files of type: ${tool.supportedFormats}`);
          return;
        }

        // File size warnings (>50MB)
        if (file.size > 50 * 1024 * 1024) {
          this.showError(`File "${file.name}" is too large (>50MB). Processing large documents client-side may crash the browser tab.`);
          return;
        }

        validatedFiles.push(file);
        totalSize += file.size;
      }

      this.state.selectedFiles = validatedFiles;

      // Safe analytical report
      if (window.PdfAnalytics) {
        window.PdfAnalytics.trackUploadStarted(tool.id, validatedFiles.length, totalSize);
      }

      // Hide upload zone and load processing panels
      this.dom.uploadZone.classList.add('hidden');
      this.dom.processingPanel.classList.remove('hidden');
      this.dom.successOverlay.classList.add('hidden');

      // Initialize workspace previews
      this.showSpinner("Loading document previews...");
      try {
        await this.initializeWorkspacePreviews();
      } catch (err) {
        this.showError(err.message || "Failed parsing document structure.");
        this.dom.processingPanel.classList.add('hidden');
        this.dom.uploadZone.classList.remove('hidden');
      } finally {
        this.hideSpinner();
      }
    },

    // --- PREVIEW PANEL RENDERS ---
    initializeWorkspacePreviews: async function() {
      const tool = this.state.activeTool;
      const files = this.state.selectedFiles;
      
      this.dom.filesPreviewPane.innerHTML = '';
      
      // Default reset state variables
      this.state.rotationMap = {};
      this.state.deletedPages.clear();
      this.state.organizedPages = [];

      // 1. Multiple image conversions (Images to PDF)
      if (tool.id === 'image-to-pdf' || tool.id === 'jpg-to-pdf' || tool.id === 'png-to-pdf') {
        const grid = document.createElement('div');
        grid.className = 'thumbnail-canvas-grid';
        this.dom.filesPreviewPane.appendChild(grid);

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const imgUrl = await window.PdfEngine.readFileAsDataURL(file);

          const card = document.createElement('div');
          card.className = 'thumbnail-card';
          card.innerHTML = `
            <div class="thumbnail-container">
              <img src="${imgUrl}" alt="Thumbnail">
            </div>
            <span class="thumbnail-number">${file.name}</span>
          `;
          grid.appendChild(card);
        }
        return;
      }

      // 2. Generic non-manipulation tools (Word / HTML etc)
      if (tool.supportedFormats !== '.pdf') {
        const list = document.createElement('div');
        this.dom.filesPreviewPane.appendChild(list);

        files.forEach(file => {
          const row = document.createElement('div');
          row.className = 'file-row-item';
          row.innerHTML = `
            <div class="file-row-info">
              <span class="file-row-icon">📝</span>
              <div>
                <div class="file-row-name">${file.name}</div>
                <div class="file-row-size">${(file.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
          `;
          list.appendChild(row);
        });
        return;
      }

      // 3. PDF Operations: Read details and paint page canvases (pdf.js)
      if (files.length === 1 && files[0].name.toLowerCase().endsWith('.pdf')) {
        const file = files[0];
        
        // Run pre-conversion analysis first
        const analysis = await window.PdfEngine.analyzePDF(file);
        this.state.pdfAnalysis = analysis;

        // Attempt getting metadata
        const info = await window.PdfEngine.getPDFInfo(file);
        this.state.pdfInfo = info;

        if (info.encrypted) {
          this.renderPasswordUnlockPane(file);
          return;
        }

        // Render sidebar analysis metrics and safeguards
        this.renderSidebarAnalysis(analysis);

        // Render page thumbnail grid if rotating, splitting, organizing, or removing pages
        if (['rotate-pdf', 'organize-pdf', 'remove-pages', 'extract-pages', 'split-pdf'].includes(tool.id)) {
          const grid = document.createElement('div');
          grid.className = 'thumbnail-canvas-grid';
          grid.id = 'draggable-page-grid';
          this.dom.filesPreviewPane.appendChild(grid);

          const pageCount = info.pageCount;
          
          // Seed organized ordering list
          for (let i = 1; i <= pageCount; i++) {
            this.state.organizedPages.push(i);
          }

          for (let i = 1; i <= pageCount; i++) {
            const card = document.createElement('div');
            card.className = 'thumbnail-card';
            card.dataset.pageNum = i;
            card.draggable = (tool.id === 'organize-pdf'); // Enable drag-drop for organizer only

            card.innerHTML = `
              <div class="thumbnail-controls">
                ${tool.id === 'rotate-pdf' ? `<button class="card-control-btn rotate-btn" title="Rotate Clockwise">🔄</button>` : ''}
                ${(tool.id === 'organize-pdf' || tool.id === 'remove-pages') ? `<button class="card-control-btn delete-btn" title="Remove Page">🗑️</button>` : ''}
              </div>
              <div class="thumbnail-container">
                <canvas id="page-canvas-${i}"></canvas>
              </div>
              <span class="thumbnail-number" id="label-page-${i}">Page ${i}</span>
            `;

            grid.appendChild(card);

            // Fetch preview async to avoid locking UI threads
            const canvas = document.getElementById(`page-canvas-${i}`);
            window.PdfEngine.renderPDFPreview(file, canvas, i).catch(err => {
              console.error(`Preview failed for page ${i}`, err);
            });

            // Bind individual card operations
            if (tool.id === 'rotate-pdf') {
              card.querySelector('.rotate-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.rotateThumbnailCard(i, card);
              });
            }

            if (tool.id === 'organize-pdf' || tool.id === 'remove-pages') {
              card.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeThumbnailCard(i, card);
              });
            }
          }

          // Initialize HTML5 Drag & Drop sorting
          if (tool.id === 'organize-pdf') {
            this.initializeDragAndDropSorting(grid);
          }

        } else {
          // Standard metadata list row upgraded to canvas fallback page-to-image preview card
          const previewCard = document.createElement('div');
          previewCard.className = 'preview-viewport-card';
          previewCard.innerHTML = `
            <div class="preview-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
              <span class="file-row-icon">📄</span>
              <div class="file-row-details">
                <div class="file-row-name" style="font-weight: 600; font-size: 0.95rem; color: var(--text);">${file.name}</div>
                <div class="file-row-size" style="font-size: 0.8rem; color: var(--muted);">${(file.size / (1024 * 1024)).toFixed(2)} MB • ${info.pageCount} Pages</div>
              </div>
            </div>
            <div class="preview-canvas-container" style="position: relative; border-radius: 6px; overflow: hidden; background: #0c1322; display: flex; justify-content: center; align-items: center;">
              <canvas id="fallback-preview-canvas" style="display: block; width: 100%; height: auto; max-height: 450px; object-fit: contain;"></canvas>
            </div>
          `;
          this.dom.filesPreviewPane.appendChild(previewCard);

          const canvas = document.getElementById('fallback-preview-canvas');
          if (canvas) {
            window.PdfEngine.renderPDFPreview(file, canvas, 1).then(() => {
              // If document is scanned, overlay a semi-transparent warning overlay
              if (this.state.pdfAnalysis && this.state.pdfAnalysis.ocrRequired) {
                const container = previewCard.querySelector('.preview-canvas-container');
                if (container) {
                  const overlay = document.createElement('div');
                  overlay.className = 'scanned-warning-overlay';
                  overlay.innerHTML = `
                    <div class="scanned-warning-content">
                      <span class="warning-icon">⚠️</span>
                      <h4>Scanned Page Detected</h4>
                      <p>This page contains flat raster images without selectable text. Direct digital extraction is not possible.</p>
                    </div>
                  `;
                  container.appendChild(overlay);
                }
              }
            }).catch(err => {
              console.error("Failed rendering fallback preview canvas", err);
            });
          }
        }
      } else {
        // Multi-file merges list rows
        const list = document.createElement('div');
        this.dom.filesPreviewPane.appendChild(list);

        files.forEach((file, index) => {
          const row = document.createElement('div');
          row.className = 'file-row-item';
          row.innerHTML = `
            <div class="file-row-info">
              <span class="file-row-icon">📄</span>
              <div>
                <div class="file-row-name">${file.name}</div>
                <div class="file-row-size">${(file.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            <div style="font-size: 0.8rem; font-weight:700; color: var(--brand);">Document #${index+1}</div>
          `;
          list.appendChild(row);
        });
      }
    },

    renderPasswordUnlockPane: function(file) {
      this.dom.filesPreviewPane.innerHTML = `
        <div style="max-width: 360px; margin: 40px auto; text-align: center;">
          <span style="font-size: 3rem; margin-bottom: 12px; display: inline-block;">🔒</span>
          <h3>This PDF is Password Protected</h3>
          <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 20px;">
            The file is encrypted. Enter the correct password locally to unlock and process pages.
          </p>
          <div class="form-group" style="margin-bottom: 16px;">
            <input type="password" id="decrypt-password-input" class="custom-input form-input" placeholder="Enter password...">
          </div>
          <button id="btn-decrypt-submit" class="btn btn-primary" style="width: 100%;">Unlock PDF</button>
        </div>
      `;

      document.getElementById('btn-decrypt-submit').addEventListener('click', async () => {
        const password = document.getElementById('decrypt-password-input').value;
        if (!password) return;

        this.showSpinner("Unlocking document...");
        try {
          // Attempt decrypting to temporary ArrayBuffer
          const unlockedBuffer = await window.PdfEngine.unlockPDF(file, password);
          
          // Re-package buffer as an un-encrypted File object
          const unlockedFile = new File([unlockedBuffer], file.name, { type: 'application/pdf' });
          this.state.selectedFiles = [unlockedFile];
          
          // Refresh preview grid
          await this.initializeWorkspacePreviews();
        } catch (err) {
          alert("Invalid password! Please try again.");
          console.error(err);
        } finally {
          this.hideSpinner();
        }
      });
    },

    // --- CARDS MANIPULATIONS (Rotation & Deletions) ---
    rotateThumbnailCard: function(pageNum, cardElement) {
      const current = this.state.rotationMap[pageNum] || 0;
      const next = (current + 90) % 360;
      this.state.rotationMap[pageNum] = next;

      // Apply graphical rotation
      const container = cardElement.querySelector('.thumbnail-container');
      container.style.transform = `rotate(${next}deg)`;
      container.style.transition = 'transform 0.2s ease';
    },

    removeThumbnailCard: function(pageNum, cardElement) {
      // Whitelist for deletion
      this.state.deletedPages.add(pageNum);
      cardElement.style.transform = 'scale(0.8)';
      cardElement.style.opacity = '0.3';
      cardElement.style.pointerEvents = 'none';

      // Remove from organized list
      const idx = this.state.organizedPages.indexOf(pageNum);
      if (idx > -1) {
        this.state.organizedPages.splice(idx, 1);
      }
    },

    // --- HTML5 DRAG & DROP SORTING ---
    initializeDragAndDropSorting: function(gridElement) {
      let dragSrcElement = null;

      const handleDragStart = (e) => {
        dragSrcElement = e.currentTarget;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      };

      const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
      };

      const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('dragover');
      };

      const handleDrop = (e) => {
        e.stopPropagation();
        const target = e.currentTarget;

        if (dragSrcElement !== target) {
          // Re-position element physically inside the grid DOM
          const allNodes = Array.from(gridElement.children);
          const srcIdx = allNodes.indexOf(dragSrcElement);
          const targetIdx = allNodes.indexOf(target);

          if (srcIdx < targetIdx) {
            gridElement.insertBefore(dragSrcElement, target.nextSibling);
          } else {
            gridElement.insertBefore(dragSrcElement, target);
          }

          // Re-sync underlying organizedPages array index map
          this.syncOrganizedPagesFromDOM(gridElement);
        }
        return false;
      };

      const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('dragging');
        const cards = gridElement.querySelectorAll('.thumbnail-card');
        cards.forEach(card => card.classList.remove('dragover'));
      };

      const bindDragEvents = (card) => {
        card.addEventListener('dragstart', handleDragStart, false);
        card.addEventListener('dragover', handleDragOver, false);
        card.addEventListener('dragleave', handleDragLeave, false);
        card.addEventListener('drop', handleDrop, false);
        card.addEventListener('dragend', handleDragEnd, false);
      };

      const cards = gridElement.querySelectorAll('.thumbnail-card');
      cards.forEach(bindDragEvents);
    },

    syncOrganizedPagesFromDOM: function(gridElement) {
      const cards = Array.from(gridElement.children);
      const newOrdering = [];

      cards.forEach(card => {
        const pageNum = parseInt(card.dataset.pageNum, 10);
        // Include only if not deleted
        if (!this.state.deletedPages.has(pageNum)) {
          newOrdering.push(pageNum);
        }
      });

      this.state.organizedPages = newOrdering;
      console.debug("[Organizer] Sync'd new page layout ordering: ", newOrdering);
    },

    // --- Pre-Conversion Intelligence Sidebar Rendering & Safeguards ---
    renderSidebarAnalysis: function(analysis) {
      // 1. Remove existing panel
      const existingPanel = this.dom.optionsSidebar.querySelector('.pdf-intelligence-panel');
      if (existingPanel) {
        existingPanel.remove();
      }

      // Remove existing scanned warning box
      const existingWarningBox = this.dom.optionsSidebar.querySelector('.scanned-warning-box');
      if (existingWarningBox) {
        existingWarningBox.remove();
      }

      if (!analysis) return;

      // 2. Build the panel container
      const panel = document.createElement('div');
      panel.className = 'pdf-intelligence-panel';

      // Badge formatting
      let compClass = '';
      if (analysis.composition.includes('Scanned')) {
        compClass = 'badge-danger';
      } else if (analysis.composition.includes('Mixed')) {
        compClass = 'badge-warning';
      } else {
        compClass = 'badge-success';
      }

      let sizeMb = (analysis.fileSize / (1024 * 1024)).toFixed(2);

      panel.innerHTML = `
        <h4 class="sidebar-subtitle">PDF Intelligence</h4>
        <div class="metrics-grid">
          <div class="metric-item">
            <span class="metric-label">PDF Type</span>
            <span class="metric-value badge ${compClass}">${analysis.composition}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Pages Count</span>
            <span class="metric-value">${analysis.pageCount} Pages</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">File Size</span>
            <span class="metric-value">${sizeMb} MB</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Text Detected</span>
            <span class="metric-value badge ${analysis.selectableText ? 'badge-success' : 'badge-danger'}">
              ${analysis.selectableText ? 'Yes (' + analysis.totalCharsEstimated + ' chars)' : 'No'}
            </span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Image/Scanned Detected</span>
            <span class="metric-value badge ${(analysis.embeddedImages > 0 || analysis.ocrRequired) ? 'badge-warning' : 'badge-success'}">
              ${(analysis.embeddedImages > 0 || analysis.ocrRequired) ? 'Yes' : 'No'}
            </span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Table Detected</span>
            <span class="metric-value badge ${analysis.hasTables ? 'badge-success' : 'badge-info'}">
              ${analysis.hasTables ? 'Yes (' + analysis.columnCount + 'x' + analysis.rowCount + ')' : 'No'}
            </span>
          </div>
          <div class="metric-item" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
            <span class="metric-label">Recommended Mode</span>
            <span class="metric-value" style="color: var(--brand); font-weight: 600;">${analysis.recommendedMode}</span>
          </div>
        </div>
      `;

      // Insert after the title `h3.sidebar-title`
      const title = this.dom.optionsSidebar.querySelector('.sidebar-title');
      if (title && title.nextSibling) {
        this.dom.optionsSidebar.insertBefore(panel, title.nextSibling);
      } else {
        this.dom.optionsSidebar.prepend(panel);
      }

      // 3. Safeguard rules for PDF to Excel
      if (this.state.activeTool && this.state.activeTool.id === 'pdf-to-excel' && analysis.ocrRequired) {
        const warningBox = document.createElement('div');
        warningBox.className = 'scanned-warning-box';
        warningBox.innerHTML = `
          <h5>⚠️ Scanned Document Warning</h5>
          <p>This document appears to be image-based or scanned. OCR/table detection is required. Browser conversion may not perfectly preserve complex tables.</p>
          <div class="roadmap-block">
            <strong>Phase 2 Local OCR Roadmap:</strong>
            <ul>
              <li>OCR Engine (Tesseract.js integration)</li>
              <li>OpenCV cell border parser</li>
              <li>Layout preservation algorithms</li>
            </ul>
          </div>
          <button id="btn-switch-to-ocr" class="btn btn-warning" style="width: 100%; margin-top: 10px; font-size: 0.85rem; padding: 8px 12px; border-radius: 6px;">
            ⚡ Switch to Local OCR Tool
          </button>
        `;

        // Insert warningBox before the menu-buttons
        const menuButtons = this.dom.optionsSidebar.querySelector('.menu-buttons');
        if (menuButtons) {
          this.dom.optionsSidebar.insertBefore(warningBox, menuButtons);
        } else {
          this.dom.optionsSidebar.appendChild(warningBox);
        }

        // Bind switch button
        document.getElementById('btn-switch-to-ocr').addEventListener('click', (e) => {
          e.preventDefault();
          const ocrTool = window.PdfToolsConfig.tools.find(t => t.id === 'ocr-pdf');
          if (ocrTool) {
            this.openToolWorkspace(ocrTool);
          }
        });

        // Disable execution button
        this.dom.btnActionExecute.disabled = true;
        this.dom.btnActionExecute.innerText = "Excel Extractor (No text)";
        this.dom.btnActionExecute.classList.add('disabled');
      } else {
        // Reset execution button
        this.dom.btnActionExecute.disabled = false;
        this.dom.btnActionExecute.innerText = `${this.state.activeTool.name} Now`;
        this.dom.btnActionExecute.classList.remove('disabled');
      }
    },

    // --- SIDEBAR OPTION CONSTRUCTORS ---
    buildSidebarOptions: function(tool) {
      this.dom.sidebarContent.innerHTML = '';
      this.dom.btnActionExecute.innerText = `${tool.name} Now`;

      if (tool.id === 'merge-pdf') {
        this.dom.sidebarContent.innerHTML = `
          <p class="helper-note">Merges multiple uploaded PDF files. Drag documents up/down inside the catalog to adjust merge sequence order.</p>
        `;
      } else if (tool.id === 'split-pdf') {
        this.dom.sidebarContent.innerHTML = `
          <div class="form-group">
            <label>Page Range Selection</label>
            <input type="text" id="split-ranges" class="custom-input form-input" placeholder="e.g. 1-3, 5, 8-12">
            <span class="input-hint">Specify commas for discrete pages and dashes for page ranges.</span>
          </div>
        `;
      } else if (tool.id === 'compress-pdf') {
        this.dom.sidebarContent.innerHTML = `
          <div class="form-group">
            <label>Compression Intensity</label>
            <div class="slider-group" style="margin-top: 10px;">
              <input type="range" id="compress-quality" min="0.1" max="0.9" step="0.1" value="0.5">
              <span id="compress-quality-label" class="slider-val">50%</span>
            </div>
            <span class="input-hint" style="margin-top: 6px;">Higher compression yields significantly smaller files, with slight image quality trade-offs.</span>
          </div>
        `;
        document.getElementById('compress-quality').addEventListener('input', (e) => {
          const val = Math.round(e.target.value * 100);
          document.getElementById('compress-quality-label').innerText = `${val}%`;
          this.state.compressQuality = parseFloat(e.target.value);
        });
      } else if (tool.id === 'rotate-pdf') {
        this.dom.sidebarContent.innerHTML = `
          <p class="helper-note">Click the refresh arrow icons on individual page canvases to rotate pages clockwise by 90° intervals.</p>
        `;
      } else if (tool.id === 'add-watermark') {
        this.dom.sidebarContent.innerHTML = `
          <div class="form-group">
            <label>Watermark String</label>
            <input type="text" id="watermark-text" class="custom-input form-input" value="VENDORA">
          </div>
          <div class="form-group">
            <label>Font Size</label>
            <input type="number" id="watermark-size" class="custom-input form-input" value="50" min="10" max="150">
          </div>
          <div class="form-group">
            <label>Stamping Rotation (degrees)</label>
            <input type="number" id="watermark-rotation" class="custom-input form-input" value="45" min="0" max="360">
          </div>
          <div class="form-group">
            <label>Opacity Overlay</label>
            <select id="watermark-opacity" class="custom-select form-select">
              <option value="0.10">Low Overlay (10%)</option>
              <option value="0.15" selected>Standard (15%)</option>
              <option value="0.30">Semi-Bold (30%)</option>
              <option value="0.50">Bold Stamp (50%)</option>
            </select>
          </div>
        `;
      } else if (tool.id === 'add-page-numbers') {
        this.dom.sidebarContent.innerHTML = `
          <div class="form-group">
            <label>Footer Position</label>
            <select id="page-num-position" class="custom-select form-select">
              <option value="bottom_left">Bottom Left</option>
              <option value="bottom_center">Bottom Center</option>
              <option value="bottom_right" selected>Bottom Right</option>
              <option value="top_center">Top Center</option>
              <option value="top_right">Top Right</option>
            </select>
          </div>
          <div class="form-group">
            <label>Text Layout Format</label>
            <select id="page-num-format" class="custom-select form-select">
              <option value="page_num" selected>Simple Index (1, 2, 3)</option>
              <option value="page_of_total">Detailed Conformance (Page X of Y)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Font Size</label>
            <input type="number" id="page-num-size" class="custom-input form-input" value="10" min="6" max="24">
          </div>
        `;
      } else if (tool.id === 'image-to-pdf' || tool.id === 'jpg-to-pdf' || tool.id === 'png-to-pdf') {
        this.dom.sidebarContent.innerHTML = `
          <div class="form-group">
            <label>Orientation</label>
            <select id="img-orientation" class="custom-select form-select">
              <option value="portrait" selected>Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          <div class="form-group">
            <label>Document Size</label>
            <select id="img-pagesize" class="custom-select form-select">
              <option value="a4" selected>A4 Standard</option>
              <option value="letter">US Letter</option>
            </select>
          </div>
          <div class="form-group">
            <label>Marginal Border Spacing (pt)</label>
            <input type="number" id="img-margin" class="custom-input form-input" value="20" min="0" max="100">
          </div>
        `;
      } else if (tool.id === 'protect-pdf') {
        this.dom.sidebarContent.innerHTML = `
          <div class="form-group">
            <label>Security Password</label>
            <input type="password" id="protect-password-input" class="custom-input form-input" placeholder="Min 4 characters recommended..." required>
            <span class="input-hint">Adds real local binary password protection to lock the document stream.</span>
          </div>
        `;
      } else if (tool.id === 'ocr-pdf') {
        this.dom.sidebarContent.innerHTML = `
          <div class="form-group">
            <label>Target Language</label>
            <select class="custom-select form-select" disabled>
              <option value="eng">English (Tesseract.js)</option>
            </select>
            <span class="input-hint">Browser OCR processes training nodes locally. Works on standard printed English document scans.</span>
          </div>
        `;
      } else if (tool.id === 'pdf-to-excel') {
        this.dom.sidebarContent.innerHTML = `
          <div class="form-group">
            <label>Conversion Mode</label>
            <select id="excel-conversion-mode" class="custom-select form-select">
              <option value="data">Data Mode (Clean Tabular Rows)</option>
              <option value="layout" selected>Layout Mode (Basic Visual Grid)</option>
            </select>
            <span class="input-hint" style="margin-top: 6px;">
              <strong>Data Mode</strong> extracts clean table structures without decorative text. <br>
              <strong>Layout Mode</strong> uses coordinate clustering to reconstruct columns and avoid left-shifting.
            </span>
          </div>
        `;
        // Listen to change to set state
        this.state.excelMode = 'layout'; // reset to default
        document.getElementById('excel-conversion-mode').addEventListener('change', (e) => {
          this.state.excelMode = e.target.value;
        });
      } else {
        // Universal side descriptions
        this.dom.sidebarContent.innerHTML = `
          <p class="helper-note">This client-side conversion isolates processing steps to your browser tab. Click executing to begin output encoding.</p>
        `;
      }
    },

    // --- LOGICAL EXECUTIONS GATEWAY ---
    executeToolLogic: async function() {
      const tool = this.state.activeTool;
      const files = this.state.selectedFiles;
      
      if (!files || files.length === 0) {
        this.showError("No files selected! Drop or select document files first.");
        return;
      }

      this.hideError();

      // Intercept layout confidence warning overlay before proceeding for pdf-to-excel
      if (tool.id === 'pdf-to-excel' && this.state.pdfAnalysis) {
        const conf = this.state.pdfAnalysis.confidence;
        if ((conf === 'Medium' || conf === 'Low') && !this.state.layoutWarningAcknowledged) {
          this.dom.warningOverlayText.innerText = "This PDF has complex layout signals. Vendora will create an editable Excel workbook from detected text and table positions, but exact PDF formatting, merged cells, colors, and images may need manual review.";
          this.dom.warningOverlay.style.display = 'flex';
          
          // Re-bind overlay action buttons
          const newProceed = this.dom.btnWarningProceed.cloneNode(true);
          this.dom.btnWarningProceed.parentNode.replaceChild(newProceed, this.dom.btnWarningProceed);
          this.dom.btnWarningProceed = newProceed;
          
          const newCancel = this.dom.btnWarningCancel.cloneNode(true);
          this.dom.btnWarningCancel.parentNode.replaceChild(newCancel, this.dom.btnWarningCancel);
          this.dom.btnWarningCancel = newCancel;
          
          this.dom.btnWarningProceed.addEventListener('click', () => {
            this.dom.warningOverlay.style.display = 'none';
            this.state.layoutWarningAcknowledged = true;
            this.executeToolLogic();
          });
          
          this.dom.btnWarningCancel.addEventListener('click', () => {
            this.dom.warningOverlay.style.display = 'none';
          });
          
          return;
        }
      }

      this.showSpinner(`Processing PDF operation via ${tool.name}...`);

      let outputBuffer = null;
      let outputMime = 'application/pdf';
      let outputName = files[0].name.replace(/\.[^/.]+$/, "") + '_vendora.pdf';

      try {
        switch (tool.id) {
          case 'merge-pdf':
            outputBuffer = await window.PdfEngine.mergePDFs(files);
            outputName = 'merged_vendora.pdf';
            break;

          case 'split-pdf':
            const rangeStr = document.getElementById('split-ranges').value;
            if (!rangeStr) throw new Error("Please specify page ranges (e.g. 1-2) to split.");
            outputBuffer = await window.PdfEngine.splitPDF(files[0], rangeStr);
            outputName = files[0].name.replace(/\.pdf$/i, '') + '_range.pdf';
            break;

          case 'remove-pages':
            if (this.state.deletedPages.size === 0) {
              throw new Error("No pages marked for deletion. Click trash icons overlaying page cards first.");
            }
            outputBuffer = await window.PdfEngine.removePages(files[0], Array.from(this.state.deletedPages));
            break;

          case 'extract-pages':
            // If organize panel loaded, pages array is matching organizedPages
            if (this.state.organizedPages.length === 0) {
              throw new Error("No pages selected for extraction.");
            }
            outputBuffer = await window.PdfEngine.extractPages(files[0], this.state.organizedPages);
            outputName = files[0].name.replace(/\.pdf$/i, '') + '_extracted.pdf';
            break;

          case 'organize-pdf':
            if (this.state.organizedPages.length === 0) {
              throw new Error("Cannot organize an empty document page list.");
            }
            outputBuffer = await window.PdfEngine.organizePDF(files[0], this.state.organizedPages);
            outputName = files[0].name.replace(/\.pdf$/i, '') + '_reordered.pdf';
            break;

          case 'rotate-pdf':
            if (Object.keys(this.state.rotationMap).length === 0) {
              throw new Error("No pages have been rotated. Click page canvas rotations first.");
            }
            outputBuffer = await window.PdfEngine.rotatePDF(files[0], this.state.rotationMap);
            break;

          case 'compress-pdf':
            outputBuffer = await window.PdfEngine.compressPDF(files[0], this.state.compressQuality);
            outputName = files[0].name.replace(/\.pdf$/i, '') + '_compressed.pdf';
            break;

          case 'protect-pdf':
            const pwd = document.getElementById('protect-password-input').value;
            if (!pwd) throw new Error("Please enter an encryption password.");
            outputBuffer = await window.PdfEngine.protectPDF(files[0], pwd);
            outputName = files[0].name.replace(/\.pdf$/i, '') + '_encrypted.pdf';
            break;

          case 'add-watermark':
            const txt = document.getElementById('watermark-text').value;
            const sizeVal = parseInt(document.getElementById('watermark-size').value, 10);
            const rotVal = parseInt(document.getElementById('watermark-rotation').value, 10);
            const opacVal = parseFloat(document.getElementById('watermark-opacity').value);
            
            if (!txt) throw new Error("Please specify watermark string.");
            
            outputBuffer = await window.PdfEngine.addWatermark(files[0], txt, {
              size: sizeVal,
              rotation: rotVal,
              opacity: opacVal
            });
            break;

          case 'add-page-numbers':
            const numPos = document.getElementById('page-num-position').value;
            const numFmt = document.getElementById('page-num-format').value;
            const numSize = parseInt(document.getElementById('page-num-size').value, 10);
            
            outputBuffer = await window.PdfEngine.addPageNumbers(files[0], {
              position: numPos,
              format: numFmt,
              size: numSize
            });
            break;

          case 'image-to-pdf':
          case 'jpg-to-pdf':
          case 'png-to-pdf':
            const orient = document.getElementById('img-orientation').value;
            const psize = document.getElementById('img-pagesize').value;
            const marg = parseInt(document.getElementById('img-margin').value, 10);
            
            outputBuffer = await window.PdfEngine.imagesToPdf(files, {
              orientation: orient,
              pageSize: psize,
              margin: marg
            });
            outputName = 'images_converted.pdf';
            break;

          case 'pdf-to-jpg':
            this.showSpinner("Rendering PDF pages to canvases...");
            const renders = await window.PdfEngine.pdfToJpg(files[0], (idx, tot) => {
              this.updateSpinner(`Rendering page ${idx} of ${tot}...`);
            });
            
            this.showSpinner("Packaging image zip archive...");
            const zipName = files[0].name.replace(/\.pdf$/i, '') + '_images.zip';
            await window.PdfEngine.zipFiles(renders, zipName);
            
            this.renderSuccessPanel("Zip packaging complete. Slides downloaded to your default workspace.", () => {
              // Re-download binder trigger
              window.PdfEngine.zipFiles(renders, zipName);
            });
            return;

          // --- BASIC/LIMITED EXTRACTORS ---
          case 'pdf-to-word':
            this.showSpinner("Building editable Word document client-side...");
            await window.PdfEngine.pdfToWordBasicText(files[0]);
            this.renderSuccessPanel("Editable Word .docx extraction complete. Review complex layouts, images, and scanned pages before final use.", () => {
              window.PdfEngine.pdfToWordBasicText(files[0]);
            });
            return;

          case 'pdf-to-excel':
            const selectedExcelMode = this.state.excelMode || 'layout';
            const labelName = selectedExcelMode === 'data' ? 'Excel Workbook Table Extraction' : 'Excel Workbook Layout Grid';
            this.showSpinner("Creating editable Excel workbook...");
            await window.PdfEngine.pdfToExcelBasicTable(files[0], selectedExcelMode);
            this.renderSuccessPanel(`${labelName} compiled successfully as .xlsx. Review complex merged cells, images, and styling before final use.`, () => {
              window.PdfEngine.pdfToExcelBasicTable(files[0], selectedExcelMode);
            });
            return;

          case 'pdf-to-powerpoint':
            this.showSpinner("Converting pages to graphic slide backdrops...");
            await window.PdfEngine.pdfToPowerPointBasicImages(files[0], (idx, tot) => {
              this.updateSpinner(`Rendering slide backdrop ${idx} of ${tot}...`);
            });
            this.renderSuccessPanel("PowerPoint slide packages zipped successfully.", () => {
              window.PdfEngine.pdfToPowerPointBasicImages(files[0]);
            });
            return;

          case 'ocr-pdf':
            this.showSpinner("Running local OCR in your browser...");
            await window.PdfEngine.ocrPdfToText(files[0], (idx, tot, phase) => {
              const verb = phase === 'render' ? 'Rendering' : 'Reading text from';
              this.updateSpinner(`${verb} page ${idx} of ${tot}...`, Math.round((idx / tot) * 80));
            });
            this.renderSuccessPanel("OCR text extraction complete. The text file has been generated locally in your browser.", () => {
              window.PdfEngine.ocrPdfToText(files[0]);
            });
            return;

          default:
            // Placeholder fallback for future pro tools
            throw new Error("This advanced converter requires a server-side layout engine. The browser version is coming soon.");
        }

        // Standard PDF download execution
        if (outputBuffer) {
          const downloadTrigger = () => {
            window.PdfEngine.downloadFile(outputBuffer, outputName, outputMime);
          };
          
          downloadTrigger();
          
          if (window.PdfAnalytics) {
            window.PdfAnalytics.trackSuccess(tool.id, files.length, files.reduce((acc, f) => acc + f.size, 0));
          }

          this.renderSuccessPanel(`Your document has been processed successfully entirely client-side. Size: ${(outputBuffer.byteLength / 1024).toFixed(1)} KB`, downloadTrigger);
        }

      } catch (err) {
        console.error(err);
        this.showError(err.message || "An unexpected error occurred during client-side PDF encoding.");
        
        if (window.PdfAnalytics) {
          window.PdfAnalytics.trackError(tool.id, err.message?.substring(0, 50));
        }
      } finally {
        this.hideSpinner();
      }
    },

    renderSuccessPanel: function(descText, downloadCallback) {
      this.dom.processingPanel.classList.add('hidden');
      this.dom.successOverlay.classList.remove('hidden');
      this.dom.successDesc.innerText = descText;

      // Re-bind download callback
      const cleanBtn = this.dom.btnDownloadResult.cloneNode(true);
      this.dom.btnDownloadResult.parentNode.replaceChild(cleanBtn, this.dom.btnDownloadResult);
      this.dom.btnDownloadResult = cleanBtn;
      
      this.dom.btnDownloadResult.addEventListener('click', (e) => {
        e.preventDefault();
        downloadCallback();
      });

      window.scrollTo({ top: 300, behavior: 'smooth' });
    },

    // --- SPINNERS AND ERRORS ---
    showSpinner: function(msg) {
      this.dom.progressOverlay.style.display = 'flex';
      this.dom.progressText.innerText = msg;
      this.dom.progressBarFill.style.width = '0%';
    },

    updateSpinner: function(msg, percent = 50) {
      this.dom.progressText.innerText = msg;
      this.dom.progressBarFill.style.width = `${percent}%`;
    },

    hideSpinner: function() {
      this.dom.progressOverlay.style.display = 'none';
    },

    showError: function(msg) {
      this.dom.errorText.innerText = msg;
      this.dom.errorBanner.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    hideError: function() {
      this.dom.errorBanner.classList.add('hidden');
    }
  };

  // Launch App
  App.init();
});
