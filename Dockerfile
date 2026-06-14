FROM eclipse-temurin:21-jdk AS lavalink
COPY lavalink/application.yml /lavalink/application.yml
COPY lavalink/Lavalink.jar /lavalink/Lavalink.jar
WORKDIR /lavalink
EXPOSE 2333
CMD ["java", "-jar", "Lavalink.jar"]

FROM node:22 AS bot
WORKDIR /bot
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
