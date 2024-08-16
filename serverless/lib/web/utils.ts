import { getLocation } from "graphql";
import { LocationType } from "../fns/mylocationsTable";
let url = "";

const geturl = async () => {
  if (url) {
    return url;
  }
  const response = await fetch("./config.json");
  url = `${(await response.json()).ServerlessStack.HttpApiUrl}/locations`;
  return url;
};

export const getLocations = async () => {
  const result = await fetch(await geturl());

  return await result.json();
};

export const saveLocation = async (location: LocationType) => {
  await fetch(await geturl(), {
    body: JSON.stringify(location),
    headers: { "Content-Type": "application/json" },
    method: "POST",
    mode: "cors",
  });
};
