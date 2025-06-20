import { startGateway } from "./apiGateway.js";

startGateway()
  .then(() => {
    console.log("API Gateway started successfully");
  })
  .catch((e) => {
    console.error("Failed to start API Gateway", e);
  });
