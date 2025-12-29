/* =================================================================
   项目配置区域 (CONFIG)
   此处集中了所有你需要经常更新的内容：字体列表、默认文本等
   ================================================================= */

// 默认显示的文字
const DEFAULT_PREVIEW_TEXT = "自在致黑";

// 初始字体列表
const initialFonts = [
    {
        name: "自在致黑",
        src: "123.ttf",
        badge: "免费", 
        downloadUrl: "https://www.zizao.top/fonts/zizaizhisans",
        axes: [
            { tag: 'wght', name: '字重 Weight', min: 100, max: 700, default: 300, step: 1 },
            { tag: 'wdth', name: '字宽 Width', min: 75,  max: 125,  default: 100, step: 0.1 }
        ]
    }
    // 你可以在这里添加更多字体对象...
];


/* =================================================================
   以下为核心逻辑代码 (LOGIC)
   通常情况下无需修改
   ================================================================= */

let state = {
    fonts: [...initialFonts],
    activeIndices: new Set([0]), 
    axesValues: {},
    globalText: DEFAULT_PREVIEW_TEXT,
    loadedFamilies: {},
    localUrls: [],
    animations: {}
};

const dom = {
    trigger: document.getElementById('fontTrigger'),
    triggerText: document.getElementById('fontTriggerText'),
    menu: document.getElementById('dropdownMenu'),
    controls: document.getElementById('controlsPanel'),
    canvas: document.getElementById('canvasArea'),
    fontCount: document.getElementById('fontCount'),
    fileInput: document.getElementById('localFontInput'),
    themeToggle: document.getElementById('themeToggle'),
    globalInput: document.getElementById('globalTextInput'),
    aboutBtn: document.getElementById('aboutBtn'),
    aboutModal: document.getElementById('aboutModal'),
    modalClose: document.getElementById('modalClose'),
    
    // --- 新增：移动端相关元素 ---
    mobileBtn: document.getElementById('mobileSettingsBtn'),
    sidebar: document.getElementById('sidebarPanel'),
    sidebarClose: document.getElementById('sidebarCloseBtn'),
    overlay: document.getElementById('mobileSidebarOverlay')
};

function init() {
    // 初始化文本框内容
    if(dom.globalInput) dom.globalInput.value = state.globalText;
    
    renderDropdown();
    updateUI();
    state.activeIndices.forEach(idx => loadFontAsync(idx));
    setupEvents();
}

function setupEvents() {
    // 字体下拉菜单逻辑
    dom.trigger.addEventListener('click', (e) => {
        const rect = dom.trigger.getBoundingClientRect();
        dom.menu.style.left = rect.left + 'px';
        dom.menu.style.top = (rect.bottom + 8) + 'px';
        dom.menu.style.width = rect.width + 'px';
        dom.menu.classList.toggle('active');
        e.stopPropagation();
    });

    // 全局点击关闭菜单和模态框
    document.addEventListener('click', (e) => {
        if(!dom.menu.contains(e.target) && !dom.trigger.contains(e.target)) {
            dom.menu.classList.remove('active');
        }
        if(e.target === dom.aboutModal) dom.aboutModal.classList.remove('active');
    });

    // 关于弹窗逻辑
    dom.aboutBtn.addEventListener('click', () => dom.aboutModal.classList.add('active'));
    dom.modalClose.addEventListener('click', () => dom.aboutModal.classList.remove('active'));

    // --- 新增：移动端侧边栏逻辑 ---
    if(dom.mobileBtn) {
        dom.mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar(true);
        });
    }
    if(dom.sidebarClose) {
        dom.sidebarClose.addEventListener('click', () => toggleSidebar(false));
    }
    if(dom.overlay) {
        dom.overlay.addEventListener('click', () => toggleSidebar(false));
    }

    // 文件上传和输入框逻辑
    dom.fileInput.addEventListener('change', handleFileUpload);
    dom.globalInput.addEventListener('input', (e) => {
        state.globalText = e.target.value;
        document.querySelectorAll('.demo-text').forEach(el => el.innerText = state.globalText);
    });
    dom.themeToggle.addEventListener('click', () => document.body.classList.toggle('dark-mode'));
}

// --- 新增：侧边栏切换函数 ---
function toggleSidebar(isActive) {
    if(isActive) {
        dom.sidebar.classList.add('active');
        dom.overlay.classList.add('active');
    } else {
        dom.sidebar.classList.remove('active');
        dom.overlay.classList.remove('active');
    }
}

