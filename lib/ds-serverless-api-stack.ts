import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { generateBatch } from "../shared/util";
import { movies, reviews } from "../seed/movies";
import { Construct } from "constructs";

export class DsServerlessApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========== COGNITO ==========
    const userPool = new cognito.UserPool(this, "UserPool", {
      signInAliases: { username: true, email: true },
      selfSignUpEnabled: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = userPool.addClient("AppClient", {
      authFlows: { userPassword: true },
    });

    const userPoolId = userPool.userPoolId;
    const userPoolClientId = userPoolClient.userPoolClientId;

    // ========== DYNAMODB ==========
    const reviewsTable = new dynamodb.Table(this, "ReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieReviews",
    });

    // LSI for date-based queries
    reviewsTable.addLocalSecondaryIndex({
      indexName: "reviewDateIx",
      sortKey: { name: "reviewDate", type: dynamodb.AttributeType.STRING },
    });

    // Seed data
    new custom.AwsCustomResource(this, "reviewsInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [reviewsTable.tableName]: generateBatch([
              ...movies.map((m) => ({
                PK: `m#${m.id}`,
                SK: `m#${m.id}`,
                ...m,
              })),
              ...reviews.map((r) => ({
                PK: `m#${r.movieId}`,
                SK: `r#${r.reviewerId}`,
                ...r,
              })),
            ]),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("reviewsInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [reviewsTable.tableArn],
      }),
    });

    // ========== LAMBDA FUNCTIONS ==========
    const commonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: reviewsTable.tableName,
        USER_POOL_ID: userPoolId,
        CLIENT_ID: userPoolClientId,
        REGION: "eu-west-1",
      },
    };

    // Auth lambdas
    const signupFn = new lambdanode.NodejsFunction(this, "SignupFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/auth/signup.ts`,
    });

    const confirmSignupFn = new lambdanode.NodejsFunction(this, "ConfirmFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/auth/confirm-signup.ts`,
    });

    const signinFn = new lambdanode.NodejsFunction(this, "SigninFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/auth/signin.ts`,
    });

    const signoutFn = new lambdanode.NodejsFunction(this, "SignoutFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/auth/signout.ts`,
    });

    const authorizerFn = new lambdanode.NodejsFunction(this, "AuthorizerFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/auth/authorizer.ts`,
    });

    // App lambdas
    const getMovieReviewsFn = new lambdanode.NodejsFunction(this, "GetMovieReviewsFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/getMovieReviews.ts`,
    });

    const getReviewsByDateFn = new lambdanode.NodejsFunction(this, "GetReviewsByDateFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/getReviewsByDate.ts`,
    });

    const addReviewFn = new lambdanode.NodejsFunction(this, "AddReviewFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/addReview.ts`,
    });

    const updateReviewFn = new lambdanode.NodejsFunction(this, "UpdateReviewFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/updateReview.ts`,
    });

    // ========== PERMISSIONS ==========
    reviewsTable.grantReadData(getMovieReviewsFn);
    reviewsTable.grantReadData(getReviewsByDateFn);
    reviewsTable.grantReadWriteData(addReviewFn);
    reviewsTable.grantReadWriteData(updateReviewFn);

    // ========== AUTHORIZER ==========
    const requestAuthorizer = new apig.RequestAuthorizer(this, "RequestAuthorizer", {
      identitySources: [apig.IdentitySource.header("cookie")],
      handler: authorizerFn,
      resultsCacheTtl: cdk.Duration.minutes(0),
    });

    // ========== API GATEWAY ==========
    const api = new apig.RestApi(this, "MovieReviewsApi", {
      description: "Movie Reviews API",
      deployOptions: { stageName: "dev" },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date", "Cookie"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    // Auth endpoints
    const authResource = api.root.addResource("auth");
    
    const signupResource = authResource.addResource("signup");
    signupResource.addMethod("POST", new apig.LambdaIntegration(signupFn));

    const confirmResource = authResource.addResource("confirm_signup");
    confirmResource.addMethod("POST", new apig.LambdaIntegration(confirmSignupFn));

    const signinResource = authResource.addResource("signin");
    signinResource.addMethod("POST", new apig.LambdaIntegration(signinFn));

    const signoutResource = authResource.addResource("signout");
    signoutResource.addMethod("GET", new apig.LambdaIntegration(signoutFn));

    // App endpoints
    // GET /movies/{movieId}/reviews
    const moviesResource = api.root.addResource("movies");
    const movieIdResource = moviesResource.addResource("{movieId}");
    const reviewsResource = movieIdResource.addResource("reviews");

    reviewsResource.addMethod("GET", new apig.LambdaIntegration(getMovieReviewsFn));

    // PUT /movies/{movieId}/reviews
    reviewsResource.addMethod("PUT", new apig.LambdaIntegration(updateReviewFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });

    // POST /movies/reviews
    const moviesReviewsResource = moviesResource.addResource("reviews");
    moviesReviewsResource.addMethod("POST", new apig.LambdaIntegration(addReviewFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });

    // GET /reviews?movie=movieId&published=date
    const reviewsRootResource = api.root.addResource("reviews");
    reviewsRootResource.addMethod("GET", new apig.LambdaIntegration(getReviewsByDateFn));

    // Output
    new cdk.CfnOutput(this, "API URL", { value: api.url });
  }
}