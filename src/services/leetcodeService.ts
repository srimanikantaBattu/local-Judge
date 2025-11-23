import * as vscode from 'vscode';

export interface TopicTag {
    id: string;
    name: string;
    slug: string;
}

export interface CodeSnippet {
    lang: string;
    langSlug: string;
    code: string;
    __typename?: string;
}

export interface ChallengeQuestion {
    id: string;
    date: string;
    incompleteChallengeCount: number;
    streakCount: number;
    type: string;
    __typename?: string;
}

export interface OfficialSolution {
    id: string;
    title: string;
    slug: string;
    canSeeDetail: boolean;
    paidOnly: boolean;
    hasVideoSolution: boolean;
    paidOnlyVideo: boolean;
    __typename?: string;
}

export type ProblemDifficulty = "Easy" | "Medium" | "Hard";

export interface Problem {
    adminUrl: null | string;
    boundTopicId: unknown;
    challengeQuestion: ChallengeQuestion;
    codeSnippets: CodeSnippet[];
    companyTagStats: unknown;
    content: string;
    contributors: unknown[];
    difficulty: ProblemDifficulty;
    dislikes: number;
    enableDebugger: boolean;
    enableRunCode: boolean;
    enableTestMode: boolean;
    envInfo: string;
    exampleTestcases: string;
    hints: string[];
    isLiked: null | boolean;
    isPaidOnly: boolean;
    judgeType: string;
    judgerAvailable: boolean;
    libraryUrl: null | string;
    likes: number;
    metaData: string;
    mysqlSchemas: unknown[];
    note: null | string;
    questionFrontendId: string;
    questionId: string;
    sampleTestCase: string;
    similarQuestions: string;
    solution: OfficialSolution;
    stats: string;
    status: unknown;
    title: string;
    titleSlug: string;
    topicTags: TopicTag[];
    translatedContent: null | string;
    translatedTitle: null | string;
}

export interface ProblemList {
    questions: {
        acRate: number;
        difficulty: "Easy" | "Medium" | "Hard";
        freqBar: null;
        hasSolution: boolean;
        hasVideoSolution: boolean;
        isFavor: boolean;
        isPaidOnly: boolean;
        questionFrontendId: string;
        questionId?: string;
        status: null | string;
        title: string;
        titleSlug: string;
        topicTags: {
            id: string;
            name: string;
            slug: string;
        }[];
    }[];
    total: number;
}

export interface DailyChallenge {
    date: string;
    link: string;
    question: Problem;
}

import { LeetCode, Credential, UserProfile, Whoami } from 'leetcode-query';

export class LeetCodeService {
    private leetcode: LeetCode;
    private credential?: Credential;

    constructor() {
        this.leetcode = new LeetCode();
    }

    async initialize(sessionCookie: string): Promise<void> {
        try {
            // Clear any existing cache to ensure we fetch fresh data with user status
            if (this.leetcode && this.leetcode.cache) {
                this.leetcode.cache.clear();
            }

            this.credential = new Credential();
            await this.credential.init(sessionCookie);
            this.leetcode = new LeetCode(this.credential);
            
            // Verify the session by fetching user info
            const user = await this.leetcode.whoami();
            if (!user.isSignedIn) {
                throw new Error('Session cookie is invalid or expired.');
            }
        } catch (error) {
            console.error('Failed to initialize credential:', error);
            throw error;
        }
    }

    logout(): void {
        this.credential = undefined;
        this.leetcode = new LeetCode();
    }

    async getWhoAmI(): Promise<Whoami> {
        return await this.leetcode.whoami();
    }

    async getUserProfile(username: string): Promise<UserProfile> {
        return await this.leetcode.user(username);
    }

    async getDailyChallenge(): Promise<DailyChallenge> {
        try {
            const daily = await this.leetcode.daily();
            return daily as unknown as DailyChallenge;
        } catch (error) {
            console.error('Error fetching daily challenge:', error);
            throw error;
        }
    }

    async getProblems(limit: number = 50, skip: number = 0): Promise<ProblemList> {
        try {
            const response = await this.leetcode.problems({ limit, offset: skip });
            return response as unknown as ProblemList;
        } catch (error) {
            console.error('Error fetching problems:', error);
            throw error;
        }
    }

    async searchProblems(query: string): Promise<ProblemList> {
        try {
            const response = await this.leetcode.problems({ 
                limit: 50, 
                filters: { searchKeywords: query } 
            } as any);
            return response as unknown as ProblemList;
        } catch (error) {
            console.error('Error searching problems:', error);
            throw error;
        }
    }

    async getProblem(titleSlug: string): Promise<Problem> {
        try {
            const response = await this.leetcode.problem(titleSlug);
            return response as unknown as Problem;
        } catch (error) {
            console.error('Error fetching problem:', error);
            throw error;
        }
    }
}
