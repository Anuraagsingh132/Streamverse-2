# Contributing to Streamverse 🎬

First off, thank you for considering contributing to **Streamverse**! 🎉 Open source projects thrive when people like you lend their ideas, fixes, and creativity. Whether you are fixing a typo, resolving a bug, optimizing performance, or proposing a brand-new feature, your help is warmly welcomed.

Please take a moment to review this document to make the contribution process as smooth and effective as possible.

---

## 📜 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [How Can I Contribute?](#-how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Improving Documentation](#improving-documentation)
  - [Contributing Code](#contributing-code)
- [Development Setup](#-development-setup)
- [Development Workflow](#-development-workflow)
  - [Branch Naming](#branch-naming)
  - [Coding Standards](#coding-standards)
  - [Commit Messages](#commit-messages)
- [Running Checks & Tests](#-running-checks--tests)
- [Submitting a Pull Request (PR)](#-submitting-a-pull-request-pr)
- [Review & Merge Process](#-review--merge-process)
- [Community & Feedback](#-community--feedback)

---

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report any unacceptable behavior to the repository maintainer.

---

## 💡 How Can I Contribute?

### Reporting Bugs

Encountered an issue or glitch? Help us identify and fix it:
1. Check the [GitHub Issues](https://github.com/Anuraagsingh132/Streamverse-2/issues) page to see if the bug has already been reported.
2. If not, open a new issue using our **Bug Report Template**.
3. Include clear steps to reproduce, expected vs. actual behavior, browser/OS version, and screenshots or screen recordings if applicable.

### Suggesting Enhancements

Have an idea to make Streamverse even better?
1. Check existing issues or discussions to ensure it's not already requested.
2. Open an issue using the **Feature Request Template**.
3. Detail the problem your feature solves, your proposed implementation, and any UI mockups or inspiration.
4. You can also submit quick thoughts directly inside the app using the floating **Feedback** widget (powered by Featurebase)!

### Improving Documentation

Clear documentation makes everyone's journey easier. Fixes for typos, enhanced setup guides, or architecture diagrams are always appreciated.

### Contributing Code

If you want to write code for a bug fix or feature:
- For small bug fixes or typo corrections, feel free to open a PR directly.
- For major architectural shifts or new modules, consider opening an issue first to discuss the design with maintainers.

---

## 💻 Development Setup

### Prerequisites

Ensure you have the following installed locally:
- **Node.js**: `v20.0.0` or higher (run `node -v` to check)
- **npm**: `v10.0.0` or higher (run `npm -v` to check)
- **Git**

### Step-by-Step Setup

1. **Fork the Repository**:
   Click the **Fork** button at the top-right of the [Streamverse repository](https://github.com/Anuraagsingh132/Streamverse-2) to create a copy in your own GitHub account.

2. **Clone Your Fork**:
   ```bash
   git clone https://github.com/<your-username>/Streamverse-2.git
   cd Streamverse-2
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Start the Local Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:5173` to explore Streamverse locally.

---

## 🛠️ Development Workflow

### Branch Naming

Create a new branch from `main` with a clear, descriptive prefix:

- `feat/` – A new feature (e.g., `feat/audio-track-selector`)
- `fix/` – A bug fix (e.g., `fix/poster-fallback-logo`)
- `perf/` – Performance improvements (e.g., `perf/image-lazy-loading`)
- `refactor/` – Code refactoring without changing user behavior (e.g., `refactor/player-modal`)
- `docs/` – Documentation updates (e.g., `docs/update-contributing-guide`)
- `test/` – Adding or updating tests (e.g., `test/navbar-mobile-nav`)

```bash
git checkout -b feat/your-feature-name
```

### Coding Standards

- **React 19 & TypeScript**: Write modern, functional components using standard hooks. Ensure TypeScript types and interfaces are explicit and strict.
- **Tailwind CSS**: Use Tailwind utility classes for styling, keeping the dark, cinematic aesthetic consistent (`bg-black`, `border-white/10`, red accents `#E50914`, etc.).
- **Responsiveness**: Verify that UI changes look great across all viewports:
  - Mobile (`< 768px`)
  - Tablet (`768px - 1024px`)
  - Desktop (`> 1024px`)
- **Preserve Documentation**: Retain existing comments, docstrings, and clean formatting.

### Commit Messages

We adhere to [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(player): add keyboard shortcut for fullscreen toggle
fix(watchlist): resolve local storage sync race condition
perf(images): preload hero backdrop with high fetch priority
docs(readme): add troubleshooting section for local dev
```

---

## 🧪 Running Checks & Tests

Before submitting your code, ensure all local verification checks pass:

1. **Run the Linter**:
   ```bash
   npm run lint
   ```
   *Streamverse uses Oxlint for ultra-fast, high-accuracy linting.*

2. **Run the Test Suite**:
   ```bash
   npm test
   ```
   *Runs unit tests and component tests via Vitest.*

3. **Verify TypeScript & Production Build**:
   ```bash
   npm run build
   ```
   *Confirms type safety and that the Vite bundle compiles with zero errors.*

---

## 🚀 Submitting a Pull Request (PR)

1. Push your branch to your GitHub fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Navigate to your fork on GitHub. You should see a yellow banner offering to **Compare & pull request**.
3. Ensure the base repository is `Anuraagsingh132/Streamverse-2` and base branch is `main`.
4. Fill in the Pull Request template:
   - Provide a concise summary of what changes were made and why.
   - Link any related issue(s) (e.g., `Closes #15` or `Relates to #22`).
   - Attach screenshots or screen recordings for any visual UI changes.
   - Confirm that all checklist items (lint, test, build) have passed.
5. Click **Create pull request**.

---

## 🔍 Review & Merge Process

1. **Automated CI Checks**: Once submitted, GitHub Actions will automatically run:
   - Dependency validation & security audit
   - Code quality & linting (`npm run lint`)
   - Unit & component tests (`npm test`)
   - TypeScript verification & build (`npm run build`)
2. **Code Review**: A maintainer will review your pull request. We may suggest minor tweaks, ask questions, or request small improvements.
3. **Approval & Merge**: Once the review is approved and CI passes, your pull request will be merged into `main`! Your contribution will be included in the next deployment.

---

## 💬 Community & Feedback

- **In-App Feedback**: Use the Featurebase button at the bottom-right of Streamverse to submit ideas or bug reports directly.
- **GitHub Discussions & Issues**: Use [GitHub Issues](https://github.com/Anuraagsingh132/Streamverse-2/issues) for in-depth technical discussions and bug tracking.

Thank you for helping make Streamverse the best open-source cinema experience on the web! 🍿
