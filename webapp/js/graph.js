// GraphRenderer — D3 + dagre graph visualization

class GraphRenderer {
    static DEFAULTS = {
        rankdir: "BT",
        nodesep: 60,
        ranksep: 80,
        marginx: 40,
        marginy: 40,
        nodeHeight: 40,
        fontSize: 15,
        curveType: "orthogonal",
        edgeStrokeWidth: 1.5,
    };

    constructor(container, onNodeClick) {
        this._container = container;
        this._onNodeClick = onNodeClick;
        this._selectedId = null;
        this._graphData = null;
        this._nodeMap = {};
        this._zoom = null;
        this._svg = null;
        this._g = null;
        this._renderParams = { ...GraphRenderer.DEFAULTS };
    }

    render(graphData) {
        this._graphData = graphData;
        this._container.innerHTML = "";
        this._buildNodeMap(graphData.nodes);

        const p = this._renderParams;

        // Create dagre graph
        const g = new dagre.graphlib.Graph();
        g.setGraph({
            rankdir: p.rankdir,
            nodesep: p.nodesep,
            ranksep: p.ranksep,
            marginx: p.marginx,
            marginy: p.marginy,
        });
        g.setDefaultEdgeLabel(() => ({}));

        for (const node of graphData.nodes) {
            const w = Math.max(140, node.title.length * 9 + 32);
            g.setNode(String(node.id), {
                label: node.title,
                width: w,
                height: p.nodeHeight,
                data: node,
            });
        }

        for (const edge of graphData.edges) {
            g.setEdge(String(edge.source), String(edge.target));
        }

        dagre.layout(g);

        // Create SVG
        const svg = d3.select(this._container).append("svg");
        this._svg = svg;

        const rootG = svg.append("g");
        this._g = rootG;

        // Zoom behavior
        this._zoom = d3
            .zoom()
            .scaleExtent([0.2, 3])
            .on("zoom", (event) => {
                rootG.attr("transform", event.transform);
            });

        svg.call(this._zoom);

        // Click background to deselect
        svg.on("click", (event) => {
            if (event.target === svg.node() || event.target.tagName === "svg") {
                this.deselectNode();
            }
        });

        // Double-click background to fit
        svg.on("dblclick.zoom", null);
        svg.on("dblclick", (event) => {
            if (event.target === svg.node() || event.target.tagName === "svg") {
                this.fitToView();
            }
        });

        // Draw edges
        const edgeG = rootG.append("g").attr("class", "edges");
        const curveType = p.curveType;

        g.edges().forEach((e) => {
            const sourceNode = g.node(e.v);
            const targetNode = g.node(e.w);
            if (!sourceNode || !targetNode) return;

            let pathD;
            if (curveType === "orthogonal") {
                // Manhattan routing
                const sx = sourceNode.x;
                const sy = sourceNode.y - sourceNode.height / 2;
                const tx = targetNode.x;
                const ty = targetNode.y + targetNode.height / 2;
                const midY = (sy + ty) / 2;
                const lineGen = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveLinear);
                pathD = lineGen([
                    { x: sx, y: sy },
                    { x: sx, y: midY },
                    { x: tx, y: midY },
                    { x: tx, y: ty },
                ]);
            } else {
                // Use dagre's computed edge points with D3 curve interpolation
                const edgeData = g.edge(e);
                const points = edgeData.points || [];
                const curveFn = this._getCurveFunction(curveType);
                const lineGen = d3.line().x(d => d.x).y(d => d.y).curve(curveFn);
                pathD = lineGen(points);
            }

            edgeG
                .append("path")
                .attr("class", "edge")
                .attr("data-source", e.v)
                .attr("data-target", e.w)
                .attr("d", pathD)
                .style("stroke-width", p.edgeStrokeWidth);
        });

