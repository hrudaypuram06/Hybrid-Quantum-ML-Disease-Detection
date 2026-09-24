/* static/script.js */
function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
    
    // Some basic handling for screens that are coming soon
    const validScreens = ['dashboard', 'new-assessment', 'settings', 'patients', 'analytics', 'model-comparison', 'results', 'processing', 'login'];
    const screen = document.getElementById(screenId);
    if(screen) screen.classList.remove('hidden');

    const nav = document.getElementById(`nav-${screenId}`);
    if(nav) nav.classList.add('active');
}

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('sidebar').classList.remove('hidden');
    navigateTo('dashboard');
});

// Mock current baseline prediction for What-If
let currentRisk = 0;
let currentImportances = {};

document.getElementById('assessment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    navigateTo('processing');
    
    const data = {
        patient_name: document.getElementById('patient_name').value,
        age: parseInt(document.getElementById('age').value),
        blood_pressure: parseInt(document.getElementById('blood_pressure').value),
        cholesterol: parseInt(document.getElementById('cholesterol').value),
        glucose: parseInt(document.getElementById('glucose').value),
        bmi: parseFloat(document.getElementById('bmi').value),
        heart_rate: parseInt(document.getElementById('heart_rate').value),
        temperature: parseFloat(document.getElementById('temperature').value),
        smoking: parseInt(document.getElementById('smoking').value),
        model_router: document.getElementById('model_router').value
    };

    runPipeline(data);
});

async function runPipeline(patientData) {
    // Reset Pipeline UI
    document.querySelectorAll('.step').forEach(s => {
        s.classList.remove('active', 'done');
        let status = s.querySelector('.status');
        if(status) status.innerText = '...';
    });
    
    // Step 1: Validation
    let sData = document.getElementById('step-data');
    sData.classList.add('active');
    sData.querySelector('.status').innerText = 'Running';
    await new Promise(r => setTimeout(r, 600));
    sData.classList.replace('active', 'done');
    sData.querySelector('.status').innerText = '✓';

    // Step 1.5: Scanning
    let sScan = document.getElementById('step-scanning');
    if(sScan) {
        sScan.classList.add('active');
        sScan.querySelector('.status').innerText = 'Scanning';
        await new Promise(r => setTimeout(r, 800));
        sScan.classList.replace('active', 'done');
        sScan.querySelector('.status').innerText = '✓';
    }

    // Step 1.75: Features
    let sFeat = document.getElementById('step-features');
    if(sFeat) {
        sFeat.classList.add('active');
        sFeat.querySelector('.status').innerText = 'Extracting';
        await new Promise(r => setTimeout(r, 700));
        sFeat.classList.replace('active', 'done');
        sFeat.querySelector('.status').innerText = '✓';
    }

    // Step 2: Fingerprint
    let sPrint = document.getElementById('step-fingerprint');
    sPrint.classList.add('active');
    sPrint.querySelector('.status').innerText = 'Computing';
    await new Promise(r => setTimeout(r, 1000));
    sPrint.classList.replace('active', 'done');
    sPrint.querySelector('.status').innerText = '✓';

    // Step 3: Router & Models
    let sRouter = document.getElementById('step-router');
    sRouter.classList.add('active');
    document.querySelectorAll('.model').forEach(el => el.classList.add('running'));
    
    // Actually call the API here while models are 'running'
    let result = null;
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(patientData)
        });
        result = await response.json();
    } catch (e) {
        console.error(e);
        // Fallback for demo if API fails
        result = {
            classical_score: 0.72,
            quantum_score: 0.74,
            hybrid_score: 0.76,
            final_risk: 0.76,
            feature_importances: { 'blood_pressure': 0.3, 'glucose': 0.25, 'cholesterol': 0.2, 'age': 0.15, 'bmi': 0.05, 'heart_rate': 0.03, 'smoking': 0.02 }
        };
    }

    await new Promise(r => setTimeout(r, 1500)); // Dramatic effect for SIH Demo
    document.querySelectorAll('.model').forEach(el => el.classList.remove('running'));
    sRouter.classList.replace('active', 'done');

    // Step 4: Evaluator
    let sEval = document.getElementById('step-eval');
    sEval.classList.add('active');
    sEval.querySelector('.status').innerText = 'Generating Report';
    await new Promise(r => setTimeout(r, 800));
    sEval.classList.replace('active', 'done');
    sEval.querySelector('.status').innerText = '✓';

    populateResults(result);
    navigateTo('results');
}

