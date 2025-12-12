# 🚨 Sentry Error Tracking & Monitoring

## 📊 Plan: Business ($80/mo)

### Features Enabled:
- ✅ **Error Tracking**: Automatic exception capture
- ✅ **Performance Monitoring**: Slow API tracking
- ✅ **Profiling**: CPU & memory analysis
- ✅ **90 Day Retention**: Historical data
- ✅ **Unlimited Dashboards**: Custom monitoring
- ✅ **Unlimited Alerts**: Real-time notifications

---

## 🔧 Setup Complete

### 1. Packages Installed
```bash
npm install @sentry/node @sentry/profiling-node
```

### 2. Configuration
- **DSN**: Added to `ENV_COMPLETE.env`
- **Integration**: Added to `server/index.ts`
- **Environment**: Auto-detected (dev/production)

### 3. Features Enabled
```typescript
✅ Request tracking
✅ Performance tracing
✅ Error capturing
✅ CPU profiling
✅ Custom context
```

---

## 🧪 Testing

### Local Test
```bash
# 1. Copy DSN to your .env
SENTRY_DSN=https://05874212af84adfc63a706c727044f85@o4510519361470464.ingest.de.sentry.io/4510519434608720

# 2. Start server
npm run dev

# 3. Trigger test error
curl http://localhost:5000/api/sentry-test

# 4. Check Sentry dashboard
# Error should appear within seconds!
```

### Production Test
```bash
# After Railway deployment
curl https://your-app.railway.app/api/sentry-test

# Check Sentry dashboard
```

---

## 📊 Dashboard Access

### 1. Login to Sentry
```
https://sentry.io/
```

### 2. View Issues
```
https://merf.sentry.io/issues/
```

### 3. Performance Monitoring
```
https://merf.sentry.io/performance/
```

---

## 🎯 What Gets Tracked?

### Automatic Tracking
```
✅ Unhandled exceptions
✅ API errors (500, 404, etc.)
✅ Database errors
✅ Timeout errors
✅ Memory issues
✅ Slow API calls (>1s)
```

### Custom Tracking
```typescript
// In your code
import * as Sentry from '@sentry/node';

// Track custom errors
try {
  // risky code
} catch (error) {
  Sentry.captureException(error);
}

// Add breadcrumbs
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'User login attempt',
  level: 'info',
});

// Set user context
Sentry.setUser({
  id: userId,
  username: username,
});
```

---

## 🔔 Alerts Setup

### Email Alerts (Already Enabled)
```
✅ High priority issues
✅ 10+ occurrences in 1 minute
✅ Sent to: your-email@domain.com
```

### Recommended Additional Alerts

#### 1. Slack Integration
```
Settings → Integrations → Slack
• New issues
• Performance degradation
• Error spikes
```

#### 2. Anomaly Detection
```
Alerts → Create Alert Rule
• Error rate increase >50%
• Response time >2s
• Memory usage >80%
```

---

## 📈 Performance Monitoring

### What to Watch

#### 1. API Response Times
```
Target: <200ms average
Alert: >1s
Critical: >3s
```

#### 2. Error Rate
```
Target: <0.1%
Alert: >1%
Critical: >5%
```

#### 3. Memory Usage
```
Target: <500MB
Alert: >1GB
Critical: >1.5GB
```

---

## 🔥 Common Issues & Fixes

### Issue 1: Too Many Alerts
```typescript
// Adjust sample rate in server/index.ts
tracesSampleRate: 0.1  // Sample 10% in production
```

### Issue 2: Sensitive Data in Logs
```typescript
// Add beforeSend filter
beforeSend(event, hint) {
  // Remove sensitive data
  if (event.request?.headers) {
    delete event.request.headers['authorization'];
  }
  return event;
}
```

### Issue 3: Performance Issues
```typescript
// Reduce profiling rate
profilesSampleRate: 0.1  // Profile 10% of traces
```

---

## 💡 Best Practices

### 1. Use Tags for Filtering
```typescript
Sentry.setTag("payment_method", "stripe");
Sentry.setTag("user_tier", "premium");
```

### 2. Add Context to Errors
```typescript
Sentry.setContext("trade", {
  symbol: "AAPL",
  quantity: 100,
  price: 150.50
});
```

### 3. Group Similar Errors
```typescript
Sentry.setFingerprint(["database-connection-error"]);
```

---

## 📊 Key Metrics to Track

### Daily Checks
```
1. Error count (should be <10/day)
2. New unique errors (investigate all)
3. Performance degradation (>20% slower)
```

### Weekly Reviews
```
1. Top 10 most common errors
2. Slowest API endpoints
3. Memory leak trends
4. User impact analysis
```

---

## 🚀 Next Steps

### 1. Test Error Tracking
```bash
# Trigger test error
curl http://localhost:5000/api/sentry-test

# Check Sentry dashboard
# Should see error within 5 seconds
```

### 2. Deploy to Railway
```bash
# Push changes
git add .
git commit -m "Add Sentry error tracking"
git push

# Railway auto-deploys with SENTRY_DSN
```

### 3. Set Up Alerts
```
1. Go to Sentry → Alerts
2. Create alert for "High error rate"
3. Add Slack integration
4. Test alert
```

---

## 🎯 Success Criteria

After setup, you should have:
- ✅ Errors appear in Sentry within 5 seconds
- ✅ Email alerts working
- ✅ Performance data visible
- ✅ User context attached to errors
- ✅ API endpoints tracked

---

## 📞 Support

### Sentry Docs
- https://docs.sentry.io/platforms/node/guides/express/

### Business Plan Support
- Priority email support
- Technical account manager (if needed)
- SLA: 24h response time

---

## 💰 Cost Optimization

Your Business plan ($80/mo) includes:
- 50K errors/month
- 100K transactions/month
- 1K profiles/month

**Current usage estimate:**
- Errors: ~1K/month (well under limit)
- Transactions: ~50K/month (safe)
- Profiles: ~500/month (safe)

**No additional costs expected!** 🎉
