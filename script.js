/* =================================================================
   STATE & CONFIG (OPTIMIZED)
   ================================================================= */
const state = {
    fonts: [
        {
        name: "自在致黑",
        src: "123.ttf", 
        badge: "免费", 
        downloadUrl: "https://www.zizao.top/fonts/zizaizhisans",
        axes: null 
        }
],
    activeIndices: new Set([0]),
    global: { size: 72, height: 1.1, spacing: 0 },
    fontSettings: {}, 
    loadedFamilies: {},
    animations: {}, 
    isLoopRunning: false,
    globalText: "自在致黑"
};

const $ = (id) => document.getElementById(id);
const dom = {
    globalControls: $('globalControlsPanel'),
    libraryList: $('libraryList'),
    canvas: $('canvasArea'),
    fileInput: $('localFontInput'),
    triggerUpload: $('triggerUpload'),
    themeToggle: $('themeToggle'),
    globalInput: $('globalTextInput'),
    aboutBtn: $('aboutBtn'),
    aboutModal: $('aboutModal'),
    modalClose: $('modalClose'),
    mobileBtn: $('mobileSettingsBtn'),
    sidebar: $('sidebarPanel'),
    sidebarClose: $('sidebarCloseBtn'),
    overlay: $('mobileSidebarOverlay'),
    notifyBtn: $('notifyBtn'),
    resetGlobalBtn: $('resetGlobalLayout')
};

const el = (tag, cls = '', html = '') => {
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(html) e.innerHTML = html;
    return e;
};

/* =================================================================
   INIT & EVENTS
   ================================================================= */
function init() {
    if(dom.globalInput) dom.globalInput.value = state.globalText;
    // 并发加载初始字体
    state.activeIndices.forEach(idx => loadFont(idx).then(() => {
        initSettings(idx);
        updateUI(); // 加载完再刷新一次UI以显示轴
    }));
    
    updateUI(); 
    setupEvents();
    if(dom.notifyBtn) setTimeout(() => dom.notifyBtn.classList.add('collapsed'), 3000);
}

function initSettings(idx) {
    if (!state.fontSettings[idx] && state.fonts[idx].axes) {
        state.fontSettings[idx] = {};
        state.fonts[idx].axes.forEach(a => state.fontSettings[idx][a.tag] = a.default);
    }
}

function setupEvents() {
    const toggleSidebar = (show) => {
        dom.sidebar.classList.toggle('active', show);
        dom.overlay.classList.toggle('active', show);
    };

    dom.aboutBtn.onclick = () => dom.aboutModal.classList.add('active');
    dom.modalClose.onclick = () => dom.aboutModal.classList.remove('active');
    dom.aboutModal.onclick = (e) => e.target === dom.aboutModal && dom.aboutModal.classList.remove('active');

    if(dom.mobileBtn) dom.mobileBtn.onclick = (e) => { e.stopPropagation(); toggleSidebar(true); };
    if(dom.sidebarClose) dom.sidebarClose.onclick = () => toggleSidebar(false);
    if(dom.overlay) dom.overlay.onclick = () => toggleSidebar(false);

    dom.triggerUpload.onclick = () => dom.fileInput.click();
    dom.fileInput.onchange = handleFileUpload;
    
    dom.globalInput.oninput = (e) => {
        state.globalText = e.target.value;
        document.querySelectorAll('.demo-text').forEach(el => el.innerText = state.globalText);
    };

    dom.themeToggle.onclick = () => document.body.classList.toggle('dark-mode');
    
    if(dom.resetGlobalBtn) dom.resetGlobalBtn.onclick = () => {
        state.global = { size: 72, height: 1.1, spacing: 0 };
        renderGlobalControls();
        updateSystemStyles();
    };
}

/* =================================================================
   FONT PARSING & LOADING
   ================================================================= */

// 通用：从 opentype 对象提取轴
function extractAxes(font) {
    if (font.tables.fvar?.axes) {
        return font.tables.fvar.axes.map(a => ({
            tag: a.tag,
            name: getAxisName(font, a),
            min: a.minValue, max: a.maxValue, default: a.defaultValue,
            step: (a.maxValue - a.minValue) > 50 ? 1 : 0.1
        }));
    }
    return [];
}

// 远程字体：下载并解析
async function fetchAndParseRemoteFont(fontObj) {
    try {
        const response = await fetch(fontObj.src);
        const buffer = await response.arrayBuffer();
        const font = opentype.parse(buffer);
        fontObj.axes = extractAxes(font);
    } catch (e) {
        console.warn("远程解析失败", e);
        fontObj.axes = []; // 避免重复尝试
    }
}

