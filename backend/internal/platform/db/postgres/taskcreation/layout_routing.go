package taskcreation

import (
	"sort"
	"strconv"
	"strings"
)

const taskSidePortCount = 5

func findNodeByID(nodes []map[string]any, id string) map[string]any {
	if strings.TrimSpace(id) == "" {
		return nil
	}
	for _, node := range nodes {
		nodeID, _ := node["id"].(string)
		if nodeID == id {
			return node
		}
	}
	return nil
}

func countOutgoingEdges(edges []map[string]any, sourceID string) int {
	if strings.TrimSpace(sourceID) == "" {
		return 0
	}
	count := 0
	for _, edge := range edges {
		source, _ := edge["source"].(string)
		if source == sourceID {
			count++
		}
	}
	return count
}

func NormalizeInstanceRouting(graph *DesignerGraph, instanceID string) {
	if graph == nil || strings.TrimSpace(instanceID) == "" {
		return
	}

	instanceNodes := make([]map[string]any, 0)
	nodeByID := make(map[string]map[string]any)
	for _, node := range graph.Nodes {
		if nodeInstanceID(node) != instanceID {
			continue
		}
		nodeID, _ := node["id"].(string)
		if nodeID == "" {
			continue
		}
		instanceNodes = append(instanceNodes, node)
		nodeByID[nodeID] = node
	}
	if len(instanceNodes) == 0 {
		return
	}

	instanceEdgeIdx := make([]int, 0)
	for i, edge := range graph.Edges {
		sourceID, _ := edge["source"].(string)
		targetID, _ := edge["target"].(string)
		if sourceID == "" || targetID == "" {
			continue
		}
		if nodeByID[sourceID] != nil && nodeByID[targetID] != nil {
			instanceEdgeIdx = append(instanceEdgeIdx, i)
		}
	}
	if len(instanceEdgeIdx) == 0 {
		return
	}

	sort.Slice(instanceEdgeIdx, func(i, j int) bool {
		a := graph.Edges[instanceEdgeIdx[i]]
		b := graph.Edges[instanceEdgeIdx[j]]
		as, _ := a["source"].(string)
		at, _ := a["target"].(string)
		bs, _ := b["source"].(string)
		bt, _ := b["target"].(string)

		asx, asy := nodeCenter(nodeByID[as])
		atx, aty := nodeCenter(nodeByID[at])
		bsx, bsy := nodeCenter(nodeByID[bs])
		btx, bty := nodeCenter(nodeByID[bt])

		if asx != bsx {
			return asx < bsx
		}
		if asy != bsy {
			return asy < bsy
		}
		if atx != btx {
			return atx < btx
		}
		if aty != bty {
			return aty < bty
		}
		aid, _ := a["id"].(string)
		bid, _ := b["id"].(string)
		return aid < bid
	})

	committed := make([]map[string]any, 0, len(instanceEdgeIdx))
	for _, idx := range instanceEdgeIdx {
		edge := graph.Edges[idx]
		sourceID, _ := edge["source"].(string)
		targetID, _ := edge["target"].(string)
		sourceNode := nodeByID[sourceID]
		targetNode := nodeByID[targetID]
		if sourceNode == nil || targetNode == nil {
			continue
		}

		sourceOutgoing := countOutgoingEdges(committed, sourceID)
		outgoingByHandle := countOutgoingBySourceHandle(committed, sourceID)
		incomingByHandle := countIncomingByTargetHandle(committed, targetID)

		sourceHandle, targetHandle := chooseEdgeHandles(
			sourceNode,
			targetNode,
			sourceOutgoing,
			outgoingByHandle,
			incomingByHandle,
			committed,
			instanceNodes,
			sourceID,
			targetID,
		)

		if sourceHandle == "" {
			delete(edge, "sourceHandle")
		} else {
			edge["sourceHandle"] = sourceHandle
		}
		if targetHandle == "" {
			delete(edge, "targetHandle")
		} else {
			edge["targetHandle"] = targetHandle
		}
		committed = append(committed, edge)
	}
}

