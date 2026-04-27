// Medical Panel - Symptom Checker

const LOCAL_FALLBACK_DISEASES = {
  "Common Cold": ["runny_nose", "cough", "sneezing", "mild_fever", "throat_irritation"],
  Influenza: ["high_fever", "cough", "fatigue", "headache", "muscle_pain"],
  "COVID-19": ["high_fever", "cough", "fatigue", "loss_of_smell", "breathlessness"],
  Malaria: ["high_fever", "headache", "chills", "sweating", "nausea"],
  Typhoid: ["high_fever", "headache", "abdominal_pain", "fatigue", "constipation"]
};

const symptoms = [
  "itching",
  "skin_rash",
  "nodal_skin_eruptions",
  "continuous_sneezing",
  "shivering",
  "chills",
  "joint_pain",
  "stomach_pain",
  "acidity",
  "ulcers_on_tongue",
  "muscle_wasting",
  "vomiting",
  "burning_micturition",
  "spotting_ urination",
  "fatigue",
  "weight_gain",
  "anxiety",
  "cold_hands_and_feets",
  "mood_swings",
  "weight_loss",
  "restlessness",
  "lethargy",
  "patches_in_throat",
  "irregular_sugar_level",
  "cough",
  "high_fever",
  "sunken_eyes",
  "breathlessness",
  "sweating",
  "dehydration",
  "indigestion",
  "headache",
  "yellowish_skin",
  "dark_urine",
  "nausea",
  "loss_of_appetite",
  "pain_behind_the_eyes",
  "back_pain",
  "constipation",
  "abdominal_pain",
  "diarrhoea",
  "mild_fever",
  "yellow_urine",
  "yellowing_of_eyes",
  "acute_liver_failure",
  "fluid_overload",
  "swelling_of_stomach",
  "swelled_lymph_nodes",
  "malaise",
  "blurred_and_distorted_vision",
  "phlegm",
  "throat_irritation",
  "redness_of_eyes",
  "sinus_pressure",
  "runny_nose",
  "congestion",
  "chest_pain",
  "weakness_in_limbs",
  "fast_heart_rate",
  "pain_during_bowel_movements",
  "pain_in_anal_region",
  "bloody_stool",
  "irritation_in_anus",
  "neck_pain",
  "dizziness",
  "cramps",
  "bruising",
  "obesity",
  "swollen_legs",
  "swollen_blood_vessels",
  "puffy_face_and_eyes",
  "enlarged_thyroid",
  "brittle_nails",
  "swollen_extremeties",
  "excessive_hunger",
  "extra_marital_contacts",
  "drying_and_tingling_lips",
  "slurred_speech",
  "knee_pain",
  "hip_joint_pain",
  "muscle_weakness",
  "stiff_neck",
  "swelling_joints",
  "movement_stiffness",
  "spinning_movements",
  "loss_of_balance",
  "unsteadiness",
  "weakness_of_one_body_side",
  "loss_of_smell",
  "bladder_discomfort",
  "foul_smell_of urine",
  "continuous_feel_of_urine",
  "passage_of_gases",
  "internal_itching",
  "toxic_look_(typhos)",
  "depression",
  "irritability",
  "muscle_pain",
  "altered_sensorium",
  "red_spots_over_body",
  "belly_pain",
  "abnormal_menstruation",
  "dischromic _patches",
  "watering_from_eyes",
  "increased_appetite",
  "polyuria",
  "family_history",
  "mucoid_sputum",
  "rusty_sputum",
  "lack_of_concentration",
  "visual_disturbances",
  "receiving_blood_transfusion",
  "receiving_unsterile_injections",
  "coma",
  "stomach_bleeding",
  "distention_of_abdomen",
  "history_of_alcohol_consumption",
  "fluid_overload.1",
  "blood_in_sputum",
  "prominent_veins_on_calf",
  "palpitations",
  "painful_walking",
  "pus_filled_pimples",
  "blackheads",
  "scurring",
  "skin_peeling",
  "silver_like_dusting",
  "small_dents_in_nails",
  "inflammatory_nails",
  "blister",
  "red_sore_around_nose",
  "yellow_crust_ooze"
];

document.addEventListener("DOMContentLoaded", () => {
  renderSymptoms();
  setupSymptomSearch();
  updateFloatingButtonVisibility();
});

function setupSymptomSearch() {
  const searchInput = document.getElementById("symptomSearch");
  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", filterSymptoms);
}

