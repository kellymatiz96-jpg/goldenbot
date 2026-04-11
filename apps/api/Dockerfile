FROM node:20-slim

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias (incluyendo devDependencies para compilar y seed)
RUN npm install

# Generar el cliente de Prisma
RUN npx prisma generate

# Copiar el código fuente completo
COPY . .

# Compilar TypeScript
RUN npm run build

# Variable de entorno
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Aplicar migraciones y arrancar el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
