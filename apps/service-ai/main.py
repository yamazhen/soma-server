import os
from fastapi import Depends, FastAPI
import uvicorn
from middleware.gatewayMiddleware import verify_gateway_key

NODE_ENV = os.environ.get("NODE_ENV")


app = FastAPI(dependencies=[Depends(verify_gateway_key)])

@app.get("/api/v1/hello")
def hello():
    return {"message": "Meow"}

if __name__ == "__main__":
    port = int(os.environ.get("SERVICE_AI_PORT", 3002))
    host = os.environ.get("SERVICE_AI_URL", "localhost")
    is_dev = NODE_ENV == "development"

    if is_dev:
        uvicorn.run("main:app", host=host, port=port, reload=True)
    else:
        uvicorn.run(app, host=host, port=port)

