import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : undefined;
    if (!body) {
      return { statusCode: 500, body: JSON.stringify({ message: "Missing request body" }) };
    }
    const { AuthenticationResult } = await client.send(new InitiateAuthCommand({
      ClientId: process.env.CLIENT_ID!,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: body.username,
        PASSWORD: body.password,
      },
    }));
    if (!AuthenticationResult) {
      return { statusCode: 400, body: JSON.stringify({ message: "Signin failed" }) };
    }
    const token = AuthenticationResult.IdToken;
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Origin": "*",
        "Set-Cookie": `token=${token}; SameSite=None; Secure; HttpOnly; Path=/; Max-Age=3600;`,
      },
      body: JSON.stringify({ message: "Signin successful", token }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: err }) };
  }
};
