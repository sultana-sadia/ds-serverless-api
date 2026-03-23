import { marshall } from "@aws-sdk/util-dynamodb";

export const generateItem = (entity: Record<string, any>) => {
  return {
    PutRequest: {
      Item: marshall(entity),
    },
  };
};

export const generateBatch = (data: Record<string, any>[]) => {
  return data.map((e) => generateItem(e));
};