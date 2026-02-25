package middleware

import "net/http"

type Middleware func(http.Handler) http.Handler

func Chain(next http.Handler, mws ...Middleware) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		next = mws[i](next)
	}
	return next
}
