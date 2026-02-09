// Classroom — markdown-it + KaTeX + Mermaid rendering

class Classroom {
  constructor(contentEl) {
    this._el = contentEl;
    this._lastContent = '';
    this._mermaidId = 0;
    this._mermaidCache = {};

    // Initialize markdown-it with KaTeX plugin
    this._md = window.markdownit({
      html: true,
      linkify: true,
      typographer: false,
      highlight: hljsHighlight
    });
    markdownItKatex(this._md);

    // Initialize Mermaid
    if (window.mermaid) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#262626',
          primaryColor: '#2a4a6b',
          primaryTextColor: '#dadada',
          primaryBorderColor: '#4a9eff',
          secondaryColor: '#5a3a1a',
          secondaryTextColor: '#dadada',
          secondaryBorderColor: '#e8a034',
          tertiaryColor: '#1a4a2a',
          tertiaryTextColor: '#dadada',
          lineColor: '#888',
          textColor: '#dadada',
          mainBkg: '#2a4a6b',
          nodeBorder: '#4a9eff',
          clusterBkg: '#363636',
          titleColor: '#dadada',
          edgeLabelBackground: '#262626'
        }
      });
    }
  }

  render(content) {
    if (content === this._lastContent) return;
    this._lastContent = content;

    if (!content) {
      this._el.innerHTML = '<div class="waiting-message">Waiting for tutor to begin...</div>';
      return;
    }

    // Track scroll position
    const wasNearBottom = this._isNearBottom();

    // Render markdown
    let html = this._md.render(content);

    // Process Mermaid blocks
    html = this._processMermaid(html);

    this._el.innerHTML = html;
    hljsPostProcess(this._el);

    // Render Mermaid diagrams
    this._renderMermaidDiagrams();

    // Auto-scroll if user was near bottom
    if (wasNearBottom) {
      this._scrollToBottom();
    }
  }

  _isNearBottom() {
    const el = this._el;
    return (el.scrollHeight - el.scrollTop - el.clientHeight) < 50;
  }

  _scrollToBottom() {
    this._el.scrollTop = this._el.scrollHeight;
  }

  _djb2Hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  _processMermaid(html) {
    // Replace <pre><code class="language-mermaid">...</code></pre> with placeholders
    return html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      (match, code) => {
        const decoded = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
        const hash = this._djb2Hash(decoded);
        const id = `mermaid-${this._mermaidId++}`;
        return `<div class="mermaid-container" data-mermaid-id="${id}" data-mermaid-hash="${hash}" data-mermaid-src="${encodeURIComponent(decoded)}"></div>`;
      });
  }

  async _renderMermaidDiagrams() {
    if (!window.mermaid) return;

    const containers = this._el.querySelectorAll('.mermaid-container');
    for (const container of containers) {
      const id = container.getAttribute('data-mermaid-id');
      const hash = container.getAttribute('data-mermaid-hash');
      const src = decodeURIComponent(container.getAttribute('data-mermaid-src'));

      // Use cached SVG if content hasn't changed
      if (this._mermaidCache[hash]) {
        container.innerHTML = this._mermaidCache[hash];
        continue;
      }

      try {
        const { svg } = await mermaid.render(id, src);
        container.innerHTML = svg;
        this._mermaidCache[hash] = svg;
      } catch (e) {
        container.innerHTML = `<div class="mermaid-error">Mermaid error: ${e.message}<pre>${src}</pre></div>`;
      }
    }
  }
}
