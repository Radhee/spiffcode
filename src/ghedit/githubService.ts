/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Spiffcode, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

var github = require('ghedit/lib/github');
import {User, Gist, Github, Repository, UserInfo, Error as GithubError} from 'github';
import {createDecorator, ServiceIdentifier} from 'vs/platform/instantiation/common/instantiation';
import {TPromise} from 'vs/base/common/winjs.base';
import {GithubTreeCache, IGithubTreeCache} from 'ghedit/githubTreeCache';
import {IWindowConfiguration} from 'vs/workbench/electron-browser/main';
import uri from 'vs/base/common/uri';
import {IFileStat, FileOperationResult} from 'vs/platform/files/common/files';
import paths = require('vs/base/common/paths');

const RECENT_REPOS_COUNT = 4;

export interface GistInfo {
	gist: Gist;
	fileExists: boolean;
}

export var IGithubService = createDecorator<IGithubService>('githubService');

export interface IGithubService {
	_serviceBrand: any;

	github: Github;
	repo: Repository;
	repoName: string;
	ref: string;
	isTag: boolean;

	isFork(): boolean;
	isDefaultBranch(): boolean;
	getDefaultBranch(): string;
	getCache(): IGithubTreeCache;
	hasCredentials(): boolean;
	isAuthenticated(): boolean;
	authenticateUser(): TPromise<UserInfo>;
	getAuthenticatedUserInfo(): UserInfo;
	authenticate(privateRepos: boolean);
	openRepository(repo: string, ref?: string, isTag?: boolean): TPromise<any>;
	getRecentRepos(): string[];
	signOut(): void;
	findGist(resource: uri): TPromise<GistInfo>;
	resolveGistFile(resource: uri): TPromise<IFileStat>;
}

export class GithubService implements IGithubService {
	public _serviceBrand: any;

	public serviceId = IGithubService;
	public github: Github;
	public repo: Repository;
	public repoName: string;
	public ref: string;
	public isTag: boolean;

	private options: any;
	private authenticatedUserInfo: any;
	private repoInfo: any;
	private cache: GithubTreeCache;

	constructor(options?: any) {
		this.options = options;
		this.github = new github(options);
	}

	public isFork(): boolean {
		return 'parent' in this.repoInfo;
	}

	public isDefaultBranch(): boolean {
		return !this.isTag && this.ref === this.repoInfo.default_branch;
	}

	public getDefaultBranch(): string {
		return this.repoInfo.default_branch;
	}

	public getCache(): IGithubTreeCache {
		return this.cache;
	}

	public hasCredentials(): boolean {
		return (this.options.username && this.options.password) || this.options.token;
	}

	public isAuthenticated(): boolean {
		return !!this.authenticatedUserInfo;
	}

	public authenticateUser(): TPromise<UserInfo> {
		if (!this.hasCredentials()) {
			return TPromise.wrapError<UserInfo>('authenticateUser requires user credentials');
		}
		return new TPromise<UserInfo>((complete, error) => {
			this.github.getUser().show(null, (err: GithubError, info?: UserInfo) => {
				if (err) {
					error(err);
				} else {
					this.authenticatedUserInfo = info;
					complete(info);
				}
			});
		});
	}

	public getAuthenticatedUserInfo(): UserInfo {
		return this.authenticatedUserInfo;
	}

	public authenticate(privateRepos: boolean) {
		(<any>window).sendGa('/requesting/' + (privateRepos ? 'private' : 'public'), () => {
			// If we're running on localhost authorize via the "GHEdit localhost" application
			// so we're redirected back to localhost (instead of spiffcode.github.io/ghedit) after
			// the authorization is done.
			let client_id = (window.location.hostname == 'localhost' || window.location.hostname == '127.0.0.1') ? '60d6dd04487a8ef4b699' : 'bbc4f9370abd2b860a36';
			let repoScope = privateRepos ? 'repo' : 'public_repo';
			window.location.href = 'https://github.com/login/oauth/authorize?client_id=' + client_id + '&scope=' + repoScope + ' gist';
		});
	}

	public openRepository(repoName: string, ref?: string, isTag?: boolean): TPromise<any> {
		this.repoName = repoName;
		this.ref = ref;
		this.isTag = isTag;
		this.repo = this.github.getRepo(this.repoName);

		return new TPromise<any>((complete, error) => {
			this.repo.show((err: GithubError, info?: any) => {
				if (err) {
					error(err);
				} else {
					this.addRecentRepo(this.repoName);
					this.repoInfo = info;

					// Don't support symlinks until githubFileService can load symlinked paths
					this.cache = new GithubTreeCache(this, false);
					complete(info);
				}
			});
		});
	}

