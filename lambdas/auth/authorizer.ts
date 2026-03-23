import { APIGatewayRequestAuthorizerHandler, APIGatewayAuthorizerResult } from "aws-lambda";
import axios from "axios";
import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";

export const handler: APIGatewayRequestAuthorizerHandler = async (event): Promise<APIGatewayAuthorizerResult> => {
  console.log("[EVENT]", event);
  try {
    const cookieHeader = event.headers?.cookie || event.headers?.Cookie;
    if (!cookieHeader) {
      return { principalId: "", policyDocument: denyPolicy(event.methodArn) };
    }
    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((c) => {
      const [k, v] = c.trim().split("=");
      cookies[k] = v;
    });
    const token = cookies["token"];
    if (!token) {
      return { principalId: "", policyDocument: denyPolicy(event.methodArn) };
    }
    const url = `https://cognito-idp.${process.env.REGION}.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`;
    const { data } = await axios.get(url);
    const pem = jwkToPem(data.keys[0]);
    const decoded = jwt.verify(token, pem, { algorithms: ["RS256"] }) as any;
    return {
      principalId: decoded.sub,
      policyDocument: allowPolicy(event.methodArn),
      context: { userId: decoded.email || decoded["cognito:username"] },
    };
  } catch (err) {
    console.log(err);
    return { principalId: "", policyDocument: denyPolicy(event.methodArn) };
  }
};

const allowPolicy = (methodArn: string) => ({
  Version: "2012-10-17" as const,
  Statement: [{ Effect: "Allow" as const, Action: "execute-api:Invoke", Resource: [methodArn] }],
});

const denyPolicy = (methodArn: string) => ({
  Version: "2012-10-17" as const,
  Statement: [{ Effect: "Deny" as const, Action: "execute-api:Invoke", Resource: [methodArn] }],
});