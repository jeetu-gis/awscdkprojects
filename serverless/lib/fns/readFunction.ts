import type { APIGatewayProxyResultV2 } from "aws-lambda";
import { Location } from "./mylocationsTable";

/* export const handler = async (id: string): Promise<APIGatewayProxyResultV2> => {
    const location = await Location.get({ id });
    return {
        statusCode: 200,
        body: JSON.stringify(location),
    };
} */

export const handler = async (event: any): Promise<APIGatewayProxyResultV2> => {
  const location = await Location.get({ id: event.pathParameters.subject });
  return {
    statusCode: 200,
    body: JSON.stringify(location),
  };
};