func countIncomingByTargetHandle(edges []map[string]any, targetID string) map[string]int {
	counts := map[string]int{}
	for _, edge := range edges {
		target, _ := edge["target"].(string)
		if target != targetID {
			continue
		}
		handle, _ := edge["targetHandle"].(string)
		if handle == "" {
			handle = "left"
		}
		counts[handle]++
	}
	return counts
}

func countOutgoingBySourceHandle(edges []map[string]any, sourceID string) map[string]int {
	counts := map[string]int{}
	for _, edge := range edges {
		source, _ := edge["source"].(string)
		if source != sourceID {
			continue
		}
		handle, _ := edge["sourceHandle"].(string)
		if handle == "" {
			handle = "right"
		}
		counts[handle]++
	}
	return counts
}

func chooseEdgeHandles(
	sourceNode, targetNode map[string]any,
	sourceOutgoing int,
	outgoingSourceHandles map[string]int,
	incomingTargetHandles map[string]int,
	edges []map[string]any,
	nodes []map[string]any,
	sourceID, targetID string,
) (string, string) {
	sourceType, _ := sourceNode["type"].(string)
	targetType, _ := targetNode["type"].(string)
	nodeByID := make(map[string]map[string]any, len(nodes))
	for _, node := range nodes {
		nodeID, _ := node["id"].(string)
		if nodeID != "" {
			nodeByID[nodeID] = node
		}
	}

	sourceX, sourceY := nodeCenter(sourceNode)
	targetX, targetY := nodeCenter(targetNode)
	dx := targetX - sourceX
	dy := targetY - sourceY

	preferredSource, preferredTarget := preferredHandlesByGeometry(dx, dy)
	allowedTarget := allowedTargetHandles(targetType)
	allowedSource := allowedSourceHandles(sourceType)

	candidateSources := expandSidesToHandles(
		sourceNode,
		sourceType,
		[]string{preferredSource, "right", "left", "top", "bottom"},
		point{x: targetX, y: targetY},
	)
	candidateTargets := expandSidesToHandles(
		targetNode,
		targetType,
		[]string{preferredTarget, "left", "right", "top", "bottom"},
		point{x: sourceX, y: sourceY},
	)

	if sourceType == "andGateway" {
		if sourceOutgoing%2 == 0 {
			candidateSources = expandSidesToHandles(sourceNode, sourceType, []string{"top"}, point{x: targetX, y: targetY})
			candidateTargets = expandSidesToHandles(targetNode, targetType, []string{"top", "left", "right", "bottom"}, point{x: sourceX, y: sourceY})
		} else {
			candidateSources = expandSidesToHandles(sourceNode, sourceType, []string{"bottom"}, point{x: targetX, y: targetY})
			candidateTargets = expandSidesToHandles(targetNode, targetType, []string{"bottom", "left", "right", "top"}, point{x: sourceX, y: sourceY})
		}
	}

	existingSegments := collectExistingSegments(edges, nodeByID)

	bestSource := clampHandle(preferredSource, allowedSource, "right")
	bestTarget := clampHandle(preferredTarget, allowedTarget, "left")
	bestCross := 1 << 30
	bestNodeHits := 1 << 30
	bestLen := 1 << 30
	bestPenalty := 1 << 30

	for _, sourceHandle := range candidateSources {
		if !containsHandle(allowedSource, sourceHandle) {
			continue
		}
		for _, targetHandle := range candidateTargets {
			if !containsHandle(allowedTarget, targetHandle) {
				continue
			}
			route := buildOrthogonalRoute(sourceNode, sourceHandle, targetNode, targetHandle, absInt(dx) >= absInt(dy))
			if len(route) == 0 {
				continue
			}
			crossings := countCrossings(route, existingSegments)
			nodeHits := countNodeHits(route, nodes, sourceID, targetID)
			length := routeLength(route)
			penalty := 0
			if sourceHandle != preferredSource {
				penalty += 20
			}
			if targetHandle != preferredTarget {
				penalty += 20
			}
			penalty += outgoingSourceHandles[sourceHandle] * 8
			penalty += incomingTargetHandles[targetHandle] * 4

			// Priority: 1) no crossing / no shared corridor, 2) avoid node overlaps, 3) shortest path.
			if crossings < bestCross ||
				(crossings == bestCross && nodeHits < bestNodeHits) ||
				(crossings == bestCross && nodeHits == bestNodeHits && length < bestLen) ||
				(crossings == bestCross && nodeHits == bestNodeHits && length == bestLen && penalty < bestPenalty) {
				bestCross = crossings
				bestNodeHits = nodeHits
				bestLen = length
				bestPenalty = penalty
				bestSource = sourceHandle
				bestTarget = targetHandle
			}
		}
	}

	// Hard rule: do not allow line-over-node overlap when a clean route exists.
	if bestCross == 0 && bestNodeHits == 0 {
		return bestSource, bestTarget
	}

	return bestSource, bestTarget
}

