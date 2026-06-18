// User-Modell — Schema/ORM folgt in der Backend-Phase.
// Platzhalter, der die erwarteten Felder dokumentiert.

export const UserSchema = {
  id: 'uuid',
  username: 'string',
  email: 'string',
  passwordHash: 'string',
  role: 'endnutzer | haendler | admin | subadmin',
  createdAt: 'timestamp',
}
