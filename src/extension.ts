// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { LeetCodeService } from './services/leetcodeService';
import { LeetCodeTreeDataProvider } from './providers/leetCodeTreeProvider';
import { UserProfileProvider } from './providers/userProfileProvider';
import { WelcomeProvider } from './providers/welcomeProvider';
import { LeetCodeDecorationProvider } from './providers/decorationProvider';
import { LeetCodeCodeLensProvider } from './providers/codeLensProvider';
import { getHtmlForWebview, getTestResultHtml } from './utils/webviewUtils';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "localjudge" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('localjudge.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from LocalJudge!');
	});

	const leetCodeService = new LeetCodeService();
    const userProfileProvider = new UserProfileProvider(leetCodeService);
	const treeDataProvider = new LeetCodeTreeDataProvider(leetCodeService);
    const decorationProvider = new LeetCodeDecorationProvider();
    const welcomeProvider = new WelcomeProvider();
    const codeLensProvider = new LeetCodeCodeLensProvider();

    // Register providers immediately
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('localjudge.problems', treeDataProvider),
        vscode.window.registerTreeDataProvider('localjudge.profile', userProfileProvider),
        vscode.window.registerTreeDataProvider('localjudge.welcome', welcomeProvider),
        vscode.window.registerFileDecorationProvider(decorationProvider),
        vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider),
        vscode.languages.registerCodeLensProvider({ scheme: 'untitled' }, codeLensProvider)
	);

	// Initialize authentication
	const secretStorage = context.secrets;
    const updateContext = (isLoggedIn: boolean) => {
        vscode.commands.executeCommand('setContext', 'localjudge:isLoggedIn', isLoggedIn);
    };
    updateContext(false);

	secretStorage.get('leetcode-session').then(async (sessionCookie) => {
		if (sessionCookie) {
			try {
				await leetCodeService.initialize(sessionCookie);
                updateContext(true);
                userProfileProvider.refresh();
                treeDataProvider.refresh();
				console.log('Auto-login successful');
			} catch (e) {
				console.error('Auto-login failed', e);
				vscode.window.showWarningMessage('LocalJudge: Auto-login failed. Please sign in again.');
                treeDataProvider.refresh(); // Load anonymous if login fails
			}
		} else {
            treeDataProvider.refresh(); // Load anonymous if no cookie
        }
	});

	const signInDisposable = vscode.commands.registerCommand('localjudge.signIn', async () => {
        // Direct login is not supported due to CAPTCHA. We must use the session cookie.
        const selection = await vscode.window.showQuickPick(
            [
                { label: 'I have my cookie', description: 'Paste LEETCODE_SESSION cookie directly' },
                { label: 'Open LeetCode to get cookie', description: 'Open browser to login and copy cookie' }
            ],
            { placeHolder: 'Select sign in method' }
        );

        if (!selection) {
            return;
        }

        if (selection.label === 'Open LeetCode to get cookie') {
            const action = await vscode.window.showInformationMessage(
                '1. Log in to LeetCode in your browser.\n' +
                '2. Open Developer Tools (F12) -> Application -> Cookies.\n' +
                '3. Copy the value of "LEETCODE_SESSION".',
                { modal: true },
                'Open Browser'
            );
            
            if (action === 'Open Browser') {
                await vscode.env.openExternal(vscode.Uri.parse('https://leetcode.com/accounts/login/'));
            } else {
                return;
            }
        }

		const cookie = await vscode.window.showInputBox({
			prompt: 'Enter your LeetCode Session Cookie (LEETCODE_SESSION)',
			password: true,
			ignoreFocusOut: true,
			placeHolder: 'Paste your session cookie here...'
		});

		if (cookie) {
			try {
				await leetCodeService.initialize(cookie);
				await secretStorage.store('leetcode-session', cookie);
                updateContext(true);
                userProfileProvider.refresh();
				vscode.window.showInformationMessage('Successfully signed in to LeetCode!');
				treeDataProvider.refresh();
			} catch (error) {
				vscode.window.showErrorMessage(`Sign in failed: ${error}`);
			}
		}
	});

	const signOutDisposable = vscode.commands.registerCommand('localjudge.signOut', async () => {
		try {
			leetCodeService.logout();
			await secretStorage.delete('leetcode-session');
            updateContext(false);
            userProfileProvider.refresh();
			vscode.window.showInformationMessage('Signed out from LeetCode.');
			treeDataProvider.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`Sign out failed: ${error}`);
		}
	});

	context.subscriptions.push(signInDisposable, signOutDisposable);

	// Track the current webview panel
    let currentPanel: vscode.WebviewPanel | undefined = undefined;
    let currentPanelListener: vscode.Disposable | undefined = undefined;

	const showProblemDisposable = vscode.commands.registerCommand('localjudge.showProblem', async (problem: any) => {
		// This command can be triggered from tree view or other places
		if (problem) {
			// Handle case where problem is a TreeItem (context menu) or the data object (click)
			const p = problem.problem || problem;
			
			// Try to get the slug from various properties, or fallback to generating it from the title
			let slug = p.titleSlug || p.title_slug;
			if (!slug && p.title) {
				slug = p.title.toLowerCase().trim().replace(/\s+/g, '-');
			}
			slug = slug || 'unknown';

			try {
				const details = await leetCodeService.getProblem(slug);
				
				// Create or reuse webview panel
                if (currentPanel) {
                    currentPanel.reveal();
                    currentPanel.title = `${details.title}: Preview`;
                } else {
                    currentPanel = vscode.window.createWebviewPanel(
                        'localjudgeProblem',
                        `${details.title}: Preview`,
                        vscode.ViewColumn.One,
                        {
                            enableScripts: true,
                            localResourceRoots: [context.extensionUri]
                        }
                    );
                    currentPanel.onDidDispose(() => {
                        currentPanel = undefined;
                        if (currentPanelListener) {
                            currentPanelListener.dispose();
                            currentPanelListener = undefined;
                        }
                    }, null, context.subscriptions);
                }

				currentPanel.webview.html = getHtmlForWebview(currentPanel.webview, details);

                // Dispose previous listener to avoid duplicate/stale handlers
                if (currentPanelListener) {
                    currentPanelListener.dispose();
                }

				// Handle messages from the webview
				currentPanelListener = currentPanel.webview.onDidReceiveMessage(
					message => {
						switch (message.type) {
							case 'codeNow':
								vscode.commands.executeCommand('localjudge.codeNow', details);
								return;
							case 'openProblem':
								vscode.commands.executeCommand('localjudge.showProblem', { titleSlug: message.slug });
								return;
						}
					}
				);

			} catch (error) {
				vscode.window.showErrorMessage(`Failed to load problem '${slug}': ${error}`);
			}
		}
	});

	const openGitHubDisposable = vscode.commands.registerCommand('localjudge.openGitHub', () => {
		vscode.env.openExternal(vscode.Uri.parse('https://github.com/srimanikantaBattu'));
	});

	const refreshProblemsDisposable = vscode.commands.registerCommand('localjudge.refreshProblems', () => {
		treeDataProvider.refresh();
	});

	const dailyChallengeDisposable = vscode.commands.registerCommand('localjudge.getDailyChallenge', async () => {
		try {
			vscode.window.showInformationMessage('Fetching daily challenge...');
			const daily = await leetCodeService.getDailyChallenge();
			const question = daily.question;
			
			// Open the problem using the showProblem command logic
            // We can just execute the command with the question object
            await vscode.commands.executeCommand('localjudge.showProblem', question);

		} catch (error) {
			vscode.window.showErrorMessage(`Failed to get daily challenge: ${error}`);
		}
	});

	const searchProblemDisposable = vscode.commands.registerCommand('localjudge.searchProblem', async () => {
		const query = await vscode.window.showInputBox({
			placeHolder: 'Search for a LeetCode problem...'
		});

		if (query) {
			try {
				const problems = await leetCodeService.searchProblems(query);
				const items: vscode.QuickPickItem[] = problems.questions.map((p: any) => ({
					label: `${p.questionFrontendId}. ${p.title}`,
					description: p.difficulty,
					detail: p.titleSlug
				}));

				const selected = await vscode.window.showQuickPick(items, {
					placeHolder: 'Select a problem to view'
				});

				if (selected && selected.detail) {
                    // Use the showProblem command to open the selected problem
                    await vscode.commands.executeCommand('localjudge.showProblem', { titleSlug: selected.detail });
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to search problems: ${error}`);
			}
		}
	});

	const codeNowDisposable = vscode.commands.registerCommand('localjudge.codeNow', async (problem: any) => {
		if (!problem) {
			vscode.window.showErrorMessage('No problem selected.');
			return;
		}

        if (!problem.codeSnippets || problem.codeSnippets.length === 0) {
            vscode.window.showErrorMessage('No code snippets available for this problem.');
            return;
        }

        const items: vscode.QuickPickItem[] = problem.codeSnippets.map((snippet: any) => ({
            label: snippet.lang,
            description: snippet.langSlug,
            detail: snippet.code
        }));

		const selectedLanguage = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select a language to solve the problem'
		});

		if (selectedLanguage) {
            const snippet = problem.codeSnippets.find((s: any) => s.lang === selectedLanguage.label);
            if (!snippet) { return; }

			let extension = '';
            const langSlug = snippet.langSlug;
            
            const langExtensions: { [key: string]: string } = {
                'cpp': 'cpp',
                'java': 'java',
                'python': 'py',
                'python3': 'py',
                'c': 'c',
                'csharp': 'cs',
                'javascript': 'js',
                'ruby': 'rb',
                'swift': 'swift',
                'golang': 'go',
                'scala': 'scala',
                'kotlin': 'kt',
                'rust': 'rs',
                'php': 'php',
                'typescript': 'ts',
                'racket': 'rkt',
                'erlang': 'erl',
                'elixir': 'ex',
                'dart': 'dart'
            };

            extension = langExtensions[langSlug] || 'txt';

			const slug = problem.titleSlug || problem.title || 'unknown';
			const safeSlug = slug.replace(/-/g, '_');
            
            // Add comment header
            const commentStyle = ['python', 'python3', 'ruby', 'elixir'].includes(langSlug) ? '#' : '//';
            const header = `${commentStyle} ${problem.questionFrontendId}. ${problem.title}\n${commentStyle} https://leetcode.com/problems/${problem.titleSlug}/\n\n`;
            
            let content = header + snippet.code;

            // Append Sample Test Case
            if (problem.sampleTestCase) {
                content += `\n\n${commentStyle} Sample Test Case:\n`;
                const testCaseLines = problem.sampleTestCase.split('\n');
                testCaseLines.forEach((line: string) => {
                    content += `${commentStyle} ${line}\n`;
                });
            }

			const fileName = `${safeSlug}.${extension}`;
			let fileUri: vscode.Uri;
			
			if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
				const root = vscode.workspace.workspaceFolders[0].uri;
				fileUri = vscode.Uri.joinPath(root, fileName);
			} else {
				// Fallback to user's home directory to avoid permission issues with root drive
				const homeDir = os.homedir();
				const filePath = path.join(homeDir, fileName);
				fileUri = vscode.Uri.file(filePath);
			}

            // Check if file exists on disk
            try {
                await vscode.workspace.fs.stat(fileUri);
                // File exists, open it
                const document = await vscode.workspace.openTextDocument(fileUri);
                await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
            } catch {
                // File does not exist, try to open/create untitled
                const untitledUri = fileUri.with({ scheme: 'untitled' });
                const document = await vscode.workspace.openTextDocument(untitledUri);
                
                // Only insert content if the document is empty (newly created)
                if (document.getText().trim() === '') {
                    const edit = new vscode.WorkspaceEdit();
                    edit.insert(untitledUri, new vscode.Position(0, 0), content);
                    await vscode.workspace.applyEdit(edit);
                }
                
                await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
            }

            // Move the webview to the second column if it exists
            if (currentPanel) {
                currentPanel.reveal(vscode.ViewColumn.Two);
            }
		}
	});

	const testDisposable = vscode.commands.registerCommand('localjudge.test', async (slug: string, uri: vscode.Uri) => {
		const document = await vscode.workspace.openTextDocument(uri);
		const code = document.getText();
		
		// Determine language from file extension or languageId
		const langId = document.languageId;
		// Map vscode languageId to LeetCode lang
		const langMap: {[key: string]: string} = {
			'cpp': 'cpp',
			'java': 'java',
			'python': 'python3',
			'c': 'c',
			'csharp': 'csharp',
			'javascript': 'javascript',
			'typescript': 'typescript',
			'go': 'golang',
			'rust': 'rust',
			'kotlin': 'kotlin',
			'scala': 'scala',
			'ruby': 'ruby',
			'swift': 'swift',
			'php': 'php'
		};
		const lang = langMap[langId] || langId;

		const choice = await vscode.window.showQuickPick(
			[
				{ label: 'Default test cases', description: 'Test with the default cases' },
				{ label: 'Write directly...', description: 'Write test cases in input box' },
				{ label: 'Browse...', description: 'Test with the written cases in file' }
			],
			{ placeHolder: 'Select test cases' }
		);

		if (!choice) { return; }

		let input = '';
        let problem: any;
        try {
		    problem = await leetCodeService.getProblem(slug);
        } catch (e) {
            vscode.window.showErrorMessage(`Failed to fetch problem details: ${e}`);
            return;
        }

		if (choice.label === 'Default test cases') {
			input = problem.sampleTestCase;
		} else if (choice.label === 'Write directly...') {
			input = await vscode.window.showInputBox({
				placeHolder: 'Enter test cases (one per line or as required)',
				value: problem.sampleTestCase
			}) || '';
		} else {
			const files = await vscode.window.showOpenDialog({ canSelectFiles: true });
			if (files && files.length > 0) {
				const content = await vscode.workspace.fs.readFile(files[0]);
				input = content.toString();
			}
		}

		if (!input) { return; }

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Running Test Cases...",
			cancellable: false
		}, async (progress) => {
			try {
				const result = await leetCodeService.runTest(slug, code, lang, input, problem.questionId);
				
				// Show results
				const panel = vscode.window.createWebviewPanel(
					'localjudgeTestResult',
					`Test Results: ${problem.title}`,
					vscode.ViewColumn.Two,
					{ enableScripts: true }
				);
				
				panel.webview.html = getTestResultHtml(result, input);
				
			} catch (error) {
				vscode.window.showErrorMessage(`Test failed: ${error}`);
			}
		});
	});
    context.subscriptions.push(testDisposable);

	const submitDisposable = vscode.commands.registerCommand('localjudge.submit', async (slug: string, uri: vscode.Uri) => {
        vscode.window.showInformationMessage('Submit feature coming soon!');
    });
    context.subscriptions.push(submitDisposable);

	context.subscriptions.push(disposable);
	context.subscriptions.push(dailyChallengeDisposable);
	context.subscriptions.push(searchProblemDisposable);
	context.subscriptions.push(codeNowDisposable);
	context.subscriptions.push(showProblemDisposable);
	context.subscriptions.push(openGitHubDisposable);
	context.subscriptions.push(refreshProblemsDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
