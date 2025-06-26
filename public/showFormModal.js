import { formSchemas, showLoading, hideLoading, callAdminApi, allPlayersCache, setAllPlayersCache, teamsCache, getTeams, generatePlaceholderImageUrl } from './utils.js';

// showFormModal.js
// This file contains the showFormModal function extracted from script.452.js

// --- showFormModal ---
// Extracted from script.452.js
export async function showFormModal(entityType, fetchDataFunction, submitApiEndpoint, editData = null) {
    // Ensure modalContainer exists
    const modalContainer = document.getElementById('modal-container') || (() => {
        const div = document.createElement('div');
        div.id = 'modal-container';
        document.body.appendChild(div);
        return div;
    })();
    const schema = formSchemas[entityType];
    let dataOptions = {};
    if (entityType === 'player' || entityType === 'match') {
        dataOptions.teams = await fetchDataFunction();
    }
    // Set modal title dynamically
    const entityTitles = {
        player: 'Add Player',
        team: editData ? 'Edit Team' : 'Add Team',
        news: 'Add News',
        match: 'Add Match',
    };
    const title = entityTitles[entityType] || `Add ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`;

    // Row-wise table for player and team
    if (entityType === 'player' || entityType === 'team') {
        // Generate table header row
        let statFields = [];
        if (entityType === 'player') {
            statFields = [
                { name: 'matchesPlayed', label: 'Matches', type: 'number' },
                { name: 'goals', label: 'Goals', type: 'number' },
                { name: 'assists', label: 'Assists', type: 'number' },
                { name: 'yellowCard', label: 'Yellow', type: 'number' },
                { name: 'redCard', label: 'Red', type: 'number' }
            ];
        }
        const headerRow = schema.map(field => `<th class="px-4 py-3 text-left text-blue-800 text-sm font-medium leading-normal">${field.label}</th>`).join('') +
            statFields.map(field => `<th class="px-4 py-3 text-left text-blue-800 text-sm font-medium leading-normal">${field.label}</th>`).join('') +
            '<th></th>';
        // Generate input row function
        function getInputRow(idx = 0, editDataRow = null) {
            let rowHtml = schema.map(field => {
                const value = editDataRow && field.name in editDataRow ? editDataRow[field.name] || '' : '';
                // Number fields: narrow
                if (["number", "played", "won", "draw", "lost", "gf", "ga"].includes(field.name) || field.type === 'number') {
                    return `<td class=\"px-2 py-2\"><input type=\"number\" name=\"${field.name}\" class=\"w-16 px-1 py-1 border border-gray-300 rounded-md text-center\" ${field.required ? 'required' : ''} value=\"${value}\"></td>`;
                }
                // Image/Logo preview and input: small and square
                if (entityType === 'player' && field.name === 'imageUrl') {
                    return `<td class=\"px-2 py-2 text-center">
                        <div class=\"player-image-preview aspect-square bg-cover rounded-full w-16 h-16 mx-auto mb-1\" style=\"background-image: url('${value || generatePlaceholderImageUrl(editDataRow?.name_en || editDataRow?.name || '')}');\"></div>
                        <input type=\"text\" name=\"${field.name}\" class=\"w-24 px-1 py-1 border border-gray-300 rounded-md mt-1 text-xs player-image-url-input\" placeholder=\"Image URL (optional)\" value=\"${value}\">
                    </td>`;
                }
                if (entityType === 'team' && field.name === 'LogoUrl') {
                    return `<td class=\"px-2 py-2 text-center">
                        <div class=\"team-logo-preview aspect-square bg-cover rounded-full w-16 h-16 mx-auto mb-1\" style=\"background-image: url('${value || generatePlaceholderImageUrl(editDataRow?.name || editDataRow?.name_mm || '')}');\"></div>
                        <input type=\"text\" name=\"${field.name}\" class=\"w-24 px-1 py-1 border border-gray-300 rounded-md mt-1 text-xs team-logo-url-input\" placeholder=\"Logo URL (optional)\" value=\"${value}\">
                    </td>`;
                }
                // Name fields: moderate width
                if (["name", "name_en", "name_mm"].includes(field.name)) {
                    return `<td class=\"px-2 py-2\"><input type=\"text\" name=\"${field.name}\" class=\"w-40 px-2 py-1 border border-gray-300 rounded-md\" ${field.required ? 'required' : ''} value=\"${value}\"></td>`;
                }
                // Select fields: moderate width
                if (field.type === 'select') {
                    const options = field.optionsKey && dataOptions[field.optionsKey]
                        ? `<option value=\"\">Select</option>` + dataOptions[field.optionsKey].map(opt => `<option value=\"${opt.id}\" ${value == opt.id ? 'selected' : ''}>${opt.name}</option>`).join('')
                        : (field.options || []).map(opt => `<option value=\"${opt.value}\" ${value == opt.value ? 'selected' : ''}>${opt.label}</option>`).join('');
                    return `<td class=\"px-2 py-2\"><select name=\"${field.name}\" class=\"w-40 px-2 py-1 border border-gray-300 rounded-md\">${options}</select></td>`;
                }
                // Default: moderate width
                return `<td class=\"px-2 py-2\"><input type=\"${field.type}\" name=\"${field.name}\" class=\"w-40 px-2 py-1 border border-gray-300 rounded-md\" ${field.required ? 'required' : ''} value=\"${value}\"></td>`;
            }).join('');
            // Add stat fields for player
            if (entityType === 'player') {
                statFields.forEach(field => {
                    let value = editDataRow && field.name in editDataRow ? editDataRow[field.name] : '';
                    // For yellow/red card, support legacy field names
                    if (field.name === 'yellowCard' && editDataRow && editDataRow['yellow_cards'] !== undefined) value = editDataRow['yellow_cards'];
                    if (field.name === 'redCard' && editDataRow && editDataRow['red_cards'] !== undefined) value = editDataRow['red_cards'];
                    rowHtml += `<td class=\"px-2 py-2\"><input type=\"number\" name=\"${field.name}\" class=\"w-16 px-1 py-1 border border-gray-300 rounded-md text-center\" min=\"0\" value=\"${value || 0}\"></td>`;
                });
            }
            rowHtml += `<td class=\"px-2 py-2 text-center\">${editData ? '' : '<button type=\"button\" class=\"remove-row-btn text-red-600 hover:text-red-800 text-sm font-bold\">Remove</button>'}</td>`;
            return rowHtml;
        }
        modalContainer.innerHTML = `
            <div class=\"fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center\">
                <div class=\"bg-white p-6 rounded-lg shadow-xl max-w-6xl w-full min-w-[900px] mx-4 relative\">
                    <button class=\"modal-close-btn absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold\">&times;</button>
                    <h2 class=\"text-gray-900 text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5\">${title}</h2>
                    <form id=\"dynamic-form\" class=\"px-4 py-3\">
                        <div class=\"flex overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 mb-4\">
                            <table class=\"flex-1 w-full min-w-max\">
                                <thead><tr class=\"bg-blue-100\">${headerRow}</tr></thead>
                                <tbody id=\"modal-input-rows\"><tr>${getInputRow(0, editData)}</tr></tbody>
                            </table>
                        </div>
                        <div class=\"flex gap-3 flex-wrap justify-start mb-2\">
                            ${editData ? '' : `<button type=\"button\" id=\"add-more-row-btn\" class=\"min-w-[84px] cursor-pointer rounded-xl h-10 px-4 bg-gray-200 text-gray-900 text-sm font-bold\">Add More ${entityType === 'player' ? 'Player' : 'Team'}</button>`}
                            <button type=\"submit\" class=\"min-w-[84px] cursor-pointer rounded-xl h-10 px-4 bg-blue-600 text-white text-sm font-bold\">${editData ? 'Update' : `Submit ${entityType === 'player' ? 'Players' : 'Teams'}`}</button>
                        </div>
                        <p id=\"${entityType}-modal-message\" class=\"mt-4 text-sm px-4\"></p>
                    </form>
                </div>
            </div>
        `;
        // Modal close logic
        document.querySelector('.modal-close-btn').addEventListener('click', () => { modalContainer.innerHTML = ''; });
        modalContainer.addEventListener('click', (e) => { if (e.target === modalContainer.firstElementChild) { modalContainer.innerHTML = ''; } });
        modalContainer.querySelector('.bg-white').addEventListener('click', (e) => e.stopPropagation());
        // Add/Remove row logic (disabled in edit mode)
        if (!editData) {
            const form = document.getElementById('dynamic-form');
            const tableBody = form.querySelector('#modal-input-rows');
            form.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-row-btn')) {
                    if (tableBody.children.length > 1) {
                        e.target.closest('tr').remove();
                    }
                }
            });
            document.getElementById('add-more-row-btn').addEventListener('click', () => {
                const newRow = document.createElement('tr');
                newRow.innerHTML = getInputRow(tableBody.children.length);
                tableBody.appendChild(newRow);
            });
        }
        // Image/Logo preview update logic
        function updateImagePreview(row, type) {
            if (type === 'player') {
                const nameInput = row.querySelector('input[name="name"]');
                const nameEnInput = row.querySelector('input[name="name_en"]');
                const imageUrlInput = row.querySelector('input[name="imageUrl"]');
                const preview = row.querySelector('.player-image-preview');
                function setPreview() {
                    const url = imageUrlInput.value.trim();
                    if (url) preview.style.backgroundImage = `url('${url}')`;
                    else preview.style.backgroundImage = `url('${generatePlaceholderImageUrl(nameEnInput.value || nameInput.value)}')`;
                }
                nameInput.addEventListener('input', setPreview);
                nameEnInput.addEventListener('input', setPreview);
                imageUrlInput.addEventListener('input', setPreview);
            }
            if (type === 'team') {
                const nameInput = row.querySelector('input[name="name"]');
                const nameMmInput = row.querySelector('input[name="name_mm"]');
                const logoUrlInput = row.querySelector('input[name="LogoUrl"]');
                const preview = row.querySelector('.team-logo-preview');
                function setPreview() {
                    const url = logoUrlInput.value.trim();
                    if (url) preview.style.backgroundImage = `url('${url}')`;
                    else preview.style.backgroundImage = `url('${generatePlaceholderImageUrl(nameInput.value || nameMmInput.value)}')`;
                }
                nameInput.addEventListener('input', setPreview);
                nameMmInput.addEventListener('input', setPreview);
                logoUrlInput.addEventListener('input', setPreview);
            }
        }
        // Attach preview logic to all rows
        const tableBody = document.getElementById('modal-input-rows');
        Array.from(tableBody.children).forEach(row => updateImagePreview(row, entityType));
        // Attach preview logic to new rows
        if (!editData) {
            const observer = new MutationObserver(() => {
                Array.from(tableBody.children).forEach(row => {
                    if (!row._previewAttached) {
                        updateImagePreview(row, entityType);
                        row._previewAttached = true;
                    }
                });
            });
            observer.observe(tableBody, { childList: true });
        }
        // Form submit logic
        const form = document.getElementById('dynamic-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rows = Array.from(tableBody.querySelectorAll('tr'));
            const items = rows.map(row => {
                const item = {};
                schema.forEach((field, idx) => {
                    const input = row.querySelector(`[name="${field.name}"]`);
                    if (input) {
                        if (field.type === 'number') {
                            item[field.name] = input.value !== '' ? Number(input.value) : undefined;
                        } else {
                            item[field.name] = input.value;
                        }
                    }
                });
                // Add stat fields for player
                if (entityType === 'player') {
                    statFields.forEach(field => {
                        const input = row.querySelector(`[name="${field.name}"]`);
                        if (input) {
                            let val = input.value !== '' ? Number(input.value) : 0;
                            if (field.name === 'yellowCard') item['yellow_cards'] = val;
                            else if (field.name === 'redCard') item['red_cards'] = val;
                            else item[field.name] = val;
                        }
                    });
                }
                // Fallbacks for image/logo
                if (entityType === 'player' && !item.imageUrl) {
                    item.imageUrl = generatePlaceholderImageUrl(item.name_en || item.name);
                }
                if (entityType === 'team' && !item.LogoUrl) {
                    item.LogoUrl = generatePlaceholderImageUrl(item.name || item.name_mm);
                }
                // --- Normalize stat field names for backend ---
                if (entityType === 'player') {
                    if (item.yellowCard !== undefined) {
                        item.yellow_cards = item.yellowCard;
                        delete item.yellowCard;
                    }
                    if (item.redCard !== undefined) {
                        item.red_cards = item.redCard;
                        delete item.redCard;
                    }
                }
                return item;
            });
            const modalMessage = document.getElementById(`${entityType}-modal-message`);
            showLoading();
            try {
                if (editData && editData.id) {
                    await callAdminApi(submitApiEndpoint, 'PUT', items[0]);
                    modalMessage.textContent = `${title} updated successfully!`;
                } else {
                    await Promise.all(items.map(data => callAdminApi(submitApiEndpoint, 'POST', data)));
                    modalMessage.textContent = `${title} added successfully!`;
                }
                modalMessage.className = 'mt-4 text-sm px-4 text-green-600';
                // Reload only the relevant data for this entity
                if (entityType === 'team') teamsCache = [];
                if (entityType === 'player') setAllPlayersCache([]);
                setTimeout(() => {
                    hideLoading();
                    modalContainer.innerHTML = '';
                    // Always reload the players table after add/update
                    if (entityType === 'player') {
                        window.currentPage = 'players';
                        window.updateMainContent();
                    } else {
                        window.updateMainContent();
                    }
                }, 1200);
            } catch (error) {
                hideLoading();
                modalMessage.textContent = `Error: ${error.message}`;
                modalMessage.className = 'mt-4 text-sm px-4 text-red-600';
            }
        });
        return;
    }
    // Match modal special logic
    if (entityType === 'match') {
        // If editing, show team names, date, and time as readonly text fields
        let homeTeamName = '', awayTeamName = '', dateValue = '', timeValue = '', homeScore = '', awayScore = '', statusValue = '';
        let goals = [], assists = [], yellow_cards = [], red_cards = [];
        let teamA = null, teamB = null;
        if (editData) {
            // Find team names from teamsCache
            const teams = Array.isArray(teamsCache) && teamsCache.length > 0 ? teamsCache : await getTeams();
            const homeTeam = teams.find(t => t.id == editData.home_team);
            const awayTeam = teams.find(t => t.id == editData.away_team);
            homeTeamName = homeTeam ? homeTeam.name : (editData.home_team || '[No Home Team]');
            awayTeamName = awayTeam ? awayTeam.name : (editData.away_team || '[No Away Team]');
            dateValue = editData.date || '[No Date]';
            timeValue = editData.time || '[No Time]';
            homeScore = editData.home_score ?? '';
            awayScore = editData.away_score ?? '';
            statusValue = editData.status || '';
            goals = Array.isArray(editData.goals) ? editData.goals : [];
            assists = Array.isArray(editData.assists) ? editData.assists : [];
            yellow_cards = Array.isArray(editData.yellow_cards) ? editData.yellow_cards : [];
            red_cards = Array.isArray(editData.red_cards) ? editData.red_cards : [];
            teamA = homeTeam;
            teamB = awayTeam;
        }
        // Helper to render event arrays
        function renderEventTable(title, arr, players, arrName) {
            return `
                <div class="mb-4">
                    <label class="block text-sm font-bold mb-1">${title}</label>
                    <table class="w-full border border-gray-200 rounded mb-2">
                        <thead><tr><th class="p-2">Player</th><th class="p-2">Minute (mm:ss)</th><th class="p-2"></th></tr></thead>
                        <tbody id="${arrName}-tbody">
                            ${arr.map((ev, idx) => `
                                <tr>
                                    <td class="p-2">
                                        <select class="event-player-select border rounded px-2 py-1" data-idx="${idx}" data-type="${arrName}">
                                            <option value="">Select Player</option>
                                            ${players.map(p => `<option value="${p.id}" ${ev.player_id === p.id ? 'selected' : ''}>${p.name} (#${p.number || ''})</option>`).join('')}
                                        </select>
                                    </td>
                                    <td class="p-2"><input type="text" class="event-minute-input border rounded px-2 py-1" data-idx="${idx}" data-type="${arrName}" value="${ev.minute || ''}" placeholder="mm:ss"></td>
                                    <td class="p-2"><button type="button" class="remove-event-btn text-red-600" data-idx="${idx}" data-type="${arrName}">Remove</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <button type="button" class="add-event-btn bg-gray-200 px-3 py-1 rounded text-sm font-bold" data-type="${arrName}">Add ${title.slice(0, -1)}</button>
                </div>
            `;
        }
        // Fetch all players for both teams
        let allPlayers = [];
        if (editData && editData.home_team && editData.away_team) {
            const allPlayersList = await callAdminApi('players');
            allPlayers = allPlayersList.filter(p => p.team_id === editData.home_team || p.team_id === editData.away_team);
        }
        let events = [];
        if (editData) {
            // Combine all events into a single array for unified display
            function addEventsFromArray(arr, type) {
                if (Array.isArray(arr)) {
                    arr.forEach(ev => events.push({
                        type,
                        player_id: ev.player_id,
                        minute: ev.minute,
                    }));
                }
            }
            addEventsFromArray(editData.goals, 'Goal');
            addEventsFromArray(editData.assists, 'Assist');
            addEventsFromArray(editData.yellow_cards, 'Yellow Card');
            addEventsFromArray(editData.red_cards, 'Red Card');
        }
        function renderEventsTable(eventsArr) {
            return `
                <div class="mb-4">
                    <label class="block text-sm font-bold mb-1">Match Events</label>
                    <table class="w-full border border-gray-200 rounded mb-2">
                        <thead><tr><th class="p-2">Type</th><th class="p-2">Team</th><th class="p-2">Player</th><th class="p-2">Minute (mm:ss)</th><th class="p-2"></th></tr></thead>
                        <tbody id="events-tbody">
                            ${eventsArr.map((ev, idx) => {
                                const team = teamA && ev.player_id && allPlayers.find(p => p.id === ev.player_id)?.team_id === teamA.id ? teamA : teamB;
                                const player = allPlayers.find(p => p.id === ev.player_id);
                                return `<tr>
                                    <td class="p-2">${ev.type}</td>
                                    <td class="p-2">${team ? team.name : ''}</td>
                                    <td class="p-2">${player ? player.name : ''}</td>
                                    <td class="p-2">${ev.minute || ''}</td>
                                    <td class="p-2"><button type="button" class="remove-event-btn text-red-600" data-idx="${idx}">Remove</button></td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        // Modal HTML
        modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
                <div class="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full min-w-[500px] mx-4 relative border-4 border-blue-400">
                    <button class="modal-close-btn absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
                    <h2 class="text-gray-900 text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">${editData ? 'Edit Match' : 'Add Match'}</h2>
                    <form id="add-match-form" class="px-4 py-3 space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium mb-1">Date *</label>
                                ${editData ? `<input type="text" class="w-full px-2 py-1 border border-gray-200 rounded-md bg-gray-100 text-gray-500" value="${dateValue}" readonly>` : `<input type="date" id="addMatchDate" class="w-full px-2 py-1 border border-gray-300 rounded-md" required>`}
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Time *</label>
                                ${editData ? `<input type="text" class="w-full px-2 py-1 border border-gray-200 rounded-md bg-gray-100 text-gray-500" value="${timeValue}" readonly>` : `<input type="time" id="addMatchTime" class="w-full px-2 py-1 border border-gray-300 rounded-md" required>`}
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Home Team *</label>
                                ${editData ? `<input type="text" class="w-full px-2 py-1 border border-gray-200 rounded-md bg-gray-100 text-gray-500" value="${homeTeamName}" readonly>` : `<select id="addMatchHomeTeamId" class="w-full px-2 py-1 border border-gray-300 rounded-md" required><option value="">Select Home Team</option>${dataOptions.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</select>`}
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Away Team *</label>
                                ${editData ? `<input type="text" class="w-full px-2 py-1 border border-gray-200 rounded-md bg-gray-100 text-gray-500" value="${awayTeamName}" readonly>` : `<select id="addMatchAwayTeamId" class="w-full px-2 py-1 border border-gray-300 rounded-md" required><option value="">Select Away Team</option>${dataOptions.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</select>`}
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Home Team Score *</label>
                                <input type="number" id="addMatchHomeScore" class="w-20 px-2 py-1 border border-gray-300 rounded-md text-center" maxlength="2" min="0" max="99" required value="${homeScore}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Away Team Score *</label>
                                <input type="number" id="addMatchAwayScore" class="w-20 px-2 py-1 border border-gray-300 rounded-md text-center" maxlength="2" min="0" max="99" required value="${awayScore}">
                            </div>
                            <div class="col-span-2">
                                <label class="block text-sm font-medium mb-1">Status *</label>
                                <select id="addMatchStatus" class="w-full px-2 py-1 border border-gray-300 rounded-md" required>
                                    <option value="upcoming" ${statusValue === 'upcoming' ? 'selected' : ''}>Upcoming</option>
                                    <option value="ongoing" ${statusValue === 'ongoing' ? 'selected' : ''}>Ongoing</option>
                                    <option value="finished" ${statusValue === 'finished' ? 'selected' : ''}>Finished</option>
                                </select>
                            </div>
                        </div>
                        ${editData ? `
                        <div class="border-t pt-4 mt-4">
                            <div class="mb-4 flex flex-wrap gap-2 items-end">
                                <div>
                                    <label class="block text-xs font-bold mb-1">Event Type</label>
                                    <select id="event-type-select" class="border rounded px-2 py-1">
                                        <option value="">Select</option>
                                        <option value="Goal">Goal</option>
                                        <option value="Assist">Assist</option>
                                        <option value="Yellow Card">Yellow Card</option>
                                        <option value="Red Card">Red Card</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold mb-1">Team</label>
                                    <select id="event-team-select" class="border rounded px-2 py-1" disabled>
                                        <option value="">Select</option>
                                        <option value="${teamA?.id || ''}">${teamA?.name || 'Team A'}</option>
                                        <option value="${teamB?.id || ''}">${teamB?.name || 'Team B'}</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold mb-1">Player</label>
                                    <select id="event-player-select" class="border rounded px-2 py-1" disabled>
                                        <option value="">Select</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold mb-1">Minute (mm:ss)</label>
                                    <input type="text" id="event-minute-input" class="border rounded px-2 py-1 w-20" placeholder="mm:ss" disabled>
                                </div>
                                <button type="button" id="add-event-btn" class="bg-gray-200 px-3 py-1 rounded text-sm font-bold" disabled>Add Event</button>
                            </div>
                            ${renderEventsTable(events)}
                        </div>
                        ` : ''}
                        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-md font-bold mt-4">${editData ? 'Update' : 'Submit'}</button>
                        <p id="match-form-message" class="mt-4 text-sm px-4"></p>
                    </form>
                </div>
            </div>
        `;
        // Modal close logic
        document.querySelector('.modal-close-btn').addEventListener('click', () => { modalContainer.innerHTML = ''; });
        modalContainer.addEventListener('click', (e) => { if (e.target === modalContainer.firstElementChild) { modalContainer.innerHTML = ''; } });
        modalContainer.querySelector('.bg-white').addEventListener('click', (e) => e.stopPropagation());
        // Only add team filtering if not edit mode
        if (!editData) {
            const homeSelect = document.getElementById('addMatchHomeTeamId');
            const awaySelect = document.getElementById('addMatchAwayTeamId');
            homeSelect.addEventListener('change', () => {
                const homeId = homeSelect.value;
                Array.from(awaySelect.options).forEach(opt => {
                    opt.disabled = (opt.value && opt.value === homeId);
                });
            });
        }
        // Unified event add logic (edit mode only)
        if (editData) {
            const eventTypeSelect = document.getElementById('event-type-select');
            const eventTeamSelect = document.getElementById('event-team-select');
            const eventPlayerSelect = document.getElementById('event-player-select');
            const eventMinuteInput = document.getElementById('event-minute-input');
            const addEventBtn = document.getElementById('add-event-btn');
            // Enable team select after type selected
            eventTypeSelect.addEventListener('change', () => {
                eventTeamSelect.disabled = !eventTypeSelect.value;
                eventPlayerSelect.disabled = true;
                eventMinuteInput.disabled = true;
                addEventBtn.disabled = true;
                eventTeamSelect.value = '';
                eventPlayerSelect.innerHTML = '<option value="">Select</option>';
                eventMinuteInput.value = '';
            });
            // Enable player select after team selected
            eventTeamSelect.addEventListener('change', () => {
                if (!eventTeamSelect.value) {
                    eventPlayerSelect.disabled = true;
                    eventMinuteInput.disabled = true;
                    addEventBtn.disabled = true;
                    eventPlayerSelect.innerHTML = '<option value="">Select</option>';
                    return;
                }
                const filteredPlayers = allPlayers.filter(p => p.team_id === eventTeamSelect.value);
                eventPlayerSelect.innerHTML = '<option value="">Select</option>' + filteredPlayers.map(p => `<option value="${p.id}">${p.name} (#${p.number || ''})</option>`).join('');
                eventPlayerSelect.disabled = false;
                eventMinuteInput.disabled = true;
                addEventBtn.disabled = true;
                eventPlayerSelect.value = '';
                eventMinuteInput.value = '';
            });
            // Enable minute input after player selected
            eventPlayerSelect.addEventListener('change', () => {
                eventMinuteInput.disabled = !eventPlayerSelect.value;
                addEventBtn.disabled = true;
                eventMinuteInput.value = '';
            });
            // Enable add button after minute input
            eventMinuteInput.addEventListener('input', () => {
                addEventBtn.disabled = !(eventMinuteInput.value && /^\d{1,3}:\d{2}$/.test(eventMinuteInput.value));
            });
            // Add event to table
            addEventBtn.addEventListener('click', () => {
                if (eventTypeSelect.value && eventTeamSelect.value && eventPlayerSelect.value && eventMinuteInput.value) {
                    events.push({
                        type: eventTypeSelect.value,
                        player_id: eventPlayerSelect.value,
                        minute: eventMinuteInput.value
                    });
                    // Re-render events table
                    document.getElementById('events-tbody').innerHTML = renderEventsTable(events).match(/<tbody id="events-tbody">([\s\S]*?)<\/tbody>/)[1];
                    // Reset selectors
                    eventTypeSelect.value = '';
                    eventTeamSelect.value = '';
                    eventPlayerSelect.innerHTML = '<option value="">Select</option>';
                    eventPlayerSelect.disabled = true;
                    eventMinuteInput.value = '';
                    eventMinuteInput.disabled = true;
                    addEventBtn.disabled = true;
                }
            });
            // Remove event logic
            document.getElementById('events-tbody').addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-event-btn')) {
                    const idx = parseInt(e.target.dataset.idx, 10);
                    events.splice(idx, 1);
                    document.getElementById('events-tbody').innerHTML = renderEventsTable(events).match(/<tbody id="events-tbody">([\s\S]*?)<\/tbody>/)[1];
                }
            });
        };
        // Add match form submission
        document.getElementById('add-match-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            let matchData;
            const modalMessage = document.getElementById('match-form-message');
            showLoading();
            if (editData) {
                // Only allow editing scores, status, and event arrays
                matchData = {
                    homeScore: parseInt(document.getElementById('addMatchHomeScore').value) || 0,
                    awayScore: parseInt(document.getElementById('addMatchAwayScore').value) || 0,
                    status: document.getElementById('addMatchStatus').value,
                };
                // Split events into arrays by type
                matchData.goals = events.filter(ev => ev.type === 'Goal').map(ev => ({ player_id: ev.player_id, minute: ev.minute }));
                matchData.assists = events.filter(ev => ev.type === 'Assist').map(ev => ({ player_id: ev.player_id, minute: ev.minute }));
                matchData.yellow_cards = events.filter(ev => ev.type === 'Yellow Card').map(ev => ({ player_id: ev.player_id, minute: ev.minute }));
                matchData.red_cards = events.filter(ev => ev.type === 'Red Card').map(ev => ({ player_id: ev.player_id, minute: ev.minute }));
            } else {
                const rawDate = document.getElementById('addMatchDate').value; // YYYY-MM-DD
                if (!rawDate) {
                    modalMessage.textContent = 'Date is required.';
                    modalMessage.className = 'mt-4 text-sm text-red-600';
                    hideLoading();
                    return;
                }
                const [yearFull, month, day] = rawDate.split('-');
                const formattedDate = `${day}-${month}-${yearFull}`; // Convert to DD-MM-YYYY for backend
                let rawTime = document.getElementById('addMatchTime').value; // 'HH:MM'
                let formattedTime = '';
                if (rawTime) {
                    let [hour, minute] = rawTime.split(':');
                    hour = parseInt(hour, 10);
                    let period = 'AM';
                    if (hour === 0) {
                        hour = 12;
                    } else if (hour === 12) {
                        period = 'PM';
                    } else if (hour > 12) {
                        hour -= 12;
                        period = 'PM';
                    }
                    formattedTime = `${String(hour).padStart(2, '0')}:${minute} ${period}`;
                }
                matchData = {
                    date: formattedDate, // Send as DD-MM-YYYY string
                    time: formattedTime, // Send as HH:MM AM/PM string
                    homeTeamId: document.getElementById('addMatchHomeTeamId').value,
                    homeScore: parseInt(document.getElementById('addMatchHomeScore').value) || 0,
                    awayTeamId: document.getElementById('addMatchAwayTeamId').value,
                    awayScore: parseInt(document.getElementById('addMatchAwayScore').value) || 0,
                    status: document.getElementById('addMatchStatus').value,
                };
            }
            try {
                if (editData && editData.id) {
                    await callAdminApi(submitApiEndpoint, 'PUT', matchData);
                    modalMessage.textContent = 'Match updated successfully!';
                } else {
                    await callAdminApi('matches', 'POST', matchData);
                    modalMessage.textContent = 'Match added successfully!';
                }
                modalMessage.className = 'mt-4 text-sm text-green-600';
                setTimeout(() => { hideLoading(); modalContainer.innerHTML = ''; window.updateMainContent(); }, 1200);
            } catch (error) {
                hideLoading();
                modalMessage.textContent = `Error: ${error.message}`;
                modalMessage.className = 'mt-4 text-sm px-4 text-red-600';
            }
        });
        return;
    }
    // --- News Modal Logic ---
    if (entityType === 'news') {
        let now = new Date();
        let defaultDate = now.toISOString().slice(0,16);
        let isEdit = !!editData;
        let newsIdValue = isEdit ? (editData.news_id || '') : '';
        let authorValue = isEdit ? (editData.author || 'admin') : 'admin';
        let dateValue = isEdit && editData.date ? new Date(editData.date._seconds ? editData.date._seconds * 1000 : editData.date).toISOString().slice(0,16) : defaultDate;
        let tagsArr = isEdit && Array.isArray(editData.tags) ? editData.tags : [];
        let imgUrlArr = isEdit && Array.isArray(editData.imgUrl) ? editData.imgUrl : [];
        async function generateNewsId(dateStr) {
            const [yyyy, mm, dd] = dateStr.split('T')[0].split('-');
            const dayStr = dd + mm + yyyy;
            const newsList = await callAdminApi('news');
            const idsToday = newsList.map(n => n.news_id).filter(id => id && id.startsWith(dayStr));
            let maxN = 0;
            idsToday.forEach(id => { const n = parseInt(id.slice(8), 10); if (!isNaN(n) && n > maxN) maxN = n; });
            const nextN = (maxN + 1).toString().padStart(2, '0');
            return dayStr + nextN;
        }
        // Modal HTML
        modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
                <div class="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 relative">
                    <button class="modal-close-btn absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
                    <h2 class="text-gray-900 text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">${isEdit ? 'Edit News' : 'Add News'}</h2>
                    <form id="news-form" class="px-2 py-2">
                        <div class="mb-2">
                            <label class="block text-sm font-medium mb-1">Title *</label>
                            <input type="text" name="title" class="w-full px-3 py-2 border border-gray-300 rounded-md" required value="${isEdit ? (editData.title || '') : ''}">
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm font-medium mb-1">Body *</label>
                            <div class="flex gap-2 mb-1">
                                <button type="button" class="body-format-btn px-2 py-1 text-xs bg-gray-200 rounded" data-cmd="bold"><b>B</b></button>
                                <button type="button" class="body-format-btn px-2 py-1 text-xs bg-gray-200 rounded" data-cmd="italic"><i>I</i></button>
                                <button type="button" class="body-format-btn px-2 py-1 text-xs bg-gray-200 rounded" data-cmd="insertUnorderedList">• List</button>
                                <button type="button" class="body-format-btn px-2 py-1 text-xs bg-gray-200 rounded" data-cmd="insertOrderedList">1. List</button>
                            </div>
                            <div id="news-body-editor" contenteditable="true" class="w-full min-h-[90px] px-3 py-2 border border-gray-300 rounded-md bg-white" style="outline:none;">${isEdit ? (editData.body || '') : ''}</div>
                            <div class="text-xs text-gray-500 mt-1">You can use formatting buttons above.</div>
                        </div>
                        <div class="mb-2 grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium mb-1">Date *</label>
                                <input type="datetime-local" name="date" class="w-full px-3 py-2 border border-gray-300 rounded-md" required value="${dateValue}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">News ID</label>
                                <input type="text" name="news_id" class="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-400 cursor-not-allowed" value="${newsIdValue}" readonly tabindex="-1">
                            </div>
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm font-medium mb-1">Author *</label>
                            <input type="text" name="author" class="w-full px-3 py-2 border border-gray-300 rounded-md" required value="${authorValue}">
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm font-medium mb-1">Tags</label>
                            <div class="flex gap-2 mb-1">
                                <input type="text" id="tag-input" class="flex-1 px-2 py-1 border border-gray-300 rounded-md" placeholder="Enter tag">
                                <button type="button" id="add-tag-btn" class="px-3 py-1 bg-blue-100 text-blue-800 rounded">Add Tag</button>
                            </div>
                            <div id="tags-list" class="flex flex-wrap gap-2">${tagsArr.map(tag => `<span class='inline-flex items-center bg-blue-200 text-blue-800 rounded px-2 py-1 text-xs font-bold mr-1 mb-1 tag-chip'>${tag}<button type='button' class='ml-1 text-blue-900 font-bold tag-remove' data-tag='${tag}'>&times;</button></span>`).join('')}</div>
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm font-medium mb-1">Image URLs</label>
                            <div class="flex gap-2 mb-1">
                                <input type="text" id="imgurl-input" class="flex-1 px-2 py-1 border border-gray-300 rounded-md" placeholder="Paste image URL">
                                <button type="button" id="add-imgurl-btn" class="px-3 py-1 bg-green-100 text-green-800 rounded">Add Image</button>
                            </div>
                            <div id="imgurl-list" class="flex flex-wrap gap-2">${imgUrlArr.map(url => {
                                let name = url.split('/').pop().split('.')[0];
                                let short = name.slice(-5);
                                return `<span class='inline-flex items-center bg-green-200 text-green-800 rounded px-2 py-1 text-xs font-bold mr-1 mb-1 imgurl-chip' title='${url}'>${short}<button type='button' class='ml-1 text-green-900 font-bold imgurl-remove' data-url='${url}'>&times;</button></span>`;
                            }).join('')}</div>
                        </div>
                        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-md font-bold mt-2">${isEdit ? 'Update' : 'Submit'}</button>
                        <p id="news-modal-message" class="mt-4 text-sm px-4"></p>
                    </form>
                </div>
            </div>
        `;
        // Modal close logic
        document.querySelector('.modal-close-btn').addEventListener('click', () => { modalContainer.innerHTML = ''; });
        modalContainer.addEventListener('click', (e) => { if (e.target === modalContainer.firstElementChild) { modalContainer.innerHTML = ''; } });
        modalContainer.querySelector('.bg-white').addEventListener('click', (e) => e.stopPropagation());
        // Tag logic
        let tags = [...tagsArr];
        const tagInput = document.getElementById('tag-input');
        const tagsList = document.getElementById('tags-list');
        document.getElementById('add-tag-btn').onclick = () => {
            const val = tagInput.value.trim();
            if (val && !tags.includes(val)) {
                tags.push(val);
                tagsList.innerHTML += `<span class='inline-flex items-center bg-blue-200 text-blue-800 rounded px-2 py-1 text-xs font-bold mr-1 mb-1 tag-chip'>${val}<button type='button' class='ml-1 text-blue-900 font-bold tag-remove' data-tag='${val}'>&times;</button></span>`;
                tagInput.value = '';
            }
        };
        tagsList.onclick = (e) => {
            if (e.target.classList.contains('tag-remove')) {
                const tag = e.target.dataset.tag;
                tags = tags.filter(t => t !== tag);
                e.target.parentElement.remove();
            }
        };
        // ImgUrl logic
        let imgUrls = [...imgUrlArr];
        const imgUrlInput = document.getElementById('imgurl-input');
        const imgUrlList = document.getElementById('imgurl-list');
        document.getElementById('add-imgurl-btn').onclick = () => {
            const val = imgUrlInput.value.trim();
            if (val && !imgUrls.includes(val)) {
                let name = val.split('/').pop().split('.')[0];
                let short = name.slice(-5);
                imgUrls.push(val);
                imgUrlList.innerHTML += `<span class='inline-flex items-center bg-green-200 text-green-800 rounded px-2 py-1 text-xs font-bold mr-1 mb-1 imgurl-chip' title='${val}'>${short}<button type='button' class='ml-1 text-green-900 font-bold imgurl-remove' data-url='${val}'>&times;</button></span>`;
                imgUrlInput.value = '';
            }
        };
        imgUrlList.onclick = (e) => {
            if (e.target.classList.contains('imgurl-remove')) {
                const url = e.target.dataset.url;
                imgUrls = imgUrls.filter(u => u !== url);
                e.target.parentElement.remove();
            }
        };
        // On add, auto-generate news_id when date changes
        if (!isEdit) {
            const dateInput = document.querySelector('input[name="date"]');
            const newsIdInput = document.querySelector('input[name="news_id"]');
            async function updateNewsId() {
                const val = dateInput.value || defaultDate;
                newsIdInput.value = await generateNewsId(val);
            }
            dateInput.addEventListener('change', updateNewsId);
            updateNewsId();
        }
        // Form submit logic
        document.getElementById('news-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);
            const data = {};
            data.title = formData.get('title');
            data.body = document.getElementById('news-body-editor').innerHTML;
            data.date = new Date(formData.get('date')).toISOString();
            data.author = formData.get('author');
            data.tags = tags;
            data.imgUrl = imgUrls;
            data.news_id = formData.get('news_id');
            const modalMessage = document.getElementById('news-modal-message');
            showLoading();
            try {
                if (isEdit && editData.id) {
                    await callAdminApi(`${submitApiEndpoint}/${editData.id}`, 'PUT', data);
                    modalMessage.textContent = 'News updated successfully!';
                } else {
                    await callAdminApi(submitApiEndpoint, 'POST', data);
                    modalMessage.textContent = 'News added successfully!';
                }
                modalMessage.className = 'mt-4 text-sm text-green-600';
                setTimeout(() => { hideLoading(); modalContainer.innerHTML = ''; window.updateMainContent(); }, 1200);
            } catch (error) {
                hideLoading();
                modalMessage.textContent = `Error: ${error.message}`;
                modalMessage.className = 'mt-4 text-sm px-4 text-red-600';
            }
        });
        // Rich text formatting buttons logic
        document.querySelectorAll('.body-format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const cmd = btn.getAttribute('data-cmd');
                document.execCommand(cmd, false, null);
            });
        });
        return;
    }
}
