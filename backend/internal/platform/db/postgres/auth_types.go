package postgres

import (
	"github.com/gazmi82/triage-flow-forge/backend/internal/modules/contracts"
	authrepo "github.com/gazmi82/triage-flow-forge/backend/internal/platform/db/postgres/auth"
)

type Role = contracts.Role
type User = contracts.User
type AuthPayload = contracts.AuthPayload
type AdminCreateUserRequest = contracts.AdminCreateUserRequest
type AdminCreateUserResponse = contracts.AdminCreateUserResponse

var (
	ErrInvalidCredentials = authrepo.ErrInvalidCredentials
	ErrUserInactive       = authrepo.ErrUserInactive
)
