// GraphDebugPanel — floating debug overlay for graph layout parameters

class GraphDebugPanel {
    static STORAGE_KEY = "knowtree-debug-params";

    static DEFAULTS = GraphRenderer.DEFAULTS;

    static TABS = [
        {
            id: "layout",
            label: "Layout",
            controls: [
                { key: "rankdir", label: "Direction", type: "dropdown", options: ["BT", "TB", "LR", "RL"] },
                { key: "nodesep", label: "Node Sep", type: "range", min: 10, max: 200, step: 5 },
                { key: "ranksep", label: "Rank Sep", type: "range", min: 20, max: 300, step: 5 },
                { key: "marginx", label: "Margin X", type: "range", min: 0, max: 100, step: 5 },
                { key: "marginy", label: "Margin Y", type: "range", min: 0, max: 100, step: 5 },
            ],
        },
        {
            id: "nodes",
            label: "Nodes",
            controls: [
                { key: "nodeHeight", label: "Height", type: "range", min: 24, max: 80, step: 2 },
                { key: "fontSize", label: "Font Size", type: "range", min: 10, max: 24, step: 1 },
            ],
        },
        {
            id: "edges",
            label: "Edges",
            controls: [
                {
                    key: "curveType", label: "Curve", type: "dropdown",
                    options: [
                        { value: "orthogonal", label: "Orthogonal" },
                        { value: "linear", label: "Linear" },
                        { value: "cardinal", label: "Cardinal" },
                        { value: "basis", label: "Basis" },
                        { value: "step", label: "Step" },
                        { value: "monotoneX", label: "MonotoneX" },
                        { value: "monotoneY", label: "MonotoneY" },
                    ],
                },
                { key: "edgeStrokeWidth", label: "Width", type: "range", min: 0.5, max: 5, step: 0.5 },
            ],
        },
    ];

    constructor(parentEl, onChange) {
        this._parentEl = parentEl;
        this._onChange = onChange;
        this._visible = false;
        this._activeTab = "layout";
        this._params = { ...GraphDebugPanel.DEFAULTS };
        this._debounceTimer = null;
        this._dragging = false;
        this._dragOffset = { x: 0, y: 0 };

        this._loadFromStorage();
        this._buildDOM();
    }

    toggle() {
        this._visible = !this._visible;
        this._el.style.display = this._visible ? "" : "none";
        if (this._visible) this._updateStats();
    }

    hide() {
        this._visible = false;
        if (this._el) this._el.style.display = "none";
    }

    isVisible() {
        return this._visible;
    }

    getParams() {
        return { ...this._params };
    }

    getRankdir() {
        return this._params.rankdir;
    }

    _loadFromStorage() {
        try {
            const stored = localStorage.getItem(GraphDebugPanel.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                this._params = { ...GraphDebugPanel.DEFAULTS, ...parsed };
            }
        } catch (e) {
            // ignore
        }
    }

    _saveToStorage() {
        try {
            localStorage.setItem(GraphDebugPanel.STORAGE_KEY, JSON.stringify(this._params));
        } catch (e) {
            // ignore
        }
    }

