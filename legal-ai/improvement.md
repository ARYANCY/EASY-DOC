# Legal AI Client - Theme Unification & Code Improvements

## Overview
This document outlines the changes needed to:
1. Combine the two themes (VS Code dark + Editorial light) into a unified VS Code-style dark theme
2. Eliminate repetitive event handling patterns
3. Consolidate symbols and toggles into terminal-style toggles
4. Transform explorer sidebar into a VS Code-like navbar
5. Convert ChatPanel to dark theme
6. **Remove standalone search page** - replace with inline lime green text highlighting in document viewer
7. **Document viewer opens PDF directly** with toggle to show parsed text

---

## CHANGES SUMMARY

### Removed Features:
- ❌ Search page (`/search`) - Remove entirely
- ❌ Search navigation item from sidebar
- ❌ Search service and related components

### New Features:
- ✅ PDF viewer opens directly when clicking document
- ✅ "Show Parsed Text" toggle button in document viewer
- ✅ Inline find/highlight with **lime green** (`#32CD32` or `#39FF14`) background
- ✅ Simple text search within parsed document view

---

---

## 1. THEME UNIFICATION - Update Global Styles

### File: `client/styles/globals.css`

**Current Issues:**
- Uses light editorial theme (`--editorial-paper: #fffdf9`, `--editorial-warm: #f7f4ef`)
- Inconsistent with VS Code dark theme used in document viewer

**Changes Required:**

```css
:root {
  /* VS Code Dark Theme Colors */
  --vscode-bg: #1e1e1e;
  --vscode-sidebar: #252526;
  --vscode-activity: #181818;
  --vscode-border: #2d2d2d;
  --vscode-text: #d4d4d4;
  --vscode-text-muted: #858585;
  --vscode-accent: #007acc;
  --vscode-accent-hover: #1177bb;
  --vscode-selection: #264f78;
  --vscode-hover: #2a2d2e;
  --vscode-input: #3c3c3c;
  --vscode-error: #f48771;
  --vscode-warning: #cca700;
  --vscode-success: #89d185;
  
  /* Search Highlight - Lime Green */
  --search-highlight: #32CD32;
  --search-highlight-bg: rgba(50, 205, 50, 0.15);
  
  /* Keep minimal editorial accents */
  --editorial-gold: #a77a35;
}

body {
  color: var(--vscode-text);
  background: var(--vscode-bg);
  font-feature-settings: "kern";
}

::selection {
  background: var(--vscode-selection);
  color: var(--vscode-text);
}
```

---

## 2. CONSOLIDATE REPETITIVE EVENT HANDLING

### File: `client/app/document/[id]/page.tsx`

**Current Issues:**
- Individual state variables for each panel (lines 106-111)
- Individual toggle handlers (lines 237-245, 255-274)
- Repetitive localStorage serialization (lines 150-156)

**Changes Required:**

Create a unified panel state hook:

```typescript
// Replace individual states (lines 105-113) with:
interface PanelState {
  explorer: boolean;
  chat: boolean;
  risk: boolean;
  clauses: boolean;
  summary: boolean;
  bottom: boolean;
}

const [panels, setPanels] = useState<PanelState>({
  explorer: true,
  chat: true,
  risk: true,
  clauses: true,
  summary: true,
  bottom: true,
});

const togglePanel = (panel: keyof PanelState) => {
  setPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
};

const setPanel = (panel: keyof PanelState, value: boolean) => {
  setPanels(prev => ({ ...prev, [panel]: value }));
};
```

**Remove:** Lines 237-245 individual toggle buttons in top bar (consolidated into activity bar).

---

## 3. CREATE UNIFIED PANEL CONTROLLER COMPONENT

### New File: `client/components/PanelController.tsx`

**Purpose:** Replace repetitive toggle logic with terminal-style controls