func nodeCenter(node map[string]any) (int, int) {
	if node == nil {
		return 0, 0
	}
	pos, _ := node["position"].(map[string]any)
	x, _ := numberAsInt(pos["x"])
	y, _ := numberAsInt(pos["y"])
	w, _ := numberAsInt(node["width"])
	h, _ := numberAsInt(node["height"])
	if w == 0 || h == 0 {
		style, _ := node["style"].(map[string]any)
		if w == 0 {
			w, _ = numberAsInt(style["width"])
		}
		if h == 0 {
			h, _ = numberAsInt(style["height"])
		}
	}
	return x + (w / 2), y + (h / 2)
}

func edgeExists(edges []map[string]any, sourceID, targetID string) bool {
	for _, edge := range edges {
		source, _ := edge["source"].(string)
		target, _ := edge["target"].(string)
		if source == sourceID && target == targetID {
			return true
		}
	}
	return false
}

func computeNodePlacement(instanceNodes []map[string]any, sourceNode map[string]any, sourceOutgoing int, nodeType string) (int, int, int, int) {
	width, height := nodeSize(nodeType)
	x := 220
	y := 180

	if sourceNode != nil {
		sourcePos, _ := sourceNode["position"].(map[string]any)
		sourceX, _ := numberAsInt(sourcePos["x"])
		sourceY, _ := numberAsInt(sourcePos["y"])
		sourceWidth, _ := numberAsInt(sourceNode["width"])
		if sourceWidth == 0 {
			if style, ok := sourceNode["style"].(map[string]any); ok {
				sourceWidth, _ = numberAsInt(style["width"])
			}
		}
		if sourceWidth == 0 {
			sourceWidth = 120
		}
		x = sourceX + sourceWidth + 140
		y = sourceY

		sourceType, _ := sourceNode["type"].(string)
		if sourceType == "andGateway" || sourceType == "xorGateway" {
			y = sourceY + branchOffset(sourceOutgoing)
		}
	}

	for overlapsPlacement(instanceNodes, x, y, width, height) {
		y += 140
	}

	return x, y, width, height
}

func nodeSize(nodeType string) (int, int) {
	switch nodeType {
	case "xorGateway", "andGateway":
		return 64, 64
	case "startEvent", "endEvent", "timerEvent", "messageEvent", "signalEvent":
		return 40, 40
	default:
		return 220, 110
	}
}

func branchOffset(index int) int {
	if index == 0 {
		return -170
	}
	if index == 1 {
		return 170
	}
	level := ((index - 2) / 2) + 2
	if index%2 == 0 {
		return -170 * level
	}
	return 170 * level
}

func overlapsPlacement(nodes []map[string]any, x, y, width, height int) bool {
	for _, node := range nodes {
		pos, _ := node["position"].(map[string]any)
		nodeX, _ := numberAsInt(pos["x"])
		nodeY, _ := numberAsInt(pos["y"])
		nodeW, _ := numberAsInt(node["width"])
		nodeH, _ := numberAsInt(node["height"])
		if nodeW == 0 || nodeH == 0 {
			style, _ := node["style"].(map[string]any)
			if nodeW == 0 {
				nodeW, _ = numberAsInt(style["width"])
			}
			if nodeH == 0 {
				nodeH, _ = numberAsInt(style["height"])
			}
		}
		if nodeW == 0 {
			nodeW = 80
		}
		if nodeH == 0 {
			nodeH = 80
		}

		if x+width+36 < nodeX || nodeX+nodeW+36 < x || y+height+28 < nodeY || nodeY+nodeH+28 < y {
			continue
		}
		return true
	}
	return false
}

