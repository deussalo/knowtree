// app.js — Main orchestrator: routing, state management, view switching

(function () {
  'use strict';

  // --- DOM Elements ---
  const selectorView = document.getElementById('selector-view');
  const graphView = document.getElementById('graph-view');
  const classroomView = document.getElementById('classroom-view');
  const graphGrid = document.getElementById('graph-grid');
  const noGraphs = document.getElementById('no-graphs');
  const graphTitle = document.getElementById('graph-title');
  const graphProgress = document.getElementById('graph-progress');
  const graphBackBtn = document.getElementById('graph-back-btn');
  const graphContainer = document.getElementById('graph-container');
  const sidebar = document.getElementById('sidebar');
  const sidebarClose = document.getElementById('sidebar-close');
  const sidebarTitle = document.getElementById('sidebar-title');
  const sidebarStatus = document.getElementById('sidebar-status');
  const sidebarContent = document.getElementById('sidebar-content');
  const sidebarHint = document.getElementById('sidebar-hint');
  const sidebarAction = document.getElementById('sidebar-action');
  const classroomBackBtn = document.getElementById('classroom-back-btn');
  const classroomTitle = document.getElementById('classroom-title');
  const classroomContent = document.getElementById('classroom-content');
  const graphPanelTab = document.getElementById('graph-panel-tab');
  const classroomDivider = document.getElementById('classroom-divider');
  const graphPanelEl = document.getElementById('graph-panel');

  // --- State ---
  let currentView = 'selector';
  let currentGraphId = null;
  let currentNodeId = null;
  let currentGraphData = null;
  let classroomEvents = null;

  // --- Managers ---
  const polling = new PollingManager();
  const graphRenderer = new GraphRenderer(graphContainer, onNodeClick);
  const classroom = new Classroom(classroomContent);
  const graphPanel = new GraphPanel(graphPanelEl, graphPanelTab, classroomDivider, classroomContent);
  const graphDebug = new GraphDebugPanel(
    document.querySelector('.graph-main'),
    (params) => graphRenderer.setParams(params)
  );

  // Sidebar markdown renderer
  const sidebarMd = window.markdownit({ html: true, linkify: true, highlight: hljsHighlight });
  if (typeof markdownItKatex === 'function') {
    markdownItKatex(sidebarMd);
  }

  // --- API Helpers ---
  async function api(path, options) {
    const resp = await fetch(path, options);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }

  async function postState(state) {
    try {
      await api('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
    } catch (e) {
      // Silently fail
    }
  }

  async function openStateDirectory() {
    try {
      await api('/api/open-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graphId: currentGraphId,
          nodeId: currentNodeId
        })
      });
    } catch (e) {
      console.error('Failed to open directory:', e);
    }
  }

  // --- View Switching ---
  function showView(name) {
    selectorView.style.display = name === 'selector' ? '' : 'none';
    graphView.style.display = name === 'graph' ? '' : 'none';
    classroomView.style.display = name === 'classroom' ? '' : 'none';
    currentView = name;
    if (name !== 'classroom') {
      closeClassroomEvents();
    }
    if (name !== 'graph') graphDebug.hide();
  }

  // --- Router ---
  function route() {
    polling.stopAll();
    const hash = window.location.hash || '#/';

    // Match #/graph/:id/node/:nodeId
    let match = hash.match(/^#\/graph\/([^/]+)\/node\/(\d+)$/);
    if (match) {
      enterClassroom(match[1], match[2]);
      return;
    }

    // Match #/graph/:id
    match = hash.match(/^#\/graph\/([^/]+)$/);
    if (match) {
      enterGraph(match[1]);
      return;
    }

    // Default: selector
    enterSelector();
  }

  // --- Selector View ---
  function enterSelector() {
    showView('selector');
    currentGraphId = null;
    currentNodeId = null;
    postState({ view: 'selector' });
    loadGraphs();
    polling.start('graphs', loadGraphs, 5000);
  }

  async function loadGraphs() {
    try {
      const graphs = await api('/api/graphs');
      renderGraphGrid(graphs);
    } catch (e) {
      // Retry on next poll
    }
  }

  function renderGraphGrid(graphs) {
    if (graphs.length === 0) {
      graphGrid.style.display = 'none';
      noGraphs.style.display = '';
      return;
    }

    graphGrid.style.display = '';
    noGraphs.style.display = 'none';

    graphGrid.innerHTML = graphs.map(g => `
      <div class="graph-card" data-id="${g.id}">
        <div class="graph-card-title">${escapeHtml(g.title)}</div>
        <div class="graph-card-progress">${g.completedCount} / ${g.nodeCount} nodes completed</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${g.nodeCount > 0 ? (g.completedCount / g.nodeCount * 100) : 0}%"></div>
        </div>
      </div>
    `).join('');

    graphGrid.querySelectorAll('.graph-card').forEach(card => {
      card.addEventListener('click', () => {
        window.location.hash = `#/graph/${card.dataset.id}`;
      });
    });
  }

  // --- Graph View ---
  function enterGraph(graphId) {
    showView('graph');
    currentGraphId = graphId;
    currentNodeId = null;
    sidebar.style.display = 'none';
    postState({ view: 'graph', graphId });
    graphRenderer.setParams(graphDebug.getParams());
    loadGraph(graphId);
    polling.start('graph', () => pollGraph(graphId), 5000);
  }

  async function loadGraph(graphId) {
    try {
      const data = await api(`/api/graph/${graphId}`);
      currentGraphData = data;
      graphTitle.textContent = data.title;
      updateGraphProgress(data.nodes);
      graphRenderer.render(data);
    } catch (e) {
      // Retry on next poll
    }
  }

  async function pollGraph(graphId) {
    try {
      const data = await api(`/api/graph/${graphId}`);
      currentGraphData = data;
      updateGraphProgress(data.nodes);
      graphRenderer.updateStatuses(data.nodes);
    } catch (e) {
      // Retry on next poll
    }
  }

  function updateGraphProgress(nodes) {
    const total = nodes.length;
    const completed = nodes.filter(n => n.status === 'completed').length;
    graphProgress.textContent = `${completed} / ${total} completed`;
  }

  // --- Node Click (Sidebar) ---
  function onNodeClick(node) {
    if (!node) {
      sidebar.style.display = 'none';
      return;
    }

    sidebar.style.display = '';
    sidebarTitle.textContent = node.title;

    // Status badge
    sidebarStatus.textContent = node.status.replace('_', ' ');
    sidebarStatus.className = `sidebar-status ${node.status}`;

    // Content preview
    sidebarContent.innerHTML = sidebarMd.render(node.content || '');
    hljsPostProcess(sidebarContent);

    // Action button
    switch (node.status) {
      case 'locked':
        sidebarHint.textContent = 'Complete prerequisites first';
        sidebarAction.textContent = 'Enter Classroom';
        sidebarAction.disabled = true;
        sidebarAction.onclick = null;
        break;
      case 'available':
        sidebarHint.textContent = '';
        sidebarAction.textContent = 'Enter Classroom';
        sidebarAction.disabled = false;
        sidebarAction.onclick = () => {
          window.location.hash = `#/graph/${currentGraphId}/node/${node.id}`;
        };
        break;
      case 'in_progress':
        sidebarHint.textContent = '';
        sidebarAction.textContent = 'Continue Class';
        sidebarAction.disabled = false;
        sidebarAction.onclick = () => {
          window.location.hash = `#/graph/${currentGraphId}/node/${node.id}`;
        };
        break;
      case 'completed':
        sidebarHint.textContent = '';
        sidebarAction.textContent = 'Review';
        sidebarAction.disabled = false;
        sidebarAction.onclick = () => {
          window.location.hash = `#/graph/${currentGraphId}/node/${node.id}`;
        };
        break;
      case 'error':
        sidebarHint.textContent = node.error || 'Parse error in frontmatter';
        sidebarAction.textContent = 'Error';
        sidebarAction.disabled = true;
        sidebarAction.onclick = null;
        break;
    }
  }

  // --- Classroom View ---
  function enterClassroom(graphId, nodeId) {
    showView('classroom');
    currentGraphId = graphId;
    currentNodeId = nodeId;
    graphPanel.reset();

    // Set title from graph data if available
    if (currentGraphData && currentGraphData.nodes) {
      const node = currentGraphData.nodes.find(n => String(n.id) === String(nodeId));
      if (node) {
        classroomTitle.textContent = node.title;
      } else {
        classroomTitle.textContent = '';
      }
    } else {
      classroomTitle.textContent = '';
      // Load graph data to get title
      api(`/api/graph/${graphId}`).then(data => {
        currentGraphData = data;
        const node = data.nodes.find(n => String(n.id) === String(nodeId));
        if (node) classroomTitle.textContent = node.title;
      }).catch(() => {});
    }

    postState({ view: 'classroom', graphId, nodeId: String(nodeId) });

    // Initial load
    loadClassroom(graphId);
    loadPlot(graphId);
    openClassroomEvents(graphId, String(nodeId));
  }

  function closeClassroomEvents() {
    if (classroomEvents) {
      classroomEvents.close();
      classroomEvents = null;
    }
  }

  function openClassroomEvents(graphId, nodeId) {
    closeClassroomEvents();
    const url = `/api/events?graphId=${encodeURIComponent(graphId)}&nodeId=${encodeURIComponent(nodeId)}`;
    classroomEvents = new EventSource(url);

    classroomEvents.addEventListener('classroom_updated', () => {
      if (currentView !== 'classroom' || currentGraphId !== graphId || String(currentNodeId) !== String(nodeId)) return;
      loadClassroom(graphId);
    });

    classroomEvents.addEventListener('plot_updated', () => {
      if (currentView !== 'classroom' || currentGraphId !== graphId || String(currentNodeId) !== String(nodeId)) return;
      loadPlot(graphId);
    });

    // Classroom view does not need action on progress events right now.
  }

  async function loadClassroom(graphId) {
    try {
      const data = await api(`/api/graph/${graphId}/classroom`);
      classroom.render(data.content);
    } catch (e) {
      // Retry on next poll
    }
  }

  async function loadPlot(graphId) {
    try {
      const data = await api(`/api/graph/${graphId}/plot`);
      graphPanel.setPlotData(data);
    } catch (e) {
      // Retry on next poll
    }
  }

  // --- Navigation ---
  graphBackBtn.addEventListener('click', () => {
    window.location.hash = '#/';
  });

  classroomBackBtn.addEventListener('click', () => {
    if (currentGraphId) {
      window.location.hash = `#/graph/${currentGraphId}`;
    } else {
      window.location.hash = '#/';
    }
  });

  sidebarClose.addEventListener('click', () => {
    graphRenderer.deselectNode();
  });

  // --- Keyboard Shortcuts ---
  document.addEventListener('keydown', (e) => {
    // Don't capture when input/textarea is focused
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    if (e.key === 'Escape') {
      if (currentView === 'classroom') {
        classroomBackBtn.click();
      } else if (currentView === 'graph') {
        graphRenderer.deselectNode();
      }
      return;
    }

    if (currentView === 'graph') {
      if (e.key === '`') {
        graphDebug.toggle();
        return;
      }

      const arrowDirs = {
        ArrowUp:    [0, -1],
        ArrowDown:  [0,  1],
        ArrowLeft:  [-1, 0],
        ArrowRight: [ 1, 0],
      };
      const dir = arrowDirs[e.key];
      if (dir) {
        e.preventDefault();
        graphRenderer.navigate(dir[0], dir[1]);
      }
    }

    if (currentView === 'classroom' && e.key === 'g') {
      graphPanel.toggle();
    }

    // Ctrl+Alt+O (Cmd+Alt+O on Mac): Open node state directory
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'o') {
      if (currentView === 'classroom' && currentGraphId && currentNodeId) {
        e.preventDefault();
        openStateDirectory();
      }
    }
  });

  // --- Hash Router ---
  window.addEventListener('hashchange', route);

  // --- Utilities ---
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Init ---
  route();
})();