```typescript
"use client";

import { 
  Files, 
  Search, 
  ShieldAlert, 
  MessageSquare, 
  Scissors,
  FileText,
  Terminal,
  Settings,
  ChevronUp,
  ChevronDown,
  X
} from "lucide-react";
import { cn } from "../lib/utils/cn";

export interface PanelConfig {
  id: string;
  icon: React.ElementType;
  label: string;
  position: 'sidebar' | 'right' | 'bottom';
  component: React.ReactNode;
}

interface PanelControllerProps {
  panels: Record<string, boolean>;
  activeBottomTab: string;
  onToggle: (id: string) => void;
  onSetActiveTab: (tab: string) => void;
  configs: PanelConfig[];
}

export function ActivityBar({ 
  panels, 
  onToggle, 
  configs 
}: { 
  panels: Record<string, boolean>;
  onToggle: (id: string) => void;
  configs: Pick<PanelConfig, 'id' | 'icon' | 'label'>[];
}) {
  return (
    <aside className="flex w-12 shrink-0 flex-col items-center border-r border-[var(--vscode-border)] bg-[var(--vscode-activity)] py-2">
      {configs.map((config) => {
        const Icon = config.icon;
        return (
          <button
            key={config.id}
            onClick={() => onToggle(config.id)}
            className={cn(
              "mb-1 flex h-10 w-10 items-center justify-center border-l-2 transition-colors",
              panels[config.id]
                ? "border-white bg-[var(--vscode-hover)] text-white"
                : "border-transparent text-[var(--vscode-text-muted)] hover:bg-[var(--vscode-hover)] hover:text-white"
            )}
            title={config.label}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
      <button className="mt-auto flex h-10 w-10 items-center justify-center text-[var(--vscode-text-muted)] hover:bg-[var(--vscode-hover)] hover:text-white">
        <Settings className="h-5 w-5" />
      </button>
    </aside>
  );
}

export function BottomPanel({
  isOpen,
  activeTab,
  tabs,
  onToggle,
  onTabChange,
  children,
}: {
  isOpen: boolean;
  activeTab: string;
  tabs: { id: string; label: string; icon: React.ElementType }[];
  onToggle: () => void;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-12 right-0 border-t border-[var(--vscode-border)] bg-[var(--vscode-bg)] z-30",
        "transition-transform duration-300 ease-out",
        isOpen ? "translate-y-0 h-56" : "translate-y-[calc(100%-36px)] h-9"
      )}
    >
      {/* Terminal-style Toggle Bar */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 h-9 bg-[var(--vscode-activity)] hover:bg-[var(--vscode-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[var(--vscode-text-muted)]" />
          <span className="text-xs text-[var(--vscode-text)]">Terminal & Tools</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-[var(--vscode-text-muted)]" />
        ) : (
          <ChevronUp className="h-4 w-4 text-[var(--vscode-text-muted)]" />
        )}
      </button>

      {/* Tab Navigation */}
      <div className="flex h-9 items-center border-b border-[var(--vscode-border)] bg-[var(--vscode-activity)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 border-r border-[var(--vscode-border)] px-3 text-xs transition-colors",
                activeTab === tab.id
                  ? "bg-[var(--vscode-bg)] text-white"
                  : "text-[var(--vscode-text-muted)] hover:bg-[var(--vscode-hover)]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
        <button 
          onClick={onToggle}
          className="ml-auto px-3 text-[var(--vscode-text-muted)] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="h-[calc(100%-4.5rem)] overflow-auto p-3">
        {children}
      </div>
    </div>
  );
}
```

---

## 4. TRANSFORM SIDEBAR TO NAVBAR

### File: `client/components/Sidebar.tsx`

**Current Issues:**
- Full sidebar with text labels takes too much space
- Light theme inconsistent with VS Code style
- Duplicate of activity bar in document viewer

**Changes Required:**

Replace the entire Sidebar with a VS Code-style Activity Bar + Compact Explorer:

