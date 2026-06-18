export interface DeptData {
  complaints:     string[];
  investigations: string[];
  diagnoses:      string[];
}

const deptData: Record<string, DeptData> = {
  "General Medicine": {
    complaints: [
      "Fever","Cough","Cold","Sore Throat","Headache","Body Ache","Fatigue","Weakness",
      "Abdominal Pain","Vomiting","Diarrhea","Constipation","Chest Pain","Dizziness",
      "Breathlessness","Burning Urination","Joint Pain","Loss of Appetite",
      "High Blood Sugar","High Blood Pressure",
    ],
    investigations: [
      "CBC","ESR","CRP","RBS","FBS","HbA1c","LFT","KFT","Lipid Profile","Urine R/M",
      "Thyroid Profile","ECG","Chest X-Ray","USG Abdomen","Dengue NS1","Malaria Test",
      "Widal","Vitamin D","Vitamin B12","Blood Culture",
    ],
    diagnoses: [
      "Viral Fever","Hypertension","Type 2 Diabetes","Gastritis","GERD","Typhoid",
      "Dengue","Malaria","Upper Respiratory Infection","Lower Respiratory Infection",
      "UTI","Migraine","Anemia","Hypothyroidism","Hyperthyroidism",
      "Viral Gastroenteritis","Hyperlipidemia","Dehydration","Food Poisoning","Bronchitis",
    ],
  },

  "Pediatrics": {
    complaints: [
      "Fever","Cough","Cold","Vomiting","Diarrhea","Poor Feeding","Poor Weight Gain",
      "Wheezing","Ear Pain","Abdominal Pain","Constipation","Skin Rash","Irritability",
      "Sore Throat","Seizures","Delayed Milestones","Worm Infestation","Dehydration",
      "Vaccination Visit","Breathing Difficulty",
    ],
    investigations: [
      "CBC","CRP","ESR","Dengue NS1","Malaria Test","Urine R/M","Stool Examination",
      "Chest X-Ray","Blood Culture","Widal","LFT","KFT","Electrolytes",
      "Thyroid Profile","Allergy Test",
    ],
    diagnoses: [
      "Viral Infection","Bronchiolitis","Pneumonia","Tonsillitis","Gastroenteritis",
      "Otitis Media","Asthma","Worm Infestation","Dengue","Malnutrition",
      "Febrile Seizure","Allergic Rhinitis","Dehydration","UTI","Viral Exanthem",
    ],
  },

  "Gynecology": {
    complaints: [
      "Irregular Periods","Heavy Bleeding","Missed Periods","Pelvic Pain","White Discharge",
      "Vaginal Itching","Pregnancy Checkup","Infertility","Painful Periods",
      "Menopause Symptoms","Lower Back Pain","Bleeding During Pregnancy","Breast Pain",
      "PCOS Symptoms","Pain During Intercourse",
    ],
    investigations: [
      "Pregnancy Test","CBC","TSH","LH","FSH","Prolactin","AMH","Hormonal Profile",
      "Pelvic Ultrasound","PAP Smear","HSG","Blood Sugar","Urine R/M",
      "Vitamin D","Follicular Study",
    ],
    diagnoses: [
      "PCOS","Pregnancy","Menorrhagia","Fibroid Uterus","Ovarian Cyst","Dysmenorrhea",
      "Infertility","Endometriosis","PID","Menopause","Cervicitis","Vaginitis",
      "Threatened Abortion","Ectopic Pregnancy","Hormonal Imbalance",
    ],
  },

  "Orthopedics": {
    complaints: [
      "Knee Pain","Back Pain","Neck Pain","Shoulder Pain","Hip Pain","Ankle Pain",
      "Wrist Pain","Heel Pain","Joint Stiffness","Fracture","Swelling","Sports Injury",
      "Numbness","Tingling","Muscle Pain",
    ],
    investigations: [
      "X-Ray","MRI","CT Scan","Vitamin D","Calcium","ESR","CRP","Uric Acid",
      "Rheumatoid Factor","Anti CCP","Bone Density Scan","Nerve Conduction Study",
      "Joint Aspiration","CBC","HLA-B27",
    ],
    diagnoses: [
      "Osteoarthritis","Rheumatoid Arthritis","Fracture","Frozen Shoulder","Slip Disc",
      "Sciatica","Cervical Spondylosis","Lumbar Spondylosis","Osteoporosis","Tennis Elbow",
      "Plantar Fasciitis","ACL Injury","Meniscus Tear","Gout","Ankylosing Spondylitis",
    ],
  },

  "Dermatology": {
    complaints: [
      "Acne","Itching","Rash","Hair Fall","Pigmentation","Dry Skin","Dandruff",
      "Skin Allergy","Fungal Infection","Nail Changes","Excessive Sweating",
      "White Patches","Red Patches","Skin Infection","Dark Spots",
    ],
    investigations: [
      "Skin Biopsy","Dermoscopy","KOH Mount","Patch Test","Hormonal Profile","CBC",
      "IgE Levels","Allergy Panel","Thyroid Profile","Fungal Culture",
    ],
    diagnoses: [
      "Acne Vulgaris","Tinea Infection","Psoriasis","Eczema","Dermatitis",
      "Seborrheic Dermatitis","Melasma","Vitiligo","Urticaria","Alopecia",
      "Contact Dermatitis","Atopic Dermatitis","Fungal Infection","Scabies","Rosacea",
    ],
  },

  "ENT": {
    complaints: [
      "Ear Pain","Ear Discharge","Hearing Loss","Tinnitus","Vertigo","Sore Throat",
      "Tonsillitis","Nasal Blockage","Sneezing","Sinus Pain","Voice Change",
      "Nose Bleeding","Snoring","Difficulty Swallowing","Chronic Cough",
    ],
    investigations: [
      "Audiometry","Tympanometry","Nasal Endoscopy","Throat Swab","CBC",
      "X-Ray PNS","CT PNS","MRI Ear","Allergy Test","Culture Sensitivity",
    ],
    diagnoses: [
      "Sinusitis","Tonsillitis","Otitis Media","Otitis Externa","Allergic Rhinitis",
      "DNS","Vertigo","Pharyngitis","Laryngitis","Nasal Polyp",
      "Hearing Loss","Tinnitus","Adenoid Hypertrophy","Epistaxis","Chronic Sinusitis",
    ],
  },

  "Ophthalmology": {
    complaints: [
      "Blurred Vision","Eye Redness","Eye Pain","Watering Eyes","Dry Eyes",
      "Itching Eyes","Foreign Body Sensation","Double Vision","Headache",
      "Light Sensitivity","Floaters","Night Vision Problems","Eye Discharge",
      "Vision Loss","Eye Injury",
    ],
    investigations: [
      "Visual Acuity","Refraction","Fundus Examination","Tonometry","OCT",
      "Visual Field Test","Slit Lamp Examination","Corneal Topography",
      "B Scan","Fluorescein Staining",
    ],
    diagnoses: [
      "Cataract","Glaucoma","Conjunctivitis","Dry Eye Syndrome","Refractive Error",
      "Diabetic Retinopathy","Corneal Ulcer","Stye","Blepharitis","Keratitis",
      "Retinal Detachment","Macular Degeneration","Uveitis","Chalazion","Eye Allergy",
    ],
  },

  "Psychiatry": {
    complaints: [
      "Anxiety","Depression","Insomnia","Panic Attacks","Mood Swings","Stress",
      "OCD Symptoms","Hallucinations","Addiction","Poor Concentration",
      "Memory Problems","Anger Issues","Social Anxiety","Burnout","Suicidal Thoughts",
    ],
    investigations: [
      "PHQ-9","GAD-7","HAM-D","HAM-A","MMSE","Mental Status Examination",
      "Suicide Risk Assessment","Substance Abuse Screening","Sleep Assessment","ADHD Screening",
    ],
    diagnoses: [
      "Generalized Anxiety Disorder","Depression","Panic Disorder","OCD","Bipolar Disorder",
      "Schizophrenia","Insomnia","ADHD","PTSD","Substance Abuse Disorder",
      "Social Anxiety Disorder","Adjustment Disorder","Personality Disorder",
      "Psychosis","Burnout Syndrome",
    ],
  },

  "Cardiology": {
    complaints: [
      "Chest Pain","Palpitations","Breathlessness","High Blood Pressure","Leg Swelling",
      "Dizziness","Syncope","Fatigue","Irregular Heartbeat","Exercise Intolerance",
      "Orthopnea","PND","Sweating","Arm Pain","Jaw Pain",
    ],
    investigations: [
      "ECG","2D Echo","TMT","Holter Monitoring","Troponin","BNP","Lipid Profile",
      "CBC","Chest X-Ray","Coronary CT","Cardiac MRI","Angiography",
      "Electrolytes","Thyroid Profile","HbA1c",
    ],
    diagnoses: [
      "Hypertension","Coronary Artery Disease","Angina","Heart Failure",
      "Atrial Fibrillation","Arrhythmia","Cardiomyopathy","Valvular Heart Disease",
      "Myocardial Infarction","Tachycardia","Bradycardia","Hyperlipidemia",
      "Pericarditis","Pulmonary Hypertension","Heart Block",
    ],
  },

  "Pulmonology": {
    complaints: [
      "Chronic Cough","Breathlessness","Wheezing","Chest Tightness","Sputum Production",
      "Fever","Hemoptysis","Snoring","Sleep Apnea","Chest Pain",
      "Smoking Related Symptoms","Night Cough","Recurrent Chest Infection",
      "Oxygen Desaturation","Exercise Intolerance",
    ],
    investigations: [
      "Chest X-Ray","HRCT Chest","Pulmonary Function Test","ABG","Sputum Culture",
      "CBC","ESR","CRP","Bronchoscopy","TB Gold Test","Mantoux Test",
      "Sleep Study","D-Dimer","Oxygen Saturation","CT Pulmonary Angiography",
    ],
    diagnoses: [
      "Asthma","COPD","Pneumonia","Tuberculosis","Acute Bronchitis","Chronic Bronchitis",
      "Sleep Apnea","Interstitial Lung Disease","Pleural Effusion","Pulmonary Fibrosis",
      "Respiratory Tract Infection","Pulmonary Embolism","Lung Abscess",
      "Bronchiectasis","Allergic Airway Disease",
    ],
  },
};

export function getDeptData(department: string): DeptData {
  return deptData[department] || deptData["General Medicine"];
}

export default deptData;
