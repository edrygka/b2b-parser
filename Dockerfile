FROM alpine:latest

ARG BUILD_DATE
ARG VCS_REF

# Installs latest Chromium package.
RUN echo @edge http://nl.alpinelinux.org/alpine/edge/community > /etc/apk/repositories \
    && echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories \
    && apk add --no-cache \
    libstdc++@edge \
    chromium@edge \
    harfbuzz@edge \
    nss@edge \
    freetype@edge \
    ttf-freefont@edge \
    nodejs@edge \
    npm@edge \
    && rm -rf /var/cache/* \
    && mkdir /var/cache/apk

# Add Chrome as a user
RUN mkdir -p /usr/src/app \
    && adduser -D chrome \
    && chown -R chrome:chrome /usr/src/app

ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/

COPY ./package.json .
COPY ./package-lock.json .

RUN npm install

COPY . .

CMD npm start