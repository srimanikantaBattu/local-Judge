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
                const profile = this.userProfile.matchedUser?.profile;

                if (profile) {
                    // User Info
                    const userItem = new vscode.TreeItem(this.whoami.username, vscode.TreeItemCollapsibleState.None);
                    userItem.description = `Rank: ${profile.ranking.toLocaleString()}`;
                    userItem.iconPath = new vscode.ThemeIcon('account');
                    items.push(userItem);

                    // Real Name
                    if (profile.realName) {
                        const nameItem = new vscode.TreeItem(profile.realName, vscode.TreeItemCollapsibleState.None);
                        nameItem.iconPath = new vscode.ThemeIcon('symbol-string');
                        nameItem.description = 'Name';
                        items.push(nameItem);
                    }

                    // Location
                    if (profile.countryName) {
                        const locItem = new vscode.TreeItem(profile.countryName, vscode.TreeItemCollapsibleState.None);
                        locItem.iconPath = new vscode.ThemeIcon('location');
                        items.push(locItem);
                    }

                    // Company
                    if (profile.company) {
                        const companyItem = new vscode.TreeItem(profile.company, vscode.TreeItemCollapsibleState.None);
                        companyItem.iconPath = new vscode.ThemeIcon('organization');
                        items.push(companyItem);
                    }

                    // School
                    if (profile.school) {
                        const schoolItem = new vscode.TreeItem(profile.school, vscode.TreeItemCollapsibleState.None);
                        schoolItem.iconPath = new vscode.ThemeIcon('mortar-board');
                        items.push(schoolItem);
                    }

                    // Reputation
                    if (profile.reputation) {
                        const repItem = new vscode.TreeItem(`Reputation: ${profile.reputation}`, vscode.TreeItemCollapsibleState.None);
                        repItem.iconPath = new vscode.ThemeIcon('star');
                        items.push(repItem);
                    }
                }

                // Solved Stats
                const submitStats = this.userProfile.matchedUser?.submitStats.acSubmissionNum;
                if (submitStats) {
                    const total = submitStats.find(s => s.difficulty === 'All')?.count || 0;
                    const solvedItem = new vscode.TreeItem(`Solved: ${total}`, vscode.TreeItemCollapsibleState.Collapsed);
                    solvedItem.iconPath = new vscode.ThemeIcon('check');
                    solvedItem.contextValue = 'solved_stats';
                    items.push(solvedItem);
                }

                if (profile) {
                    // Skills
                    if (profile.skillTags && profile.skillTags.length > 0) {
                        const skillsItem = new vscode.TreeItem('Skills', vscode.TreeItemCollapsibleState.Collapsed);
                        skillsItem.iconPath = new vscode.ThemeIcon('tools');
                        skillsItem.contextValue = 'skills';
                        items.push(skillsItem);
                    }

                    // Websites
                    if (profile.websites && profile.websites.length > 0) {
                        const webItem = new vscode.TreeItem('Websites', vscode.TreeItemCollapsibleState.Collapsed);
                        webItem.iconPath = new vscode.ThemeIcon('globe');
                        webItem.contextValue = 'websites';
                        items.push(webItem);
                    }
                }
                
                return items;

            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load profile: ${error}`);
                return [new vscode.TreeItem('Error loading profile')];
            }
        } else if (element.contextValue === 'solved_stats' || element.label?.toString().startsWith('Solved:')) {
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
        } else if (element.contextValue === 'skills') {
            if (this.userProfile && this.userProfile.matchedUser) {
                return this.userProfile.matchedUser.profile.skillTags.map(skill => {
                    const item = new vscode.TreeItem(skill, vscode.TreeItemCollapsibleState.None);
                    item.iconPath = new vscode.ThemeIcon('tag');
                    return item;
                });
            }
        } else if (element.contextValue === 'websites') {
            if (this.userProfile && this.userProfile.matchedUser) {
                return this.userProfile.matchedUser.profile.websites.map(url => {
                    const item = new vscode.TreeItem(url, vscode.TreeItemCollapsibleState.None);
                    item.iconPath = new vscode.ThemeIcon('link');
                    item.command = {
                        command: 'vscode.open',
                        title: 'Open URL',
                        arguments: [vscode.Uri.parse(url)]
                    };
                    return item;
                });
            }
        }

        return [];
    }
}
