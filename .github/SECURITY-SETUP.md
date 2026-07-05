# Security Setup for npm Trusted Publishers

## Quick Setup

### 1. npm Configuration
- Go to: https://www.npmjs.com/package/@n8n/n8n-nodes-lusha/access
- Add trusted publisher (GitHub Actions):
  - Organization: `lusha-oss`
  - Repository: `n8n-nodes-lusha`
  - Workflow: `release.yml`
  - **Environment: `npm-production`** (required)
  - Allowed action: `npm publish`

### 2. GitHub Environment (Already Created)
- Environment: `npm-production`
- Branch restriction: `main` only
- Required reviewers: `n8n` team

View at: https://github.com/lusha-oss/n8n-nodes-lusha/settings/environments/npm-production

## How It Works

**Security flow:**
1. GitHub Release created from `main` → workflow triggered
2. GitHub validates branch against environment deployment rules
3. If not `main` → job blocked (no OIDC token issued)
4. If `main` → waits for `n8n` team approval
5. After approval → GitHub issues OIDC token with claims:
   - `repository: lusha-oss/n8n-nodes-lusha`
   - `workflow_ref: release.yml`
   - `environment: npm-production`
6. npm validates token claims against trusted publisher config
7. If valid → publish succeeds

**Attack prevention:**
- Forks: npm validates `repository` claim
- Feature branches: GitHub blocks job before OIDC token issued
- Wrong workflow: npm validates `workflow_ref` claim
- Token theft: OIDC tokens expire in 15min, single-use only
