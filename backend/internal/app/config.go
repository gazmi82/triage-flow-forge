package app

import (
	"bufio"
	"os"
	"strings"
)

// Config defines runtime environment settings used by the backend app.
type Config struct {
	HTTPAddr      string
	PostgresDSN   string
	RedisAddr     string
	RedisPassword string
	RedisDB       string
}

// LoadConfig loads application configuration from environment variables with
// fallbacks to local development defaults.
func LoadConfig() Config {
	loadDotEnv()

	return Config{
		HTTPAddr:      envOrDefault("HTTP_ADDR", ":8082"),
		PostgresDSN:   envOrDefault("POSTGRES_DSN", "postgres://localhost:5432/triage?sslmode=disable"),
		RedisAddr:     envOrDefault("REDIS_ADDR", "127.0.0.1:6379"),
		RedisPassword: os.Getenv("REDIS_PASSWORD"),
		RedisDB:       envOrDefault("REDIS_DB", "0"),
	}
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func loadDotEnv() {
	paths := []string{".env", "backend/.env"}
	for _, path := range paths {
		file, err := os.Open(path)
		if err != nil {
			continue
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			key, value, ok := strings.Cut(line, "=")
			if !ok {
				continue
			}
			key = strings.TrimSpace(key)
			value = strings.TrimSpace(value)
			value = strings.Trim(value, `"'`)
			if key == "" {
				continue
			}
			if os.Getenv(key) == "" {
				_ = os.Setenv(key, value)
			}
		}
		return
	}
}
