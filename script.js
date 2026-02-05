// script.js

const state = {
    currentTab: 'lab',
    currentFontIndex: 0,
    isFontListOpen: false,
    isDarkMode: false,
    isGridOn: true,
    isTextInverse: false,
    bgMode: 'plain',
    currentAxisValues: {},
    activeAnimations: {},
    zoom: 1,
    pan: { x: 0, y: 0 },
    isSpaceHeld: false,
    isPanning: false,
    lastMousePos: { x: 0, y: 0 },
    openGroupIndex: -1
};

// DOM Elements
const canvasWrapper = document.getElementById('canvas-wrapper');
const canvasContent = document.getElementById('canvas-content');
const previewCharEl = document.getElementById('preview-char');
const zoomLevelEl = document.getElementById('zoom-level');

const controlHub = document.getElementById('control-hub');
const hubHeader = controlHub.querySelector('.hub-header');
const darkModeSwitch = document.getElementById('dark-mode-switch');
const gridSwitch = document.getElementById('grid-switch');
const inverseSwitch = document.getElementById('inverse-switch');

const scContainer = document.getElementById('bg-switcher');
const scBtns = document.querySelectorAll('.sc-btn');
const scGlider = document.querySelector('.sc-glider');
const bgUploadInput = document.getElementById('bg-upload');
const customBgLayer = document.getElementById('custom-bg-layer');

const dynamicAxesContainer = document.getElementById('dynamic-axes-container');
const fontTrigger = document.getElementById('font-trigger');
const fontListPopup = document.getElementById('font-list-popup');
const currentFontNameEl = document.getElementById('current-font-name');

// Data Helpers
const getGroupedData = () => state.currentTab === 'lab' ? labData : libData;
const getFlatData = () => {
    const groups = getGroupedData();
    let flat = [];
    groups.forEach(g => flat = flat.concat(g.items));
    return flat;
};

document.addEventListener('DOMContentLoaded', () => {
    initCanvasControls();
    initHubInteraction();
    initThemeControls();
    initFontControls();
    loadFont(0);
    centerCanvas();
    updateGlider();
});

function centerCanvas() {
    state.pan.x = window.innerWidth / 2;
    state.pan.y = window.innerHeight / 2;
    updateCanvasTransform();
}

// --- 1. Canvas ---
function initCanvasControls() {
    canvasWrapper.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            const worldX = (mouseX - state.pan.x) / state.zoom;
            const worldY = (mouseY - state.pan.y) / state.zoom;

            const step = 0.05;
            const delta = e.deltaY > 0 ? -step : step;
            let newZoom = state.zoom + delta;
            newZoom = Math.round(newZoom * 100) / 100;
            newZoom = Math.min(Math.max(0.1, newZoom), 5);

            state.pan.x = mouseX - worldX * newZoom;
            state.pan.y = mouseY - worldY * newZoom;
            state.zoom = newZoom;
            updateCanvasTransform();
        }
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !state.isSpaceHeld) {
            state.isSpaceHeld = true;
            canvasWrapper.classList.add('space-held');
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            state.isSpaceHeld = false;
            canvasWrapper.classList.remove('space-held');
            state.isPanning = false;
            canvasWrapper.classList.remove('panning');
        }
    });

    canvasWrapper.addEventListener('mousedown', (e) => {
        if (state.isSpaceHeld) {
            state.isPanning = true;
            canvasWrapper.classList.add('panning');
            state.lastMousePos = { x: e.clientX, y: e.clientY };
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (state.isPanning) {
            e.preventDefault();
            const dx = e.clientX - state.lastMousePos.x;
            const dy = e.clientY - state.lastMousePos.y;
            state.pan.x += dx;
            state.pan.y += dy;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            updateCanvasTransform();
        }
    });

    window.addEventListener('mouseup', () => {
        state.isPanning = false;
        canvasWrapper.classList.remove('panning');
    });
}

function updateCanvasTransform() {
    canvasContent.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
    zoomLevelEl.textContent = `${Math.round(state.zoom * 100)}%`;
}

