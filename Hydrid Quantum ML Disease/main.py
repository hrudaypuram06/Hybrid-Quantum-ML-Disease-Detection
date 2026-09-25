from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, ConfigDict
from contextlib import asynccontextmanager
import uvicorn
import ml_model
import threading

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n" + "="*50)
    print("🚀 HYBRID QUANTUM ML SERVER STARTED 🚀")
    print("👉 CLICK HERE TO OPEN IN BROWSER: http://127.0.0.1:8000")
    print("="*50 + "\n")
    thread = threading.Thread(target=ml_model.get_models)
    thread.start()
    yield

app = FastAPI(title="Hybrid QML Early Disease Detection", lifespan=lifespan)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

class PatientData(BaseModel):
    patient_name: str
    age: int
    blood_pressure: int
    cholesterol: int
    glucose: int
    bmi: float
    heart_rate: int
    temperature: float
    smoking: int
    model_router: str

    model_config = ConfigDict(protected_namespaces=())

@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={}
    )

@app.get("/manifest.json")
async def get_manifest():
    return FileResponse("static/manifest.json")

@app.get("/sw.js")
async def get_sw():
    return FileResponse("static/sw.js")

@app.post("/api/predict")
async def predict(data: PatientData):
    # Prepare data for prediction
    features = {
        'age': data.age,
        'blood_pressure': data.blood_pressure,
        'cholesterol': data.cholesterol,
        'glucose': data.glucose,
        'bmi': data.bmi,
        'heart_rate': data.heart_rate,
        'temperature': data.temperature,
        'smoking': data.smoking
    }
    result = ml_model.predict_risk(features, model_router=data.model_router)
    return result

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
