<div align="center">

  <a href="https://spintax-editor.vercel.app"><picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/78f0879a-279c-4ebe-bfe3-a31ea598b149">
    <source media="(prefers-color-scheme: light)" srcset="https://github.com/user-attachments/assets/78f0879a-279c-4ebe-bfe3-a31ea598b149">
    <img alt="spintax editor logo" src="https://github.com/user-attachments/assets/78f0879a-279c-4ebe-bfe3-a31ea598b149" height="110" style="max-width: 100%;">
  </picture></a>

### Visual tree editor for spintax

<img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/aliciusschroeder/spintax-editor">
<img alt="GitHub deployments" src="https://img.shields.io/github/deployments/aliciusschroeder/spintax-editor/Production?label=Last%20Build">
<img alt="GitHub top language" src="https://img.shields.io/github/languages/top/aliciusschroeder/spintax-editor?label=TypeScript">

</div>

<details>
  <summary>Table of Contents</summary>
  
  - [Spintax Editor](#spintax-editor)
  - [🔍 What is Spintax?](#-what-is-spintax)
  - [💡 Motivation](#-motivation)
  - [✨ Features](#-features)
  - [🚀 Quick Start](#-quick-start)
    - [Online Editor](#online-editor)
    - [Local Development](#local-development)
  - [📝 Usage Guide](#-usage-guide)
    - [Creating Spintax](#creating-spintax)
    - [Tree Structure](#tree-structure)
    - [Previewing Content](#previewing-content)
    - [Exporting Content](#exporting-content)
  - [📋 Roadmap](#-roadmap)
  - [🧩 Project Structure](#-project-structure)
  - [🛠️ Technology Stack](#️-technology-stack)
  - [🤝 Contributing](#-contributing)
  - [📄 License](#-license)
  - [🙏 Acknowledgements](#-acknowledgements)
  - [📬 Contact](#-contact)
</details>

# Spintax Editor

A modern, visual editor for creating and manipulating spintax content. This tool helps content creators, developers, and data scientists generate dynamic text with multiple variations from a single source.

## 🔍 What is Spintax?

Spintax (Spinning Syntax) is a format that allows you to create text with multiple variations. For example:

```
{Hello|Hi|Hey} {world|there|friend}!
```

This spintax can generate 9 different combinations such as "Hello world!", "Hi there!", or "Hey friend!".

## 💡 Motivation

Currently, there are no public tools available for editing spintax in a visual tree format. Traditional text-based spintax editing quickly becomes confusing and error-prone, especially with deeply nested variations. As complexity increases, managing the braces, options, and ensuring proper syntax becomes a significant challenge.

Most existing spintax tools target online marketers with questionable intentions (like creating "unique" content to manipulate search rankings), while the enormous potential of spintax for legitimate use cases remains largely untapped.

Spintax can be particularly valuable for **synthetic data generation in AI training**, offering a lightweight alternative to complex data synthesis tools. When you need controlled text variations with predictable patterns, spintax provides a simple, deterministic approach that:

- Requires no external dependencies
- Functions without API calls
- Generates variations with precise control
- Scales to create thousands or millions of variations

This editor aims to unlock the power of spintax through an intuitive visual interface, making it accessible for legitimate use cases including AI training data generation, template systems, and creative writing.

## ✨ Features

- **Visual Tree Editor**: Edit spintax through an intuitive tree-based interface
- **Multiple Entry Management**: Work with multiple spintax entries simultaneously
- **Live Preview**: Generate random variations to preview your content
- **Variation Counter**: See the total number of possible variations
- **Import/Export**: Support for single spintax strings and YAML collections
- **Undo/Redo**: Full history management for editing operations
- **Modern UI**: Clean, responsive interface with light/dark mode support

## 🚀 Quick Start

### Online Editor

Visit [https://spintax-editor.vercel.app](https://spintax-editor.vercel.app) to use the editor online without installation.

### Local Development

```bash
# Clone the repository
git clone https://github.com/aliciusschroeder/spintax-editor.git
cd spintax-editor

# Install dependencies
pnpm install

# Start the development server
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the editor.

## 📝 Usage Guide

### Creating Spintax

1. Click the "Import" button to load existing spintax or "Load Demo" to try an example.
2. Use the "Add to Root" buttons to add new text or choice elements.
3. Edit nodes by clicking on their content.
4. Add options within choices by clicking the "+" button.

### Tree Structure

The editor visualizes spintax as a tree with different node types:
- **Root**: The container for all content (gray)
- **Text**: Simple text content (yellow)
- **Choice**: A set of options where one will be chosen (blue)
- **Option**: A specific variant within a choice (green)

### Previewing Content

Switch to the "Preview" tab to generate random variations of your spintax.

### Exporting Content

Use the "Export" tab to copy the generated spintax, or click "Export YAML" to export all entries as YAML.

## 📋 Roadmap

- [x] Add Confirmation Modal when reloading the editor
- [x] Add Undo/Redo Buttons
- [x] Support Multiple Spintax Elements
- [ ] Implement more robust YAML handling
- [ ] Enhance UI for easier usability
- [ ] Add keyboard shortcuts for common actions
- [ ] Implement drag-and-drop node reordering

## 🧩 Project Structure

```
src/
├── app/                 # Next.js app components
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main page component
├── components/          # React components
│   └── spintax-editor/  # Editor components
│       ├── ConfirmReloadModal.tsx  # Confirmation dialog
│       ├── ImportExportModal.tsx   # Import/export interface
│       ├── NodeEditor.tsx          # Tree node editor
│       ├── SpintaxEditor.tsx       # Main container
│       └── SpintaxEditorTab.tsx    # Tab management
├── config/              # Configuration and presets
├── hooks/               # Custom React hooks
│   ├── useSpintaxTree.ts  # Spintax tree state management
│   └── useYamlEntries.ts  # YAML entries management
├── lib/                 # Utility functions
│   ├── spintax/         # Spintax parsing/generation
│   │   ├── calculator.ts  # Variation calculation
│   │   ├── generator.ts   # Spintax string generation
│   │   └── parser.ts      # Spintax parsing
│   └── yaml/            # YAML handling
└── types/               # TypeScript definitions
    ├── spintax.ts       # Spintax node type definitions
    └── yaml.ts          # YAML type definitions
```

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (React)
- **Styling**: [TailwindCSS 4](https://tailwindcss.com/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Deployment**: [Vercel](https://vercel.com/)

## 🤝 Contributing

Contributions are greatly welcomed! I'm actively looking for collaborators to help improve this project.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

If you're considering a larger contribution or have questions, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📬 Contact

Alicius Schröder - [X@aliciusschroder]([https://twitter.com/aliciuscodes](https://x.com/aliciusschroder)) - [LinkedIn](https://www.linkedin.com/in/alicius/) - [IG@aliciusschroeder](https://www.instagram.com/aliciusschroeder/)

Project Link: [https://github.com/aliciusschroeder/spintax-editor](https://github.com/aliciusschroeder/spintax-editor)
