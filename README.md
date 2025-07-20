# Gemini Backend Clone

A Node.js (Express Js) backend for chatroom and subscription management, integrating Google Gemini AI and Stripe for payments. Features JWT authentication, Redis caching, BullMQ queue processing, and robust error handling.

---

## 1. Setup & Run

### Prerequisites
- Node.js (v22.16.0, v18+ recommended)
- MongoDB (local or Atlas)
- Redis (local or Upstash)
- Stripe account & CLI

### Installation

```sh
git clone https://github.com/deepanshu1531/gemini-backend-clone.git
cd gemini-backend-clone
npm install
```

### Environment Variables

Copy `.env` and fill in:

```
BACKEND_URL=<your-backend-url>
MONGODB_URI=<your-mongo-uri>
JWT_SECRET=<your-jwt-secret>
GEMINI_API_KEY=<your-gemini-api-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
STRIPE_PRO_PRICE_ID=<your-stripe-price-id>
STRIPE_PRODUCT_ID=<your-stripe-product-id>
```
For local Redis setup

```
REDIS_HOST=localhost
REDIS_PORT=<your-redis-port>
```
For remote Redis setup

```
REDIS_URL=<your-redis-url>
```

### Start Server

```sh
npm start
```

---

## 2. Architecture Overview

- **Express.js**: Main HTTP server ([server.js](server.js))
- **MongoDB/Mongoose**: Data models ([models/](models/))
- **Redis**: Caching & BullMQ queue ([config/redis.js](config/redis.js))
- **BullMQ**: Background job processing ([config/gemini.queue.js](config/gemini.queue.js))
- **Stripe**: Subscription & payment ([services/stripe.service.js](services/stripe.service.js))
- **Gemini AI**: Chatroom AI responses ([services/gemini.service.js](services/gemini.service.js))
- **JWT Auth**: Secure endpoints ([middlewares/auth.middleware.js](middlewares/auth.middleware.js))

---

## 3. Queue System Explanation

- Uses [BullMQ](https://docs.bullmq.io/) for job queueing.
- Jobs for Gemini AI responses are added to `gemini-queue`.
- Worker ([config/gemini.queue.js](config/gemini.queue.js)) processes jobs, generates AI replies, and updates chatroom messages.
- Queue is backed by Redis for reliability and scalability.

---

## 4. Gemini API Integration

- Integrated via [`GoogleGenerativeAI`](services/gemini.service.js).
- When a user sends a message, it’s queued for Gemini processing.
- AI response is generated and appended to the chatroom asynchronously.

---

## 5. Assumptions & Design Decisions

- **User Model**: Supports signup via email or mobile.
- **OTP**: Used for mobile verification ([services/otp.service.js](services/otp.service.js)).
- **Subscription**: Default plan is 'basic'; 'pro' unlocks unlimited prompts.
- **Rate Limiting**: Basic users limited to 5 prompts/day ([middlewares/rateLimit.middleware.js](middlewares/rateLimit.middleware.js)).
- **Caching**: Chatroom lists cached in Redis for performance.
- **Stripe Webhook**: Handled at `/webhook/stripe` ([routes/stripe.routes.js](routes/stripe.routes.js)).
- **Error Handling**: Centralized ([middlewares/errorHandler.middleware.js](middlewares/errorHandler.middleware.js)).

---

## 6. Testing via Postman

### Authentication

- **Signup**: `POST /auth/signup`
- **Send OTP**: `POST /auth/send-otp`
- **Verify OTP**: `POST /auth/verify-otp`
- **Forget Password**: `POST /auth/forgot-password`
- **Change Password**: `POST /auth/change-password` (JWT required)
- **Get User**: `GET /auth/me` (JWT required)
- **Login**: Use JWT from signup/verify OTP

### Chatroom

- **Create Chatroom**: `POST /chatroom` (JWT required)
- **List Chatrooms**: `GET /chatroom` (JWT required)
- **Specific Chatroom**: `GET /chatroom/:id` (JWT required)
- **Send Message**: `POST /chatroom/:id/message` (JWT required)

### Subscription

- **Initiate Pro Subscription**: `POST /subscribe/pro` (JWT required)
- **Check Status**: `GET /subscription/status` (JWT required)

### Stripe Webhook

- **Handles Stripe webhook events**: `POST /webhook/stripe`

- **Use Stripe CLI:**
  ```sh
  stripe listen --forward-to <your-backend-url>/webhook/stripe
  stripe trigger checkout.session.completed
  ```

---

## 7. Access & Deployment

### Local

- Ensure MongoDB and Redis are running.
- Start server: `npm start`
- Access API at `<your-backend-url>`

### Deployment

- [Live URL](https://gemini-backend-clone-d5io.onrender.com)

- Set environment variables on your cloud provider.
- Use managed MongoDB (Atlas) and Redis (Upstash/Render).
- Keep Stripe CLI running for webhook events in development.
- For production, configure Stripe webhook to point to your deployed `/webhook/stripe` endpoint.

---

## References

- [Stripe Docs](https://docs.stripe.com/get-started)
- [Redis Docs](https://redis.io/docs/latest/)
- [BullMQ Docs](https://docs.bullmq.io/)
- [Gemini API Docs](https://ai.google.dev/)

## Developer Contact

- **Name:** Deepanshu Verma
- **Contact Number:** +919131283011
- **Portfolio:** [Portfolio](https://deepanshu1531.github.io/portfolio/#)