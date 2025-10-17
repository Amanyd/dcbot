FROM node:22-alpine

# Install build dependencies for FFmpeg compilation
RUN apk add --no-cache \
    bash \
    build-base \
    nasm \
    yasm \
    openssl-dev \
    wget \
    tar \
    python3 \
    py3-pip

# Install yt-dlp and POT provider plugin
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp bgutil-ytdlp-pot-provider

# Download and compile FFmpeg with HTTPS support
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

# install typescript for build
RUN npm install -g typescript

# copy source code
COPY . .

# build typescript
RUN npm run build

# ffmpeg is at /usr/local/bin/ffmpeg
ENV FFMPEG_HTTPS_PATH=/usr/local/bin/ffmpeg

CMD ["npm", "start"]