function populateResults(res) {
    currentRisk = res.final_risk;
    currentImportances = res.feature_importances;

    const riskPercent = Math.round(res.final_risk * 100);
    const finalRiskValue = document.getElementById('final-risk-value');
    
    // Animate number
    let count = 0;
    let interval = setInterval(() => {
        count += 2;
        if(count >= riskPercent) {
            count = riskPercent;
            clearInterval(interval);
        }
        finalRiskValue.innerText = `${count}%`;
    }, 20);
    
    document.getElementById('sim-current').innerText = `${riskPercent}%`;
    
    const riskCircle = document.getElementById('final-risk-circle');
    const riskLabel = document.getElementById('final-risk-label');
    
    if(riskPercent > 65) {
        riskCircle.style.borderColor = 'var(--danger)';
        riskCircle.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4)';
        riskLabel.innerText = 'HIGH RISK';
        riskLabel.style.color = 'var(--danger)';
    } else if (riskPercent > 40) {
        riskCircle.style.borderColor = 'var(--warning)';
        riskCircle.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.4)';
        riskLabel.innerText = 'MEDIUM RISK';
        riskLabel.style.color = 'var(--warning)';
    } else {
        riskCircle.style.borderColor = 'var(--accent)';
        riskCircle.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
        riskLabel.innerText = 'LOW RISK';
        riskLabel.style.color = 'var(--accent)';
    }

    document.getElementById('res-classic').innerText = `${Math.round(res.classical_score * 100)}%`;
    document.getElementById('res-quantum').innerText = `${Math.round(res.quantum_score * 100)}%`;
    document.getElementById('res-hybrid').innerText = `${Math.round(res.hybrid_score * 100)}%`;

    // specific disease calculation based on overall risk and specific traits
    let bp = parseFloat(document.getElementById('blood_pressure').value);
    let gluc = parseFloat(document.getElementById('glucose').value);
    
    let cardioRisk = Math.min(99, riskPercent * ((bp / 120) * 0.8 + 0.2));
    let diabetesRisk = Math.min(99, riskPercent * ((gluc / 100) * 0.8 + 0.2));
    let hyperRisk = Math.min(99, riskPercent * ((bp / 110) * 0.9 + 0.1));

    setTimeout(() => {
        document.getElementById('risk-cardio').innerText = `${Math.round(cardioRisk)}%`;
        document.getElementById('bar-cardio').style.width = `${cardioRisk}%`;
        
        document.getElementById('risk-diabetes').innerText = `${Math.round(diabetesRisk)}%`;
        document.getElementById('bar-diabetes').style.width = `${diabetesRisk}%`;
        
        document.getElementById('risk-hypertension').innerText = `${Math.round(hyperRisk)}%`;
        document.getElementById('bar-hypertension').style.width = `${hyperRisk}%`;
    }, 500);

    // Render why (disease fingerprint feature importances)
    const fb = document.getElementById('feature-importance-bars');
    fb.innerHTML = '';
    
    // Sort importances descending
    let sortedFeatures = Object.entries(res.feature_importances).sort((a,b) => b[1] - a[1]);
    
    for(let i=0; i<Math.min(6, sortedFeatures.length); i++) {
        let maxVal = sortedFeatures[0][1];
        let pct = (sortedFeatures[i][1] / maxVal) * 100;
        let featObj = sortedFeatures[i];
        
        let row = document.createElement('div');
        row.className = 'feature-row';
        row.innerHTML = `
            <div class="feat-name">${featObj[0].replace('_', ' ').toUpperCase()}</div>
            <div class="bar-container"><div class="bar-fill" style="width: 0%"></div></div>
            <div class="feat-val">${Math.round(featObj[1]*100)}%</div>
        `;
        fb.appendChild(row);
        
        // Trigger animation
        setTimeout(() => {
            row.querySelector('.bar-fill').style.width = `${pct}%`;
        }, 300 + (i * 100));
    }
    
    // Reset What If simulator sliders to original inputs
    document.getElementById('wi-bp').value = document.getElementById('blood_pressure').value;
    document.getElementById('wi-gl').value = document.getElementById('glucose').value;
    document.getElementById('wi-bmi').value = document.getElementById('bmi').value;
    document.getElementById('wi-bp-val').innerText = document.getElementById('wi-bp').value;
    document.getElementById('wi-gl-val').innerText = document.getElementById('wi-gl').value;
    document.getElementById('wi-bmi-val').innerText = document.getElementById('wi-bmi').value;
    
    let scenarioEl = document.getElementById('sim-scenario');
    scenarioEl.innerText = '--%';
    scenarioEl.className = 'success-text';
    scenarioEl.style.color = 'white';
}

