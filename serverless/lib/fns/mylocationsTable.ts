import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Entity, Table } from "dynamodb-onetable";
import Dynamo from "dynamodb-onetable/Dynamo";
import { format } from "path";

const client = new Dynamo({ client: new DynamoDBClient({}) });
const schema = {
  indexes: {
    primary: {
      hash: "pk",
      range: "sk",
    },
  },
  models: {
    Location: {
      id: {
        required: true,
        type: "string",
        value: "id",
      },
      lat: {
        required: true,
        type: "string",
        value: "lat",
      },
      lon: {
        required: true,
        type: "string",
        value: "lon",
      },
      subject: {
        required: false,
        type: "string",
      },
    },
  },
  version: "0.1.0",
  params: { typeField: "type" },
  format: "onetable",
} as const;

export type LocationType = Entity<typeof schema.models.Location>;

const table = new Table({
  client,
  name: "mylocationsTable",
  schema,
  timestamps: true,
});

export const Location = table.getModel<LocationType>("Location");
