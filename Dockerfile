FROM node:22-alpine

# install build deps for ffmpeg
RUN apk add --no-cache \
    bash \
    python3 \
    yt-dlp \
    build-base \
    yasm \
    nasm \
    pkgconfig \
    openssl-dev \
    git

# build ffmpeg with https support
WORKDIR /tmp
RUN git clone --depth 1 https://git.ffmpeg.org/ffmpeg.git && \
    cd ffmpeg && \
    ./configure \
        --prefix=/usr/local \
        --enable-openssl \
        --enable-gpl \
        --enable-nonfree \
        --disable-doc \
        --disable-debug && \
    make -j$(nproc) && \
    make install && \
    cd / && rm -rf /tmp/ffmpeg

# verify https support
RUN ffmpeg -protocols 2>&1 | grep https

# setup bot
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# ffmpeg is at /usr/local/bin/ffmpeg
ENV FFMPEG_HTTPS_PATH=/usr/local/bin/ffmpeg

CMD ["npm", "start"]