        // Draw nodes
        const nodeG = rootG.append("g").attr("class", "nodes");
        g.nodes().forEach((id) => {
            const node = g.node(id);
            if (!node) return;
            const data = node.data;

            const group = nodeG
                .append("g")
                .attr("class", `node ${data.status}`)
                .attr("data-id", data.id)
                .attr(
                    "transform",
                    `translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`,
                );

            group
                .append("rect")
                .attr("width", node.width)
                .attr("height", node.height)
                .attr("rx", 4)
                .attr("ry", 4);

            group
                .append("text")
                .attr("x", node.width / 2)
                .attr("y", node.height / 2)
                .style("font-size", p.fontSize + "px")
                .text(data.title);

            // Hover
            group.on("mouseenter", () => {
                if (this._selectedId !== data.id) {
                    group.classed("hover", true);
                }
                this._highlightChildren(data.id, true);
            });

            group.on("mouseleave", () => {
                group.classed("hover", false);
                this._highlightChildren(data.id, false);
                // Restore selection highlights if a node is selected
                if (this._selectedId !== null) {
                    this._highlightChildren(this._selectedId, true);
                }
            });

            // Click
            group.on("click", (event) => {
                event.stopPropagation();
                this.selectNode(data.id);
            });
        });

        // Store layout positions
        this._layout = {};
        g.nodes().forEach((id) => {
            const node = g.node(id);
            if (node) {
                this._layout[id] = {
                    x: node.x,
                    y: node.y,
                    width: node.width,
                    height: node.height,
                };
            }
        });

        this._dagreGraph = g;

