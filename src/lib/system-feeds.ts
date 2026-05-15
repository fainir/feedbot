// System feed catalog — used by:
//   - /[feed]/page.tsx (server) to map a slug to its query for SSR fetch
//   - /[feed]/feed-client.tsx (client) for tab rendering + active-tab lookup
//   - /[feed]/layout.tsx (server) for the generateMetadata title path
// Single source of truth so the SSR fetch uses the same long-form query
// the client API call would have used.

export type SystemFeed = {
  id: string;
  name: string;
  icon: string;
  query: string;
};

export const ALL_SYSTEM_FEEDS: SystemFeed[] = [
  { id: "ai", name: "AI & ML", icon: "🤖", query: "artificial intelligence breakthroughs, LLM models, AI startups, machine learning research, GPT Claude Gemini, AI tools and products" },
  { id: "tech", name: "Tech", icon: "💻", query: "tech industry news, product launches, big tech companies, gadgets, consumer technology, tech business" },
  { id: "startups", name: "Startups", icon: "🚀", query: "startup funding rounds, venture capital deals, Y Combinator, new startup launches, founder stories, seed series A B funding" },
  { id: "dev", name: "Dev", icon: "⚡", query: "software engineering, programming tutorials, developer tools, open source projects, React Next.js Python Rust, coding best practices" },
  { id: "science", name: "Science", icon: "🔬", query: "scientific discoveries, space exploration, physics breakthroughs, biology research, climate science, nature published papers" },
  { id: "crypto", name: "Crypto", icon: "₿", query: "cryptocurrency bitcoin ethereum blockchain DeFi web3 NFT crypto market analysis trading" },
  { id: "design", name: "Design", icon: "🎨", query: "UI UX design, product design, Figma, design systems, typography, visual design trends" },
  { id: "security", name: "Security", icon: "🔒", query: "cybersecurity, data breaches, zero-day exploits, infosec tools, penetration testing, security research" },
  { id: "gaming", name: "Gaming", icon: "🎮", query: "video games, game releases, gaming industry news, esports, game development, indie games" },
  { id: "business", name: "Business", icon: "📈", query: "business strategy, leadership, management, entrepreneurship, market trends, corporate news" },
  { id: "space", name: "Space", icon: "🪐", query: "SpaceX launches, NASA missions, Mars exploration, James Webb telescope, space industry, rocket launches, satellites" },
  { id: "health", name: "Health", icon: "🏥", query: "health research, medical breakthroughs, mental health, nutrition science, fitness studies, biotech news" },
  { id: "open-source", name: "Open Source", icon: "🐙", query: "open source projects, GitHub trending, open source contributions, FOSS, Linux, open source alternatives, community-driven software" },
  { id: "robotics", name: "Robotics", icon: "🦾", query: "robotics, humanoid robots, Boston Dynamics, industrial automation, robot learning, embodied AI, drones" },
  { id: "energy", name: "Energy", icon: "⚡", query: "energy technology, solar power, battery storage, nuclear fusion, grid modernization, energy transition, clean energy" },
  { id: "climate", name: "Climate", icon: "🌍", query: "climate change, renewable energy, solar wind power, sustainability, carbon emissions, green technology, electric vehicles" },
  { id: "fintech", name: "Fintech", icon: "💳", query: "fintech news, digital banking, payment technology, neobanks, financial APIs, open banking, insurtech" },
  { id: "devops", name: "DevOps", icon: "🔧", query: "DevOps, cloud infrastructure, Kubernetes Docker, CI CD pipelines, AWS Azure GCP, platform engineering, SRE" },
  { id: "data", name: "Data", icon: "📊", query: "data science, analytics, big data, data engineering, SQL databases, data visualization, business intelligence" },
  { id: "mobile", name: "Mobile", icon: "📱", query: "mobile app development, iOS Android, React Native Flutter, mobile UX, app store trends, Swift Kotlin" },
  { id: "marketing", name: "Marketing", icon: "📣", query: "digital marketing, SEO, content marketing, growth hacking, social media marketing, email marketing, conversion optimization" },
  { id: "productivity", name: "Productivity", icon: "⏱️", query: "productivity tools, time management, note-taking apps, workflow automation, personal knowledge management, second brain" },
  { id: "biotech", name: "Biotech", icon: "🧬", query: "biotechnology, gene therapy, CRISPR, drug discovery, synthetic biology, longevity research, bioinformatics" },
  { id: "ev", name: "EVs", icon: "🚗", query: "electric vehicles, Tesla, EV charging, autonomous driving, battery technology, EV startups, self-driving cars" },
  { id: "remote-work", name: "Remote Work", icon: "🏠", query: "remote work, distributed teams, async communication, digital nomad, work from home tools, hybrid work, remote collaboration" },
  // Tech & Engineering (additional)
  { id: "web3", name: "Web3", icon: "🌐", query: "decentralized applications, smart contracts, DAOs, blockchain development, Solidity, dApps, web3 infrastructure" },
  { id: "ar-vr", name: "AR / VR", icon: "🥽", query: "augmented reality, virtual reality, Apple Vision Pro, Meta Quest, spatial computing, mixed reality, XR development" },
  { id: "quantum", name: "Quantum Computing", icon: "⚛️", query: "quantum computing, quantum processors, qubits, quantum algorithms, IBM quantum, Google Sycamore, quantum error correction" },
  { id: "databases", name: "Databases", icon: "🗄️", query: "PostgreSQL, MongoDB, Redis, database design, query optimization, SQL, NoSQL, database scaling, Supabase" },
  { id: "frontend", name: "Frontend", icon: "🖥️", query: "React, Next.js, Vue, Svelte, CSS, web performance, browser APIs, frontend frameworks, Tailwind, web components" },
  { id: "backend", name: "Backend", icon: "⚙️", query: "Node.js backend, Python Django FastAPI, Go microservices, Rust servers, API design, system design, gRPC REST" },
  { id: "ai-tools", name: "AI Tools", icon: "🛠️", query: "ChatGPT, Claude AI, GitHub Copilot, Cursor IDE, AI coding assistants, AI productivity tools, AI image generators" },
  { id: "llm-research", name: "LLM Research", icon: "📝", query: "large language model research, LLM benchmarks, fine-tuning, RLHF, reasoning models, transformer architecture, AI alignment" },
  { id: "computer-vision", name: "Computer Vision", icon: "👁️", query: "image recognition, object detection, diffusion models, video AI, YOLO, image segmentation, visual foundation models" },
  // Business & Finance (additional)
  { id: "saas", name: "SaaS", icon: "☁️", query: "SaaS business, monthly recurring revenue MRR, churn rate, SaaS pricing, B2B software, SaaS metrics, PLG product-led growth" },
  { id: "ecommerce", name: "E-commerce", icon: "🛒", query: "online retail, Shopify, Amazon marketplace, dropshipping, direct-to-consumer brands, e-commerce platforms, online store" },
  { id: "venture-capital", name: "Venture Capital", icon: "💰", query: "venture capital deals, funding rounds, term sheets, LP trends, VC portfolio, seed funding, Series A B C" },
  { id: "personal-finance", name: "Personal Finance", icon: "💵", query: "personal investing, budgeting, retirement planning, index funds, wealth building, FIRE movement, stock market" },
  { id: "real-estate", name: "Real Estate", icon: "🏠", query: "real estate market, REITs, PropTech, housing trends, mortgage rates, commercial real estate, property investment" },
  { id: "indie-hackers", name: "Indie Hackers", icon: "🧑‍💻", query: "indie hacker, solo founder, bootstrapping startups, side project revenue, building in public, micro SaaS, solopreneur" },
  // Science & Nature (additional)
  { id: "neuroscience", name: "Neuroscience", icon: "🧠", query: "brain research, cognitive science, neural interfaces, Neuralink, consciousness studies, brain-computer interface, neurobiology" },
  { id: "physics", name: "Physics", icon: "🔭", query: "particle physics, cosmology, dark matter, quantum mechanics, theoretical physics, CERN, gravitational waves" },
  { id: "math", name: "Mathematics", icon: "🔢", query: "mathematics research, mathematical proofs, statistics, cryptography, topology, number theory, applied mathematics" },
  { id: "psychology", name: "Psychology", icon: "🧘", query: "behavioral psychology, cognitive biases, therapy research, habit formation, positive psychology, behavioral economics" },
  { id: "astronomy", name: "Astronomy", icon: "🌌", query: "telescopes, exoplanets, galaxies, black holes, cosmic events, astrophysics, space telescopes, stellar observations" },
  { id: "oceanography", name: "Oceans", icon: "🌊", query: "ocean science, marine biology, deep sea exploration, coral reefs, ocean conservation, underwater research, oceanography" },
  { id: "geology", name: "Earth Science", icon: "🌋", query: "geology, earthquakes, volcanoes, minerals, plate tectonics, earth science, seismology, geophysics, fossil discovery" },
  // Creative & Culture (additional)
  { id: "music", name: "Music", icon: "🎵", query: "music production, new album releases, music technology, audio engineering, streaming platforms, music industry news" },
  { id: "film", name: "Film & TV", icon: "🎬", query: "movies, TV shows, streaming platforms, filmmaking, box office, Netflix Disney Plus, film reviews, cinematography" },
  { id: "photography", name: "Photography", icon: "📷", query: "photography tips, camera gear reviews, photo editing, street photography, landscape photography, portrait techniques" },
  { id: "writing", name: "Writing", icon: "✍️", query: "creative writing, copywriting, blogging tips, storytelling techniques, publishing, writing craft, content writing" },
  { id: "podcasting", name: "Podcasting", icon: "🎙️", query: "podcast production, podcast hosting platforms, podcast growth, monetization, audio recording, podcast equipment" },
  { id: "animation", name: "Animation", icon: "🎞️", query: "motion graphics, 3D animation, Blender, visual effects VFX, character animation, After Effects, animation studios" },
  { id: "typography", name: "Typography", icon: "🔤", query: "font design, type systems, lettering, web fonts, typeface releases, variable fonts, typography trends, type foundries" },
  // Lifestyle & Wellbeing (additional)
  { id: "fitness", name: "Fitness", icon: "💪", query: "workout routines, strength training, running, sports science, gym equipment, exercise science, CrossFit, marathon training" },
  { id: "nutrition", name: "Nutrition", icon: "🥗", query: "diet science, nutritional supplements, meal planning, gut health, intermittent fasting, nutrition research, superfoods" },
  { id: "mental-health", name: "Mental Health", icon: "🧘", query: "anxiety management, depression treatment, therapy approaches, mindfulness meditation, self-care, mental wellness" },
  { id: "cooking", name: "Cooking", icon: "👨‍🍳", query: "recipes, cooking techniques, food science, kitchen gadgets, baking, meal prep, culinary trends, chef tips" },
  { id: "travel", name: "Travel", icon: "✈️", query: "travel destinations, budget travel tips, digital nomad locations, travel hacking, flight deals, travel photography" },
  { id: "parenting", name: "Parenting", icon: "👶", query: "child development, parenting tips, education methods, family technology, new parent advice, children health" },
  { id: "pets", name: "Pets", icon: "🐕", query: "dog care, cat care, pet health, animal training, pet nutrition, veterinary science, animal behavior, pet tech" },
  { id: "gardening", name: "Gardening", icon: "🌱", query: "home gardening, indoor plants, permaculture, urban farming, vegetable garden, houseplants, garden design, composting" },
  { id: "diy", name: "DIY & Maker", icon: "🔨", query: "3D printing projects, woodworking, electronics DIY, Raspberry Pi, Arduino, maker movement, home improvement" },
  // World & Politics
  { id: "world-news", name: "World News", icon: "🗞️", query: "global events, geopolitics, international relations, world affairs, diplomacy, United Nations, global conflicts" },
  { id: "us-politics", name: "US Politics", icon: "🇺🇸", query: "US elections, policy analysis, Congress legislation, White House, Supreme Court, American politics, political campaigns" },
  { id: "europe", name: "Europe", icon: "🇪🇺", query: "European Union politics, European tech industry, EU regulations, European economy, Brexit, European startups" },
  { id: "china-tech", name: "China Tech", icon: "🇨🇳", query: "Chinese tech companies, China AI development, Huawei Alibaba Tencent, China regulations, Chinese manufacturing" },
  { id: "india-tech", name: "India Tech", icon: "🇮🇳", query: "Indian startups, UPI digital payments, India IT industry, Bangalore tech scene, Indian unicorns, India tech policy" },
  { id: "middle-east", name: "Middle East", icon: "🌍", query: "Middle East technology, NEOM project, Saudi Vision 2030, UAE innovation, Gulf tech startups, Dubai tech" },
  { id: "africa-tech", name: "Africa Tech", icon: "🌍", query: "African startups, mobile money M-Pesa, Africa tech hubs, fintech Africa, Nigerian tech, Kenyan innovation" },
  { id: "economics", name: "Economics", icon: "📉", query: "macroeconomics, inflation rates, central bank policy, international trade, GDP growth, Federal Reserve, economic analysis" },
  // Education & Career
  { id: "education", name: "Education", icon: "🎓", query: "education technology, online learning platforms, university research, teaching methods, higher education, student success" },
  { id: "career", name: "Career", icon: "💼", query: "job market trends, interviewing tips, salary negotiation, career growth, tech hiring, resume building, job search" },
  { id: "freelancing", name: "Freelancing", icon: "🧑‍💼", query: "freelance tips, client management, freelance pricing, Upwork Fiverr, freelance business, contract work, gig economy" },
  { id: "leadership", name: "Leadership", icon: "👑", query: "management skills, team building, executive coaching, decision-making frameworks, organizational leadership, CEO insights" },
  // Niche Tech (additional)
  { id: "rust", name: "Rust", icon: "🦀", query: "Rust programming language, systems programming, WebAssembly, Rust crates, memory safety, Tokio async, Rust embedded" },
  { id: "python", name: "Python", icon: "🐍", query: "Python programming, Django, FastAPI, data science Python, Python libraries, scripting, Python packaging, Pandas NumPy" },
  { id: "golang", name: "Go", icon: "🐹", query: "Go programming language, Go concurrency, Go microservices, CLI tools Go, Kubernetes Go, goroutines, Go modules" },
  { id: "typescript", name: "TypeScript", icon: "🔷", query: "TypeScript patterns, type systems, TypeScript frameworks, Zod, TypeScript tooling, type-safe APIs, TypeScript 5" },
  { id: "linux", name: "Linux", icon: "🐧", query: "Linux distributions, kernel development, system administration, Linux desktop, Ubuntu Fedora Arch, Linux server, shell scripting" },
  { id: "networking", name: "Networking", icon: "📡", query: "computer networking, DNS, CDN, TCP IP, WiFi technology, 5G networks, network security, BGP routing" },
  { id: "privacy", name: "Privacy", icon: "🔐", query: "digital privacy, encryption, VPN services, surveillance, GDPR compliance, data protection, privacy tools, Tor" },
  { id: "no-code", name: "No-Code", icon: "🧩", query: "no-code tools, Bubble, Webflow, Zapier automation, low-code platforms, visual programming, citizen developer" },
  { id: "3d-printing", name: "3D Printing", icon: "🖨️", query: "3D printers, 3D printing materials, CAD design, additive manufacturing, prototyping, Bambu Lab, resin printing" },
  { id: "iot", name: "IoT", icon: "📟", query: "Internet of Things, smart home devices, IoT sensors, edge computing, Home Assistant, connected devices, industrial IoT" },
  // Sports & Entertainment
  { id: "sports", name: "Sports", icon: "⚽", query: "football soccer, basketball NBA, tennis, Olympics, sports analytics, Premier League, NFL, sports technology" },
  { id: "esports", name: "Esports", icon: "🏆", query: "competitive gaming, esports tournaments, League of Legends, Valorant, esports teams, Twitch streaming, gaming competitions" },
  { id: "anime", name: "Anime", icon: "🎌", query: "anime releases, manga news, Japanese animation studios, anime reviews, Crunchyroll, anime culture, light novels" },
  { id: "books", name: "Books", icon: "📚", query: "book reviews, reading recommendations, new book releases, authors interviews, publishing industry, literary fiction, nonfiction" },
  { id: "comics", name: "Comics", icon: "💬", query: "Marvel comics, DC comics, manga series, indie comics, graphic novels, comic book adaptations, webcomics" },
  // Environment & Sustainability
  { id: "sustainability", name: "Sustainability", icon: "♻️", query: "circular economy, zero waste, sustainable fashion, ESG investing, sustainable business, carbon footprint, green living" },
  { id: "agriculture", name: "Agriculture", icon: "🌾", query: "agricultural technology AgTech, vertical farming, precision agriculture, food systems, crop science, farm automation" },
  { id: "wildlife", name: "Wildlife", icon: "🦁", query: "animal conservation, endangered species, biodiversity, wildlife photography, national parks, species discovery, ecology" },
  // Emerging
  { id: "longevity", name: "Longevity", icon: "⏳", query: "anti-aging research, senolytics, healthspan extension, biohacking, longevity science, aging biology, life extension" },
  { id: "psychedelics", name: "Psychedelics", icon: "🍄", query: "psychedelic therapy, psilocybin research, MDMA therapy, ketamine treatment, psychedelic science, mental health psychedelics" },
  { id: "creator-economy", name: "Creator Economy", icon: "🎥", query: "YouTube creators, TikTok trends, Patreon, creator monetization, audience building, influencer marketing, content creation" },
  { id: "legal-tech", name: "Legal Tech", icon: "⚖️", query: "AI in law, contract automation, legal AI tools, compliance technology, legal tech startups, e-discovery, LegalTech" },
  { id: "edtech", name: "EdTech", icon: "📖", query: "learning platforms, AI tutors, classroom technology, MOOCs, online education, Coursera Udemy, educational AI" },
  { id: "food-tech", name: "Food Tech", icon: "🍔", query: "lab-grown meat, food delivery technology, restaurant automation, alternative protein, food science, cultured meat" },
  { id: "fashion-tech", name: "Fashion Tech", icon: "👗", query: "wearable technology, smart fabrics, AI in fashion, virtual try-on, fashion e-commerce, sustainable fashion tech" },
  { id: "proptech", name: "PropTech", icon: "🏗️", query: "real estate technology PropTech, smart buildings, construction automation, building information modeling, property management tech" },
  { id: "govtech", name: "GovTech", icon: "🏛️", query: "government technology, civic tech, digital identity, e-governance, public sector innovation, smart cities, digital services" },
  { id: "insurtech", name: "InsurTech", icon: "🛡️", query: "insurance technology, parametric insurance, claims AI, digital insurance, InsurTech startups, underwriting automation" },
];

export const DEFAULT_TAB_IDS = new Set([
  "ai","tech","startups","dev","science","design","security","gaming","business","space","health","open-source","robotics","energy",
]);

export const TABS = ALL_SYSTEM_FEEDS.filter((f) => DEFAULT_TAB_IDS.has(f.id));
