# Security Setup for npm Trusted Publishers

## GitHub Environment Protection (Required)

The publish workflow uses a protected environment `npm-production` to prevent unauthorized publishes from forks or malicious PRs.

### Setup Instructions:

#### Part 1: npm Trusted Publisher Configuration

1. **Go to:** https://www.npmjs.com/package/@n8n/n8n-nodes-lusha/access

2. **Click "Publishing" → "Trusted Publisher" → "Add trusted publisher"**

3. **Select "GitHub Actions"** and fill in:
   - **Organization/User:** `lusha-oss`
   - **Repository:** `n8n-nodes-lusha`
   - **Workflow filename:** `release.yml`
   - **Environment:** `npm-production` ⚠️ **REQUIRED for branch protection**
   - **Allowed action:** `npm publish`

4. **Click "Add trusted publisher"**

**Important:** npm's trusted publisher config does NOT have a branch/tag field. Branch protection comes from GitHub Environment settings (next step).

#### Part 2: GitHub Environment Protection (CRITICAL - Branch Restriction Layer)

1. **Go to:** https://github.com/lusha-oss/n8n-nodes-lusha/settings/environments

2. **Create Environment:**
   - Click "New environment"
   - Name: `npm-production` (must match npm config above)
   - Click "Configure environment"

3. **Configure Protection Rules:**
   - ✅ **Required reviewers:** Add trusted maintainers (recommended: at least 1)
   - ✅ **Wait timer:** Optional - add 5-minute delay for rollback window
   - ✅ **Deployment branches and tags:** Click "Deployment branches and tags" dropdown
     - Select "Selected branches and tags"
     - Click "Add deployment branch or tag rule"
     - Rule type: "Branch"
     - Branch name pattern: `main` (or use `refs/heads/main`)
     - Click "Add rule"
   - Click "Save protection rules"

**This is how branch restriction works:** GitHub validates the branch BEFORE the job runs. Feature branch releases are blocked at the GitHub level, before npm is ever contacted.

4. **Set Branch Protection for `main`:**
   - Go to: https://github.com/lusha-oss/n8n-nodes-lusha/settings/branches
   - Add rule for `main` branch:
     - ✅ Require pull request reviews before merging
     - ✅ Require status checks to pass (select `build` job)
     - ✅ Do not allow bypassing the above settings

## Security Layers

The publish workflow has multiple security layers:

### 1. **OIDC Token Claims Validation (npm Registry Level)**
npm trusted publisher validates OIDC token claims before accepting publish:

```
npm config validates:
- Repository: lusha-oss/n8n-nodes-lusha (blocks forks)
- Workflow: release.yml (blocks other workflows)
- Environment: npm-production (required for branch protection)
```

**Fork protection:** Fork tokens have `repository: attacker/n8n-nodes-lusha` → npm rejects.

**Branch protection comes from GitHub Environment, NOT npm config** (see next layer).

### 2. **Branch Restriction (GitHub Environment Level)**
```yaml
environment:
  name: npm-production
```

GitHub Environment deployment rules enforce branch restrictions:
- Environment configured with "Deployment branches: main only"
- GitHub validates branch BEFORE job runs
- Feature branch releases → job blocked, never reaches npm
- This is the **authoritative branch protection** layer

Additionally provides:
- Manual approval from designated reviewers
- Audit trail for all publishes
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
