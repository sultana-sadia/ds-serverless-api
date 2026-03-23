# Movie Reviews API

A serverless REST API I built for my Enterprise Web Development assignment 1. It lets users post and manage movie reviews, with proper authentication so only logged-in users can add or edit reviews.

## What I built

The whole thing runs on AWS - no servers to manage. I used CDK to provision everything automatically, which was honestly pretty cool once I got my head around it.

**Tech stack:**
- AWS Lambda for all the backend logic
- DynamoDB for storing everything in one table
- API Gateway to expose the REST endpoints
- Cognito for handling user signup/login

## The API endpoints

### Authentication
You need to sign up and sign in before you can post or update reviews. The token you get back goes in a Cookie header.

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | /auth/signup | Create an account |
| POST | /auth/confirm_signup | Verify your email |
| POST | /auth/signin | Log in, get your token |
| GET | /auth/signout | Log out |

### Reviews
GET requests are open to everyone. POST and PUT need a valid token.

| Method | Endpoint | Needs login? | What it does |
|--------|----------|-------------|-------------|
| GET | /movies/{movieId}/reviews | No | Get all reviews for a movie |
| GET | /movies/{movieId}/reviews?reviewer=userA | No | Get one reviewer's take |
| GET | /reviews?movie=1234&published=2024 | No | Find reviews by date |
| POST | /movies/reviews | Yes | Add your review |
| PUT | /movies/{movieId}/reviews | Yes | Edit your own review |

## Database design

I went with the single-table DynamoDB pattern as specified. Everything lives in one table called `MovieReviews`:

- Movies use `m#movieID` as both PK and SK
- Reviews use `m#movieID` as PK and `r#reviewerID` as SK
- There's a Local Secondary Index on `reviewDate` so date-based queries work properly

## Security

- Anyone can read reviews without logging in
- You need a JWT token to post or update
- The PUT endpoint checks that you're only editing your own review, not someone else's
- Tokens come from Cognito and get verified by a custom Lambda authorizer

## How to deploy it yourself

You'll need Node.js, the AWS CLI configured, and CDK installed.
```bash
npm install
cdk deploy
```

That's it. CDK handles everything else.

## Testing it out

**Sign up:**
```json
POST /auth/signup
{
  "username": "userA",
  "password": "passwA!1",
  "email": "your@email.com"
}
```

**Sign in:**
```json
POST /auth/signin
{
  "username": "userA",
  "password": "passwA!1"
}
```

**Add a review** (put your token in a Cookie header):
```json
POST /movies/reviews
{
  "movieId": 1234,
  "reviewDate": "2024-05-01",
  "content": "Honestly one of the best films I've seen"
}
```

**Update your review:**
```json
PUT /movies/1234/reviews
{
  "content": "Still think it's brilliant, even on rewatch"
}
```

## What's implemented

- All GET endpoints working and publicly accessible
- POST endpoint with authentication
- PUT endpoint - only lets you edit your own reviews
- Cognito user auth (signup, confirm, signin, signout)
- DynamoDB LSI for date-based queries
- Custom Lambda authorizer for JWT validation
- Single-table DynamoDB design