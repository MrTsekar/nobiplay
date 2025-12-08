# Production Deployment Checklist

## Pre-Deployment Security Checklist

### 1. Environment Configuration
- [ ] Copy `.env.production.template` to `.env`
- [ ] Replace ALL placeholder values with real credentials
- [ ] Generate secure JWT secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] Verify `.env` is in `.gitignore`
- [ ] Never commit `.env` to version control

### 2. Database Security
- [ ] Use managed database service (AWS RDS, DigitalOcean, etc.)
- [ ] Set `DB_SYNCHRONIZE=false` (CRITICAL - prevents schema auto-sync)
- [ ] Enable SSL/TLS: `DB_SSL=true`
- [ ] Use strong database password (32+ characters)
- [ ] Restrict database access to application IP only
- [ ] Enable automated backups
- [ ] Set up database monitoring

### 3. Authentication & Authorization
- [ ] Generate unique JWT secret (64+ characters)
- [ ] Set appropriate JWT expiration times
- [ ] Review all JWT guard implementations
- [ ] Test admin authentication flow
- [ ] Verify password hashing is using bcrypt

### 4. CORS Configuration
- [ ] Set `CORS_ORIGIN` to HTTPS domains only
- [ ] Remove all `http://localhost` origins
- [ ] Verify `credentials: true` is needed
- [ ] Test CORS from production frontend
- [ ] Monitor CORS errors in logs

### 5. Redis/Caching
- [ ] Use managed Redis (AWS ElastiCache, Redis Cloud)
- [ ] Set strong Redis password
- [ ] Enable TLS: `REDIS_TLS=true`
- [ ] Configure Redis maxmemory policy
- [ ] Set appropriate TTL values
- [ ] Test cache invalidation

### 6. Payment Gateway Configuration
- [ ] Use LIVE API keys (not test/sandbox)
- [ ] Verify webhook endpoints are accessible
- [ ] Set up webhook signature verification
- [ ] Test payment flow end-to-end
- [ ] Enable payment logging
- [ ] Set up payment monitoring/alerts

### 7. External Services
- [ ] Configure production Firebase credentials
- [ ] Set up Twilio/Termii with production account
- [ ] Configure SendGrid/SES for production
- [ ] Verify all API keys are for production
- [ ] Test email delivery
- [ ] Test SMS delivery
- [ ] Test push notifications

### 8. Monitoring & Logging
- [ ] Enable APM (Elastic APM, New Relic, etc.)
- [ ] Configure Sentry for error tracking
- [ ] Set `LOG_LEVEL=info` or `LOG_LEVEL=warn`
- [ ] Set up log aggregation (CloudWatch, Datadog)
- [ ] Configure alerts for critical errors
- [ ] Set up uptime monitoring

### 9. Rate Limiting & Security
- [ ] Configure appropriate rate limits
- [ ] Enable Helmet.js security headers
- [ ] Review and test throttle guards
- [ ] Set up DDoS protection (Cloudflare)
- [ ] Enable request logging
- [ ] Configure CSP headers

