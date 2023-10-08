package tool

import "math/rand"

var defaultLetters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

func RandomString(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = defaultLetters[rand.Intn(len(defaultLetters))]
	}

	return string(b)
}
