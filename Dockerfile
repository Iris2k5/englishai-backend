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
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build llama.cpp
RUN git clone --depth 1 https://github.com/ggml-org/llama.cpp.git /llama.cpp

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

RUN mkdir -p /models

ENV LLAMA_SERVER=/llama.cpp/build/bin/llama-server

ENV MODEL_PATH=/models/englishai-qwen-Q4_K_M.gguf

ENV PORT=3000

# Hugging Face model
ENV HF_MODEL_URL=https://huggingface.co/vinhytb/EnglishAI-Qwen-1.5B/resolve/main/englishai-qwen-Q4_K_M.gguf

EXPOSE 3000

CMD ["sh", "-c", "if [ ! -f \"$MODEL_PATH\" ]; then echo 'Downloading EnglishAI Q4 model...'; wget -O \"$MODEL_PATH\" \"$HF_MODEL_URL\"; fi && node server.js"]
