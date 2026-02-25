package tracing

type Tracer struct{}

func New() *Tracer { return &Tracer{} }
