import * as vscode from 'vscode';
import { LeetCodeService } from '../services/leetcodeService';
import { UserProfile, Whoami } from 'leetcode-query';

export class UserProfileProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private userProfile: UserProfile | null = null;
    private whoami: Whoami | null = null;

    constructor(private leetCodeService: LeetCodeService) {}

    refresh(): void {
        this.userProfile = null;
        this.whoami = null;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!element) {
            // Root level
            try {
                if (!this.whoami) {
                    this.whoami = await this.leetCodeService.getWhoAmI();
                }

                if (!this.whoami.isSignedIn) {
                    return [new vscode.TreeItem('Not Signed In')];
                }

                if (!this.userProfile) {
                    this.userProfile = await this.leetCodeService.getUserProfile(this.whoami.username);
                }

                const items: vscode.TreeItem[] = [];

                // User Info
                const userItem = new vscode.TreeItem(this.whoami.username, vscode.TreeItemCollapsibleState.None);
                userItem.description = `Rank: ${this.userProfile.matchedUser?.profile.ranking.toLocaleString()}`;
                userItem.iconPath = new vscode.ThemeIcon('account');
                items.push(userItem);

                // Solved Stats
                const submitStats = this.userProfile.matchedUser?.submitStats.acSubmissionNum;
                if (submitStats) {
                    const total = submitStats.find(s => s.difficulty === 'All')?.count || 0;
                    const easy = submitStats.find(s => s.difficulty === 'Easy')?.count || 0;
                    const medium = submitStats.find(s => s.difficulty === 'Medium')?.count || 0;
                    const hard = submitStats.find(s => s.difficulty === 'Hard')?.count || 0;

                    const solvedItem = new vscode.TreeItem(`Solved: ${total}`, vscode.TreeItemCollapsibleState.Expanded);
                    solvedItem.iconPath = new vscode.ThemeIcon('check');
                    items.push(solvedItem);

                    // We can return children for solvedItem if we structure it differently, 
                    // but getChildren takes 'element'. 
                    // To keep it simple for now, I'll just add them as root items or handle recursion.
                    // Let's handle recursion properly.
                    return items;
                }
                
                return items;

            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load profile: ${error}`);
                return [new vscode.TreeItem('Error loading profile')];
            }
        } else if (element.label?.toString().startsWith('Solved:')) {
             if (this.userProfile) {
                const submitStats = this.userProfile.matchedUser?.submitStats.acSubmissionNum;
                if (submitStats) {
                    const easy = submitStats.find(s => s.difficulty === 'Easy')?.count || 0;
                    const medium = submitStats.find(s => s.difficulty === 'Medium')?.count || 0;
                    const hard = submitStats.find(s => s.difficulty === 'Hard')?.count || 0;

                    const easyItem = new vscode.TreeItem(`Easy: ${easy}`, vscode.TreeItemCollapsibleState.None);
                    easyItem.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('localjudge.difficulty.easy'));
                    
                    const mediumItem = new vscode.TreeItem(`Medium: ${medium}`, vscode.TreeItemCollapsibleState.None);
                    mediumItem.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('localjudge.difficulty.medium'));

                    const hardItem = new vscode.TreeItem(`Hard: ${hard}`, vscode.TreeItemCollapsibleState.None);
                    hardItem.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('localjudge.difficulty.hard'));

                    return [easyItem, mediumItem, hardItem];
                }
             }
        }

        return [];
    }
}
