import { APIGatewayProxyHandlerV2, APIGatewayProxyEventV2WithRequestContext, APIGatewayEventRequestContextV2WithAuthorizer } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";


const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!body) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing request body" }),
      };
    }

    const reviewerId = (event.requestContext as any).authorizer?.userId ||
                   (event.requestContext as any).authorizer?.principalId ||
                   "anonymous";

    const { movieId, reviewDate, content } = body;

    if (!movieId || !reviewDate || !content) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing required fields: movieId, reviewDate, content" }),
      };
    }

    await ddbDocClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        PK: `m#${movieId}`,
        SK: `r#${reviewerId}`,
        movieId,
        reviewerId,
        reviewDate,
        content,
      },
    }));

    return {
      statusCode: 201,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Review added successfully" }),
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
