# Deploying Gemma 2 on DigitalOcean for EditFlow

EditFlow supports self-hosted Gemma 2 inference on DigitalOcean. This provides full data sovereignty, zero rate limits, and predictable monthly infrastructure costs for video editing studios.

---

## Architecture Overview

```
Client Messages (WhatsApp/Transcripts)
            ↓
    EditFlow App (Render)
            ↓ HTTPS (OpenAI-compatible /v1)
DigitalOcean GPU Droplet / App Platform
  ├── NGINX Reverse Proxy (Bearer Token Auth + SSL)
  └── Ollama / vLLM runtime serving google/gemma-2-9b-it
```

---

## 1. DigitalOcean Droplet Provisioning

1. In the **DigitalOcean Cloud Console**, create a Droplet:
   - **Distribution**: Ubuntu 22.04 LTS x64
   - **Plan**: GPU Droplet (1x NVIDIA H100 or A10G) OR CPU Droplet with 16GB+ RAM (if testing quantized `gemma-2-2b-it`).
   - **Region**: Choose the region closest to your Render EditFlow deployment.
   - **Authentication**: SSH Key.

2. SSH into your Droplet:
   ```bash
   ssh root@<YOUR_DROPLET_IP>
   ```

---

## 2. Install NVIDIA Drivers & Docker

```bash
# Install Docker and NVIDIA Container Toolkit
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

---

## 3. Launch Gemma 2 Service

Clone or copy the files in this directory:

```bash
docker compose up -d

# Pull the official Google Gemma 2 (9B instruction-tuned model)
docker exec -it editflow-gemma-inference ollama pull gemma2:9b
```

Verify that the local OpenAI-compatible endpoint responds:
```bash
curl http://localhost:11434/v1/models
```

---

## 4. Connect EditFlow to DigitalOcean

In your EditFlow `.env` or Render environment settings:

```env
# Point to your DigitalOcean droplet or subdomain
GEMMA_BASE_URL=https://your-droplet-ip.nip.io/v1
GEMMA_MODEL=gemma2:9b
GEMMA_API_KEY=your-secure-bearer-token
```

EditFlow's `callAI` provider automatically detects the OpenAI-compatible `/v1` endpoint structure, cleans markdown fences, and routes all Mastra intelligence steps through your dedicated DigitalOcean Gemma node.
