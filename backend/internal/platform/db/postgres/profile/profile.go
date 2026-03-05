package profile

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
)

func FetchProfile(
	ctx context.Context,
	ensurePool func(context.Context) (*pgxpool.Pool, error),
	user contracts.AuthPayload,
) (contracts.ProfilePayload, error) {
	if strings.TrimSpace(user.ID) == "" && strings.TrimSpace(user.Email) == "" {
		return contracts.ProfilePayload{}, errors.New("authenticated user context is required")
	}

	pool, err := ensurePool(ctx)
	if err != nil {
		return contracts.ProfilePayload{}, err
	}

	currentUser, err := fetchCurrentUser(ctx, pool, user)
	if err != nil {
		return contracts.ProfilePayload{}, err
	}

	peerUsers, err := fetchPeerUsers(ctx, pool, user)
	if err != nil {
		return contracts.ProfilePayload{}, err
	}

	personalTasks, err := fetchPersonalTasks(ctx, pool, user)
	if err != nil {
		return contracts.ProfilePayload{}, err
	}

	personalAudit, err := fetchPersonalAudit(ctx, pool, user)
	if err != nil {
		return contracts.ProfilePayload{}, err
	}

	priorityDistribution, triageDistribution := buildDistributions(personalTasks)
	patientActivity := buildPatientActivity(personalTasks)
	eventBreakdown := buildEventBreakdown(personalAudit)
	activityByDay := buildActivityByDay(personalAudit)

	completedCount, claimedCount, pendingCount, overdueCount, completionRate, avgCycleMinutes, slaRiskCount :=
		buildTaskMetrics(personalTasks)

	activeInstanceCount, err := fetchActiveInstanceCount(ctx, pool, personalTasks)
	if err != nil {
		return contracts.ProfilePayload{}, err
	}

	var firstAudit *contracts.AuditEvent
	var lastAudit *contracts.AuditEvent
	if len(personalAudit) > 0 {
		last := personalAudit[0]
		first := personalAudit[len(personalAudit)-1]
		lastAudit = &last
		firstAudit = &first
	}

	openWorkload := claimedCount + pendingCount + overdueCount
	activityScore := int(math.Min(100, math.Round(
		(float64(completionRate)*0.7)+math.Max(0, float64(30-(overdueCount*4))),
	)))

	return contracts.ProfilePayload{
		User:                 user,
		CurrentUser:          currentUser,
		ProfileRole:          user.Role,
		PeerUsers:            peerUsers,
		PersonalTasks:        personalTasks,
		PersonalAudit:        personalAudit,
		PatientActivity:      patientActivity,
		EventBreakdown:       eventBreakdown,
		ActivityByDay:        activityByDay,
		PriorityDistribution: priorityDistribution,
		TriageDistribution:   triageDistribution,
		CompletedCount:       completedCount,
		ClaimedCount:         claimedCount,
		PendingCount:         pendingCount,
		OverdueCount:         overdueCount,
		OpenWorkload:         openWorkload,
		CompletionRate:       completionRate,
		AvgCycleMinutes:      avgCycleMinutes,
		SLARiskCount:         slaRiskCount,
		ActiveInstanceCount:  activeInstanceCount,
		ActivityScore:        activityScore,
		FirstAudit:           firstAudit,
		LastAudit:            lastAudit,
	}, nil
}

func fetchCurrentUser(ctx context.Context, pool *pgxpool.Pool, user contracts.AuthPayload) (*contracts.User, error) {
	var item contracts.User
	err := pool.QueryRow(ctx, `
SELECT id, name, email, primary_role_key, department, active
FROM users
WHERE id = $1 OR lower(email) = lower($2)
ORDER BY CASE WHEN id = $1 THEN 0 ELSE 1 END
LIMIT 1
`, user.ID, user.Email).Scan(
		&item.ID,
		&item.Name,
		&item.Email,
		&item.Role,
		&item.Department,
		&item.Active,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("profile user not found")
		}
		return nil, err
	}
	return &item, nil
}