function renderDropdown() {
    dom.menu.innerHTML = '';
    state.fonts.forEach((font, idx) => {
        const isSel = state.activeIndices.has(idx);
        const item = document.createElement('div');
        item.className = `dropdown-item ${isSel ? 'selected' : ''}`;
        item.innerHTML = `<div class="checkbox"></div><span>${font.name}</span>`;
        item.onclick = (e) => { e.stopPropagation(); toggleFont(idx); };
        dom.menu.appendChild(item);
    });
    const uploadItem = document.createElement('div');
    uploadItem.className = 'dropdown-item';
    uploadItem.innerHTML = '<span>+ 上传本地字体...</span>';
    uploadItem.onclick = (e) => { e.stopPropagation(); document.getElementById('localFontInput').click(); };
    dom.menu.appendChild(document.createElement('div')).style.cssText = "height:1px; background:var(--border-color); margin:5px 0;";
    dom.menu.appendChild(uploadItem);
}

function toggleFont(idx) {
    if (state.activeIndices.has(idx)) state.activeIndices.delete(idx);
    else state.activeIndices.add(idx);
    renderDropdown();
    updateUI(); 
    loadFontAsync(idx); 
}

async function loadFontAsync(idx) {
    if (!state.activeIndices.has(idx)) return; 
    if (state.loadedFamilies[idx]) return; 

    const font = state.fonts[idx];
    const familyName = `UserFont_${idx}_${Date.now()}`;
    
    try {
        const fontFace = new FontFace(familyName, `url(${font.src})`, { display: 'swap' });
        await fontFace.load();
        document.fonts.add(fontFace);
        state.loadedFamilies[idx] = familyName;
        updateUI();
    } catch(e) {
        console.warn(`Load failed: ${font.name}`);
        state.loadedFamilies[idx] = 'sans-serif';
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    const url = URL.createObjectURL(file);
    state.localUrls.push(url);
    const newFont = {
        name: file.name.replace(/\.[^/.]+$/, ""), 
        src: url, 
        badge: "本地预览", // 设置本地上传的字体默认显示的标签内容
        axes: [
            { tag: 'wght', name: '字重', min: 100, max: 700, default: 300, step: 1 }, 
            { tag: 'wdth', name: '字宽', min: 75, max: 120, default: 100, step: 1 }
        ]
    };
    state.fonts.push(newFont); 
    const newIdx = state.fonts.length - 1;
    state.activeIndices.add(newIdx);
    renderDropdown();
    loadFontAsync(newIdx);
    updateUI();
    e.target.value = '';
}

function updateUI() {
    const count = state.activeIndices.size;
    dom.fontCount.textContent = `已选 ${count} 款字体`;
    if(count === 0) dom.triggerText.textContent = "选择字体...";
    else if(count === 1) dom.triggerText.textContent = state.fonts[[...state.activeIndices][0]].name;
    else dom.triggerText.textContent = `${count} 款字体`;

    dom.canvas.innerHTML = '';
    if (count === 0) {
        dom.canvas.innerHTML = '<div class="empty-tip">请在左侧选择字体以开始</div>';
        dom.controls.innerHTML = '<div style="text-align:center; color:var(--text-sec); font-size:12px; padding:20px;">暂无参数</div>';
        return;
    }

    const activeAxesMap = new Map();
    state.fonts.forEach((font, idx) => {
        if (!state.activeIndices.has(idx)) return;
        
        const family = state.loadedFamilies[idx] || 'sans-serif';
        
        // 动态生成标签：检查 font.badge 是否有值
        const badgeHtml = font.badge ? `<span class="font-badge">${font.badge}</span>` : '';
        
        const dlBtn = font.downloadUrl ? `<a href="${font.downloadUrl}" target="_blank" class="btn-download"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>下载字体</a>` : '';

        const block = document.createElement('div');
        block.className = 'font-card';
        block.innerHTML = `
            <div class="font-meta-header">
                <div class="meta-left-group"><span class="font-name-tag">${font.name}</span>${badgeHtml}${dlBtn}</div>
                <svg class="font-remove-btn" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" onclick="toggleFont(${idx})"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
            <div class="demo-text" contenteditable="true" spellcheck="false" style="font-family: '${family}', sans-serif;">${state.globalText}</div>
        `;
        dom.canvas.appendChild(block);

        font.axes.forEach(axis => {
            if (!activeAxesMap.has(axis.tag)) activeAxesMap.set(axis.tag, axis);
            else {
                const ex = activeAxesMap.get(axis.tag);
                ex.min = Math.min(ex.min, axis.min); ex.max = Math.max(ex.max, axis.max);
            }
        });
    });

    generateControls(Array.from(activeAxesMap.values()));
    applyStyles();
}

function generateControls(axes) {
    dom.controls.innerHTML = '';
    const layoutBox = document.createElement('div');
    layoutBox.className = 'section-box';
    layoutBox.innerHTML = `<span class="section-title">布局滑块</span>`;
    dom.controls.appendChild(layoutBox);

    const sizeAxis = { tag: 'size', name: '字号 Size', min: 12, max: 200, default: 64, step: 1, isSystem: true, suffix: 'px' };
    const spaceAxis = { tag: 'spacing', name: '间距 Spacing', min: -0.2, max: 1, default: 0, step: 0.01, isSystem: true, suffix: 'em' };
    layoutBox.appendChild(createSliderElement(sizeAxis));
    layoutBox.appendChild(createSliderElement(spaceAxis));

    if (axes.length > 0) {
        const varBox = document.createElement('div');
        varBox.className = 'section-box';
        varBox.innerHTML = `<span class="section-title">可变滑块</span>`;
        dom.controls.appendChild(varBox);
        axes.forEach(axis => {
            if (state.axesValues[axis.tag] === undefined) state.axesValues[axis.tag] = axis.default;
            varBox.appendChild(createSliderElement(axis));
        });
    }
}

function createSliderElement(axis) {
    const val = axis.isSystem ? (state.axesValues[axis.tag] ?? axis.default) : state.axesValues[axis.tag];
    const div = document.createElement('div'); div.className = 'control-row';
    div.innerHTML = `
        <div class="control-header"><span>${axis.name}</span><span class="control-val">${Math.round(val*100)/100}${axis.suffix||''}</span></div>
        <div class="slider-group">
            <input type="range" min="${axis.min}" max="${axis.max}" step="${axis.step}" value="${val}">
            <button class="play-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
        </div>`;
    
    const input = div.querySelector('input'); 
    const display = div.querySelector('.control-val'); 
    const btn = div.querySelector('.play-btn');
    
    input.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value); 
        display.textContent = (Math.round(v*100)/100)+(axis.suffix||'');
        if (axis.isSystem) {
            state.axesValues[axis.tag] = v;
            if(axis.tag === 'size') document.documentElement.style.setProperty('--vf-size', v+'px');
            if(axis.tag === 'spacing') document.documentElement.style.setProperty('--vf-spacing', v+'em');
        } else { state.axesValues[axis.tag] = v; applyStyles(); }
    }, { passive: true });
    
    btn.addEventListener('click', () => toggleAnim(axis, btn, input, display));
    return div;
}

