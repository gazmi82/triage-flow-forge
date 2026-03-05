package auth

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
)

var emailRegex = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func CreateUser(
	ctx context.Context,
	ensurePool func(context.Context) (*pgxpool.Pool, error),
	req contracts.AdminCreateUserRequest,
) (contracts.AdminCreateUserResponse, error) {
	pool, err := ensurePool(ctx)
	if err != nil {
		return contracts.AdminCreateUserResponse{}, err
	}

	name := strings.TrimSpace(req.Name)
	email := strings.TrimSpace(strings.ToLower(req.Email))
	department := strings.TrimSpace(req.Department)
	password := req.Password
	active := true
	if req.Active != nil {
		active = *req.Active
	}

	if len(name) < 2 {
		return contracts.AdminCreateUserResponse{}, errors.New("name must be at least 2 characters")
	}
	if !emailRegex.MatchString(email) {
		return contracts.AdminCreateUserResponse{}, errors.New("please provide a valid email address")
	}
	if len(department) < 2 {
		return contracts.AdminCreateUserResponse{}, errors.New("department must be at least 2 characters")
	}
	if len(password) < 6 {
		return contracts.AdminCreateUserResponse{}, errors.New("password must be at least 6 characters")
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return contracts.AdminCreateUserResponse{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var maxSuffix int
	if err := tx.QueryRow(ctx, `
SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 2) AS INTEGER)), 0)
FROM users
WHERE id ~ '^u[0-9]+$'
`).Scan(&maxSuffix); err != nil {
		return contracts.AdminCreateUserResponse{}, err
	}
	newID := fmt.Sprintf("u%d", maxSuffix+1)

	_, err = tx.Exec(ctx, `
INSERT INTO users (id, name, email, primary_role_key, department, active)
VALUES ($1, $2, $3, $4, $5, $6)
`, newID, name, email, req.Role, department, active)
	if err != nil {
		if isUniqueViolation(err) {
			return contracts.AdminCreateUserResponse{}, errors.New("a user with this email already exists")
		}
		return contracts.AdminCreateUserResponse{}, err
	}

	_, err = tx.Exec(ctx, `
INSERT INTO user_roles (user_id, role_key, is_primary)
VALUES ($1, $2, TRUE)
ON CONFLICT (user_id, role_key) DO UPDATE
SET is_primary = EXCLUDED.is_primary
`, newID, req.Role)
	if err != nil {
		return contracts.AdminCreateUserResponse{}, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return contracts.AdminCreateUserResponse{}, err
	}

	_, err = tx.Exec(ctx, `
INSERT INTO credentials (user_id, email, password_hash, hash_algorithm)
VALUES ($1, $2, $3, 'bcrypt')
`, newID, email, string(hash))
	if err != nil {
		if isUniqueViolation(err) {
			return contracts.AdminCreateUserResponse{}, errors.New("a user with this email already exists")
		}
		return contracts.AdminCreateUserResponse{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return contracts.AdminCreateUserResponse{}, err
	}

	users, err := FetchUsers(ctx, ensurePool)
	if err != nil {
		return contracts.AdminCreateUserResponse{}, err
	}

	created := contracts.User{
		ID:         newID,
		Name:       name,
		Email:      email,
		Role:       req.Role,
		Department: department,
		Active:     active,
	}

	return contracts.AdminCreateUserResponse{Users: users, CreatedUser: created}, nil
}

func FetchUsers(
	ctx context.Context,
	ensurePool func(context.Context) (*pgxpool.Pool, error),
) ([]contracts.User, error) {
	pool, err := ensurePool(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
SELECT id, name, email, primary_role_key, department, active
FROM users
ORDER BY id
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]contracts.User, 0)
	for rows.Next() {
		var u contracts.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Department, &u.Active); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}
