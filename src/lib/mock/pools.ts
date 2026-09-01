export const DOCTOR_FIRST_NAMES = [
  "Ananya", "Rahul", "Priya", "Vikram", "Aditi", "Sanjay", "Kavita", "Arjun",
  "Meera", "Rohit", "Neha", "Karan", "Divya", "Amit", "Pooja", "Rajesh",
  "Shreya", "Nikhil", "Anjali", "Suresh", "Ritu", "Manoj", "Swati", "Deepak",
  "Kiran", "Alok", "Nandini", "Varun", "Ishita", "Gaurav",
];

export const DOCTOR_LAST_NAMES = [
  "Sharma", "Mehta", "Kapoor", "Nair", "Iyer", "Rao", "Deshmukh", "Patil",
  "Joshi", "Gupta", "Verma", "Reddy", "Bhatt", "Malhotra", "Kulkarni",
  "Chatterjee", "Menon", "Agarwal", "Singh", "Chopra", "Pillai", "Bose",
];

export const SPECIALTIES = [
  "Dermatology", "Dentistry", "Orthopedics", "Pediatrics", "Gynecology",
  "ENT", "Cardiology", "Ophthalmology", "Physiotherapy", "General Medicine",
  "Cosmetology", "Orthodontics", "Multi-Specialty", "Diabetology",
  "Gastroenterology", "IVF & Fertility",
];

export const BRAND_TEMPLATES: Array<(spec: string) => string> = [
  (s) => `${s} Care Clinic`,
  (s) => `${s} Wellness Center`,
  (s) => `${s} Speciality Clinic`,
  (s) => `${s} Studio`,
];

export const STANDALONE_BRANDS = [
  "SkinEthics", "ABC Dental Studio", "SmileCraft Dental", "Vitality Ortho",
  "CarePoint Multispeciality", "TrueSmile Dental", "Radiance Skin & Hair",
  "Bloom Women's Clinic", "Apex Physio & Rehab", "Clearview Eye Care",
  "HeartLine Cardiac Clinic", "Kidsafe Pediatric Clinic", "Aurora Fertility Center",
  "Sunrise Ortho & Spine", "Prime Dental Co.", "Elemental Skin Clinic",
];

export const CITY_AREAS: Record<string, string[]> = {
  Pune: ["Baner", "Wakad", "Kothrud", "Viman Nagar", "Kharadi", "Hinjewadi", "Aundh", "Deccan", "Hadapsar", "Camp"],
  Mumbai: ["Andheri", "Bandra", "Powai", "Thane", "Borivali", "Malad", "Chembur", "Dadar"],
  Bengaluru: ["Indiranagar", "Koramangala", "Whitefield", "HSR Layout", "Jayanagar", "Marathahalli"],
  Hyderabad: ["Banjara Hills", "Gachibowli", "Jubilee Hills", "Kondapur", "Madhapur"],
  Ahmedabad: ["Satellite", "Navrangpura", "Bopal", "Vastrapur"],
  "Delhi NCR": ["Gurgaon", "Noida", "Dwarka", "Rohini", "Vasant Kunj"],
  Nagpur: ["Dharampeth", "Sadar", "Civil Lines"],
  Chennai: ["Adyar", "Anna Nagar", "T Nagar", "Velachery"],
};

export const CITIES = Object.keys(CITY_AREAS);

import type { TeamMember } from "../types";

