/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Spiffcode, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import {IDisposable} from 'vs/base/common/lifecycle';
import {IContextMenuService} from 'vs/platform/contextview/browser/contextView';
import {IInstantiationService} from 'vs/platform/instantiation/common/instantiation';
import {INavbarItem} from 'ghedit/navbar';
import {$} from 'vs/base/browser/builder';
import {OcticonLabel} from 'vs/base/browser/ui/octiconLabel/octiconLabel';
import {dispose} from 'vs/base/common/lifecycle';
import {IGithubService} from 'ghedit/githubService';
import {DropdownMenu} from 'vs/base/browser/ui/dropdown/dropdown';
import {Action} from 'vs/base/common/actions';
import {TPromise} from 'vs/base/common/winjs.base';
import dom = require('vs/base/browser/dom');

export class UserNavbarItem implements INavbarItem {

	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IContextMenuService private contextMenuService: IContextMenuService,
		@IGithubService private githubService: IGithubService
	) {
	}

	// If the user is signed out show them a "Sign In" button.
	// If they're signed in show them a menu that includes a "Sign Out" item.
	public render(el: HTMLElement): IDisposable {
		dom.addClass(el, 'navbar-entry');
		let user = this.githubService.getAuthenticatedUserInfo();

		if (!user) {
			return this.renderSignedOut(el);
		}

		let	container = document.createElement('a');
		el.appendChild(container);

		let actions = [
			// TODO: string localization
			new Action('signOut', 'Sign Out', 'tight-menu-items', true, (event: any) => {
				this.githubService.signOut();
				return TPromise.as(true);
			}),
		];

		return this.instantiationService.createInstance(DropdownMenu, container, {
			tick: true,
			label: user.login,
			contextMenuProvider: this.contextMenuService,
			actions: actions
		});
	}

	private renderSignedOut(el: HTMLElement): IDisposable {
		let toDispose: IDisposable[] = [];
		/*
		dom.addClass(el, 'navbar-entry');

		// Text Container
		let textContainer = document.createElement('a');

		$(textContainer).on('click', (e) => {
			this.githubService.authenticate(false);
		}, toDispose);

		// Label
		// TODO: string localization
		new OcticonLabel(textContainer).text = 'Sign In';

		// Tooltip
		// TODO: string localization
		$(textContainer).title('Grant access to your GitHub repos, gists, and user info');

		el.appendChild(textContainer);
		*/
		return {
			dispose: () => {
				toDispose = dispose(toDispose);
			}
		};
	}
}
