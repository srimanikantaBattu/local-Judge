import * as vscode from 'vscode';

export class LeetCodeCodeLensProvider implements vscode.CodeLensProvider {
    private onDidChangeCodeLensesEmitter: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    
    get onDidChangeCodeLenses(): vscode.Event<void> {
        return this.onDidChangeCodeLensesEmitter.event;
    }

    public refresh(): void {
        this.onDidChangeCodeLensesEmitter.fire();
    }

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const text = document.getText();
        // Look for the problem URL in the first few lines
        // Matches: // https://leetcode.com/problems/two-sum/
        // or # https://leetcode.com/problems/two-sum/
        const match = text.match(/(?:\/\/|#)\s+https:\/\/leetcode\.com\/problems\/([a-z0-9-]+)\//);
        
        if (!match) {
            return [];
        }

        const slug = match[1];
        
        // Find the class definition to place the lens above it, or just put it at the top
        // Trying to find "class Solution" or similar might be language dependent.
        // For now, let's put it at the top of the file or after the header.
        
        let line = 0;
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('class Solution') || lines[i].includes('def ') || lines[i].includes('func ')) {
                line = i;
                break;
            }
        }
        // If we can't find a good spot, default to line 2 (after header)
        if (line === 0) {
            line = 2;
        }

        const range = new vscode.Range(line, 0, line, 0);
        
        const testCmd: vscode.Command = {
            title: "$(beaker) Test",
            command: "localjudge.test",
            arguments: [slug, document.uri]
        };

        const submitCmd: vscode.Command = {
            title: "$(check) Submit",
            command: "localjudge.submit",
            arguments: [slug, document.uri]
        };

        return [
            new vscode.CodeLens(range, testCmd),
            new vscode.CodeLens(range, submitCmd)
        ];
    }
}