// --- 2. Hub & Theme ---
function initHubInteraction() {
    hubHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        controlHub.classList.toggle('collapsed');
        closeFontList();
    });
    controlHub.addEventListener('click', (e) => e.stopPropagation());

    document.querySelectorAll('.menu-item[data-action="tab"]').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const target = item.dataset.target;
            state.currentTab = target;
            
            document.body.classList.remove('view-mode-lab', 'view-mode-lib');
            document.body.classList.add(`view-mode-${target}`);
            
            previewCharEl.contentEditable = (target === 'lib') ? "true" : "false";
            loadFont(0);
        });
    });
}

function initThemeControls() {
    darkModeSwitch.addEventListener('click', () => {
        state.isDarkMode = !state.isDarkMode;
        document.body.classList.toggle('dark-mode', state.isDarkMode);
        darkModeSwitch.classList.toggle('active', state.isDarkMode);
    });

    gridSwitch.addEventListener('click', () => {
        state.isGridOn = !state.isGridOn;
        document.body.classList.toggle('grid-on', state.isGridOn);
        gridSwitch.classList.toggle('active', state.isGridOn);
    });

    inverseSwitch.addEventListener('click', () => {
        state.isTextInverse = !state.isTextInverse;
        previewCharEl.classList.toggle('inverse', state.isTextInverse);
        inverseSwitch.classList.toggle('active', state.isTextInverse);
    });

    scBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.bg;
            if (mode === 'image') {
                bgUploadInput.click();
            } else {
                scBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.bgMode = mode;
                updateGlider();
                updateBgClasses();
            }
        });
    });

    bgUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                customBgLayer.style.backgroundImage = `url(${evt.target.result})`;
                scBtns.forEach(b => b.classList.remove('active'));
                const imgBtn = document.querySelector('.sc-btn[data-bg="image"]');
                imgBtn.classList.add('active');
                state.bgMode = 'image';
                updateGlider();
                updateBgClasses();
            };
            reader.readAsDataURL(file);
        }
    });
}

function updateBgClasses() {
    document.body.classList.remove('bg-mode-plain', 'bg-mode-grid', 'bg-mode-fluid', 'bg-mode-image');
    document.body.classList.add(`bg-mode-${state.bgMode}`);
}

function updateGlider() {
    const activeBtn = document.querySelector('.sc-btn.active');
    if (activeBtn) {
        const containerRect = scContainer.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        const offsetX = btnRect.left - containerRect.left;
        scGlider.style.width = `${btnRect.width}px`;
        scGlider.style.transform = `translateX(${offsetX - 2}px)`;
    }
}

// --- 3. Fonts ---
function initFontControls() {
    fontTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.isFontListOpen) closeFontList();
        else {
            renderFontList();
            fontListPopup.classList.remove('hidden');
            fontTrigger.classList.add('active');
            state.isFontListOpen = true;
        }
    });
    fontListPopup.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => { if(state.isFontListOpen) closeFontList(); });
}

function closeFontList() {
    state.isFontListOpen = false;
    fontListPopup.classList.add('hidden');
    fontTrigger.classList.remove('active');
}

function triggerImmersion() {
    if (!controlHub.classList.contains('collapsed')) {
        controlHub.classList.add('collapsed');
    }
}

function getGroupIndexByFontIndex(flatIndex) {
    const groups = getGroupedData();
    let counter = 0;
    for (let i = 0; i < groups.length; i++) {
        if (flatIndex >= counter && flatIndex < counter + groups[i].items.length) {
            return i;
        }
        counter += groups[i].items.length;
    }
    return 0;
}

function loadFont(index) {
    stopAllAnimations();
    const flatData = getFlatData();
    if (!flatData[index]) return;

    state.currentFontIndex = index;
    const font = flatData[index];
    
    state.openGroupIndex = getGroupIndexByFontIndex(index);

    currentFontNameEl.textContent = font.name.split(' ')[0];
    previewCharEl.textContent = font.previewChar;
    
    previewCharEl.style.animation = 'none';
    previewCharEl.offsetHeight;
    previewCharEl.style.animation = 'fadeIn 0.6s cubic-bezier(0.25, 1, 0.5, 1)';

    generateAxes(font.axes);
}