// 本地字体处理
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    try {
        const buffer = await file.arrayBuffer();
        const url = URL.createObjectURL(file);
        let axes = [];
        try {
            const font = opentype.parse(buffer);
            axes = extractAxes(font);
        } catch (err) { console.warn("Parse error", err); }

        state.fonts.push({
            name: file.name.replace(/\.[^/.]+$/, "").substring(0, 24),
            src: url, badge: "本地", axes
        }); 
        const newIdx = state.fonts.length - 1;
        state.activeIndices.add(newIdx);
        initSettings(newIdx);
        await loadFont(newIdx); 
        updateUI();
    } catch (err) { alert("字体加载失败"); console.error(err); } 
    finally { e.target.value = ''; }
}

function getAxisName(font, axis) {
    if (axis.nameID && font.names?.[axis.nameID]) {
        const nr = font.names[axis.nameID];
        return nr.zh || nr.en || Object.values(nr)[0];
    }
    const tags = { 'wght': '字重', 'wdth': '字宽', 'slnt': '倾斜', 'opsz': '视大', 'ital': '斜体' };
    return tags[axis.tag] || axis.tag;
}

// 统一字体加载：包含 CSS FontFace 加载和 Opentype 解析
async function loadFont(idx) {
    if (!state.activeIndices.has(idx)) return;
    const font = state.fonts[idx];
    
    // 如果没有轴数据，先进行解析 (适用于预设字体)
    if (!font.axes) {
        await fetchAndParseRemoteFont(font);
    }

    // 如果已经加载过 FontFace，只需更新 UI 绑定
    if (state.loadedFamilies[idx]) {
         const card = $(`font-card-${idx}`);
         if(card) {
             const demo = card.querySelector('.demo-text');
             if(demo) demo.style.fontFamily = `'${state.loadedFamilies[idx]}', sans-serif`;
         }
         return;
    }

    const fam = `VF_${idx}_${Date.now()}`;
    try {
        const ff = new FontFace(fam, `url(${font.src})`, { display: 'swap' });
        await ff.load();
        document.fonts.add(ff);
        state.loadedFamilies[idx] = fam;
        
        // 绑定到现有卡片（如果有）
        const card = $(`font-card-${idx}`);
        if(card) {
            const demo = card.querySelector('.demo-text');
            if(demo) demo.style.fontFamily = `'${fam}', sans-serif`;
        }
    } catch(e) {
        console.warn('Font load error', e);
        state.loadedFamilies[idx] = 'sans-serif';
    }
}

/* =================================================================
   UI RENDER
   ================================================================= */
async function toggleFont(idx) {
    if (state.activeIndices.has(idx)) {
        state.activeIndices.delete(idx);
    } else {
        state.activeIndices.add(idx);
        await loadFont(idx); // 确保加载并解析完成
        initSettings(idx);
    }
    updateUI(); 
}

