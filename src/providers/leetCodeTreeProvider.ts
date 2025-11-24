import * as vscode from 'vscode';
import { LeetCodeService, ProblemList } from '../services/leetcodeService';

// Define the type for a single question from ProblemList
type QuestionSummary = ProblemList['questions'][0];

export class LeetCodeTreeDataProvider implements vscode.TreeDataProvider<LeetCodeTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<LeetCodeTreeItem | undefined | null | void> = new vscode.EventEmitter<LeetCodeTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<LeetCodeTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private allProblems: QuestionSummary[] = [];

    constructor(private leetCodeService: LeetCodeService) {
        // Initial refresh is handled by the extension activation to ensure correct auth state
    }

    refresh(): void {
        // Fetch a large number to ensure we get all problems (currently ~3000+)
        this.leetCodeService.getProblems(5000, 0).then(problemList => {
            this.allProblems = problemList.questions;
            this._onDidChangeTreeData.fire();
        }).catch(err => {
            vscode.window.showErrorMessage(`Failed to load problems: ${err}`);
        });
    }

    getTreeItem(element: LeetCodeTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: LeetCodeTreeItem): Thenable<LeetCodeTreeItem[]> {
        if (!element) {
            return Promise.resolve([
                new LeetCodeTreeItem('All', vscode.TreeItemCollapsibleState.Collapsed, 'all'),
                new LeetCodeTreeItem('Difficulty', vscode.TreeItemCollapsibleState.Collapsed, 'difficulty'),
                new LeetCodeTreeItem('Tag', vscode.TreeItemCollapsibleState.Collapsed, 'tag')
            ]);
        }

        if (element.contextValue === 'all') {
            return Promise.resolve(this.allProblems.map(p => {
                // Use questionFrontendId as it corresponds to the ID displayed on LeetCode website
                const id = p.questionFrontendId;
                const label = id ? `${id}. ${p.title}` : p.title;
                return new LeetCodeTreeItem(label, vscode.TreeItemCollapsibleState.None, 'problem', p, true);
            }));
        }

        if (element.contextValue === 'difficulty') {
            return Promise.resolve([
                new LeetCodeTreeItem('Easy', vscode.TreeItemCollapsibleState.Collapsed, 'difficulty_group'),
                new LeetCodeTreeItem('Medium', vscode.TreeItemCollapsibleState.Collapsed, 'difficulty_group'),
                new LeetCodeTreeItem('Hard', vscode.TreeItemCollapsibleState.Collapsed, 'difficulty_group')
            ]);
        }

        if (element.contextValue === 'difficulty_group') {
            const difficulty = element.label as string;
            const filtered = this.allProblems.filter(p => p.difficulty === difficulty);
            return Promise.resolve(filtered.map(p => {
                const id = p.questionFrontendId;
                const label = id ? `${id}. ${p.title}` : p.title;
                return new LeetCodeTreeItem(label, vscode.TreeItemCollapsibleState.None, 'problem', p);
            }));
        }

        if (element.contextValue === 'tag') {
            // Extract unique tags from problems if available
            const tags = new Set<string>();
            this.allProblems.forEach(p => {
                p.topicTags?.forEach(t => tags.add(t.name));
            });
            
            const sortedTags = Array.from(tags).sort();
            
            if (sortedTags.length > 0) {
                 return Promise.resolve(sortedTags.map(tag => 
                    new LeetCodeTreeItem(tag, vscode.TreeItemCollapsibleState.Collapsed, 'tag_group')
                ));
            }

            const commonTags = ['Array', 'String', 'Hash Table', 'Dynamic Programming', 'Math', 'Sorting', 'Greedy', 'Depth-First Search', 'Binary Search', 'Tree'];
            return Promise.resolve(commonTags.map(tag => 
                new LeetCodeTreeItem(tag, vscode.TreeItemCollapsibleState.Collapsed, 'tag_group')
            ));
        }

        if (element.contextValue === 'tag_group') {
            const tag = element.label as string;
            const filtered = this.allProblems.filter(p => p.topicTags?.some(t => t.name === tag));
            return Promise.resolve(filtered.map(p => {
                const id = p.questionFrontendId;
                const label = id ? `${id}. ${p.title}` : p.title;
                return new LeetCodeTreeItem(label, vscode.TreeItemCollapsibleState.None, 'problem', p);
            }));
        }

        return Promise.resolve([]);
    }
}

export class LeetCodeTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly problem?: QuestionSummary,
        public readonly isAllView: boolean = false
    ) {
        super(label, collapsibleState);
        this.tooltip = this.label;
        if (contextValue === 'problem' && problem) {
            this.command = {
                command: 'localjudge.showProblem',
                title: 'Show Problem',
                arguments: [problem]
            };
            
            // Icon always shows difficulty color
            let iconColor: vscode.ThemeColor;
            if (problem.difficulty === 'Easy') {
                iconColor = new vscode.ThemeColor('localjudge.difficulty.easy');
            } else if (problem.difficulty === 'Medium') {
                iconColor = new vscode.ThemeColor('localjudge.difficulty.medium');
            } else {
                iconColor = new vscode.ThemeColor('localjudge.difficulty.hard');
            }
            this.iconPath = new vscode.ThemeIcon('circle-filled', iconColor);
            
            this.resourceUri = vscode.Uri.parse(`localjudge://problem/${problem.questionFrontendId}?difficulty=${problem.difficulty}&status=${problem.status || ''}`);
        } else if (contextValue === 'difficulty' || contextValue === 'tag' || contextValue === 'all') {
            this.iconPath = new vscode.ThemeIcon('folder');
        } else if (contextValue === 'difficulty_group' || contextValue === 'tag_group') {
            this.iconPath = new vscode.ThemeIcon('folder-opened');
        }
    }
}