### 10. SSL/TLS
- [ ] Obtain SSL certificate (Let's Encrypt, CloudFlare)
- [ ] Configure HTTPS on web server
- [ ] Redirect HTTP to HTTPS
- [ ] Set HSTS headers
- [ ] Verify SSL configuration (SSL Labs)

---

## Deployment Steps

### Step 1: Prepare Application
```bash
# Install production dependencies only
npm ci --production

# Build the application
npm run build

# Run database migrations
npm run migration:run
```

### Step 2: Environment Setup
```bash
# Copy production template
cp .env.production.template .env

# Edit .env with production credentials
nano .env

# Verify all values are set
grep "CHANGE_ME\|YOUR_" .env  # Should return nothing
```

### Step 3: Database Setup
```bash
# Create production database
# Run migrations
npm run migration:run

# Verify database connection
npm run typeorm:check
```

### Step 4: Deploy Application

**Option A: PM2 (VPS/EC2)**
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/main.js --name nobiplay-backend

# Configure auto-restart
pm2 startup
pm2 save

# Monitor
pm2 monit
```

**Option B: Docker**
```bash
# Build Docker image
docker build -t nobiplay-backend .

# Run container
docker run -d \
  --name nobiplay-backend \
  -p 3000:3000 \
  --env-file .env \
  nobiplay-backend
```

**Option C: Cloud Platform (Heroku, Railway, Render)**
```bash
# Set environment variables in platform dashboard
# Deploy via Git push or GitHub integration
```

### Step 5: Verify Deployment
```bash
# Check health endpoint
curl https://api.yourdomain.com/health

# Check Swagger docs
curl https://api.yourdomain.com/api

# Test authentication
curl -X POST https://api.yourdomain.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"test"}'

# Monitor logs
pm2 logs nobiplay-backend
# or
docker logs -f nobiplay-backend
```

---

## Post-Deployment Checklist

### 1. Smoke Tests
- [ ] Test admin login
- [ ] Test user registration
- [ ] Test payment initiation
- [ ] Test webhook delivery
- [ ] Test email sending
- [ ] Test SMS sending
- [ ] Test push notifications

### 2. Security Verification
- [ ] Run security scan (OWASP ZAP, Burp Suite)
- [ ] Verify HTTPS is working
- [ ] Test CORS configuration
- [ ] Verify rate limiting is active
- [ ] Check for exposed secrets (git-secrets)
- [ ] Review security headers

### 3. Performance Testing
- [ ] Load test critical endpoints
- [ ] Monitor database query performance
- [ ] Check Redis cache hit rates
- [ ] Review API response times
- [ ] Monitor memory usage
- [ ] Check for memory leaks

### 4. Monitoring Setup
- [ ] Verify APM is collecting data
- [ ] Check Sentry is receiving errors
- [ ] Set up alerts for critical metrics
- [ ] Configure log retention policies
- [ ] Set up database monitoring
- [ ] Monitor Redis metrics

---

## Environment Variables Reference

### Generate Secure Values

**JWT Secret (64-byte hex):**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Strong Password (32 characters):**
```bash
openssl rand -base64 32
```

**UUID:**
```bash
node -e "console.log(require('crypto').randomUUID())"
```

---

## Common Issues & Solutions

### Issue: Database Connection Failed
**Solution:**
- Verify `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`
- Check security group rules allow connection
- Verify SSL is enabled if required: `DB_SSL=true`

### Issue: CORS Errors
**Solution:**
- Add frontend domain to `CORS_ORIGIN`
- Use HTTPS URLs, not HTTP
- Include protocol in origin: `https://app.yourdomain.com`
- Check browser console for specific error

### Issue: Payment Webhook Not Working
**Solution:**
- Verify webhook URL is publicly accessible
- Check webhook signature verification
- Enable webhook logging
- Test with provider's webhook testing tool

### Issue: Redis Connection Timeout
**Solution:**
- Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- Check firewall rules
- Enable TLS if required: `REDIS_TLS=true`

---

## Rollback Plan

If deployment fails:

1. **Immediate Rollback:**
   ```bash
   pm2 restart nobiplay-backend --update-env
   # or
   git revert HEAD
   npm run build
   pm2 restart nobiplay-backend
   ```

2. **Database Rollback:**
   ```bash
   npm run migration:revert
   ```

3. **Restore from Backup:**
   - Use database backup from before deployment
   - Restore Redis cache if needed

---

## Support & Resources

- **NestJS Docs:** https://docs.nestjs.com/
- **TypeORM Docs:** https://typeorm.io/
- **PM2 Docs:** https://pm2.keymetrics.io/
- **Sentry Docs:** https://docs.sentry.io/
- **Redis Docs:** https://redis.io/docs/

---

## Emergency Contacts

- DevOps Lead: [Contact Info]
- Database Admin: [Contact Info]
- Payment Provider Support: [Contact Info]
- Hosting Provider Support: [Contact Info]
