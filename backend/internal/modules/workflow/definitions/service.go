package definitions

import "context"

type Service struct{}

func (s Service) Publish(_ context.Context, _ string) error {
	return nil
}