    _emitChange() {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this._saveToStorage();
            if (this._onChange) this._onChange(this.getParams());
            this._updateStats();
        }, 200);
    }

    _buildDOM() {
        const el = document.createElement("div");
        el.className = "debug-panel";
        el.style.display = "none";
        this._el = el;

        // Header (draggable)
        const header = document.createElement("div");
        header.className = "debug-panel-header";
        header.innerHTML = `<span class="debug-panel-title">Debug</span>`;
        const closeBtn = document.createElement("button");
        closeBtn.className = "debug-panel-close";
        closeBtn.textContent = "\u00d7";
        closeBtn.addEventListener("click", () => this.toggle());
        header.appendChild(closeBtn);
        el.appendChild(header);

        // Drag
        header.addEventListener("mousedown", (e) => {
            if (e.target === closeBtn) return;
            this._dragging = true;
            const rect = el.getBoundingClientRect();
            this._dragOffset.x = e.clientX - rect.left;
            this._dragOffset.y = e.clientY - rect.top;
            e.preventDefault();
        });
        document.addEventListener("mousemove", (e) => {
            if (!this._dragging) return;
            const parentRect = this._parentEl.getBoundingClientRect();
            el.style.left = (e.clientX - parentRect.left - this._dragOffset.x) + "px";
            el.style.top = (e.clientY - parentRect.top - this._dragOffset.y) + "px";
            el.style.bottom = "auto";
        });
        document.addEventListener("mouseup", () => {
            this._dragging = false;
        });

        // Tabs
        const tabBar = document.createElement("div");
        tabBar.className = "debug-panel-tabs";
        for (const tab of GraphDebugPanel.TABS) {
            const btn = document.createElement("button");
            btn.className = "debug-tab" + (tab.id === this._activeTab ? " active" : "");
            btn.textContent = tab.label;
            btn.dataset.tab = tab.id;
            btn.addEventListener("click", () => this._switchTab(tab.id));
            tabBar.appendChild(btn);
        }
        el.appendChild(tabBar);

        // Tab content
        this._tabContent = document.createElement("div");
        this._tabContent.className = "debug-panel-content";
        el.appendChild(this._tabContent);

        // Stats (shown in layout tab)
        this._statsEl = document.createElement("div");
        this._statsEl.className = "debug-panel-stats";

        // Reset button
        const resetBtn = document.createElement("button");
        resetBtn.className = "debug-panel-reset";
        resetBtn.textContent = "Reset to Defaults";
        resetBtn.addEventListener("click", () => this._resetDefaults());
        el.appendChild(resetBtn);

        this._parentEl.appendChild(el);
        this._renderTab();
    }

    _switchTab(tabId) {
        this._activeTab = tabId;
        this._el.querySelectorAll(".debug-tab").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.tab === tabId);
        });
        this._renderTab();
    }

    _renderTab() {
        const tab = GraphDebugPanel.TABS.find((t) => t.id === this._activeTab);
        if (!tab) return;

        this._tabContent.innerHTML = "";

        for (const ctrl of tab.controls) {
            const row = document.createElement("div");
            row.className = "debug-control";

            const label = document.createElement("label");
            label.className = "debug-label";
            label.textContent = ctrl.label;
            row.appendChild(label);

            if (ctrl.type === "dropdown") {
                const select = document.createElement("select");
                select.className = "debug-select";
                const options = ctrl.options;
                for (const opt of options) {
                    const optEl = document.createElement("option");
                    if (typeof opt === "object") {
                        optEl.value = opt.value;
                        optEl.textContent = opt.label;
                        optEl.selected = this._params[ctrl.key] === opt.value;
                    } else {
                        optEl.value = opt;
                        optEl.textContent = opt;
                        optEl.selected = this._params[ctrl.key] === opt;
                    }
                    select.appendChild(optEl);
                }
                select.addEventListener("change", () => {
                    this._params[ctrl.key] = select.value;
                    this._emitChange();
                });
                row.appendChild(select);
            } else if (ctrl.type === "range") {
                const inputWrap = document.createElement("div");
                inputWrap.className = "debug-range-wrap";

                const range = document.createElement("input");
                range.type = "range";
                range.className = "debug-range";
                range.min = ctrl.min;
                range.max = ctrl.max;
                range.step = ctrl.step;
                range.value = this._params[ctrl.key];

                const num = document.createElement("input");
                num.type = "number";
                num.className = "debug-number";
                num.min = ctrl.min;
                num.max = ctrl.max;
                num.step = ctrl.step;
                num.value = this._params[ctrl.key];

                range.addEventListener("input", () => {
                    const v = parseFloat(range.value);
                    num.value = v;
                    this._params[ctrl.key] = v;
                    this._emitChange();
                });

                num.addEventListener("change", () => {
                    let v = parseFloat(num.value);
                    v = Math.max(ctrl.min, Math.min(ctrl.max, v));
                    num.value = v;
                    range.value = v;
                    this._params[ctrl.key] = v;
                    this._emitChange();
                });

                inputWrap.appendChild(range);
                inputWrap.appendChild(num);
                row.appendChild(inputWrap);
            }

            this._tabContent.appendChild(row);
        }

        // Show stats in layout tab
        if (this._activeTab === "layout") {
            this._tabContent.appendChild(this._statsEl);
            this._updateStats();
        }
    }

    _updateStats() {
        if (typeof graphRenderer === "undefined") return;
        const stats = graphRenderer.getGraphStats && graphRenderer.getGraphStats();
        if (stats) {
            this._statsEl.textContent = `${stats.width} \u00d7 ${stats.height}  \u2022  ${stats.nodeCount} nodes  \u2022  ${stats.edgeCount} edges`;
        }
    }

    _resetDefaults() {
        this._params = { ...GraphDebugPanel.DEFAULTS };
        localStorage.removeItem(GraphDebugPanel.STORAGE_KEY);
        this._renderTab();
        // Emit immediately (no debounce for reset)
        clearTimeout(this._debounceTimer);
        if (this._onChange) this._onChange(this.getParams());
        this._updateStats();
    }
}
