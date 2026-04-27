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

const symptomDisplayNames = {
  itching: "Itchy skin",
  skin_rash: "Skin rash",
  nodal_skin_eruptions: "Small skin bumps",
  continuous_sneezing: "Frequent sneezing",
  shivering: "Shivering",
  chills: "Chills",
  joint_pain: "Joint pain",
  stomach_pain: "Stomach pain",
  acidity: "Acid reflux",
  ulcers_on_tongue: "Tongue sores",
  muscle_wasting: "Muscle loss",
  vomiting: "Vomiting",
  burning_micturition: "Burning when urinating",
  "spotting_ urination": "Spotting during urination",
  fatigue: "Tiredness",
  weight_gain: "Weight gain",
  anxiety: "Anxiety",
  cold_hands_and_feets: "Cold hands and feet",
  mood_swings: "Mood swings",
  weight_loss: "Weight loss",
  restlessness: "Restlessness",
  lethargy: "Low energy",
  patches_in_throat: "Patches in the throat",
  irregular_sugar_level: "Unstable blood sugar",
  cough: "Cough",
  high_fever: "High fever",
  sunken_eyes: "Sunken eyes",
  breathlessness: "Shortness of breath",
  sweating: "Excess sweating",
  dehydration: "Dehydration",
  indigestion: "Indigestion",
  headache: "Headache",
  yellowish_skin: "Yellowish skin",
  dark_urine: "Dark urine",
  nausea: "Nausea",
  loss_of_appetite: "Loss of appetite",
  pain_behind_the_eyes: "Pain behind the eyes",
  back_pain: "Back pain",
  constipation: "Constipation",
  abdominal_pain: "Abdominal pain",
  diarrhoea: "Diarrhea",
  mild_fever: "Mild fever",
  yellow_urine: "Yellow urine",
  yellowing_of_eyes: "Yellow eyes",
  acute_liver_failure: "Liver distress",
  fluid_overload: "Fluid buildup",
  swelling_of_stomach: "Swollen stomach",
  swelled_lymph_nodes: "Swollen lymph nodes",
  malaise: "General discomfort",
  blurred_and_distorted_vision: "Blurred vision",
  phlegm: "Phlegm",
  throat_irritation: "Sore or irritated throat",
  redness_of_eyes: "Red eyes",
  sinus_pressure: "Sinus pressure",
  runny_nose: "Runny nose",
  congestion: "Nasal congestion",
  chest_pain: "Chest pain",
  weakness_in_limbs: "Weak arms or legs",
  fast_heart_rate: "Fast heartbeat",
  pain_during_bowel_movements: "Pain during bowel movement",
  pain_in_anal_region: "Anal pain",
  bloody_stool: "Blood in stool",
  irritation_in_anus: "Anal irritation",
  neck_pain: "Neck pain",
  dizziness: "Dizziness",
  cramps: "Cramps",
  bruising: "Easy bruising",
  obesity: "Weight-related obesity concerns",
  swollen_legs: "Swollen legs",
  swollen_blood_vessels: "Swollen veins",
  puffy_face_and_eyes: "Puffy face or eyes",
  enlarged_thyroid: "Swollen thyroid area",
  brittle_nails: "Brittle nails",
  swollen_extremeties: "Swollen hands or feet",
  excessive_hunger: "Excessive hunger",
  extra_marital_contacts: "Sexual exposure concern",
  drying_and_tingling_lips: "Dry or tingling lips",
  slurred_speech: "Slurred speech",
  knee_pain: "Knee pain",
  hip_joint_pain: "Hip joint pain",
  muscle_weakness: "Muscle weakness",
  stiff_neck: "Stiff neck",
  swelling_joints: "Swollen joints",
  movement_stiffness: "Body stiffness",
  spinning_movements: "Spinning sensation",
  loss_of_balance: "Loss of balance",
  unsteadiness: "Unsteadiness",
  weakness_of_one_body_side: "Weakness on one side",
  loss_of_smell: "Loss of smell",
  bladder_discomfort: "Bladder discomfort",
  "foul_smell_of urine": "Strong-smelling urine",
  continuous_feel_of_urine: "Feeling like you still need to urinate",
  passage_of_gases: "Excess gas",
  internal_itching: "Internal itching",
  "toxic_look_(typhos)": "Very ill appearance",
  depression: "Low mood",
  irritability: "Irritability",
  muscle_pain: "Muscle pain",
  altered_sensorium: "Confusion or unusual awareness",
  red_spots_over_body: "Red spots on the body",
  belly_pain: "Belly pain",
  abnormal_menstruation: "Irregular menstruation",
  "dischromic _patches": "Skin discoloration patches",
  watering_from_eyes: "Watery eyes",
  increased_appetite: "Increased appetite",
  polyuria: "Frequent urination",
  family_history: "Relevant family history",
  mucoid_sputum: "Mucus in sputum",
  rusty_sputum: "Rust-colored sputum",
  lack_of_concentration: "Poor concentration",
  visual_disturbances: "Vision disturbances",
  receiving_blood_transfusion: "Recent blood transfusion",
  receiving_unsterile_injections: "Unsafe injection exposure",
  coma: "Loss of consciousness",
  stomach_bleeding: "Stomach bleeding",
  distention_of_abdomen: "Bloated abdomen",
  history_of_alcohol_consumption: "Heavy alcohol use history",
  "fluid_overload.1": "Fluid buildup",
  blood_in_sputum: "Blood in sputum",
  prominent_veins_on_calf: "Visible calf veins",
  palpitations: "Heart palpitations",
  painful_walking: "Pain when walking",
  pus_filled_pimples: "Pus-filled pimples",
  blackheads: "Blackheads",
  scurring: "Scaly skin",
  skin_peeling: "Peeling skin",
  silver_like_dusting: "Silvery skin flakes",
  small_dents_in_nails: "Small dents in nails",
  inflammatory_nails: "Inflamed nails",
  blister: "Blisters",
  red_sore_around_nose: "Red sore around the nose",
  yellow_crust_ooze: "Yellow crust or ooze"
};

