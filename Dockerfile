# Pinned rather than :latest so a failing e2e run means the node changed, not
# that n8n shipped a release overnight. Bump deliberately.
FROM n8nio/n8n:2.35.7

USER root

COPY dist /home/node/.n8n/custom/node_modules/@lusha-org/n8n-nodes-lusha/dist
COPY package.json /home/node/.n8n/custom/node_modules/@lusha-org/n8n-nodes-lusha/package.json

RUN chown -R node:node /home/node/.n8n/custom

USER node
