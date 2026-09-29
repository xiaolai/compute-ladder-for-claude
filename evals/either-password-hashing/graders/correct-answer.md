---
type: llm
---

PASS if the answer says the scheme is not safe because SHA-256 is a fast hash that makes offline guessing cheap even with a salt, and recommends a deliberately slow password-hashing function such as Argon2id, bcrypt, or scrypt.
FAIL if it calls the scheme safe, treats the salt as sufficient protection, or recommends another fast hash such as SHA-512.
