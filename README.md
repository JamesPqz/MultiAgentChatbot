# AI Chatbot Server
An AI chatbot server that integrates external APIs, built-in knowledge, and vision capabilities while maintaining low latency. 

## Setup Instructions

### Prerequisites
- Node.js
- MongoDB
- A Gemini model API key from Google
- VPN/proxy for Hong Kong users

### Installation
Clone the repository:
git clone https://github.com/SolosCodingInterview/JamesPoon.git
cd backend
npm i

Configure environment variables:
cp .env.example .env

Edit `.env` with your API keys and settings.
Start MongoDB locally:
mongod --dbpath ./data

#### Build/Run the backend:
npm run build / npm run dev
The server will start on port 3000.

#### Build/Run the frontend:
cd frontend
npm i
npm run build
npm run dev

#### Docker deployment:
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker-compose ps
Access the frontend at http://localhost:8080 .

### Testing
Test health:
curl http://localhost:3000/health
Expected response:
{"status":"ok","env":"docker","timestamp":"2026-05-06T03:35:49.453Z"}%  

Send a test request:
```
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```
Expected response:
```
{"success":true,"data":{"sessionId":"1778036896067_p3z9x380","response":"Hello! How can I help you today?","elapsedMs":2383}}%  
```

Test agent with tool call:
```
curl -X POST http://localhost:3000/api/chat/agent \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather in Hong Kong?"}'
```
Expected response:
```
{"success":true,"data":{"sessionId":"1778036992110_jekezu9c","response":"Hong Kong: Showers, 27°C, humidity 80%.","elapsedMs":1751}}%  
```

Test web search:
```
curl -X POST http://localhost:3000/api/chat/agent -H "Content-Type: application/json" -d '{"message": "Search for latest AI news"}'
```
Expected response:
```
{"success":true,"data":{"sessionId":"1778037107061_kgy9r9cp","response":"Artificial Intelligence is transforming industries worldwide. Latest developments include multimodal models and agent-based systems.","elapsedMs":1795}}%  
```

Test vision query:
```
curl -X POST http://localhost:3000/api/chat/agent \
  -H "Content-Type: application/json" \
  -d '{"message": "What color is this image?", "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="}'
```
Expected response:
```
{"success":true,"data":{"sessionId":"1778037268562_kvxu8psw","response":"The color of the image is a shade of **salmon** or **coral**. Its hexadecimal color code is approximately **#FA8072**.","elapsedMs":4141}}% 
```

Test get history:
curl http://localhost:3000/api/history/session_xxx
Expected response:
```
{"success":true,"data":{"sessionId":"1778037268562_kvxu8psw","history":[{"role":"user","content":"What color is this image?","timestamp":"2026-05-06T03:14:28.562Z","_id":"69fab2140075db3e745f4317"},{"role":"assistant","content":"The color of the image is a shade of **salmon** or **coral**. Its hexadecimal color code is approximately **#FA8072**.","timestamp":"2026-05-06T03:14:33.698Z","_id":"69fab2190075db3e745f431a"}]}}%   
```

Test delete history:
curl -X DELETE http://localhost:3000/api/history/session_xxx
Expected response:
{"success":true,"message":"History cleared","data":null}%    

## API Endpoints

| Method | Endpoint                | Description                      |
|--------|-------------------------|----------------------------------|
| POST   | /api/chat               | Text chat without tools          |
| POST   | /api/chat/agent         | Full agent with tools and vision |
| GET    | /api/history/:sessionId | Get chat history                 |
| DELETE | /api/history/:sessionId | Clear chat history               |
| GET    | /health                 | Health check                     |

### Response Format
Refer to Testing

## Environment Variables

Required variables:

| Variable       | Description                                                       |
|----------------|-------------------------------------------------------------------|
| GEMINI_API_KEY | Your Gemini API key                                               |
| MONGODB_URI    | MongoDB connection string                                         |
| PROXY_ENABLED  | Set to true if behind proxy                                       |
| PROXY_HOST     | Proxy host (127.0.0.1 for local, host.docker.internal for Docker) |
| PROXY_PORT     | Proxy port (default 7897)                                         |

Optional variables:

| Variable           | Default                       | Description               |
|--------------------|-------------------------------|---------------------------|
| PORT               | 3000                          | Server port               |
| GEMINI_MODEL       | gemini-3.1-flash-lite-preview | Model name                |
| GEMINI_TEMPERATURE | 0.7                           | Response randomness       |
| API_TIMEOUT_MS     | 5000                          | Timeout for external APIs |

## Optimizations
- Intent detection routes simple queries (weather, search) directly use tool
- External API calls have timeout fallbacks to mock data
- MongoDB indexes on sessionId for fast history retrieval
- Docker health checks for service monitoring

## Considerations
- Hong Kong users maybe need a proxy to access Gemini API
- Real weather and search APIs require additional API keys
- Mock data is used when real APIs timeout or keys are missing
- Chat history persists across sessions using sessionId
- Model response time may exceed 5 seconds due to external factors