```typescript
// Replace lines 50-162 with:

{/* Activity Bar - Icon Navbar */}
<aside className="flex w-12 shrink-0 flex-col items-center border-r border-[var(--vscode-border)] bg-[var(--vscode-activity)] py-2 z-50">
  <Link 
    href="/" 
    className="mb-4 flex h-10 w-10 items-center justify-center text-[var(--vscode-accent)]"
    title="Dashboard"
  >
    <Scale className="h-6 w-6" />
  </Link>
  
  <div className="flex-1 space-y-1">
    {navigation.map((item) => {
      const Icon = item.icon;
      const isActive = pathname === item.href;
      return (
        <Link
          key={item.name}
          href={item.href}
          className={cn(
            "flex h-10 w-10 items-center justify-center border-l-2 transition-colors",
            isActive
              ? "border-white bg-[var(--vscode-hover)] text-white"
              : "border-transparent text-[var(--vscode-text-muted)] hover:bg-[var(--vscode-hover)] hover:text-white"
          )}
          title={item.name}
        >
          <Icon className="h-5 w-5" />
        </Link>
      );
    })}
  </div>
  
  <button 
    className="mt-auto flex h-10 w-10 items-center justify-center text-[var(--vscode-text-muted)] hover:bg-[var(--vscode-hover)] hover:text-white"
    title="User Profile"
  >
    <User className="h-5 w-5" />
  </button>
</aside>

{/* Explorer Panel - Collapsible */}
{showExplorer && (
  <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--vscode-border)] bg-[var(--vscode-sidebar)] md:flex">
    <div className="flex h-9 items-center justify-between border-b border-[var(--vscode-border)] px-3 text-[11px] uppercase tracking-wide text-[var(--vscode-text)]">
      Explorer
      <button onClick={() => setShowExplorer(false)} className="hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
    {/* ... rest of explorer content */}
  </aside>
)}
```

---

## 5. DARK THEME CHATPANEL

### File: `client/components/ChatPanel.tsx`

**Current Issues:**
- Uses light theme colors (`editorial-card`, `#f7f4ef`, `#fffdf9`)
- Needs to match VS Code dark theme

**Changes Required:**

Replace lines 71-179:

```typescript
return (
  <div className={cn('flex flex-col h-full bg-[var(--vscode-bg)] border border-[var(--vscode-border)]', className)}>
    {/* Header */}
    <div className="px-4 py-3 border-b border-[var(--vscode-border)] flex items-center justify-between bg-[var(--vscode-activity)]">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[var(--vscode-accent)]" />
        <h2 className="text-sm font-semibold text-[var(--vscode-text)]">AI Legal Assistant</h2>
      </div>
      <button className="text-[var(--vscode-text-muted)] hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </div>

    {/* Messages */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={cn(
            'flex gap-3',
            message.role === 'user' ? 'flex-row-reverse' : ''
          )}
        >
          <div
            className={cn(
              'w-8 h-8 flex items-center justify-center shrink-0',
              message.role === 'user'
                ? 'bg-[var(--vscode-accent)] text-white'
                : 'bg-[var(--vscode-hover)] text-[var(--vscode-text)]'
            )}
          >
            {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
          <div
            className={cn(
              'max-w-[85%] p-3 text-sm leading-relaxed',
              message.role === 'user'
                ? 'bg-[var(--vscode-accent)] text-white'
                : 'bg-[var(--vscode-hover)] text-[var(--vscode-text)]'
            )}
          >
            {message.content}
          </div>
        </div>
      ))}
      {loading && (
        <div className="flex gap-3">
          <div className="w-8 h-8 bg-[var(--vscode-hover)] flex items-center justify-center">
            <Bot className="w-4 h-4 text-[var(--vscode-text)]" />
          </div>
          <div className="bg-[var(--vscode-hover)] p-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-[var(--vscode-text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-[var(--vscode-text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-[var(--vscode-text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>

    {/* Suggested Questions */}
    {messages.length <= 1 && (
      <div className="px-4 py-3 border-t border-[var(--vscode-border)] bg-[var(--vscode-activity)]">
        <div className="flex flex-wrap gap-2">
          {[
            'What happens if the other party breaches the agreement?',
            'Is there any payment obligation in this agreement?',
          ].map((question) => (
            <button
              key={question}
              onClick={() => setInput(question)}
              className="px-3 py-1.5 text-xs bg-[var(--vscode-hover)] border border-[var(--vscode-border)] text-[var(--vscode-text)] hover:border-[var(--vscode-text-muted)] transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Input */}
    <div className="p-3 border-t border-[var(--vscode-border)] bg-[var(--vscode-activity)]">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask anything about this document..."
          className="flex-1 px-3 py-2 bg-[var(--vscode-input)] border border-[var(--vscode-border)] text-[var(--vscode-text)] text-sm focus:outline-none focus:border-[var(--vscode-accent)]"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-3 py-2 bg-[var(--vscode-accent)] text-white hover:bg-[var(--vscode-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);
```