        // Initial fit
        requestAnimationFrame(() => this.fitToView());
    }

    updateStatuses(nodes) {
        if (!this._svg) return;
        this._buildNodeMap(nodes);

        for (const node of nodes) {
            const group = this._svg.select(`.node[data-id="${node.id}"]`);
            if (!group.empty()) {
                const wasHighlight = group.classed("highlight");
                const wasHover = group.classed("hover");
                group.attr(
                    "class",
                    `node ${node.status}${this._selectedId === node.id ? " selected" : ""}`,
                );
                if (wasHighlight) group.classed("highlight", true);
                if (wasHover) group.classed("hover", true);
            }
        }
        // Re-apply selection highlights (handles status changes on highlighted children)
        if (this._selectedId !== null) {
            this._highlightChildren(this._selectedId, true);
        }
    }

    selectNode(nodeId) {
        // Deselect previous and clear its highlights
        if (this._selectedId !== null) {
            this._highlightChildren(this._selectedId, false);
            this._svg
                .select(`.node[data-id="${this._selectedId}"]`)
                .classed("selected", false);
        }

        this._selectedId = nodeId;
        this._svg
            .select(`.node[data-id="${nodeId}"]`)
            .classed("selected", true);
        this._highlightChildren(nodeId, true);

        // Pan to center the node
        const layout = this._layout[String(nodeId)];
        if (layout) {
            const rect = this._container.getBoundingClientRect();
            const scale = d3.zoomTransform(this._svg.node()).k;
            const tx = rect.width / 2 - layout.x * scale - 180; // offset for sidebar
            const ty = rect.height / 2 - layout.y * scale;

            this._svg
                .transition()
                .duration(300)
                .call(
                    this._zoom.transform,
                    d3.zoomIdentity.translate(tx, ty).scale(scale),
                );
        }

        if (this._onNodeClick) {
            this._onNodeClick(this._nodeMap[nodeId]);
        }
    }

    deselectNode() {
        if (this._selectedId !== null) {
            this._highlightChildren(this._selectedId, false);
            this._svg
                .select(`.node[data-id="${this._selectedId}"]`)
                .classed("selected", false);
            this._selectedId = null;
        }
        if (this._onNodeClick) {
            this._onNodeClick(null);
        }
    }

    fitToView() {
        if (!this._svg || !this._g) return;

        const rect = this._container.getBoundingClientRect();
        const bounds = this._g.node().getBBox();
        if (bounds.width === 0 || bounds.height === 0) return;

        const padding = 40;
        const scale = Math.min(
            (rect.width - padding * 2) / bounds.width,
            (rect.height - padding * 2) / bounds.height,
            1.5, // don't zoom in too much
        );

        const tx = (rect.width - bounds.width * scale) / 2 - bounds.x * scale;
        const ty = (rect.height - bounds.height * scale) / 2 - bounds.y * scale;

        this._svg
            .transition()
            .duration(300)
            .call(
                this._zoom.transform,
                d3.zoomIdentity.translate(tx, ty).scale(scale),
            );
    }

    getSelectedId() {
        return this._selectedId;
    }

    // Spatial navigation — move to nearest node in screen direction
    navigate(dx, dy) {
        if (!this._layout) return;
        if (this._selectedId === null) {
            this._selectNearestToCenter();
            return;
        }

        const cur = this._layout[String(this._selectedId)];
        if (!cur) return;

        let bestId = null;
        let bestScore = Infinity;

        for (const id in this._layout) {
            if (id === String(this._selectedId)) continue;
            const pos = this._layout[id];
            const deltaX = pos.x - cur.x;
            const deltaY = pos.y - cur.y;
            const dot = dx * deltaX + dy * deltaY;
            if (dot <= 0) continue;
            const score = dot + Math.abs(dx * deltaY - dy * deltaX) * 2;
            if (score < bestScore) {
                bestScore = score;
                bestId = id;
            }
        }

        if (bestId !== null) {
            this.selectNode(Number(bestId));
        }
    }

    _selectNearestToCenter() {
        if (!this._layout || !this._svg) return;

        const rect = this._container.getBoundingClientRect();
        const transform = d3.zoomTransform(this._svg.node());
        // Invert viewport center to graph coordinates
        const cx = (rect.width / 2 - transform.x) / transform.k;
        const cy = (rect.height / 2 - transform.y) / transform.k;

        let bestId = null;
        let bestDist = Infinity;

        for (const id in this._layout) {
            const pos = this._layout[id];
            const dist = (pos.x - cx) ** 2 + (pos.y - cy) ** 2;
            if (dist < bestDist) {
                bestDist = dist;
                bestId = id;
            }
        }

        if (bestId !== null) {
            this.selectNode(Number(bestId));
        }
    }

    _buildNodeMap(nodes) {
        this._nodeMap = {};
        for (const n of nodes) {
            this._nodeMap[n.id] = n;
        }
    }

    setParams(params) {
        this._renderParams = { ...GraphRenderer.DEFAULTS, ...params };
        if (this._graphData) {
            const prevSelected = this._selectedId;
            this.render(this._graphData);
            // Silently restore selection without panning or callback
            if (prevSelected !== null && this._nodeMap[prevSelected]) {
                this._selectedId = prevSelected;
                this._svg
                    .select(`.node[data-id="${prevSelected}"]`)
                    .classed("selected", true);
                this._highlightChildren(prevSelected, true);
            }
        }
    }

    getGraphStats() {
        if (!this._dagreGraph) return null;
        const graph = this._dagreGraph.graph();
        return {
            width: Math.round(graph.width || 0),
            height: Math.round(graph.height || 0),
            nodeCount: this._dagreGraph.nodeCount(),
            edgeCount: this._dagreGraph.edgeCount(),
        };
    }

    _getCurveFunction(type) {
        switch (type) {
            case "linear": return d3.curveLinear;
            case "cardinal": return d3.curveCardinal;
            case "basis": return d3.curveBasis;
            case "step": return d3.curveStep;
            case "monotoneX": return d3.curveMonotoneX;
            case "monotoneY": return d3.curveMonotoneY;
            default: return d3.curveLinear;
        }
    }

    _highlightChildren(nodeId, on) {
        if (!this._svg) return;
        const id = String(nodeId);

        // Highlight outgoing edges + dim all others
        this._svg.selectAll("path.edge").each(function () {
            const path = d3.select(this);
            if (path.attr("data-source") === id) {
                path.classed("highlight", on);
                if (on) path.raise();
            } else {
                path.classed("dimmed", on);
            }
        });

        // Highlight children nodes
        const node = this._nodeMap[nodeId];
        if (node && node.children) {
            for (const childId of node.children) {
                this._svg
                    .select(`.node[data-id="${childId}"]`)
                    .classed("highlight", on);
            }
        }
    }
}
