/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Spiffcode, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Sort of forked from vs/workbench/services/statusbar/common/statusbarService.ts

'use strict';

import {createDecorator} from 'vs/platform/instantiation/common/instantiation';
import {IDisposable} from 'vs/base/common/lifecycle';

export var INavbarService = createDecorator<INavbarService>('forked/navbarService');

export enum NavbarAlignment {
	LEFT, RIGHT
}

/**
 * A declarative way of describing a status bar entry
 */
export interface INavbarEntry {

	/**
	 * The text to show for the entry. You can embed icons in the text by leveraging the syntax:
	 *
	 * `My text ${icon name} contains icons like ${icon name} this one.`
	 */
	text: string;

	/**
	 * An optional tooltip text to show when you hover over the entry
	 */
	tooltip?: string;

	/**
	 * An optional color to use for the entry
	 */
	color?: string;

	/**
	 * An optional id of a command that is known to the workbench to execute on click
	 */
	command?: string;
}

export interface INavbarService {
	_serviceBrand: any;

	/**
	 * Adds an entry to the navbar with the given alignment and priority. Use the returned IDisposable
	 * to remove the navbar entry.
	 */
	addEntry(entry: INavbarEntry, alignment: NavbarAlignment, priority?: number): IDisposable;
}