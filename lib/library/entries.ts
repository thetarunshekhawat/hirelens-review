/**
 * The evidence library: the approved sources the review and the assistant may
 * rely on. Indian law comes first and governs; foreign law and standards are
 * marked as reference only — useful benchmarks, not obligations for Kestrel.
 *
 * Summaries are written for this product and paraphrase the source; the link
 * goes to the source itself. Where sources disagree, or the law is unsettled,
 * the entry says so in `caveat` rather than picking a side.
 */

export type EntryKind = "India law" | "India case law" | "Reference standard" | "Research" | "Precedent" | "Industry data";
export type Authority = "binding" | "reference" | "evidence";

export interface LibraryEntry {
  id: string;
  title: string;
  kind: EntryKind;
  authority: Authority;
  jurisdiction: string;
  citation: string;
  url: string;
  summary: string;
  keyPoints: string[];
  /** Where the source is contested, unsettled or limited. */
  caveat?: string;
  tags: string[];
}

export const LIBRARY: LibraryEntry[] = [
  /* -------------------------------------------------------------- India law */
  {
    id: "dpdp-public-exemption",
    title: "DPDP Act 2023, s.3(c)(ii): publicly available personal data",
    kind: "India law",
    authority: "binding",
    jurisdiction: "India",
    citation: "Digital Personal Data Protection Act, 2023, section 3(c)(ii)",
    url: "https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf",
    summary:
      "The Act does not apply to personal data that the person it relates to has made, or caused to be made, publicly available, or that someone is legally obliged to publish.",
    keyPoints: [
      "The exemption turns on WHO made the data public: the person themselves, or someone under a legal obligation.",
      "Content posted by friends or family that tags or names a candidate was not made public by the candidate, so it is not covered.",
      "The Act does not define 'made publicly available', or say what happens when a post is later made private or deleted.",
      "Public is not the same as exempt: scraping operations should not assume every visible post falls outside the Act.",
    ],
    caveat:
      "The scope of the exemption is untested before the Data Protection Board. Whether a vendor's bulk collection for scoring is covered is an open legal question for Kestrel's counsel.",
    tags: ["public data", "exemption", "scraping", "tagged", "photo", "friend", "family", "consent", "social media", "section 3"],
  },
  {
    id: "dpdp-consent-notice",
    title: "DPDP Act 2023, ss.4–6: lawful grounds, notice and consent",
    kind: "India law",
    authority: "binding",
    jurisdiction: "India",
    citation: "Digital Personal Data Protection Act, 2023, sections 4, 5 and 6",
    url: "https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf",
    summary:
      "Where the Act applies, personal data may be processed only for a lawful purpose, with consent or for a listed legitimate use. Consent must be free, specific, informed, unconditional and unambiguous, limited to the data necessary for the purpose, and preceded by a notice.",
    keyPoints: [
      "The notice must describe the personal data and the purpose, and how to withdraw consent and complain.",
      "Consent covers only the data necessary for the specified purpose.",
      "Consent in hiring is rarely free: a candidate who refuses fears losing the job.",
    ],
    tags: ["consent", "notice", "lawful purpose", "candidate notice", "section 5", "section 6"],
  },
  {
    id: "dpdp-legitimate-use-employment",
    title: "DPDP Act 2023, s.7(i): legitimate use for employment purposes",
    kind: "India law",
    authority: "binding",
    jurisdiction: "India",
    citation: "Digital Personal Data Protection Act, 2023, section 7(i)",
    url: "https://www.barandbench.com/law-firms/view-point/navigating-legitimate-use-exemption-employee-data-digital-personal-data-protection-act-2023",
    summary:
      "An employer may process personal data without consent 'for the purposes of employment' or to safeguard itself from loss or liability, with examples such as preventing corporate espionage and protecting trade secrets.",
    keyPoints: [
      "Every statutory example is defensive and security-specific.",
      "Commentators read it as not authorising blanket surveillance.",
      "It refers to employment; whether it extends to applicants who are not yet employees is unsettled.",
    ],
    caveat: "Whether s.7(i) covers social-media screening of applicants has not been decided. Legal counsel must take a view.",
    tags: ["legitimate use", "employment", "applicants", "section 7", "without consent"],
  },
  {
    id: "dpdp-accuracy",
    title: "DPDP Act 2023, s.8(3): accuracy of data used in decisions",
    kind: "India law",
    authority: "binding",
    jurisdiction: "India",
    citation: "Digital Personal Data Protection Act, 2023, section 8(3)",
    url: "https://dpdpa.com/dpdpa2023/chapter-2/section8.html",
    summary:
      "Where personal data is likely to be used to make a decision that affects the person, the data fiduciary must ensure its completeness, accuracy and consistency.",
    keyPoints: [
      "A hiring shortlist is a decision that affects the candidate.",
      "A profile matched to the wrong person, or a post misread by a model that does not understand its language, fails this duty.",
    ],
    tags: ["accuracy", "wrong person", "identity", "misread", "decision", "section 8"],
  },
  {
    id: "dpdp-erasure",
    title: "DPDP Act 2023, s.8(7): erasure when the purpose is served",
    kind: "India law",
    authority: "binding",
    jurisdiction: "India",
    citation: "Digital Personal Data Protection Act, 2023, section 8(7)",
    url: "https://dpdpa.com/dpdpa2023/chapter-2/section8.html",
    summary:
      "Personal data must be erased when consent is withdrawn or as soon as it is reasonable to assume the purpose is no longer served, and the fiduciary must make its processors erase it too.",
    keyPoints: [
      "The vendor's 'up to 5 years' retention has no link to the hiring purpose.",
      "Kestrel remains responsible for making its vendor delete data.",
    ],
    tags: ["retention", "erasure", "deletion", "vendor", "processor", "section 8"],
  },
  {
    id: "dpdp-rules-2025",
    title: "DPDP Rules 2025: notification and phased commencement",
    kind: "India law",
    authority: "binding",
    jurisdiction: "India",
    citation: "Digital Personal Data Protection Rules, 2025 (notified 13 November 2025)",
    url: "https://www.hoganlovells.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-",
    summary:
      "The Rules were notified on 13 November 2025. Most operational duties — notices, security safeguards, breach reporting, retention — apply from 13 May 2027, eighteen months after notification.",
    keyPoints: [
      "Notices must give an itemised description of the personal data and the specific purpose.",
      "Kestrel's 2027 hiring cycle will run after the main obligations take effect.",
    ],
    tags: ["rules", "commencement", "timeline", "2027", "notice"],
  },
  {
    id: "dpdp-penalties",
    title: "DPDP Act 2023, Schedule: penalties",
    kind: "India law",
    authority: "binding",
    jurisdiction: "India",
    citation: "Digital Personal Data Protection Act, 2023, Schedule",
    url: "https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf",
    summary:
      "Penalties reach ₹250 crore for failing to take reasonable security safeguards and ₹50 crore for breaches of other provisions of the Act or Rules.",
    keyPoints: ["Penalties are imposed by the Data Protection Board of India."],
    tags: ["penalty", "fine", "risk", "board"],
  },
  {
    id: "puttaswamy-proportionality",
    title: "K.S. Puttaswamy v. Union of India: privacy and proportionality",
    kind: "India case law",
    authority: "binding",
    jurisdiction: "India",
    citation: "(2017) 10 SCC 1; (2019) 1 SCC 1",
    url: "https://globalfreedomofexpression.columbia.edu/cases/puttaswamy-v-union-of-india-ii/",
    summary:
      "The Supreme Court held privacy to be a fundamental right and applied a proportionality test to intrusions: a legitimate aim, a rational connection to it, no less restrictive means that would work, and a fair balance between the aim and the intrusion.",
    keyPoints: [
      "The test binds the State; for a private employer it is the accepted Indian standard for judging whether an intrusion is justified.",
      "Question 6 of this review — is there a less intrusive way? — is the necessity limb of the test.",
    ],
    caveat: "Applied here as a normative standard. The constitutional test does not bind a private company directly.",
    tags: ["proportionality", "necessity", "less intrusive", "privacy", "fundamental right", "supreme court"],
  },
  {
    id: "code-on-wages-gender",
    title: "Code on Wages 2019, s.3: no gender discrimination in recruitment",
    kind: "India law",
    authority: "binding",
    jurisdiction: "India",
    citation: "Code on Wages, 2019, section 3 (in force from 21 November 2025)",
    url: "https://www.in.kpmg.com/taxflashnews/KPMG-Flash-News-GOI-notifies-implementation-of-Labour-Codes.pdf",
    summary:
      "Employers may not discriminate on the ground of gender, including transgender identity, in recruitment, wages or conditions of employment for the same or similar work. The Code replaced the Equal Remuneration Act 1976 when the four labour codes took effect on 21 November 2025.",
    keyPoints: [
      "A signal that penalises women's engagement posts applies a gender-linked penalty at the recruitment stage.",
    ],
    tags: ["gender", "women", "recruitment", "discrimination", "marital status", "labour code"],
  },
  {
    id: "rpwd-2016",
    title: "Rights of Persons with Disabilities Act 2016",
    kind: "India law",
    authority: "binding",
    jurisdiction: "India",
    citation: "RPwD Act, 2016, sections 20–21",
    url: "https://leglobal.law/countries/india/employment-law/employment-law-overview-india/04-anti-discrimination-laws/",
    summary:
      "Prohibits discrimination on the ground of disability in employment and requires every establishment to publish an equal opportunity policy.",
    keyPoints: ["Health signals that reveal a disability bring this Act into play."],
    tags: ["disability", "health", "equal opportunity", "discrimination"],
  },
  {
    id: "transgender-act-2019",
    title: "Transgender Persons (Protection of Rights) Act 2019",
    kind: "India law",
    authority: "binding",
    jurisdiction: "India",
    citation: "Transgender Persons (Protection of Rights) Act, 2019, section 9",
    url: "https://leglobal.law/countries/india/employment-law/employment-law-overview-india/04-anti-discrimination-laws/",
    summary: "No establishment may discriminate against a transgender person in employment matters, including recruitment and promotion.",
    keyPoints: ["Gender-linked signals can reach transgender candidates too."],
    tags: ["transgender", "gender", "recruitment", "discrimination"],
  },
  {
    id: "hiv-act-2017",
    title: "HIV and AIDS (Prevention and Control) Act 2017",
    kind: "India law",
    authority: "binding",
    jurisdiction: "India",
    citation: "HIV and AIDS (Prevention and Control) Act, 2017, section 3",
    url: "https://leglobal.law/countries/india/employment-law/employment-law-overview-india/04-anti-discrimination-laws/",
    summary: "Prohibits discrimination on the basis of HIV status in employment, including denial of employment.",
    keyPoints: ["Applies to private employers. Health content is one way HIV status can surface."],
    tags: ["hiv", "health", "discrimination", "employment"],
  },

  /* ------------------------------------------------------ reference only */
  {
    id: "wp29-opinion-2-2017",
    title: "EU Article 29 Working Party, Opinion 2/2017 on data processing at work",
    kind: "Reference standard",
    authority: "reference",
    jurisdiction: "European Union",
    citation: "WP 249, adopted 8 June 2017",
    url: "https://ec.europa.eu/newsroom/article29/items/610169",
    summary:
      "European regulators' guidance on employee and applicant data. Employers should not assume that a public profile may be processed simply because it is public; screening must be necessary and relevant to the job, and applicants must be told.",
    keyPoints: [
      "'Availability of access' is not 'permission to process'.",
      "Consent is rarely valid in employment because of the power imbalance.",
      "Only information relevant to the job may be collected.",
    ],
    caveat: "Reference only: EU guidance, not Indian law.",
    tags: ["social media screening", "recruitment", "applicants", "relevance", "consent", "europe"],
  },
  {
    id: "gdpr-art9",
    title: "GDPR Article 9: special categories of personal data",
    kind: "Reference standard",
    authority: "reference",
    jurisdiction: "European Union",
    citation: "Regulation (EU) 2016/679, Article 9",
    url: "https://gdpr-info.eu/art-9-gdpr/",
    summary:
      "Data revealing racial or ethnic origin, political opinions, religious beliefs, health, sex life or sexual orientation may not be processed except under narrow conditions.",
    keyPoints: [
      "India's DPDP Act has no equivalent special category, so this is a benchmark for what is widely treated as sensitive.",
      "Inferring religion or politics from posts is processing of special-category data in the EU.",
    ],
    caveat: "Reference only. The absence of a sensitive category in Indian law does not make these inferences appropriate.",
    tags: ["sensitive data", "religion", "political opinion", "health", "special category", "europe"],
  },
  {
    id: "gdpr-art22",
    title: "GDPR Article 22: decisions based solely on automated processing",
    kind: "Reference standard",
    authority: "reference",
    jurisdiction: "European Union",
    citation: "Regulation (EU) 2016/679, Article 22",
    url: "https://gdpr-info.eu/art-22-gdpr/",
    summary:
      "People have the right not to be subject to a decision based solely on automated processing that significantly affects them, with safeguards including human intervention.",
    keyPoints: ["Rejecting applicants below an automated line without human review is the kind of decision Article 22 addresses."],
    caveat: "Reference only.",
    tags: ["automated decision", "human review", "shortlist", "europe"],
  },
  {
    id: "eu-ai-act-annex-iii",
    title: "EU AI Act: recruitment systems are high-risk",
    kind: "Reference standard",
    authority: "reference",
    jurisdiction: "European Union",
    citation: "Regulation (EU) 2024/1689, Annex III point 4(a); Articles 10 and 26",
    url: "https://artificialintelligenceact.eu/annex/3/",
    summary:
      "AI systems used to place job advertisements, filter applications or evaluate candidates are classified as high-risk, bringing duties on data governance, human oversight and informing affected people.",
    keyPoints: [
      "Training data must be relevant, representative and examined for bias (Article 10).",
      "Deployers must assign human oversight and inform people affected (Article 26).",
    ],
    caveat: "Reference only. Shows where international practice for hiring AI is heading.",
    tags: ["high-risk", "recruitment", "ai act", "human oversight", "bias", "europe"],
  },
  {
    id: "nyc-ll144",
    title: "New York City Local Law 144: bias audits of hiring tools",
    kind: "Reference standard",
    authority: "reference",
    jurisdiction: "New York City, USA",
    citation: "NYC Local Law 144 of 2021; enforced from 5 July 2023",
    url: "https://www.deloitte.com/us/en/services/audit/articles/nyc-local-law-144-algorithmic-bias.html",
    summary:
      "Employers using automated employment decision tools must commission an annual independent bias audit reporting selection rates and impact ratios by group, publish a summary, and notify candidates in advance.",
    keyPoints: ["The model for the fairness test's impact-ratio table.", "Requires candidate notice before use."],
    caveat: "Reference only.",
    tags: ["bias audit", "impact ratio", "selection rate", "notice", "united states"],
  },
  {
    id: "eeoc-four-fifths",
    title: "US Uniform Guidelines: the four-fifths rule",
    kind: "Reference standard",
    authority: "reference",
    jurisdiction: "United States",
    citation: "29 CFR 1607.4(D)",
    url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XIV/part-1607/section-1607.4",
    summary:
      "A selection rate for any group that is less than four-fifths (80%) of the rate for the group with the highest rate is generally regarded as evidence of adverse impact.",
    keyPoints: [
      "A rule of thumb, not a test of legality.",
      "Small groups make ratios unstable; this review does not judge groups under 15 people.",
    ],
    caveat: "Reference only. India has no statutory equivalent.",
    tags: ["four-fifths", "adverse impact", "impact ratio", "selection rate", "fairness test"],
  },
  {
    id: "ftc-social-intelligence",
    title: "US FTC: social media background reports are consumer reports",
    kind: "Precedent",
    authority: "reference",
    jurisdiction: "United States",
    citation: "FTC closing letter to Social Intelligence Corp., 9 May 2011",
    url: "https://www.ftc.gov/sites/default/files/documents/closing_letters/social-intelligence-corporation/110509socialintelligenceletter.pdf",
    summary:
      "The FTC treated a company compiling social-media reports for employers as a consumer reporting agency, bringing accuracy duties and the obligation to notify applicants of adverse action.",
    keyPoints: ["Social-media screening vendors carry accuracy and notice duties in the US."],
    caveat: "Reference only.",
    tags: ["vendor", "background check", "accuracy", "adverse action", "united states"],
  },
  {
    id: "platform-terms-predictim",
    title: "Predictim (2018): platforms cut off a social-media screening service",
    kind: "Precedent",
    authority: "evidence",
    jurisdiction: "United States",
    citation: "CBS News, December 2018",
    url: "https://cbsnews.com/news/ai-babysitting-service-predictim-blocked-by-facebook-and-twitter",
    summary:
      "A service that scored babysitters' 'risk' from their social media lost access when Twitter revoked its API access, citing a ban on using its data for surveillance or background checks, and Facebook restricted its access pending investigation. The service paused its launch.",
    keyPoints: [
      "Platform terms can prohibit exactly this use, whatever the law says.",
      "Kestrel has no evidence the vendor collects data with platform permission.",
    ],
    tags: ["platform terms", "scraping", "background check", "vendor", "precedent"],
  },

  /* ------------------------------------------------------------ evidence */
  {
    id: "van-iddekinge-2016",
    title: "Van Iddekinge et al. (2016): Facebook ratings did not predict job performance",
    kind: "Research",
    authority: "evidence",
    jurisdiction: "Research",
    citation: "Journal of Management, 42(7), 2016",
    url: "https://digitalcommons.memphis.edu/facpubs/12063",
    summary:
      "Recruiters rated job-seeking students' Facebook profiles; the students were followed into their jobs. Ratings were unrelated to supervisor-rated performance, turnover intentions or actual turnover, added nothing beyond standard predictors, and differed across groups, favouring women and White applicants.",
    keyPoints: [
      "No evidence that social-media impressions predict performance or retention.",
      "Evidence that they create group differences.",
    ],
    caveat: "Kluemper et al. (2012) reached a more positive result with trained raters; see that entry.",
    tags: ["validity", "prediction", "turnover", "retention", "research", "adverse impact"],
  },
  {
    id: "kluemper-2012",
    title: "Kluemper et al. (2012): trained raters' Facebook personality ratings",
    kind: "Research",
    authority: "evidence",
    jurisdiction: "Research",
    citation: "Journal of Applied Social Psychology, 42(5), 2012",
    url: "https://www.hrreporter.com/news/hr-news/is-facebook-an-effective-screening-tool/314279",
    summary:
      "Trained raters' assessments of personality from Facebook profiles correlated with later job performance, on a small employed sub-sample of 56 students.",
    keyPoints: [
      "Conflicting evidence exists; the research is not one-sided.",
      "Its raters scored personality traits, not the vendor's signals such as posting time or follower count.",
    ],
    caveat: "Small sample; not a validation of any automated tool. Recorded so the review does not overstate the case against.",
    tags: ["validity", "conflicting evidence", "personality", "research"],
  },
  {
    id: "amazon-recruiting-2018",
    title: "A retail company's recruiting model learned to penalise women (2018)",
    kind: "Precedent",
    authority: "evidence",
    jurisdiction: "United States",
    citation: "Reuters, 10 October 2018",
    url: "https://www.hrreporter.com/focus-areas/recruitment-and-staffing/amazon-scraps-secret-ai-recruiting-tool-that-showed-bias-against-women/287026",
    summary:
      "Amazon abandoned an experimental résumé-scoring model after finding it downgraded résumés containing the word \"women's\" and graduates of two women's colleges. It had learned from ten years of mostly male applicants' résumés.",
    keyPoints: [
      "A model trained on past hiring learns past hiring patterns.",
      "Why the missing training-data description is a serious gap.",
    ],
    tags: ["training data", "gender", "bias", "culture fit", "precedent"],
  },
  {
    id: "careerbuilder-india",
    title: "Indian employers already screen social media",
    kind: "Industry data",
    authority: "evidence",
    jurisdiction: "India",
    citation: "CareerBuilder India survey of 1,200 employers, reported by People Matters",
    url: "https://www.peoplematters.in/news/strategic-hr/companies-rejecting-job-applicants-due-to-social-media-6577",
    summary:
      "59% of surveyed Indian employers used social media to research candidates, a further 33% planned to, and about 68% of those who found negative content decided against hiring.",
    keyPoints: ["The practice is common in India; this review is about doing it at scale and by machine."],
    caveat: "An older employer survey; current figures may differ.",
    tags: ["survey", "industry", "india", "prevalence"],
  },
];

export const LIBRARY_BY_ID: Record<string, LibraryEntry> = Object.fromEntries(LIBRARY.map((e) => [e.id, e]));
