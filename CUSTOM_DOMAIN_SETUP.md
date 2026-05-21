# 🌐 SET UP CUSTOM DOMAIN FOR YOUR LAMBDA APP

## Option 1: Register Domain on AWS Route53 (Recommended)

### Step 1: Register Domain
```bash
# Go to AWS Route53 Console:
# https://console.aws.amazon.com/route53/

# Click "Registered domains" → "Register domain"
# Search for: cryptofolio.app.in
# Cost: ~$10-15/year for .in domains

# If already registered elsewhere, skip to Step 4
```

### Step 2: Create SSL Certificate
```bash
# Go to AWS Certificate Manager (ACM):
# https://console.aws.amazon.com/acm/

# Click "Request a certificate"
# - Domain name: cryptofolio.app.in
# - Validation: DNS
# - AWS will generate CNAME records for you
```

### Step 3: Create API Gateway Custom Domain

**Option A: Using Serverless Plugin (Recommended)**

Install the plugin:
```bash
npm install --save-dev serverless-domain-manager
```

Update `serverless.yml`:
```yaml
plugins:
  - serverless-offline
  - serverless-dynamodb-local
  - serverless-domain-manager

custom:
  customDomain:
    domainName: cryptofolio.app.in
    certificateName: cryptofolio.app.in
    basePath: ''
    stage: dev
    createRoute53Record: true
    region: ap-southeast-1

functions:
  api:
    handler: server/handler.handler
    events:
      - httpApi:
          path: /{proxy+}
          method: ANY
      - httpApi:
          path: /
          method: ANY
```

Deploy:
```bash
npm run build:all
serverless create_domain
serverless deploy
```

**Option B: Manual Setup in API Gateway**

1. Go to AWS API Gateway Console
2. Find your API: `crypto-portfolio-api-dev`
3. Click "Custom domain names"
4. Create custom domain:
   - Domain name: `cryptofolio.app.in`
   - Certificate: Select from ACM
   - Endpoint type: Regional
   - Target domain: Your current endpoint
5. Route53 will auto-create DNS records

### Step 4: If Domain Already Registered Elsewhere

**Update your DNS provider:**

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Add CNAME record:
   ```
   Name: cryptofolio
   Type: CNAME
   Value: d-xxxxxxxx.execute-api.ap-southeast-1.amazonaws.com
   ```
   (Replace with your actual API Gateway endpoint)

3. Add A record:
   ```
   Name: cryptofolio
   Type: A
   Alias: Yes
   Alias Target: [Your API Gateway endpoint]
   ```

---

## Option 2: Using Route53 + API Gateway (Complete Setup)

### Step 1: Register in Route53
```
AWS Console → Route53 → Register Domain
- Domain: cryptofolio.app.in
- Duration: 1 year minimum
- Cost: ~$10-15/year
```

### Step 2: Create ACM Certificate
```
AWS Console → Certificate Manager (ACM)
- Request new certificate
- Domain: cryptofolio.app.in
- Validation: DNS (automatic)
- Region: ap-southeast-1
```

### Step 3: Create Hosted Zone (if not auto-created)
```
Route53 → Hosted Zones → Create Hosted Zone
- Domain: cryptofolio.app.in
- Type: Public
```

### Step 4: Create Custom Domain in API Gateway
```
API Gateway → Custom Domain Names
- Domain Name: cryptofolio.app.in
- Certificate: [Select your ACM cert]
- Endpoint type: Regional (ap-southeast-1)
- Target domain: [Your current Lambda endpoint]
```

### Step 5: Create Route53 A Record
```
Route53 → Hosted Zone → Create Record
- Name: cryptofolio.app.in (or leave blank for root)
- Type: A
- Alias: Yes
- Alias target: [Your API Gateway endpoint]
- Region: ap-southeast-1
```

---

## 🚀 QUICKEST PATH (Recommended)

### If you don't have a domain yet:
```bash
# 1. Register on Route53 (or use existing registrar)
Domain: cryptofolio.app.in

# 2. Create ACM certificate
ACM Console → Request Certificate → cryptofolio.app.in

# 3. Update serverless.yml with plugin
npm install --save-dev serverless-domain-manager

# 4. Deploy with custom domain
serverless create_domain
npm run deploy
```

### If you already have domain elsewhere:
```bash
# 1. Add CNAME to your DNS provider
Name: cryptofolio
Value: d-xxxxxxxx.execute-api.ap-southeast-1.amazonaws.com

# 2. Wait 24-48 hours for DNS propagation

# 3. Access via: cryptofolio.app.in
```

---

## 📋 CURRENT vs NEW

| Aspect | Current | New |
|--------|---------|-----|
| **URL** | https://08f8vcbldj.execute-api.ap-southeast-1.amazonaws.com/ | https://cryptofolio.app.in/ |
| **SSL** | ✅ Auto (AWS) | ✅ Auto (AWS) |
| **Cost** | $0/month (Lambda only) | ~$0.84/month (Route53) + $0 (custom domain) |
| **Professional** | ❌ Long auto-generated | ✅ Short & branded |

---

## ⚡ FASTEST OPTION (2 Steps)

### Step 1: Install & Update serverless.yml
```bash
npm install --save-dev serverless-domain-manager
```

Add to `serverless.yml`:
```yaml
plugins:
  - serverless-offline
  - serverless-dynamodb-local
  - serverless-domain-manager

custom:
  customDomain:
    domainName: cryptofolio.app.in
    certificateName: cryptofolio.app.in
    basePath: ''
    stage: dev
    createRoute53Record: true
    region: ap-southeast-1
```

### Step 2: Deploy
```bash
npm run build:all
serverless create_domain
serverless deploy
```

**Done!** Your app will be at `https://cryptofolio.app.in/` ✅

---

## 🔍 COST BREAKDOWN

| Service | Cost |
|---------|------|
| Lambda | Free tier (~1M invocations) |
| Custom Domain | $0.50/month |
| Route53 Hosted Zone | $0.50/month (if created) |
| ACM Certificate | FREE |
| **Total** | ~$1/month |

---

## ❓ QUESTIONS YOU MIGHT HAVE

**Q: Do I need to own cryptofolio.app.in?**
A: Yes, you need to register or own the domain

**Q: Can I use cryptofolio.app.in if it's taken?**
A: No, domains must be unique. You could try:
- cryptofolio-app.in
- mycrpytofolio.app.in
- cryptofolio-portfolio.app.in

**Q: How long does it take?**
A: DNS propagation: 15 minutes to 48 hours

**Q: Can I change back to the old URL?**
A: Yes, both URLs will work simultaneously

**Q: What about HTTPS?**
A: ✅ Automatic with AWS (free SSL certificate)

---

## 🎯 NEXT STEPS

1. **Decide on domain name**
   - cryptofolio.app.in (check availability)
   - or custom domain you prefer

2. **Register domain** (if needed)
   - AWS Route53, GoDaddy, Namecheap, etc.

3. **Choose setup method**
   - Option 1: Serverless plugin (easiest)
   - Option 2: Manual API Gateway setup

4. **Deploy**
   ```bash
   npm run build:all
   serverless deploy
   ```

5. **Wait for DNS**
   - Usually 15-30 minutes
   - Max 48 hours

---

## 📞 NEED HELP?

Which option would you like help with?
1. Register new domain
2. Use existing domain
3. Serverless plugin setup
4. Manual API Gateway setup

Let me know! I can set it up for you step-by-step.
