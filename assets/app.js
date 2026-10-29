/**
 * NC Labs - Central Project Registry & Dynamic Engine
 * Pure Vanilla JavaScript (ES6+) - Zero dependencies, zero build step.
 */

(function () {
  'use strict';

  // Application State
  const state = {
    projects: [],
    loading: true,
    error: null,
    searchQuery: '',
    selectedCategory: 'all',
    selectedStatus: 'all',
    sortBy: 'featured',
    layoutView: localStorage.getItem('nclabs_layout') || 'grid',
    theme: localStorage.getItem('nclabs_theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
    activeProject: null,
  };

  // DOM Elements
  const elements = {
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeIcon: document.getElementById('theme-icon'),
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    
    // Stats
    statTotal: document.getElementById('stat-total'),
    statCategories: document.getElementById('stat-categories'),
    statLatest: document.getElementById('stat-latest'),
    
    // Showcase & Lists
    featuredSection: document.getElementById('featured-section'),
    featuredGrid: document.getElementById('featured-grid'),
    projectsGrid: document.getElementById('projects-grid'),
    categoryTabs: document.getElementById('category-tabs'),
    
    // Controls
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    statusSelect: document.getElementById('status-select'),
    sortSelect: document.getElementById('sort-select'),
    gridBtn: document.getElementById('layout-grid-btn'),
    listBtn: document.getElementById('layout-list-btn'),
    resultsCount: document.getElementById('results-count'),
    
    // States
    stateLoading: document.getElementById('state-loading'),
    stateEmpty: document.getElementById('state-empty'),
    stateError: document.getElementById('state-error'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    
    // Modals & Drawers
    projectModal: document.getElementById('project-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalContent: document.getElementById('modal-content'),
    devModal: document.getElementById('dev-modal'),
    devModalOpenBtn: document.getElementById('dev-modal-open-btn'),
    devModalCloseBtn: document.getElementById('dev-modal-close-btn'),
    validationSummary: document.getElementById('validation-summary'),
    
    // Toast
    toastNotice: document.getElementById('toast-notice'),
    toastText: document.getElementById('toast-text'),
  };

  // Helper: Escape HTML to prevent XSS
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Toast notification
  let toastTimer = null;
  function showToast(message) {
    if (!elements.toastNotice) return;
    elements.toastText.textContent = message;
    elements.toastNotice.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elements.toastNotice.classList.remove('show');
    }, 2800);
  }

  // Apply Theme
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nclabs_theme', theme);
    if (elements.themeIcon) {
      elements.themeIcon.innerHTML = theme === 'light'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
  }

  // Format date helper (e.g., "2026-09-15" -> "Sep 2026")
  function formatDate(dateStr) {
    if (!dateStr) return 'Active';
    try {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const m = parseInt(parts[1], 10) - 1;
        return `${months[m] || ''} ${parts[0]}`.trim();
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  // SVG Fallback for projects with missing images
  function getFallbackSvg(title, category) {
    const encodedTitle = encodeURIComponent(title || 'NC Project');
    const encodedCat = encodeURIComponent(category || 'Experiment');
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360" fill="%230F172A"><rect width="600" height="360" fill="%230F172A"/><text x="50%" y="45%" text-anchor="middle" fill="%2338BDF8" font-family="sans-serif" font-size="24" font-weight="bold">${encodedTitle}</text><text x="50%" y="60%" text-anchor="middle" fill="%2364748B" font-family="sans-serif" font-size="14" letter-spacing="2">${encodedCat}</text></svg>`;
  }

  // Central Registry Fetcher
  async function fetchRegistry() {
    state.loading = true;
    state.error = null;
    renderStatus();

    try {
      // Use relative path directly from site root
      const response = await fetch('./projects.json', { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`Failed to load projects.json (HTTP ${response.status}: ${response.statusText})`);
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Invalid JSON syntax in projects.json: ${parseErr.message}`);
      }

      if (!Array.isArray(data)) {
        throw new Error('projects.json must contain a top-level JSON array of project objects.');
      }

      // Sanitize items and tolerate missing fields
      state.projects = data.map((item, index) => ({
        id: item.id || `project-${index + 1}`,
        title: item.title || 'Untitled Project',
        tagline: item.tagline || '',
        description: item.description || 'No description provided.',
        category: item.category || 'General',
        featured: Boolean(item.featured),
        status: item.status || 'Active',
        version: item.version || '',
        releaseDate: item.releaseDate || '',
        image: item.image || '',
        demoUrl: item.demoUrl || '',
        repoUrl: item.repoUrl || '',
        docsUrl: item.docsUrl || '',
        techStack: Array.isArray(item.techStack) ? item.techStack : [],
        highlights: Array.isArray(item.highlights) ? item.highlights : [],
        author: typeof item.author === 'object' && item.author ? item.author : null,
      }));

      state.loading = false;
      renderAll();
      checkDeepLink();
    } catch (err) {
      console.error('[NC Labs] Registry fetch error:', err);
      state.loading = false;
      state.error = err.message || 'Unknown network or parsing error';
      renderStatus();
    }
  }

  // Status Indicator
  function renderStatus() {
    if (state.loading) {
      if (elements.statusDot) elements.statusDot.style.backgroundColor = 'var(--accent-amber)';
      if (elements.statusText) elements.statusText.textContent = 'Registry: Connecting...';
      if (elements.stateLoading) elements.stateLoading.style.display = 'block';
      if (elements.projectsGrid) elements.projectsGrid.style.display = 'none';
      if (elements.stateError) elements.stateError.style.display = 'none';
      if (elements.stateEmpty) elements.stateEmpty.style.display = 'none';
    } else if (state.error) {
      if (elements.statusDot) elements.statusDot.style.backgroundColor = 'var(--accent-rose)';
      if (elements.statusText) elements.statusText.textContent = 'Registry: Offline';
      if (elements.stateLoading) elements.stateLoading.style.display = 'none';
      if (elements.projectsGrid) elements.projectsGrid.style.display = 'none';
      if (elements.stateError) elements.stateError.style.display = 'flex';
      if (elements.errorMessage) elements.errorMessage.textContent = state.error;
      if (elements.stateEmpty) elements.stateEmpty.style.display = 'none';
    } else {
      if (elements.statusDot) elements.statusDot.style.backgroundColor = 'var(--accent-emerald)';
      if (elements.statusText) elements.statusText.textContent = `Registry: Online · ${state.projects.length} Items`;
      if (elements.stateLoading) elements.stateLoading.style.display = 'none';
      if (elements.stateError) elements.stateError.style.display = 'none';
    }
  }

  // Render Stats in Hero
  function renderHeroStats() {
    if (!elements.statTotal) return;
    elements.statTotal.textContent = String(state.projects.length).padStart(2, '0');

    const categories = new Set(state.projects.map((p) => p.category));
    if (elements.statCategories) {
      elements.statCategories.textContent = String(categories.size).padStart(2, '0');
    }

    if (elements.statLatest) {
      const dates = state.projects
        .map((p) => p.releaseDate)
        .filter(Boolean)
        .sort()
        .reverse();
      elements.statLatest.textContent = dates.length ? formatDate(dates[0]) : '2026';
    }
  }

  // Render Featured Projects Showcase
  function renderFeatured() {
    if (!elements.featuredGrid || !elements.featuredSection) return;
    const featuredProjects = state.projects.filter((p) => p.featured);

    if (featuredProjects.length === 0) {
      elements.featuredSection.style.display = 'none';
      return;
    }

    elements.featuredSection.style.display = 'block';
    elements.featuredGrid.innerHTML = featuredProjects
      .map((project) => createProjectCardHTML(project, true))
      .join('');
    attachCardListeners(elements.featuredGrid);
  }

  // Render Category Filter Tabs
  function renderCategoryTabs() {
    if (!elements.categoryTabs) return;

    // Calculate category counts
    const counts = { all: state.projects.length };
    state.projects.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    const categories = ['all', ...Object.keys(counts).filter((c) => c !== 'all').sort()];

    elements.categoryTabs.innerHTML = categories
      .map((cat) => {
        const isActive = state.selectedCategory === cat;
        const displayName = cat === 'all' ? 'All Projects' : cat;
        const count = counts[cat] || 0;
        return `
          <button 
            type="button" 
            class="category-tab ${isActive ? 'active' : ''}" 
            data-category="${escapeHTML(cat)}"
            aria-pressed="${isActive}"
          >
            <span>${escapeHTML(displayName)}</span>
            <span class="tab-count">${count}</span>
          </button>
        `;
      })
      .join('');

    elements.categoryTabs.querySelectorAll('.category-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        state.selectedCategory = tab.dataset.category;
        renderCategoryTabs();
        renderProjectsList();
      });
    });
  }

  // Card HTML Generator complying with Zero-Pill rule
  function createProjectCardHTML(project, isFeatured = false) {
    const imgSrc = project.image || getFallbackSvg(project.title, project.category);
    const dateFormatted = formatDate(project.releaseDate);
    const techItems = (project.techStack || [])
      .slice(0, 4)
      .map((t) => `<span class="tech-tag">${escapeHTML(t)}</span>`)
      .join('');

    return `
      <article class="project-card" data-id="${escapeHTML(project.id)}" role="button" tabindex="0" aria-label="View details for ${escapeHTML(project.title)}">
        <div class="card-media">
          <img 
            src="${escapeHTML(imgSrc)}" 
            alt="${escapeHTML(project.title)} preview" 
            class="card-img" 
            loading="lazy" 
            onerror="this.onerror=null; this.src='${getFallbackSvg(project.title, project.category)}';"
          />
        </div>
        <div class="card-body">
          <!-- Unboxed metadata with typographic separators -->
          <div class="card-meta">
            <span class="meta-category">${escapeHTML(project.category)}</span>
            <span class="meta-divider" aria-hidden="true">/</span>
            <span>${escapeHTML(dateFormatted)}</span>
            ${project.status ? `<span class="meta-divider" aria-hidden="true">·</span><span>${escapeHTML(project.status)}</span>` : ''}
          </div>

          <h3 class="card-title">${escapeHTML(project.title)}</h3>
          ${project.tagline ? `<p class="card-tagline">${escapeHTML(project.tagline)}</p>` : ''}
          <p class="card-desc">${escapeHTML(project.description)}</p>

          ${techItems ? `<div class="card-tech">${techItems}</div>` : ''}

          <div class="card-actions">
            <button type="button" class="btn-primary open-details-btn" data-id="${escapeHTML(project.id)}">
              Inspect Spec
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>

            <div style="display: flex; gap: 0.5rem;">
              ${project.demoUrl ? `
                <a href="${escapeHTML(project.demoUrl)}" class="btn-secondary" target="_blank" rel="noopener noreferrer" title="Live Preview" onclick="event.stopPropagation()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              ` : ''}
              ${project.repoUrl ? `
                <a href="${escapeHTML(project.repoUrl)}" class="btn-secondary" target="_blank" rel="noopener noreferrer" title="View Source Repository" onclick="event.stopPropagation()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // Filter & Sort Projects
  function getFilteredProjects() {
    let list = [...state.projects];

    // Category filter
    if (state.selectedCategory !== 'all') {
      list = list.filter((p) => p.category === state.selectedCategory);
    }

    // Status filter
    if (state.selectedStatus !== 'all') {
      list = list.filter((p) => (p.status || '').toLowerCase() === state.selectedStatus.toLowerCase());
    }

    // Search query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const titleMatch = (p.title || '').toLowerCase().includes(q);
        const taglineMatch = (p.tagline || '').toLowerCase().includes(q);
        const descMatch = (p.description || '').toLowerCase().includes(q);
        const catMatch = (p.category || '').toLowerCase().includes(q);
        const techMatch = (p.techStack || []).some((t) => t.toLowerCase().includes(q));
        return titleMatch || taglineMatch || descMatch || catMatch || techMatch;
      });
    }

    // Sort
    list.sort((a, b) => {
      if (state.sortBy === 'featured') {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return (b.releaseDate || '').localeCompare(a.releaseDate || '');
      }
      if (state.sortBy === 'newest') {
        return (b.releaseDate || '').localeCompare(a.releaseDate || '');
      }
      if (state.sortBy === 'name-asc') {
        return a.title.localeCompare(b.title);
      }
      if (state.sortBy === 'name-desc') {
        return b.title.localeCompare(a.title);
      }
      return 0;
    });

    return list;
  }

  // Render Main Projects List
  function renderProjectsList() {
    if (!elements.projectsGrid) return;

    const filtered = getFilteredProjects();

    // Results count
    if (elements.resultsCount) {
      elements.resultsCount.textContent = `Showing ${filtered.length} of ${state.projects.length} project${state.projects.length === 1 ? '' : 's'}`;
    }

    // Clear search button visibility
    if (elements.searchClearBtn) {
      if (state.searchQuery) {
        elements.searchClearBtn.classList.add('visible');
      } else {
        elements.searchClearBtn.classList.remove('visible');
      }
    }

    if (filtered.length === 0) {
      elements.projectsGrid.style.display = 'none';
      if (elements.stateEmpty) elements.stateEmpty.style.display = 'flex';
      return;
    }

    if (elements.stateEmpty) elements.stateEmpty.style.display = 'none';
    elements.projectsGrid.style.display = 'grid';

    // Apply layout class
    if (state.layoutView === 'list') {
      elements.projectsGrid.classList.add('view-list');
    } else {
      elements.projectsGrid.classList.remove('view-list');
    }

    elements.projectsGrid.innerHTML = filtered
      .map((project) => createProjectCardHTML(project))
      .join('');

    attachCardListeners(elements.projectsGrid);
  }

  // Card click & keyboard interaction
  function attachCardListeners(container) {
    container.querySelectorAll('.project-card').forEach((card) => {
      const id = card.dataset.id;
      card.addEventListener('click', () => openProjectModal(id));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openProjectModal(id);
        }
      });
    });

    container.querySelectorAll('.open-details-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openProjectModal(btn.dataset.id);
      });
    });
  }

  // Open Project Detail Modal
  function openProjectModal(projectId) {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project || !elements.projectModal || !elements.modalContent) return;

    state.activeProject = project;
    window.location.hash = `project-${project.id}`;

    const imgSrc = project.image || getFallbackSvg(project.title, project.category);
    const dateFormatted = formatDate(project.releaseDate);

    const highlightsHTML = (project.highlights || []).length
      ? `
        <h4 class="modal-section-title">Architectural Highlights</h4>
        <ul class="modal-highlights">
          ${project.highlights.map((h) => `<li>${escapeHTML(h)}</li>`).join('')}
        </ul>
      `
      : '';

    const techHTML = (project.techStack || []).length
      ? `
        <h4 class="modal-section-title">Technology Stack</h4>
        <div class="card-tech" style="margin-bottom: 0.5rem;">
          ${project.techStack.map((t) => `<span class="tech-tag">${escapeHTML(t)}</span>`).join('')}
        </div>
      `
      : '';

    const authorHTML = project.author
      ? `
        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; font-size: 0.8125rem;">
          <span style="color: var(--text-muted);">Lead Contributor</span>
          <span style="font-weight: 600; color: var(--text-primary);">${escapeHTML(project.author.name)} ${project.author.role ? `· <span style="font-weight: 400; color: var(--text-secondary);">${escapeHTML(project.author.role)}</span>` : ''}</span>
        </div>
      `
      : '';

    elements.modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-img-wrap">
          <img 
            src="${escapeHTML(imgSrc)}" 
            alt="${escapeHTML(project.title)}" 
            style="width: 100%; height: 100%; object-fit: cover;"
            onerror="this.onerror=null; this.src='${getFallbackSvg(project.title, project.category)}';"
          />
        </div>
      </div>
      <div class="modal-body">
        <div class="card-meta">
          <span class="meta-category">${escapeHTML(project.category)}</span>
          <span class="meta-divider">/</span>
          <span>${escapeHTML(dateFormatted)}</span>
          ${project.version ? `<span class="meta-divider">·</span><span>${escapeHTML(project.version)}</span>` : ''}
          ${project.status ? `<span class="meta-divider">·</span><span>Status: ${escapeHTML(project.status)}</span>` : ''}
        </div>

        <h3 class="modal-title">${escapeHTML(project.title)}</h3>
        ${project.tagline ? `<p class="modal-tagline">${escapeHTML(project.tagline)}</p>` : ''}
        <p style="font-size: 0.9375rem; line-height: 1.6; color: var(--text-secondary);">${escapeHTML(project.description)}</p>

        ${highlightsHTML}
        ${techHTML}
        ${authorHTML}
      </div>
      <div class="modal-footer">
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${project.demoUrl ? `
            <a href="${escapeHTML(project.demoUrl)}" class="btn-primary" target="_blank" rel="noopener noreferrer">
              Launch Live App
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          ` : ''}
          ${project.repoUrl ? `
            <a href="${escapeHTML(project.repoUrl)}" class="btn-secondary" target="_blank" rel="noopener noreferrer">
              Repository
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
            </a>
          ` : ''}
          ${project.docsUrl ? `
            <a href="${escapeHTML(project.docsUrl)}" class="btn-secondary" target="_blank" rel="noopener noreferrer">
              Documentation
            </a>
          ` : ''}
        </div>

        <button type="button" class="btn-secondary" id="copy-link-btn" data-url="${window.location.href}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy Share Link
        </button>
      </div>
    `;

    document.getElementById('copy-link-btn')?.addEventListener('click', () => {
      const shareUrl = `${window.location.origin}${window.location.pathname}#project-${project.id}`;
      navigator.clipboard?.writeText(shareUrl).then(() => {
        showToast('Direct project link copied to clipboard!');
      }).catch(() => {
        showToast(`Link: ${shareUrl}`);
      });
    });

    elements.projectModal.classList.add('open');
    elements.projectModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  // Close Project Modal
  function closeProjectModal() {
    if (!elements.projectModal) return;
    elements.projectModal.classList.remove('open');
    elements.projectModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    state.activeProject = null;
    if (window.location.hash.startsWith('#project-')) {
      history.replaceState(null, '', window.location.pathname);
    }
  }

  // Deep linking check
  function checkDeepLink() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#project-')) {
      const id = hash.replace('#project-', '');
      openProjectModal(id);
    }
  }

  // Developer & Diagnostic Modal
  function openDevModal() {
    if (!elements.devModal) return;

    // Run registry integrity diagnostics
    const diagnostics = runDiagnostics();
    if (elements.validationSummary) {
      elements.validationSummary.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; color: ${diagnostics.errors.length ? 'var(--accent-rose)' : 'var(--accent-emerald)'}; font-weight: 600;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="${diagnostics.errors.length ? 'm15 9-6 6M9 9l6 6' : 'm9 12 2 2 4-4'}"/></svg>
          ${diagnostics.errors.length ? `${diagnostics.errors.length} Schema Issue(s) Detected` : 'All projects valid according to schema'}
        </div>
        <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.5;">
          • Total registry items: ${state.projects.length}<br>
          • Unique categories: ${new Set(state.projects.map(p => p.category)).size}<br>
          • Featured projects: ${state.projects.filter(p => p.featured).length}<br>
          ${diagnostics.errors.length ? `<div style="margin-top: 0.5rem; color: var(--accent-rose);">${diagnostics.errors.map(e => `• ${escapeHTML(e)}`).join('<br>')}</div>` : ''}
        </div>
      `;
    }

    elements.devModal.classList.add('open');
    elements.devModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDevModal() {
    if (!elements.devModal) return;
    elements.devModal.classList.remove('open');
    elements.devModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function runDiagnostics() {
    const errors = [];
    const ids = new Set();

    state.projects.forEach((p, idx) => {
      if (!p.id) errors.push(`Item #${idx + 1} is missing an 'id' property.`);
      if (ids.has(p.id)) errors.push(`Duplicate project id found: '${p.id}'.`);
      ids.add(p.id);

      if (!p.title) errors.push(`Project '${p.id}' is missing a 'title'.`);
      if (!p.description) errors.push(`Project '${p.id}' is missing a 'description'.`);
      if (!p.category) errors.push(`Project '${p.id}' is missing a 'category'.`);
    });

    return { errors };
  }

  // Setup Event Listeners
  function setupEvents() {
    // Theme toggle
    elements.themeToggleBtn?.addEventListener('click', () => {
      applyTheme(state.theme === 'light' ? 'dark' : 'light');
    });

    // Search input
    elements.searchInput?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderProjectsList();
    });

    // Search clear
    elements.searchClearBtn?.addEventListener('click', () => {
      state.searchQuery = '';
      if (elements.searchInput) {
        elements.searchInput.value = '';
        elements.searchInput.focus();
      }
      renderProjectsList();
    });

    // Keyboard shortcut '/' to search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== elements.searchInput && !state.activeProject) {
        e.preventDefault();
        elements.searchInput?.focus();
      }
      if (e.key === 'Escape') {
        closeProjectModal();
        closeDevModal();
      }
    });

    // Status select
    elements.statusSelect?.addEventListener('change', (e) => {
      state.selectedStatus = e.target.value;
      renderProjectsList();
    });

    // Sort select
    elements.sortSelect?.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderProjectsList();
    });

    // Layout switcher
    elements.gridBtn?.addEventListener('click', () => {
      state.layoutView = 'grid';
      localStorage.setItem('nclabs_layout', 'grid');
      elements.gridBtn.classList.add('active');
      elements.listBtn?.classList.remove('active');
      renderProjectsList();
    });

    elements.listBtn?.addEventListener('click', () => {
      state.layoutView = 'list';
      localStorage.setItem('nclabs_layout', 'list');
      elements.listBtn.classList.add('active');
      elements.gridBtn?.classList.remove('active');
      renderProjectsList();
    });

    // Reset filters
    elements.resetFiltersBtn?.addEventListener('click', () => {
      state.searchQuery = '';
      state.selectedCategory = 'all';
      state.selectedStatus = 'all';
      state.sortBy = 'featured';
      if (elements.searchInput) elements.searchInput.value = '';
      if (elements.statusSelect) elements.statusSelect.value = 'all';
      if (elements.sortSelect) elements.sortSelect.value = 'featured';
      renderCategoryTabs();
      renderProjectsList();
    });

    // Retry connection
    elements.retryBtn?.addEventListener('click', () => {
      fetchRegistry();
    });

    // Modals
    elements.modalCloseBtn?.addEventListener('click', closeProjectModal);
    elements.projectModal?.addEventListener('click', (e) => {
      if (e.target === elements.projectModal) closeProjectModal();
    });

    elements.devModalOpenBtn?.addEventListener('click', openDevModal);
    elements.devModalCloseBtn?.addEventListener('click', closeDevModal);
    elements.devModal?.addEventListener('click', (e) => {
      if (e.target === elements.devModal) closeDevModal();
    });

    // Copy template button in dev modal
    document.getElementById('copy-template-btn')?.addEventListener('click', () => {
      const template = `{
  "id": "my-new-tool",
  "title": "My New Tool",
  "tagline": "Short one-line punchy description",
  "description": "Comprehensive explanation of what this tool accomplishes and how it works.",
  "category": "Systems & Tools",
  "featured": false,
  "status": "Active",
  "version": "v1.0.0",
  "releaseDate": "2026-11-01",
  "image": "assets/images/my-new-tool.svg",
  "demoUrl": "https://example.com/demo",
  "repoUrl": "https://github.com/my-account/my-new-tool",
  "techStack": ["JavaScript", "HTML5", "CSS3"],
  "highlights": ["Zero configuration", "High throughput"]
}`;
      navigator.clipboard?.writeText(template).then(() => {
        showToast('Template copied! Paste it into projects.json');
      });
    });
  }

  // Render All
  function renderAll() {
    renderStatus();
    renderHeroStats();
    renderFeatured();
    renderCategoryTabs();
    renderProjectsList();

    // Set initial layout buttons state
    if (state.layoutView === 'list') {
      elements.listBtn?.classList.add('active');
      elements.gridBtn?.classList.remove('active');
    } else {
      elements.gridBtn?.classList.add('active');
      elements.listBtn?.classList.remove('active');
    }
  }

  // Initialize
  function init() {
    applyTheme(state.theme);
    setupEvents();
    fetchRegistry();
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