export const TEAM_MEMBERS: TeamMember[] = [
  { id: "tm-deepak", name: "Deepak", role: "Admin", team: "Leadership" },
  { id: "tm-bhumi", name: "Bhumi", role: "Account Manager", team: "Account Management" },
  { id: "tm-abhishek", name: "Abhishek", role: "Content", team: "Content" },
  { id: "tm-lipsita", name: "Lipsita", role: "Social", team: "Content" },
  { id: "tm-rohan", name: "Rohan", role: "Read Only", team: "HR/Admin" },
  { id: "tm-ritika", name: "Ritika Deshmukh", role: "Account Manager", team: "Account Management" },
  { id: "tm-meera", name: "Meera Nair", role: "Account Manager", team: "Account Management" },
  { id: "tm-aman", name: "Aman Kulkarni", role: "SEO", team: "SEO" },
  { id: "tm-rohanshah", name: "Rohan Shah", role: "SEO", team: "SEO" },
  { id: "tm-isha", name: "Isha Bhatt", role: "Web/Tech", team: "Web/Tech" },
  { id: "tm-suhas", name: "Suhas Patil", role: "Performance", team: "Performance Marketing" },
  { id: "tm-vikas", name: "Vikas Rao", role: "Reputation", team: "Reputation" },
  { id: "tm-neha", name: "Neha Joshi", role: "Content", team: "Content" },
  { id: "tm-kabir", name: "Kabir Malhotra", role: "Creative", team: "Creative" },
  { id: "tm-ananya", name: "Ananya Iyer", role: "Read Only", team: "Reporting" },
];

export const ACCOUNT_MANAGERS = TEAM_MEMBERS.filter((m) => m.role === "Account Manager");
export function teamByRole(role: TeamMember["role"]): TeamMember[] {
  return TEAM_MEMBERS.filter((m) => m.role === role);
}
export function teamForModule(module: string, seed: string): TeamMember {
  const map: Record<string, TeamMember["role"]> = {
    Google: "SEO", "Website & SEO": "SEO", Reputation: "Reputation", Content: "Content",
    Social: "Social", Ads: "Performance", Leads: "Performance", Reporting: "Account Manager",
  };
  const role = map[module] ?? "Account Manager";
  const pool = teamByRole(role);
  if (!pool.length) return TEAM_MEMBERS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

export const SERVICE_POOL: Record<string, string[]> = {
  Dermatology: ["Acne Treatment", "Hair PRP", "Skin Brightening", "Laser Hair Removal", "Chemical Peel", "Anti-Ageing", "Botox & Fillers", "Psoriasis Treatment"],
  Dentistry: ["Root Canal", "Dental Implants", "Teeth Whitening", "Braces", "Wisdom Tooth Removal", "Smile Makeover", "Pediatric Dentistry"],
  Orthodontics: ["Invisalign", "Metal Braces", "Ceramic Braces", "Retainers"],
  Orthopedics: ["Knee Replacement", "Spine Care", "Sports Injury", "Physiotherapy", "Joint Pain Treatment"],
  Pediatrics: ["Vaccination", "Newborn Care", "Growth Monitoring", "Nutrition Counselling"],
  Gynecology: ["Prenatal Care", "PCOS Treatment", "Infertility Consultation", "Laparoscopy"],
  ENT: ["Hearing Tests", "Sinus Treatment", "Tonsillectomy", "Snoring Treatment"],
  Cardiology: ["ECG & Stress Test", "Angioplasty", "Cholesterol Management", "Heart Checkup"],
  Ophthalmology: ["Cataract Surgery", "LASIK", "Glaucoma Treatment", "Eye Checkup"],
  Physiotherapy: ["Back Pain Therapy", "Sports Rehab", "Post-Surgery Rehab", "Posture Correction"],
  "General Medicine": ["Health Checkup", "Diabetes Management", "Fever & Infection Care", "Preventive Screening"],
  Cosmetology: ["Botox", "Dermal Fillers", "Skin Resurfacing", "Body Contouring"],
  "Multi-Specialty": ["General Consultation", "Diagnostics", "Minor Surgery", "Health Packages"],
  Diabetology: ["Diabetes Screening", "Insulin Management", "Foot Care Clinic"],
  Gastroenterology: ["Endoscopy", "Colonoscopy", "Liver Care", "IBS Treatment"],
  "IVF & Fertility": ["IVF Consultation", "IUI", "Fertility Preservation", "Male Infertility"],
};

export const KEYWORD_INTENTS = ["dermatologist in", "skin clinic", "acne treatment", "best dentist in", "dental implants", "orthopedic doctor in", "knee specialist", "pediatrician in", "gynecologist in", "physiotherapy in"];
