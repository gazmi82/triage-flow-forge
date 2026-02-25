package tasks

import "context"

type Service struct{}

func (s Service) Claim(_ context.Context, _ string) error {
	return nil
}
