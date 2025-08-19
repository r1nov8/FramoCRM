FROM node:20
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 4000
RUN chmod +x entrypoint.sh
CMD ["/bin/bash", "/app/entrypoint.sh"]