function updateUI() {
    renderGlobalControls();
    renderLibraryList();
    dom.canvas.innerHTML = '';
    
    if (state.activeIndices.size === 0) {
        dom.canvas.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
                <h3>暂无激活字体</h3><p>请从左侧字体库中选择字体。</p>
            </div>`;
        return;
    }

    state.fonts.forEach((font, idx) => {
        if (state.activeIndices.has(idx)) renderFontCard(font, idx);
    });
    updateSystemStyles();
}

function renderGlobalControls() {
    dom.globalControls.innerHTML = '';
    const axes = [
        { tag: 'size', name: '字号', min: 12, max: 200, step: 1, suffix: 'px' },
        { tag: 'spacing', name: '字距', min: -0.1, max: 0.5, step: 0.01, suffix: 'em' },
        { tag: 'height', name: '行距', min: 0.8, max: 2.5, step: 0.05, suffix: '' }

    ];

    axes.forEach(axis => {
        const val = state.global[axis.tag];
        const row = el('div', 'control-row compact', `
            <div class="control-label"><span>${axis.name}</span><span class="val-display">${formatVal(val, axis.step, axis.suffix)}</span></div>
            <div class="slider-container"><input type="range" class="macos-slider" min="${axis.min}" max="${axis.max}" step="${axis.step}" value="${val}"></div>
        `);
        const input = row.querySelector('input');
        const display = row.querySelector('.val-display');
        input.oninput = (e) => {
            const v = parseFloat(e.target.value);
            state.global[axis.tag] = v;
            display.textContent = formatVal(v, axis.step, axis.suffix);
            updateSystemStyles();
        };
        dom.globalControls.appendChild(row);
    });
}

function renderLibraryList() {
    dom.libraryList.innerHTML = '';
    state.fonts.forEach((font, idx) => {
        const active = state.activeIndices.has(idx);
        const item = el('div', `library-item ${active ? 'active' : ''}`, `
            <div class="library-item-info"><span class="lib-name">${font.name}</span></div>
            <div class="toggle-switch ${active ? 'on' : ''}"><div class="toggle-handle"></div></div>
        `);
        item.onclick = () => toggleFont(idx);
        dom.libraryList.appendChild(item);
    });
}

function renderFontCard(font, idx) {
    const fam = state.loadedFamilies[idx] || 'sans-serif';
    const card = el('div', 'font-card glass-panel');
    card.id = `font-card-${idx}`;
    
    // Header
    const header = el('div', 'font-card-header');
    const idDiv = el('div', 'font-identity', `<span class="font-name">${font.name}</span>${font.badge ? `<span class="font-badge">${font.badge}</span>` : ''}`);
    const ctrls = el('div', 'card-controls-inline');
    
    // 如果 axes 还没加载完（可能正在 fetch），则显示加载状态
    if (!font.axes) {
        ctrls.innerHTML = `<span class="no-axes-msg">加载中...</span>`;
    } else if (font.axes.length > 0) {
        font.axes.forEach(axis => {
            // 安全检查：如果 settings 还没初始化
            const val = state.fontSettings[idx] ? state.fontSettings[idx][axis.tag] : axis.default;
            
            const wrap = el('div', 'inline-axis-control');
            wrap.title = `${axis.name}: ${val}`;
            
            const label = el('div', 'axis-tag'); label.textContent = axis.tag;
            const slider = el('input', 'macos-slider mini');
            Object.assign(slider, { type: 'range', min: axis.min, max: axis.max, step: axis.step, value: val });
            const display = el('div', 'axis-val'); display.textContent = Math.round(val);
            
            const btn = el('button', 'play-btn mini', `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>`);
            
            slider.oninput = (e) => {
                const v = parseFloat(e.target.value);
                state.fontSettings[idx][axis.tag] = v;
                display.textContent = Math.round(v);
                updateCardVF(idx, card.querySelector('.demo-text'));
            };
            btn.onclick = () => toggleAnim(idx, axis, btn, slider, display);
            
            wrap.append(label, slider, display, btn);
            ctrls.appendChild(wrap);
        });
    } else {
        ctrls.innerHTML = `<span class="no-axes-msg">静态字体</span>`;
    }

    const actions = el('div', 'card-actions', `
        ${font.downloadUrl ? `<a href="${font.downloadUrl}" target="_blank" class="card-action-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>` : ''}
        <button class="card-action-btn close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
    `);
    actions.querySelector('.close').onclick = () => toggleFont(idx);

    header.append(idDiv, ctrls, actions);

    // Text Body
    const wrapper = el('div', 'demo-text-wrapper');
    const text = el('div', 'demo-text');
    text.contentEditable = true; text.spellcheck = false;
    text.innerText = state.globalText;
    text.style.fontFamily = `'${fam}', sans-serif`;
    
    wrapper.appendChild(text);
    card.append(header, wrapper);
    dom.canvas.appendChild(card);
    updateCardVF(idx, text);
}

function updateCardVF(idx, el) {
    if (!el || !state.fontSettings[idx]) return;
    el.style.fontVariationSettings = Object.entries(state.fontSettings[idx])
        .map(([k, v]) => `'${k}' ${v}`).join(', ');
}

/* =================================================================
   ANIMATION & SYSTEM
   ================================================================= */
function updateSystemStyles() {
    const s = document.documentElement.style;
    s.setProperty('--vf-size', state.global.size + 'px');
    s.setProperty('--vf-height', state.global.height);
    s.setProperty('--vf-spacing', state.global.spacing + 'em');
}

function formatVal(v, step, suffix = '') {
    return (Number.isInteger(step) ? Math.round(v) : v.toFixed(2)) + suffix;
}

function toggleAnim(idx, axis, btn, input, display) {
    const k = `${idx}-${axis.tag}`;
    if(state.animations[k]) { 
        delete state.animations[k]; 
        btn.classList.remove('active');
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>`;
    } else { 
        state.animations[k] = { idx, axis, input, display, dir: 1, val: parseFloat(input.value) }; 
        btn.classList.add('active');
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    }
    const hasAnim = Object.keys(state.animations).length > 0;
    if (hasAnim && !state.isLoopRunning) { state.isLoopRunning = true; requestAnimationFrame(loop); }
    else if (!hasAnim) state.isLoopRunning = false;
}

function loop() {
    if (!state.isLoopRunning) return;
    let updated = false;
    Object.values(state.animations).forEach(a => {
        const speed = (a.axis.max - a.axis.min) / 240;
        a.val += speed * a.dir;
        if(a.val >= a.axis.max || a.val <= a.axis.min) { 
            a.val = Math.max(a.axis.min, Math.min(a.val, a.axis.max));
            a.dir *= -1; 
        }
        state.fontSettings[a.idx][a.axis.tag] = a.val;
        a.input.value = a.val; 
        a.display.textContent = Math.round(a.val);
        updateCardVF(a.idx, $(`font-card-${a.idx}`)?.querySelector('.demo-text'));
        updated = true;
    });
    if (updated) requestAnimationFrame(loop);
}

init();