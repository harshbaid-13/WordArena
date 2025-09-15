# WordArena

A real-time multiplayer speed-Wordle game where two players race to guess the same target word first.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TailwindCSS, Framer Motion, Zustand
- **Backend:** Node.js (Express) + Socket.io
- **Database:** PostgreSQL (Supabase)
- **Cache/Queue:** Redis (Upstash)
- **Deployment:** Vercel (Frontend), Render (Backend)

## Project Structure

```
WordArena/
├── client/          # Next.js Frontend
├── server/          # Express + Socket.io Backend
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Redis instance (Upstash recommended)

### Server Setup

```bash
cd server
npm install
cp .env.example .env
# Configure your environment variables
npm run prisma:generate
npm run prisma:db-push   # sync schema to your Postgres instance
npm run dev
```

### Client Setup

```bash
cd client
npm install
npm run dev
```

## Game Features

- **Real-time Racing:** Both players guess simultaneously
- **ELO Matchmaking:** Players matched by skill rating
- **Opponent View:** See opponent's progress (colors only, no words)
- **AI Bots:** Entropy-based bot fills in when no opponent found
- **Match History:** Full replay logs stored for analysis

## Key Algorithms

### ELO Rating System

- Standard logistic distribution formula
- K-Factor: 32 for active volatility
- Transaction-safe updates with match history

### AI Bot Engine

- Shannon Entropy Maximization
- 4 Difficulty levels: Easy, Medium, Hard, Impossible
- Pre-computed optimal first guess

## Environment Variables

### Server (.env)

```
PORT=3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-key
```

### Client (.env.local)

```
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
```

## License

MIT
