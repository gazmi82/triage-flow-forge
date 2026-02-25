package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserInactive       = errors.New("user not found or inactive")
)

func (c *Client) Login(ctx context.Context, email string, password string) (AuthPayload, error) {
	pool, err := c.ensurePool(ctx)
	if err != nil {
		return AuthPayload{}, err
	}

	normalized := strings.TrimSpace(strings.ToLower(email))
	if normalized == "" || strings.TrimSpace(password) == "" {
		return AuthPayload{}, ErrInvalidCredentials
	}

	var (
		payload       AuthPayload
		active        bool
		passwordHash  string
		hashAlgorithm string
	)

	err = pool.QueryRow(ctx, `
SELECT
  u.id,
  u.name,
  u.email,
  u.primary_role_key,
  u.department,
  u.active,
  c.password_hash,
  c.hash_algorithm
FROM credentials c
JOIN users u ON u.id = c.user_id
WHERE c.email = $1
LIMIT 1
`, normalized).Scan(
		&payload.ID,
		&payload.Name,
		&payload.Email,
		&payload.Role,
		&payload.Department,
		&active,
		&passwordHash,
		&hashAlgorithm,
	)
	if err != nil {
		return AuthPayload{}, ErrInvalidCredentials
	}
	if !active {
		return AuthPayload{}, ErrUserInactive
	}

	if err := verifyPassword(password, passwordHash, hashAlgorithm); err != nil {
		return AuthPayload{}, ErrInvalidCredentials
	}

	return payload, nil
}

func verifyPassword(plain, storedHash, algorithm string) error {
	switch strings.ToLower(strings.TrimSpace(algorithm)) {
	case "bcrypt":
		return bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(plain))
	case "plain_seed", "plain", "plaintext", "demo":
		if plain == storedHash {
			return nil
		}
		return ErrInvalidCredentials
	default:
		if plain == storedHash {
			return nil
		}
		if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(plain)); err == nil {
			return nil
		}
		return fmt.Errorf("unsupported hash algorithm: %s", algorithm)
	}
}
