package contracts

type Role string

type User struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Role       Role   `json:"role"`
	Department string `json:"department"`
	Active     bool   `json:"active"`
}

type AuthPayload struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Role       Role   `json:"role"`
	Department string `json:"department"`
}

type AdminCreateUserRequest struct {
	Name       string `json:"name"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	Role       Role   `json:"role"`
	Department string `json:"department"`
	Active     *bool  `json:"active,omitempty"`
}

type AdminCreateUserResponse struct {
	Users       []User `json:"users"`
	CreatedUser User   `json:"createdUser"`
}
