# Security Policy

## Overview

The n8n-nodes-lusha package provides integration with the Lusha API for contact and company data enrichment within n8n workflows. As this node processes personal and business data through third-party API calls, we take security seriously and follow best practices to protect user data and maintain secure operations.

## Supported Versions

We provide security updates for the following versions:

| Version | Supported |
| ------- | --------- |
| 1.x.x   | ✅        |
| < 1.0.0 | ❌        |

## Reporting Security Vulnerabilities

If you discover a security vulnerability in n8n-nodes-lusha, please report it responsibly:

### Preferred Reporting Method
- **Email**: [security@lusha.com](mailto:security@lusha.com)
- **Subject Line**: `[SECURITY] n8n-nodes-lusha vulnerability report`

### Alternative Reporting
- **GitHub**: [Create a security advisory](https://github.com/lusha-oss/n8n-nodes-lusha/security/advisories/new)
- **Issue Tracker**: For non-sensitive security issues only

### What to Include
- Description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Affected versions
- Any potential workarounds or mitigations
- Your contact information for follow-up questions

### Response Timeline
- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days  
- **Status Updates**: Weekly until resolution
- **Fix Release**: Target within 30 days for critical issues

## Security Considerations

### API Key Security

**🔐 Credential Protection**
- API keys are stored securely using n8n's credential system with password field protection
- Never log, expose, or hardcode API keys in workflows or error messages
- Use environment variables or n8n's credential management for API key storage
- Regularly rotate API keys and revoke unused keys in your Lusha dashboard

**⚠️ Risk Mitigation**
```javascript
// ✅ GOOD: Proper credential handling
const credentials = await this.getCredentials('lushaApi');
const apiKey = credentials.apiKey;

// ❌ BAD: Never expose credentials
console.log('Using API key:', credentials.apiKey);
```

### Data Privacy & Protection

**📊 Personal Data Processing**
This node processes personal and business data including:
- Names, email addresses, phone numbers
- Company information and employment details
- LinkedIn profile URLs
- Business contact information

**🛡️ Privacy Best Practices**
- Ensure compliance with GDPR, CCPA, and other applicable privacy regulations
- Implement data minimization - only collect necessary data
- Provide clear privacy notices to data subjects
- Implement proper data retention and deletion policies
- Consider data processing agreements with Lusha

**🌍 Cross-Border Data Transfer**
- Data is transmitted to Lusha's servers (may involve international transfers)
- Review Lusha's privacy policy and data processing agreements
- Ensure legal basis for international data transfers

### Input Validation & Security

**✅ JSON Input Validation**
The node accepts JSON input for bulk operations. Ensure proper validation:
```javascript
// The node implements JSON parsing with error handling
try {
  contacts = JSON.parse(contactsJson);
} catch (error) {
  throw new Error('Invalid JSON in Contacts field: ' + error.message);
}
```

**🔍 Input Security Guidelines**
- Validate all user inputs before processing
- Limit bulk operations to maximum allowed (100 contacts/companies)
- Sanitize input data to prevent injection attacks
- Use schema validation for complex JSON inputs

### Network Security

**🌐 HTTPS Communication**
- All API communication uses HTTPS (https://api.lusha.com)
- SSL/TLS certificate validation is enforced
- No sensitive data transmitted over unencrypted channels

**🔄 Rate Limiting**
- Respect Lusha API rate limits to prevent service disruption
- Implement exponential backoff for failed requests
- Monitor API usage to detect unusual patterns

### Error Handling & Information Disclosure

**⚠️ Error Security**
The node implements error handling that could potentially expose sensitive information:

```javascript
// Current implementation
catch (error) {
  if (this.continueOnFail()) {
    returnData.push({
      json: { 
        error: errorMessage, // Ensure this doesn't leak sensitive data
        resource,
        operation,
        itemIndex: i 
      }
    });
  }
}
```

**🛡️ Secure Error Handling Practices**
- Sanitize error messages before logging or returning
- Avoid exposing API keys, internal paths, or sensitive data in errors
- Log detailed errors securely (server-side only)
- Return generic error messages to end users

## Secure Usage Guidelines

### Deployment Security

**🏗️ Production Deployment**
- Use dedicated service accounts with minimal permissions
- Deploy in secure network environments with proper firewall rules  
- Enable audit logging for n8n instances
- Regular security updates for n8n and dependencies

**📋 Security Checklist**
- [ ] API keys stored in n8n credentials system
- [ ] Regular API key rotation implemented
- [ ] Data retention policies defined and implemented
- [ ] Privacy compliance documented
- [ ] Error handling sanitized
- [ ] Network security configured (HTTPS, firewalls)
- [ ] Monitoring and alerting configured
- [ ] Incident response plan documented

### Monitoring & Auditing

**📊 Security Monitoring**
- Monitor API usage patterns and anomalies
- Log authentication failures and suspicious activities
- Set up alerting for unusual data access patterns
- Regularly review and audit workflow configurations

**📋 Audit Trail**
- Maintain logs of data enrichment activities
- Track API key usage and rotations
- Document data processing activities for compliance
- Regular security assessments and reviews

## Dependencies & Supply Chain Security

**📦 Dependency Management**
- Regularly update dependencies to patched versions
- Use `npm audit` to identify and fix vulnerability issues
- Monitor security advisories for n8n and related packages
- Implement automated dependency scanning in CI/CD

**🔍 Current Dependencies**
Key dependencies to monitor:
- `n8n-workflow`: Core n8n workflow functionality
- TypeScript and build tools
- HTTP request libraries

## Incident Response

### Security Incident Process

1. **Detection**: Identify potential security incident
2. **Assessment**: Determine severity and impact
3. **Containment**: Isolate affected systems/workflows
4. **Investigation**: Root cause analysis
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update security measures

### Emergency Contacts
- **Security Issues**: [security@lusha.com](mailto:security@lusha.com)
- **Lusha Support**: [support@lusha.com](mailto:support@lusha.com)
- **n8n Community**: [community.n8n.io](https://community.n8n.io)

## Compliance & Legal

### Regulatory Compliance
- **GDPR**: European data protection regulation compliance
- **CCPA**: California privacy regulation compliance  
- **SOC 2**: Service organization control standards
- **Data Processing Agreements**: Review Lusha's DPA requirements

### Third-Party Security
- This node integrates with Lusha's API service
- Review [Lusha's Security Page](https://www.lusha.com/security/) for their security practices
- Understand Lusha's data handling and retention policies
- Ensure contractual security requirements are met

## Security Resources

### Documentation
- [n8n Security Best Practices](https://docs.n8n.io/security/)
- [Lusha API Documentation](https://docs.lusha.com/apis)
- [Lusha Security & Compliance](https://www.lusha.com/security/)

### Tools & Resources
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm Security Best Practices](https://docs.npmjs.com/security)

## Updates & Notifications

This security policy is reviewed and updated regularly. For the latest version and security notifications:

- **Watch this repository** for security updates
- **Follow releases** for security patches
- **Subscribe to security advisories** on GitHub

---

**Last Updated**: January 2024  
**Next Review**: July 2024

For questions about this security policy, please contact [security@lusha.com](mailto:security@lusha.com).
