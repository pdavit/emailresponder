This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Setup

1. Create a `.env.local` file in the root directory with your OpenAI API key and database URL:

```bash
# OpenAI API Key
# Get your API key from https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Database URL (Neon Postgres)
# Get your database URL from https://neon.tech
DATABASE_URL=your_neon_database_url_here
```

2. Set up the database:

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Routes

### Email Reply API (`/api/reply`)

This API generates professional email replies using OpenAI's GPT-4o-mini model and saves them to the database.

**Endpoint:** `POST /api/reply`

**Request Body:**
```json
{
  "subject": "Meeting Request",
  "originalEmail": "Hi, I'd like to schedule a meeting next week.",
  "language": "English",
  "tone": "professional"
}
```

**Response:**
```json
{
  "reply": "Thank you for reaching out. I'd be happy to schedule a meeting..."
}
```

**Features:**
- Supports multiple languages
- Adjustable tone (professional, friendly, formal, etc.)
- Cultural awareness for different regions
- Concise and natural business communication
- Automatically saves to database history

### History API (`/api/history`)

This API manages the history of generated email replies.

**GET `/api/history`** - Returns all history records sorted by creation date (newest first)

**Response:**
```json
[
  {
    "id": 1,
    "subject": "Meeting Request",
    "originalEmail": "Hi, I'd like to schedule a meeting...",
    "reply": "Thank you for reaching out...",
    "language": "English",
    "tone": "professional",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

**DELETE `/api/history`** - Deletes all history records

**Response:**
```json
{
  "message": "All history records deleted successfully"
}
```

### Single Record Delete API (`/api/history/[id]`)

**DELETE `/api/history/[id]`** - Deletes a specific history record by ID

**Response:**
```json
{
  "message": "History record deleted successfully"
}
```

## Database Schema

The application uses a PostgreSQL database with the following schema:

```sql
model History {
  id            Int      @id @default(autoincrement())
  subject       String
  originalEmail String
  reply         String
  language      String
  tone          String
  createdAt     DateTime @default(now())
}
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