func fetchPeerUsers(ctx context.Context, pool *pgxpool.Pool, user contracts.AuthPayload) ([]contracts.User, error) {
	rows, err := pool.Query(ctx, `
SELECT id, name, email, primary_role_key, department, active
FROM users
WHERE primary_role_key = $1 AND id <> $2
ORDER BY active DESC, name ASC
`, user.Role, user.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	peers := make([]contracts.User, 0)
	for rows.Next() {
		var item contracts.User
		if err := rows.Scan(&item.ID, &item.Name, &item.Email, &item.Role, &item.Department, &item.Active); err != nil {
			return nil, err
		}
		peers = append(peers, item)
	}
	return peers, rows.Err()
}

func fetchPersonalTasks(ctx context.Context, pool *pgxpool.Pool, user contracts.AuthPayload) ([]contracts.Task, error) {
	rows, err := pool.Query(ctx, `
SELECT
  t.id,
  COALESCE(t.node_id, ''),
  t.instance_id,
  t.definition_name,
  t.name,
  t.assignee_name,
  t.role_key,
  t.status,
  t.priority,
  t.created_at,
  t.due_at,
  t.sla_minutes,
  t.minutes_remaining,
  t.patient_name,
  t.patient_id,
  t.form_fields,
  t.form_values,
  t.updated_at,
  COALESCE(t.triage_category, ''),
  COALESCE(t.triage_color, '')
FROM tasks t
WHERE t.role_key = $1 OR lower(COALESCE(t.assignee_name, '')) = lower($2)
ORDER BY COALESCE(t.updated_at, t.created_at) DESC, t.created_at DESC
`, user.Role, user.Name)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]contracts.Task, 0)
	for rows.Next() {
		var item contracts.Task
		var assigneeName *string
		var createdAt, dueAt time.Time
		var updatedAt *time.Time
		var triageCategory, triageColor string
		if err := rows.Scan(
			&item.ID,
			&item.NodeID,
			&item.InstanceID,
			&item.DefinitionName,
			&item.Name,
			&assigneeName,
			&item.Role,
			&item.Status,
			&item.Priority,
			&createdAt,
			&dueAt,
			&item.SLAMinutes,
			&item.MinutesRemaining,
			&item.PatientName,
			&item.PatientID,
			&item.FormFields,
			&item.FormValues,
			&updatedAt,
			&triageCategory,
			&triageColor,
		); err != nil {
			return nil, err
		}

		if assigneeName == nil || *assigneeName == "" {
			item.Assignee = nil
		} else {
			item.Assignee = *assigneeName
		}
		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		item.DueAt = dueAt.UTC().Format(time.RFC3339)
		if updatedAt != nil {
			item.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		}
		if triageCategory != "" {
			item.TriageCategory = triageCategory
		}
		if triageColor != "" {
			item.TriageColor = triageColor
		}
		if item.FormFields == nil {
			item.FormFields = json.RawMessage("[]")
		}
		if item.FormValues == nil {
			item.FormValues = json.RawMessage("{}")
		}

		items = append(items, item)
	}
	return items, rows.Err()
}

