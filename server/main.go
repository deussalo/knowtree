package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// --- Structs ---

type GraphSummary struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	NodeCount      int    `json:"nodeCount"`
	CompletedCount int    `json:"completedCount"`
}

type Node struct {
	ID       int      `json:"id"`
	Title    string   `json:"title"`
	Content  string   `json:"content"`
	Status   string   `json:"status"`
	Parents  []int    `json:"parents"`
	Children []int    `json:"children"`
	Error    string   `json:"error,omitempty"`
}

type Edge struct {
	Source int `json:"source"`
	Target int `json:"target"`
}

type GraphData struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

type ActiveState struct {
	View      string `json:"view"`
	GraphID   string `json:"graphId,omitempty"`
	NodeID    string `json:"nodeId,omitempty"`
	UpdatedAt string `json:"updatedAt,omitempty"`
}

type Progress struct {
	NodeID        string       `json:"nodeId"`
	Status        string       `json:"status"`
	Subconcepts   []Subconcept `json:"subconcepts"`
	Attempts      int          `json:"attempts"`
	BestScore     *float64     `json:"bestScore"`
	ClassroomFile string       `json:"classroomFile"`
}

type Subconcept struct {
	Label    string `json:"label"`
	Complete bool   `json:"complete"`
}

type OpenDirectoryRequest struct {
	GraphID string `json:"graphId"`
	NodeID  string `json:"nodeId"`
}

// --- Globals ---

var projectRoot string

// --- Main ---

func main() {
	port := flag.Int("port", 3000, "HTTP server port")
	flag.Parse()

	projectRoot = findProjectRoot()

	mux := http.NewServeMux()
	mux.HandleFunc("/api/graphs", handleGraphs)
	mux.HandleFunc("/api/state", handleState)
	mux.HandleFunc("/api/open-directory", handleOpenDirectory)
	mux.HandleFunc("/api/graph/", handleGraphRoutes)
	mux.Handle("/", http.FileServer(http.Dir(filepath.Join(projectRoot, "webapp"))))

	handler := corsMiddleware(mux)

	addr := fmt.Sprintf(":%d", *port)
	log.Printf("Knowtree server starting on http://localhost:%d", *port)
	log.Printf("Project root: %s", projectRoot)
	log.Fatal(http.ListenAndServe(addr, handler))
}

// findProjectRoot determines the project root directory.
// If run via `go run` (executable in temp dir), use the current working directory.
func findProjectRoot() string {
	exe, err := os.Executable()
	if err == nil {
		exeDir := filepath.Dir(exe)
		// Check if running from a temp directory (go run)
		tmpDir := os.TempDir()
		if !strings.HasPrefix(exeDir, tmpDir) {
			// Check if server/main.go exists relative to parent
			parent := filepath.Dir(exeDir)
			if _, err := os.Stat(filepath.Join(parent, "server", "main.go")); err == nil {
				return parent
			}
		}
	}
	// Fall back to current working directory
	cwd, err := os.Getwd()
	if err != nil {
		log.Fatal("Cannot determine working directory:", err)
	}
	return cwd
}

// --- CORS Middleware ---

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// --- Helpers ---

func writeJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func contentDir() string {
	return filepath.Join(projectRoot, "content")
}

func stateDir() string {
	return filepath.Join(contentDir(), ".state")
}

func activeStatePath() string {
	return filepath.Join(stateDir(), "active-state.json")
}

// titleCase converts a directory name to a title.
// Hyphens and underscores become spaces, each word is title-cased.
func titleCase(s string) string {
	s = strings.ReplaceAll(s, "-", " ")
	s = strings.ReplaceAll(s, "_", " ")
	words := strings.Fields(s)
	for i, w := range words {
		if len(w) > 0 {
			runes := []rune(w)
			runes[0] = unicode.ToUpper(runes[0])
			words[i] = string(runes)
		}
	}
	return strings.Join(words, " ")
}

// --- Frontmatter Parsing ---

