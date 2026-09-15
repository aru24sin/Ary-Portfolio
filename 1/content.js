/* =========================================================================
   CONTENT — everything a visitor reads lives here.
   Sources: résumé (Aug 2026), FrogWatch+ final report.

   Case study images live in images/<project>/. A section can use
   `gallery: [{ src, caption }]` for phone screenshots, `list: [...]` for
   bullets, and `figure: { src, caption }` for a single wide image.
   ========================================================================= */

export const PROFILE = {
  name: "Aryan Singh",
  headline: "Frontend engineer turning designs into fast, polished products.",
  summary:
    "I build responsive, high-quality interfaces in React, TypeScript and Angular, backed by a UI/UX research foundation. I work closely with design and backend teams, and I care about performance across devices and browsers.",
  email: "aru24sin@gmail.com",
  linkedin: "https://www.linkedin.com/in/ary-sin24/",
  github: "https://github.com/aru24sin",
  resume: "resume.pdf",
  location: "Canton, MI",
  availability: "Open to new opportunities",
  authorization: "US Citizen",
};

export const CASES = [
  {
    slug: "frogwatch",
    title: "FrogWatch+",
    subtitle: "AI frog-call identification for citizen scientists",
    year: 2025,
    tags: ["Client project", "Mobile", "Machine learning", "Team lead"],
    lede:
      "A cross-platform app that lets volunteers record a frog call, get an AI species identification in under two seconds, and send it to experts for review. Built by a 4-person team for Friends of the Rouge, a conservation nonprofit protecting the Rouge River watershed.",
    accent: ["#1f3326", "#8fb996"],
    heroShots: [
      "images/frogwatch/history.jpg",
      "images/frogwatch/prediction.jpg",
      "images/frogwatch/map.jpg",
    ],
    meta: {
      Team: ["4 students, UM–Dearborn", "Sponsor: Friends of the Rouge"],
      Role: ["Team lead & project manager", "Frontend & integration developer"],
      Timeline: ["Jun 2025 – Mar 2026"],
      Stack: ["React Native (Expo)", "TypeScript, Firebase", "FastAPI on Cloud Run", "PyTorch"],
    },
    impact: [
      ["1.4s", "Average prediction time"],
      ["94%", "Task completion in usability tests"],
      ["8.2/10", "Beta tester satisfaction"],
    ],
    sections: [
      {
        eyebrow: "Context",
        heading: "Frog populations are a signal of watershed health.",
        body: [
          "Friends of the Rouge relies on volunteers to monitor frogs across the Rouge River watershed. Frogs are easier to hear than to see, so the data comes from calls, and identifying a call takes practice most volunteers don't have.",
          "Our senior design team was asked to build a tool anyone could use in the field: record a call, get an identification, and contribute data that researchers could trust.",
        ],
      },
      {
        eyebrow: "Problem statement",
        callout:
          "How might we let volunteers with no training identify frog calls in the field, while keeping the data trustworthy enough for research?",
      },
      {
        eyebrow: "My role",
        heading: "Leading the team, and wiring the app to the model.",
        body: [
          "I led a team of four as project manager: running bi-weekly sprints, owning client communication with Friends of the Rouge, reviewing requirements and code, and keeping the schedule on track.",
          "On the build, I worked on the React Native front end and the integration layer, connecting the app to Firebase and to our FastAPI prediction service on Google Cloud Run.",
        ],
      },
      {
        eyebrow: "Requirements",
        heading: "Three kinds of users, and a field full of constraints.",
        body: [
          "We designed for three roles. Volunteers record calls and review predictions. Experts validate other people's submissions. Admins manage users and oversee the data.",
        ],
        list: [
          "<strong>Short clips:</strong> recordings capped at 10 seconds to save battery and storage.",
          "<strong>Fast answers:</strong> a prediction in 2 seconds or less per clip.",
          "<strong>Privacy first:</strong> GPS and audio sharing are strictly opt-in.",
          "<strong>Built for outdoors:</strong> high-contrast UI, 18pt+ text, and no goal more than three taps away.",
        ],
      },
      {
        eyebrow: "Recording",
        heading: "Two taps from opening the app to a recording.",
        body: [
          "The home screen puts every task one tap away with large, glove-friendly buttons. Recording is a single tap: the app listens for up to 10 seconds and shows your location on a map so you know it's being tagged.",
        ],
        gallery: [
          { src: "images/frogwatch/home.png", caption: "Home: every task one tap away" },
          { src: "images/frogwatch/record.jpg", caption: "Recording a call with GPS tagging" },
        ],
      },
      {
        eyebrow: "Identification",
        heading: "A confident answer, with room to disagree.",
        body: [
          "The clip goes to a PANNs CNN14 model running in PyTorch behind FastAPI on Cloud Run. The app shows the top species over a full-screen photo so volunteers can check it against what they know.",
          "Volunteers can correct the species, rate their own confidence and add notes before submitting it for expert review. Those corrections are what make the data useful for retraining.",
        ],
        gallery: [
          { src: "images/frogwatch/prediction.jpg", caption: "The model's top prediction" },
          { src: "images/frogwatch/submit.jpg", caption: "Confirming, rating confidence and adding notes" },
        ],
      },
      {
        eyebrow: "History & map",
        heading: "Seeing your contributions add up.",
        body: [
          "Every recording lands in a searchable history with its species, place, AI confidence and review status. The map plots recordings across the watershed, with filters for date range and species.",
        ],
        gallery: [
          { src: "images/frogwatch/history.jpg", caption: "Recording history with review status" },
          { src: "images/frogwatch/map.jpg", caption: "Recordings mapped across the watershed" },
        ],
      },
      {
        eyebrow: "Expert review",
        heading: "Keeping the data trustworthy.",
        body: [
          "Experts work through a review queue of new submissions. Each one shows the AI's prediction next to the volunteer's own answer and notes, with the audio and location, so they can approve or discard it quickly.",
        ],
        gallery: [
          { src: "images/frogwatch/review-queue.png", caption: "The expert review queue" },
          { src: "images/frogwatch/expert-review.jpg", caption: "Reviewing a single submission" },
        ],
      },
      {
        eyebrow: "Testing",
        heading: "Measured against the targets we set.",
        body: [
          "We tested with unit and integration tests, load tests, and usability sessions with beta testers in field conditions.",
        ],
        list: [
          "<strong>1.4s</strong> average prediction time per clip (target: 2s or less)",
          "<strong>0.3s</strong> average tap response (target: under 1s)",
          "<strong>2.1 taps</strong> on average to start a recording (target: 3 or fewer)",
          "<strong>94%</strong> of testers completed the core workflows",
          "<strong>78 MB</strong> app size (target: under 100 MB)",
        ],
      },
    ],
    reflection: {
      heading: "Scope for what you can ship, then test early.",
      learnings: [
        {
          title: "Pick the architecture you can finish",
          text: "We planned federated learning, but switched to a centrally hosted model to get a working prototype into testers' hands sooner. Privacy stayed intact through opt-in sharing.",
        },
        {
          title: "Start testing earlier",
          text: "Field testing surfaced issues we couldn't have found at a desk, like the need for an offline upload queue. Earlier sessions would have given us more time to act on them.",
        },
        {
          title: "Check in with the client more often",
          text: "Our best decisions came from Friends of the Rouge reviewing real screens. More frequent check-ins during implementation would have caught mismatches sooner.",
        },
      ],
    },
    next: {
      heading: "More platforms, more species.",
      body: "Planned next steps include full iOS support, expanding the model beyond the watershed's eight species, offline map caching for areas without signal, and richer dashboards for researchers.",
    },
  },
];

