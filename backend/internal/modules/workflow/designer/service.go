package designer

import "context"

type Service struct{}

func (s Service) SaveDraft(_ context.Context, _ string) error {
	return nil
}