---

## 6. UPDATE DASHBOARD PAGE FOR DARK THEME

### File: `client/app/page.tsx`

**Current Issues:**
- Uses light editorial theme throughout
- Inconsistent with unified dark theme

**Key Color Replacements:**

| Current | Replacement |
|---------|-------------|
| `editorial-shell` (light warm bg) | `bg-[var(--vscode-bg)]` |
| `editorial-card` | `bg-[var(--vscode-sidebar)] border-[var(--vscode-border)]` |
| `bg-[#fffdf9]` | `bg-[var(--vscode-sidebar)]` |
| `border-[#e8e1d8]` | `border-[var(--vscode-border)]` |
| `text-[#181715]` | `text-[var(--vscode-text)]` |
| `text-[#777169]` | `text-[var(--vscode-text-muted)]` |
| `bg-[#181715]` | `bg-[var(--vscode-accent)]` |

---

## 7. REMOVE/CONSOLIDATE REDUNDANT COMPONENTS

### Files to Modify/Remove:

**A. `client/components/PanelToggles.tsx`**
- **Action:** REMOVE
- **Reason:** Redundant with new unified PanelController

**B. `client/components/BottomPanel.tsx`**
- **Action:** REMOVE (functionality merged into PanelController)

**C. `client/components/FeatureToggle.tsx`**
- **Keep:** But update styling to match dark theme
- **Changes:**
  - Line 49: Replace `bg-white rounded-lg border border-gray-200` with `bg-[var(--vscode-hover)] border-[var(--vscode-border)]`
  - Line 53: Replace purple colors with `var(--vscode-accent)`
  - Line 73: Replace `bg-purple-600` with `var(--vscode-accent)`

---

## 8. REFACTOR DOCUMENT PAGE TO USE NEW COMPONENTS

### File: `client/app/document/[id]/page.tsx`

**Replace lines 227-474 (entire dark-themed return) with:**

