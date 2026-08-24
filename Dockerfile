FROM n8nio/n8n:latest

USER root

COPY dist /home/node/.n8n/custom/node_modules/@lusha-org/n8n-nodes-lusha/dist
COPY package.json /home/node/.n8n/custom/node_modules/@lusha-org/n8n-nodes-lusha/package.json

RUN chown -R node:node /home/node/.n8n/custom

USER node