export const EXPERIENCE = [
  {
    id: "acg-ai-labs",
    role: "Applications Associate, ACG AI Labs",
    company: "AAA – The Auto Club Group",
    type: "Full-time",
    location: "Dearborn, MI",
    start: "Apr 2026",
    end: "Present",
    summary: "Build front-end applications for ACG AI Labs, from design through production.",
    highlights: [
      "Build responsive, high-quality front-end applications in <strong>React, TypeScript and Angular</strong>, taking designs from concept to production.",
      "Collaborate with design and product to turn UI/UX designs into polished interfaces, integrated end to end with backend APIs.",
      "Optimize applications for performance and usability, and contribute to frontend architecture decisions.",
    ],
    skills: ["React", "TypeScript", "Angular", "REST APIs"],
  },
  {
    id: "api-intern",
    role: "API Developer Intern",
    company: "AAA – The Auto Club Group",
    type: "Internship",
    location: "Dearborn, MI",
    start: "Jan 2026",
    end: "Apr 2026",
    summary: "Worked on the API layer that ACG's front-end applications consume.",
    highlights: [
      "Administered <strong>30 enterprise API proxies</strong> on Google Cloud Apigee across dev, QA and prod, migrating legacy configurations as part of an API modernization effort.",
      "Authored custom JavaScript policies for request/response transformation, validation and error handling.",
      "Tested proxies with Postman and Apigee Debug/Trace, and shipped changes through <strong>Jenkins CI/CD</strong> pipelines.",
    ],
    skills: ["Apigee", "JavaScript", "Postman", "Jenkins"],
  },
  {
    id: "innovation-intern",
    role: "Innovation Team Intern",
    company: "AAA – The Auto Club Group",
    type: "Internship",
    location: "Dearborn, MI",
    start: "May 2025",
    end: "Jan 2026",
    summary: "Took early-stage ideas from user research and prototypes to production.",
    highlights: [
      "Directed UI/UX end to end: ran user interviews and usability tests in UserBrain, designed interactive Figma prototypes, and built a reusable design system for developer handoff.",
      "Launched <strong>0-to-1 responsive web apps in Angular 19</strong>, taking concepts from prototype to production.",
      "Rebuilt the AI system of a legacy robot around cloud-hosted Gemini models, with voice-activity detection and speech-to-text/text-to-speech, cutting response latency from <strong>2–3 minutes to 10–15 seconds</strong>.",
    ],
    skills: ["Angular", "Figma", "UserBrain", "Python", "Gemini"],
  },
  {
    id: "frogwatch",
    role: "Team Lead & Frontend/Integration Developer",
    company: "FrogWatch+ · Friends of the Rouge",
    type: "Client project",
    location: "Dearborn, MI",
    start: "Jun 2025",
    end: "Mar 2026",
    summary: "Led the team building an AI frog-call identification app for a conservation nonprofit.",
    highlights: [
      "Led a <strong>4-person team</strong> building a responsive cross-platform app in React Native (Expo) with Firebase Authentication, Firestore and Cloud Storage.",
      "Integrated a PyTorch model served by FastAPI on Google Cloud Run into the app, returning species predictions in <strong>under 2 seconds</strong>.",
      "Ran bi-weekly sprints, client communication, requirements and code reviews as project manager.",
    ],
    skills: ["React Native", "Expo", "TypeScript", "Firebase", "FastAPI"],
    caseStudy: "frogwatch",
  },
  {
    id: "sure-research",
    role: "Undergraduate Researcher (Data & ML)",
    company: "University of Michigan–Dearborn · SURE 2024",
    type: "Research",
    location: "Dearborn, MI",
    start: "May 2024",
    end: "Sep 2024",
    summary: "Summer research on detecting AI-generated images, under Dr. Li.",
    highlights: [
      "Trained and evaluated machine-learning models (<strong>CNNSpot, ResNet50</strong>) to classify AI-generated versus real images.",
      "Measured output quality on the GenImage dataset with confusion matrices and ROC curves.",
    ],
    skills: ["Python", "PyTorch", "Model evaluation"],
  },
  {
    id: "ai-club",
    role: "Founder & President",
    company: "Artificial Intelligence Club, UM–Dearborn",
    type: "Leadership",
    location: "Dearborn, MI",
    start: "Jan 2024",
    end: "May 2025",
    summary: "Founded and led the campus AI Club.",
    highlights: [
      "Ran workshops, semester projects, guest speakers and a newsletter for students exploring applied AI.",
    ],
    skills: ["Leadership", "Public speaking"],
  },
];

export const EDUCATION = [
  {
    school: "University of Michigan – Dearborn",
    degree: "B.S. in Computer Science, AI Concentration",
    end: "Dec 2025",
    notes:
      "GPA 3.56 · Coursework: Data Structures & Algorithms, Operating Systems, Databases, Deep Learning, Natural Language Processing, Artificial Intelligence, Computational Learning",
  },
];

export const SKILLS = [
  {
    group: "Frontend",
    items: ["React", "React Native", "Angular", "TypeScript", "JavaScript (ES6+)", "HTML5 & CSS", "Responsive & cross-browser UI"],
  },
  { group: "Design", items: ["Figma", "UI/UX research", "Usability testing", "Design systems"] },
  {
    group: "Backend & tools",
    items: ["Node.js", "REST APIs", "FastAPI", "Firebase", "Google Cloud (Apigee, Cloud Run)", "AWS", "Git & CI/CD"],
  },
  { group: "Languages", items: ["TypeScript", "JavaScript", "Python", "Java", "C/C++", "C#", "SQL"] },
];
