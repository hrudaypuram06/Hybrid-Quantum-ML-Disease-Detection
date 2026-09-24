import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
import pickle
import os

# Qiskit specific imports
from qiskit.circuit.library import ZZFeatureMap
from qiskit_machine_learning.kernels import FidelityQuantumKernel
from qiskit_algorithms.state_fidelities import ComputeUncompute
from qiskit.primitives import Sampler

MODEL_PATH = "health_models_data.pkl"

def generate_synthetic_data(n_samples=1000):
    np.random.seed(42)
    age = np.random.normal(50, 15, n_samples).astype(int)
    blood_pressure = np.random.normal(120, 20, n_samples).astype(int)
    cholesterol = np.random.normal(200, 40, n_samples).astype(int)
    glucose = np.random.normal(100, 30, n_samples).astype(int)
    bmi = np.random.normal(25, 5, n_samples)
    heart_rate = np.random.normal(70, 15, n_samples).astype(int)
    temperature = np.random.normal(98.6, 1.5, n_samples)
    smoking = np.random.randint(0, 2, n_samples)
    
    risk_factor = (age / 80) + (blood_pressure / 200) + (cholesterol / 300) + (glucose / 200) + (bmi / 40) + smoking + ((temperature - 98.6) / 2)
    y = (risk_factor > np.median(risk_factor)).astype(int)
    
    X = pd.DataFrame({
        'age': age,
        'blood_pressure': blood_pressure,
        'cholesterol': cholesterol,
        'glucose': glucose,
        'bmi': bmi,
        'heart_rate': heart_rate,
        'temperature': temperature,
        'smoking': smoking
    })
    
    return X, y

def get_quantum_kernel(dim):
    feature_map = ZZFeatureMap(feature_dimension=dim, reps=2, entanglement='linear')
    sampler = Sampler()
    fidelity = ComputeUncompute(sampler=sampler)
    qkernel = FidelityQuantumKernel(fidelity=fidelity, feature_map=feature_map)
    return qkernel

def train_and_save_model():
    print("Generating Synthetic Data...")
    X, y = generate_synthetic_data(1000)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 1. Classical Model
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_model.fit(X_train_scaled, y_train)
    
    # 2. Quantum Model (QSVC with ZZFeatureMap)
    importances = rf_model.feature_importances_
    # Take the top 4 classical features to pass into the quantum circuit
    top_indices = np.argsort(importances)[-4:]
    X_train_q = X_train_scaled[:, top_indices]
    
    # Using 50 samples to compute the precomputed kernel matrix (to keep training fast for the demo)
    subset = 50
    X_train_q_sub = X_train_q[:subset]
    y_train_sub = y_train[:subset]
    
    print("Training Quantum Model (Evaluating Kernel)...")
    qkernel = get_quantum_kernel(dim=4)
    matrix_train = qkernel.evaluate(x_vec=X_train_q_sub)
    
    qsvc = SVC(kernel='precomputed', probability=True)
    qsvc.fit(matrix_train, y_train_sub)
    print("Quantum Model Trained!")
    
    models = {
        "scaler": scaler,
        "classical": rf_model,
        "qsvc": qsvc,
        "q_features_indices": top_indices,
        "x_train_q_sub": X_train_q_sub
    }
    
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(models, f)
        
    return models

def get_models():
    if not os.path.exists(MODEL_PATH):
        train_and_save_model()
    with open(MODEL_PATH, 'rb') as f:
        return pickle.load(f)

def predict_risk(features, model_router="auto"):
    models = get_models()
    
    X = pd.DataFrame([features])
    X_scaled = models['scaler'].transform(X)
    
    # Execute Classical Model
    c_proba = float(models['classical'].predict_proba(X_scaled)[0][1])
    
    # Execute Quantum Kernel Method
    X_q = X_scaled[:, models['q_features_indices']]
    qkernel = get_quantum_kernel(dim=4)
    
    # Evaluates the kernel matrix specifically for this test point against the training subset
    matrix_test = qkernel.evaluate(x_vec=X_q, y_vec=models['x_train_q_sub'])
    q_proba = float(models['qsvc'].predict_proba(matrix_test)[0][1])
    
    # Execute Hybrid QML (Ensemble of Classical RF + Quantum QSVC)
    # Give higher weight to Quantum logic internally if it confirms classical, else blend.
    h_proba = (0.6 * c_proba) + (0.4 * q_proba)
    
    final_risk = h_proba
    if model_router == 'classical':
        final_risk = c_proba
    elif model_router == 'quantum':
        final_risk = q_proba
        
    importances = {k: float(v) for k, v in zip(X.columns, models['classical'].feature_importances_)}
        
    return {
        "classical_score": c_proba,
        "quantum_score": q_proba,
        "hybrid_score": h_proba,
        "final_risk": final_risk, 
        "feature_importances": importances
    }
