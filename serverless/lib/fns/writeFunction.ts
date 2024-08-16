import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";

import { Location } from "./mylocationsTable";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const body = JSON.parse(event.body!);
  const location = await Location.create({
    id: body.id,
    lat: body.lat,
    lon: body.lon,
    subject: body.subject,
  });
  return {
    statusCode: 200,
    body: JSON.stringify(location),
  };
};