func numberAsInt(value any) (int, bool) {
	switch typed := value.(type) {
	case int:
		return typed, true
	case int32:
		return int(typed), true
	case int64:
		return int(typed), true
	case float64:
		return int(typed), true
	case float32:
		return int(typed), true
	default:
		return 0, false
	}
}

func absInt(value int) int {
	if value < 0 {
		return -value
	}
	return value
}

func allowedTargetHandles(nodeType string) []string {
	switch nodeType {
	case "userTask":
		return allTaskHandleIDs()
	case "xorGateway", "andGateway":
		return []string{"left", "right", "top", "bottom"}
	default:
		return []string{"left"}
	}
}

func allowedSourceHandles(nodeType string) []string {
	switch nodeType {
	case "userTask":
		return allTaskHandleIDs()
	case "xorGateway", "andGateway":
		return []string{"right", "left", "top", "bottom"}
	default:
		return []string{"right"}
	}
}

func allTaskHandleIDs() []string {
	ids := make([]string, 0, 4*(taskSidePortCount+1))
	for _, side := range []string{"right", "left", "top", "bottom"} {
		ids = append(ids, side)
		for i := 1; i <= taskSidePortCount; i++ {
			ids = append(ids, side+"-"+strconv.Itoa(i))
		}
	}
	return ids
}

func clampHandle(handle string, allowed []string, fallback string) string {
	if containsHandle(allowed, handle) {
		return handle
	}
	if containsHandle(allowed, fallback) {
		return fallback
	}
	if len(allowed) == 0 {
		return ""
	}
	return allowed[0]
}

func containsHandle(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}

func dedupeStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		if strings.TrimSpace(value) == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func expandSidesToHandles(node map[string]any, nodeType string, sides []string, toward point) []string {
	if nodeType != "userTask" {
		return dedupeStrings(sides)
	}
	expanded := make([]string, 0, len(sides)*(taskSidePortCount+1))
	for _, side := range sides {
		expanded = append(expanded, taskHandlesForSide(node, side, toward)...)
	}
	return dedupeStrings(expanded)
}

func taskHandlesForSide(node map[string]any, side string, toward point) []string {
	side = handleBase(side)
	if side != "left" && side != "right" && side != "top" && side != "bottom" {
		return nil
	}
	if node == nil {
		return []string{side}
	}

	x, y, w, h := nodeRect(node)
	ordered := make([]int, 0, taskSidePortCount)
	type slotDistance struct {
		slot int
		dist int
	}
	slotDistances := make([]slotDistance, 0, taskSidePortCount)
	for i := 1; i <= taskSidePortCount; i++ {
		if side == "left" || side == "right" {
			slotY := y + (h*i)/(taskSidePortCount+1)
			slotDistances = append(slotDistances, slotDistance{slot: i, dist: absInt(slotY - toward.y)})
		} else {
			slotX := x + (w*i)/(taskSidePortCount+1)
			slotDistances = append(slotDistances, slotDistance{slot: i, dist: absInt(slotX - toward.x)})
		}
	}
	sort.Slice(slotDistances, func(i, j int) bool {
		if slotDistances[i].dist != slotDistances[j].dist {
			return slotDistances[i].dist < slotDistances[j].dist
		}
		return slotDistances[i].slot < slotDistances[j].slot
	})
	for _, item := range slotDistances {
		ordered = append(ordered, item.slot)
	}

	handles := make([]string, 0, taskSidePortCount+1)
	for _, slot := range ordered {
		handles = append(handles, side+"-"+strconv.Itoa(slot))
	}
	// Keep legacy center handle compatibility for old edges.
	handles = append(handles, side)
	return handles
}

func handleBase(handle string) string {
	handle = strings.TrimSpace(handle)
	if handle == "" {
		return ""
	}
	if idx := strings.Index(handle, "-"); idx > 0 {
		return handle[:idx]
	}
	return handle
}

func handleSlot(handle string) int {
	handle = strings.TrimSpace(handle)
	idx := strings.Index(handle, "-")
	if idx < 0 || idx >= len(handle)-1 {
		return 0
	}
	slot, err := strconv.Atoi(handle[idx+1:])
	if err != nil || slot < 1 {
		return 0
	}
	if slot > taskSidePortCount {
		return taskSidePortCount
	}
	return slot
}

