# EmailResponder Deployment Guide

This guide will help you deploy the EmailResponder application to Vercel with all the necessary configurations.

## 🚀 **Prerequisites**

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **Clerk Account** - Sign up at [clerk.com](https://clerk.com)
3. **OpenAI Account** - Sign up at [openai.com](https://openai.com)
4. **PostgreSQL Database** - Use Vercel Postgres or any PostgreSQL provider

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

### **3. Clerk Authentication**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your_clerk_publishable_key"
CLERK_SECRET_KEY="sk_test_your_clerk_secret_key"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/emailresponder"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/emailresponder"
```

### **4. App Configuration**
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
3. Run the Drizzle migration:
   ```bash
   npm run db:push
   ```
4. Generate the Drizzle client:
   ```bash
   npm run db:generate
   ```

### **Step 2: Clerk Setup**
1. Create a Clerk application
2. Configure your application settings
3. Set up the authentication flow
4. Add your domain to allowed origins

### **Step 3: OpenAI Setup**
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

### **2. Test Authentication Flow**
- Test sign-up process
- Test sign-in process
- Verify protected routes are working

### **3. Test API Endpoints**
- Test `/api/reply` endpoint
- Test `/api/history` endpoints

## 🐛 **Troubleshooting**

### **Common Issues**

#### **1. Drizzle Client Generation Fails**
```bash
# Solution: Run these commands
npm run db:generate
npm run db:push
```

#### **2. Environment Variables Missing**
- Check Vercel dashboard for all required variables
- Ensure variable names match exactly with your `.env` file
- Verify no typos in variable names

#### **3. Clerk Authentication Issues**
- Verify Clerk keys are correct
- Check domain configuration
- Ensure redirect URLs are properly set

#### **4. Database Connection Issues**
- Verify DATABASE_URL is correct
- Check database is accessible
- Ensure migrations are applied

## 📊 **Monitoring**

### **Vercel Analytics**
- Monitor function execution times
- Check for errors in function logs
- Monitor API usage

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
2. **CDN**: Use Vercel's CDN for static assets
3. **Function Optimization**: Keep serverless functions lightweight

## 🆘 **Support**

If you encounter issues:
1. Check the Vercel function logs
2. Review browser console for client-side errors
3. Verify all environment variables are set
4. Test each service individually (Clerk, OpenAI)

## 📝 **Notes**

- The application uses Next.js 15 with App Router
- Drizzle ORM is configured for database operations
- All API routes are protected with Clerk authentication
- The demo page is read-only and doesn't require authentication
- All environment variables should be stored in a `.env` file locally and configured in Vercel dashboard for production
- **Note**: Payment functionality has been temporarily removed and will be re-integrated with Stripe in a future update 