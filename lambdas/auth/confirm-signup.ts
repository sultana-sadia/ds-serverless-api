import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : undefined;
    if (!body) {
      return { statusCode: 500, body: JSON.stringify({ message: "Missing request body" }) };
    }
    await client.send(new ConfirmSignUpCommand({
      ClientId: process.env.CLIENT_ID!,
      Username: body.username,
      ConfirmationCode: body.code,
    }));
    return { statusCode: 200, body: JSON.stringify({ message: `User ${body.username} confirmed` }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: err }) };
  }
};