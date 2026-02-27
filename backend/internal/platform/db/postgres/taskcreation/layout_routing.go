package taskcreation

import "strings"

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

func countIncomingByTargetHandle(edges []map[string]any, targetID string) map[string]int {
	counts := map[string]int{
		"left":   0,
		"right":  0,
		"top":    0,
		"bottom": 0,
	}
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
	counts := map[string]int{
		"left":   0,
		"right":  0,
		"top":    0,
		"bottom": 0,
	}
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

	candidateSources := []string{preferredSource, "right", "left", "top", "bottom"}
	candidateTargets := []string{preferredTarget, "left", "right", "top", "bottom"}

	if sourceType == "andGateway" {
		if sourceOutgoing%2 == 0 {
			candidateSources = []string{"top"}
			candidateTargets = []string{"top", "left", "right", "bottom"}
		} else {
			candidateSources = []string{"bottom"}
			candidateTargets = []string{"bottom", "left", "right", "top"}
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
			variants := buildRouteVariants(sourceNode, sourceHandle, targetNode, targetHandle, absInt(dx) >= absInt(dy))
			for _, route := range variants {
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
	case "userTask", "xorGateway", "andGateway":
		return []string{"left", "right", "top", "bottom"}
	default:
		return []string{"left"}
	}
}

func allowedSourceHandles(nodeType string) []string {
	switch nodeType {
	case "userTask", "xorGateway", "andGateway":
		return []string{"right", "left", "top", "bottom"}
	default:
		return []string{"right"}
	}
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
		route := buildOrthogonalRoute(sourceNode, sourceHandle, targetNode, targetHandle, true)
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

func buildRouteVariants(sourceNode map[string]any, sourceHandle string, targetNode map[string]any, targetHandle string, preferHorizontal bool) [][]segment {
	variants := make([][]segment, 0, 10)
	// Base shortest route.
	variants = append(variants, buildOrthogonalRoute(sourceNode, sourceHandle, targetNode, targetHandle, preferHorizontal))

	// Conditional expansions in both directions (horizontal and vertical).
	if preferHorizontal {
		for _, delta := range []int{60, -60, 120, -120, 180, -180, 260, -260, 360, -360, 520, -520} {
			variants = append(variants, buildDetourRoute(sourceNode, sourceHandle, targetNode, targetHandle, true, delta))
		}
		for _, delta := range []int{80, -80, 160, -160, 240, -240, 320, -320, 480, -480} {
			variants = append(variants, buildDetourRoute(sourceNode, sourceHandle, targetNode, targetHandle, false, delta))
		}
	} else {
		for _, delta := range []int{60, -60, 120, -120, 180, -180, 260, -260, 360, -360, 520, -520} {
			variants = append(variants, buildDetourRoute(sourceNode, sourceHandle, targetNode, targetHandle, false, delta))
		}
		for _, delta := range []int{80, -80, 160, -160, 240, -240, 320, -320, 480, -480} {
			variants = append(variants, buildDetourRoute(sourceNode, sourceHandle, targetNode, targetHandle, true, delta))
		}
	}
	return variants
}

func buildDetourRoute(sourceNode map[string]any, sourceHandle string, targetNode map[string]any, targetHandle string, detourOnY bool, detour int) []segment {
	start := handlePoint(sourceNode, sourceHandle)
	end := handlePoint(targetNode, targetHandle)
	if start == end {
		return nil
	}

	const offset = 42
	outStart := moveFromHandle(start, sourceHandle, offset)
	preEnd := moveFromHandle(end, targetHandle, offset)

	points := []point{start, outStart}
	if detourOnY {
		dy := outStart.y + detour
		points = append(points, point{x: outStart.x, y: dy}, point{x: preEnd.x, y: dy}, point{x: preEnd.x, y: preEnd.y})
	} else {
		dx := outStart.x + detour
		points = append(points, point{x: dx, y: outStart.y}, point{x: dx, y: preEnd.y}, point{x: preEnd.x, y: preEnd.y})
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
	switch handle {
	case "left":
		return point{x: x, y: y + (h / 2)}
	case "right":
		return point{x: x + w, y: y + (h / 2)}
	case "top":
		return point{x: x + (w / 2), y: y}
	case "bottom":
		return point{x: x + (w / 2), y: y + h}
	default:
		return point{x: x + w, y: y + (h / 2)}
	}
}

func moveFromHandle(p point, handle string, distance int) point {
	switch handle {
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
