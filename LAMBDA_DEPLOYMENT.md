# AWS Lambda Deployment Guide

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured locally
- Node.js 22.x
- Serverless Framework CLI

## Setup Instructions

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../vite-project
npm install
```

### 2. Configure AWS Credentials

```bash
# Configure AWS CLI with your credentials
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### 4. Build Frontend

```bash
cd vite-project
npm run build
```

### 5. Deploy to AWS Lambda

#### Option A: Using Serverless Framework (Recommended)

```bash
# Install Serverless Framework globally
npm install -g serverless

# Deploy to AWS
serverless deploy --region us-east-1

# Get API endpoint
serverless info --region us-east-1
```

#### Option B: Using GitHub Actions (Recommended for CI/CD)

1. Add AWS credentials to GitHub Secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

2. Push to `main` or `deploy` branch to trigger automatic deployment

3. Check GitHub Actions tab for deployment status

### 6. Test the Deployment

```bash
# Health check
curl https://your-api-endpoint/health

# Test API
curl https://your-api-endpoint/api/data
```

## Local Development

### Run Locally

```bash
npm start
```

This starts both the backend server and frontend dev server.

### Run Backend Only

```bash
npm run server
```

### Run Frontend Only

```bash
npm run client
```

### Test Lambda Locally

```bash
serverless offline start
```

## Monitoring & Logs

### CloudWatch Logs

```bash
# View recent logs
serverless logs -f api

# Follow logs in real-time
serverless logs -f api -t
```

### AWS Console

1. Go to AWS Lambda console
2. Select your function `crypto-portfolio-api`
3. View logs in CloudWatch

## Troubleshooting

### Common Issues

1. **Timeout Error**
   - Increase timeout in `serverless.yml` (max 15 minutes)
   - Check API responses taking too long

2. **Memory Issues**
   - Increase `memorySize` in `serverless.yml` (128MB - 10GB)
   - Default is 512MB

3. **CORS Errors**
   - Check `CORS_ORIGIN` environment variable
   - Ensure preflight requests are handled

4. **Cold Start Issues**
   - Install `serverless-plugin-warmup` to keep functions warm
   - Increase memory for faster execution

## Cost Optimization

- Free tier: 1M requests/month + 400,000 GB-seconds/month
- Monitor CloudWatch metrics for optimization opportunities
- Use API Gateway caching for repeated requests

## Database Integration

For database connections:

1. VPC configuration may be needed for RDS access
2. Use connection pooling for Lambda
3. Consider DynamoDB for serverless-native solutions

## Next Steps

1. Deploy frontend to S3/CloudFront
2. Add database integration
3. Configure custom domain
4. Set up monitoring and alerts
5. Implement authentication

## Support & Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Serverless Framework Docs](https://www.serverless.com/framework/docs)
- [Express + Lambda Guide](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html)
