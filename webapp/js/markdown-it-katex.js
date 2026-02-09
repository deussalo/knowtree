// Custom markdown-it plugin for KaTeX rendering.
// Handles $...$ (inline) and $$...$$ (block) math expressions.

function markdownItKatex(md) {
  // Block rule: $$...$$
  md.block.ruler.before('fence', 'math_block', function (state, startLine, endLine, silent) {
    const startPos = state.bMarks[startLine] + state.tShift[startLine];
    const lineText = state.src.slice(startPos, state.eMarks[startLine]);

    if (!lineText.startsWith('$$')) return false;

    // If $$ is followed by content on the same line, check for closing $$ on same line
    const inlineContent = lineText.slice(2);
    if (inlineContent.includes('$$')) {
      if (silent) return true;
      const math = inlineContent.slice(0, inlineContent.indexOf('$$'));
      const token = state.push('math_block', 'div', 0);
      token.content = math.trim();
      token.map = [startLine, startLine + 1];
      state.line = startLine + 1;
      return true;
    }

    // Multi-line: find closing $$
    let nextLine = startLine + 1;
    let found = false;
    while (nextLine < endLine) {
      const nextPos = state.bMarks[nextLine] + state.tShift[nextLine];
      const nextText = state.src.slice(nextPos, state.eMarks[nextLine]);
      if (nextText.trim() === '$$') {
        found = true;
        break;
      }
      nextLine++;
    }

    if (!found) return false;
    if (silent) return true;

    // Collect content between $$ delimiters
    let content = '';
    for (let i = startLine + 1; i < nextLine; i++) {
      content += state.src.slice(state.bMarks[i], state.eMarks[i]) + '\n';
    }

    // Handle case where content starts on the $$ line
    if (lineText.length > 2) {
      content = lineText.slice(2) + '\n' + content;
    }

    const token = state.push('math_block', 'div', 0);
    token.content = content.trim();
    token.map = [startLine, nextLine + 1];
    state.line = nextLine + 1;
    return true;
  });

  // Inline rule: $...$
  md.inline.ruler.after('escape', 'math_inline', function (state, silent) {
    if (state.src[state.pos] !== '$') return false;
    // Don't match $$
    if (state.src[state.pos + 1] === '$') return false;

    const start = state.pos + 1;
    let end = start;
    while (end < state.posMax) {
      if (state.src[end] === '$' && state.src[end - 1] !== '\\') break;
      end++;
    }

    if (end >= state.posMax) return false;
    if (end === start) return false;

    if (silent) return true;

    const token = state.push('math_inline', '', 0);
    token.content = state.src.slice(start, end);
    state.pos = end + 1;
    return true;
  });

  // Renderers
  md.renderer.rules.math_block = function (tokens, idx) {
    const content = tokens[idx].content;
    try {
      const html = katex.renderToString(content, { displayMode: true, throwOnError: false });
      return '<div class="katex-block">' + html + '</div>';
    } catch (e) {
      return '<div class="katex-block"><span class="katex-error">' + escapeHtml(content) + '</span></div>';
    }
  };

  md.renderer.rules.math_inline = function (tokens, idx) {
    const content = tokens[idx].content;
    try {
      return katex.renderToString(content, { displayMode: false, throwOnError: false });
    } catch (e) {
      return '<span class="katex-error">' + escapeHtml(content) + '</span>';
    }
  };
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
