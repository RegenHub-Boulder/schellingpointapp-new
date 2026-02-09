# Schelling Point Email Templates

Custom branded email templates for the Schelling Point authentication system.

## Templates Included

| Template | File | Purpose |
|----------|------|---------|
| Magic Link / OTP | `magic_link.html` | Sign-in with magic link or OTP code |
| Confirmation | `confirmation.html` | Email address confirmation |
| Recovery | `recovery.html` | Password reset |
| Invite | `invite.html` | User invitations |

## Local Development

The templates are automatically configured in `config.toml` for local development:

```bash
supabase start
```

You can preview emails at http://localhost:54324 (Inbucket).

## Production Setup (Supabase Dashboard)

For production Supabase projects, configure templates in the dashboard:

1. Go to **Authentication** → **Email Templates** in your Supabase project
2. For each template type, paste the HTML content from the corresponding file
3. Update the subject lines:

| Template | Subject Line |
|----------|--------------|
| Magic Link | `Sign in to Schelling Point` |
| Confirm Signup | `Confirm your email - Schelling Point` |
| Reset Password | `Reset your password - Schelling Point` |
| Invite User | `You're invited to Schelling Point - EthBoulder 2026` |

### Important: Update Logo URL

Replace the logo URL in templates with your production URL:
```html
<!-- Current (development) -->
<img src="https://mvp-self-three.vercel.app/logo.svg" ...>

<!-- Update to your production domain -->
<img src="https://your-production-domain.com/logo.svg" ...>
```

## Template Variables

Supabase provides these variables in email templates:

| Variable | Description |
|----------|-------------|
| `{{ .Token }}` | The 6-digit OTP code |
| `{{ .ConfirmationURL }}` | Full URL for magic link / confirmation |
| `{{ .Email }}` | User's email address |
| `{{ .SiteURL }}` | Your configured site URL |

## Design System

### Colors
- **Primary (Neon Green)**: `#B2FF00`
- **Background Dark**: `#0a0e14`
- **Card Background**: `#0d1117`
- **Text Primary**: `#ffffff`
- **Text Secondary**: `#c9d1d9`
- **Text Muted**: `#8b949e`
- **Border**: `#1e2a3a`

### Typography
Uses system fonts for email compatibility:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

## Testing

### Local Testing
1. Run `supabase start`
2. Sign up or sign in via the app
3. View sent emails at http://localhost:54324

### Preview in Browser
Open any `.html` file directly in a browser to preview the design (note: template variables won't render).

### Email Client Testing
For thorough testing across email clients, consider:
- [Litmus](https://litmus.com)
- [Email on Acid](https://www.emailonacid.com)
