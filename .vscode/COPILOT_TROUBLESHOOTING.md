# GitHub Copilot Troubleshooting Guide for FramoCRM

This guide helps resolve common GitHub Copilot issues in VSCode for the FramoCRM project.

## Quick Fix Checklist

### 1. VSCode Configuration ✅
- [x] `.vscode/settings.json` - Optimized for Copilot and TypeScript
- [x] `.vscode/extensions.json` - Recommended extensions
- [x] `.vscode/FramoCRM.code-workspace` - Multi-root workspace configuration

### 2. Extension Status
Check these essential extensions are installed and enabled:
- [ ] **GitHub Copilot** (`github.copilot`)
- [ ] **GitHub Copilot Chat** (`github.copilot-chat`) 
- [ ] **TypeScript and JavaScript Language Features** (built-in)
- [ ] **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)

### 3. Authentication & Subscription
1. Open Command Palette (`Ctrl/Cmd + Shift + P`)
2. Run: `GitHub Copilot: Sign In`
3. Verify you have an active Copilot subscription
4. Check status in bottom-right corner of VSCode

### 4. Copilot Settings
Verify these settings in VSCode (File → Preferences → Settings):
- [ ] `github.copilot.enable` is `true` for all languages
- [ ] `github.copilot.editor.enableAutoCompletions` is `true`
- [ ] `editor.inlineSuggest.enabled` is `true`

## Common Issues & Solutions

### Issue: Copilot Not Showing Suggestions

**Solution 1: Restart Language Server**
1. Open Command Palette (`Ctrl/Cmd + Shift + P`)
2. Run: `TypeScript: Restart TS Server`
3. Run: `Developer: Reload Window`

**Solution 2: Check File Association**
- Ensure `.tsx` files are detected as `typescriptreact`
- Ensure `.ts` files are detected as `typescript`
- Check bottom-right corner of VSCode for language mode

**Solution 3: Clear VSCode Cache**
1. Close VSCode completely
2. Delete workspace cache: `~/.vscode/CachedExtensions/`
3. Restart VSCode and open workspace

### Issue: Copilot Suggestions Are Poor Quality

**Solution: Improve Context**
1. Open related files in VSCode tabs for better context
2. Add meaningful comments describing what you want to build
3. Use descriptive variable and function names
4. Keep the current file focused on a single responsibility

### Issue: TypeScript Errors Blocking Copilot

**Solution: Fix TypeScript Configuration**
1. The optimized `tsconfig.json` disables strict mode for better Copilot experience
2. Run: `npx tsc --noEmit` to check for serious TypeScript errors
3. Fix any blocking errors, but minor warnings are OK

### Issue: Copilot Not Working in Specific Files

**Solution: Check File Size and Complexity**
- Copilot works best with files under 1000 lines
- Break large files into smaller components
- Simplify complex nested structures

### Issue: Backend JavaScript Files Not Getting Suggestions

**Solution: Workspace Configuration**
1. Use the provided workspace file: `.vscode/FramoCRM.code-workspace`
2. Open VSCode with: `code .vscode/FramoCRM.code-workspace`
3. This creates a multi-root workspace for both frontend and backend

## Testing Copilot is Working

1. Open a `.tsx` file (e.g., `components/CompanyInfoPage.tsx`)
2. Start typing a comment: `// Create a new React component that`
3. You should see Copilot suggestions appear in gray text
4. Press `Tab` to accept suggestions

## Project-Specific Tips

### For React Components
```typescript
// Copilot works best with descriptive comments
// Create a button component that handles click events and shows loading state
const LoadingButton = () => {
  // Copilot will suggest the implementation here
```

### For Backend API Endpoints
```javascript
// Create an endpoint to update company information
app.put('/api/companies/:id', async (req, res) => {
  // Copilot will suggest database operations here
```

### For TypeScript Types
```typescript
// Define interface for company data with address and contact info
interface Company {
  // Copilot will suggest properties here
```

## Advanced Configuration

### Custom Copilot Settings
Add to your user settings (`settings.json`):
```json
{
  "github.copilot.advanced": {
    "length": 500,
    "temperature": "0.1",
    "listCount": 10
  }
}
```

### Keyboard Shortcuts
- `Tab` - Accept suggestion
- `Alt + ]` - Next suggestion
- `Alt + [` - Previous suggestion  
- `Ctrl + Enter` - Open Copilot panel

## Still Having Issues?

1. **Check Copilot Status**: Look for Copilot icon in bottom-right of VSCode
2. **View Logs**: Command Palette → `GitHub Copilot: Show Output Channel`
3. **Restart Extensions**: Command Palette → `Developer: Reload Window`
4. **Contact Support**: Use the GitHub Copilot feedback option in VSCode

## Workspace Usage

**Recommended**: Open the workspace file for best experience:
```bash
code .vscode/FramoCRM.code-workspace
```

This provides optimal configuration for both frontend and backend development with Copilot.