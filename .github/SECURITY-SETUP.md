# Security Setup for npm Trusted Publishers

## GitHub Environment Protection (Required)

The publish workflow uses a protected environment `npm-production` to prevent unauthorized publishes from forks or malicious PRs.

### Setup Instructions:

#### Part 1: npm Trusted Publisher (CRITICAL - Primary Security Layer)

1. **Go to:** https://www.npmjs.com/package/@n8n/n8n-nodes-lusha/access

2. **Click "Publishing" → "Trusted Publisher" → "Add trusted publisher"**

3. **Select "GitHub Actions"** and fill in:
   - **Organization/User:** `lusha-oss`
   - **Repository:** `n8n-nodes-lusha`
   - **Workflow filename:** `release.yml`
   - **Environment:** `npm-production` (optional but recommended)
   - **Branch/Tag:** `main` ⚠️ **CRITICAL - This enforces main-only at npm registry level**
   - **Allowed action:** `npm publish`

4. **Click "Add trusted publisher"**

#### Part 2: GitHub Environment Protection (Defense in Depth)

1. **Go to:** https://github.com/lusha-oss/n8n-nodes-lusha/settings/environments

2. **Create Environment:**
   - Click "New environment"
   - Name: `npm-production`
   - Click "Configure environment"

3. **Configure Protection Rules:**
   - ✅ **Required reviewers:** Add trusted maintainers (recommended: at least 1)
   - ✅ **Wait timer:** Optional - add 5-minute delay for rollback window
   - ✅ **Deployment branches:** Select "Protected branches only"
   - Click "Save protection rules"

4. **Set Branch Protection for `main`:**
   - Go to: https://github.com/lusha-oss/n8n-nodes-lusha/settings/branches
   - Add rule for `main` branch:
     - ✅ Require pull request reviews before merging
     - ✅ Require status checks to pass (select `build` job)
     - ✅ Do not allow bypassing the above settings

## Security Layers

The publish workflow has multiple security layers:

### 1. **OIDC Token Claims Validation (Primary Security - npm Registry Level)**
npm trusted publisher validates OIDC token claims before accepting publish:

```
npm config validates against OIDC token claims:
- Repository: lusha-oss/n8n-nodes-lusha
- Branch: main
- Workflow: release.yml
- Environment: npm-production (optional)
```

**How it works:**
- GitHub issues OIDC token with claims (repo, branch, workflow, environment)
- npm validates token claims against trusted publisher configuration
- **Forks are blocked:** Fork token has `repository: attacker/n8n-nodes-lusha` → validation fails
- **Feature branches blocked:** Feature branch token has `ref: refs/heads/feature` → validation fails
- Cannot be bypassed by modifying workflow (validation happens at npm registry)

This is the **authoritative** security layer - all others are defense in depth.

### 2. **Environment Protection**
```yaml
environment:
  name: npm-production
```
- Requires manual approval from designated reviewers
- Creates audit trail for all publishes
- Prevents automated/accidental publishes

### 3. **Trigger Restriction**
```yaml
on:
  release:
    types: [published]
```
- Only GitHub Releases trigger the workflow
- Pull requests cannot trigger publish
- Direct pushes cannot trigger publish

### 4. **Token Lifecycle**
- Token is single-use and short-lived (15 minutes)
- Token cannot be extracted or reused
- No long-lived credentials stored in GitHub Secrets

## Publish Process

1. **Developer** creates PR → merges to `main`
2. **Maintainer** creates GitHub Release from `main` branch
3. **GitHub** triggers workflow → runs build job
4. **Environment Protection** pauses publish job → notifies reviewers
5. **Reviewer** approves deployment in GitHub UI
6. **Workflow** requests OIDC token from GitHub → exchanges with npm
7. **npm** validates token against trusted publisher config → allows publish
8. **Token** expires after 15 minutes

## Attack Surface Mitigation

| Attack Vector | Mitigation |
|---------------|------------|
| Malicious PR from external contributor | PR cannot trigger publish (only `release:published`) |
| Compromised fork | Fork check prevents execution |
| Stolen NPM_TOKEN | No long-lived tokens exist (OIDC only) |
| Unauthorized release | Environment requires reviewer approval |
| Feature branch publish | Branch check restricts to `main` only |
| Replay attack | OIDC tokens are single-use and expire in 15min |
| Supply chain attack | Provenance attestation links package to source commit |

## Monitoring

- **Audit Trail:** GitHub Actions logs + Environment deployment history
- **Provenance:** Each published package includes cryptographic attestation
- **Verification:** `npm audit signatures` verifies publish authenticity

## References

- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers)
- [OIDC Security Model](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