```typescript
return (
  <div className="h-screen bg-[var(--vscode-bg)] text-[var(--vscode-text)] overflow-hidden">
    {/* Top Title Bar */}
    <div className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--vscode-border)] bg-[var(--vscode-activity)] px-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[var(--vscode-text-muted)]">LegalAI</span>
        <span className="text-[var(--vscode-text-muted)]">/</span>
        <span className="truncate text-[var(--vscode-text)]">{fileName}</span>
      </div>
      <button 
        onClick={handleExportPDF}
        className="flex items-center gap-2 bg-[var(--vscode-accent)] px-3 py-1 text-xs text-white hover:bg-[var(--vscode-accent-hover)]"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </button>
    </div>

    <div className="flex h-[calc(100%-2.25rem)]">
      {/* Activity Bar with Navbar */}
      <ActivityBar 
        panels={panels}
        onToggle={togglePanel}
        configs={[
          { id: 'explorer', icon: Files, label: 'Explorer' },
          { id: 'risk', icon: ShieldAlert, label: 'Risk Analysis' },
          { id: 'chat', icon: MessageSquare, label: 'AI Chat' },
        ]}
      />

      {/* Explorer Sidebar */}
      {panels.explorer && (
        <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--vscode-border)] bg-[var(--vscode-sidebar)] md:flex">
          <div className="flex h-9 items-center justify-between border-b border-[var(--vscode-border)] px-3 text-[11px] uppercase tracking-wide text-[var(--vscode-text)]">
            Explorer
            <button onClick={() => togglePanel('explorer')} className="hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {/* Open Document */}
            <div className="mb-4">
              <p className="mb-2 text-[11px] uppercase text-[var(--vscode-text-muted)]">Open Document</p>
              <button 
                onClick={() => setActiveTab('original')} 
                className="flex w-full items-center gap-2 bg-[var(--vscode-hover)] px-2 py-1.5 text-left text-[var(--vscode-text)]"
              >
                <FileText className="h-4 w-4 text-[#c586c0]" />
                <span className="truncate">{fileName}</span>
              </button>
            </div>
            
            {/* Document Info */}
            <div className="border-t border-[var(--vscode-border)] pt-3 text-xs text-[var(--vscode-text-muted)] space-y-1">
              <p>Pages: {documentData?.metadata?.pageCount || 0}</p>
              <p>Words: {totalWords.toLocaleString()}</p>
              <p>Risk: {riskData?.risk_score ?? 0}/100</p>
            </div>
          </div>
        </aside>
      )}

      {/* Main Editor Area */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Tabs */}
        <div className="flex h-9 shrink-0 overflow-x-auto border-b border-[var(--vscode-border)] bg-[var(--vscode-sidebar)]">
          {[
            { id: 'original', label: fileName },
            { id: 'simplified', label: 'simplified.txt' },
            { id: 'clauses', label: 'clauses.json' },
            { id: 'summary', label: 'summary.md' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex min-w-32 items-center gap-2 border-r border-[var(--vscode-border)] px-3 text-left text-xs",
                activeTab === tab.id 
                  ? "bg-[var(--vscode-bg)] text-white" 
                  : "bg-[var(--vscode-hover)] text-[var(--vscode-text-muted)] hover:text-[var(--vscode-text)]"
              )}
            >
              <FileText className="h-3.5 w-3.5 text-[#c586c0]" />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-auto bg-[var(--vscode-bg)] font-mono text-sm leading-6">
          {(activeTab === 'original' || activeTab === 'simplified') && (
            <div className="min-w-full py-4">
              {textLines.map((line, index) => (
                <div key={index} className="grid grid-cols-[3rem_minmax(0,1fr)] px-2 hover:bg-[var(--vscode-hover)]">
                  <span className="select-none pr-4 text-right text-[var(--vscode-text-muted)]">{index + 1}</span>
                  <span className="whitespace-pre-wrap pr-6 text-[var(--vscode-text)]">{line || ' '}</span>
                </div>
              ))}
            </div>
          )}
          {/* ... other tab content */}
        </div>

        {/* Bottom Panel */}
        <BottomPanel
          isOpen={panels.bottom}
          activeTab={bottomTab}
          tabs={[
            { id: 'risk', label: 'Risks', icon: ShieldAlert },
            { id: 'actions', label: 'Downloads', icon: Download },
            { id: 'clauses', label: 'Clauses', icon: Scissors },
          ]}
          onToggle={() => togglePanel('bottom')}
          onTabChange={setBottomTab}
        >
          {bottomTab === 'risk' && <RiskPanel flags={riskFlags} />}
          {bottomTab === 'actions' && <DownloadActions onExport={handleExportPDF} />}
          {bottomTab === 'clauses' && <ClausesPanel clauses={clauseList} />}
        </BottomPanel>
      </main>

      {/* Chat Sidebar */}
      {panels.chat && (
        <aside className="hidden w-80 shrink-0 border-l border-[var(--vscode-border)] bg-[var(--vscode-sidebar)] xl:block">
          <ChatPanel documentId={documentId} className="h-full border-none" />
        </aside>
      )}
    </div>
  </div>
);
```

---

## 9. IMPLEMENTATION CHECKLIST

### Phase 1: Foundation
- [ ] Update `globals.css` with VS Code theme variables
- [ ] Create `PanelController.tsx` component
- [ ] Update `tailwind.config.ts` to extend with CSS variables

### Phase 2: Component Updates
- [ ] Refactor `ChatPanel.tsx` to dark theme
- [ ] Transform `Sidebar.tsx` to Activity Bar + Explorer
- [ ] Remove `PanelToggles.tsx` and `BottomPanel.tsx`
- [ ] Update `FeatureToggle.tsx` styling

