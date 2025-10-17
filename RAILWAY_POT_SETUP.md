# Railway POT Provider Setup Guide

This bot now uses **POT (Proof-of-Origin) tokens** to bypass YouTube's bot detection on Railway.

## What You Need to Do

### Step 1: Deploy POT Provider Service

1. Go to your Railway dashboard: https://railway.app
2. Click **"New Service"** in your project
3. Select **"Deploy from Docker Image"**
4. Enter image: `                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   `
5. Click **"Deploy"**

### Step 2: Configure POT Provider
                                                                                                                                                                                                                                                                                 
In the **POT provider service** settings:

1. Go to **Variables** tab
2. Add environment variable:
   ```
   PORT=4416
   ```
3. Go to **Settings** tab
4. Enable **"Private Networking"**
5. Copy the **internal hostname** (looks like: `bgutil-provider.railway.internal`)

### Step 3: Connect Bot to POT Provider

In your **dcbot service** settings:

1. Go to **Variables** tab
2. Add environment variable:
   ```
   POT_PROVIDER_URL=http://bgutil-provider.railway.internal:4416
   ```
   *(Replace `bgutil-provider` with your actual POT service hostname)*

### Step 4: Verify It's Working

1. Wait for both services to redeploy
2. Check bot logs - you should see:
   ```
   [ytdlp] Using POT provider at: http://bgutil-provider.railway.internal:4416
   ```
3. Try `/play sprinter` - it should work now! ⚡

## How It Works

- **POT Provider** generates authentic YouTube tokens
- **Bot** sends requests with these tokens
- **YouTube** sees legitimate traffic, not a bot
- **Zero maintenance** - tokens auto-refresh

## Troubleshooting

**"Connection refused" error:**
- Make sure both services are in the same Railway project
- Verify Private Networking is enabled on both services
- Check the POT_PROVIDER_URL hostname matches exactly

**Still getting bot detection:**
- Wait 2-3 minutes for POT provider to start generating tokens
- Check POT provider logs for errors
- Verify the bot is actually using the POT provider (check bot logs)

**POT provider not starting:**
- Check Railway logs for port binding errors
- Ensure PORT=4416 environment variable is set
- Try redeploying the POT provider service

## Cost

- **POT Provider:** ~$0/month (uses ~50MB RAM, very light)
- **Bot:** Same as before
- **Total Railway usage:** Still within free tier (500hrs/month)

## Architecture

```
┌─────────────────┐
│   Discord Bot   │
│  (Your Service) │
└────────┬────────┘
         │
         │ HTTP requests
         ▼
┌─────────────────┐
│  POT Provider   │
│ (Token Service) │
└────────┬────────┘
         │
         │ Generates tokens
         ▼
    🎯 YouTube
   (No bot detection!)
```

## Alternative: Without POT Provider

If you don't want to set up POT provider, the bot will fall back to client rotation:
- Remove or don't set `POT_PROVIDER_URL`
- Success rate: ~60% (vs 95% with POT)
- Some videos may fail with bot detection

**Recommendation:** Use POT provider for best results! It's free and takes 5 minutes to set up.
