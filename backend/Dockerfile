FROM oven/bun:1 as base
WORKDIR /app
COPY package.json .
RUN bun install --production
COPY dist ./dist
COPY prisma ./prisma
EXPOSE 3000
CMD ["bun", "run", "start:prod"]