### Phase 3: Page Refactors
- [ ] Refactor `document/[id]/page.tsx` with unified state, PDF view, and parsed text toggle
- [ ] Update `page.tsx` (dashboard) to dark theme
- [ ] Update other pages (upload, history, documents) to dark theme
- [ ] ❌ **DELETE** `search/page.tsx` and related search service
- [ ] Add lime green (`#32CD32`) search highlighting to document viewer

### Phase 4: Cleanup
- [ ] Remove unused light theme utility classes
- [ ] Test all features work correctly
- [ ] Verify responsive behavior

---

## 10. NEW DOCUMENT VIEWER - PDF + Parsed Text Toggle

### File: `client/app/document/[id]/page.tsx` (MAJOR REFACTOR)

**Replace the entire content view section with PDF-first approach:**

```typescript
// NEW: Document view modes
const [viewMode, setViewMode] = useState<'pdf' | 'parsed'>('pdf');
const [searchQuery, setSearchQuery] = useState('');
const [highlightedRanges, setHighlightedRanges] = useState<Array<{start: number, end: number}>>([]);

// NEW: Search and highlight function
const handleSearch = (query: string) => {
  setSearchQuery(query);
  if (!query.trim() || !documentData?.text) {
    setHighlightedRanges([]);
    return;
  }
  
  // Find all occurrences (case-insensitive)
  const text = documentData.text.toLowerCase();
  const searchLower = query.toLowerCase();
  const ranges: Array<{start: number, end: number}> = [];
  let index = text.indexOf(searchLower);
  
  while (index !== -1) {
    ranges.push({ start: index, end: index + query.length });
    index = text.indexOf(searchLower, index + 1);
  }
  
  setHighlightedRanges(ranges);
};

// NEW: Render text with lime green highlights
const renderHighlightedText = (text: string) => {
  if (!searchQuery || highlightedRanges.length === 0) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }
  
  const elements: React.ReactNode[] = [];
  let lastEnd = 0;
  
  highlightedRanges.forEach((range, i) => {
    // Add text before highlight
    if (range.start > lastEnd) {
      elements.push(
        <span key={`text-${i}`} className="whitespace-pre-wrap">
          {text.slice(lastEnd, range.start)}
        </span>
      );
    }
    // Add highlighted text in LIME GREEN
    elements.push(
      <span 
        key={`highlight-${i}`} 
        className="bg-[var(--search-highlight)] text-black font-semibold px-0.5"
      >
        {text.slice(range.start, range.end)}
      </span>
    );
    lastEnd = range.end;
  });
  
  // Add remaining text
  if (lastEnd < text.length) {
    elements.push(
      <span key="text-end" className="whitespace-pre-wrap">
        {text.slice(lastEnd)}
      </span>
    );
  }
  
  return <>{elements}</>;
};
```

**Replace document content section (lines 591-603):**

