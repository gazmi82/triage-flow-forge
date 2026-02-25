.PHONY: run test fmt tidy

run:
	go run ./cmd/api

test:
	go test ./...

fmt:
	gofmt -w $(shell find . -name '*.go' -type f)

tidy:
	go mod tidy
