# LocalJudge

LocalJudge is a VS Code extension that brings LeetCode problem solving directly into your editor. Code, test, and debug locally with your favorite tools while seamlessly connecting to LeetCode's platform.

## Features

- **Browse Problems**: Access all LeetCode problems organized by difficulty, tags, or as a complete list
- **Daily Challenge**: Quickly open today's daily coding challenge
- **User Profile**: View your stats, ranking, and progress directly in the sidebar
- **Code Generation**: Generate starter code templates in multiple languages
- **Test Cases**: Run and validate your solutions with default or custom test cases
- **Split View**: Code editor and problem preview side-by-side
- **Status Tracking**: Visual indicators show which problems you've solved

## Getting Started

1. **Sign In**: Click the Sign In button in the WELCOME view
2. **Cookie Setup**: 
   - Log in to LeetCode in your browser
   - Open DevTools (F12) → Application → Cookies
   - Copy the value of `LEETCODE_SESSION` (and optionally `csrftoken`)
   - Paste into VS Code when prompted
3. **Start Coding**: Browse problems, click "Code Now", and begin solving!

## Usage

### Viewing Problems
- Navigate through the **PROBLEMS** view in the sidebar
- Filter by difficulty (Easy/Medium/Hard) or topic tags
- Click any problem to see its full description

### Solving Problems
1. Click **"Code Now"** from the problem preview
2. Select your preferred programming language
3. The starter code will open in a new tab
4. Write your solution

### Testing Solutions
1. Look for the **Test | Submit** buttons at the top of your solution file
2. Click **Test** to run against:
   - Default test cases
   - Custom input you provide
   - Test cases from a file
3. View detailed results in a split panel

## Requirements

- VS Code 1.106.1 or higher
- Active internet connection
- Valid LeetCode account

## Known Issues

- Testing feature requires a valid `csrftoken` in your cookie string for proper authentication
- Cloudflare protection may occasionally block automated requests
- Some language configurations may require manual adjustments

## Release Notes

### 0.0.1

Initial release of LocalJudge:
- LeetCode authentication via session cookies
- Problem browsing and filtering
- User profile display
- Code generation for multiple languages
- Test case execution
- Split-view problem preview

---

**Enjoy coding with LocalJudge!**