type Frontmatter struct {
	ID       int
	Parents  []int
	Children []int
	Error    string
}

func parseFrontmatter(content string) (Frontmatter, string) {
	fm := Frontmatter{}

	content = strings.TrimSpace(content)
	if !strings.HasPrefix(content, "---") {
		fm.Error = "missing frontmatter delimiters"
		return fm, content
	}

	// Find closing ---
	rest := content[3:]
	idx := strings.Index(rest, "\n---")
	if idx < 0 {
		fm.Error = "missing closing frontmatter delimiter"
		return fm, content
	}

	fmBlock := rest[:idx]
	body := rest[idx+4:] // skip \n---
	body = strings.TrimLeft(body, "\r\n")

	hasID := false
	for _, line := range strings.Split(fmBlock, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "ID:") {
			val := strings.TrimSpace(strings.TrimPrefix(line, "ID:"))
			id, err := strconv.Atoi(val)
			if err != nil {
				fm.Error = fmt.Sprintf("invalid ID: %s", val)
				return fm, body
			}
			fm.ID = id
			hasID = true
		} else if strings.HasPrefix(line, "parents:") {
			fm.Parents = parseIntList(strings.TrimPrefix(line, "parents:"))
		} else if strings.HasPrefix(line, "children:") {
			fm.Children = parseIntList(strings.TrimPrefix(line, "children:"))
		}
	}

	if !hasID {
		fm.Error = "missing ID field"
	}

	return fm, body
}

func parseIntList(s string) []int {
	s = strings.TrimSpace(s)
	s = strings.Trim(s, "[]")
	s = strings.TrimSpace(s)
	if s == "" {
		return []int{}
	}
	parts := strings.Split(s, ",")
	result := make([]int, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		n, err := strconv.Atoi(p)
		if err != nil {
			continue
		}
		result = append(result, n)
	}
	return result
}

// deriveTitleFromFilename strips [ID] prefix and .md suffix to get the title.
func deriveTitleFromFilename(filename string) string {
	name := strings.TrimSuffix(filename, ".md")
	// Strip [ID] prefix if present
	if strings.HasPrefix(name, "[") {
		idx := strings.Index(name, "]")
		if idx >= 0 {
			name = strings.TrimSpace(name[idx+1:])
		}
	}
	if name == "" {
		return titleCase(strings.TrimSuffix(filename, ".md"))
	}
	return name
}

// --- Read Active State ---

func readActiveState() ActiveState {
	data, err := os.ReadFile(activeStatePath())
	if err != nil {
		return ActiveState{View: "selector"}
	}
	var state ActiveState
	if err := json.Unmarshal(data, &state); err != nil {
		return ActiveState{View: "selector"}
	}
	return state
}

// --- Read Progress ---