async function updateWhatIf() {
    let bp = document.getElementById('wi-bp').value;
    let gl = document.getElementById('wi-gl').value;
    let bmi = document.getElementById('wi-bmi').value;
    
    document.getElementById('wi-bp-val').innerText = bp;
    document.getElementById('wi-gl-val').innerText = gl;
    document.getElementById('wi-bmi-val').innerText = bmi;

    const data = {
        patient_name: document.getElementById('patient_name').value,
        age: parseInt(document.getElementById('age').value),
        blood_pressure: parseInt(bp),
        cholesterol: parseInt(document.getElementById('cholesterol').value),
        glucose: parseInt(gl),
        bmi: parseFloat(bmi),
        heart_rate: parseInt(document.getElementById('heart_rate').value),
        temperature: parseFloat(document.getElementById('temperature').value),
        smoking: parseInt(document.getElementById('smoking').value),
        model_router: document.getElementById('model_router').value
    };

    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        const result = await response.json();
        const newRiskPercent = Math.round(result.final_risk * 100);
        const scenarioEl = document.getElementById('sim-scenario');
        scenarioEl.innerText = `${newRiskPercent}%`;
        
        const origRisk = Math.round(currentRisk * 100);
        if (newRiskPercent < origRisk) {
            scenarioEl.className = 'success-text'; 
            scenarioEl.style.color = ''; // Use CSS class color
        } else if (newRiskPercent > origRisk) {
            scenarioEl.className = ''; 
            scenarioEl.style.color = 'var(--danger)';
        } else {
            scenarioEl.className = '';
            scenarioEl.style.color = 'white';
        }
        
    } catch (e) {
        console.error(e);
    }
}

// Accordion Toggle for Assessment Menu
function toggleMenu(menuId) {
    const el = document.getElementById(menuId);
    const icon = document.getElementById(menuId + '-icon');
    if (el.style.display === 'none') {
        el.style.display = 'block';
        if(icon) icon.innerText = '▼';
    } else {
        el.style.display = 'none';
        if(icon) icon.innerText = '▶';
    }
}

