// GraphPanel — Plotly.js visualization panel

class GraphPanel {
  constructor(panelEl, tabEl, dividerEl, classroomEl) {
    this._panel = panelEl;
    this._tab = tabEl;
    this._divider = dividerEl;
    this._classroom = classroomEl;
    this._plotContainer = panelEl.querySelector('.plot-container') || panelEl;
    this._isOpen = false;
    this._hasPlot = false;
    this._lastPlotHash = null;
    this._isDragging = false;

    this._setupTab();
    this._setupDivider();
  }

  _setupTab() {
    this._tab.addEventListener('click', () => {
      if (this._isOpen) {
        this.close();
      } else {
        this.open();
      }
    });
  }

  _setupDivider() {
    this._divider.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this._isDragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (e) => {
        if (!this._isDragging) return;
        const parent = this._classroom.parentElement;
        const rect = parent.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = (x / rect.width) * 100;
        const clamped = Math.max(30, Math.min(80, pct));

        this._classroom.style.flex = 'none';
        this._classroom.style.width = clamped + '%';
        this._panel.style.flex = '1';

        // Resize Plotly chart
        if (window.Plotly && this._plotContainer.querySelector('.js-plotly-plot')) {
          Plotly.Plots.resize(this._plotContainer);
        }
      };

      const onUp = () => {
        this._isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  open() {
    if (this._isOpen) return;
    this._isOpen = true;
    this._panel.style.display = 'block';
    this._divider.style.display = 'block';
    this._tab.classList.add('active');
    this._tab.classList.remove('pulse');

    // Set default split: 60% classroom / 40% panel
    this._classroom.style.flex = 'none';
    this._classroom.style.width = '60%';
    this._panel.style.flex = '1';

    // Resize plot if it exists
    requestAnimationFrame(() => {
      if (window.Plotly && this._plotContainer.querySelector('.js-plotly-plot')) {
        Plotly.Plots.resize(this._plotContainer);
      }
    });
  }

  close() {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._panel.style.display = 'none';
    this._divider.style.display = 'none';
    this._tab.classList.remove('active');

    // Restore full width to classroom
    this._classroom.style.flex = '1';
    this._classroom.style.width = '';
  }

  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  setPlotData(plotResponse) {
    if (!plotResponse.hasPlot) {
      if (this._hasPlot) {
        this._hasPlot = false;
        this._tab.style.display = 'none';
        this._lastPlotHash = null;
        if (this._isOpen) this.close();
      }
      return;
    }

    // Show tab
    this._hasPlot = true;
    this._tab.style.display = '';

    // Check if plot data changed
    const plotStr = JSON.stringify(plotResponse.plot);
    const hash = this._simpleHash(plotStr);
    if (hash === this._lastPlotHash) return;
    this._lastPlotHash = hash;

    // Pulse tab if panel is closed
    if (!this._isOpen) {
      this._tab.classList.add('pulse');
    }

    // Render the plot
    this._renderPlot(plotResponse.plot);
  }

  _renderPlot(plotData) {
    if (!window.Plotly) return;

    const config = { responsive: true, displayModeBar: true };

    Plotly.newPlot(this._plotContainer, plotData.data, plotData.layout, config)
      .then(() => {
        // Handle animation if present
        if (plotData.animation && plotData.animation.frames) {
          Plotly.addFrames(this._plotContainer, plotData.animation.frames).then(() => {
            Plotly.animate(this._plotContainer, null, {
              transition: plotData.animation.transition || { duration: 500 },
              frame: plotData.animation.frame || { duration: 500 },
              mode: 'afterall'
            });
          });
        }
      });
  }

  reset() {
    this._hasPlot = false;
    this._lastPlotHash = null;
    this._tab.style.display = 'none';
    this._tab.classList.remove('pulse', 'active');
    if (this._isOpen) this.close();
    if (window.Plotly && this._plotContainer.querySelector('.js-plotly-plot')) {
      Plotly.purge(this._plotContainer);
    }
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return hash;
  }
}
