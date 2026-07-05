# Security Setup for npm Trusted Publishers

## GitHub Environment Protection (Required)

The publish workflow uses a protected environment `npm-production` to prevent unauthorized publishes from forks or malicious PRs.

### Setup Instructions:

1. **Go to Repository Settings:**
   - Navigate to: https://github.com/lusha-oss/n8n-nodes-lusha/settings/environments

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

### 1. **Fork Prevention**
```yaml
if: github.repository == 'lusha-oss/n8n-nodes-lusha'
```
- Prevents forks from executing the publish job
- Malicious forks cannot hijack the workflow

### 2. **Branch Restriction**
```yaml
if: github.event.release.target_commitish == 'main'
```
- Only releases created from `main` branch can publish
- Feature branch releases are blocked

### 3. **Environment Protection**
```yaml
environment:
  name: npm-production
```
- Requires manual approval from designated reviewers
- Creates audit trail for all publishes
- Prevents automated/accidental publishes

### 4. **Trigger Restriction**
```yaml
on:
  release:
    types: [published]
```
- Only GitHub Releases trigger the workflow
- Pull requests cannot trigger publish
- Direct pushes cannot trigger publish

### 5. **OIDC Token Scope**
- npm trusted publisher config limits token to specific:
  - Organization: `lusha-oss`
  - Repository: `n8n-nodes-lusha`
  - Workflow: `release.yml`
  - Action: `npm publish`
- Token is single-use and short-lived (15 minutes)
- Token cannot be extracted or reused

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
