# Subscription Protection Setup

This document explains how the subscription protection system works in the EmailResponder application.

## Overview

The `/emailresponder` route is now protected by a subscription system that:
- Checks if users have an active Stripe subscription
- Redirects users without a subscription to `/subscribe`
- Protects all API endpoints that generate or manage email replies

## Architecture

### Database Schema

The system uses two main models:

1. **User Model** - Stores user and subscription information:
   ```prisma
   model User {
     id              String    @id @default(cuid())
     email           String    @unique
     stripeCustomerId String?  @unique
     subscriptionId  String?
     subscriptionStatus String? // 'active', 'canceled', 'past_due', etc.
     subscriptionEndDate DateTime?
     createdAt       DateTime  @default(now())
     updatedAt       DateTime  @updatedAt
     history         History[]
   }
   ```

2. **History Model** - Updated to include user association:
   ```prisma
   model History {
     id            Int      @id @default(autoincrement())
     subject       String
     originalEmail String
     reply         String
     language      String
     tone          String
     createdAt     DateTime @default(now())
     userId        String?
     user          User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
   }
   ```

### Protection Layers

1. **Middleware Protection** (`src/middleware.ts`)
   - Intercepts requests to `/emailresponder`
   - Checks subscription status before allowing access
   - Redirects to `/subscribe` if no active subscription

2. **API Route Protection**
   - All API routes check subscription status
   - Returns 403 error if no active subscription
   - Ensures data isolation between users

3. **Utility Functions** (`src/lib/subscription.ts`)
   - `checkSubscriptionStatus()` - Checks if user has active subscription
   - `verifyStripeSubscription()` - Validates with Stripe API
   - `updateUserSubscription()` - Updates user subscription data

## How to Use

### 1. Demo Setup

For testing purposes, you can create a demo user with an active subscription:

1. Visit the home page (`/`)
2. Click "Setup Demo User" button
3. This creates a user with ID `demo-user-id` and active subscription
4. You can now access `/emailresponder` without being redirected

### 2. Real Implementation

For production use, you'll need to:

1. **Set up Stripe Integration**:
   ```bash
   npm install stripe
   ```

2. **Add Stripe environment variables**:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Implement Authentication**:
   - Replace `mockUserId` with actual user authentication
   - Use session tokens, JWT, or your preferred auth method

4. **Update Stripe Integration**:
   - Replace mock subscription creation with real Stripe checkout
   - Implement webhook handlers for subscription events
   - Add proper error handling for payment failures

### 3. Subscription Flow

1. User visits `/emailresponder`
2. Middleware checks subscription status
3. If no subscription → redirect to `/subscribe`
4. User selects plan and subscribes
5. Stripe processes payment
6. Webhook updates user subscription status
7. User can now access `/emailresponder`

## API Endpoints

### Protected Routes

All these routes require an active subscription:

- `GET /emailresponder` - Main application page
- `POST /api/reply` - Generate email replies
- `GET /api/history` - Get user's email history
- `DELETE /api/history` - Delete all user's history
- `DELETE /api/history/[id]` - Delete specific history item

### Public Routes

- `GET /` - Home page
- `GET /subscribe` - Subscription page
- `POST /api/subscribe` - Create subscription
- `POST /api/demo/setup` - Setup demo user (development only)

## Testing

### Test Subscription Status

```bash
# Check subscription status
curl "http://localhost:3000/api/subscribe?userId=demo-user-id"
```

### Test Protected Route

```bash
# This should redirect to /subscribe if no active subscription
curl "http://localhost:3000/emailresponder"
```

## Security Considerations

1. **User Isolation**: Each user can only access their own data
2. **Subscription Validation**: Both database and Stripe validation
3. **Graceful Degradation**: Proper error handling for API failures
4. **Rate Limiting**: Consider adding rate limiting for API endpoints

## Environment Variables

Add these to your `.env.local`:

```env
# Database
DATABASE_URL="postgresql://..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Stripe (for production)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## Deployment

1. **Database Migration**: Run `npx prisma db push` to update schema
2. **Environment Variables**: Set all required environment variables
3. **Stripe Webhooks**: Configure webhook endpoints for subscription events
4. **Authentication**: Implement proper user authentication system

## Troubleshooting

### Common Issues

1. **Middleware not working**: Check that `src/middleware.ts` exists and is properly configured
2. **Database errors**: Ensure Prisma schema is up to date with `npx prisma generate`
3. **Subscription not recognized**: Verify user has `subscriptionStatus: 'active'` in database
4. **API 403 errors**: Check that user has active subscription and proper user ID

### Debug Mode

To debug subscription checks, add logging to `src/lib/subscription.ts`:

```typescript
console.log('Checking subscription for user:', userId);
console.log('Subscription status:', subscriptionStatus);
``` 