import * as vscode from 'vscode';

export class LeetCodeDecorationProvider implements vscode.FileDecorationProvider {
    private readonly _onDidChangeFileDecorations: vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined> = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> = this._onDidChangeFileDecorations.event;

    provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
        if (uri.scheme === 'localjudge' && uri.query) {
            const params = new URLSearchParams(uri.query);
            const difficulty = params.get('difficulty');

            if (difficulty === 'Easy') {
                return {
                    badge: 'E',
                    tooltip: 'Easy'
                };
            } else if (difficulty === 'Medium') {
                return {
                    badge: 'M',
                    tooltip: 'Medium'
                };
            } else if (difficulty === 'Hard') {
                return {
                    badge: 'H',
                    tooltip: 'Hard'
                };
            }
        }
        return undefined;
    }
}