```typescript
{/* Content Area */}
<div className="min-h-0 flex-1 overflow-auto bg-[var(--vscode-bg)]">
  {/* View Mode Toggle Bar */}
  <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--vscode-border)] bg-[var(--vscode-activity)]">
    <div className="flex items-center gap-2">
      <button
        onClick={() => setViewMode('pdf')}
        className={cn(
          "px-3 py-1.5 text-xs transition-colors",
          viewMode === 'pdf' 
            ? "bg-[var(--vscode-accent)] text-white" 
            : "text-[var(--vscode-text-muted)] hover:text-[var(--vscode-text)]"
        )}
      >
        <FileText className="w-3.5 h-3.5 inline mr-1" />
        PDF View
      </button>
      <button
        onClick={() => setViewMode('parsed')}
        className={cn(
          "px-3 py-1.5 text-xs transition-colors",
          viewMode === 'parsed' 
            ? "bg-[var(--vscode-accent)] text-white" 
            : "text-[var(--vscode-text-muted)] hover:text-[var(--vscode-text)]"
        )}
      >
        <Code className="w-3.5 h-3.5 inline mr-1" />
        Show Parsed Text
      </button>
    </div>
    
    {/* Search Box (only in parsed mode) */}
    {viewMode === 'parsed' && (
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--vscode-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Find in text..."
            className="pl-8 pr-3 py-1.5 bg-[var(--vscode-input)] border border-[var(--vscode-border)] text-[var(--vscode-text)] text-xs w-48 focus:outline-none focus:border-[var(--vscode-accent)]"
          />
          {highlightedRanges.length > 0 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--search-highlight)]">
              {highlightedRanges.length} matches
            </span>
          )}
        </div>
        {searchQuery && (
          <button 
            onClick={() => handleSearch('')}
            className="text-[var(--vscode-text-muted)] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )}
  </div>

  {/* Content Display */}
  <div className="h-[calc(100%-2.5rem)] overflow-auto">
    {viewMode === 'pdf' ? (
      /* PDF Viewer */
      <div className="h-full flex items-center justify-center bg-[#2b2b2b]">
        {documentData?.fileUrl ? (
          <iframe
            src={documentData.fileUrl}
            className="w-full h-full border-0"
            title="PDF Viewer"
          />
        ) : (
          <div className="text-center text-[var(--vscode-text-muted)]">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>PDF not available</p>
            <button 
              onClick={() => setViewMode('parsed')}
              className="mt-4 text-[var(--vscode-accent)] hover:underline text-sm"
            >
              View parsed text instead
            </button>
          </div>
        )}
      </div>
    ) : (
      /* Parsed Text with Line Numbers and Search Highlights */
      <div className="font-mono text-sm leading-6 py-4">
        {textLines.map((line, index) => (
          <div 
            key={index} 
            className={cn(
              "grid grid-cols-[3rem_minmax(0,1fr)] px-2",
              highlightedRanges.some(r => {
                // Check if this line contains any highlight
                const lineStart = textLines.slice(0, index).join('\n').length + (index > 0 ? 1 : 0);
                const lineEnd = lineStart + line.length;
                return r.start < lineEnd && r.end > lineStart;
              }) && "bg-[var(--search-highlight-bg)]"
            )}
          >
            <span className="select-none pr-4 text-right text-[var(--vscode-text-muted)]">
              {index + 1}
            </span>
            <span className="whitespace-pre-wrap pr-6 text-[var(--vscode-text)]">
              {renderHighlightedText(line) || ' '}
            </span>
          </div>
        ))}
        
        {highlightedRanges.length === 0 && searchQuery && (
          <div className="px-4 py-8 text-center text-[var(--vscode-text-muted)]">
            No matches found for "{searchQuery}"
          </div>
        )}
      </div>
    )}
  </div>
</div>
```

---

## 11. REMOVE SEARCH PAGE AND SERVICE

### Files to Delete:
- ❌ `client/app/search/page.tsx` - Delete entire file
- ❌ `client/features/search/searchService.ts` - Delete entire file
- ❌ Remove search from `client/features/search/` directory

### Files to Update:

**A. `client/components/Sidebar.tsx`** - Remove Search from navigation (already done above)

**B. `client/lib/features.ts`** - Remove search-related features:

```typescript
// REMOVE from FeatureFlags interface:
// savedQueries: boolean;
// compareDocuments: boolean;

// REMOVE from featureDescriptions:
// savedQueries: { ... }
// compareDocuments: { ... }
```

**C. `client/app/page.tsx` (Dashboard)** - Remove Search quick action card:

```typescript
// REMOVE this entire Link block (lines ~311-322):
<Link 
  href="/search"
  className="flex items-center gap-4 p-5 bg-[#fffdf9] border border-[#e8e1d8] text-[#181715]..."
>
  ...
</Link>
```

---

## Summary of Key Benefits

1. **Single Unified Theme:** VS Code dark theme throughout
2. **Reduced Code Complexity:** ~40% reduction in toggle handling code
3. **Better UX:** Terminal-style bottom panel, cleaner icon navbar
4. **Maintainability:** Single source of truth for panel state
5. **Performance:** Fewer re-renders with consolidated state
6. **Simplified Search:** Inline lime green highlighting instead of separate page
7. **PDF-First:** Documents open directly in PDF viewer with parsed text as fallback
