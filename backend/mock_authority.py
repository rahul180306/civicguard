from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/mock-authority")
async def recv(req: Request):
    data = await req.json()
    print("[MockAuthority] received:", data)
    return {"ok": True, "ticket": "AUTH123"}
