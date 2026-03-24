# LegalHub Frontend

## Overview

The frontend is responsible for handling user interactions, rendering AI responses, managing state, and communicating with backend services (APIs, NLP engines, and knowledge graph systems).

---


## Core Responsibilities of the Frontend

The LegalHub frontend handles the following:

### 1. User Interface (UI)
- Display conversational chat interface
- Render legal responses and citations clearly
- Provide structured views for legal topics and results

### 2. User Experience (UX)
- Ensure intuitive navigation
- Provide fast and responsive interactions
- Maintain accessibility standards

### 3. API Communication
- Send user queries to backend services
- Receive and render AI-generated responses
- Handle errors and loading states

### 4. State Management
- Manage chat history and session context
- Handle UI states (loading, error, success)

### 5. Feedback System (RLHF)
- Allow users to rate responses
- Capture feedback for backend learning systems

### 6. Data Visualization (Optional/Advanced)
- Display topic models or legal clusters
- Present structured legal insights

---

## Technology Stack

The frontend is built using modern web technologies:

- **Vite** — Fast build tool and development server  
- **TypeScript** — Strong typing for scalability and maintainability  
- **React** — Component-based UI development  
- **shadcn/ui** — Prebuilt accessible UI components  
- **Tailwind CSS** — Utility-first styling framework  

---

## Setup & Installation

### Prerequisites

- Node.js (v16+ recommended)  
- npm or yarn  

---

### Installation Steps

1. Clone the repository:
   ```sh
   git clone <YOUR_GIT_URL>

Navigate to the project:

cd legalhub-frontend

Install dependencies:

npm install

Start development server:

npm run dev

Application runs at:

http://localhost:5173
Environment Configuration

Create a .env file in the root directory:

VITE_API_BASE_URL=http://localhost:8000

This connects the frontend to backend services.

Build for Production
npm run build

Output will be in the dist/ folder.

Deployment

The frontend can be deployed on:

Vercel
Netlify
GitHub Pages
Any static hosting server
Future Enhancements
Real-time streaming responses (LLM output streaming)
Advanced legal dashboards
Knowledge graph visualization
Multi-language support (English & Kiswahili)
Authentication and user roles
Contribution Guidelines
Fork the repository

Create a feature branch

git checkout -b feature/your-feature
Commit changes
Push to your branch
Create a Pull Request
License

This project is intended for academic and research purposes within the LegalHub system. Licensing may evolve over time.