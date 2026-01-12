# ChatBot Builder

A visual chatbot builder platform for Facebook Messenger, similar to Chatfuel but simplified.

## Features

- Visual Flow Builder with drag-and-drop interface
- Multiple node types: Text, Image, Quick Reply, User Input, Condition, Delay
- Facebook Messenger integration
- User authentication
- Bot management
- Analytics dashboard

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- React Flow (@xyflow/react)
- Zustand (state management)
- Tailwind CSS
- React Router DOM

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Facebook Developer App (for Messenger integration)

### Installation

1. **Clone and install dependencies**

```bash
cd chatbot-builder

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

2. **Setup environment variables**

Client (`client/.env`):
```
VITE_API_URL=http://localhost:3001/api
```

Server (`server/.env`):
```
DATABASE_URL="postgresql://user:password@localhost:5432/chatbot_builder?schema=public"
JWT_SECRET="your-secret-key"
PORT=3001
```

3. **Setup database**

```bash
cd server
npx prisma db push
npx prisma generate
```

4. **Run the development servers**

```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client
cd client
npm run dev
```

5. **Access the application**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api

## Project Structure

```
chatbot-builder/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── flow-builder/   # Flow editor components
│   │   │   ├── layout/         # Layout components
│   │   │   └── ui/             # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── stores/             # Zustand stores
│   │   ├── api/                # API client
│   │   └── types/              # TypeScript types
│   └── ...
│
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   ├── middlewares/    # Express middlewares
│   │   └── types/          # TypeScript types
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── ...
│
└── README.md
```

## Facebook Messenger Setup

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create a new App (Business type)
3. Add Messenger product
4. Create a Page Access Token
5. Setup Webhook:
   - URL: `https://your-server.com/api/webhook/{botId}`
   - Verify Token: Found in bot settings
   - Subscribe to: `messages`, `messaging_postbacks`

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Bots
- `GET /api/bots` - List user's bots
- `POST /api/bots` - Create bot
- `GET /api/bots/:id` - Get bot
- `PUT /api/bots/:id` - Update bot
- `DELETE /api/bots/:id` - Delete bot

### Flows
- `GET /api/bots/:botId/flows` - List flows
- `POST /api/bots/:botId/flows` - Create flow
- `GET /api/bots/:botId/flows/:flowId` - Get flow
- `PUT /api/bots/:botId/flows/:flowId` - Update flow
- `DELETE /api/bots/:botId/flows/:flowId` - Delete flow

### Webhook
- `GET /api/webhook/:botId` - Webhook verification
- `POST /api/webhook/:botId` - Receive messages

## License

MIT
