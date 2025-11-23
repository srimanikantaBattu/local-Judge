import * as vscode from 'vscode';
import { Problem } from '../services/leetcodeService';

export function getHtmlForWebview(webview: vscode.Webview, problem?: Problem): string {
    if (!problem) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LocalJudge</title>
            <style>
                body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); padding: 10px; }
            </style>
        </head>
        <body>
            <h2>Welcome to LocalJudge</h2>
            <p>Select a problem to view details here.</p>
        </body>
        </html>`;
    }

    // Parse stats and similar questions
    let stats: any = {};
    try {
        stats = problem.stats ? JSON.parse(problem.stats) : {};
    } catch (e) { console.error('Failed to parse stats', e); }

    let similarQuestions: any[] = [];
    try {
        similarQuestions = problem.similarQuestions ? JSON.parse(problem.similarQuestions) : [];
    } catch (e) { console.error('Failed to parse similar questions', e); }

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${problem.title}</title>
        <style>
            body { 
                font-family: var(--vscode-font-family); 
                color: var(--vscode-editor-foreground); 
                background-color: var(--vscode-editor-background);
                padding: 20px; 
                line-height: 1.6;
                padding-bottom: 80px; /* Space for floating button */
            }
            h1 { font-size: 1.5em; margin-bottom: 0.5em; color: var(--vscode-textLink-activeForeground); }
            .meta { margin-bottom: 15px; font-size: 0.9em; color: var(--vscode-descriptionForeground); display: flex; gap: 15px; align-items: center; flex-wrap: wrap; }
            .difficulty { font-weight: bold; }
            .difficulty.Easy { color: #00B8A3; }
            .difficulty.Medium { color: #FFC01E; }
            .difficulty.Hard { color: #FF375F; }
            .stat-item { display: flex; align-items: center; gap: 5px; }
            pre { 
                background-color: var(--vscode-textBlockQuote-background); 
                padding: 10px; 
                border-radius: 5px; 
                overflow-x: auto; 
                border: 1px solid var(--vscode-textBlockQuote-border);
            }
            code { font-family: var(--vscode-editor-font-family); }
            .tags { margin-top: 20px; font-size: 0.9em; }
            .tag { 
                background-color: var(--vscode-badge-background); 
                color: var(--vscode-badge-foreground); 
                padding: 2px 8px; 
                border-radius: 10px; 
                margin-right: 5px; 
                display: inline-block;
                margin-bottom: 5px;
            }
            .section { margin-top: 25px; }
            .section h3 { font-size: 1.1em; margin-bottom: 10px; border-bottom: 1px solid var(--vscode-widget-border); padding-bottom: 5px; }
            .similar-link {
                display: block;
                color: var(--vscode-textLink-foreground);
                text-decoration: none;
                margin-bottom: 5px;
                cursor: pointer;
            }
            .similar-link:hover { text-decoration: underline; }
            .fab {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                padding: 8px 16px;
                border-radius: 20px;
                cursor: pointer;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                font-size: 0.9em;
                font-weight: bold;
                border: none;
                z-index: 1000;
            }
            .fab:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
        </style>
    </head>
    <body>
        <h1>${problem.questionFrontendId}. ${problem.title}</h1>
        
        <div class="meta">
            <span class="difficulty ${problem.difficulty}">${problem.difficulty}</span>
            <span>|</span>
            <span class="stat-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                ${problem.likes}
            </span>
            <span class="stat-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                ${problem.dislikes}
            </span>
            ${stats.acRate ? `<span>|</span><span class="stat-item">Acceptance: ${stats.acRate}</span>` : ''}
        </div>

        <div class="content">
            ${problem.content}
        </div>

        ${problem.topicTags && problem.topicTags.length > 0 ? `
        <div class="tags">
            <strong>Tags:</strong> 
            ${problem.topicTags.map(tag => `<span class="tag">${tag.name}</span>`).join('')}
        </div>` : ''}

        ${problem.sampleTestCase ? `
        <div class="section">
            <h3>Sample Test Case</h3>
            <pre><code>${problem.sampleTestCase}</code></pre>
        </div>` : ''}

        ${similarQuestions.length > 0 ? `
        <div class="section">
            <h3>Similar Questions</h3>
            ${similarQuestions.map(q => `
                <a class="similar-link" onclick="openProblem('${q.titleSlug}')">
                    ${q.title} <span class="difficulty ${q.difficulty}" style="font-size: 0.8em;">(${q.difficulty})</span>
                </a>
            `).join('')}
        </div>` : ''}

        <button class="fab" onclick="codeNow()">Code Now</button>

        <script>
            const vscode = acquireVsCodeApi();
            function codeNow() {
                vscode.postMessage({
                    type: 'codeNow'
                });
            }
            function openProblem(slug) {
                vscode.postMessage({
                    type: 'openProblem',
                    slug: slug
                });
            }
        </script>
    </body>
    </html>`;
}
