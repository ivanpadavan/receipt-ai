---
name: Login to Receipt AI App
description: Automated login skill for accessing the Receipt AI application through browser automation
---

# Login to Receipt AI App

This skill provides automated login capability for the Receipt AI application using a test account.

## Test Account Credentials

- **Email**: `test@receipt-ai.local`
- **Password**: `TestPassword123!`
- **User ID**: `d44af79c-db70-4dfd-a37a-9531aa3a390d`
- **User Name**: `Test User`

## Auto-Login URL

The application provides a special auto-login endpoint for automation:

```
http://localhost:3000/api/auth/auto-login?email=test@receipt-ai.local&password=TestPassword123!
```

Optional parameters:
- `redirect` - URL to redirect after login (default: `/`)

Example with redirect:
```
http://localhost:3000/api/auth/auto-login?email=test@receipt-ai.local&password=TestPassword123!&redirect=/history
```

## Usage Instructions

### For Browser Subagent

When you need to access the application as an authenticated user:

1. Navigate to the auto-login URL:
   ```
   http://localhost:3000/api/auth/auto-login?email=test@receipt-ai.local&password=TestPassword123!
   ```

2. The endpoint will automatically:
   - Authenticate the user
   - Set session cookies
   - Redirect to the home page (or specified redirect URL)

3. You will now be logged in as "Test User" and can interact with the application

### Manual Login (Alternative)

If the auto-login endpoint is not available, you can manually log in:

1. Navigate to `http://localhost:3000/auth/sign-in`
2. Since the test account uses email/password (not OAuth), you would need to use the Supabase Auth UI or a custom email/password form

## Important Notes

- This is a **test account only** - do not use in production
- The auto-login endpoint should be disabled or protected in production environments
- The test user has `is_anonymous: false` and full access to the application
- Session cookies are automatically managed by the auto-login endpoint

## Verifying Login Status

After logging in, you can verify the session by:

1. Checking the navbar - it should display "Test User" and a "Sign Out" button
2. Navigating to `/history` - authenticated users can access this page
3. Checking browser cookies - look for `sb-access-token` and `sb-refresh-token`

## Troubleshooting

If auto-login fails:

1. **Check if the dev server is running**: The application must be running on `http://localhost:3000`
2. **Verify the test user exists**: Run this SQL query in Supabase:
   ```sql
   SELECT id, email, is_anonymous 
   FROM auth.users 
   WHERE email = 'test@receipt-ai.local';
   ```
3. **Check the API response**: Look for error messages in the browser console or network tab
4. **Clear cookies**: Sometimes old session cookies can interfere - clear browser cookies and try again

## Security Considerations

⚠️ **WARNING**: This auto-login endpoint is designed for development and testing only!

- Remove or protect this endpoint before deploying to production
- Consider adding IP restrictions or API key authentication
- Never commit real user credentials to version control
- Use environment variables for sensitive configuration