function renderFontList() {
    const groups = getGroupedData();
    fontListPopup.innerHTML = '';
    let globalIndexCounter = 0;

    groups.forEach((group, gIndex) => {
        const section = document.createElement('div');
        section.className = `group-section ${gIndex === state.openGroupIndex ? 'expanded' : ''}`;
        
        const header = document.createElement('div');
        header.className = 'group-header';
        header.innerHTML = `<span>${group.group}</span><svg class="chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`;
        
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            state.openGroupIndex = (state.openGroupIndex === gIndex) ? -1 : gIndex;
            renderFontList();
        });

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'group-items';

        group.items.forEach((font, fIndex) => {
            const currentFlatIndex = globalIndexCounter + fIndex;
            const item = document.createElement('div');
            item.className = `font-option ${currentFlatIndex === state.currentFontIndex ? 'selected' : ''}`;
            item.innerHTML = `<span>${font.name}</span>`; // Removed preview char span
            
            item.addEventListener('click', () => {
                loadFont(currentFlatIndex);
                closeFontList();
            });
            itemsContainer.appendChild(item);
        });

        section.appendChild(header);
        section.appendChild(itemsContainer);
        fontListPopup.appendChild(section);

        globalIndexCounter += group.items.length;
    });
}

function generateAxes(axes) {
    dynamicAxesContainer.innerHTML = '';
    state.currentAxisValues = {};

    axes.forEach(axis => {
        state.currentAxisValues[axis.tag] = axis.default;
        const group = document.createElement('div');
        group.className = 'axis-group';
        
        const header = document.createElement('div');
        header.className = 'axis-header';
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = axis.name;

        const playBtn = document.createElement('button');
        playBtn.className = 'auto-play-btn';
        playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M8 5v14l11-7z"/></svg>`;
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = axis.min;
        slider.max = axis.max;
        slider.value = axis.default;
        slider.step = (axis.max - axis.min) > 100 ? 1 : 0.1;

        slider.addEventListener('input', (e) => {
            if (state.activeAnimations[axis.tag]) stopAnimation(axis.tag, playBtn);
            state.currentAxisValues[axis.tag] = e.target.value;
            applyVariations();
        });
        slider.addEventListener('mousedown', triggerImmersion);
        slider.addEventListener('touchstart', triggerImmersion);

        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.activeAnimations[axis.tag]) stopAnimation(axis.tag, playBtn);
            else {
                startAnimation(axis, slider, playBtn);
                triggerImmersion();
            }
        });

        header.appendChild(label);
        header.appendChild(playBtn);
        group.appendChild(header);
        group.appendChild(slider);
        dynamicAxesContainer.appendChild(group);
    });
    applyVariations();
}

function startAnimation(axis, slider, btn) {
    btn.classList.add('playing');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    let currentVal = parseFloat(slider.value);
    let direction = 1;
    const range = axis.max - axis.min;
    const step = range / 120;

    const animLoop = () => {
        currentVal += step * direction;
        if (currentVal >= axis.max) { currentVal = axis.max; direction = -1; } 
        else if (currentVal <= axis.min) { currentVal = axis.min; direction = 1; }
        slider.value = currentVal;
        state.currentAxisValues[axis.tag] = currentVal;
        applyVariations();
        state.activeAnimations[axis.tag].id = requestAnimationFrame(animLoop);
    };
    state.activeAnimations[axis.tag] = { id: requestAnimationFrame(animLoop) };
}

function stopAnimation(tag, btn) {
    if (state.activeAnimations[tag]) {
        cancelAnimationFrame(state.activeAnimations[tag].id);
        delete state.activeAnimations[tag];
        btn.classList.remove('playing');
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M8 5v14l11-7z"/></svg>`;
    }
}

function stopAllAnimations() {
    Object.keys(state.activeAnimations).forEach(tag => cancelAnimationFrame(state.activeAnimations[tag].id));
    state.activeAnimations = {};
}

function applyVariations() {
    const settings = Object.entries(state.currentAxisValues)
        .map(([tag, val]) => `"${tag}" ${val}`)
        .join(', ');
    previewCharEl.style.fontVariationSettings = settings;
    if (state.currentAxisValues['wght']) previewCharEl.style.fontWeight = state.currentAxisValues['wght'];
}