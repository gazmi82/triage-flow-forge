package admin

import "context"

type Service struct{}

func (s Service) CreateUser(_ context.Context) error {
	return nil
}
