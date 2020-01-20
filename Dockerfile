FROM node:10
COPY app.js .
COPY my.env.defaults .
COPY public ./public
COPY package.json .
RUN npm install
EXPOSE  8080
CMD node app.js
