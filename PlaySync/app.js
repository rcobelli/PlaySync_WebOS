document.addEventListener('DOMContentLoaded', async () => {
    const MAX_SELECTIONS = 4;
    const selectedProgrammes = new Set();

    const status = document.getElementById('status');
    const programmeList = document.getElementById('channels');

    // Categories excluded from grouping.
    const IGNORED_CATEGORIES = ['HD', 'ESPN', 'HDTV'];

    let currentProgrammes = [];

    function parseXmltvDate(value) {
        const match = value.match(
            /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-])(\d{2})(\d{2}))?$/
        );

        if (!match) return NaN;

        const [, year, month, day, hour, minute, second,
            sign, offsetHour, offsetMinute] = match;

        const localAsUtc = Date.UTC(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(minute),
            Number(second)
        );

        let offset = 0;

        if (sign) {
            offset = (
                Number(offsetHour) * 60 +
                Number(offsetMinute)
            ) * 60000;

            if (sign === '-') offset = -offset;
        }

        return localAsUtc - offset;
    }

    function getCategories(programme) {
        const ignored = new Set(
            IGNORED_CATEGORIES.map(category => category.toLowerCase())
        );

        const categories = programme.categories?.length
            ? programme.categories
            : programme.category
                ? [programme.category]
                : [];

        return categories.filter(category =>
            !ignored.has(category.trim().toLowerCase())
        );
    }

    function getLiveProgrammes(programmes) {
        const now = Date.now();

        return programmes
            .filter(programme => {
                const start = parseXmltvDate(programme.start);
                const stop = parseXmltvDate(programme.stop);

                return Number.isFinite(start) &&
                    Number.isFinite(stop) &&
                    start <= now &&
                    now < stop;
            })
            .map(programme => {
                const categories = getCategories(programme);

                return {
                    ...programme,
                    displayCategory: categories[0] || 'Other'
                };
            })
            .sort((a, b) =>
                a.title.localeCompare(b.title)
            );
    }

    function renderProgrammes() {
        programmeList.replaceChildren();

        const groups = new Map();

        currentProgrammes.forEach(programme => {
            if (!groups.has(programme.displayCategory)) {
                groups.set(programme.displayCategory, []);
            }

            groups.get(programme.displayCategory).push(programme);
        });

        const sortedCategories = Array.from(groups.keys())
            .sort((a, b) => a.localeCompare(b));

        sortedCategories.forEach(category => {
            const heading = document.createElement('li');
            heading.className = 'category-heading';
            heading.textContent = category;
            programmeList.appendChild(heading);

            groups.get(category).forEach(programme => {
                const item = document.createElement('li');
                const button = document.createElement('button');

                button.className = 'programme';
                button.type = 'button';

                const title = document.createElement('span');
                title.className = 'programme-title';
                title.textContent = programme.title || 'Untitled';

                const description = document.createElement('span');
                description.className = 'programme-description';
                description.textContent = programme.description || '';

                const selection = document.createElement('span');
                selection.className = 'programme-selection';

                function updateSelectionUI() {
                    const selected = selectedProgrammes.has(programme);

                    button.classList.toggle('selected', selected);
                    selection.textContent = selected ? '✓ Selected' : '○ Select';
                    button.setAttribute('aria-pressed', String(selected));
                }

                button.append(title, description, selection);

                button.addEventListener('click', () => {
                    if (selectedProgrammes.has(programme)) {
                        selectedProgrammes.delete(programme);
                    } else if (selectedProgrammes.size < MAX_SELECTIONS) {
                        selectedProgrammes.add(programme);
                    } else {
                        status.textContent = 'You can select up to 4 programmes.';
                        return;
                    }

                    updateSelectionUI();
                    updateContinueButton();
                });

                updateSelectionUI();

                item.appendChild(button);
                programmeList.appendChild(item);
            });
        });

        if (currentProgrammes.length === 0) {
            const item = document.createElement('li');
            item.textContent = 'No programmes airing right now.';
            programmeList.appendChild(item);
        }

        status.textContent =
            `${currentProgrammes.length} programmes airing now`;

        const first = programmeList.querySelector('button');
        if (first) first.focus();
    }

    // Navigate programme buttons with the TV remote.
    programmeList.addEventListener('keydown', event => {
        const buttons = Array.from(
            programmeList.querySelectorAll('button')
        );

        const index = buttons.indexOf(document.activeElement);

        if (index === -1) return;

        if (event.key === 'ArrowDown' || event.keyCode === 40) {
            event.preventDefault();

            if (index === buttons.length - 1) {
                continueButton.focus();
            } else {
                buttons[index + 1].focus();
                buttons[index + 1].scrollIntoView({
                    block: 'nearest'
                });
            }
        } else if (
            event.key === 'ArrowUp' || event.keyCode === 38
        ) {
            event.preventDefault();

            if (index > 0) {
                buttons[index - 1].focus();
                buttons[index - 1].scrollIntoView({
                    block: 'nearest'
                });
            }
        }
    });

    try {
        status.textContent = 'Loading TV guide...';

        const { programmes } = await loadXMLTV();

        currentProgrammes = getLiveProgrammes(programmes);
        renderProgrammes();
    } catch (error) {
        console.error('Failed to load TV guide:', error);
        status.textContent = `Error loading TV guide: ${error.message}`;
    }

    const continueButton = document.getElementById('continue-button');
    const selectionCount = document.getElementById('selection-count');

    continueButton.addEventListener('keydown', event => {
        if (event.key === 'ArrowUp' || event.keyCode === 38) {
            event.preventDefault();

            const buttons = Array.from(
                programmeList.querySelectorAll('button')
            );

            if (buttons.length > 0) {
                buttons[buttons.length - 1].focus();
                buttons[buttons.length - 1].scrollIntoView({
                    block: 'nearest'
                });
            }
        }
    });

    function updateContinueButton() {
        const count = selectedProgrammes.size;
        const canContinue = count === MAX_SELECTIONS;

        selectionCount.textContent = `${count} of 4 selected`;

        // Keep it focusable even before four selections.
        continueButton.disabled = false;
        continueButton.setAttribute(
            'aria-disabled',
            String(!canContinue)
        );

        continueButton.classList.toggle(
            'ready',
            canContinue
        );
    }

    continueButton.addEventListener('click', () => {
        if (selectedProgrammes.size !== 4) {
            status.textContent = 'Select 4 programmes to continue.';
            return;
        }

        const selection = Array.from(selectedProgrammes);

        console.log('Starting quad-view:', selection);

        renderQuadView(selection);
    });

    updateContinueButton();


    function renderQuadView(programmes) {
        document.body.replaceChildren();

        document.body.classList.add('quad-view-active');

        const quadView = document.createElement('div');
        quadView.id = 'quad-view';

        programmes.forEach((programme, index) => {
            console.log(`Attempting to play quad ${index + 1}:`, programme);
            const tile = document.createElement('div');
            tile.className = 'video-tile';

            const video = document.createElement('video');
            video.className = 'quad-video';
            video.autoplay = true;
            video.muted = true;
            video.defaultMuted = true;
            video.playsInline = true;
            video.preload = 'auto';

            const channel = programme.channel.split('.')[0];
            video.src =
                `http://192.168.0.100:8000/channels/${channel}.m3u8`;

            video.addEventListener('error', () => {
                console.error(
                    `Video ${index + 1} failed to load:`,
                    video.error,
                    video.src
                );

                const message = document.createElement('div');
                message.className = 'video-error';
                message.textContent =
                    `Unable to play ${programme.title || programme.channel}`;

                tile.appendChild(message);
            });

            video.addEventListener('playing', () => {
                console.log(`Quad ${index + 1} is playing:`, video.src);
            });

            tile.appendChild(video);
            quadView.appendChild(tile);
        });

        document.body.appendChild(quadView);
        const videos = quadView.querySelectorAll('video');

        videos.forEach((video, index) => {
            video.muted = true;
            video.defaultMuted = true;

            video.play().catch(error => {
                console.error(
                    `Playback failed for stream ${index + 1}:`,
                    error.name,
                    error.message,
                    video.currentSrc
                );
            });
        });
    }
});