func readProgress(graphID string, nodeID int) *Progress {
	path := filepath.Join(contentDir(), graphID, ".state", strconv.Itoa(nodeID), "progress.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var p Progress
	if err := json.Unmarshal(data, &p); err != nil {
		return nil
	}
	return &p
}

// --- Handlers ---

func handleGraphs(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	entries, err := os.ReadDir(contentDir())
	if err != nil {
		writeJSON(w, []GraphSummary{})
		return
	}

	var graphs []GraphSummary
	for _, entry := range entries {
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		graphID := entry.Name()
		graphDir := filepath.Join(contentDir(), graphID)

		// Count nodes and completed nodes
		files, err := os.ReadDir(graphDir)
		if err != nil {
			continue
		}

		nodeCount := 0
		completedCount := 0
		for _, f := range files {
			if f.IsDir() || !strings.HasSuffix(f.Name(), ".md") {
				continue
			}
			if f.Name() == "specialist_style.md" {
				continue
			}

			nodeCount++

			// Read file to get ID, then check progress
			content, err := os.ReadFile(filepath.Join(graphDir, f.Name()))
			if err != nil {
				continue
			}
			fm, _ := parseFrontmatter(string(content))
			if fm.Error != "" {
				continue
			}

			p := readProgress(graphID, fm.ID)
			if p != nil && p.Status == "completed" {
				completedCount++
			}
		}

		graphs = append(graphs, GraphSummary{
			ID:             graphID,
			Title:          titleCase(graphID),
			NodeCount:      nodeCount,
			CompletedCount: completedCount,
		})
	}

	if graphs == nil {
		graphs = []GraphSummary{}
	}

	sort.Slice(graphs, func(i, j int) bool {
		return graphs[i].Title < graphs[j].Title
	})

	writeJSON(w, graphs)
}

func handleState(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		state := readActiveState()
		writeJSON(w, state)

	case "POST":
		body, err := io.ReadAll(r.Body)
		if err != nil {
			writeError(w, http.StatusBadRequest, "cannot read body")
			return
		}

		var state ActiveState
		if err := json.Unmarshal(body, &state); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON")
			return
		}

		state.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

		data, err := json.MarshalIndent(state, "", "  ")
		if err != nil {
			writeError(w, http.StatusInternalServerError, "marshal error")
			return
		}

		// Ensure .state directory exists
		os.MkdirAll(stateDir(), 0755)

		// Atomic write via temp file + rename
		tmpFile := activeStatePath() + ".tmp"
		if err := os.WriteFile(tmpFile, data, 0644); err != nil {
			writeError(w, http.StatusInternalServerError, "write error")
			return
		}
		if err := os.Rename(tmpFile, activeStatePath()); err != nil {
			writeError(w, http.StatusInternalServerError, "rename error")
			return
		}

		writeJSON(w, state)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func handleGraphRoutes(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	// Parse path: /api/graph/:id[/suffix]
	path := strings.TrimPrefix(r.URL.Path, "/api/graph/")
	parts := strings.SplitN(path, "/", 2)
	if len(parts) == 0 || parts[0] == "" {
		writeError(w, http.StatusBadRequest, "missing graph ID")
		return
	}

	graphID := parts[0]
	suffix := ""
	if len(parts) > 1 {
		suffix = parts[1]
	}

	graphDir := filepath.Join(contentDir(), graphID)
	if _, err := os.Stat(graphDir); os.IsNotExist(err) {
		writeError(w, http.StatusNotFound, "graph not found")
		return
	}

	switch suffix {
	case "":
		handleFullGraph(w, graphID, graphDir)
	case "classroom":
		handleClassroom(w, graphID)
	case "plot":
		handlePlot(w, graphID)
	default:
		writeError(w, http.StatusNotFound, "unknown endpoint")
	}
}

func handleFullGraph(w http.ResponseWriter, graphID, graphDir string) {
	files, err := os.ReadDir(graphDir)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot read graph directory")
		return
	}

	// First pass: parse all nodes
	type parsedNode struct {
		fm       Frontmatter
		title    string
		content  string
		filename string
	}

	var parsed []parsedNode
	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".md") {
			continue
		}
		if f.Name() == "specialist_style.md" {
			continue
		}

		data, err := os.ReadFile(filepath.Join(graphDir, f.Name()))
		if err != nil {
			continue
		}

		fm, body := parseFrontmatter(string(data))
		title := deriveTitleFromFilename(f.Name())

		parsed = append(parsed, parsedNode{
			fm:       fm,
			title:    title,
			content:  body,
			filename: f.Name(),
		})
	}

	// Build completion map for status determination
	completionMap := make(map[int]string) // nodeID -> status from progress.json
	for _, p := range parsed {
		if p.fm.Error != "" {
			continue
		}
		prog := readProgress(graphID, p.fm.ID)
		if prog != nil {
			completionMap[p.fm.ID] = prog.Status
		}
	}

	// Second pass: build nodes with status
	nodes := make([]Node, 0, len(parsed))
	edges := make([]Edge, 0)

	for _, p := range parsed {
		node := Node{
			ID:       p.fm.ID,
			Title:    p.title,
			Content:  p.content,
			Parents:  p.fm.Parents,
			Children: p.fm.Children,
		}

		if p.fm.Error != "" {
			node.Status = "error"
			node.Error = p.fm.Error
		} else {
			node.Status = determineStatus(p.fm, completionMap)
		}

		if node.Parents == nil {
			node.Parents = []int{}
		}
		if node.Children == nil {
			node.Children = []int{}
		}

		nodes = append(nodes, node)

		// Build edges (child -> parent direction for dagre BT layout)
		for _, childID := range p.fm.Children {
			edges = append(edges, Edge{
				Source: p.fm.ID,
				Target: childID,
			})
		}
	}

	sort.Slice(nodes, func(i, j int) bool {
		return nodes[i].ID < nodes[j].ID
	})

	writeJSON(w, GraphData{
		ID:    graphID,
		Title: titleCase(graphID),
		Nodes: nodes,
		Edges: edges,
	})
}

