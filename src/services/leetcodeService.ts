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
    private sessionCookie: string = '';

    constructor() {
        this.leetcode = new LeetCode();
    }

    async initialize(sessionCookie: string): Promise<void> {
        this.sessionCookie = sessionCookie;
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

    private async getCsrfToken(): Promise<string | undefined> {
        // 1. Try from credential
        if ((this.credential as any).csrfToken) { return (this.credential as any).csrfToken; }

        // 2. Try from session cookie string
        const match = this.sessionCookie.match(/csrftoken=([^;]+)/);
        if (match) { return match[1]; }

        // 3. Fetch from LeetCode
        try {
            let cookieHeader = this.sessionCookie;
            if (!cookieHeader.includes('LEETCODE_SESSION=')) {
                cookieHeader = `LEETCODE_SESSION=${this.sessionCookie}`;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            };

            // Try GraphQL first
            let response = await fetch('https://leetcode.com/graphql', {
                method: 'POST',
                headers,
                body: JSON.stringify({ query: '{ user { username } }' })
            });

            let setCookie = response.headers.get('set-cookie');
            if (setCookie) {
                const tokenMatch = setCookie.match(/csrftoken=([^;]+)/);
                if (tokenMatch) { return tokenMatch[1]; }
            }

            // Fallback to main page
            response = await fetch('https://leetcode.com/', {
                method: 'GET',
                headers
            });
            setCookie = response.headers.get('set-cookie');
            if (setCookie) {
                const tokenMatch = setCookie.match(/csrftoken=([^;]+)/);
                if (tokenMatch) { return tokenMatch[1]; }
            }
        } catch (e) {
            console.error('Failed to fetch CSRF token', e);
        }
        return undefined;
    }

    async runTest(slug: string, code: string, lang: string, input: string, questionId: string): Promise<any> {
        if (!this.credential) {
            throw new Error('Not signed in');
        }

        // Ensure we have a CSRF token
        const csrfToken = await this.getCsrfToken();
        
        if (!csrfToken) {
            throw new Error('CSRF Token not found. Please ensure you pasted the full cookie string including csrftoken.');
        }

        // Construct the cookie header. 
        // If sessionCookie doesn't have 'LEETCODE_SESSION=', assume it's just the value.
        let cookieHeader = this.sessionCookie;
        if (!cookieHeader.includes('LEETCODE_SESSION=')) {
            cookieHeader = `LEETCODE_SESSION=${this.sessionCookie}`;
        }
        // Append csrf token if not present
        if (!cookieHeader.includes('csrftoken=')) {
            cookieHeader += `; csrftoken=${csrfToken}`;
        }

        const headers: any = {
            'Content-Type': 'application/json',
            'Referer': `https://leetcode.com/problems/${slug}/`,
            'Origin': 'https://leetcode.com',
            'Cookie': cookieHeader,
            'x-csrftoken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };

        const body = JSON.stringify({
            lang: lang,
            question_id: questionId,
            typed_code: code,
            data_input: input
        });

        try {
            const response = await fetch(`https://leetcode.com/problems/${slug}/interpret_solution/`, {
                method: 'POST',
                headers: headers,
                body: body,
                redirect: 'manual'
            });

            if (response.type === 'opaqueredirect' || response.status === 302 || response.status === 301) {
                throw new Error('Session expired or invalid. Please sign in again.');
            }

            if (!response.ok) {
                const text = await response.text();
                if (response.status === 403) {
                    throw new Error('Access Denied (403). CSRF token mismatch or Cloudflare block.');
                }
                throw new Error(`Request failed with status ${response.status}: ${text.substring(0, 200)}...`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                if (text.includes('Just a moment...')) {
                    throw new Error('Blocked by Cloudflare. Please try again later or update your cookie.');
                }
                throw new Error(`Expected JSON response but got ${contentType}. Response start: ${text.substring(0, 100)}...`);
            }

            const text = await response.text();
            let data: any;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error(`Invalid JSON response: ${text.substring(0, 200)}...`);
            }

            if (data.error) {
                throw new Error(data.error);
            }
            
            const interpretId = data.interpret_id;
            if (!interpretId) {
                throw new Error(`Failed to start test run: ${JSON.stringify(data)}`);
            }

            // Poll for results
            return await this.pollSubmission(interpretId, csrfToken);

        } catch (error) {
            console.error('Test run failed:', error);
            throw error;
        }
    }

    private async pollSubmission(id: string, csrfToken: string): Promise<any> {
        let attempts = 0;
        
        while (attempts < 20) { // 40 seconds timeout
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const response = await fetch(`https://leetcode.com/submissions/detail/${id}/check/`, {
                headers: {
                    'Cookie': this.sessionCookie,
                    'x-csrftoken': csrfToken,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': `https://leetcode.com/submissions/detail/${id}/check/`
                }
            });
            
            if (!response.ok) {
                // If polling fails, we might want to retry or abort
                console.warn(`Polling failed with status ${response.status}`);
                attempts++;
                continue;
            }

            const text = await response.text();
            let data: any;
            try {
                data = JSON.parse(text);
            } catch (e) {
                // Ignore invalid JSON during polling, might be temporary glitch
                attempts++;
                continue;
            }

            if (data.state === 'SUCCESS') {
                return data;
            }
            // Handle other states if necessary
            
            attempts++;
        }
        throw new Error('Test run timed out');
    }
}