function applyStyles() {
    const settings = Object.keys(state.axesValues).filter(k=>k!=='size'&&k!=='spacing').map(k=>`'${k}' ${state.axesValues[k]}`).join(', ');
    document.querySelectorAll('.demo-text').forEach(el => el.style.fontVariationSettings = settings);
}

function toggleAnim(axis, btn, input, display) {
    if(state.animations[axis.tag]) { delete state.animations[axis.tag]; btn.classList.remove('active'); }
    else { state.animations[axis.tag] = { axis, input, display, dir: 1, val: parseFloat(input.value) }; btn.classList.add('active'); }
}

function loop() {
    const keys = Object.keys(state.animations);
    if(keys.length > 0) {
        keys.forEach(key => {
            const anim = state.animations[key];
            anim.val += anim.axis.step * anim.dir;
            if(anim.val >= anim.axis.max) { anim.val = anim.axis.max; anim.dir = -1; }
            if(anim.val <= anim.axis.min) { anim.val = anim.axis.min; anim.dir = 1; }
            anim.input.value = anim.val; anim.display.textContent = (Math.round(anim.val*100)/100)+(anim.axis.suffix||''); 
            if (anim.axis.isSystem) {
                if(key === 'size') document.documentElement.style.setProperty('--vf-size', anim.val + 'px');
                if(key === 'spacing') document.documentElement.style.setProperty('--vf-spacing', anim.val + 'em');
            } else { state.axesValues[key] = anim.val; applyStyles(); }
        });
    }
    requestAnimationFrame(loop);
}

// 启动循环和初始化
requestAnimationFrame(loop);
init();