func determineStatus(fm Frontmatter, completionMap map[int]string) string {
	// Check progress
	status, hasProgress := completionMap[fm.ID]
	if hasProgress {
		if status == "completed" {
			return "completed"
		}
		if status == "in_progress" {
			return "in_progress"
		}
	}

	// Root nodes (no parents) are always available
	if len(fm.Parents) == 0 {
		return "available"
	}

	// Check if all parents are completed
	allParentsCompleted := true
	for _, parentID := range fm.Parents {
		parentStatus, exists := completionMap[parentID]
		if !exists || parentStatus != "completed" {
			allParentsCompleted = false
			break
		}
	}

	if allParentsCompleted {
		return "available"
	}
	return "locked"
}

func handleClassroom(w http.ResponseWriter, graphID string) {
	state := readActiveState()
	nodeID := state.NodeID
	if nodeID == "" {
		writeJSON(w, map[string]string{"content": "", "nodeId": ""})
		return
	}

	classroomPath := filepath.Join(contentDir(), graphID, ".state", nodeID, "classroom.md")
	data, err := os.ReadFile(classroomPath)
	if err != nil {
		writeJSON(w, map[string]string{"content": "", "nodeId": nodeID})
		return
	}

	writeJSON(w, map[string]string{"content": string(data), "nodeId": nodeID})
}

func handlePlot(w http.ResponseWriter, graphID string) {
	state := readActiveState()
	nodeID := state.NodeID
	if nodeID == "" {
		writeJSON(w, map[string]interface{}{"hasPlot": false, "nodeId": ""})
		return
	}

	plotPath := filepath.Join(contentDir(), graphID, ".state", nodeID, "active-plot.json")
	data, err := os.ReadFile(plotPath)
	if err != nil {
		writeJSON(w, map[string]interface{}{"hasPlot": false, "nodeId": nodeID})
		return
	}

	var plotData interface{}
	if err := json.Unmarshal(data, &plotData); err != nil {
		writeJSON(w, map[string]interface{}{"hasPlot": false, "nodeId": nodeID})
		return
	}

	writeJSON(w, map[string]interface{}{
		"hasPlot": true,
		"nodeId":  nodeID,
		"plot":    plotData,
	})
}

func handleOpenDirectory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req OpenDirectoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	if req.GraphID == "" || req.NodeID == "" {
		writeError(w, http.StatusBadRequest, "graphId and nodeId required")
		return
	}

	dirPath := filepath.Join(contentDir(), req.GraphID, ".state", req.NodeID)

	// Check directory exists
	if _, err := os.Stat(dirPath); os.IsNotExist(err) {
		writeError(w, http.StatusNotFound, "directory not found")
		return
	}

	// Platform-specific open command
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "linux":
		cmd = exec.Command("xdg-open", dirPath)
	case "darwin":
		cmd = exec.Command("open", dirPath)
	case "windows":
		cmd = exec.Command("explorer", dirPath)
	default:
		writeError(w, http.StatusInternalServerError, "unsupported platform")
		return
	}

	if err := cmd.Start(); err != nil {
		log.Printf("Failed to open directory: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to open directory")
		return
	}

	writeJSON(w, map[string]string{"status": "ok"})
}
