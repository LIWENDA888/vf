/* =================================================================
   项目配置区域 (CONFIG)
   ================================================================= */

const DEFAULT_PREVIEW_TEXT = "自在致黑";
const initialFonts = [
    {
        name: "自在致黑",
        src: "123.ttf",
        badge: "免费", 
        downloadUrl: "https://www.zizao.top/fonts/zizaizhisans",
        axes: [
            { tag: 'wght', name: '字重 Weight', min: 100, max: 700, default: 300, step: 1 },
            // Step 设为 1，确保手动滑动时是整数
            { tag: 'wdth', name: '字宽 Width', min: 75,  max: 125,  default: 100, step: 1 }
        ]
    }
];

/* =================================================================
   核心逻辑 (CORE LOGIC)
   ================================================================= */

let state = {
    fonts: [...initialFonts],
    activeIndices: new Set([0]), 
    axesValues: {},      // 存储所有轴的当前值
    activeAxesTags: [],  // 当前激活的轴 Tag 列表（用于性能优化）
    globalText: DEFAULT_PREVIEW_TEXT,
    loadedFamilies: {},
    animations: {},
    isLoopRunning: false // 动画循环状态锁
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
    mobileBtn: document.getElementById('mobileSettingsBtn'),
    sidebar: document.getElementById('sidebarPanel'),
    sidebarClose: document.getElementById('sidebarCloseBtn'),
    overlay: document.getElementById('mobileSidebarOverlay'),
    // 新增：通知按钮 DOM
    notifyBtn: document.getElementById('notifyBtn')
};

function init() {
    if(dom.globalInput) dom.globalInput.value = state.globalText;
    
    // 初始化系统轴默认值
    state.axesValues['size'] = 64;
    state.axesValues['spacing'] = 0;
    
    renderDropdown();
    state.activeIndices.forEach(idx => loadFontAsync(idx)); // 预加载默认字体
    updateUI(); // 初始渲染
    setupEvents();

    // 新增：3.5秒后自动收起通知
    if(dom.notifyBtn) {
        setTimeout(() => {
            dom.notifyBtn.classList.add('collapsed');
        }, 3500);
    }
}

function setupEvents() {
    // 1. 下拉菜单交互
    dom.trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = dom.trigger.getBoundingClientRect();
        dom.menu.style.left = rect.left + 'px';
        dom.menu.style.top = (rect.bottom + 8) + 'px';
        dom.menu.style.width = rect.width + 'px';
        dom.menu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if(!dom.menu.contains(e.target) && !dom.trigger.contains(e.target)) {
            dom.menu.classList.remove('active');
        }
        if(e.target === dom.aboutModal) dom.aboutModal.classList.remove('active');
    });

    // 2. 弹窗与侧边栏
    dom.aboutBtn.addEventListener('click', () => dom.aboutModal.classList.add('active'));
    dom.modalClose.addEventListener('click', () => dom.aboutModal.classList.remove('active'));

    if(dom.mobileBtn) {
        dom.mobileBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar(true); });
    }
    const closeSidebar = () => toggleSidebar(false);
    if(dom.sidebarClose) dom.sidebarClose.addEventListener('click', closeSidebar);
    if(dom.overlay) dom.overlay.addEventListener('click', closeSidebar);

    // 3. 文件与输入
    dom.fileInput.addEventListener('change', handleFileUpload);
    
    // 文本输入防抖优化不是必须的，但如果文字极多可以考虑。这里保持实时。
    dom.globalInput.addEventListener('input', (e) => {
        state.globalText = e.target.value;
        // 使用 innerText 更新，比 innerHTML 更快更安全
        document.querySelectorAll('.demo-text').forEach(el => el.innerText = state.globalText);
    });

    dom.themeToggle.addEventListener('click', () => document.body.classList.toggle('dark-mode'));
}

function toggleSidebar(isActive) {
    dom.sidebar.classList.toggle('active', isActive);
    dom.overlay.classList.toggle('active', isActive);
}

