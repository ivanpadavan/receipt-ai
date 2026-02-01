---
name: Sign Up New Test User
description: Create a new test user in the Receipt AI application using Supabase MCP
---

# Sign Up New Test User

This skill provides instructions for creating new test users in the Receipt AI application using Supabase MCP tools.

## Prerequisites

- Supabase MCP server must be available
- Project ID: `dgxbbtlqcqcrbfmhcwcd`
- Password for all test users: `TestPassword123!`

## Creating a New Test User

Use the Supabase MCP `execute_sql` tool to create a new user with the following SQL:

### Step 1: Create User in auth.users

```sql
-- Create a new test user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  is_anonymous
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'YOUR_EMAIL_HERE@example.com',  -- Change this to desired email
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"YOUR_NAME_HERE"}',  -- Change this to desired display name
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  false
)
RETURNING id, email, raw_user_meta_data->>'name' as name;
```

**Important**: Replace:
- `YOUR_EMAIL_HERE@example.com` with the desired email address
- `YOUR_NAME_HERE` with the desired display name

### Step 2: Create Identity for the User

After creating the user, you'll get back a user ID. Use that ID in the next query:

```sql
-- Create identity for email provider
-- Replace USER_ID_FROM_STEP_1 with the actual UUID returned from step 1
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'USER_ID_FROM_STEP_1',  -- Replace with actual user ID
  'USER_ID_FROM_STEP_1',  -- Same as user_id
  '{"sub":"USER_ID_FROM_STEP_1","email":"YOUR_EMAIL_HERE@example.com"}',  -- Replace with actual values
  'email',
  NOW(),
  NOW(),
  NOW()
)
RETURNING id, provider, identity_data->>'email' as email;
```

**Important**: Replace:
- `USER_ID_FROM_STEP_1` with the UUID from step 1 (appears 3 times)
- `YOUR_EMAIL_HERE@example.com` with the same email from step 1

## Example: Creating test@receipt-ai.local

Here's the exact SQL that was used to create the main test user:

### Step 1: Create User
```sql
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  is_anonymous
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@receipt-ai.local',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  false
)
RETURNING id, email, raw_user_meta_data->>'name' as name;
```

Result:
```json
[{"id":"d44af79c-db70-4dfd-a37a-9531aa3a390d","email":"test@receipt-ai.local","name":"Test User"}]
```

### Step 2: Create Identity
```sql
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'd44af79c-db70-4dfd-a37a-9531aa3a390d',
  'd44af79c-db70-4dfd-a37a-9531aa3a390d',
  '{"sub":"d44af79c-db70-4dfd-a37a-9531aa3a390d","email":"test@receipt-ai.local"}',
  'email',
  NOW(),
  NOW(),
  NOW()
)
RETURNING id, provider, identity_data->>'email' as email;
```

Result:
```json
[{"id":"c1cf6bdb-57c1-4850-b78b-306c3d877224","provider":"email","email":"test@receipt-ai.local"}]
```

## Usage with Supabase MCP

When you need to create a new test user, use the MCP tool:

```
mcp_supabase-mcp-server_execute_sql(
  project_id: "dgxbbtlqcqcrbfmhcwcd",
  query: "INSERT INTO auth.users ..."
)
```

## Verification

After creating a user, verify it was created successfully:

```sql
SELECT 
  id,
  email,
  raw_user_meta_data->>'name' as name,
  is_anonymous,
  created_at
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE@example.com';
```

## Login After Creation

Once the user is created, you can log in using the auto-login endpoint:

```
http://localhost:3000/api/auth/auto-login?email=YOUR_EMAIL@example.com&password=TestPassword123!
```

## Important Notes

- All test users use the same password: `TestPassword123!`
- The password is hashed using bcrypt (`crypt` function with `bf` salt)
- Users are created with `is_anonymous: false` for full access
- Email is automatically confirmed (`email_confirmed_at: NOW()`)
- Users are created in the `auth` schema, not `public`
- The `provider_id` in identities table must match the `user_id`

## Common Issues

1. **Duplicate email**: If you get a unique constraint error, the email already exists. Choose a different email or delete the existing user first.

2. **Missing identity**: If login fails after creating a user, make sure you completed Step 2 (creating the identity).

3. **Wrong password**: All test users must use `TestPassword123!` as the password (case-sensitive).

## Deleting a Test User

To delete a test user (cascades to identities automatically):

```sql
DELETE FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE@example.com';
```
