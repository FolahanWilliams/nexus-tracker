# QuestFlow - Duolingo-Style Productivity App

A fun, interactive task management app inspired by Duolingo's gamified learning experience. Transform your boring todo list into an epic quest adventure with a cute mascot, XP system, and rewards!

## ✨ Features

- **Dashboard**: Colorful home screen with quest path, XP progress, and daily challenges
- **Quests**: Add and complete quests with difficulty levels (Easy, Medium, Hard, Epic)
- **Shop**: Spend gems on custom rewards and power-ups
- **Analytics**: Track your productivity streak and achievements
- **AI Quest Generator**: Let Gemini AI create quests for you
- **Cute Mascot**: Animated owl companion that reacts to your progress!

## 🎨 Design (Duolingo-Inspired)

The app features a fun, colorful design inspired by Duolingo:
- **Bright green (#58cc02)** primary color like Duolingo
- Cute mascot character with multiple emotions
- Circular "lesson" buttons like Duolingo's learning path
- XP bar with shimmer animation
- Heart lives system and streak counter
- Fun button press animations with 3D shadows
- Mobile-first responsive design with bottom navigation
- Celebratory animations when completing quests

## 📱 Pages

1. **Dashboard** (`/`) - Overview and quick stats
2. **Quests** (`/quests`) - Manage all your quests with AI generation
3. **Shop** (`/shop`) - Buy rewards with your earned gold
4. **Analytics** (`/analytics`) - View detailed productivity statistics
5. **Achievements** (`/achievements`) - Track and unlock achievements

## 🔐 Authentication & Data Persistence

### Current Setup (Local Storage)
Your data is currently stored in your browser's local storage. This means:
- ✅ Data persists between sessions on the same device/browser
- ✅ Works immediately without setup
- ❌ Data doesn't sync across devices
- ❌ Clearing browser data will reset progress

### Recommended: Add Google Authentication

To save your progress across devices and keep it secure, I recommend adding authentication with **NextAuth.js** and Google Provider. Here's how:

#### Step 1: Install Dependencies

```bash
npm install next-auth@beta @auth/prisma-adapter prisma @prisma/client
```

#### Step 2: Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Configure the OAuth consent screen
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy the Client ID and Client Secret

#### Step 3: Set up Database (PostgreSQL with Prisma)

Create a `.env` file with:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/questflow"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

#### Step 4: Create Prisma Schema

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  emailVerified DateTime?
  accounts      Account[]
  sessions      Session[]
  gameData      GameData?
}

model GameData {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  xp        Int      @default(0)
  level     Int      @default(1)
  gold      Int      @default(0)
  streak    Int      @default(0)
  tasks     Json     @default("[]")
  shopItems Json     @default("[]")
  purchasedRewards Json @default("[]")
  achievements Json @default("[]")
  updatedAt DateTime @updatedAt
}
```

Run:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

#### Step 5: Create Auth Configuration

Create `src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session?.user) {
        session.user.id = user.id
        // Load game data
        const gameData = await prisma.gameData.findUnique({
          where: { userId: user.id }
        })
        session.user.gameData = gameData
      }
      return session
    },
  },
}
```

#### Step 6: Create API Route

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

#### Step 7: Update Navigation Component

Replace the guest user button with actual sign in/sign out buttons:

```typescript
import { signIn, signOut, useSession } from "next-auth/react"

// In Navigation component
const { data: session } = useSession()

// Replace user profile section with:
{session ? (
  <button onClick={() => signOut()}>
    {/* Show user info */}
  </button>
) : (
  <button onClick={() => signIn("google")}>
    Sign in with Google
  </button>
)}
```

### Alternative: Quick Firebase Setup

For a simpler setup without a backend server, use Firebase Authentication:

```bash
npm install firebase
```

Then configure Firebase in your app. This syncs data across devices without needing your own database.

## 🚀 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🤖 AI Quest Generation

The app uses Google's Gemini 3.0 Flash model to generate quest suggestions. Make sure to set your API key:

```env
GOOGLE_API_KEY=your_api_key_here
```

Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

## 🛠 Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Zustand** (state management)
- **Recharts** (analytics)
- **Canvas Confetti** (celebrations)
- **Google Generative AI** (Gemini 3.0 Flash)

## 📄 License

MIT
