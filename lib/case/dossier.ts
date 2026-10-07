/**
 * The case dossier: who is asking, what they want to buy, and what the vendor
 * has and has not handed over. All organisations named here are fictional.
 */

export const COMPANY = {
  name: "Kestrel Infotech Ltd.",
  shortName: "Kestrel",
  hq: "Bengaluru, Karnataka",
  employees: "about 60,000",
  business: "IT services and consulting",
  freshersPerYear: 20000,
  campuses: 410,
};

export const VENDOR = {
  name: "Orbis Talent Analytics Pvt. Ltd.",
  product: "Orbis SocialFit",
  pitch:
    "Reads a candidate's public social media and returns a Reliability score, a " +
    "Culture-fit score and a Professionalism flag within minutes of application.",
  platforms: ["Instagram", "X", "Facebook", "LinkedIn", "YouTube comments"],
  claimedAccuracy: "92% accurate at predicting who joins and stays",
  pricing: "₹38 per candidate screened",
};

export const PROBLEM = {
  renegeRate: 18, // % of accepted offers where the fresher never joined, last cycle
  firstYearAttrition: 22, // % who left within twelve months
  costPerNoShow: "about ₹1.6 lakh in wasted training seat, onboarding and project planning",
  statement:
    "Last hiring cycle, 18% of freshers who accepted an offer never joined, and " +
    "22% of those who did left within a year. Talent Acquisition wants a way to " +
    "predict both before an offer is made.",
};

export const PROPOSAL = {
  title: "Adopt Orbis SocialFit for campus hiring, 2027 cycle",
  raisedBy: "Head of Talent Acquisition",
  reviewedBy: "Privacy Office",
  decisionNeeded:
    "Whether Kestrel should use SocialFit to screen campus applicants, and if " +
    "so, on what conditions.",
  intendedUse:
    "Score every campus applicant who clears the aptitude test. Applicants below " +
    "the shortlist line would not be invited to interview.",
  volume: "about 55,000 applicants a year clear the aptitude test",
};

/** The two people who own the decision. The review supports them; it does not replace them. */
export const DECISION_OWNERS = [
  {
    role: "Head of Talent Acquisition",
    owns: "Whether the business case justifies the tool, and whether culture fit should be scored at all.",
  },
  {
    role: "Data Protection Officer",
    owns: "Whether the processing is lawful and proportionate, and the conditions it must meet.",
  },
];

export type DocStatus = "received" | "partial" | "missing";

/**
 * What the review asked the vendor for. Missing items are not paperwork gaps:
 * each one is a question the review cannot answer without it.
 */
export const VENDOR_DOCUMENTS: Array<{
  item: string;
  status: DocStatus;
  why: string;
}> = [
  {
    item: "Product brochure and signal list",
    status: "received",
    why: "Tells us what the tool reads and how each signal moves the score.",
  },
  {
    item: "Sample candidate reports (anonymised)",
    status: "received",
    why: "Shows the tool's actual output, which the candidate reviews are built from.",
  },
  {
    item: "Validation study linking scores to joining and retention",
    status: "missing",
    why: "Without it, the 92% accuracy claim cannot be checked, and there is no evidence the tool predicts anything.",
  },
  {
    item: "Description of training data",
    status: "missing",
    why: "If the model learned from past hires, it can learn past hiring bias, as a well-known retail recruiting tool did.",
  },
  {
    item: "Independent bias audit",
    status: "missing",
    why: "No selection-rate comparison by gender, region, language or college tier has been done.",
  },
  {
    item: "Languages the text models support",
    status: "partial",
    why: "The vendor confirms English. Hindi, Hinglish and other Indian languages are 'in beta'.",
  },
  {
    item: "Method for confirming a profile belongs to the candidate",
    status: "partial",
    why: "The vendor matches on name and photo similarity. No error rate was given.",
  },
  {
    item: "Platform permissions for data collection",
    status: "missing",
    why: "Several platforms prohibit using their data for background checks or surveillance.",
  },
  {
    item: "Data retention and deletion terms",
    status: "partial",
    why: "Reports are kept for 'up to 5 years' with no link to the hiring purpose.",
  },
];
