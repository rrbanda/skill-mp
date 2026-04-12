# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | Yes                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please use one of these methods:

1. **GitHub Security Advisories** (preferred): Use the "Report a vulnerability" button on the [Security tab](../../security/advisories/new) of this repository.
2. **Email**: Send details to the maintainers listed in CODEOWNERS.

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix timeline**: Depends on severity; critical issues are prioritized

### After reporting

- We will acknowledge your report promptly
- We will work with you to understand and validate the issue
- We will prepare a fix and coordinate disclosure
- We will credit you in the release notes (unless you prefer anonymity)

## Security best practices for contributors

- Never commit secrets, API keys, or credentials
- Use environment variables for all sensitive configuration
- Review the .env.example files for the expected variable names
- Do not disable TLS verification in production code