// 渲染下拉菜单
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
    
    // 分割线与上传按钮
    const div = document.createElement('div');
    div.style.cssText = "height:1px; background:var(--border-color); margin:5px 0;";
    dom.menu.appendChild(div);

    const uploadItem = document.createElement('div');
    uploadItem.className = 'dropdown-item';
    uploadItem.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>上传本地字体`;
    uploadItem.onclick = (e) => { e.stopPropagation(); dom.fileInput.click(); };
    dom.menu.appendChild(uploadItem);
}

function toggleFont(idx) {
    if (state.activeIndices.has(idx)) {
        if(state.activeIndices.size > 1) state.activeIndices.delete(idx); // 至少保留一个
    } else {
        state.activeIndices.add(idx);
    }
    renderDropdown();
    updateUI(); 
    loadFontAsync(idx); 
}

async function loadFontAsync(idx) {
    if (!state.activeIndices.has(idx) || state.loadedFamilies[idx]) return;

    const font = state.fonts[idx];
    const familyName = `VF_${idx}_${Date.now()}`; // 简短的 Family Name
    
    try {
        const fontFace = new FontFace(familyName, `url(${font.src})`, { display: 'swap' });
        await fontFace.load();
        document.fonts.add(fontFace);
        state.loadedFamilies[idx] = familyName;
        // 只有当这个字体还在激活列表时才刷新UI
        if(state.activeIndices.has(idx)) updateUI();
    } catch(e) {
        console.warn(`Font load error: ${font.name}`, e);
        state.loadedFamilies[idx] = 'sans-serif'; // Fallback
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    const url = URL.createObjectURL(file);
    const newFont = {
        name: file.name.replace(/\.[^/.]+$/, "").substring(0, 20), // 截断过长文件名
        src: url, 
        badge: "本地字体", 
        // 默认给予标准轴，无法自动解析字体内部轴信息(需opentype.js支持，此处简化处理)
        axes: [
            { tag: 'wght', name: '字重 Weight', min: 100, max: 900, default: 400, step: 1 }, 
            { tag: 'wdth', name: '字宽 Width', min: 50, max: 150, default: 100, step: 1 }
        ]
    };
    
    state.fonts.push(newFont); 
    const newIdx = state.fonts.length - 1;
    state.activeIndices.clear(); // 单选新上传的字体
    state.activeIndices.add(newIdx);
    
    renderDropdown();
    loadFontAsync(newIdx);
    updateUI();
    e.target.value = ''; // 重置 input 以允许再次选择同名文件
}

// 核心：更新 UI 与 生成控件
function updateUI() {
    const count = state.activeIndices.size;
    dom.fontCount.textContent = `已选择 ${count} 款字体`;
    dom.triggerText.textContent = count === 0 ? "选择字体..." : (count === 1 ? state.fonts[[...state.activeIndices][0]].name : `${count} 款字体`);

    // 清空 Canvas 并重新生成
    dom.canvas.innerHTML = '';
    if (count === 0) {
        dom.canvas.innerHTML = '<div class="empty-tip">请在左侧选择字体以开始</div>';
        dom.controls.innerHTML = '<div style="text-align:center; color:var(--text-sec); font-size:12px; padding:20px;">无参数</div>';
        return;
    }

    // 收集当前所有激活字体的轴，取并集
    const activeAxesMap = new Map();
    state.fonts.forEach((font, idx) => {
        if (!state.activeIndices.has(idx)) return;
        
        const family = state.loadedFamilies[idx] || 'sans-serif';
        const badgeHtml = font.badge ? `<span class="font-badge">${font.badge}</span>` : '';
        const dlBtn = font.downloadUrl ? `<a href="${font.downloadUrl}" target="_blank" class="btn-download"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>下载</a>` : '';

        const block = document.createElement('div');
        block.className = 'font-card';
        // 使用 textContent 插入用户文本以防 XSS，虽然这里是本地应用但养成好习惯
        block.innerHTML = `
            <div class="font-meta-header">
                <div class="meta-left-group"><span class="font-name-tag">${font.name}</span>${badgeHtml}${dlBtn}</div>
                <svg class="font-remove-btn" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" onclick="toggleFont(${idx})"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
            <div class="demo-text" contenteditable="true" spellcheck="false" style="font-family: '${family}', sans-serif;"></div>
        `;
        block.querySelector('.demo-text').innerText = state.globalText;
        dom.canvas.appendChild(block);

        font.axes.forEach(axis => {
            if (!activeAxesMap.has(axis.tag)) activeAxesMap.set(axis.tag, { ...axis }); // Clone axis object
            else {
                // 如果多个字体有同名轴，取范围合集
                const ex = activeAxesMap.get(axis.tag);
                ex.min = Math.min(ex.min, axis.min); 
                ex.max = Math.max(ex.max, axis.max);
            }
        });
    });

    state.activeAxesTags = Array.from(activeAxesMap.keys());
    generateControls(Array.from(activeAxesMap.values()));
    
    // 初始化一次样式
    updateSystemStyles();
    updateVFStyles(); 
}

function generateControls(vfAxes) {
    dom.controls.innerHTML = '';

    // 1. 布局滑块组 (System Axes)
    const layoutAxes = [
        { tag: 'size', name: '字号 Size', min: 12, max: 200, default: 64, step: 1, isSystem: true, suffix: 'px' },
        { tag: 'spacing', name: '间距 Spacing', min: -0.1, max: 1, default: 0, step: 0.01, isSystem: true, suffix: 'em' }
    ];
    dom.controls.appendChild(buildSection('布局参数', layoutAxes));

    // 2. 可变滑块组 (VF Axes)
    if (vfAxes.length > 0) {
        dom.controls.appendChild(buildSection('可变轴参数', vfAxes));
    }
}

function buildSection(title, axes) {
    const box = document.createElement('div');
    box.className = 'section-box';
    
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `<span class="section-title">${title}</span>`;
    
    const resetBtn = document.createElement('button');
    resetBtn.className = 'reset-btn';
    resetBtn.title = '重置此组参数';
    resetBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
    
    const controlRefs = []; 
    resetBtn.onclick = () => resetAxes(axes, controlRefs);

    header.appendChild(resetBtn);
    box.appendChild(header);

    axes.forEach(axis => {
        // 确保 state 中有值
        if (state.axesValues[axis.tag] === undefined) {
            state.axesValues[axis.tag] = axis.default;
        }
        const refs = createSliderElement(axis);
        box.appendChild(refs.el);
        controlRefs.push(refs);
    });

    return box;
}

function createSliderElement(axis) {
    const val = state.axesValues[axis.tag];
    const div = document.createElement('div'); 
    div.className = 'control-row';
    div.innerHTML = `
        <div class="control-header"><span>${axis.name}</span><span class="control-val">${formatVal(val, axis)}</span></div>
        <div class="slider-group">
            <input type="range" min="${axis.min}" max="${axis.max}" step="${axis.step}" value="${val}">
            <button class="play-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
        </div>`;
    
    const input = div.querySelector('input'); 
    const display = div.querySelector('.control-val'); 
    const btn = div.querySelector('.play-btn');
    
    input.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value); 
        state.axesValues[axis.tag] = v;
        display.textContent = formatVal(v, axis);
        
        if (axis.isSystem) updateSystemStyles(axis.tag, v);
        else updateVFStyles();
    }, { passive: true });
    
    btn.addEventListener('click', () => toggleAnim(axis, btn, input, display));
    
    return { el: div, input, display, btn, axis };
}

// 辅助格式化显示
function formatVal(v, axis) {
    // 逻辑优化：如果 axis.step 是整数（如1），则直接显示整数，不显示小数
    if (Number.isInteger(axis.step)) {
        return Math.round(v) + (axis.suffix || '');
    }
    // 否则保留两位小数
    return (Math.round(v * 100) / 100) + (axis.suffix || '');
}

// 重置逻辑优化
function resetAxes(axes, controlRefs) {
    axes.forEach((axis, i) => {
        const ref = controlRefs[i];
        
        // 1. 停止该轴动画
        if (state.animations[axis.tag]) {
            delete state.animations[axis.tag];
            ref.btn.classList.remove('active');
            ref.btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
        }

        // 2. 恢复值
        const def = axis.default;
        state.axesValues[axis.tag] = def;
        ref.input.value = def;
        ref.display.textContent = formatVal(def, axis);
    });
    
    updateSystemStyles();
    updateVFStyles();
    checkLoopStatus(); // 检查是否需要停止循环
}

// 样式更新：系统轴
function updateSystemStyles() {
    // 直接更新 CSS 变量，性能最高
    document.documentElement.style.setProperty('--vf-size', state.axesValues['size'] + 'px');
    document.documentElement.style.setProperty('--vf-spacing', state.axesValues['spacing'] + 'em');
}

// 样式更新：可变轴 (性能关键点)
function updateVFStyles() {
    // 构造 variation-settings 字符串
    // 例如: " 'wght' 400, 'wdth' 100 "
    const settings = state.activeAxesTags
        .map(tag => `'${tag}' ${state.axesValues[tag]}`)
        .join(', ');
    
    // 只更新父容器的一个变量，避免重绘所有子元素
    dom.canvas.style.setProperty('--vf-axes', settings);
}

// 动画逻辑
function toggleAnim(axis, btn, input, display) {
    if(state.animations[axis.tag]) { 
        delete state.animations[axis.tag]; 
        btn.classList.remove('active');
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    } else { 
        state.animations[axis.tag] = { axis, input, display, dir: 1, val: parseFloat(input.value) }; 
        btn.classList.add('active');
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    }
    checkLoopStatus();
}

function checkLoopStatus() {
    const hasAnim = Object.keys(state.animations).length > 0;
    if (hasAnim && !state.isLoopRunning) {
        state.isLoopRunning = true;
        requestAnimationFrame(loop);
    } else if (!hasAnim) {
        state.isLoopRunning = false;
    }
}

function loop() {
    if (!state.isLoopRunning) return;

    let hasUpdates = false;
    const keys = Object.keys(state.animations);
    
    keys.forEach(key => {
        const anim = state.animations[key];
        
        // --- 核心修复：速度控制 ---
        // 原先逻辑是 Math.max(step * 2, range / 200)，当 step=1 时，速度变成了 2。
        // 现在改为纯粹基于总范围 (max - min) 计算速度。
        // 除以 240 意味着在 60fps 下，跑完整个条大约需要 4 秒，这是一个平滑且适中的速度。
        const speed = (anim.axis.max - anim.axis.min) / 240;
        
        anim.val += speed * anim.dir;
        
        // 边界反弹
        if(anim.val >= anim.axis.max) { anim.val = anim.axis.max; anim.dir = -1; }
        else if(anim.val <= anim.axis.min) { anim.val = anim.axis.min; anim.dir = 1; }
        
        // 更新 State 和 DOM 控件
        state.axesValues[key] = anim.val;
        anim.input.value = anim.val; 
        anim.display.textContent = formatVal(anim.val, anim.axis);
        
        hasUpdates = true;
    });

    if (hasUpdates) {
        updateSystemStyles(); // 总是尝试更新，内部开销很小
        updateVFStyles();
    }

    requestAnimationFrame(loop);
}

// 启动
init();