func fetchPersonalAudit(ctx context.Context, pool *pgxpool.Pool, user contracts.AuthPayload) ([]contracts.AuditEvent, error) {
	rows, err := pool.Query(ctx, `
SELECT
  id,
  instance_id,
  event_time,
  actor,
  COALESCE(role_key, $2),
  event_type,
  node_id,
  node_name,
  payload
FROM audit_events
WHERE actor = $1 OR role_key = $2
ORDER BY event_time DESC
LIMIT 500
`, user.Name, user.Role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]contracts.AuditEvent, 0)
	for rows.Next() {
		var item contracts.AuditEvent
		var eventTime time.Time
		if err := rows.Scan(
			&item.ID,
			&item.InstanceID,
			&eventTime,
			&item.Actor,
			&item.Role,
			&item.EventType,
			&item.NodeID,
			&item.NodeName,
			&item.Payload,
		); err != nil {
			return nil, err
		}
		item.Timestamp = eventTime.UTC().Format(time.RFC3339)
		if item.Payload == nil {
			item.Payload = json.RawMessage("{}")
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func fetchActiveInstanceCount(ctx context.Context, pool *pgxpool.Pool, tasks []contracts.Task) (int, error) {
	instanceSet := make(map[string]struct{})
	for _, task := range tasks {
		if task.InstanceID == "" {
			continue
		}
		instanceSet[task.InstanceID] = struct{}{}
	}

	if len(instanceSet) == 0 {
		return 0, nil
	}

	instanceIDs := make([]string, 0, len(instanceSet))
	for instanceID := range instanceSet {
		instanceIDs = append(instanceIDs, instanceID)
	}

	var count int
	err := pool.QueryRow(ctx, `
SELECT COUNT(*)
FROM process_instances
WHERE status = 'active' AND id = ANY($1)
`, instanceIDs).Scan(&count)
	return count, err
}

func buildDistributions(tasks []contracts.Task) (contracts.ProfilePriorityDistribution, contracts.ProfileTriageDistribution) {
	priority := contracts.ProfilePriorityDistribution{}
	triage := contracts.ProfileTriageDistribution{}

	for _, task := range tasks {
		switch task.Priority {
		case "low":
			priority.Low++
		case "medium":
			priority.Medium++
		case "high":
			priority.High++
		case "critical":
			priority.Critical++
		}

		switch task.TriageColor {
		case "red":
			triage.Red++
		case "orange":
			triage.Orange++
		case "yellow":
			triage.Yellow++
		case "green":
			triage.Green++
		case "blue":
			triage.Blue++
		}
	}

	return priority, triage
}

func buildTaskMetrics(tasks []contracts.Task) (completed, claimed, pending, overdue, completionRate, avgCycleMinutes, slaRiskCount int) {
	now := time.Now().UTC()
	cycleSamples := make([]float64, 0)

	for _, task := range tasks {
		switch task.Status {
		case "completed":
			completed++
		case "claimed":
			claimed++
		case "pending":
			pending++
		}

		dueAt, dueValid := parseRFC3339(task.DueAt)
		if task.Status != "completed" && (task.Status == "overdue" || (dueValid && dueAt.Before(now))) {
			overdue++
		}

		if task.Status != "completed" || !dueValid {
			if task.Status != "completed" && dueValid {
				mins := int(math.Round(dueAt.Sub(now).Minutes()))
				if mins > 0 && mins <= 15 {
					slaRiskCount++
				}
			}
			continue
		}

		startedAt, startValid := parseRFC3339(task.CreatedAt)
		if !startValid {
			continue
		}

		endedAt := dueAt
		if task.UpdatedAt != "" {
			if updatedAt, ok := parseRFC3339(task.UpdatedAt); ok {
				endedAt = updatedAt
			}
		}
		if endedAt.Before(startedAt) {
			continue
		}
		cycleSamples = append(cycleSamples, endedAt.Sub(startedAt).Minutes())
	}

	if len(tasks) > 0 {
		completionRate = int(math.Round((float64(completed) / float64(len(tasks))) * 100))
	}
	if len(cycleSamples) > 0 {
		sum := 0.0
		for _, sample := range cycleSamples {
			sum += sample
		}
		avgCycleMinutes = int(math.Round(sum / float64(len(cycleSamples))))
	}
	return
}

func buildPatientActivity(tasks []contracts.Task) []contracts.ProfilePatientActivity {
	type patientState struct {
		item       contracts.ProfilePatientActivity
		latestTime time.Time
	}

	patients := make(map[string]patientState)
	for _, task := range tasks {
		key := strings.TrimSpace(task.PatientID)
		if key == "" {
			key = task.ID
		}

		latestTouch := task.UpdatedAt
		if latestTouch == "" {
			latestTouch = task.CreatedAt
		}
		touchAt, ok := parseRFC3339(latestTouch)
		if !ok {
			touchAt = time.Time{}
		}

		state, exists := patients[key]
		if !exists {
			patients[key] = patientState{
				item: contracts.ProfilePatientActivity{
					PatientID:    task.PatientID,
					PatientName:  task.PatientName,
					InstanceID:   task.InstanceID,
					LatestStatus: task.Status,
					Priority:     task.Priority,
					TriageColor:  task.TriageColor,
					LatestTouch:  latestTouch,
					TouchCount:   1,
				},
				latestTime: touchAt,
			}
			continue
		}

		state.item.TouchCount++
		if touchAt.After(state.latestTime) {
			state.item.LatestStatus = task.Status
			state.item.Priority = task.Priority
			state.item.TriageColor = task.TriageColor
			state.item.LatestTouch = latestTouch
			state.latestTime = touchAt
		}
		patients[key] = state
	}

	items := make([]contracts.ProfilePatientActivity, 0, len(patients))
	for _, state := range patients {
		items = append(items, state.item)
	}
	sort.Slice(items, func(i, j int) bool {
		left, _ := parseRFC3339(items[i].LatestTouch)
		right, _ := parseRFC3339(items[j].LatestTouch)
		return left.After(right)
	})
	if len(items) > 8 {
		items = items[:8]
	}
	return items
}

func buildEventBreakdown(audit []contracts.AuditEvent) []contracts.ProfileEventBreakdown {
	counts := map[string]int{
		"instance_started": 0,
		"task_created":     0,
		"task_claimed":     0,
		"task_completed":   0,
		"timer_fired":      0,
		"message_received": 0,
		"signal_received":  0,
		"gateway_passed":   0,
	}
	for _, event := range audit {
		counts[event.EventType]++
	}

	breakdown := make([]contracts.ProfileEventBreakdown, 0, len(counts))
	for eventType, count := range counts {
		if count == 0 {
			continue
		}
		breakdown = append(breakdown, contracts.ProfileEventBreakdown{
			EventType: eventType,
			Count:     count,
		})
	}
	sort.Slice(breakdown, func(i, j int) bool {
		if breakdown[i].Count == breakdown[j].Count {
			return breakdown[i].EventType < breakdown[j].EventType
		}
		return breakdown[i].Count > breakdown[j].Count
	})
	return breakdown
}

func buildActivityByDay(audit []contracts.AuditEvent) []contracts.ProfileActivityDay {
	now := time.Now().UTC()
	days := make([]contracts.ProfileActivityDay, 0, 7)
	index := make(map[string]int, 7)

	for offset := 6; offset >= 0; offset-- {
		date := now.AddDate(0, 0, -offset)
		key := date.Format("2006-01-02")
		position := len(days)
		index[key] = position
		days = append(days, contracts.ProfileActivityDay{
			Key:   key,
			Label: date.Format("Mon"),
			Count: 0,
		})
	}

	for _, event := range audit {
		parsed, ok := parseRFC3339(event.Timestamp)
		if !ok {
			continue
		}
		key := parsed.UTC().Format("2006-01-02")
		pos, found := index[key]
		if !found {
			continue
		}
		days[pos].Count++
	}

	return days
}

func parseRFC3339(value string) (time.Time, bool) {
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}, false
	}
	return parsed.UTC(), true
}
