FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    git \
    cmake \
    build-essential \
    curl \
    ca-certificates \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone llama.cpp
RUN git clone --depth 1 https://github.com/ggml-org/llama.cpp.git /llama.cpp

# Build llama-server
RUN cmake -S /llama.cpp -B /llama.cpp/build \
    -DCMAKE_BUILD_TYPE=Release \
    -DGGML_NATIVE=OFF

RUN cmake --build /llama.cpp/build \
    --config Release \
    --target llama-server \
    -j2

# Node backend
COPY package*.json ./

RUN npm install --omit=dev

COPY server.js ./

# Model directory
RUN mkdir -p /models

ENV LLAMA_SERVER=/llama.cpp/build/bin/llama-server

ENV MODEL_PATH=/models/englishai-qwen-Q4_K_M.gguf

ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
