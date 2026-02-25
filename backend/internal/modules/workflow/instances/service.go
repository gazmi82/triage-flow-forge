package instances

import "context"

type Service struct{}

func (s Service) Start(_ context.Context, _ string) error {
	return nil
}
