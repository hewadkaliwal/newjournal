document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const themeSwitcher = document.getElementById('theme-switcher');
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view');
    const htmlElement = document.documentElement;
    const sidebarNav = document.getElementById('sidebar-nav');
    const foldersContainer = document.getElementById('folders-container');
    const uncategorizedJournalsList = document.getElementById('uncategorized-journals-list');
    const contextMenu = document.getElementById('context-menu');
    const settingsButton = document.getElementById('settings-button');
    const newPageBtn = document.getElementById('new-page-btn');
    const newFolderBtn = document.getElementById('new-folder-btn');

    // --- Trades View Elements ---
    const tradesTableBody = document.getElementById('trades-table-body') as HTMLTableSectionElement;
    const tradesEmptyState = document.getElementById('trades-empty-state');
    const addTradeForm = document.getElementById('add-trade-form');
    const saveTradeBtn = document.getElementById('save-trade-btn');
    const searchInput = document.getElementById('trade-search-input') as HTMLInputElement;
    const dateStartInput = document.getElementById('trade-date-start') as HTMLInputElement;
    const dateEndInput = document.getElementById('trade-date-end') as HTMLInputElement;
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    // --- Dashboard & Analytics Elements ---
    const dashboardTitle = document.getElementById('dashboard-title');
    const dashboardEmptyState = document.getElementById('dashboard-empty-state');
    const dashboardContent = document.getElementById('dashboard-content');
    const statTotalPl = document.getElementById('stat-total-pl');
    const statWinRate = document.getElementById('stat-win-rate');
    const statBestTrade = document.getElementById('stat-best-trade');
    const statWorstTrade = document.getElementById('stat-worst-trade');
    const recentTradesTbody = document.getElementById('recent-trades-tbody') as HTMLTableSectionElement;
    const analyticsTitle = document.getElementById('analytics-title');
    const analyticsEmptyState = document.getElementById('analytics-empty-state');
    const analyticsContent = document.getElementById('analytics-content');
    const analyticsFilterBar = document.getElementById('analytics-filter-bar');
    const analyticsResetFiltersBtn = document.getElementById('analytics-reset-filters-btn');

    // --- Settings Modal Elements ---
    const settingsModal = document.getElementById('settings-modal');
    const settingsModalTabs = settingsModal?.querySelectorAll('.tab-link');
    const settingsModalContents = settingsModal?.querySelectorAll('.tab-content');
    const addMarketForm = document.getElementById('add-market-form');
    const addSessionForm = document.getElementById('add-session-form');
    const addTagForm = document.getElementById('add-tag-form');
    const marketsList = document.getElementById('markets-list');
    const sessionsList = document.getElementById('sessions-list');
    const tagsList = document.getElementById('tags-list');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const copyCsvBtn = document.getElementById('copy-csv-btn');
    const importFileInput = document.getElementById('import-file-input') as HTMLInputElement;

    // --- Calendar View Elements ---
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarMonthYear = document.getElementById('calendar-month-year');
    const calendarPrevMonthBtn = document.getElementById('calendar-prev-month');
    const calendarNextMonthBtn = document.getElementById('calendar-next-month');
    const calendarSummaryContent = document.getElementById('calendar-summary-content');
    
    // --- Generic Modal Elements ---
    const modalOverlay = document.getElementById('modal-overlay');
    const nameModal = document.getElementById('name-modal');
    const deleteModal = document.getElementById('delete-modal');
    let contextTarget: { type: 'journal' | 'folder', id: string } | null = null;
    let modalState: { type: 'rename' | 'new-folder' | 'delete', targetType: 'journal' | 'folder', targetId: string } | null = null;

    // --- Interfaces ---
    interface Trade {
        id: string;
        date: string; // YYYY-MM-DD
        market: string;
        session: string;
        direction: 'Long' | 'Short';
        wl: 'Win' | 'Loss';
        r: number | null;
        pl: number;
        comment: string;
        tag: string;
    }

    interface JournalSettingItem {
        name: string;
        color: string;
    }

    interface JournalSettings {
        markets: JournalSettingItem[];
        sessions: JournalSettingItem[];
        tags: JournalSettingItem[];
    }
    
    interface Journal {
        id: string;
        name: string;
        color: string;
        folderId: string | null;
        trades: Trade[];
        settings: JournalSettings;
    }

    interface Folder {
        id: string;
        name: string;
        color: string;
        collapsed: boolean;
    }

    interface AppState {
        journals: Journal[];
        folders: Folder[];
        activeJournalId: string | null;
        sidebarCollapsed: boolean;
        activeView: string;
    }

    // --- State Management ---
    let appState: AppState;
    let calendarDate: Date = new Date();
    let draggedJournalId: string | null = null;

    const DEFAULT_STATE: AppState = {
        journals: [],
        folders: [],
        activeJournalId: null,
        sidebarCollapsed: false,
        activeView: 'dashboard',
    };

    const loadState = () => {
        const savedState = localStorage.getItem('appState');
        appState = savedState ? JSON.parse(savedState) : { ...DEFAULT_STATE };
    
        // Migration logic for old settings format
        appState.journals.forEach(journal => {
            if (journal.settings && journal.settings.markets && journal.settings.markets.length > 0 && typeof journal.settings.markets[0] === 'string') {
                const defaultColors = ['#ef4444', '#3b82f6', '#f97316', '#16a34a', '#8b5cf6', '#eab308'];
                journal.settings.markets = (journal.settings.markets as unknown as string[]).map((m, i) => ({ name: m, color: defaultColors[i % defaultColors.length] }));
                journal.settings.sessions = (journal.settings.sessions as unknown as string[]).map((s, i) => ({ name: s, color: defaultColors[(i+1) % defaultColors.length] }));
                journal.settings.tags = (journal.settings.tags as unknown as string[]).map((t, i) => ({ name: t, color: defaultColors[(i+2) % defaultColors.length] }));
            }
        });
    };

    const saveState = () => {
        localStorage.setItem('appState', JSON.stringify(appState));
    };

    // --- Helper & Formatting Functions ---
    const getSettingItem = (type: 'market' | 'session' | 'tag', name: string): JournalSettingItem | undefined => {
        const activeJournal = appState.journals.find(j => j.id === appState.activeJournalId);
        if (!activeJournal || !name) return undefined;
        const settingsKey = `${type}s` as keyof JournalSettings;
        return activeJournal.settings[settingsKey].find(item => item.name === name);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    };

    const populateSelect = (elementId: string, options: string[], selectedValue?: string) => {
        const select = document.getElementById(elementId) as HTMLSelectElement;
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '';
        options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt;
            optionEl.textContent = opt;
            select.appendChild(optionEl);
        });
        select.value = selectedValue || currentVal || options[0];
    };
    
    const getMonday = (d: Date) => {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(d.setDate(diff));
    };

    // --- Render Functions ---
    const renderSidebar = () => {
        if (!foldersContainer || !uncategorizedJournalsList) return;
        foldersContainer.innerHTML = '';
        uncategorizedJournalsList.innerHTML = '';
        appState.folders.forEach(folder => {
            const folderEl = document.createElement('div');
            folderEl.className = `folder-item drop-zone ${folder.collapsed ? 'collapsed' : ''}`;
            folderEl.dataset.folderId = folder.id;
            folderEl.innerHTML = `
                <div class="folder-header">
                     <svg class="folder-toggle" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    <span class="item-name">${folder.name}</span>
                    <button class="icon-button context-menu-btn" data-type="folder" data-id="${folder.id}" aria-label="Folder options">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                </div>`;
            
            (folderEl.querySelector('.folder-toggle') as HTMLElement).style.color = folder.color;

            const journalListEl = document.createElement('ul');
            journalListEl.className = 'folder-journals-list';
            appState.journals.filter(j => j.folderId === folder.id).forEach(j => journalListEl.appendChild(createJournalElement(j)));
            
            const wrapper = document.createElement('div');
            wrapper.appendChild(folderEl);
            wrapper.appendChild(journalListEl);
            foldersContainer.appendChild(wrapper);
        });
        appState.journals.filter(j => j.folderId === null).forEach(j => uncategorizedJournalsList.appendChild(createJournalElement(j)));
    };

    const createJournalElement = (journal: Journal): HTMLLIElement => {
        const li = document.createElement('li');
        li.className = 'journal-item';
        if (journal.id === appState.activeJournalId) {
            li.classList.add('active');
            li.style.borderLeftColor = journal.color;
            li.style.backgroundColor = `color-mix(in srgb, ${journal.color} 15%, var(--sidebar-bg))`;
        }
        li.dataset.journalId = journal.id;
        li.draggable = true;
        li.innerHTML = `
            <span class="item-name">${journal.name}</span>
            <button class="icon-button context-menu-btn" data-type="journal" data-id="${journal.id}" aria-label="Journal options">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>`;
        return li;
    };
    
    const renderTradesView = () => {
        const activeJournal = appState.journals.find(j => j.id === appState.activeJournalId);
        if (!tradesTableBody || !activeJournal) {
             if(tradesTableBody) tradesTableBody.innerHTML = '';
             tradesEmptyState?.classList.remove('hidden');
             return;
        }

        populateSelect('add-market', activeJournal.settings.markets.map(m => m.name));
        populateSelect('add-session', activeJournal.settings.sessions.map(s => s.name));
        populateSelect('add-tag', activeJournal.settings.tags.map(t => t.name));
        (document.getElementById('add-date') as HTMLInputElement).valueAsDate = new Date();

        const searchTerm = searchInput.value.toLowerCase();
        const startDate = dateStartInput.value;
        const endDate = dateEndInput.value;

        const filteredTrades = activeJournal.trades.filter(trade => {
            const matchesSearch = searchTerm === '' ||
                trade.market.toLowerCase().includes(searchTerm) ||
                trade.comment.toLowerCase().includes(searchTerm);
            const matchesDate = (startDate === '' || trade.date >= startDate) &&
                                (endDate === '' || trade.date <= endDate);
            return matchesSearch && matchesDate;
        }).sort((a, b) => a.date.localeCompare(b.date));

        tradesTableBody.innerHTML = '';
        if (filteredTrades.length === 0) {
            tradesEmptyState?.classList.remove('hidden');
            (document.getElementById('add-trade-form') as HTMLTableSectionElement).style.visibility = 'visible';
        } else {
            tradesEmptyState?.classList.add('hidden');
            filteredTrades.forEach((trade, index) => {
                const row = tradesTableBody.insertRow();
                const tradeNumber = index + 1;
                const plClass = trade.pl >= 0 ? 'pl-positive' : 'pl-negative';
                const plSign = trade.pl >= 0 ? '+' : '';

                const marketSetting = getSettingItem('market', trade.market);
                const sessionSetting = getSettingItem('session', trade.session);
                const tagSetting = getSettingItem('tag', trade.tag);
                
                row.innerHTML = `
                    <td>${tradeNumber}</td>
                    <td><span class="tag" style="${marketSetting ? `background-color:${marketSetting.color}; color: white;` : ''}">${trade.market}</span></td>
                    <td>${trade.date}</td>
                    <td>${trade.direction}</td>
                    <td><span class="tag" style="${sessionSetting ? `background-color:${sessionSetting.color}; color: white;` : ''}">${trade.session}</span></td>
                    <td><span class="tag ${trade.wl === 'Win' ? 'tag-win' : 'tag-loss'}">${trade.wl}</span></td>
                    <td>${trade.r !== null ? trade.r : '-'}</td>
                    <td class="${plClass}">${plSign}${trade.pl.toFixed(2)}</td>
                    <td>${trade.tag ? `<span class="tag" style="${tagSetting ? `background-color:${tagSetting.color}; color: white;` : ''}">${trade.tag}</span>` : ''}</td>
                    <td class="trade-comment-cell" title="${trade.comment.replace(/"/g, '&quot;')}">${trade.comment}</td>
                    <td><button class="icon-button delete-trade-btn" data-id="${trade.id}">&times;</button></td>
                `;
            });
        }
    };

    const renderDashboardView = () => {
        const journal = appState.journals.find(j => j.id === appState.activeJournalId);
        if (!journal || !dashboardContent) {
            if (dashboardEmptyState) dashboardEmptyState.classList.remove('hidden');
            if (dashboardContent) dashboardContent.classList.add('hidden');
            if (dashboardTitle) dashboardTitle.textContent = 'Dashboard';
            return;
        }
        
        dashboardTitle!.textContent = `${journal.name} - Dashboard`;

        if (journal.trades.length === 0) {
            dashboardEmptyState?.classList.remove('hidden');
            dashboardContent.classList.add('hidden');
            return;
        }
        dashboardEmptyState?.classList.add('hidden');
        dashboardContent.classList.remove('hidden');
        
        const stats = calculateStats(journal.trades);
        statTotalPl!.textContent = formatCurrency(stats.totalPl);
        statTotalPl!.className = `stat-value ${stats.totalPl >= 0 ? 'pl-positive' : 'pl-negative'}`;
        statWinRate!.textContent = `${stats.winRate.toFixed(1)}%`;
        statBestTrade!.textContent = formatCurrency(stats.bestTrade);
        statWorstTrade!.textContent = formatCurrency(stats.worstTrade);

        // Render Recent Trades
        recentTradesTbody!.innerHTML = '';
        journal.trades.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5).forEach(trade => {
            const plClass = trade.pl >= 0 ? 'pl-positive' : 'pl-negative';
            const plSign = trade.pl >= 0 ? '+' : '';
            const row = recentTradesTbody!.insertRow();
            row.innerHTML = `
                <td>${trade.date}</td>
                <td>${trade.market}</td>
                <td>${trade.direction}</td>
                <td class="${plClass}">${plSign}${trade.pl.toFixed(2)}</td>
            `;
        });
        
        setTimeout(() => { // Allow container to resize before drawing chart
            renderBarChart('weekly-pnl-chart', getWeeklyPnl(journal.trades));
            renderLongShortStats(journal.trades);
        }, 0);
    };

    const renderAnalyticsView = () => {
        const journal = appState.journals.find(j => j.id === appState.activeJournalId);
        if (!journal || !analyticsContent) {
            if(analyticsEmptyState) analyticsEmptyState.classList.remove('hidden');
            if(analyticsContent) analyticsContent.classList.add('hidden');
            if (analyticsTitle) analyticsTitle.textContent = 'Analytics';
            return;
        }

        analyticsTitle!.textContent = `${journal.name} - Analytics`;

        populateSelect('analytics-market-filter', ['All Markets', ...journal.settings.markets.map(m => m.name)]);
        populateSelect('analytics-session-filter', ['All Sessions', ...journal.settings.sessions.map(s => s.name)]);
        populateSelect('analytics-tag-filter', ['All Trade Types', ...journal.settings.tags.map(t => t.name)]);

        const marketFilter = (document.getElementById('analytics-market-filter') as HTMLSelectElement).value;
        const sessionFilter = (document.getElementById('analytics-session-filter') as HTMLSelectElement).value;
        const tagFilter = (document.getElementById('analytics-tag-filter') as HTMLSelectElement).value;
        const directionFilter = (document.getElementById('analytics-direction-filter') as HTMLSelectElement).value;

        const filteredTrades = journal.trades.filter(t => 
            (marketFilter === 'All Markets' || t.market === marketFilter) &&
            (sessionFilter === 'All Sessions' || t.session === sessionFilter) &&
            (tagFilter === 'All Trade Types' || t.tag === tagFilter) &&
            (directionFilter === '' || t.direction === directionFilter)
        );

        if (filteredTrades.length < 2) { 
            analyticsEmptyState?.classList.remove('hidden');
            analyticsContent.classList.add('hidden');
            return;
        }
        analyticsEmptyState?.classList.add('hidden');
        analyticsContent.classList.remove('hidden');

        const stats = calculateStats(filteredTrades);
        const metricsGrid = document.getElementById('metrics-grid')!;
        metricsGrid.innerHTML = `
            ${createMetricItem('Total Trades', stats.totalTrades)}
            ${createMetricItem('Win Rate', `${stats.winRate.toFixed(1)}%`)}
            ${createMetricItem('Profit Factor', stats.profitFactor.toFixed(2))}
            ${createMetricItem('Expectancy', formatCurrency(stats.expectancy))}
            ${createMetricItem('Avg Win', formatCurrency(stats.avgWin))}
            ${createMetricItem('Avg Loss', formatCurrency(stats.avgLoss))}
            ${createMetricItem('Win Streak', stats.winStreak)}
            ${createMetricItem('Loss Streak', stats.lossStreak)}
            ${createMetricItem('Avg R', stats.avgR.toFixed(2) + 'R')}
        `;

        renderBreakdownTable('market-breakdown-table', getBreakdown(filteredTrades, 'market'));
        renderBreakdownTable('session-breakdown-table', getBreakdown(filteredTrades, 'session'));
        renderBreakdownTable('tag-breakdown-table', getBreakdown(filteredTrades, 'tag'));

        setTimeout(() => { // Allow container to resize before drawing chart
             renderLineChart('equity-curve-chart', getEquityCurve(filteredTrades));
            renderBarChart('pnl-by-market-chart', getBreakdown(filteredTrades, 'market').map(d => ({label: d.key, value: d.totalPl})));
            renderBarChart('pnl-by-session-chart', getBreakdown(filteredTrades, 'session').map(d => ({label: d.key, value: d.totalPl})));
        }, 0);
    };

    const renderCalendarView = () => {
        if (!calendarGrid || !calendarMonthYear) return;
    
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
    
        // --- Render Grid ---
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        calendarGrid.innerHTML = weekdays.map(day => `<div class="calendar-weekday">${day}</div>`).join('');
        
        calendarMonthYear.textContent = calendarDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
    
        for (let i = 0; i < firstDayOfMonth; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day not-current-month';
            calendarGrid.appendChild(dayCell);
        }
    
        const journal = appState.journals.find(j => j.id === appState.activeJournalId);
        const tradesByDate: Record<string, number> = {};
        if (journal) {
            journal.trades.forEach(trade => {
                if (!tradesByDate[trade.date]) tradesByDate[trade.date] = 0;
                tradesByDate[trade.date] += trade.pl;
            });
        }
    
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const pnl = tradesByDate[dateStr];
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            dayCell.innerHTML = `<div class="day-number">${day}</div>`;
            if (pnl !== undefined) {
                dayCell.classList.add(pnl >= 0 ? 'day-cell-pl-positive' : 'day-cell-pl-negative');
                dayCell.innerHTML += `<div class="day-pnl ${pnl >= 0 ? 'pl-positive' : 'pl-negative'}">${formatCurrency(pnl)}</div>`;
            }
            calendarGrid.appendChild(dayCell);
        }

        // --- Render Summary ---
        if (!calendarSummaryContent) return;
        const monthlyTrades = journal ? journal.trades.filter(t => {
            const tradeDate = new Date(t.date + 'T00:00:00');
            return tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
        }) : [];

        if (monthlyTrades.length === 0) {
            calendarSummaryContent.innerHTML = `<p class="empty-state" style="padding: 1rem;">No trades for this month.</p>`;
            return;
        }

        const monthlyTotal = monthlyTrades.reduce((sum, trade) => sum + trade.pl, 0);
        
        const pnlByWeek: Record<string, number> = {};
        monthlyTrades.forEach(trade => {
            const tradeDate = new Date(trade.date + 'T00:00:00');
            const monday = getMonday(tradeDate);
            const weekKey = monday.toISOString().split('T')[0];
            if(!pnlByWeek[weekKey]) pnlByWeek[weekKey] = 0;
            pnlByWeek[weekKey] += trade.pl;
        });

        const weeklySummaryHtml = Object.entries(pnlByWeek)
            .sort((a,b) => a[0].localeCompare(b[0]))
            .map(([mondayStr, pnl]) => {
                const monday = new Date(mondayStr + 'T00:00:00');
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                const pnlClass = pnl >= 0 ? 'pl-positive' : 'pl-negative';
                const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
                const weekLabel = `${monday.toLocaleDateString('en-US', dateOptions)} - ${sunday.toLocaleDateString('en-US', dateOptions)}`;
                return `
                    <li class="calendar-summary-weekly-item">
                        <span class="weekly-item-dates">${weekLabel}</span>
                        <span class="weekly-item-pnl ${pnlClass}">${formatCurrency(pnl)}</span>
                    </li>
                `;
            }).join('');
        
        calendarSummaryContent.innerHTML = `
            <div class="calendar-summary-total">
                <div class="calendar-summary-total-label">Monthly P&L</div>
                <div class="calendar-summary-total-value ${monthlyTotal >= 0 ? 'pl-positive' : 'pl-negative'}">${formatCurrency(monthlyTotal)}</div>
            </div>
            <ul class="calendar-summary-weekly-list">
                ${weeklySummaryHtml}
            </ul>
        `;
    };

    const renderCurrentView = () => {
        switch (appState.activeView) {
            case 'dashboard': renderDashboardView(); break;
            case 'trades': renderTradesView(); break;
            case 'analytics': renderAnalyticsView(); break;
            case 'calendar': renderCalendarView(); break;
        }
    };

    const renderSettingsModal = () => {
        const activeJournal = appState.journals.find(j => j.id === appState.activeJournalId);
        if (!settingsModal || !activeJournal) return;

        const renderList = (type: 'market' | 'session' | 'tag') => {
            const listEl = document.getElementById(`${type}s-list`);
            if (!listEl) return;
            const settingsKey = `${type}s` as keyof JournalSettings;
            listEl.innerHTML = '';
            activeJournal.settings[settingsKey].forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'settings-item';
                itemEl.innerHTML = `
                    <input type="color" class="settings-item-color" value="${item.color}">
                    <input type="text" class="settings-item-name" value="${item.name}" data-original-name="${item.name}" required>
                    <button class="delete-setting-btn" data-type="${type}" data-name="${item.name}" aria-label="Delete ${item.name}">&times;</button>
                `;

                const nameInput = itemEl.querySelector('.settings-item-name') as HTMLInputElement;
                const colorInput = itemEl.querySelector('.settings-item-color') as HTMLInputElement;

                const handleUpdate = () => {
                    const originalName = nameInput.dataset.originalName!;
                    const newName = nameInput.value.trim();
                    const newColor = colorInput.value;
                    const originalItem = activeJournal.settings[settingsKey].find(i => i.name === originalName);

                    if (!newName) {
                        alert('Name cannot be empty.');
                        nameInput.value = originalName; // Revert
                        return;
                    }
                    
                    if (originalName !== newName || originalItem?.color !== newColor) {
                        const success = updateSettingItem(type, originalName, newName, newColor);
                        if (success) {
                            renderSettingsModal(); // Re-render on success to update everything
                        } else {
                            // Revert on failure (e.g., duplicate name)
                            nameInput.value = originalName;
                            if (originalItem) colorInput.value = originalItem.color;
                        }
                    }
                };
                
                nameInput.addEventListener('blur', handleUpdate);
                nameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') nameInput.blur();
                });
                colorInput.addEventListener('change', handleUpdate);

                itemEl.querySelector('.delete-setting-btn')?.addEventListener('click', (e) => {
                    const nameToDelete = (e.currentTarget as HTMLElement).dataset.name!;
                    deleteSettingItem(type, nameToDelete);
                });
                listEl.appendChild(itemEl);
            });
        };
        
        renderList('market');
        renderList('session');
        renderList('tag');
    };
    
    // --- CRUD and Actions ---
    const addJournal = () => {
        const newJournal: Journal = {
            id: `j${Date.now()}`,
            name: `New Journal ${appState.journals.length + 1}`,
            color: '#3b82f6',
            folderId: null,
            trades: [],
            settings: { 
                markets: [
                    { name: 'Eur/Usd', color: '#3b82f6' }, 
                    { name: 'Xau/Usd', color: '#eab308' }
                ], 
                sessions: [
                    { name: 'London', color: '#16a34a' }, 
                    { name: 'Newyork', color: '#8b5cf6' },
                    { name: 'Asia', color: '#ef4444' },
                    { name: 'L/NY', color: '#f97316' }
                ], 
                tags: [
                    { name: 'SMC', color: '#64748b' },
                    { name: 'FVG', color: '#14b8a6' }
                ] 
            }
        };
        appState.journals.push(newJournal);
        appState.activeJournalId = newJournal.id;
        saveState();
        renderSidebar();
        renderCurrentView();
    };
    
    const addFolder = (name: string) => {
        const newFolder: Folder = { id: `f${Date.now()}`, name: name, color: '#888888', collapsed: false };
        appState.folders.push(newFolder);
        saveState();
        renderSidebar();
    };

    const addTrade = () => {
        const newTrade: Partial<Trade> = {
            id: `t${Date.now()}`,
            date: (document.getElementById('add-date') as HTMLInputElement).value,
            market: (document.getElementById('add-market') as HTMLSelectElement).value,
            session: (document.getElementById('add-session') as HTMLSelectElement).value,
            direction: (document.getElementById('add-direction') as HTMLSelectElement).value as 'Long' | 'Short',
            wl: (document.getElementById('add-wl') as HTMLSelectElement).value as 'Win' | 'Loss',
            r: parseFloat((document.getElementById('add-r') as HTMLInputElement).value) || null,
            pl: parseFloat((document.getElementById('add-pl') as HTMLInputElement).value),
            comment: (document.getElementById('add-comment') as HTMLInputElement).value,
            tag: (document.getElementById('add-tag') as HTMLSelectElement).value,
        };

        if (!newTrade.date || !newTrade.pl) {
            alert('Date and P/L are required.');
            return;
        }

        const activeJournal = appState.journals.find(j => j.id === appState.activeJournalId);
        if (activeJournal) {
            activeJournal.trades.push(newTrade as Trade);
            saveState();
            renderTradesView();
            (addTradeForm as HTMLFormElement).reset();
            (document.getElementById('add-date') as HTMLInputElement).valueAsDate = new Date();

        }
    };
    
    const deleteTrade = (tradeId: string) => {
        const activeJournal = appState.journals.find(j => j.id === appState.activeJournalId);
        if (activeJournal) {
            activeJournal.trades = activeJournal.trades.filter(t => t.id !== tradeId);
            saveState();
            renderTradesView();
            renderCurrentView();
        }
    };

    const setActiveJournal = (journalId: string) => {
        appState.activeJournalId = journalId;
        saveState();
        renderSidebar();
        renderCurrentView();
    };
    
    const toggleFolder = (folderId: string) => {
        const folder = appState.folders.find(f => f.id === folderId);
        if (folder) {
            folder.collapsed = !folder.collapsed;
            saveState();
            renderSidebar();
        }
    };
    
    const updateItemName = (type: 'journal' | 'folder', id: string, newName: string, newColor?: string) => {
        if (type === 'journal') {
            const journal = appState.journals.find(j => j.id === id);
            if(journal) {
                journal.name = newName;
                if (newColor) journal.color = newColor;
            }
        } else {
            const folder = appState.folders.find(f => f.id === id);
            if(folder) {
                folder.name = newName;
                if (newColor) folder.color = newColor;
            }
        }
        saveState();
        renderSidebar();
        renderCurrentView(); 
    };

    const deleteItem = (type: 'journal' | 'folder', id: string, options?: { folderDeleteOption: 'folder-only' | 'folder-and-pages' }) => {
        if (type === 'journal') {
            appState.journals = appState.journals.filter(j => j.id !== id);
            if (appState.activeJournalId === id) {
                appState.activeJournalId = appState.journals.length > 0 ? appState.journals[0].id : null;
            }
        } else { 
            if (options?.folderDeleteOption === 'folder-and-pages') {
                appState.journals = appState.journals.filter(j => j.folderId !== id);
            } else { 
                appState.journals.forEach(j => { if (j.folderId === id) j.folderId = null; });
            }
            appState.folders = appState.folders.filter(f => f.id !== id);
        }
        saveState();
        renderSidebar();
        renderCurrentView();
    }

    const addSettingItem = (type: 'market' | 'session' | 'tag', name: string, color: string) => {
        const activeJournal = appState.journals.find(j => j.id === appState.activeJournalId);
        if (!activeJournal || !name) return;
        const settingsKey = `${type}s` as keyof JournalSettings;
        if (activeJournal.settings[settingsKey].some(item => item.name.toLowerCase() === name.toLowerCase())) {
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} already exists.`);
            return;
        }
        activeJournal.settings[settingsKey].push({ name, color });
        saveState();
        renderSettingsModal();
        renderCurrentView();
    };

    const updateSettingItem = (type: 'market' | 'session' | 'tag', oldName: string, newName: string, newColor: string): boolean => {
        const activeJournal = appState.journals.find(j => j.id === appState.activeJournalId);
        if (!activeJournal) return false;

        const settingsKey = `${type}s` as keyof JournalSettings;
        const settingsList = activeJournal.settings[settingsKey];

        if (oldName.toLowerCase() !== newName.toLowerCase() && settingsList.some(i => i.name.toLowerCase() === newName.toLowerCase())) {
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} "${newName}" already exists.`);
            return false;
        }
        
        const itemToUpdate = settingsList.find(item => item.name === oldName);
        if (!itemToUpdate) return false;

        if (oldName !== newName) {
            activeJournal.trades.forEach(trade => {
                if ((trade as any)[type] === oldName) {
                    (trade as any)[type] = newName;
                }
            });
        }
        
        itemToUpdate.name = newName;
        itemToUpdate.color = newColor;

        saveState();
        renderCurrentView();
        return true;
    };

    const deleteSettingItem = (type: 'market' | 'session' | 'tag', name: string) => {
        const activeJournal = appState.journals.find(j => j.id === appState.activeJournalId);
        if (!activeJournal) return;
        const settingsKey = `${type}s` as keyof JournalSettings;
        activeJournal.settings[settingsKey] = activeJournal.settings[settingsKey].filter(item => item.name !== name);
        saveState();
        renderSettingsModal();
        renderCurrentView();
    };

    // --- Analytics Helpers ---
    const calculateStats = (trades: Trade[]) => {
        const totalTrades = trades.length;
        if (totalTrades === 0) {
            return { totalPl: 0, winRate: 0, bestTrade: 0, worstTrade: 0, totalWins: 0, totalLosses: 0, profitFactor: 0, expectancy: 0, avgWin: 0, avgLoss: 0, winStreak: 0, lossStreak: 0, avgR: 0, totalTrades: 0 };
        }

        const wins = trades.filter(t => t.wl === 'Win');
        const losses = trades.filter(t => t.wl === 'Loss');
        const totalPl = trades.reduce((sum, t) => sum + t.pl, 0);
        const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
        const bestTrade = Math.max(0, ...trades.map(t => t.pl));
        const worstTrade = Math.min(0, ...trades.map(t => t.pl));

        const grossProfit = wins.reduce((sum, t) => sum + t.pl, 0);
        const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pl, 0));
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;

        const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
        const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
        const expectancy = totalTrades > 0 ? ((avgWin * (winRate/100)) - (avgLoss * (1 - (winRate/100)))) : 0;
        
        let winStreak = 0;
        let lossStreak = 0;
        let currentWinStreak = 0;
        let currentLossStreak = 0;
        trades.forEach(trade => {
            if (trade.wl === 'Win') {
                currentWinStreak++;
                currentLossStreak = 0;
                if (currentWinStreak > winStreak) winStreak = currentWinStreak;
            } else {
                currentLossStreak++;
                currentWinStreak = 0;
                if (currentLossStreak > lossStreak) lossStreak = currentLossStreak;
            }
        });
        
        const validRTrades = trades.filter(t => t.r !== null && typeof t.r === 'number');
        const avgR = validRTrades.length > 0 ? validRTrades.reduce((sum, t) => sum + t.r!, 0) / validRTrades.length : 0;

        return { totalPl, winRate, bestTrade, worstTrade, totalWins: wins.length, totalLosses: losses.length, profitFactor, expectancy, avgWin, avgLoss, winStreak, lossStreak, avgR, totalTrades };
    };

    const getWeeklyPnl = (trades: Trade[]) => {
        const pnlByWeek: Record<string, number> = {};
        trades.forEach(trade => {
            const date = new Date(trade.date);
            const firstDayOfWeek = new Date(date.setDate(date.getDate() - date.getDay())).toISOString().split('T')[0];
            if (!pnlByWeek[firstDayOfWeek]) pnlByWeek[firstDayOfWeek] = 0;
            pnlByWeek[firstDayOfWeek] += trade.pl;
        });
        return Object.entries(pnlByWeek).map(([label, value]) => ({ label, value })).sort((a,b) => a.label.localeCompare(b.label));
    };

    const renderLongShortStats = (trades: Trade[]) => {
        const longTrades = trades.filter(t => t.direction === 'Long');
        const shortTrades = trades.filter(t => t.direction === 'Short');
        const longStats = calculateStats(longTrades);
        const shortStats = calculateStats(shortTrades);
        const container = document.getElementById('long-short-stats');
        if (!container) return;

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong>Longs</strong>
                <strong class="${longStats.totalPl >= 0 ? 'pl-positive' : 'pl-negative'}">${formatCurrency(longStats.totalPl)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; color: var(--text-secondary);">
                <span>${longStats.totalWins}W / ${longStats.totalLosses}L (${longStats.winRate.toFixed(1)}%)</span>
                <span>${longStats.totalTrades} Trades</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong>Shorts</strong>
                <strong class="${shortStats.totalPl >= 0 ? 'pl-positive' : 'pl-negative'}">${formatCurrency(shortStats.totalPl)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; color: var(--text-secondary);">
                 <span>${shortStats.totalWins}W / ${shortStats.totalLosses}L (${shortStats.winRate.toFixed(1)}%)</span>
                <span>${shortStats.totalTrades} Trades</span>
            </div>
        `;
    };
    
    const createMetricItem = (title: string, value: string | number) => `
        <div class="metric-item">
            <div class="metric-title">${title}</div>
            <div class="metric-value">${value}</div>
        </div>
    `;

    const getEquityCurve = (trades: Trade[]): {label: string, value: number}[] => {
        if (trades.length === 0) return [];
        let runningTotal = 0;
        return trades
            .slice()
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((trade, index) => {
                runningTotal += trade.pl;
                return { label: `${index + 1}`, value: runningTotal };
            });
    };

    const getBreakdown = (trades: Trade[], key: keyof Trade) => {
        const breakdown: Record<string, Trade[]> = {};
        trades.forEach(trade => {
            const value = trade[key] as string || 'N/A';
            if (!breakdown[value]) breakdown[value] = [];
            breakdown[value].push(trade);
        });

        return Object.entries(breakdown).map(([k, v]) => {
            return { key: k, trades: v, ...calculateStats(v) };
        }).sort((a,b) => b.totalPl - a.totalPl);
    };

    const renderBreakdownTable = (elementId: string, data: ReturnType<typeof getBreakdown>) => {
        const container = document.getElementById(elementId);
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = `<p style="padding: 1rem; color: var(--text-secondary);">No data available.</p>`;
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Trades</th>
                        <th>Win Rate</th>
                        <th>Total P&L</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${item.key}</td>
                            <td>${item.totalTrades}</td>
                            <td>${item.winRate.toFixed(1)}%</td>
                            <td class="${item.totalPl >= 0 ? 'pl-positive' : 'pl-negative'}">${formatCurrency(item.totalPl)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };

    // --- Charting Functions ---
    const renderBarChart = (elementId: string, data: { label: string; value: number }[]) => {
        const container = document.getElementById(elementId);
        if (!container) return;
        container.innerHTML = '';
        if (data.length === 0) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const tooltip = document.getElementById('chart-tooltip');
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        const margin = { top: 10, right: 10, bottom: 20, left: 50 };

        const yMax = Math.max(0, ...data.map(d => d.value));
        const yMin = Math.min(0, ...data.map(d => d.value));
        
        const bandWidth = (width - margin.left - margin.right) / data.length;
        const xScale = (index: number) => margin.left + index * bandWidth;
        
        const yScale = (val: number) => {
            const totalRange = yMax - yMin;
            if (totalRange === 0) return height - margin.bottom;
            return height - margin.bottom - ((val - yMin) / totalRange) * (height - margin.top - margin.bottom);
        };
        const yZero = yScale(0);

        // Y-Axis
        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        yAxis.setAttribute('class', 'axis y-axis');
        const numTicks = 5;
        for (let i = 0; i <= numTicks; i++) {
            const val = yMin + (yMax - yMin) * (i / numTicks);
            const y = yScale(val);
            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            tick.setAttribute('class', 'tick');
            tick.setAttribute('transform', `translate(0, ${y})`);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('class', 'grid-line');
            line.setAttribute('x1', String(margin.left));
            line.setAttribute('x2', String(width));
            tick.appendChild(line);
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.textContent = val.toFixed(0);
            text.setAttribute('x', String(margin.left - 5));
            text.setAttribute('dy', '0.32em');
            tick.appendChild(text);
            yAxis.appendChild(tick);
        }
        svg.appendChild(yAxis);

        // Zero Line
        const zeroLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        zeroLine.setAttribute('class', 'zero-line');
        zeroLine.setAttribute('x1', String(margin.left));
        zeroLine.setAttribute('y1', String(yZero));
        zeroLine.setAttribute('x2', String(width - margin.right));
        zeroLine.setAttribute('y2', String(yZero));
        svg.appendChild(zeroLine);
        
        // Bars
        data.forEach((d, i) => {
            const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const barY = d.value >= 0 ? yScale(d.value) : yZero;
            const barHeight = Math.abs(yScale(d.value) - yZero);
            bar.setAttribute('class', `bar ${d.value >= 0 ? 'bar-positive' : 'bar-negative'}`);
            bar.setAttribute('x', String(xScale(i) + bandWidth * 0.1));
            bar.setAttribute('y', String(barY));
            bar.setAttribute('width', String(bandWidth * 0.8));
            bar.setAttribute('height', String(barHeight));
            svg.appendChild(bar);

            bar.addEventListener('mousemove', (e) => {
                if (!tooltip) return;
                tooltip.style.opacity = '1';
                tooltip.style.left = `${e.clientX + 10}px`;
                tooltip.style.top = `${e.clientY + 10}px`;
                tooltip.innerHTML = `<strong>${d.label}</strong><br>P&L: ${formatCurrency(d.value)}`;
            });
            bar.addEventListener('mouseleave', () => { if (tooltip) tooltip.style.opacity = '0'; });
        });
        
        container.appendChild(svg);
    };

    const renderLineChart = (elementId: string, data: { label: string; value: number }[]) => {
        const container = document.getElementById(elementId);
        if (!container) return;
        container.innerHTML = '';
        if (data.length < 2) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const tooltip = document.getElementById('chart-tooltip');
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        const margin = { top: 10, right: 10, bottom: 20, left: 50 };

        const allValues = data.map(d => d.value);
        const yMax = Math.max(...allValues, 0);
        const yMin = Math.min(...allValues, 0);

        const xScale = (index: number) => margin.left + (width - margin.left - margin.right) * (index / (data.length - 1));
        const yScale = (val: number) => {
            const totalRange = yMax - yMin;
            if (totalRange === 0) return height / 2;
            return height - margin.bottom - ((val - yMin) / totalRange) * (height - margin.top - margin.bottom);
        };
        
        // Y-Axis
        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        yAxis.setAttribute('class', 'axis y-axis');
        const numTicks = 5;
        for (let i = 0; i <= numTicks; i++) {
            const val = yMin + (yMax - yMin) * (i / numTicks);
            const y = yScale(val);
            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            tick.setAttribute('class', 'tick');
            tick.setAttribute('transform', `translate(0, ${y})`);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('class', 'grid-line');
            line.setAttribute('x1', String(margin.left));
            line.setAttribute('x2', String(width));
            tick.appendChild(line);
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.textContent = val.toFixed(0);
            text.setAttribute('x', String(margin.left - 5));
            text.setAttribute('dy', '0.32em');
            tick.appendChild(text);
            yAxis.appendChild(tick);
        }
        svg.appendChild(yAxis);
        
        // Line and Area Path
        const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let lineD = "M";
        let areaD = "M" + `${xScale(0)},${yScale(0)} `;
        data.forEach((d, i) => {
            const x = xScale(i);
            const y = yScale(d.value);
            lineD += `${x},${y} `;
            areaD += `${x},${y} `;
        });
        areaD += `L${xScale(data.length - 1)},${yScale(0)} Z`;
        linePath.setAttribute('d', lineD.trim());
        linePath.setAttribute('class', 'equity-line');
        areaPath.setAttribute('d', areaD.trim());
        areaPath.setAttribute('class', 'equity-area');
        
        svg.appendChild(areaPath);
        svg.appendChild(linePath);
        
        const hoverIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        hoverIndicator.setAttribute('class', 'hover-indicator-group');
        const hoverLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hoverLine.setAttribute('class', 'hover-line');
        hoverLine.setAttribute('y1', String(margin.top));
        hoverLine.setAttribute('y2', String(height-margin.bottom));
        const hoverCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hoverCircle.setAttribute('class', 'hover-circle');
        hoverCircle.setAttribute('r', '5');
        hoverIndicator.appendChild(hoverLine);
        hoverIndicator.appendChild(hoverCircle);
        svg.appendChild(hoverIndicator);

        svg.addEventListener('mousemove', (e) => {
            if (!tooltip) return;
            const rect = svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            
            const index = Math.round(((mouseX - margin.left) / (width - margin.left - margin.right)) * (data.length - 1));
            if (index >= 0 && index < data.length) {
                const d = data[index];
                const x = xScale(index);
                const y = yScale(d.value);

                hoverIndicator.style.opacity = '1';
                hoverLine.setAttribute('x1', String(x));
                hoverLine.setAttribute('x2', String(x));
                hoverCircle.setAttribute('cx', String(x));
                hoverCircle.setAttribute('cy', String(y));

                tooltip.style.opacity = '1';
                tooltip.style.left = `${e.clientX + 10}px`;
                tooltip.style.top = `${e.clientY + 10}px`;
                tooltip.innerHTML = `Trade #${d.label}<br>Equity: ${formatCurrency(d.value)}`;
            }
        });
        svg.addEventListener('mouseleave', () => {
            if (tooltip) tooltip.style.opacity = '0';
            hoverIndicator.style.opacity = '0';
        });

        container.appendChild(svg);
    };

    // --- Modal & Context Menu Logic ---
    const showModal = (modalElement: HTMLElement | null) => {
        modalOverlay?.classList.remove('hidden');
        modalElement?.classList.remove('hidden');
    };

    const hideModals = () => {
        modalOverlay?.classList.add('hidden');
        nameModal?.classList.add('hidden');
        deleteModal?.classList.add('hidden');
        settingsModal?.classList.add('hidden');
    };

    const showContextMenu = (e: MouseEvent, type: 'journal' | 'folder', id: string) => {
        e.preventDefault();
        e.stopPropagation();
        contextTarget = { type, id };
        contextMenu!.style.top = `${e.clientY}px`;
        contextMenu!.style.left = `${e.clientX}px`;
        contextMenu!.classList.remove('hidden');
    };

    // --- Data Management ---
     const exportData = (format: 'json' | 'csv') => {
        const journal = appState.journals.find(j => j.id === appState.activeJournalId);
        if (!journal || journal.trades.length === 0) {
            alert("No trades to export.");
            return;
        }
        
        const filename = `${journal.name.replace(/\s/g, '_')}_trades.${format}`;
        let content = '';
        let mimeType = '';

        if (format === 'json') {
            content = JSON.stringify(journal.trades, null, 2);
            mimeType = 'application/json';
        } else {
            const headers = Object.keys(journal.trades[0] || {}).join(',');
            const rows = journal.trades.map(trade => Object.values(trade).map(v => `"${v}"`).join(',')).join('\n');
            content = `${headers}\n${rows}`;
            mimeType = 'text/csv';
        }

        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    };
    
    const importData = (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const journal = appState.journals.find(j => j.id === appState.activeJournalId);
                if (!journal) return;
                
                let newTrades: Trade[];
                if (file.name.endsWith('.json')) {
                    newTrades = JSON.parse(content);
                } else {
                    alert('Unsupported file type. Please use JSON.');
                    return;
                }
                
                if (newTrades.every(t => t.id && t.date && t.pl !== undefined)) {
                    journal.trades.push(...newTrades);
                    saveState();
                    renderCurrentView();
                    alert(`${newTrades.length} trades imported successfully!`);
                } else {
                    alert('Import failed. Data is not in the correct format.');
                }
            } catch (error) {
                alert('Error parsing file.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    };

    const copyCsv = () => {
        const journal = appState.journals.find(j => j.id === appState.activeJournalId);
        if (!journal || journal.trades.length === 0) {
            alert('No trades to copy.');
            return;
        };
        const headers = Object.keys(journal.trades[0] || {}).join('\t');
        const rows = journal.trades.map(trade => Object.values(trade).join('\t')).join('\n');
        const content = `${headers}\n${rows}`;
        navigator.clipboard.writeText(content).then(() => {
            alert('Trades copied to clipboard!');
        }).catch(err => {
            alert('Failed to copy.');
            console.error(err);
        });
    };
    
    // --- App Initialization and Event Listeners ---
    const init = () => {
        loadState();

        // Restore theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        htmlElement.setAttribute('data-theme', savedTheme);
        
        renderSidebar();
        renderCurrentView();

        // --- Global Listeners ---
        themeSwitcher?.addEventListener('click', () => {
            const newTheme = htmlElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });

        document.addEventListener('click', () => contextMenu?.classList.add('hidden'));

        // --- Navigation ---
        sidebarToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar?.classList.toggle('hidden');
        });

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (!(link instanceof HTMLElement)) return;
                const viewName = link.dataset.view;
                if (!viewName || viewName === appState.activeView) return;
                appState.activeView = viewName;
                saveState();
                
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                views.forEach(v => v.classList.remove('active'));
                document.getElementById(`${viewName}-view`)?.classList.add('active');

                renderCurrentView();
            });
        });
        (document.querySelector(`.nav-link[data-view="${appState.activeView}"]`) as HTMLElement)?.click();
        
        // --- Sidebar Interactions ---
        newPageBtn?.addEventListener('click', addJournal);
        newFolderBtn?.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent potential event bubbling issues
            modalState = { type: 'new-folder', targetType: 'folder', targetId: '' };
            (document.getElementById('name-modal-title') as HTMLElement).textContent = "Create New Folder";
            (document.getElementById('name-modal-form') as HTMLFormElement).reset();
            (document.getElementById('name-modal-color-wrapper') as HTMLElement).classList.add('hidden');
            showModal(nameModal);
            (document.getElementById('name-modal-input') as HTMLInputElement).focus();
        });

        sidebarNav?.addEventListener('click', (e) => {
            const journalItem = (e.target as HTMLElement).closest('.journal-item');
            const folderHeader = (e.target as HTMLElement).closest('.folder-header');
            const contextBtn = (e.target as HTMLElement).closest('.context-menu-btn');
            
            if (contextBtn) {
                const type = (contextBtn as HTMLElement).dataset.type as 'journal' | 'folder';
                const id = (contextBtn as HTMLElement).dataset.id!;
                showContextMenu(e as MouseEvent, type, id);
                return;
            }

            if (journalItem) {
                setActiveJournal((journalItem as HTMLElement).dataset.journalId!);
            } else if (folderHeader) {
                toggleFolder((folderHeader.parentElement as HTMLElement).dataset.folderId!);
            }
        });

        // --- Sidebar Drag & Drop ---
        sidebarNav?.addEventListener('dragstart', (e) => {
            const journalItem = (e.target as HTMLElement).closest('.journal-item');
            if (journalItem && journalItem instanceof HTMLElement) {
                draggedJournalId = journalItem.dataset.journalId!;
                setTimeout(() => journalItem.classList.add('dragging'), 0);
            }
        });

        sidebarNav?.addEventListener('dragend', (e) => {
            const journalItem = (e.target as HTMLElement);
            if (journalItem.classList.contains('journal-item')) {
                 journalItem.classList.remove('dragging');
            }
            draggedJournalId = null;
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        sidebarNav?.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        sidebarNav?.addEventListener('dragenter', (e) => {
             const dropZone = (e.target as HTMLElement).closest('.drop-zone');
             if (dropZone) {
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                dropZone.classList.add('drag-over');
             }
        });

        sidebarNav?.addEventListener('drop', (e) => {
            e.preventDefault();
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            const dropZone = (e.target as HTMLElement).closest('.drop-zone');
            if (dropZone && draggedJournalId) {
                const journal = appState.journals.find(j => j.id === draggedJournalId);
                if (journal) {
                    const folderId = (dropZone as HTMLElement).dataset.folderId || null;
                    if (journal.folderId !== folderId) {
                        journal.folderId = folderId;
                        saveState();
                        renderSidebar();
                    }
                }
            }
        });


        // --- Trades View ---
        saveTradeBtn?.addEventListener('click', addTrade);
        [searchInput, dateStartInput, dateEndInput].forEach(el => el?.addEventListener('input', renderTradesView));
        resetFiltersBtn?.addEventListener('click', () => {
            searchInput.value = '';
            dateStartInput.value = '';
            dateEndInput.value = '';
            renderTradesView();
        });
        tradesTableBody?.addEventListener('click', e => {
            const deleteBtn = (e.target as HTMLElement).closest('.delete-trade-btn');
            if (deleteBtn) {
                deleteTrade(deleteBtn.getAttribute('data-id')!);
            }
        });
        
        // --- Analytics View ---
        analyticsFilterBar?.addEventListener('change', renderAnalyticsView);
        analyticsResetFiltersBtn?.addEventListener('click', () => {
            (document.getElementById('analytics-market-filter') as HTMLSelectElement).selectedIndex = 0;
            (document.getElementById('analytics-session-filter') as HTMLSelectElement).selectedIndex = 0;
            (document.getElementById('analytics-tag-filter') as HTMLSelectElement).selectedIndex = 0;
            (document.getElementById('analytics-direction-filter') as HTMLSelectElement).selectedIndex = 0;
            renderAnalyticsView();
        });

        // --- Calendar View ---
        calendarPrevMonthBtn?.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            renderCalendarView();
        });
        calendarNextMonthBtn?.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            renderCalendarView();
        });

        // --- Modals & Context Menu ---
        settingsButton?.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent potential event bubbling issues
            if (appState.activeJournalId) {
                renderSettingsModal();
                showModal(settingsModal);
            } else {
                alert("Please create or select a journal to view its settings.");
            }
        });

        modalOverlay?.addEventListener('click', (e) => {
            if (e.target === modalOverlay) hideModals();
        });

        document.querySelectorAll('[data-action="cancel"]').forEach(btn => btn.addEventListener('click', hideModals));

        (document.getElementById('name-modal-form') as HTMLFormElement)?.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('name-modal-input') as HTMLInputElement;
            if (!modalState || !input.value) return;
            
            if (modalState.type === 'new-folder') {
                addFolder(input.value);
            } else if (modalState.type === 'rename') {
                const newColor = (document.getElementById('name-modal-color') as HTMLInputElement).value;
                updateItemName(modalState.targetType, modalState.targetId, input.value, newColor);
            }
            hideModals();
        });
        
        document.getElementById('delete-confirm-btn')?.addEventListener('click', () => {
            if (!modalState || modalState.type !== 'delete') return;
            const folderDeleteOption = (document.querySelector('input[name="delete-option"]:checked') as HTMLInputElement)?.value as 'folder-only' | 'folder-and-pages';
            deleteItem(modalState.targetType, modalState.targetId, { folderDeleteOption });
            hideModals();
        });

        contextMenu?.addEventListener('click', (e) => {
            const action = (e.target as HTMLElement).dataset.action;
            if (!action || !contextTarget) return;

            if (action === 'rename') {
                modalState = { type: 'rename', targetType: contextTarget.type, targetId: contextTarget.id };
                (document.getElementById('name-modal-title') as HTMLElement).textContent = `Edit ${contextTarget.type}`;
                const colorWrapper = document.getElementById('name-modal-color-wrapper')!;
                const colorInput = document.getElementById('name-modal-color') as HTMLInputElement;
                const nameInput = document.getElementById('name-modal-input') as HTMLInputElement;

                if (contextTarget.type === 'journal') {
                    const journal = appState.journals.find(j => j.id === contextTarget.id);
                    nameInput.value = journal?.name || '';
                    colorInput.value = journal?.color || '#3b82f6';
                } else {
                    const folder = appState.folders.find(f => f.id === contextTarget.id);
                    nameInput.value = folder?.name || '';
                    colorInput.value = folder?.color || '#888888';
                }
                colorWrapper.classList.remove('hidden');
                showModal(nameModal);

            } else if (action === 'delete') {
                modalState = { type: 'delete', targetType: contextTarget.type, targetId: contextTarget.id };
                (document.getElementById('delete-modal-title') as HTMLElement).textContent = `Delete ${contextTarget.type}`;
                document.getElementById('delete-folder-options')?.classList.toggle('hidden', contextTarget.type !== 'folder');
                showModal(deleteModal);
            }
        });
        
        // --- Settings Modal ---
        settingsModalTabs?.forEach(tab => {
            tab.addEventListener('click', () => {
                settingsModalTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                settingsModalContents?.forEach(c => c.classList.remove('active'));
                document.getElementById((tab as HTMLElement).dataset.tab!)?.classList.add('active');
            });
        });

        addMarketForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = (document.getElementById('new-market-name') as HTMLInputElement).value;
            const color = (document.getElementById('new-market-color') as HTMLInputElement).value;
            addSettingItem('market', name, color);
            (e.target as HTMLFormElement).reset();
        });
        addSessionForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = (document.getElementById('new-session-name') as HTMLInputElement).value;
            const color = (document.getElementById('new-session-color') as HTMLInputElement).value;
            addSettingItem('session', name, color);
            (e.target as HTMLFormElement).reset();
        });
        addTagForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = (document.getElementById('new-tag-name') as HTMLInputElement).value;
            const color = (document.getElementById('new-tag-color') as HTMLInputElement).value;
            addSettingItem('tag', name, color);
            (e.target as HTMLFormElement).reset();
        });
        
        exportJsonBtn?.addEventListener('click', () => exportData('json'));
        exportCsvBtn?.addEventListener('click', () => exportData('csv'));
        copyCsvBtn?.addEventListener('click', copyCsv);
        exportPdfBtn?.addEventListener('click', () => alert('PDF export is not yet implemented.'));
        importFileInput?.addEventListener('change', () => {
            if (importFileInput.files && importFileInput.files[0]) {
                importData(importFileInput.files[0]);
            }
        });
    };

    init();
});