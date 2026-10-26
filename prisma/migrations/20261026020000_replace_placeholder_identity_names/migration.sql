-- Replace only the original placeholder display names; credentials and legal
-- registration details are intentionally left untouched.
UPDATE "users"
SET "name" = 'Administrador Groomer Carla', "updatedAt" = CURRENT_TIMESTAMP
WHERE lower(btrim("name")) = 'administrador teste';

UPDATE "tenants"
SET "name" = 'Groomer Carla', "updatedAt" = CURRENT_TIMESTAMP
WHERE lower(btrim("name")) = 'teste';

UPDATE "branches"
SET "name" = CASE
    WHEN lower(btrim("name")) = 'matriz teste' THEN 'Loja principal'
    ELSE 'Groomer Carla'
  END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE lower(btrim("name")) IN ('teste', 'loja teste', 'matriz teste');
