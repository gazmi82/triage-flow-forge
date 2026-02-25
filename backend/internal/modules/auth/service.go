package auth

import "context"

type Service struct{}

func (s Service) Login(_ context.Context, _ string, _ string) error {
	return nil
}