	private addRecentRepo(repoName: string) {
		// Add repoName first
		let recentRepos = this.getRecentRepos().filter(repo => repo !== repoName);
		recentRepos.splice(0, 0, repoName);

		// Cap the list to RECENT_REPOS_COUNT entries
		recentRepos.slice(0, RECENT_REPOS_COUNT);

		// Save it out
		try {
			let s = JSON.stringify(recentRepos);
			window.sessionStorage.setItem('githubRecentRepos', s);
			window.localStorage.setItem('lastGithubRecentRepos', s);
		} catch (error) {
			// Safari raises Quota Exceeded exception in Private Browsing mode.
		}
	}

	public getRecentRepos(): string[] {
		// Grab the recent repos
		let recentReposJson = window.sessionStorage.getItem('githubRecentRepos');
		if (!recentReposJson) {
			recentReposJson = window.localStorage.getItem('lastGithubRecentRepos');
		}

		try {
			let recentRepos = JSON.parse(recentReposJson);
			if (!Array.isArray(recentRepos))
				return [];
			return recentRepos.filter((name => typeof name === 'string' && name.split('/').length === 2)).slice(0, RECENT_REPOS_COUNT);
		} catch (error) {
			return [];
		}
	}

	public signOut() {
		var d = new Date();
		d.setTime(d.getTime() - 1000);
		document.cookie = 'githubToken=;expires=' + d.toUTCString();
		window.localStorage.removeItem('githubToken');
		window.localStorage.removeItem('githubUser');
		window.localStorage.removeItem('githubPassword');
		window.localStorage.removeItem('lastGithubRepo');
		window.localStorage.removeItem('lastGithubRecentRepos');
		window.localStorage.removeItem('lastGithubBranch');
		window.localStorage.removeItem('lastGithubTag');
		window.sessionStorage.removeItem('githubRepo');
		window.sessionStorage.removeItem('githubRecentRepos');
		window.sessionStorage.removeItem('githubBranch');
		window.sessionStorage.removeItem('githubTag');

		// Refresh to the page to fully present the signed out state.
		location.href = location.origin + location.pathname;
	}

	public findGist(resource: uri): TPromise<GistInfo> {
		return new TPromise<GistInfo>((c, e) => {
			if (!this.isAuthenticated()) {
				// We don't have access to the current paths.makeAbsoluteuser's Gists.
				e({ path: resource.path, error: "not authenticated" });
				return;
			}

			let user: User = this.github.getUser();
			user.gists((err: GithubError, gists?: Gist[]) => {
				// Github api error
				if (err) {
					console.log('Error user.gists api ' + resource.path + ": " + err);
					e(err);
					return;
				}

				// 0 = '', 1 = '$gist', 2 = description, 3 = filename
				let parts = this.toAbsolutePath(resource).split('/');

				// Find the raw url referenced by the path
				for (let i = 0; i < gists.length; i++) {
					let gist = gists[i];
					if (gist.description !== parts[2]) {
						continue;
					}
					for (let filename in gist.files) {
						if (filename === parts[3]) {
							c({gist: gist, fileExists: true});
							return;
						}
					}
					c({gist: gist, fileExists: false});
					return;
				}
				c({gist: null, fileExists: false});
			});
		});
    }

	public resolveGistFile(resource: uri): TPromise<IFileStat> {
		return new TPromise<IFileStat>((c, e) => {
			this.findGist(resource).then((info) => {
				// Gist found but if file doesn't exist, error.
				if (!info.gist || !info.fileExists) {
					e(FileOperationResult.FILE_NOT_FOUND);
					return;
				}

				// 0 = '', 1 = '$gist', 2 = description, 3 = filename
				let parts = this.toAbsolutePath(resource).split('/');

				// Github is not returning Access-Control-Expose-Headers: ETag, so we
				// don't have access to that header in the response. Make
				// up an ETag. ETags don't have format dependencies.
				let size = info.gist.files[parts[3]].size;
				let etag: string = info.gist.updated_at + size;
				let stat: IFileStat = {
					resource: uri.file(resource.path),
					isDirectory: false,
					hasChildren: false,
					name: parts[2],
					mtime: Date.parse(info.gist.updated_at),
					etag: etag,
					size: size,
					mime: info.gist.files[parts[3]].type
				};

				// Extra data to return to the caller, for getting content
				(<any>stat).url = info.gist.files[parts[3]].raw_url;
				c(stat);

			}, (error: GithubError) => {
				e(FileOperationResult.FILE_NOT_FOUND);
			});
		});
	}

	private toAbsolutePath(arg1: uri | IFileStat): string {
		let resource: uri;
		if (arg1 instanceof uri) {
			resource = <uri>arg1;
		} else {
			resource = (<IFileStat>arg1).resource;
		}

		return paths.normalize(resource.fsPath);
	}

}

export function openRepository(repo: string, env: IWindowConfiguration, ref?: string, isTag?: boolean) {
	let url = window.location.origin + window.location.pathname + '?repo=' + repo;
	if (ref) {
		url += (isTag ? '&tag=' : '&branch=') + ref;
	}
	if (env.buildType) {
		url += '&b=' + env.buildType;
	}
	window.location.href = url;
}
