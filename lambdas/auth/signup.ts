import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : undefined;
    if (!body) {
      return { statusCode: 500, body: JSON.stringify({ message: "Missing request body" }) };
    }
    const res = await client.send(new SignUpCommand({
      ClientId: process.env.CLIENT_ID!,
      Username: body.username,
      Password: body.password,
      UserAttributes: [{ Name: "email", Value: body.email }],
    }));
    return { statusCode: 200, body: JSON.stringify({ message: "Signup successful", res }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: err }) };
  }
};