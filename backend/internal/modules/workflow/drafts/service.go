package drafts

import "context"

type Service struct{}

func (s Service) List(_ context.Context) error {
	return nil
}
