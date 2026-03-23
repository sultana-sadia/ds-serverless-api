import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    const movieId = event.pathParameters?.movieId;
    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!body || !movieId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

   const reviewerId = (event.requestContext as any).authorizer?.userId ||
                   (event.requestContext as any).authorizer?.principalId ||
                   "anonymous";
    const { content } = body;

    if (!content) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing content field" }),
      };
    }

    // Check review exists and belongs to this reviewer
    const existing = await ddbDocClient.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        PK: `m#${movieId}`,
        SK: `r#${reviewerId}`,
      },
    }));

    if (!existing.Item) {
      return {
        statusCode: 403,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Review not found or you are not the reviewer" }),
      };
    }

    await ddbDocClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        PK: `m#${movieId}`,
        SK: `r#${reviewerId}`,
      },
      UpdateExpression: "SET content = :content",
      ExpressionAttributeValues: {
        ":content": content,
      },
    }));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Review updated successfully" }),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error }),
    };
  }
};

function createDocumentClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = { wrapNumbers: false };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}