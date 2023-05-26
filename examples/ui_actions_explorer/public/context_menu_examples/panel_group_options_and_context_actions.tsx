/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as React from 'react';
import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { buildContextMenuForActions, Action } from '../../../../src/plugins/ui_actions/public';
import { sampleAction } from './util';

export const PanelGroupOptionsAndContextActions: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  const context = {};
  const trigger: any = 'TEST_TRIGGER';
  const drilldownGrouping: Action['grouping'] = [
    {
      id: 'drilldowns',
      getDisplayName: () => 'Uncategorized group',
      getIconType: () => 'popout',
      order: 20,
    },
  ];
  const exampleGroup: Action['grouping'] = [
    {
      id: 'example',
      getDisplayName: () => 'Example group',
      getIconType: () => 'cloudStormy',
      order: 20,
      category: 'visAug',
    },
  ];
  const alertingGroup: Action['grouping'] = [
    {
      id: 'alerting',
      getDisplayName: () => 'Alerting',
      getIconType: () => 'cloudStormy',
      order: 20,
      category: 'visAug',
    },
  ];
  const anomaliesGroup: Action['grouping'] = [
    {
      id: 'anomalies',
      getDisplayName: () => 'Anomalies',
      getIconType: () => 'cloudStormy',
      order: 30,
      category: 'visAug',
    },
  ];
  const actions = [
    sampleAction('test-1', 100, 'Edit visualization', 'pencil'),
    sampleAction('test-2', 99, 'Clone panel', 'partial'),

    sampleAction('test-9', 10, 'Create drilldown', 'plusInCircle', drilldownGrouping),
    sampleAction('test-10', 9, 'Manage drilldowns', 'list', drilldownGrouping),

    sampleAction('test-11', 10, 'Example action', 'dashboardApp', exampleGroup),
    sampleAction('test-11', 10, 'Alertin action 1', 'dashboardApp', alertingGroup),
    sampleAction('test-12', 9, 'Alertin action 2', 'dashboardApp', alertingGroup),
    sampleAction('test-13', 8, 'Anomalies 1', 'cloudStormy', anomaliesGroup),
    sampleAction('test-14', 7, 'Anomalies 2', 'link', anomaliesGroup),
  ];

  const panels = useAsync(() =>
    buildContextMenuForActions({
      actions: actions.map((action) => ({ action, context, trigger })),
    })
  );

  return (
    <EuiPopover
      button={<EuiButton onClick={() => setOpen((x) => !x)}>Grouping with categories</EuiButton>}
      isOpen={open}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      closePopover={() => setOpen(false)}
    >
      <EuiContextMenu initialPanelId={'mainMenu'} panels={panels.value} />
    </EuiPopover>
  );
};
