import type {Dictionary} from 'lodash';

// eslint-disable-next-line @typescript-eslint/no-redeclare
import {Plugin} from 'markdownlint';

import {LintConfig, PluginOptions} from '.';

export interface Options {
    plugins?: Function[] | Plugin;
    pluginOptions: PluginOptions;
    lintConfig?: LintConfig;
    sourceMap?: Dictionary<string>;
}
