# EmailResponder Deployment Guide

This guide will help you deploy the EmailResponder application to Vercel with all the necessary configurations.

## 🚀 **Prerequisites**

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **Stripe Account** - Sign up at [stripe.com](https://stripe.com)
3. **Clerk Account** - Sign up at [clerk.com](https://clerk.com)
4. **OpenAI Account** - Sign up at [openai.com](https://openai.com)
5. **PostgreSQL Database** - Use Vercel Postgres or any PostgreSQL provider

## 📋 **Environment Variables Setup**

Create a `.env` file in your project root with the following variables:

### **1. Database Configuration**
```env
DATABASE_URL="postgresql://username:password@host:port/database"
```

### **2. OpenAI Configuration**
```env
OPENAI_API_KEY="sk-your-openai-api-key"
```

### **3. Stripe Configuration**
```env
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
STRIPE_PRICE_ID="price_your_stripe_price_id"
```

### **4. Clerk Authentication**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your_clerk_publishable_key"
CLERK_SECRET_KEY="sk_test_your_clerk_secret_key"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/emailresponder"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/emailresponder"
```

### **5. App Configuration**
```env
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

## 🔧 **Setup Instructions**

### **Step 1: Local Development Setup**
1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```
2. Update the `.env` file with your actual values
3. Run the Prisma migration:
   ```bash
   npx prisma migrate deploy
   ```
4. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```

### **Step 2: Stripe Setup**
1. Create a Stripe account and get your API keys
2. Create a product and price in Stripe Dashboard
3. Set up webhook endpoints:
   - URL: `https://your-app.vercel.app/api/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`

### **Step 3: Clerk Setup**
1. Create a Clerk application
2. Configure your application settings
3. Set up the authentication flow
4. Add your domain to allowed origins

### **Step 4: OpenAI Setup**
1. Create an OpenAI account
2. Generate an API key
3. Ensure you have sufficient credits

## 🚀 **Deployment to Vercel**

### **Method 1: Vercel Dashboard**
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard (copy from your `.env` file)
3. Deploy

### **Method 2: Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## 🔍 **Post-Deployment Verification**

### **1. Check Environment Variables**
- Verify all environment variables are set in Vercel
- Test database connection
- Verify Stripe webhook is working

### **2. Test Authentication Flow**
- Test sign-up process
- Test sign-in process
- Verify protected routes are working

### **3. Test API Endpoints**
- Test `/api/reply` endpoint
- Test `/api/history` endpoints
- Test subscription status checks

### **4. Test Stripe Integration**
- Test checkout flow
- Verify webhook processing
- Test subscription management

## 🐛 **Troubleshooting**

### **Common Issues**

#### **1. Prisma Client Generation Fails**
```bash
# Solution: Run these commands
npx prisma generate
npx prisma migrate deploy
```

#### **2. Environment Variables Missing**
- Check Vercel dashboard for all required variables
- Ensure variable names match exactly with your `.env` file
- Verify no typos in variable names

#### **3. Stripe Webhook Failures**
- Verify webhook URL is correct
- Check webhook secret matches your `.env` file
- Ensure all required events are configured

#### **4. Clerk Authentication Issues**
- Verify Clerk keys are correct
- Check domain configuration
- Ensure redirect URLs are properly set

#### **5. Database Connection Issues**
- Verify DATABASE_URL is correct
- Check database is accessible
- Ensure migrations are applied

## 📊 **Monitoring**

### **Vercel Analytics**
- Monitor function execution times
- Check for errors in function logs
- Monitor API usage

### **Stripe Dashboard**
- Monitor webhook deliveries
- Check subscription status
- Review payment processing

### **Clerk Dashboard**
- Monitor user sign-ups
- Check authentication logs
- Review security events

## 🔒 **Security Considerations**

1. **Environment Variables**: Never commit sensitive keys to version control
2. **CORS**: Configure proper CORS settings for your domain
3. **Rate Limiting**: Consider implementing rate limiting for API endpoints
4. **Input Validation**: Ensure all user inputs are properly validated
5. **Error Handling**: Don't expose sensitive information in error messages

## 📈 **Performance Optimization**

1. **Database Indexing**: Add indexes for frequently queried fields
2. **Caching**: Implement caching for subscription status checks
3. **CDN**: Use Vercel's CDN for static assets
4. **Function Optimization**: Keep serverless functions lightweight

## 🆘 **Support**

If you encounter issues:
1. Check the Vercel function logs
2. Review browser console for client-side errors
3. Verify all environment variables are set
4. Test each service individually (Stripe, Clerk, OpenAI)

## 📝 **Notes**

- The application uses Next.js 15 with App Router
- Prisma is configured to generate client in `src/generated/prisma`
- All API routes are protected with Clerk authentication
- Stripe webhooks update the database automatically
- The demo page is read-only and doesn't require authentication
- All environment variables should be stored in a `.env` file locally and configured in Vercel dashboard for production 