func nodeRect(node map[string]any) (int, int, int, int) {
	pos, _ := node["position"].(map[string]any)
	x, _ := numberAsInt(pos["x"])
	y, _ := numberAsInt(pos["y"])
	w, _ := numberAsInt(node["width"])
	h, _ := numberAsInt(node["height"])
	if w == 0 || h == 0 {
		style, _ := node["style"].(map[string]any)
		if w == 0 {
			w, _ = numberAsInt(style["width"])
		}
		if h == 0 {
			h, _ = numberAsInt(style["height"])
		}
	}
	if w == 0 {
		w = 80
	}
	if h == 0 {
		h = 80
	}
	return x, y, w, h
}

type point struct {
	x int
	y int
}

type segment struct {
	a point
	b point
}

func preferredHandlesByGeometry(dx, dy int) (string, string) {
	preferredSource := "right"
	preferredTarget := "left"
	if absInt(dx) >= absInt(dy) {
		if dx < 0 {
			preferredSource = "left"
			preferredTarget = "right"
		}
	} else {
		if dy > 0 {
			preferredSource = "bottom"
			preferredTarget = "top"
		} else {
			preferredSource = "top"
			preferredTarget = "bottom"
		}
	}
	return preferredSource, preferredTarget
}

func collectExistingSegments(edges []map[string]any, nodeByID map[string]map[string]any) []segment {
	segments := make([]segment, 0, len(edges)*3)
	for _, edge := range edges {
		sourceID, _ := edge["source"].(string)
		targetID, _ := edge["target"].(string)
		if sourceID == "" || targetID == "" {
			continue
		}
		sourceNode := nodeByID[sourceID]
		targetNode := nodeByID[targetID]
		if sourceNode == nil || targetNode == nil {
			continue
		}
		sourceHandle, _ := edge["sourceHandle"].(string)
		targetHandle, _ := edge["targetHandle"].(string)
		if sourceHandle == "" {
			sourceHandle = "right"
		}
		if targetHandle == "" {
			targetHandle = "left"
		}
		sx, sy := nodeCenter(sourceNode)
		tx, ty := nodeCenter(targetNode)
		route := buildOrthogonalRoute(sourceNode, sourceHandle, targetNode, targetHandle, absInt(tx-sx) >= absInt(ty-sy))
		segments = append(segments, route...)
	}
	return segments
}

func buildOrthogonalRoute(sourceNode map[string]any, sourceHandle string, targetNode map[string]any, targetHandle string, preferHorizontal bool) []segment {
	start := handlePoint(sourceNode, sourceHandle)
	end := handlePoint(targetNode, targetHandle)
	if start == end {
		return nil
	}

	const offset = 42
	outStart := moveFromHandle(start, sourceHandle, offset)
	preEnd := moveFromHandle(end, targetHandle, offset)

	points := []point{start, outStart}
	if outStart.x == preEnd.x || outStart.y == preEnd.y {
		points = append(points, preEnd)
	} else if preferHorizontal {
		points = append(points, point{x: preEnd.x, y: outStart.y}, preEnd)
	} else {
		points = append(points, point{x: outStart.x, y: preEnd.y}, preEnd)
	}
	points = append(points, end)

	segments := make([]segment, 0, len(points)-1)
	for i := 0; i < len(points)-1; i++ {
		if points[i] == points[i+1] {
			continue
		}
		segments = append(segments, segment{a: points[i], b: points[i+1]})
	}
	return segments
}

func handlePoint(node map[string]any, handle string) point {
	x, y, w, h := nodeRect(node)
	side := handleBase(handle)
	slot := handleSlot(handle)

	midY := y + (h / 2)
	midX := x + (w / 2)
	if slot > 0 {
		switch side {
		case "left", "right":
			midY = y + (h*slot)/(taskSidePortCount+1)
		case "top", "bottom":
			midX = x + (w*slot)/(taskSidePortCount+1)
		}
	}

	switch side {
	case "left":
		return point{x: x, y: midY}
	case "right":
		return point{x: x + w, y: midY}
	case "top":
		return point{x: midX, y: y}
	case "bottom":
		return point{x: midX, y: y + h}
	default:
		return point{x: x + w, y: y + (h / 2)}
	}
}

