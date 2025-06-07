#!/bin/bash

echo "🚀 Starting Vercel deployment for Zynlo Helpdesk..."

# Clean up any existing configuration
echo "🧹 Cleaning up old configurations..."
rm -rf .vercel
rm -f vercel.json
rm -rf apps/dashboard/.vercel
rm -f apps/dashboard/vercel.json

# Create vercel.json with proper monorepo configuration
echo "📝 Creating Vercel configuration..."
cat > vercel.json << EOF
{
  "buildCommand": "cd apps/dashboard && pnpm build",
  "installCommand": "pnpm install",
  "outputDirectory": "apps/dashboard/.next"
}
EOF

# Deploy with explicit settings
echo "🔧 Starting deployment..."
vercel --prod --yes \
  --env NODE_ENV=production \
  --env NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --env SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
  --env NEXTAUTH_URL=https://zynlo-helpdesk.vercel.app \
  --env NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
  --env GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
  --env GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET \
  --env OPENAI_API_KEY=$OPENAI_API_KEY

echo "✅ Deployment completed!" 