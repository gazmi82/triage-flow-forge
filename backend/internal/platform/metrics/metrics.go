package metrics

import (
	"sync"
	"time"
)

type QueryStat struct {
	Count            uint64
	ErrorCount       uint64
	TotalLatency     time.Duration
	MaxLatency       time.Duration
	LockQueryCount   uint64
	LockTotalLatency time.Duration
	LockMaxLatency   time.Duration
}

type Registry struct {
	mu    sync.Mutex
	query map[string]QueryStat
}

func New() *Registry {
	return &Registry{
		query: make(map[string]QueryStat),
	}
}

func (r *Registry) ObserveQuery(operation string, latency time.Duration, lockAware bool, err error) {
	if r == nil || operation == "" {
		return
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	stat := r.query[operation]
	stat.Count++
	stat.TotalLatency += latency
	if latency > stat.MaxLatency {
		stat.MaxLatency = latency
	}
	if err != nil {
		stat.ErrorCount++
	}
	if lockAware {
		stat.LockQueryCount++
		stat.LockTotalLatency += latency
		if latency > stat.LockMaxLatency {
			stat.LockMaxLatency = latency
		}
	}
	r.query[operation] = stat
}

func (r *Registry) QuerySnapshot() map[string]QueryStat {
	if r == nil {
		return map[string]QueryStat{}
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	out := make(map[string]QueryStat, len(r.query))
	for key, value := range r.query {
		out[key] = value
	}
	return out
}