document.addEventListener("DOMContentLoaded", () => {
  renderSymptoms();
  setupSymptomSearch();
  updateSelectionSummary();
});

function setupSymptomSearch() {
  const searchInput = document.getElementById("symptomSearch");
  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", filterSymptoms);
}

function formatSymptomName(symptom) {
  if (symptomDisplayNames[symptom]) {
    return symptomDisplayNames[symptom];
  }
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
    checkbox.addEventListener("change", updateSelectionSummary);
    fragment.appendChild(wrapper);
  });

  grid.appendChild(fragment);
}

function filterSymptoms() {
  const searchInput = document.getElementById("symptomSearch");
  const emptyState = document.getElementById("symptomEmptyState");
  if (!searchInput) {
    return;
  }

  const query = searchInput.value.toLowerCase();
  const symptomCheckboxes = document.querySelectorAll(".symptom-checkbox");
  let visibleCount = 0;

  symptomCheckboxes.forEach((checkbox) => {
    const label = checkbox.querySelector("label");
    const labelText = label ? label.textContent.toLowerCase() : "";
    const isVisible = labelText.includes(query);
    checkbox.style.display = isVisible ? "flex" : "none";
    if (isVisible) {
      visibleCount += 1;
    }
  });

  if (emptyState) {
    emptyState.style.display = visibleCount === 0 ? "block" : "none";
  }
}

function getSelectedSymptoms() {
  const checked = document.querySelectorAll('.symptom-checkbox input[type="checkbox"]:checked');
  return Array.from(checked).map((element) => element.value);
}

function updateSelectionSummary() {
  const selectedSymptoms = getSelectedSymptoms();
  const symptomCount = document.getElementById("symptomCount");
  const predictBtn = document.getElementById("predictBtn");

  if (symptomCount) {
    const suffix = selectedSymptoms.length === 1 ? "" : "s";
    symptomCount.textContent = `${selectedSymptoms.length} symptom${suffix} selected`;
  }

  if (predictBtn) {
    predictBtn.disabled = selectedSymptoms.length === 0;
  }
}

function clearAllSymptoms() {
  const selected = document.querySelectorAll('.symptom-checkbox input[type="checkbox"]:checked');
  selected.forEach((checkbox) => {
    checkbox.checked = false;
  });
  const searchInput = document.getElementById("symptomSearch");
  if (searchInput) {
    searchInput.value = "";
  }
  renderSymptoms();
  updateSelectionSummary();
  filterSymptoms();
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
  const predictionTitle = document.getElementById("predictionTitle");
  const analysisPlaceholder = document.getElementById("analysisPlaceholder");
  if (!resultSection || !diseaseList) {
    return;
  }

  diseaseList.innerHTML = "";
  if (analysisPlaceholder) {
    analysisPlaceholder.style.display = "none";
  }
  if (predictionTitle) {
    predictionTitle.style.display = "block";
  }

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
            ? `<p style="margin-top: 8px; color: var(--muted); font-size: 0.9em;">Matching symptoms: ${prediction.matching_symptoms.map((item) => formatSymptomName(item)).join(", ")}</p>`
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
  const predictOriginalText = predictBtn ? predictBtn.textContent : "";

  if (predictBtn) {
    predictBtn.textContent = "Analyzing...";
    predictBtn.disabled = true;
  }

  const fallbackPredictions = getLocalFallbackPredictions(selectedSymptoms);
  displayPredictions(fallbackPredictions, "local");

  if (predictBtn) {
    predictBtn.textContent = predictOriginalText;
    predictBtn.disabled = false;
  }
}

window.predictDisease = predictDisease;
window.clearAllSymptoms = clearAllSymptoms;
