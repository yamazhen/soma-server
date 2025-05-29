import { startGateway } from "./apiGateway";

startGateway()
	.then(() => {
		console.log("API Gateway started successfully");
	})
	.catch((e) => {
		console.error("Failed to start API Gateway", e);
	});