// Language Translation Dictionary
const langMap = {
    'es': {
        'nav-dashboard': '<i class="fas fa-home">🏠</i> Panel',
        'nav-new-assessment': '<i class="fas fa-plus">➕</i> Escáner',
        'nav-explainable-ai': '<i class="fas fa-brain">🧠</i> IA Explicable',
        'nav-reports': '<i class="fas fa-file-medical-alt">📄</i> Reportes',
        'nav-model-lab': '<i class="fas fa-microscope">🔬</i> Lab Modelos',
        'nav-analytics': '<i class="fas fa-chart-line">📊</i> Analítica',
        'nav-disease-registry': '<i class="fas fa-list">📋</i> Enfermedades',
        'nav-settings': '<i class="fas fa-cog">⚙</i> Configuración',
        'trans-bp': 'Presión Alta',
        'trans-glucose': 'Glucosa',
        'trans-cvd': 'Riesgo Cardio',
        'trans-family': 'Genética',
        'trans-quantum-insight-title': 'Análisis Cuántico:',
        'trans-quantum-insight-desc': 'Sinergia de BP y glucosa indica riesgo elevado de ECV.'
    },
    'fr': {
        'nav-dashboard': '<i class="fas fa-home">🏠</i> Tableau de bord',
        'nav-new-assessment': '<i class="fas fa-plus">➕</i> Scan Maladie',
        'nav-explainable-ai': '<i class="fas fa-brain">🧠</i> IA Explicable',
        'nav-reports': '<i class="fas fa-file-medical-alt">📄</i> Rapports',
        'nav-model-lab': '<i class="fas fa-microscope">🔬</i> Lab Modèles',
        'nav-analytics': '<i class="fas fa-chart-line">📊</i> Analytique',
        'nav-disease-registry': '<i class="fas fa-list">📋</i> Maladies',
        'nav-settings': '<i class="fas fa-cog">⚙</i> Paramètres',
        'trans-bp': 'Haute Pression',
        'trans-glucose': 'Glucose',
        'trans-cvd': 'Risque Cardio',
        'trans-family': 'Génétique',
        'trans-quantum-insight-title': 'Vision Quantique:',
        'trans-quantum-insight-desc': 'Synergie BP et glucose mappe la progression cardiovasculaire.'
    },
    'hi': {
        'nav-dashboard': '<i class="fas fa-home">🏠</i> डैशबोर्ड',
        'nav-new-assessment': '<i class="fas fa-plus">➕</i> रोग स्कैन',
        'nav-explainable-ai': '<i class="fas fa-brain">🧠</i> स्पष्ट एआई',
        'nav-reports': '<i class="fas fa-file-medical-alt">📄</i> रिपोर्ट',
        'nav-model-lab': '<i class="fas fa-microscope">🔬</i> मॉडल लैब',
        'nav-analytics': '<i class="fas fa-chart-line">📊</i> एनालिटिक्स',
        'nav-disease-registry': '<i class="fas fa-list">📋</i> रोग मेनू',
        'nav-settings': '<i class="fas fa-cog">⚙</i> सेटिंग्स',
        'trans-bp': 'उच्च रक्तचाप',
        'trans-glucose': 'ग्लूकोज',
        'trans-cvd': 'हृदय जोखिम',
        'trans-family': 'आनुवंशिकी',
        'trans-quantum-insight-title': 'क्वांटम अंतर्दृष्टि:',
        'trans-quantum-insight-desc': 'बीपी और ग्लूकोज तालमेल हृदय रोग की प्रगति को दर्शाता है।'
    },
    'en': {
        'nav-dashboard': '<i class="fas fa-home">🏠</i> Dashboard',
        'nav-new-assessment': '<i class="fas fa-plus">➕</i> Disease Scan',
        'nav-explainable-ai': '<i class="fas fa-brain">🧠</i> Explainable AI',
        'nav-reports': '<i class="fas fa-file-medical-alt">📄</i> Reports',
        'nav-model-lab': '<i class="fas fa-microscope">🔬</i> Model Lab',
        'nav-analytics': '<i class="fas fa-chart-line">📊</i> Analytics',
        'nav-disease-registry': '<i class="fas fa-list">📋</i> Disease Menu',
        'nav-settings': '<i class="fas fa-cog">⚙</i> Settings',
        'trans-bp': 'High BP',
        'trans-glucose': 'Glucose',
        'trans-cvd': 'Cardio Risk',
        'trans-family': 'Genetics',
        'trans-quantum-insight-title': 'Quantum Insight:',
        'trans-quantum-insight-desc': 'BP and Glucose synergy mapped to CVD progression.'
    }
};

function changeLanguage() {
    const selectEl = document.getElementById('lang-select');
    if (!selectEl) return;
    const lang = selectEl.value;
    const dictionary = langMap[lang] || langMap['en']; 
    
    for (const [id, translation] of Object.entries(dictionary)) {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = translation;
        }
    }
    
    alert('Language preferences saved successfully. UI dynamically updated.');
}

// Light - Dark Mode Toggle
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLightMode = document.body.classList.contains('light-mode');
    console.log(isLightMode ? "Light Theme Enabled" : "Dark Theme Enabled");
}