func moveFromHandle(p point, handle string, distance int) point {
	switch handleBase(handle) {
	case "left":
		return point{x: p.x - distance, y: p.y}
	case "right":
		return point{x: p.x + distance, y: p.y}
	case "top":
		return point{x: p.x, y: p.y - distance}
	case "bottom":
		return point{x: p.x, y: p.y + distance}
	default:
		return point{x: p.x + distance, y: p.y}
	}
}

func routeLength(route []segment) int {
	total := 0
	for _, s := range route {
		total += absInt(s.a.x-s.b.x) + absInt(s.a.y-s.b.y)
	}
	return total
}

func countCrossings(candidate []segment, existing []segment) int {
	count := 0
	for _, a := range candidate {
		for _, b := range existing {
			if segmentsIntersect(a, b) {
				count++
			}
		}
	}
	return count
}

func countNodeHits(route []segment, nodes []map[string]any, sourceID, targetID string) int {
	hits := 0
	for _, node := range nodes {
		nodeID, _ := node["id"].(string)
		if nodeID == sourceID || nodeID == targetID {
			continue
		}
		if routeIntersectsNode(route, node) {
			hits++
		}
	}
	return hits
}

func routeIntersectsNode(route []segment, node map[string]any) bool {
	pos, _ := node["position"].(map[string]any)
	x, _ := numberAsInt(pos["x"])
	y, _ := numberAsInt(pos["y"])
	w, _ := numberAsInt(node["width"])
	h, _ := numberAsInt(node["height"])
	if w == 0 || h == 0 {
		style, _ := node["style"].(map[string]any)
		if w == 0 {
			w, _ = numberAsInt(style["width"])
		}
		if h == 0 {
			h, _ = numberAsInt(style["height"])
		}
	}
	if w == 0 || h == 0 {
		return false
	}
	// Keep a safe clearance so lines never visually overlap nodes.
	left := x - 18
	right := x + w + 18
	top := y - 18
	bottom := y + h + 18

	for _, s := range route {
		if segmentIntersectsRect(s, left, top, right, bottom) {
			return true
		}
	}
	return false
}

func segmentIntersectsRect(s segment, left, top, right, bottom int) bool {
	if s.a.x == s.b.x {
		x := s.a.x
		if x < left || x > right {
			return false
		}
		y1, y2 := order(s.a.y, s.b.y)
		return !(y2 < top || y1 > bottom)
	}
	if s.a.y == s.b.y {
		y := s.a.y
		if y < top || y > bottom {
			return false
		}
		x1, x2 := order(s.a.x, s.b.x)
		return !(x2 < left || x1 > right)
	}
	return false
}

func segmentsIntersect(a, b segment) bool {
	av := a.a.x == a.b.x
	bv := b.a.x == b.b.x

	if av && bv {
		if a.a.x != b.a.x {
			return false
		}
		ay1, ay2 := order(a.a.y, a.b.y)
		by1, by2 := order(b.a.y, b.b.y)
		return maxInt(ay1, by1) < minInt(ay2, by2)
	}
	if !av && !bv {
		if a.a.y != b.a.y {
			return false
		}
		ax1, ax2 := order(a.a.x, a.b.x)
		bx1, bx2 := order(b.a.x, b.b.x)
		return maxInt(ax1, bx1) < minInt(ax2, bx2)
	}

	var v, h segment
	if av {
		v, h = a, b
	} else {
		v, h = b, a
	}

	vy1, vy2 := order(v.a.y, v.b.y)
	hx1, hx2 := order(h.a.x, h.b.x)
	ix := v.a.x
	iy := h.a.y
	if ix < hx1 || ix > hx2 || iy < vy1 || iy > vy2 {
		return false
	}

	// touching at endpoints is allowed and not considered crossing
	if (ix == v.a.x && iy == v.a.y) || (ix == v.b.x && iy == v.b.y) || (ix == h.a.x && iy == h.a.y) || (ix == h.b.x && iy == h.b.y) {
		return false
	}
	return true
}

func order(a, b int) (int, int) {
	if a <= b {
		return a, b
	}
	return b, a
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
