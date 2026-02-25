package audit

import "context"

type Service struct{}

func (s Service) Record(_ context.Context, _ string) error {
	return nil
}