function formatSymptomName(symptom) {
  return symptom
    .replace(/_/g, " ")
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderSymptoms() {
  const grid = document.getElementById("symptomGrid");
  if (!grid) {
    return;
  }

  grid.innerHTML = "";
  const fragment = document.createDocumentFragment();

  symptoms.forEach((symptom, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "symptom-checkbox";
    wrapper.innerHTML = `
      <input type="checkbox" id="symptom-${index}" value="${symptom}">
      <label for="symptom-${index}">${formatSymptomName(symptom)}</label>
    `;

    const checkbox = wrapper.querySelector('input[type="checkbox"]');
    checkbox.addEventListener("change", updateFloatingButtonVisibility);
    fragment.appendChild(wrapper);
  });

  grid.appendChild(fragment);
}

function filterSymptoms() {
  const searchInput = document.getElementById("symptomSearch");
  if (!searchInput) {
    return;
  }

  const query = searchInput.value.toLowerCase();
  const symptomCheckboxes = document.querySelectorAll(".symptom-checkbox");

  symptomCheckboxes.forEach((checkbox) => {
    const label = checkbox.querySelector("label");
    const labelText = label ? label.textContent.toLowerCase() : "";
    checkbox.style.display = labelText.includes(query) ? "flex" : "none";
  });
}

function getSelectedSymptoms() {
  const checked = document.querySelectorAll('.symptom-checkbox input[type="checkbox"]:checked');
  return Array.from(checked).map((element) => element.value);
}

function updateFloatingButtonVisibility() {
  const selectedSymptoms = getSelectedSymptoms();
  const floatingBtn = document.getElementById("floatingPredictBtn");
  const symptomCount = document.getElementById("symptomCount");

  if (symptomCount) {
    const suffix = selectedSymptoms.length === 1 ? "" : "s";
    symptomCount.textContent = `${selectedSymptoms.length} symptom${suffix} selected`;
  }

  if (floatingBtn) {
    if (selectedSymptoms.length > 0) {
      floatingBtn.classList.add("show");
    } else {
      floatingBtn.classList.remove("show");
    }
  }
}

function clearAllSymptoms() {
  const selected = document.querySelectorAll('.symptom-checkbox input[type="checkbox"]:checked');
  selected.forEach((checkbox) => {
    checkbox.checked = false;
  });
  updateFloatingButtonVisibility();
}

function normalizeConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return numeric <= 1 ? Math.round(numeric * 10000) / 100 : Math.round(numeric * 100) / 100;
}

function displayPredictions(predictions, modelUsed) {
  const resultSection = document.getElementById("predictionResult");
  const diseaseList = document.getElementById("diseaseList");
  if (!resultSection || !diseaseList) {
    return;
  }

  diseaseList.innerHTML = "";

  if (!Array.isArray(predictions) || predictions.length === 0) {
    diseaseList.innerHTML = '<p style="color: var(--muted);">No predictions available. Please try different symptoms.</p>';
  } else {
    predictions.forEach((prediction) => {
      const confidence = normalizeConfidence(prediction.confidence);
      const diseaseItem = document.createElement("div");
      diseaseItem.className = "disease-item";
      diseaseItem.innerHTML = `
        <div class="disease-name">${prediction.disease || "Unknown condition"}</div>
        <div class="confidence">Confidence: ${confidence}%</div>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${Math.min(100, Math.max(0, confidence))}%"></div>
        </div>
        ${
          Array.isArray(prediction.matching_symptoms) && prediction.matching_symptoms.length
            ? `<p style="margin-top: 8px; color: var(--muted); font-size: 0.9em;">Matching symptoms: ${prediction.matching_symptoms.join(", ")}</p>`
            : ""
        }
      `;
      diseaseList.appendChild(diseaseItem);
    });
  }

  const modelIndicator = document.createElement("div");
  modelIndicator.style.cssText = "margin-top: 16px; padding: 8px; background: var(--surface-soft); border-radius: 8px; font-size: 0.9em; color: var(--muted); text-align: center;";
  modelIndicator.textContent = `Analysis powered by ${modelUsed === "rule_based" ? "Rule-Based Matcher" : "Local Fallback Matcher"}`;
  diseaseList.appendChild(modelIndicator);

  resultSection.classList.add("show");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getLocalFallbackPredictions(selectedSymptoms) {
  const normalized = new Set(selectedSymptoms.map((item) => String(item).trim().toLowerCase()));
  const predictions = [];

  for (const [disease, diseaseSymptoms] of Object.entries(LOCAL_FALLBACK_DISEASES)) {
    const diseaseSet = new Set(diseaseSymptoms.map((item) => item.toLowerCase()));
    let common = 0;
    for (const symptom of normalized) {
      if (diseaseSet.has(symptom)) {
        common += 1;
      }
    }

    const total = new Set([...normalized, ...diseaseSet]).size;
    const confidence = total > 0 ? (common / total) * 100 : 0;
    if (confidence > 0) {
      predictions.push({
        disease,
        confidence: Math.round(confidence * 100) / 100,
        matching_symptoms: diseaseSymptoms.filter((item) => normalized.has(item.toLowerCase()))
      });
    }
  }

  predictions.sort((a, b) => b.confidence - a.confidence);
  return predictions.slice(0, 5);
}

async function predictDisease() {
  const selectedSymptoms = getSelectedSymptoms();
  if (!selectedSymptoms.length) {
    showAlert('Please select at least one symptom.', 'error');
    return;
  }

  const predictBtn = document.getElementById("predictBtn");
  const floatingBtn = document.getElementById("floatingPredictBtn");

  const predictOriginalText = predictBtn ? predictBtn.textContent : "";
  const floatingOriginalText = floatingBtn ? floatingBtn.textContent : "";

  if (predictBtn) {
    predictBtn.textContent = "Analyzing...";
    predictBtn.disabled = true;
  }

  if (floatingBtn) {
    floatingBtn.textContent = "Analyzing...";
    floatingBtn.disabled = true;
  }

  const fallbackPredictions = getLocalFallbackPredictions(selectedSymptoms);
  displayPredictions(fallbackPredictions, "local");

  if (predictBtn) {
      predictBtn.textContent = predictOriginalText;
    predictBtn.disabled = false;
  }

  if (floatingBtn) {
    floatingBtn.textContent = floatingOriginalText;
    floatingBtn.disabled = false;
  }
}

window.predictDisease = predictDisease;
window.clearAllSymptoms = clearAllSymptoms;
